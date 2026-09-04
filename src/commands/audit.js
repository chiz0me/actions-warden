/**
 * Audit command - scan workflows for security findings.
 *
 * Programmatic API:
 *   const result = await audit({ cwd, workflows, severity, explain });
 *   result.findings: Finding[]
 *   result.summary:  { files, findings, critical, high, medium, low }
 *   result.status:   'OK' | 'FAIL'
 *
 * A finding looks like:
 *   { id, ruleId, severity, file, line, fields, explain }
 */

import { parseWorkflowFile, parseWorkflowSource } from '../lib/parser.js';
import { format, summarize, SEVERITY_ORDER } from '../lib/formatter.js';
import { parseIgnoreDirectives, isIgnored } from '../lib/ignore.js';
import { canonicalPath, occurrenceId, pinOccurrenceId } from '../lib/identity.js';
import { resolveTargets } from '../lib/targets.js';
import { assignBaselineFingerprints, loadBaseline } from '../lib/baseline.js';
import { DEFAULT_CONFIG, filterIgnoredPaths, loadConfig } from '../lib/config.js';
import { RULES } from '../rules/index.js';

/**
 * @typedef {object} Finding
 * @property {string} id           - unique id (sha1 short)
 * @property {string} ruleId
 * @property {string} severity
 * @property {string} file
 * @property {number} line
 * @property {Record<string, unknown>} fields
 * @property {string} explain
 */

/**
 * @param {object} opts
 * @param {string} [opts.cwd]
 * @param {string[]} [opts.workflows]      - explicit file/glob args
 * @param {'low'|'medium'|'high'|'critical'} [opts.severity]  - minimum severity
 * @param {boolean} [opts.explain]
 * @param {string|false} [opts.configPath]
 * @param {string} [opts.baseline]
 * @param {boolean} [opts.ignoreBaseline]
 * @returns {Promise<{findings: Finding[], allFindings: Finding[], summary: object, status: 'OK'|'FAIL', files: string[], baseline: object}>}
 */
export async function audit({
  cwd = process.cwd(),
  workflows,
  severity,
  explain = false,
  configPath,
  baseline,
  ignoreBaseline = false,
} = {}) {
  const config = await loadConfig({
    cwd,
    path: configPath,
    ruleIds: RULES.map(rule => rule.id),
  });
  const resolvedFiles = await resolveTargets({ workflows, cwd });
  const files = filterIgnoredPaths(resolvedFiles, config, cwd);
  const baselineData = await resolveBaselineData({
    baseline: ignoreBaseline ? null : (baseline ?? config.baseline),
    cwd,
  });
  return runAudit({
    cwd,
    files,
    severity,
    explain,
    config,
    baselineData,
    loadWorkflow: parseWorkflowFile,
  });
}

/**
 * Audit workflow sources supplied by a caller without writing them to disk.
 * This is the shared boundary used by remote scanners; rules receive the same
 * parsed model as a local audit and therefore cannot tell local and remote
 * inputs apart.
 *
 * @param {object} opts
 * @param {string} [opts.cwd] - identity root for stable paths and finding IDs
 * @param {Array<{file: string, source: string}>} opts.sources
 * @param {'low'|'medium'|'high'|'critical'} [opts.severity]
 * @param {boolean} [opts.explain]
 * @param {typeof DEFAULT_CONFIG} [opts.config]
 * @param {{path: string|null, ids: Set<string>, fingerprints: Set<string>}} [opts.baselineData]
 */
export async function auditSources({
  cwd = process.cwd(),
  sources,
  severity,
  explain = false,
  config = DEFAULT_CONFIG,
  baselineData = emptyBaseline(),
} = {}) {
  if (!Array.isArray(sources)) throw new Error('sources must be an array');
  const sourceByFile = new Map();
  for (const item of sources) {
    if (!item || typeof item.file !== 'string' || typeof item.source !== 'string') {
      throw new Error('every source must contain string file and source values');
    }
    if (sourceByFile.has(item.file)) throw new Error(`duplicate workflow source: ${item.file}`);
    sourceByFile.set(item.file, item.source);
  }
  const files = filterIgnoredPaths([...sourceByFile.keys()].sort(), config, cwd);
  return runAudit({
    cwd,
    files,
    severity,
    explain,
    config,
    baselineData,
    loadWorkflow: async file => parseWorkflowSource(sourceByFile.get(file), file),
  });
}

