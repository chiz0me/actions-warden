// @ts-check
/**
 * Deterministic RFC 4180-compatible CSV with an explicit status row.
 */

import { redact, redactDeep, redactField } from '../redact.js';

const CSV_PREFERRED_COLUMNS = Object.freeze([
  'status',
  'organization',
  'repo',
  'repository',
  'file',
  'path',
  'line',
  'id',
  'type',
  'ruleId',
  'sev',
  'severity',
  'action',
  'image',
  'from',
  'to',
  'sha',
  'version',
  'level',
  'change',
  'msg',
  'explain',
  'url',
  'permalink',
]);

/**
 * Render records as deterministic RFC 4180-compatible CSV. The first column
 * identifies the record type and a final STATUS record preserves semantic
 * status. Control characters are escaped to keep one physical line per record,
 * and formula-like cells are prefixed with an apostrophe for spreadsheet safety.
 *
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: 'OK'|'FAIL'}} [options]
 * @returns {string}
 */
export function renderCsv(records, options = {}) {
  const normalized = normalizeCsvRecords(records);
  if (options.status) {
    normalized.push({
      label: 'STATUS',
      fields: new Map([['status', redact(String(options.status))]]),
    });
  }

  const discovered = new Set(normalized.flatMap(record => [...record.fields.keys()]));
  discovered.delete('record_type');
  const preferred = CSV_PREFERRED_COLUMNS.filter(column => discovered.delete(column));
  const columns = ['record_type', ...preferred, ...[...discovered].sort()];
  const rows = [columns.map(column => csvCell(column)).join(',')];
  for (const record of normalized) {
    rows.push(columns.map(column => csvCell(
      column === 'record_type' ? record.label : record.fields.get(column),
      column,
    )).join(','));
  }
  return `${rows.join('\r\n')}\r\n`;
}

/**
 * @param {unknown} records
 * @returns {Array<{label: string, fields: Map<string, unknown>}>}
 */
function normalizeCsvRecords(records) {
  if (!Array.isArray(records)) return [];
  return records.map(record => {
    const source = record?.fields;
    const entries = source && typeof source === 'object' && !Array.isArray(source)
      ? Object.entries(source)
      : [];
    return {
      label: redact(String(record?.label ?? 'RECORD')),
      fields: new Map(entries.map(([key, value]) => [
        redact(String(key)),
        typeof value === 'string' ? redactField(key, value) : redactDeep(value),
      ])),
    };
  });
}

/**
 * @param {unknown} value
 * @param {string} [column] Column name; string values in identifier columns keep
 *   long name-like runs readable.
 */
function csvCell(value, column) {
  if (value === null || value === undefined) return '';
  const formulaSensitive = typeof value === 'string';
  let serialized;
  if (typeof value === 'string') {
    serialized = redactField(column, value);
  } else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    serialized = String(value);
  } else {
    serialized = JSON.stringify(redactDeep(value));
    if (serialized === undefined) serialized = String(value);
  }
  serialized = escapeCsvControls(
    formulaSensitive ? redactField(column, serialized) : redact(serialized),
  );
  if (formulaSensitive && /^\s*[=+\-@]/u.test(serialized)) serialized = `'${serialized}`;
  return /[",\r\n]/.test(serialized)
    ? `"${serialized.replaceAll('"', '""')}"`
    : serialized;
}

/** @param {string} value */
function escapeCsvControls(value) {
  let escaped = '';
  for (const character of value) {
    if (character === '\r') escaped += '\\r';
    else if (character === '\n') escaped += '\\n';
    else if (character === '\t') escaped += '\\t';
    else {
      const code = character.charCodeAt(0);
      if (code <= 31 || code === 127) {
        escaped += `\\u${code.toString(16).padStart(4, '0')}`;
      } else {
        escaped += character;
      }
    }
  }
  return escaped;
}
