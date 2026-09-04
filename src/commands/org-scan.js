/**
 * Organization scan command - enumerate repositories through the GitHub API,
 * fetch workflow YAML from each default branch, and aggregate audit findings.
 */

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import picomatch from 'picomatch';
import { auditSources } from './audit.js';
import { loadBaseline } from '../lib/baseline.js';
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
import { resolveToken } from '../lib/resolver.js';
import { listRules, RULES } from '../rules/index.js';
import { sameFilePath } from '../lib/path-equality.js';

const VISIBILITIES = new Set(['all', 'public', 'private', 'internal']);
const ORGANIZATION_RE = /^[A-Za-z0-9_.-]+$/;

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
  if (
    typeof organization !== 'string'
    || !ORGANIZATION_RE.test(organization)
    || organization === '.'
    || organization === '..'
  ) throw new Error('invalid organization');
  if (!VISIBILITIES.has(visibility)) throw new Error(`invalid visibility: ${visibility}`);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) {
    throw new Error('concurrency must be an integer from 1 to 16');
  }
  if (maxRepositories !== undefined && (!Number.isInteger(maxRepositories) || maxRepositories < 1)) {
    throw new Error('max repositories must be a positive integer');
  }
  if (checkpointPath !== undefined && (typeof checkpointPath !== 'string' || !checkpointPath)) {
    throw new Error('checkpoint path must be a non-empty string');
  }
  if (typeof resume !== 'boolean') throw new Error('resume must be a boolean');
  if (resume && !checkpointPath) throw new Error('resume requires a checkpoint path');
  if (onProgress !== undefined && typeof onProgress !== 'function') {
    throw new Error('onProgress must be a function');
  }
  const startedAt = Date.now();
  await emitProgress(onProgress, { type: 'scan-started', organization });
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
    : { path: null, ids: new Set(), fingerprints: new Set() };
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
  const loadedCheckpoint = resume
    ? await loadOrganizationCheckpoint({ path: checkpointPath, cwd, identity: checkpointIdentity })
    : { results: new Map(), migrationRequired: false };
  if (resume) {
    await emitProgress(onProgress, {
      type: 'checkpoint-loaded',
      repositories: loadedCheckpoint.results.size,
    });
  }
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

  const checkpointResults = new Map();
  for (const repository of selected) {
    const stored = loadedCheckpoint.results.get(repository.fullName.toLowerCase());
    if (!stored) continue;
    checkpointResults.set(repository.fullName.toLowerCase(), restoreCheckpointResult(stored, {
      repository,
      cwd,
      sourceUrl,
    }));
  }
  const persistCheckpoint = createCheckpointWriter({
    path: checkpointPath,
    cwd,
    identity: checkpointIdentity,
    results: checkpointResults,
  });
  if (checkpointPath && (!resume || loadedCheckpoint.migrationRequired)) {
    await persistCheckpoint();
    if (!resume) await emitProgress(onProgress, { type: 'checkpoint-created' });
  }

  let completed = 0;
  let reused = 0;
  let active = 0;
  const repositoryResults = await mapLimit(selected, concurrency, async (repository, index) => {
    active += 1;
    await emitProgress(onProgress, {
      type: 'repository-started',
      repository: repository.fullName,
      position: index + 1,
      total: selected.length,
      completed,
      active,
      concurrency,
    });
    const emitPhase = phase => emitProgress(onProgress, {
      type: 'repository-phase',
      repository: repository.fullName,
      position: index + 1,
      total: selected.length,
      completed,
      active,
      concurrency,
      phase,
    });
    let repositoryResult;
    let wasReused = false;
    try {
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
        repositoryResult = restoreCheckpointResult(stored, { repository, cwd, sourceUrl });
        wasReused = true;
      } else {
        await emitPhase('downloading workflow YAML');
        const fetched = await fetchRepositoryWorkflows({
          repository,
          token: resolvedToken,
          cwd,
          workflowTree,
          onRetry: retry => emitRetryProgress(onProgress, retry, repository.fullName),
        });
        const sources = fetched.sources.map(item => ({
          file: virtualPath(cwd, repository, item.path),
          source: item.source,
        }));
        await emitPhase('auditing workflows');
        const auditResult = await auditSources({
          cwd,
          sources,
          severity,
          explain,
          config,
          baselineData,
        });
        const errors = fetched.errors.map(error => ({
          repository: repository.fullName,
          path: error.path,
          error: error.error,
        }));
        const findings = auditResult.findings.map(finding => ({
          ...finding,
          repository: repository.fullName,
          branch: repository.defaultBranch,
          url: sourceUrl(
            repository,
            canonicalPath(finding.file, resolve(cwd, repository.owner, repository.name)),
            finding.line,
          ),
        }));
        repositoryResult = {
          repository,
          revision: {
            branch: repository.defaultBranch,
            treeSha: fetched.treeSha,
          },
          files: auditResult.files.map(file => canonicalPath(
            file,
            resolve(cwd, repository.owner, repository.name),
          )),
          findings,
          errors,
          summary: auditResult.summary,
          status: auditResult.status === 'FAIL' || errors.length > 0 ? 'FAIL' : 'OK',
        };
      }
    } catch (error) {
      if (error instanceof ProgressCallbackError) throw error;
      repositoryResult = {
        repository,
        revision: { branch: repository.defaultBranch, treeSha: null },
        files: [],
        findings: [],
        errors: [{
          repository: repository.fullName,
          error: String(error.message ?? error),
        }],
        summary: emptySummary(),
        status: 'FAIL',
      };
    }
    if (checkpointPath) {
      await emitPhase('writing checkpoint');
      checkpointResults.set(repository.fullName.toLowerCase(), repositoryResult);
      const durableRepositories = await persistCheckpoint();
      await emitProgress(onProgress, {
        type: 'checkpoint-written',
        repository: repository.fullName,
        position: index + 1,
        total: selected.length,
        repositories: durableRepositories,
      });
    }
    completed += 1;
    if (wasReused) reused += 1;
    active -= 1;
    await emitProgress(onProgress, {
      type: 'repository-completed',
      repository: repository.fullName,
      position: index + 1,
      total: selected.length,
      completed,
      reused: wasReused,
      status: repositoryResult.status,
      files: repositoryResult.files.length,
      findings: repositoryResult.findings.length,
      errors: repositoryResult.errors.length,
      active,
      concurrency,
    });
    return repositoryResult;
  });

  const findings = repositoryResults.flatMap(result => result.findings);
  const errors = repositoryResults.flatMap(result => result.errors);
  const counts = summarize(findings);
  const summary = {
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
    ...counts,
  };
  const incompleteRepositories = repositoryResults
    .filter(repositoryResult => !repositoryCoverageComplete(repositoryResult))
    .map(repositoryResult => repositoryResult.repository.fullName)
    .sort((left, right) => left.localeCompare(right));
  const selectedRepositoriesComplete = incompleteRepositories.length === 0;
  const limitedByMaxRepositories = selected.length < eligible.length;
  const coverage = {
    complete: selectedRepositoriesComplete && !limitedByMaxRepositories,
    enumerationComplete: true,
    selectedRepositoriesComplete,
    eligibleRepositoriesComplete: selectedRepositoriesComplete && !limitedByMaxRepositories,
    limitedByMaxRepositories,
    repositoriesOmittedByLimit: eligible.length - selected.length,
    incompleteRepositories,
  };
  const result = {
    organization,
    analysis: {
      generation: checkpointIdentity.analysisGeneration,
      identity: createHash('sha256')
        .update(createOrganizationCheckpointArtifactKey(checkpointIdentity))
        .digest('hex'),
    },
    scope: {
      repositories: patterns,
      visibility,
      includeArchived,
      includeDisabled,
      includeForks,
      maxRepositories: maxRepositories ?? null,
      concurrency,
      severity: severity ?? null,
    },
    coverage,
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
  await emitProgress(onProgress, {
    type: 'scan-completed',
    organization,
    status: result.status,
    total: selected.length,
    completed,
    reused,
    findings: summary.findings,
    errors: summary.errors,
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
  if (outputFormat === 'json') {
    return format('json', [], {
      status: result.status,
      json: {
        schemaVersion: '1.0',
        organization: result.organization,
        analysis: result.analysis,
        scope: result.scope,
        coverage: result.coverage,
        repositories: result.repositories.map(repositoryResult => ({
          repository: repositoryResult.repository,
          revision: repositoryResult.revision,
          files: repositoryResult.files,
          findings: repositoryResult.findings.map(finding => normalizeFinding(finding, cwd)),
          errors: repositoryResult.errors,
          summary: repositoryResult.summary,
          status: repositoryResult.status,
        })),
        findings: result.findings.map(finding => normalizeFinding(finding, cwd)),
        errors: result.errors,
        summary: result.summary,
        baseline: {
          ...result.baseline,
          path: result.baseline.path ? canonicalPath(result.baseline.path, cwd) : null,
        },
        configPath: result.configPath ? canonicalPath(result.configPath, cwd) : null,
        ...(comparison ? { comparison } : {}),
        status: result.status,
      },
    });
  }

  const records = [];
  if (outputFormat === 'sarif') {
    for (const rule of listRules()) records.push({ label: 'RULE', fields: rule });
  }
  for (const repositoryResult of result.repositories) {
    records.push({
      label: 'REPOSITORY',
      fields: {
        repo: repositoryResult.repository.fullName,
        visibility: repositoryResult.repository.visibility,
        branch: repositoryResult.revision.branch,
        files: repositoryResult.files.length,
        findings: repositoryResult.findings.length,
        errors: repositoryResult.errors.length,
        status: repositoryResult.status,
      },
    });
    for (const finding of repositoryResult.findings) {
      records.push({
        label: 'FINDING',
        fields: {
          id: finding.id,
          ...finding.fields,
          repo: finding.repository,
          file: canonicalPath(finding.file, cwd),
          line: finding.line,
          url: finding.url,
          ...(finding.explain ? { explain: finding.explain } : {}),
          ...(outputFormat === 'sarif' && finding.fingerprint
            ? { fingerprint: finding.fingerprint }
            : {}),
        },
      });
    }
    for (const error of repositoryResult.errors) {
      records.push({
        label: 'ERROR',
        fields: {
          repo: error.repository,
          file: error.path ? `${error.repository}/${error.path}` : undefined,
          msg: error.error,
        },
      });
    }
  }
  records.push({
    label: 'COVERAGE',
    fields: {
      complete: result.coverage.complete,
      enumerationComplete: result.coverage.enumerationComplete,
      selectedRepositoriesComplete: result.coverage.selectedRepositoriesComplete,
      eligibleRepositoriesComplete: result.coverage.eligibleRepositoriesComplete,
      limitedByMaxRepositories: result.coverage.limitedByMaxRepositories,
      repositoriesOmittedByLimit: result.coverage.repositoriesOmittedByLimit,
      incompleteRepositories: result.coverage.incompleteRepositories.length,
    },
  });
  if (comparison) appendComparisonRecords(records, comparison);
  records.push({
    label: 'SUMMARY',
    fields: { organization: result.organization, ...result.summary },
  });
  return format(outputFormat, records, {
    status: result.status,
    title: `Organization scan: ${result.organization}`,
    metadata: {
      organization: result.organization,
      analysisGeneration: result.analysis.generation,
      visibility: result.scope.visibility,
      repositoryFilters: result.scope.repositories.length > 0
        ? result.scope.repositories.join(', ')
        : 'all eligible repositories',
      includeArchived: result.scope.includeArchived,
      includeDisabled: result.scope.includeDisabled,
      includeForks: result.scope.includeForks,
      maxRepositories: result.scope.maxRepositories ?? 'none',
      severity: result.scope.severity ?? 'all levels',
      baseline: result.baseline.path ? canonicalPath(result.baseline.path, cwd) : 'none',
      coverageComplete: result.coverage.complete,
    },
  });
}

function appendComparisonRecords(records, comparison) {
  records.push({ label: 'COMPARISON', fields: comparison.summary });
  for (const [change, findings] of Object.entries(comparison.findings)) {
    for (const finding of findings) {
      records.push({
        label: `${change.toUpperCase()}_FINDING`,
        fields: {
          ...finding.fields,
          id: finding.id,
          change,
          type: finding.ruleId,
          sev: finding.severity,
          repo: finding.repository,
          file: finding.file,
          line: finding.line,
          url: finding.url,
          explain: finding.explain,
        },
      });
    }
  }
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

function normalizePatterns(patterns) {
  if (patterns === undefined) return [];
  if (!Array.isArray(patterns) || patterns.some(pattern => typeof pattern !== 'string' || !pattern)) {
    throw new Error('repository filters must be non-empty strings');
  }
  return [...new Set(patterns)];
}

function normalizeFinding(finding, cwd) {
  return {
    ...finding,
    file: canonicalPath(finding.file, cwd),
  };
}

function sourceUrl(repository, path, line) {
  if (!repository.defaultBranch) return repository.htmlUrl;
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const encodedBranch = encodeURIComponent(repository.defaultBranch);
  const suffix = Number.isInteger(line) && line > 0 ? `#L${line}` : '';
  return `${repository.htmlUrl}/blob/${encodedBranch}/${encodedPath}${suffix}`;
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
