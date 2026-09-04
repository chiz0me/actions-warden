/**
 * Safe organization-scan artifact defaults.
 *
 * There is no reliable cross-agent runtime signal, so callers select an
 * execution context explicitly. Context controls presentation defaults only;
 * automatic organization artifacts always derive from the same scan identity.
 */

import { lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadBaseline } from './baseline.js';
import { loadConfig } from './config.js';
import { format } from './formatter.js';
import {
  createOrganizationCheckpointArtifactKey,
  createOrganizationCheckpointIdentity,
} from './org-checkpoint.js';
import { RULES } from '../rules/index.js';

/** Legacy agent-mode environment opt-in retained for compatibility. */
export const AGENT_MODE_ENVIRONMENT_VARIABLE = 'ACTIONS_WARDEN_MODE';

/** Preferred execution-context environment variable. */
export const EXECUTION_CONTEXT_ENVIRONMENT_VARIABLE = 'ACTIONS_WARDEN_CONTEXT';

const EXECUTION_CONTEXTS = new Set(['agent', 'auto', 'ci', 'interactive']);

const ORGANIZATION_RE = /^[A-Za-z0-9_.-]+$/;
const REPORT_EXTENSIONS = Object.freeze({
  csv: 'csv',
  html: 'html',
  json: 'json',
  sarif: 'sarif',
  text: 'txt',
  toon: 'toon',
});
const ARTIFACT_PREFIXES = Object.freeze({
  agent: '.actions-warden-agent',
  'org-scan': '.actions-warden-org-scan',
});

/**
 * Resolve explicit CLI precedence over the environment opt-in.
 *
 * @param {object} options
 * @param {boolean} [options.optionValue]
 * @param {string} [options.optionSource]
 * @param {string} [options.environmentValue]
 */
export function resolveAgentMode({ optionValue, optionSource, environmentValue } = {}) {
  if (optionSource === 'cli') return Boolean(optionValue);
  if (environmentValue === undefined || environmentValue === '') return false;
  if (environmentValue !== 'agent') {
    throw new Error(`${AGENT_MODE_ENVIRONMENT_VARIABLE} must be "agent" when set`);
  }
  return true;
}

/**
 * Resolve CLI flag precedence over the preferred context environment variable
 * and the legacy ACTIONS_WARDEN_MODE=agent alias.
 */
export function resolveExecutionContext({
  optionValue,
  optionSource,
  environmentValue,
  legacyEnvironmentValue,
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
  return resolveAgentMode({ environmentValue: legacyEnvironmentValue }) ? 'agent' : 'auto';
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
 * @param {'agent'|'org-scan'} [options.artifactNamespace]
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
  artifactNamespace = 'org-scan',
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
    : { path: null, ids: new Set(), fingerprints: new Set() };
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
  const prefix = ARTIFACT_PREFIXES[artifactNamespace];
  if (!prefix) throw new Error(`invalid organization artifact namespace: ${artifactNamespace}`);
  const checkpointPath = `${prefix}.${groupedKey}.checkpoint.json`;
  const reportExtension = REPORT_EXTENSIONS[reportFormat];
  if (!reportExtension) throw new Error(`invalid organization report format: ${reportFormat}`);
  const reportPath = `${prefix}.${groupedKey}.report.${reportExtension}`;

  return {
    checkpointPath,
    reportPath,
    resume: await pathExists(resolve(cwd, checkpointPath)),
    configPath: config.path,
    baselinePath: baselineData.path,
    identity,
  };
}

/**
 * Render the bounded stdout contract emitted after an organization file report.
 */
export function renderOrganizationScanReceipt({
  result,
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
    || !ORGANIZATION_RE.test(organization)
    || organization === '.'
    || organization === '..'
  ) throw new Error('invalid organization');
}

function normalizePatterns(patterns) {
  if (patterns === undefined) return [];
  if (!Array.isArray(patterns) || patterns.some(pattern => typeof pattern !== 'string' || !pattern)) {
    throw new Error('repository filters must be non-empty strings');
  }
  return [...new Set(patterns)];
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}
