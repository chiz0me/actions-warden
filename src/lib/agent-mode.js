/**
 * Explicit AI-agent execution defaults.
 *
 * There is no reliable cross-agent runtime signal, so callers opt in through
 * `--agent-mode` or ACTIONS_WARDEN_MODE=agent. Organization artifact names are
 * derived from the same identity used to validate resumable checkpoints.
 */

import { createHash } from 'node:crypto';
import { lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadBaseline } from './baseline.js';
import { loadConfig } from './config.js';
import { format } from './formatter.js';
import { createOrganizationCheckpointIdentity } from './org-checkpoint.js';
import { RULES } from '../rules/index.js';

export const AGENT_MODE_ENVIRONMENT_VARIABLE = 'ACTIONS_WARDEN_MODE';

const ORGANIZATION_RE = /^[A-Za-z0-9_.-]+$/;
const REPORT_EXTENSIONS = Object.freeze({
  json: 'json',
  sarif: 'sarif',
  text: 'txt',
  toon: 'toon',
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
 * Build stable, scope-specific paths for an agent-initiated organization scan.
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
 * @param {'toon'|'json'|'text'|'sarif'} options.reportFormat
 */
export async function createOrganizationAgentArtifacts({
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
  const key = createHash('sha256')
    .update(JSON.stringify(identity))
    .digest('hex')
    .slice(0, 32);
  const groupedKey = key.match(/.{8}/g).join('.');
  const checkpointPath = `.actions-warden-agent.${groupedKey}.checkpoint.json`;
  const reportExtension = REPORT_EXTENSIONS[reportFormat];
  if (!reportExtension) throw new Error(`invalid agent report format: ${reportFormat}`);
  const reportPath = `.actions-warden-agent.${groupedKey}.report.${reportExtension}`;

  return {
    checkpointPath,
    reportPath,
    resume: await pathExists(resolve(cwd, checkpointPath)),
  };
}

/**
 * Render the bounded stdout contract emitted after an agent-mode file report.
 */
export function renderOrganizationAgentReceipt({
  result,
  reportPath,
  reportFormat,
  checkpointPath,
  resumed,
}) {
  return format('json', [], {
    status: result.status,
    json: {
      schemaVersion: '1.0',
      kind: 'actions-warden-agent-receipt',
      command: 'org-scan',
      organization: result.organization,
      status: result.status,
      summary: result.summary,
      report: {
        path: reportPath,
        format: reportFormat,
      },
      checkpoint: {
        path: checkpointPath,
        resumed,
      },
    },
  });
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
