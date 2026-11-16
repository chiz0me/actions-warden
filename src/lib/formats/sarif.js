// @ts-check
/**
 * SARIF 2.1.0 serialization for GitHub code scanning.
 */

import { renderJson } from './json.js';

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

/** @param {string} severity */
function sarifLevel(severity) {
  if (severity === 'critical' || severity === 'high' || severity === 'error') return 'error';
  if (severity === 'medium' || severity === 'warning') return 'warning';
  return 'note';
}

/**
 * @param {string} label
 * @param {Record<string, unknown>} fields
 */
function summarizeFields(label, fields) {
  const details = Object.entries(fields)
    .filter(([key, value]) => (
      !['id', 'file', 'line', 'path', 'permalink'].includes(key) && value != null && value !== ''
    ))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ');
  return `${label}: ${details}`;
}
