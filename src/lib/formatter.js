/**
 * Output formatter supporting TOON (Token-Oriented Object Notation), JSON, and
 * plain text.
 *
 * TOON output rules:
 *   - One record per line: `LABEL: key=value key=value`
 *   - Values containing spaces or `=` are quoted: `msg="hello world"`
 *   - Empty/null values are omitted
 *   - Trailing `STATUS: OK` or `STATUS: FAIL` signal for machine consumers
 */

import { redact } from './redact.js';

/**
 * Severity ordering, lowest-to-highest.
 */
export const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'];

/**
 * @param {string} value
 * @returns {string}
 */
function quoteIfNeeded(value) {
  if (value === '') return '""';
  if (/[\s="]/.test(value)) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

/**
 * Serialize a record to a single TOON line.
 *
 * @param {string} label
 * @param {Record<string, unknown>} fields
 * @returns {string}
 */
export function toonLine(label, fields) {
  const parts = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined || v === '') continue;
    const value = typeof v === 'string' ? v : String(v);
    parts.push(`${k}=${quoteIfNeeded(redact(value))}`);
  }
  return parts.length === 0 ? `${label}:` : `${label}: ${parts.join(' ')}`;
}

/**
 * Render a TOON document.
 *
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: 'OK'|'FAIL'}} [options]
 * @returns {string}
 */
export function renderToon(records, options = {}) {
  const lines = records.map(r => toonLine(r.label, r.fields));
  if (options.status) lines.push(`STATUS: ${options.status}`);
  return lines.join('\n') + '\n';
}

/**
 * Render JSON with stable key ordering and 2-space indent.
 *
 * @param {unknown} payload
 * @returns {string}
 */
export function renderJson(payload) {
  return JSON.stringify(payload, null, 2) + '\n';
}

/**
 * Render plain text (human-readable summary).
 *
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: 'OK'|'FAIL'}} [options]
 * @returns {string}
 */
export function renderText(records, options = {}) {
  const lines = records.map(r => {
    const kv = Object.entries(r.fields)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${redact(String(v))}`)
      .join(' ');
    return `[${r.label}] ${kv}`;
  });
  if (options.status) lines.push(`==> ${options.status}`);
  return lines.join('\n') + '\n';
}

/**
 * Format records into the requested output mode.
 *
 * @param {'toon'|'json'|'text'} format
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: 'OK'|'FAIL', json?: unknown}} [options]
 * @returns {string}
 */
export function format(format_, records, options = {}) {
  switch (format_) {
    case 'json':
      return renderJson(options.json ?? recordsToJson(records, options));
    case 'text':
      return renderText(records, options);
    case 'toon':
    default:
      return renderToon(records, options);
  }
}

/**
 * Convert records to a generic JSON payload when no custom JSON is supplied.
 *
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: string}} options
 * @returns {object}
 */
function recordsToJson(records, options) {
  return {
    records: records.map(r => ({ label: r.label, ...r.fields })),
    status: options.status ?? null,
  };
}

/**
 * Aggregate findings into a summary record.
 *
 * @param {Array<{severity: string}>} findings
 * @returns {Record<string, number>}
 */
export function summarize(findings) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    if (counts[f.severity] !== undefined) counts[f.severity] += 1;
  }
  return counts;
}
