/**
 * Durable organization-scan checkpoints.
 *
 * Checkpoints contain validated report data and Git tree revisions, never
 * tokens or raw workflow YAML. Every update uses the guarded atomic writer.
 */

import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { resolveRepositoryFile } from './config.js';
import { summarize } from './formatter.js';
import { isWorkflowPath } from './github-org.js';
import { canonicalPath } from './identity.js';
import { redactDeep } from './redact.js';
import { writeFileGuarded } from './writer.js';
import { listRules } from '../rules/index.js';
import { VERSION } from '../version.js';

const CHECKPOINT_KIND = 'actions-warden-org-scan';
const CHECKPOINT_SCHEMA_VERSION = '1.1';
const LEGACY_CHECKPOINT_SCHEMA_VERSION = '1.0';
const FIRST_ANALYSIS_GENERATION_TOOL_VERSION = '0.3.0';
const TOOL_VERSION_RE = /^\d+\.\d+\.\d+$/;
// Increment this whenever organization discovery, parsing, finding identity,
// rule evaluation, or persisted result semantics can change. Package releases
// that leave those behaviors compatible must keep the generation unchanged.
export const ORGANIZATION_ANALYSIS_GENERATION = 1;
export const MAX_ORGANIZATION_CHECKPOINT_BYTES = 256 * 1024 * 1024;
const NAME_RE = /^[A-Za-z0-9_.-]+$/;
const SHA_RE = /^[0-9a-f]{40}$/i;
const ID_RE = /^[0-9a-f]{16}$/;
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
const RULE_IDS = new Set(['parse-error', ...listRules().map(rule => rule.id)]);
const RULES_HASH = digest(listRules());

export function createOrganizationCheckpointIdentity({
  organization,
  repositories,
  visibility,
  includeArchived,
  includeDisabled,
  includeForks,
  maxRepositories,
  severity,
  explain,
  config,
  baselineData,
}) {
  return {
    analysisGeneration: ORGANIZATION_ANALYSIS_GENERATION,
    rulesHash: RULES_HASH,
    organization: organization.toLowerCase(),
    scope: {
      repositories,
      visibility,
      includeArchived,
      includeDisabled,
      includeForks,
      maxRepositories: maxRepositories ?? null,
      severity: severity ?? null,
      explain,
    },
    configHash: digest({
      ignorePaths: config.ignorePaths,
      rules: config.rules,
      runnerPolicy: config.runnerPolicy,
    }),
    baselineHash: digest({
      ids: [...baselineData.ids].sort(),
      fingerprints: [...baselineData.fingerprints].sort(),
    }),
  };
}

/**
 * Create the stable key used by automatic agent artifacts.
 *
 * Generation 1 deliberately retains the exact identity serialization used by
 * v0.3.0 so existing automatic checkpoints remain discoverable after an
 * upgrade. Later generations use the version-independent compatibility
 * identity directly.
 */
export function createOrganizationCheckpointArtifactKey(identity) {
  const compatibleIdentity = identity.analysisGeneration === 1
    ? {
        toolVersion: FIRST_ANALYSIS_GENERATION_TOOL_VERSION,
        rulesHash: identity.rulesHash,
        organization: identity.organization,
        scope: {
          repositories: identity.scope.repositories,
          visibility: identity.scope.visibility,
          includeArchived: identity.scope.includeArchived,
          includeDisabled: identity.scope.includeDisabled,
          includeForks: identity.scope.includeForks,
          maxRepositories: identity.scope.maxRepositories,
          severity: identity.scope.severity,
          explain: identity.scope.explain,
        },
        configHash: identity.configHash,
        baselineHash: identity.baselineHash,
      }
    : identity;
  return createHash('sha256')
    .update(identity.analysisGeneration === 1
      ? JSON.stringify(compatibleIdentity)
      : stableStringify(compatibleIdentity))
    .digest('hex')
    .slice(0, 32);
}

