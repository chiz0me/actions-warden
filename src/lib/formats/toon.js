// @ts-check
/**
 * Token-Oriented Object Notation: one labeled record per line,
 * `LABEL: key=value key=value`, empty values omitted, trailing `STATUS:` line.
 */

import { redact } from '../redact.js';

/**
 * @param {string} value
 * @returns {string}
 */
function quoteIfNeeded(value) {
  if (value === '') return '""';
  if (/[\s="\\]/.test(value) || [...value].some(char => char.charCodeAt(0) < 32)) {
    return JSON.stringify(value);
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
    const key = redact(String(k)).replace(/[^a-zA-Z0-9_.-]/g, '_');
    parts.push(`${key}=${quoteIfNeeded(redact(value))}`);
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
