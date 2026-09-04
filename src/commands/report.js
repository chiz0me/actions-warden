/**
 * Report command - runs audit + dry-run pin + dry-run upgrade and produces
 * a combined view. Useful for "what would change?" review and LLM prompting.
 */

import { audit } from './audit.js';
import { pin } from './pin.js';
import { upgrade } from './upgrade.js';
import { format } from '../lib/formatter.js';
import { canonicalPath } from '../lib/identity.js';

/**
 * @param {object} opts
 * @param {string} [opts.cwd]
 * @param {string[]} [opts.workflows]
 * @param {string} [opts.token]
 * @param {'major'|'minor'|'patch'} [opts.mode]
 * @param {'low'|'medium'|'high'|'critical'} [opts.severity]
 * @param {boolean} [opts.explain]
 * @param {boolean} [opts.skipResolve]   - when true, skip pin/upgrade (offline mode)
 * @param {string|false} [opts.configPath]
 * @param {string} [opts.baseline]
 */
export async function report({
  cwd = process.cwd(),
  workflows,
  token,
  mode = 'minor',
  severity,
  explain = true,
  skipResolve = false,
  minAgeDays = 7,
  configPath,
  baseline,
} = {}) {
  const auditResult = await audit({
    cwd,
    workflows,
    severity,
    explain,
    configPath,
    baseline,
  });
  let pinResult = { changes: [], errors: [], status: 'OK' };
  let upgradeResult = { changes: [], errors: [], skipped: [], status: 'OK' };
  if (!skipResolve && auditResult.files.length > 0) {
    // Audit owns target discovery and config path filtering. Reuse its exact
    // file set so every report phase operates on the same scope.
    const scopedWorkflows = auditResult.files;
    pinResult = await pin({ cwd, workflows: scopedWorkflows, dryRun: true, token });
    upgradeResult = await upgrade({
      cwd,
      workflows: scopedWorkflows,
      dryRun: true,
      token,
      mode,
      minAgeDays,
    });
    const upgradedOccurrences = new Set(
      upgradeResult.changes.map(change => `${change.file}:${change.line}`),
    );
    pinResult = {
      ...pinResult,
      changes: pinResult.changes.filter(
        change => !upgradedOccurrences.has(`${change.file}:${change.line}`),
      ),
    };
  }
  const status = [auditResult.status, pinResult.status, upgradeResult.status].includes('FAIL')
    ? 'FAIL' : 'OK';
  return {
    audit: auditResult,
    pin: pinResult,
    upgrade: upgradeResult,
    offline: skipResolve,
    status,
  };
}

/**
 * @param {Awaited<ReturnType<typeof report>>} result
 * @param {{format: 'toon'|'json'|'text'|'csv'|'sarif'|'html', mode: string,
 *   cwd?: string}} opts
 */
export function renderReport(result, opts) {
  const cwd = opts.cwd ?? process.cwd();
  if (opts.format === 'json') {
    return format('json', [], {
      status: result.status,
      json: {
        schemaVersion: '1.0',
        audit: {
          files: result.audit.files.map(f => rel(f, cwd)),
          findings: result.audit.findings.map(f => ({ ...f, file: rel(f.file, cwd) })),
          summary: result.audit.summary,
          baseline: {
            ...result.audit.baseline,
            path: result.audit.baseline.path ? rel(result.audit.baseline.path, cwd) : null,
          },
          status: result.audit.status,
        },
        pin: {
          changes: result.pin.changes.map(c => ({ ...c, file: rel(c.file, cwd) })),
          errors: result.pin.errors.map(error => ({
            ...error,
            file: error.file ? rel(error.file, cwd) : undefined,
          })),
          status: result.pin.status,
        },
        upgrade: {
          changes: result.upgrade.changes.map(c => ({ ...c, file: rel(c.file, cwd) })),
          skipped: result.upgrade.skipped.map(skip => ({
            ...skip,
            file: skip.file ? rel(skip.file, cwd) : undefined,
          })),
          errors: result.upgrade.errors.map(error => ({
            ...error,
            file: error.file ? rel(error.file, cwd) : undefined,
          })),
          mode: opts.mode,
          status: result.upgrade.status,
        },
        offline: result.offline,
        status: result.status,
      },
    });
  }
  const records = [];
  for (const finding of result.audit.findings) {
    records.push({
      label: 'FINDING',
      fields: {
        id: finding.id,
        ...finding.fields,
        line: finding.line,
        explain: finding.explain,
        ...(opts.format === 'sarif' && finding.fingerprint
          ? { fingerprint: finding.fingerprint }
          : {}),
      },
    });
  }
  for (const c of result.pin.changes) {
    records.push({ label: 'PIN', fields: { id: c.id, file: rel(c.file, cwd), action: c.action, from: c.fromRef, to: c.toSha } });
  }
  for (const c of result.upgrade.changes) {
    records.push({ label: 'UPGRADE', fields: { id: c.id, file: rel(c.file, cwd), action: c.action, from: c.fromVersion ?? c.fromRef, to: c.toTag, level: c.level } });
  }
  for (const skipped of result.upgrade.skipped ?? []) {
    records.push({
      label: 'SKIP',
      fields: {
        stage: 'upgrade',
        file: rel(skipped.file ?? '', cwd),
        action: skipped.action,
        tag: skipped.tag,
        reason: skipped.reason,
        age_days: skipped.ageDays,
        age_source: skipped.ageSource,
      },
    });
  }
  for (const error of result.pin.errors) {
    records.push({
      label: 'ERROR',
      fields: {
        stage: 'pin',
        file: rel(error.file ?? '', cwd),
        action: error.action,
        msg: error.error,
      },
    });
  }
  for (const error of result.upgrade.errors) {
    records.push({
      label: 'ERROR',
      fields: {
        stage: 'upgrade',
        file: rel(error.file ?? '', cwd),
        action: error.action,
        msg: error.error,
      },
    });
  }
  records.push({
    label: 'SUMMARY',
    fields: {
      files: result.audit.summary.files,
      findings: result.audit.summary.findings,
      critical: result.audit.summary.critical,
      high: result.audit.summary.high,
      medium: result.audit.summary.medium,
      low: result.audit.summary.low,
      pins: result.pin.changes.length,
      upgrades: result.upgrade.changes.length,
      skipped: (result.upgrade.skipped ?? []).length,
      errors: result.pin.errors.length + result.upgrade.errors.length,
      offline: result.offline,
    },
  });
  return format(opts.format, records, {
    status: result.status,
    title: 'Security and dependency report',
    metadata: { upgradeMode: opts.mode, offline: result.offline },
  });
}

function rel(p, cwd) {
  return p ? canonicalPath(p, cwd) : p;
}
