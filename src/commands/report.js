/**
 * Report command — runs audit + dry-run pin + dry-run upgrade and produces
 * a combined view. Useful for "what would change?" review and LLM prompting.
 */

import { audit } from './audit.js';
import { pin } from './pin.js';
import { upgrade } from './upgrade.js';
import { format } from '../lib/formatter.js';

/**
 * @param {object} opts
 * @param {string} [opts.cwd]
 * @param {string[]} [opts.workflows]
 * @param {string} [opts.token]
 * @param {'major'|'minor'|'patch'} [opts.mode]
 * @param {boolean} [opts.skipResolve]   - when true, skip pin/upgrade (offline mode)
 */
export async function report({
  cwd = process.cwd(),
  workflows,
  token,
  mode = 'minor',
  skipResolve = false,
  minAgeDays = 7,
} = {}) {
  const auditResult = await audit({ cwd, workflows, explain: true });
  let pinResult = { changes: [], errors: [], status: 'OK' };
  let upgradeResult = { changes: [], errors: [], skipped: [], status: 'OK' };
  if (!skipResolve) {
    pinResult = await pin({ cwd, workflows, dryRun: true, token });
    upgradeResult = await upgrade({ cwd, workflows, dryRun: true, token, mode, minAgeDays });
  }
  const status = [auditResult.status, pinResult.status, upgradeResult.status].includes('FAIL')
    ? 'FAIL' : 'OK';
  return { audit: auditResult, pin: pinResult, upgrade: upgradeResult, status };
}

/**
 * @param {Awaited<ReturnType<typeof report>>} result
 * @param {{format: 'toon'|'json'|'text', mode: string, cwd?: string}} opts
 */
export function renderReport(result, opts) {
  const cwd = opts.cwd ?? process.cwd();
  if (opts.format === 'json') {
    return format('json', [], {
      status: result.status,
      json: {
        audit: { files: result.audit.files.map(f => rel(f, cwd)), findings: result.audit.findings, summary: result.audit.summary },
        pin: { changes: result.pin.changes.map(c => ({ ...c, file: rel(c.file, cwd) })) },
        upgrade: { changes: result.upgrade.changes.map(c => ({ ...c, file: rel(c.file, cwd) })), mode: opts.mode },
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
      },
    });
  }
  for (const c of result.pin.changes) {
    records.push({ label: 'PIN', fields: { id: c.id, file: rel(c.file, cwd), action: c.action, from: c.fromRef, to: c.toSha } });
  }
  for (const c of result.upgrade.changes) {
    records.push({ label: 'UPGRADE', fields: { id: c.id, file: rel(c.file, cwd), action: c.action, from: c.fromVersion ?? c.fromRef, to: c.toTag, level: c.level } });
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
    },
  });
  return format(opts.format, records, { status: result.status });
}

function rel(p, cwd) {
  if (p && p.startsWith(cwd)) return p.slice(cwd.length + 1);
  return p;
}
