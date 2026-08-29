/**
 * Output formatter supporting TOON (Token-Oriented Object Notation), JSON,
 * plain text, and SARIF.
 *
 * TOON output rules:
 *   - One record per line: `LABEL: key=value key=value`
 *   - Values containing spaces or `=` are quoted: `msg="hello world"`
 *   - Empty/null values are omitted
 *   - Trailing `STATUS: OK` or `STATUS: FAIL` signal for machine consumers
 */

import { redact, redactDeep } from './redact.js';

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
  return JSON.stringify(redactDeep(payload), null, 2) + '\n';
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
      .map(([k, v]) => `${k}=${escapeText(redact(String(v)))}`)
      .join(' ');
    return `[${r.label}] ${kv}`;
  });
  if (options.status) lines.push(`==> ${options.status}`);
  return lines.join('\n') + '\n';
}

function escapeText(value) {
  return JSON.stringify(value).slice(1, -1);
}

/**
 * Format records into the requested output mode.
 *
 * @param {'toon'|'json'|'text'|'sarif'} format
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
    case 'sarif':
      return renderSarif(records, options);
    case 'toon':
    default:
      return renderToon(records, options);
  }
}

/**
 * Render records as SARIF 2.1.0 for GitHub code scanning.
 *
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: string}} [options]
 */
export function renderSarif(records, options = {}) {
  const ruleRecords = records.filter(record => record.label === 'RULE');
  const resultRecords = records.filter(record => (
    record.label === 'FINDING'
    || record.label === 'ERROR'
    || record.label === 'WARNING'
    || record.label === 'PIN'
    || record.label === 'UPGRADE'
  ));
  const rules = new Map();
  for (const record of ruleRecords) {
    const id = String(record.fields.id ?? 'actions-warden');
    rules.set(id, {
      id,
      shortDescription: {
        text: String(record.fields.description ?? id),
      },
      defaultConfiguration: {
        level: sarifLevel(String(record.fields.severity ?? 'low')),
      },
    });
  }

  const results = resultRecords.map(record => {
    const fields = record.fields;
    const ruleId = String(fields.type ?? `actions-warden/${record.label.toLowerCase()}`);
    if (!rules.has(ruleId)) {
      rules.set(ruleId, {
        id: ruleId,
        shortDescription: { text: ruleId },
        defaultConfiguration: {
          level: record.label === 'ERROR'
            ? 'error'
            : sarifLevel(String(fields.sev ?? 'low')),
        },
      });
    }
    const file = fields.file ? String(fields.file) : null;
    const line = Number(fields.line);
    return {
      ruleId,
      level: record.label === 'ERROR'
        ? 'error'
        : record.label === 'WARNING'
          ? 'warning'
          : sarifLevel(String(fields.sev ?? (record.label === 'FINDING' ? 'warning' : 'low'))),
      message: {
        text: String(fields.explain ?? fields.msg ?? summarizeFields(record.label, fields)),
      },
      ...(file ? {
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: file.replace(/\\/g, '/') },
            ...(Number.isInteger(line) && line > 0
              ? { region: { startLine: line } }
              : {}),
          },
        }],
      } : {}),
      ...(fields.id ? {
        partialFingerprints: {
          // GitHub code scanning recognizes this key and uses the suffix to
          // distinguish multiple results with the same semantic fingerprint.
          primaryLocationLineHash: `${fields.fingerprint ?? fields.id}:1`,
          'actions-warden/id': String(fields.id),
          ...(fields.fingerprint
            ? { 'actions-warden/semantic': String(fields.fingerprint) }
            : {}),
        },
      } : {}),
    };
  });

  return renderJson({
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'actions-warden',
          informationUri: 'https://github.com/chiz0me/actions-warden',
          rules: [...rules.values()],
        },
      },
      invocations: [{
        executionSuccessful: options.status !== 'ERROR',
      }],
      results,
    }],
  });
}

function sarifLevel(severity) {
  if (severity === 'critical' || severity === 'high' || severity === 'error') return 'error';
  if (severity === 'medium' || severity === 'warning') return 'warning';
  return 'note';
}

function summarizeFields(label, fields) {
  const details = Object.entries(fields)
    .filter(([key, value]) => !['id', 'file', 'line'].includes(key) && value != null && value !== '')
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ');
  return `${label}: ${details}`;
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
