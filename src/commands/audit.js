/**
 * Audit command — scan workflows for security findings.
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

import { createHash } from 'node:crypto';
import { parseWorkflowFile } from '../lib/parser.js';
import { discoverWorkflows, resolveWorkflowArg } from '../lib/paths.js';
import { format, summarize, SEVERITY_ORDER } from '../lib/formatter.js';
import { parseIgnoreDirectives, isIgnored } from '../lib/ignore.js';
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
 * @returns {Promise<{findings: Finding[], summary: object, status: 'OK'|'FAIL', files: string[]}>}
 */
export async function audit({ cwd = process.cwd(), workflows, severity, explain = false } = {}) {
  const files = await resolveTargets(workflows, cwd);
  /** @type {Finding[]} */
  const findings = [];
  for (const file of files) {
    let doc;
    try {
      doc = await parseWorkflowFile(file);
    } catch (err) {
      findings.push({
        id: shortId(`parse:${file}`),
        ruleId: 'parse-error',
        severity: 'high',
        file,
        line: 0,
        fields: { type: 'parse-error', sev: 'high', file },
        explain: String(err.message ?? err),
      });
      continue;
    }
    const ignore = parseIgnoreDirectives(doc.source);
    for (const rule of RULES) {
      const ruleFindings = rule.check(doc);
      for (const f of ruleFindings) {
        if (isIgnored(ignore, f.line, rule.id)) continue;
        const finding = {
          id: shortId(`${rule.id}:${file}:${f.line}:${JSON.stringify(f.fields)}`),
          ruleId: rule.id,
          severity: f.severity,
          file,
          line: f.line,
          fields: { ...f.fields, file: relPath(file, cwd) },
          explain: f.explain,
        };
        findings.push(finding);
      }
    }
  }
  const filtered = filterBySeverity(findings, severity);
  const counts = summarize(filtered);
  const status = filtered.length === 0 ? 'OK' : 'FAIL';
  return {
    files,
    findings: explain ? filtered : filtered.map(stripExplain),
    summary: { files: files.length, findings: filtered.length, ...counts },
    status,
  };
}

function stripExplain(f) {
  const { explain: _unused, ...rest } = f;
  return rest;
}

/**
 * @param {string[]|undefined} workflows
 * @param {string} cwd
 */
async function resolveTargets(workflows, cwd) {
  if (!workflows || workflows.length === 0) {
    return discoverWorkflows({ cwd });
  }
  const out = new Set();
  for (const w of workflows) {
    const files = await resolveWorkflowArg(w, cwd);
    for (const f of files) out.add(f);
  }
  return [...out].sort();
}

/**
 * @param {Finding[]} findings
 * @param {string|undefined} min
 */
function filterBySeverity(findings, min) {
  if (!min) return findings;
  const minIdx = SEVERITY_ORDER.indexOf(min);
  if (minIdx === -1) return findings;
  return findings.filter(f => SEVERITY_ORDER.indexOf(f.severity) >= minIdx);
}

function shortId(input) {
  return createHash('sha1').update(input).digest('hex').slice(0, 10);
}

function relPath(p, cwd) {
  if (p.startsWith(cwd)) return p.slice(cwd.length + 1);
  return p;
}

/**
 * Render an audit result to the chosen format.
 *
 * @param {Awaited<ReturnType<typeof audit>>} result
 * @param {{format: 'toon'|'json'|'text', explain?: boolean, cwd?: string}} opts
 */
export function renderAudit(result, opts) {
  const cwd = opts.cwd ?? process.cwd();
  if (opts.format === 'json') {
    return format('json', [], {
      status: result.status,
      json: {
        files: result.files.map(f => relPath(f, cwd)),
        findings: result.findings.map(f => ({ ...f, file: relPath(f.file, cwd) })),
        summary: result.summary,
        status: result.status,
      },
    });
  }
  /** @type {Array<{label: string, fields: Record<string, unknown>}>} */
  const records = [];
  for (const f of result.files) {
    records.push({ label: 'SCAN', fields: { file: relPath(f, opts.cwd ?? process.cwd()) } });
  }
  for (const finding of result.findings) {
    const fields = { id: finding.id, ...finding.fields, line: finding.line };
    if (opts.explain) fields.explain = finding.explain;
    records.push({ label: 'FINDING', fields });
  }
  records.push({ label: 'SUMMARY', fields: result.summary });
  return format(opts.format, records, { status: result.status });
}
