// @ts-check
/**
 * Plain-text, one-record-per-line serialization for human-readable logs.
 */

import { redactField } from '../redact.js';

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
      .map(([k, v]) => `${k}=${escapeText(redactField(k, String(v)))}`)
      .join(' ');
    return `[${r.label}] ${kv}`;
  });
  if (options.status) lines.push(`==> ${options.status}`);
  return lines.join('\n') + '\n';
}

/** @param {string} value */
function escapeText(value) {
  return JSON.stringify(value).slice(1, -1);
}