export async function loadOrganizationCheckpoint({ path, cwd, identity }) {
  const resolvedPath = await resolveRepositoryFile(path, cwd);
  const metadata = await stat(resolvedPath);
  if (!metadata.isFile()) throw new Error('organization checkpoint must be a file');
  if (metadata.size > MAX_ORGANIZATION_CHECKPOINT_BYTES) {
    throw new Error(
      `organization checkpoint exceeds ${MAX_ORGANIZATION_CHECKPOINT_BYTES} bytes`,
    );
  }

  let checkpoint;
  try {
    checkpoint = JSON.parse(await readFile(resolvedPath, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('organization checkpoint is not valid JSON');
    throw error;
  }
  if (
    !isRecord(checkpoint)
    || ![CHECKPOINT_SCHEMA_VERSION, LEGACY_CHECKPOINT_SCHEMA_VERSION]
      .includes(checkpoint.schemaVersion)
  ) {
    throw new Error(
      `organization checkpoint schemaVersion must be "${CHECKPOINT_SCHEMA_VERSION}"`
      + ` or "${LEGACY_CHECKPOINT_SCHEMA_VERSION}"`,
    );
  }
  if (checkpoint.kind !== CHECKPOINT_KIND) {
    throw new Error('file is not an actions-warden organization checkpoint');
  }
  const storedIdentity = normalizeCheckpointIdentity(checkpoint);
  validateIdentity(storedIdentity, identity);
  if (!Array.isArray(checkpoint.repositories)) {
    throw new Error('organization checkpoint repositories must be an array');
  }

  const results = new Map();
  for (const value of checkpoint.repositories) {
    const result = validateCheckpointResult(value, identity);
    const key = result.repository.toLowerCase();
    if (results.has(key)) throw new Error(`duplicate checkpoint repository: ${result.repository}`);
    results.set(key, result);
  }
  return {
    path: resolvedPath,
    results,
    migrationRequired: checkpoint.schemaVersion !== CHECKPOINT_SCHEMA_VERSION
      || checkpoint.toolVersion !== VERSION,
  };
}

export async function validateOrganizationCheckpointPath({ path, cwd }) {
  return writeFileGuarded({ path, content: '', cwd, dryRun: true });
}

export async function writeOrganizationCheckpoint({
  path,
  cwd,
  identity,
  repositoryResults,
}) {
  const repositories = [...repositoryResults]
    .map(result => serializeCheckpointResult(result, cwd))
    .sort((left, right) => left.repository.localeCompare(right.repository));
  const content = `${JSON.stringify(redactDeep({
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
    kind: CHECKPOINT_KIND,
    toolVersion: VERSION,
    identity,
    repositories,
  }), null, 2)}\n`;
  if (Buffer.byteLength(content) > MAX_ORGANIZATION_CHECKPOINT_BYTES) {
    throw new Error(
      `organization checkpoint exceeds ${MAX_ORGANIZATION_CHECKPOINT_BYTES} bytes`,
    );
  }
  return writeFileGuarded({ path, content, cwd, dryRun: false });
}

export function canReuseCheckpointResult(result, repository, treeSha) {
  return result.repository === repository.fullName
    && result.branch === repository.defaultBranch
    && result.treeSha === treeSha
    && result.errors.length === 0;
}

export function restoreCheckpointResult(result, { repository, cwd, sourceUrl }) {
  const repositoryRoot = resolve(cwd, repository.owner, repository.name);
  const findings = result.findings.map(finding => ({
    ...finding,
    file: resolve(repositoryRoot, ...finding.file.split('/')),
    repository: repository.fullName,
    branch: repository.defaultBranch,
    url: sourceUrl(repository, finding.file, finding.line),
  }));
  return {
    repository,
    revision: { branch: repository.defaultBranch, treeSha: result.treeSha },
    files: [...result.files],
    findings,
    errors: result.errors.map(error => ({
      repository: repository.fullName,
      ...(error.path ? { path: error.path } : {}),
      error: error.error,
    })),
    summary: { ...result.summary },
    status: result.status,
  };
}

function serializeCheckpointResult(result, cwd) {
  const repositoryRoot = resolve(cwd, result.repository.owner, result.repository.name);
  return {
    repository: result.repository.fullName,
    branch: result.revision.branch,
    treeSha: result.revision.treeSha,
    files: [...result.files],
    findings: result.findings.map(finding => {
      const copy = { ...finding, file: canonicalPath(finding.file, repositoryRoot) };
      delete copy.repository;
      delete copy.branch;
      delete copy.url;
      return copy;
    }),
    errors: result.errors.map(error => ({
      ...(error.path ? { path: error.path } : {}),
      error: error.error,
    })),
    summary: result.summary,
    status: result.status,
  };
}

function validateIdentity(actual, expected) {
  if (!isRecord(actual)) throw new Error('organization checkpoint identity is invalid');
  for (const field of [
    'analysisGeneration',
    'rulesHash',
    'organization',
    'scope',
    'configHash',
    'baselineHash',
  ]) {
    if (stableStringify(actual[field]) !== stableStringify(expected[field])) {
      throw new Error(`organization checkpoint does not match current ${field}`);
    }
  }
}

function normalizeCheckpointIdentity(checkpoint) {
  if (!isRecord(checkpoint.identity)) {
    throw new Error('organization checkpoint identity is invalid');
  }
  if (checkpoint.schemaVersion === CHECKPOINT_SCHEMA_VERSION) {
    if (typeof checkpoint.toolVersion !== 'string' || !TOOL_VERSION_RE.test(checkpoint.toolVersion)) {
      throw new Error('organization checkpoint toolVersion is invalid');
    }
    return checkpoint.identity;
  }
  if (checkpoint.identity.toolVersion !== FIRST_ANALYSIS_GENERATION_TOOL_VERSION) {
    throw new Error(
      `organization checkpoint toolVersion ${String(checkpoint.identity.toolVersion)}`
      + ' has no compatible analysis generation',
    );
  }
  return {
    analysisGeneration: 1,
    rulesHash: checkpoint.identity.rulesHash,
    organization: checkpoint.identity.organization,
    scope: checkpoint.identity.scope,
    configHash: checkpoint.identity.configHash,
    baselineHash: checkpoint.identity.baselineHash,
  };
}

function validateCheckpointResult(value, identity) {
  if (!isRecord(value)) throw new Error('organization checkpoint repository result is invalid');
  const repository = validateFullName(value.repository);
  const branch = validateBranch(value.branch);
  const treeSha = value.treeSha === null ? null : validateSha(value.treeSha, repository);
  const files = validateFiles(value.files, repository);
  const findings = validateFindings(value.findings, {
    repository,
    files: new Set(files),
    explain: identity.scope.explain,
  });
  const errors = validateErrors(value.errors, repository);
  const summary = validateSummary(value.summary, files, findings, repository);
  const status = findings.length === 0 && errors.length === 0 ? 'OK' : 'FAIL';
  if (value.status !== status) {
    throw new Error(`organization checkpoint status is inconsistent for ${repository}`);
  }
  return { repository, branch, treeSha, files, findings, errors, summary, status };
}

function validateFullName(value) {
  if (typeof value !== 'string') throw new Error('checkpoint repository name must be a string');
  const parts = value.split('/');
  if (
    parts.length !== 2
    || parts.some(part => !NAME_RE.test(part) || part === '.' || part === '..')
  ) throw new Error(`invalid checkpoint repository: ${value}`);
  return value;
}

function validateBranch(value) {
  if (value === null) return null;
  if (
    typeof value !== 'string'
    || !value
    || value.includes('\0')
    || value.startsWith('/')
    || value.endsWith('/')
  ) throw new Error('invalid checkpoint default branch');
  return value;
}

function validateSha(value, repository) {
  if (typeof value !== 'string' || !SHA_RE.test(value)) {
    throw new Error(`invalid checkpoint tree SHA for ${repository}`);
  }
  return value.toLowerCase();
}

function validateFiles(value, repository) {
  if (!Array.isArray(value)) throw new Error(`invalid checkpoint files for ${repository}`);
  if (value.some(path => !isWorkflowPath(path))) {
    throw new Error(`invalid checkpoint workflow path for ${repository}`);
  }
  if (new Set(value).size !== value.length) {
    throw new Error(`duplicate checkpoint workflow path for ${repository}`);
  }
  if (value.some((path, index) => index > 0 && value[index - 1].localeCompare(path) > 0)) {
    throw new Error(`checkpoint workflow paths are not ordered for ${repository}`);
  }
  return [...value];
}

function validateFindings(value, { repository, files, explain }) {
  if (!Array.isArray(value)) throw new Error(`invalid checkpoint findings for ${repository}`);
  return value.map(finding => {
    if (
      !isRecord(finding)
      || typeof finding.id !== 'string'
      || !ID_RE.test(finding.id)
      || typeof finding.fingerprint !== 'string'
      || !ID_RE.test(finding.fingerprint)
      || !RULE_IDS.has(finding.ruleId)
      || !SEVERITIES.has(finding.severity)
      || !files.has(finding.file)
      || !Number.isInteger(finding.line)
      || finding.line < 0
      || !isRecord(finding.fields)
      || !isJsonValue(finding.fields)
      || finding.fields.file !== `${repository}/${finding.file}`
      || finding.fields.sev !== finding.severity
      || (explain ? typeof finding.explain !== 'string' : finding.explain !== undefined)
    ) {
      throw new Error(`invalid checkpoint finding for ${repository}`);
    }
    return {
      id: finding.id,
      ruleId: finding.ruleId,
      severity: finding.severity,
      file: finding.file,
      line: finding.line,
      fields: finding.fields,
      ...(finding.explain === undefined ? {} : { explain: finding.explain }),
      fingerprint: finding.fingerprint,
    };
  });
}

function validateErrors(value, repository) {
  if (!Array.isArray(value)) throw new Error(`invalid checkpoint errors for ${repository}`);
  return value.map(error => {
    if (
      !isRecord(error)
      || typeof error.error !== 'string'
      || (error.path !== undefined && !isWorkflowPath(error.path))
    ) throw new Error(`invalid checkpoint error for ${repository}`);
    return {
      ...(error.path === undefined ? {} : { path: error.path }),
      error: error.error,
    };
  });
}

function validateSummary(value, files, findings, repository) {
  if (!isRecord(value)) throw new Error(`invalid checkpoint summary for ${repository}`);
  const fields = [
    'files',
    'findings',
    'totalFindings',
    'suppressed',
    'critical',
    'high',
    'medium',
    'low',
  ];
  if (fields.some(field => !Number.isSafeInteger(value[field]) || value[field] < 0)) {
    throw new Error(`invalid checkpoint summary for ${repository}`);
  }
  const counts = summarize(findings);
  if (
    value.files !== files.length
    || value.findings !== findings.length
    || value.totalFindings !== value.findings + value.suppressed
    || [...SEVERITIES].some(severity => value[severity] !== counts[severity])
  ) throw new Error(`inconsistent checkpoint summary for ${repository}`);
  return Object.fromEntries(fields.map(field => [field, value[field]]));
}

function digest(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

function isJsonValue(value, seen = new Set()) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!value || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  const valid = Array.isArray(value)
    ? value.every(item => isJsonValue(item, seen))
    : Object.entries(value).every(([key, item]) => (
      typeof key === 'string' && isJsonValue(item, seen)
    ));
  seen.delete(value);
  return valid;
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
