/**
 * Organization scan command - enumerate repositories through the GitHub API,
 * fetch workflow YAML from each default branch, and aggregate audit findings.
 */

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import picomatch from 'picomatch';
import { auditSources } from './audit.js';
import { emptyBaseline, loadBaseline } from '../lib/baseline.js';
import { filterIgnoredPaths, loadConfig } from '../lib/config.js';
import { mapLimit } from '../lib/concurrency.js';
import { format, summarize } from '../lib/formatter.js';
import { canonicalPath } from '../lib/identity.js';
import {
  fetchRepositoryWorkflowTree,
  fetchRepositoryWorkflows,
  listOrganizationRepositories,
} from '../lib/github-org.js';
import {
  canReuseCheckpointResult,
  createOrganizationCheckpointArtifactKey,
  createOrganizationCheckpointIdentity,
  loadOrganizationCheckpoint,
  restoreCheckpointResult,
  validateOrganizationCheckpointPath,
  writeOrganizationCheckpoint,
} from '../lib/org-checkpoint.js';
import { buildOrganizationReport, organizationReportRecords } from '../lib/org-report.js';
import {
  NAME_RE,
  VISIBILITIES,
  comparePaths,
  normalizePatterns,
} from '../lib/org-schema.js';
import { sourcePermalink, sourceUrl } from '../lib/org-source-links.js';
import { resolveToken } from '../lib/resolver.js';
import { RULES } from '../rules/index.js';
import { sameFilePath } from '../lib/path-equality.js';

/**
 * @param {object} opts
 * @param {string} opts.organization
 * @param {string} [opts.cwd]
 * @param {string} [opts.token]
 * @param {string[]} [opts.repositories]
 * @param {'all'|'public'|'private'|'internal'} [opts.visibility]
 * @param {boolean} [opts.includeArchived]
 * @param {boolean} [opts.includeDisabled]
 * @param {boolean} [opts.includeForks]
 * @param {number} [opts.maxRepositories]
 * @param {number} [opts.concurrency]
 * @param {'low'|'medium'|'high'|'critical'} [opts.severity]
 * @param {boolean} [opts.explain]
 * @param {string|false} [opts.configPath]
 * @param {string} [opts.baseline]
 * @param {string} [opts.checkpointPath]
 * @param {boolean} [opts.resume]
 * @param {(event: object) => void|Promise<void>} [opts.onProgress]
 */
export async function scanOrganization({
  organization,
  cwd = process.cwd(),
  token,
  repositories,
  visibility = 'all',
  includeArchived = false,
  includeDisabled = false,
  includeForks = false,
  maxRepositories,
  concurrency = 4,
  severity,
  explain = false,
  configPath,
  baseline,
  checkpointPath,
  resume = false,
  onProgress,
} = {}) {
  const settings = validateScanOptions({
    organization,
    cwd,
    token,
    repositories,
    visibility,
    includeArchived,
    includeDisabled,
    includeForks,
    maxRepositories,
    concurrency,
    severity,
    explain,
    configPath,
    baseline,
    checkpointPath,
    resume,
    onProgress,
  });
  const startedAt = Date.now();
  await emitProgress(onProgress, { type: 'scan-started', organization });
  const environment = await prepareScanEnvironment(settings);
  const loadedCheckpoint = await loadResumeState(settings, environment);
  const selection = await selectScanRepositories(settings, environment);
  const checkpoint = await openCheckpoint(settings, environment, loadedCheckpoint, selection);
  const state = { settings, environment, loadedCheckpoint, selection, checkpoint };
  const counters = await scanSelectedRepositories(state);

  const result = assembleOrganizationResult(state, counters.repositoryResults);
  await emitProgress(onProgress, {
    type: 'scan-completed',
    organization,
    status: result.status,
    total: selection.selected.length,
    completed: counters.completed,
    reused: counters.reused,
    findings: result.summary.findings,
    errors: result.summary.errors,
    elapsedMs: Date.now() - startedAt,
  });
  return result;
}

/**
 * Render an organization scan result with repository-relative paths and the
 * selected public serialization contract.
 *
 * @param {Awaited<ReturnType<typeof scanOrganization>>} result
 * @param {{format: 'toon'|'json'|'text'|'csv'|'sarif'|'html', cwd?: string,
 *   comparison?: object}} options
 * @returns {string}
 */
export function renderOrganizationScan(result, {
  format: outputFormat,
  cwd = process.cwd(),
  comparison = result.comparison,
}) {
  const report = buildOrganizationReport(result, { cwd, comparison });
  if (outputFormat === 'json') {
    return format('json', [], { status: report.status, json: report });
  }
  const { records, title, metadata } = organizationReportRecords(report, {
    format: outputFormat,
  });
  return format(outputFormat, records, { status: report.status, title, metadata });
}

