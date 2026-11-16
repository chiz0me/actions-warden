/**
 * Output formatter supporting TOON (Token-Oriented Object Notation), JSON,
 * plain text, CSV, SARIF, and self-contained HTML. Each serializer lives under
 * `src/lib/formats/`; this module dispatches by format name and re-exports the
 * public renderers.
 *
 * TOON output rules:
 *   - One record per line: `LABEL: key=value key=value`
 *   - Values containing spaces or `=` are quoted: `msg="hello world"`
 *   - Empty/null values are omitted
 *   - Trailing `STATUS: OK` or `STATUS: FAIL` signal for machine consumers
 */

import { renderCsv } from './formats/csv.js';
import { renderHtml } from './formats/html.js';
import { renderJson } from './formats/json.js';
import { renderSarif } from './formats/sarif.js';
import { renderText } from './formats/text.js';
import { renderToon } from './formats/toon.js';
import { SEVERITY_LEVELS } from './org-schema.js';

export { renderCsv } from './formats/csv.js';
export { renderHtml } from './formats/html.js';
export { renderJson } from './formats/json.js';
export { renderSarif } from './formats/sarif.js';
export { renderText } from './formats/text.js';
export { renderToon, toonLine } from './formats/toon.js';

/**
 * Severity ordering, lowest-to-highest.
 */
export const SEVERITY_ORDER = [...SEVERITY_LEVELS];

/**
 * Format records into the requested output mode.
 *
 * @param {'toon'|'json'|'text'|'csv'|'sarif'|'html'} format
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: 'OK'|'FAIL', json?: unknown, title?: string,
 *   metadata?: Record<string, unknown>}} [options]
 * @returns {string}
 */
export function format(format_, records, options = {}) {
  switch (format_) {
    case 'json':
      return renderJson(options.json ?? recordsToJson(records, options));
    case 'text':
      return renderText(records, options);
    case 'csv':
      return renderCsv(records, options);
    case 'sarif':
      return renderSarif(records, options);
    case 'html':
      return renderHtml(records, options);
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
    schemaVersion: '1.0',
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
