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
import {
  FILE_STATUSES,
  GIT_SHA_RE,
  NAME_RE,
  SEVERITIES,
  comparePaths,
  isJsonValue,
  isRecord,
} from './org-schema.js';
import { sourcePermalink, sourceUrl } from './org-source-links.js';
import { redactDeep } from './redact.js';
import { writeFileGuarded } from './writer.js';
import { listRules } from '../rules/index.js';
import { VERSION } from '../version.js';

const CHECKPOINT_KIND = 'actions-warden-org-scan';
const CHECKPOINT_SCHEMA_VERSION = '1.1';
const TOOL_VERSION_RE = /^\d+\.\d+\.\d+$/;

/**
 * Checkpoint compatibility generation. Increment it whenever organization
 * discovery, parsing, finding identity, rule evaluation, or persisted result
 * semantics change; compatible package releases keep the current value.
 */
export const ORGANIZATION_ANALYSIS_GENERATION = 3;

/** Maximum accepted or generated checkpoint size, in bytes. */
export const MAX_ORGANIZATION_CHECKPOINT_BYTES = 256 * 1024 * 1024;
const ID_RE = /^[0-9a-f]{16}$/;
const RULE_IDS = new Set(['parse-error', ...listRules().map(rule => rule.id)]);
const RULES_HASH = digest(listRules());

/**
 * Build the version-independent identity that controls whether checkpoint
 * results are compatible with the requested scan and policy.
 */
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
 * Create the stable key used by automatic organization-scan artifacts from
 * the version-independent compatibility identity.
 */
export function createOrganizationCheckpointArtifactKey(identity) {
  return createHash('sha256')
    .update(stableStringify(identity))
    .digest('hex')
    .slice(0, 32);
}