function validateScanOptions(settings) {
  assertOrganizationName(settings.organization);
  if (!VISIBILITIES.has(settings.visibility)) {
    throw new Error(`invalid visibility: ${settings.visibility}`);
  }
  assertConcurrency(settings.concurrency);
  assertMaxRepositories(settings.maxRepositories);
  assertCheckpointOptions(settings.checkpointPath, settings.resume);
  if (settings.onProgress !== undefined && typeof settings.onProgress !== 'function') {
    throw new Error('onProgress must be a function');
  }
  return settings;
}

function assertOrganizationName(organization) {
  if (
    typeof organization !== 'string'
    || !NAME_RE.test(organization)
    || organization === '.'
    || organization === '..'
  ) throw new Error('invalid organization');
}

function assertConcurrency(concurrency) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) {
    throw new Error('concurrency must be an integer from 1 to 16');
  }
}

function assertMaxRepositories(maxRepositories) {
  if (
    maxRepositories !== undefined
    && (!Number.isInteger(maxRepositories) || maxRepositories < 1)
  ) throw new Error('max repositories must be a positive integer');
}

function assertCheckpointOptions(checkpointPath, resume) {
  if (checkpointPath !== undefined && (typeof checkpointPath !== 'string' || !checkpointPath)) {
    throw new Error('checkpoint path must be a non-empty string');
  }
  if (typeof resume !== 'boolean') throw new Error('resume must be a boolean');
  if (resume && !checkpointPath) throw new Error('resume requires a checkpoint path');
}

async function loadResumeState(settings, environment) {
  const { cwd, checkpointPath, resume, onProgress } = settings;
  if (!resume) return { results: new Map() };
  const loadedCheckpoint = await loadOrganizationCheckpoint({
    path: checkpointPath,
    cwd,
    identity: environment.checkpointIdentity,
  });
  await emitProgress(onProgress, {
    type: 'checkpoint-loaded',
    repositories: loadedCheckpoint.results.size,
  });
  return loadedCheckpoint;
}

async function prepareScanEnvironment(settings) {
  const {
    organization,
    cwd,
    token,
    repositories,
    visibility,
    includeArchived,
    includeDisabled,
    includeForks,
    maxRepositories,
    severity,
    explain,
    configPath,
    baseline,
    checkpointPath,
  } = settings;
  const patterns = normalizePatterns(repositories);
  const resolvedToken = resolveToken(token);
  const config = await loadConfig({
    cwd,
    path: configPath,
    ruleIds: RULES.map(rule => rule.id),
  });
  const baselinePath = baseline ?? config.baseline;
  const baselineData = baselinePath
    ? await loadBaseline({ path: baselinePath, cwd })
    : emptyBaseline();
  if (checkpointPath) {
    await validateOrganizationCheckpointPath({ path: checkpointPath, cwd });
    await assertCheckpointDoesNotReplaceControlFile(checkpointPath, cwd, [
      config.path,
      baselineData.path,
    ]);
  }
  const checkpointIdentity = createOrganizationCheckpointIdentity({
    organization,
    repositories: patterns,
    visibility,
    includeArchived,
    includeDisabled,
    includeForks,
    maxRepositories,
    severity,
    explain,
    config,
    baselineData,
  });
  return { patterns, resolvedToken, config, baselineData, checkpointIdentity };
}

async function selectScanRepositories(settings, environment) {
  const {
    organization,
    cwd,
    includeArchived,
    includeDisabled,
    includeForks,
    maxRepositories,
    visibility,
    onProgress,
  } = settings;
  const { patterns, resolvedToken } = environment;
  await emitProgress(onProgress, { type: 'discovery-started', organization });
  const discovered = await listOrganizationRepositories({
    organization,
    token: resolvedToken,
    cwd,
    onRetry: retry => emitRetryProgress(onProgress, retry),
    onPage: page => emitProgress(onProgress, {
      type: 'discovery-page',
      organization,
      page: page.page,
      repositoriesDiscovered: page.repositoriesDiscovered,
      ...(Number.isSafeInteger(page.rateLimit?.remaining)
        ? { rateLimitRemaining: page.rateLimit.remaining }
        : {}),
    }),
  });
  const eligible = selectRepositories(discovered, {
    patterns,
    visibility,
    includeArchived,
    includeDisabled,
    includeForks,
  });
  if (patterns.length > 0 && eligible.length === 0) {
    throw new Error(`no repositories matched: ${patterns.join(', ')}`);
  }
  const selected = maxRepositories === undefined
    ? eligible
    : eligible.slice(0, maxRepositories);
  await emitProgress(onProgress, {
    type: 'discovery-completed',
    organization,
    discovered: discovered.length,
    eligible: eligible.length,
    selected: selected.length,
  });
  return { discovered, eligible, selected };
}

