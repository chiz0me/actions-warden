/**
 * Safe organization-scan artifact defaults.
 *
 * There is no reliable cross-agent runtime signal, so callers select an
 * execution context explicitly. Context controls presentation defaults only;
 * automatic organization artifacts always derive from the same scan identity.
 */

import { resolve } from 'node:path';
import { emptyBaseline, loadBaseline } from './baseline.js';
import { loadConfig } from './config.js';
import { format } from './formatter.js';
import {
  createOrganizationCheckpointArtifactKey,
  createOrganizationCheckpointIdentity,
} from './org-checkpoint.js';
import { NAME_RE, normalizePatterns } from './org-schema.js';
import { pathExists } from './paths.js';
import { RULES } from '../rules/index.js';
import { VERSION } from '../version.js';

/** Preferred execution-context environment variable. */
export const EXECUTION_CONTEXT_ENVIRONMENT_VARIABLE = 'ACTIONS_WARDEN_CONTEXT';

const EXECUTION_CONTEXTS = new Set(['agent', 'auto', 'ci', 'interactive']);

const REPORT_EXTENSIONS = Object.freeze({
  csv: 'csv',
  html: 'html',
  json: 'json',
  sarif: 'sarif',
  text: 'txt',
  toon: 'toon',
});
const ARTIFACT_PREFIX = '.actions-warden-org-scan';

/**
 * Resolve CLI flag precedence over the ACTIONS_WARDEN_CONTEXT environment
 * variable. Returns `auto` when neither selects a context.
 */
export function resolveExecutionContext({
  optionValue,
  optionSource,
  environmentValue,
} = {}) {
  if (optionSource === 'cli') return optionValue ? 'agent' : 'auto';
  if (environmentValue !== undefined && String(environmentValue).trim() !== '') {
    const context = String(environmentValue).trim().toLowerCase();
    if (!EXECUTION_CONTEXTS.has(context)) {
      throw new Error(
        `${EXECUTION_CONTEXT_ENVIRONMENT_VARIABLE} must be agent, auto, ci, or interactive`,
      );
    }
    return context;
  }
  return 'auto';
}

/**
 * Build stable, scope-specific paths for an organization scan.
 *
 * @param {object} options
 * @param {string} options.organization
 * @param {string} options.cwd
 * @param {string[]} [options.repositories]
 * @param {'all'|'public'|'private'|'internal'} options.visibility
 * @param {boolean} options.includeArchived
 * @param {boolean} options.includeDisabled
 * @param {boolean} options.includeForks
 * @param {number} [options.maxRepositories]
 * @param {'low'|'medium'|'high'|'critical'} [options.severity]
 * @param {boolean} options.explain
 * @param {string|false} [options.configPath]
 * @param {string} [options.baseline]
 * @param {'toon'|'json'|'text'|'csv'|'sarif'|'html'} options.reportFormat
 */
export async function createOrganizationScanArtifacts({
  organization,
  cwd,
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
  reportFormat,
}) {
  validateOrganization(organization);
  const patterns = normalizePatterns(repositories);
  const config = await loadConfig({
    cwd,
    path: configPath,
    ruleIds: RULES.map(rule => rule.id),
  });
  const baselinePath = baseline ?? config.baseline;
  const baselineData = baselinePath
    ? await loadBaseline({ path: baselinePath, cwd })
    : emptyBaseline();
  const identity = createOrganizationCheckpointIdentity({
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
  const key = createOrganizationCheckpointArtifactKey(identity);
  const groupedKey = key.match(/.{8}/g).join('.');
  const checkpointPath = `${ARTIFACT_PREFIX}.${groupedKey}.checkpoint.json`;
  const reportExtension = REPORT_EXTENSIONS[reportFormat];
  if (!reportExtension) throw new Error(`invalid organization report format: ${reportFormat}`);
  const reportPath = `${ARTIFACT_PREFIX}.${groupedKey}.report.${reportExtension}`;

  return {
    checkpointPath,
    reportPath,
    resume: await pathExists(resolve(cwd, checkpointPath)),
    configPath: config.path,
    baselinePath: baselineData.path,
  };
}

/**
 * Render the bounded stdout contract emitted after an organization file report.
 * Run provenance (tool version and timing) appears only here, never in the
 * deterministic report, aggregate, or manifest.
 *
 * @param {object} options
 * @param {Date} options.startedAt When the run began.
 * @param {Date} options.finishedAt When the report was written.
 */
export function renderOrganizationScanReceipt({
  result,
  startedAt,
  finishedAt,
  reportPath,
  reportFormat,
  checkpointPath,
  resumed,
  repositoriesReused = 0,
  reportLayout = 'single',
  reportDirectory,
  manifestPath,
  kind = 'actions-warden-org-scan-receipt',
}) {
  return format('json', [], {
    status: result.status,
    json: {
      schemaVersion: '1.0',
      kind,
      command: 'org-scan',
      organization: result.organization,
      tool: { name: 'actions-warden', version: VERSION },
      run: {
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      },
      status: result.status,
      summary: result.summary,
      report: {
        path: reportPath,
        format: reportFormat,
        layout: reportLayout,
        ...(reportDirectory ? { directory: reportDirectory } : {}),
        ...(manifestPath ? { manifest: manifestPath } : {}),
      },
      checkpoint: {
        path: checkpointPath,
        resumed,
        repositoriesReused,
      },
      coverage: compactCoverage(result.coverage),
      ...(result.comparison ? { comparison: result.comparison.summary } : {}),
    },
  });
}

function compactCoverage(coverage = {}) {
  return {
    complete: coverage.complete === true,
    enumerationComplete: coverage.enumerationComplete === true,
    selectedRepositoriesComplete: coverage.selectedRepositoriesComplete === true,
    eligibleRepositoriesComplete: coverage.eligibleRepositoriesComplete === true,
    limitedByMaxRepositories: coverage.limitedByMaxRepositories === true,
    repositoriesOmittedByLimit: Number.isSafeInteger(coverage.repositoriesOmittedByLimit)
      ? coverage.repositoriesOmittedByLimit
      : 0,
    incompleteRepositories: Array.isArray(coverage.incompleteRepositories)
      ? coverage.incompleteRepositories.length
      : 0,
  };
}

function validateOrganization(organization) {
  if (
    typeof organization !== 'string'
    || !NAME_RE.test(organization)
    || organization === '.'
    || organization === '..'
  ) throw new Error('invalid organization');
}