/**
 * Load and fully validate a checkpoint, returning its reusable repository
 * results. Only the current schema version is accepted.
 */
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
  if (!isRecord(checkpoint) || checkpoint.schemaVersion !== CHECKPOINT_SCHEMA_VERSION) {
    throw new Error(
      `organization checkpoint schemaVersion must be "${CHECKPOINT_SCHEMA_VERSION}";`
      + ' older checkpoints cannot be resumed, so start a fresh scan to replace it',
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
  return { path: resolvedPath, results };
}

/** Validate a checkpoint destination without creating or replacing a file. */
export async function validateOrganizationCheckpointPath({ path, cwd }) {
  return writeFileGuarded({ path, content: '', cwd, dryRun: true });
}

/** Serialize, redact, size-check, and atomically replace a checkpoint. */
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

/** Return whether a result is error-free and still matches the live revision. */
export function canReuseCheckpointResult(result, repository, treeSha) {
  return result.repository === repository.fullName
    && result.branch === repository.defaultBranch
    && result.treeSha === treeSha
    && result.errors.length === 0
    && !result.findings.some(finding => finding.ruleId === 'parse-error');
}

/**
 * Rehydrate validated checkpoint data with local paths and live source links.
 * The live default-branch commit supplies every permalink and the revision's
 * commit, so a resumed report matches a freshly scanned one.
 */
export function restoreCheckpointResult(result, { repository, cwd, commitSha }) {
  const repositoryRoot = resolve(cwd, repository.owner, repository.name);
  const blobShas = new Map(result.fileDetails.map(detail => [detail.path, detail.blobSha]));
  const link = (path, line) => sourcePermalink(repository, commitSha, path, line);
  const findings = result.findings.map(finding => ({
    ...finding,
    file: resolve(repositoryRoot, ...finding.file.split('/')),
    repository: repository.fullName,
    branch: repository.defaultBranch,
    url: sourceUrl(repository, finding.file, finding.line),
    path: finding.file,
    blobSha: blobShas.get(finding.file) ?? null,
    permalink: link(finding.file, finding.line),
  }));
  return {
    repository,
    revision: {
      branch: repository.defaultBranch,
      treeSha: result.treeSha,
      commitSha: commitSha ?? null,
    },
    files: [...result.files],
    fileDetails: result.fileDetails.map(detail => ({ ...detail, permalink: link(detail.path) })),
    findings,
    errors: result.errors.map(error => ({
      repository: repository.fullName,
      ...(error.path ? { path: error.path } : {}),
      error: error.error,
      ...(error.path ? { permalink: link(error.path) } : {}),
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
    fileDetails: result.fileDetails.map(detail => ({
      path: detail.path,
      blobSha: detail.blobSha,
      bytes: detail.bytes,
      status: detail.status,
      findings: detail.findings,
    })),
    findings: result.findings.map(finding => {
      const copy = { ...finding, file: canonicalPath(finding.file, repositoryRoot) };
      for (const derived of ['repository', 'branch', 'url', 'path', 'blobSha', 'permalink']) {
        delete copy[derived];
      }
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
  if (typeof checkpoint.toolVersion !== 'string' || !TOOL_VERSION_RE.test(checkpoint.toolVersion)) {
    throw new Error('organization checkpoint toolVersion is invalid');
  }
  return checkpoint.identity;
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
  const fileDetails = validateFileDetails(value.fileDetails, {
    repository,
    files,
    findings,
    errors,
  });
  const summary = validateSummary(value.summary, files, findings, repository);
  const status = findings.length === 0 && errors.length === 0 ? 'OK' : 'FAIL';
  if (value.status !== status) {
    throw new Error(`organization checkpoint status is inconsistent for ${repository}`);
  }
  return { repository, branch, treeSha, files, fileDetails, findings, errors, summary, status };
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
  if (typeof value !== 'string' || !GIT_SHA_RE.test(value)) {
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
  if (value.some((path, index) => index > 0 && comparePaths(value[index - 1], path) > 0)) {
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

const FILE_DETAIL_KEYS = ['blobSha', 'bytes', 'findings', 'path', 'status'];

function validateFileDetails(value, { repository, files, findings, errors }) {
  if (!Array.isArray(value)) throw new Error(`invalid checkpoint fileDetails for ${repository}`);
  const details = value.map(detail => validateFileDetail(detail, repository));
  for (let index = 1; index < details.length; index += 1) {
    const order = comparePaths(details[index - 1].path, details[index].path);
    if (order === 0) throw new Error(`duplicate checkpoint fileDetails path for ${repository}`);
    if (order > 0) throw new Error(`checkpoint fileDetails are not ordered for ${repository}`);
  }
  assertFileDetailsMatchEvidence(details, { repository, files, findings, errors });
  return details;
}

function validateFileDetail(detail, repository) {
  if (
    !isRecord(detail)
    || Object.keys(detail).sort().join() !== FILE_DETAIL_KEYS.join()
    || !isWorkflowPath(detail.path)
    || !FILE_STATUSES.has(detail.status)
    || (detail.blobSha !== null && !GIT_SHA_RE.test(String(detail.blobSha)))
    || (detail.bytes !== null && !isCount(detail.bytes))
    || !isCount(detail.findings)
  ) throw new Error(`invalid checkpoint fileDetails entry for ${repository}`);
  return {
    path: detail.path,
    blobSha: detail.blobSha === null ? null : detail.blobSha.toLowerCase(),
    bytes: detail.bytes,
    status: detail.status,
    findings: detail.findings,
  };
}

function assertFileDetailsMatchEvidence(details, { repository, files, findings, errors }) {
  const readable = details
    .filter(detail => detail.status !== 'unreadable')
    .map(detail => detail.path);
  const errorPaths = new Set(errors.map(error => error.path));
  const inconsistent = (
    readable.length !== files.length
    || readable.some((path, index) => path !== files[index])
    || details.some(detail => detail.status === 'unreadable' && !errorPaths.has(detail.path))
    || details.some(detail => !fileDetailMatchesFindings(detail, findings))
  );
  if (inconsistent) throw new Error(`inconsistent checkpoint fileDetails for ${repository}`);
}

function fileDetailMatchesFindings(detail, findings) {
  const own = findings.filter(finding => finding.file === detail.path);
  const parseError = own.some(finding => finding.ruleId === 'parse-error');
  return own.length === detail.findings
    && (detail.status === 'parse-error') === parseError;
}

function isCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
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