async function runAudit({
  cwd,
  files,
  severity,
  explain,
  config,
  baselineData,
  loadWorkflow,
}) {
  /** @type {Finding[]} */
  const findings = [];
  for (const file of files) {
    let doc;
    try {
      doc = await loadWorkflow(file);
    } catch (err) {
      findings.push({
        id: occurrenceId({ kind: 'parse-error', file, cwd }),
        ruleId: 'parse-error',
        severity: 'high',
        file,
        line: 0,
        fields: { type: 'parse-error', sev: 'high', file: canonicalPath(file, cwd) },
        explain: String(err.message ?? err),
      });
      continue;
    }
    const ignore = parseIgnoreDirectives(doc.source);
    for (const rule of RULES) {
      const rulePolicy = config.rules[rule.id];
      if (rulePolicy?.enabled === false) continue;
      const ruleFindings = rule.check(doc, {
        config,
        runnerPolicy: config.runnerPolicy,
      });
      for (const f of ruleFindings) {
        if (isIgnored(ignore, f.line, rule.id)) continue;
        const effectiveSeverity = rulePolicy?.severity ?? f.severity;
        const fields = {
          ...f.fields,
          sev: effectiveSeverity,
          file: canonicalPath(file, cwd),
        };
        const finding = {
          id: rule.id === 'unpinned-action'
            ? pinOccurrenceId({
              file,
              cwd,
              ref: {
                line: f.line,
                start: f.start ?? 0,
                raw: String(f.fields.action ?? ''),
              },
            })
            : occurrenceId({
              kind: rule.id,
              file,
              cwd,
              line: f.line,
              start: f.start ?? 0,
              subject: JSON.stringify(f.fields),
            }),
          ruleId: rule.id,
          severity: effectiveSeverity,
          file,
          line: f.line,
          fields,
          explain: f.explain,
        };
        findings.push(finding);
      }
    }
  }
  assignBaselineFingerprints(findings, cwd);
  const severityFiltered = filterBySeverity(findings, severity);
  const filtered = severityFiltered.filter(finding => (
    finding.ruleId === 'parse-error'
    || (
      !baselineData.ids.has(finding.id)
      && !baselineData.fingerprints.has(finding.fingerprint)
    )
  ));
  const suppressed = severityFiltered.length - filtered.length;
  const counts = summarize(filtered);
  const status = filtered.length === 0 ? 'OK' : 'FAIL';
  return {
    files,
    findings: explain ? filtered : filtered.map(stripExplain),
    allFindings: findings,
    summary: {
      files: files.length,
      findings: filtered.length,
      totalFindings: severityFiltered.length,
      suppressed,
      ...counts,
    },
    baseline: {
      path: baselineData.path,
      suppressed,
    },
    configPath: config.path,
    status,
  };
}

async function resolveBaselineData({ baseline, cwd }) {
  return baseline
    ? loadBaseline({ path: baseline, cwd })
    : emptyBaseline();
}

function emptyBaseline() {
  return { path: null, ids: new Set(), fingerprints: new Set() };
}

function stripExplain(f) {
  const copy = { ...f };
  delete copy.explain;
  return copy;
}

/**
 * @param {string[]|undefined} workflows
 * @param {string} cwd
 */
/**
 * @param {Finding[]} findings
 * @param {string|undefined} min
 */
function filterBySeverity(findings, min) {
  if (!min) return findings;
  const minIdx = SEVERITY_ORDER.indexOf(min);
  if (minIdx === -1) return findings;
  return findings.filter(f => (
    f.ruleId === 'parse-error'
    || SEVERITY_ORDER.indexOf(f.severity) >= minIdx
  ));
}

function relPath(p, cwd) {
  return canonicalPath(p, cwd);
}

/**
 * Render an audit result to the chosen format.
 *
 * @param {Awaited<ReturnType<typeof audit>>} result
 * @param {{format: 'toon'|'json'|'text'|'csv'|'sarif'|'html', explain?: boolean,
 *   cwd?: string}} opts
 */
export function renderAudit(result, opts) {
  const cwd = opts.cwd ?? process.cwd();
  if (opts.format === 'json') {
    return format('json', [], {
      status: result.status,
      json: {
        schemaVersion: '1.0',
        files: result.files.map(f => relPath(f, cwd)),
        findings: result.findings.map(f => ({ ...f, file: relPath(f.file, cwd) })),
        summary: result.summary,
        baseline: {
          ...result.baseline,
          path: result.baseline.path ? relPath(result.baseline.path, cwd) : null,
        },
        configPath: result.configPath ? relPath(result.configPath, cwd) : null,
        status: result.status,
      },
    });
  }
  /** @type {Array<{label: string, fields: Record<string, unknown>}>} */
  const records = [];
  if (opts.format === 'sarif') {
    for (const rule of RULES) {
      records.push({
        label: 'RULE',
        fields: {
          id: rule.id,
          severity: rule.severity,
          description: rule.description,
        },
      });
    }
  }
  for (const f of result.files) {
    records.push({ label: 'SCAN', fields: { file: relPath(f, opts.cwd ?? process.cwd()) } });
  }
  for (const finding of result.findings) {
    const fields = { id: finding.id, ...finding.fields, line: finding.line };
    if (opts.format === 'sarif' && finding.fingerprint) {
      fields.fingerprint = finding.fingerprint;
    }
    if (opts.explain) fields.explain = finding.explain;
    records.push({ label: 'FINDING', fields });
  }
  records.push({ label: 'SUMMARY', fields: result.summary });
  return format(opts.format, records, {
    status: result.status,
    title: 'Workflow security audit',
    metadata: {
      config: result.configPath ? relPath(result.configPath, cwd) : 'built-in defaults',
      baseline: result.baseline.path ? relPath(result.baseline.path, cwd) : 'none',
    },
  });
}