async function openCheckpoint(settings, environment, loadedCheckpoint, selection) {
  const { cwd, checkpointPath, resume, onProgress } = settings;
  const results = new Map();
  for (const repository of selection.selected) {
    const stored = loadedCheckpoint.results.get(repository.fullName.toLowerCase());
    if (!stored) continue;
    results.set(repository.fullName.toLowerCase(), restoreCheckpointResult(stored, {
      repository,
      cwd,
      commitSha: null,
    }));
  }
  const persist = createCheckpointWriter({
    path: checkpointPath,
    cwd,
    identity: environment.checkpointIdentity,
    results,
  });
  if (checkpointPath && !resume) {
    await persist();
    await emitProgress(onProgress, { type: 'checkpoint-created' });
  }
  return { results, persist };
}

async function scanSelectedRepositories(state) {
  const { settings, selection } = state;
  const counters = { completed: 0, reused: 0, active: 0 };
  const repositoryResults = await mapLimit(
    selection.selected,
    settings.concurrency,
    (repository, index) => processRepository(state, counters, repository, index),
  );
  return { ...counters, repositoryResults };
}

async function processRepository(state, counters, repository, index) {
  const { settings, selection, checkpoint } = state;
  const { onProgress, checkpointPath, concurrency } = settings;
  const total = selection.selected.length;
  counters.active += 1;
  await emitProgress(onProgress, {
    type: 'repository-started',
    repository: repository.fullName,
    position: index + 1,
    total,
    completed: counters.completed,
    active: counters.active,
    concurrency,
  });
  const emitPhase = phase => emitProgress(onProgress, {
    type: 'repository-phase',
    repository: repository.fullName,
    position: index + 1,
    total,
    completed: counters.completed,
    active: counters.active,
    concurrency,
    phase,
  });
  const { repositoryResult, wasReused } = await scanRepository(state, repository, emitPhase);
  if (checkpointPath) {
    await emitPhase('writing checkpoint');
    checkpoint.results.set(repository.fullName.toLowerCase(), repositoryResult);
    const durableRepositories = await checkpoint.persist();
    await emitProgress(onProgress, {
      type: 'checkpoint-written',
      repository: repository.fullName,
      position: index + 1,
      total,
      repositories: durableRepositories,
    });
  }
  counters.completed += 1;
  if (wasReused) counters.reused += 1;
  counters.active -= 1;
  await emitProgress(onProgress, {
    type: 'repository-completed',
    repository: repository.fullName,
    position: index + 1,
    total,
    completed: counters.completed,
    reused: wasReused,
    status: repositoryResult.status,
    files: repositoryResult.files.length,
    findings: repositoryResult.findings.length,
    errors: repositoryResult.errors.length,
    active: counters.active,
    concurrency,
  });
  return repositoryResult;
}

async function scanRepository(state, repository, emitPhase) {
  try {
    return await readOrReuseRepository(state, repository, emitPhase);
  } catch (error) {
    if (error instanceof ProgressCallbackError) throw error;
    return {
      repositoryResult: failedRepositoryResult(repository, error),
      wasReused: false,
    };
  }
}

async function readOrReuseRepository(state, repository, emitPhase) {
  const { settings, environment, loadedCheckpoint } = state;
  const { cwd, onProgress } = settings;
  const { config, resolvedToken } = environment;
  await emitPhase('reading default-branch tree');
  const workflowTree = await fetchRepositoryWorkflowTree({
    repository,
    token: resolvedToken,
    cwd,
    includePath: path => filterIgnoredPaths([
      virtualPath(cwd, repository, path),
    ], config, cwd).length > 0,
    onRetry: retry => emitRetryProgress(onProgress, retry, repository.fullName),
  });
  const stored = loadedCheckpoint.results.get(repository.fullName.toLowerCase());
  await emitPhase('checking resumable evidence');
  if (stored && canReuseCheckpointResult(stored, repository, workflowTree.treeSha)) {
    return {
      repositoryResult: restoreCheckpointResult(stored, {
        repository,
        cwd,
        commitSha: workflowTree.commitSha,
      }),
      wasReused: true,
    };
  }
  await emitPhase('downloading workflow YAML');
  const fetched = await fetchRepositoryWorkflows({
    repository,
    token: resolvedToken,
    cwd,
    workflowTree,
    onRetry: retry => emitRetryProgress(onProgress, retry, repository.fullName),
  });
  await emitPhase('auditing workflows');
  return {
    repositoryResult: await auditRepositoryResult(state, repository, fetched),
    wasReused: false,
  };
}

async function auditRepositoryResult(state, repository, fetched) {
  const { cwd, severity, explain } = state.settings;
  const { config, baselineData } = state.environment;
  const repositoryRoot = resolve(cwd, repository.owner, repository.name);
  const sources = fetched.sources.map(item => ({
    file: virtualPath(cwd, repository, item.path),
    source: item.source,
  }));
  const auditResult = await auditSources({
    cwd,
    sources,
    severity,
    explain,
    config,
    baselineData,
  });
  const blobShas = new Map(fetched.entries.map(entry => [entry.path, entry.blobSha]));
  const link = (path, line) => sourcePermalink(repository, fetched.commitSha, path, line);
  const errors = fetched.errors.map(error => ({
    repository: repository.fullName,
    path: error.path,
    error: error.error,
    permalink: link(error.path),
  }));
  const findings = auditResult.findings.map(finding => {
    const path = canonicalPath(finding.file, repositoryRoot);
    return {
      ...finding,
      repository: repository.fullName,
      branch: repository.defaultBranch,
      url: sourceUrl(repository, path, finding.line),
      path,
      blobSha: blobShas.get(path) ?? null,
      permalink: link(path, finding.line),
    };
  });
  return {
    repository,
    revision: {
      branch: repository.defaultBranch,
      treeSha: fetched.treeSha,
      commitSha: fetched.commitSha,
    },
    files: auditResult.files.map(file => canonicalPath(file, repositoryRoot)),
    fileDetails: buildFileDetails(fetched.entries, findings, link),
    findings,
    errors,
    summary: auditResult.summary,
    status: auditResult.status === 'FAIL' || errors.length > 0 ? 'FAIL' : 'OK',
  };
}

function buildFileDetails(entries, findings, link) {
  const counts = new Map();
  const parseErrors = new Set();
  for (const finding of findings) {
    counts.set(finding.path, (counts.get(finding.path) ?? 0) + 1);
    if (finding.ruleId === 'parse-error') parseErrors.add(finding.path);
  }
  return entries
    .map(entry => ({
      path: entry.path,
      blobSha: entry.blobSha,
      bytes: entry.bytes,
      status: fileStatus(entry, parseErrors),
      findings: counts.get(entry.path) ?? 0,
      permalink: link(entry.path),
    }))
    .sort((left, right) => comparePaths(left.path, right.path));
}

function fileStatus(entry, parseErrors) {
  if (!entry.readable) return 'unreadable';
  return parseErrors.has(entry.path) ? 'parse-error' : 'scanned';
}

function failedRepositoryResult(repository, error) {
  return {
    repository,
    revision: { branch: repository.defaultBranch, treeSha: null, commitSha: null },
    files: [],
    fileDetails: [],
    findings: [],
    errors: [{
      repository: repository.fullName,
      error: String(error.message ?? error),
    }],
    summary: emptySummary(),
    status: 'FAIL',
  };
}

function assembleOrganizationResult(state, repositoryResults) {
  const { settings, environment, selection } = state;
  const { checkpointIdentity, patterns, baselineData, config } = environment;
  const findings = repositoryResults.flatMap(result => result.findings);
  const errors = repositoryResults.flatMap(result => result.errors);
  const summary = summarizeRepositoryResults(selection, repositoryResults, findings, errors);
  return {
    organization: settings.organization,
    analysis: {
      generation: checkpointIdentity.analysisGeneration,
      identity: createHash('sha256')
        .update(createOrganizationCheckpointArtifactKey(checkpointIdentity))
        .digest('hex'),
    },
    scope: {
      repositories: patterns,
      visibility: settings.visibility,
      includeArchived: settings.includeArchived,
      includeDisabled: settings.includeDisabled,
      includeForks: settings.includeForks,
      maxRepositories: settings.maxRepositories ?? null,
      concurrency: settings.concurrency,
      severity: settings.severity ?? null,
    },
    coverage: describeCoverage(selection, repositoryResults),
    repositories: repositoryResults,
    findings,
    errors,
    summary,
    baseline: {
      path: baselineData.path,
      suppressed: summary.suppressed,
    },
    configPath: config.path,
    status: findings.length === 0 && errors.length === 0 ? 'OK' : 'FAIL',
  };
}

function summarizeRepositoryResults(selection, repositoryResults, findings, errors) {
  const { discovered, eligible, selected } = selection;
  return {
    repositoriesDiscovered: discovered.length,
    repositoriesEligible: eligible.length,
    repositoriesSelected: selected.length,
    repositoriesScanned: repositoryResults.length,
    repositoriesWithWorkflows: repositoryResults.filter(result => result.files.length > 0).length,
    repositoriesWithFindings: repositoryResults.filter(result => result.findings.length > 0).length,
    repositoriesFailed: repositoryResults.filter(result => result.errors.length > 0).length,
    repositoriesSkipped: discovered.length - selected.length,
    files: repositoryResults.reduce((total, result) => total + result.files.length, 0),
    findings: findings.length,
    totalFindings: repositoryResults.reduce(
      (total, result) => total + result.summary.totalFindings,
      0,
    ),
    suppressed: repositoryResults.reduce((total, result) => total + result.summary.suppressed, 0),
    errors: errors.length,
    ...summarize(findings),
  };
}

function describeCoverage(selection, repositoryResults) {
  const { eligible, selected } = selection;
  const incompleteRepositories = repositoryResults
    .filter(repositoryResult => !repositoryCoverageComplete(repositoryResult))
    .map(repositoryResult => repositoryResult.repository.fullName)
    .sort((left, right) => left.localeCompare(right));
  const selectedRepositoriesComplete = incompleteRepositories.length === 0;
  const limitedByMaxRepositories = selected.length < eligible.length;
  return {
    complete: selectedRepositoriesComplete && !limitedByMaxRepositories,
    enumerationComplete: true,
    selectedRepositoriesComplete,
    eligibleRepositoriesComplete: selectedRepositoriesComplete && !limitedByMaxRepositories,
    limitedByMaxRepositories,
    repositoriesOmittedByLimit: eligible.length - selected.length,
    incompleteRepositories,
  };
}

function selectRepositories(repositories, options) {
  const matchers = options.patterns.map(pattern => picomatch(pattern, { nocase: true }));
  return repositories.filter(repository => {
    if (!options.includeArchived && repository.archived) return false;
    if (!options.includeDisabled && repository.disabled) return false;
    if (!options.includeForks && repository.fork) return false;
    if (options.visibility !== 'all' && repository.visibility !== options.visibility) return false;
    if (
      matchers.length > 0
      && !matchers.some(matches => matches(repository.name) || matches(repository.fullName))
    ) return false;
    return true;
  });
}

function virtualPath(cwd, repository, path) {
  return resolve(cwd, repository.owner, repository.name, ...path.split('/'));
}

function createCheckpointWriter({ path, cwd, identity, results }) {
  let pending = Promise.resolve();
  return async function persistCheckpoint() {
    if (!path) return 0;
    const snapshot = [...results.values()];
    const write = pending.then(() => writeOrganizationCheckpoint({
      path,
      cwd,
      identity,
      repositoryResults: snapshot,
    }));
    pending = write;
    await write;
    return snapshot.length;
  };
}

function repositoryCoverageComplete(repositoryResult) {
  return repositoryResult.errors.length === 0
    && !repositoryResult.findings.some(finding => finding.ruleId === 'parse-error');
}

async function assertCheckpointDoesNotReplaceControlFile(path, cwd, controlFiles) {
  const requested = resolve(cwd, path);
  for (const controlFile of controlFiles) {
    if (controlFile && await sameFilePath(requested, resolve(controlFile))) {
      throw new Error('checkpoint path cannot replace the active config or baseline');
    }
  }
}

async function emitRetryProgress(onProgress, retry, repository) {
  await emitProgress(onProgress, {
    type: 'request-retry',
    ...(repository ? { repository } : {}),
    attempt: retry.attempt,
    maxRetries: retry.maxRetries,
    reason: retry.reason,
    delayMs: retry.delayMs,
    ...(retry.status === undefined ? {} : { status: retry.status }),
  });
}

async function emitProgress(onProgress, event) {
  if (!onProgress) return;
  try {
    await onProgress(Object.freeze({ ...event }));
  } catch (error) {
    throw new ProgressCallbackError(error);
  }
}

class ProgressCallbackError extends Error {
  constructor(cause) {
    super(`organization progress callback failed: ${String(cause?.message ?? cause)}`, { cause });
    this.name = 'ProgressCallbackError';
  }
}

function emptySummary() {
  return {
    files: 0,
    findings: 0,
    totalFindings: 0,
    suppressed: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
}
