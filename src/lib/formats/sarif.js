// @ts-check
/**
 * SARIF 2.1.0 serialization for GitHub code scanning.
 *
 * Local commands produce one run. An organization scan produces one run per
 * repository, so each run's locations are repository-relative and its version
 * control provenance names that repository's URL, commit, and branch.
 */

import { renderJson } from './json.js';

const SARIF_SCHEMA = 'https://json.schemastore.org/sarif-2.1.0.json';
const RESULT_LABELS = new Set(['FINDING', 'ERROR', 'WARNING', 'PIN', 'UPGRADE']);

// GitHub maps a score of over 9.0 to critical, 7.0-8.9 to high, 4.0-6.9 to medium,
// and 0.1-3.9 to low, so critical uses 9.5 rather than the ambiguous boundary 9.0.
const SECURITY_SEVERITY = new Map([
  ['critical', '9.5'],
  ['high', '7.0'],
  ['medium', '4.0'],
  ['low', '1.0'],
]);

/**
 * @typedef {import('../types.js').ReportRecord} ReportRecord
 * @typedef {{id: string, shortDescription: {text: string},
 *   defaultConfiguration: {level: string}, properties?: Record<string, string>}} RuleDescriptor
 */

/**
 * Render records as SARIF 2.1.0 for GitHub code scanning. Records that contain
 * `REPOSITORY` entries yield one run per repository; otherwise there is one run.
 * Every rule descriptor with a known severity carries `security-severity`.
 *
 * @param {ReportRecord[]} records
 * @param {{status?: string}} [options]
 */
export function renderSarif(records, options = {}) {
  const catalog = catalogRules(records);
  const groups = repositoryGroups(records);
  const runs = groups.length > 0
    ? groups.map(group => buildRun(catalog, group.records, options, group.repository))
    : [buildRun(catalog, records, options, null)];
  return renderJson({ $schema: SARIF_SCHEMA, version: '2.1.0', runs });
}

/**
 * @param {ReportRecord[]} records
 * @returns {Map<string, RuleDescriptor>}
 */
function catalogRules(records) {
  const rules = new Map();
  for (const record of records) {
    if (record.label !== 'RULE') continue;
    const id = String(record.fields.id ?? 'actions-warden');
    rules.set(id, ruleDescriptor({
      id,
      text: String(record.fields.description ?? id),
      level: sarifLevel(String(record.fields.severity ?? 'low')),
      severity: String(record.fields.severity ?? ''),
    }));
  }
  return rules;
}

/**
 * Split records into one group per `REPOSITORY` record, keeping everything that
 * follows it until the next repository.
 *
 * @param {ReportRecord[]} records
 * @returns {Array<{repository: Record<string, unknown>, records: ReportRecord[]}>}
 */
function repositoryGroups(records) {
  /** @type {Array<{repository: Record<string, unknown>, records: ReportRecord[]}>} */
  const groups = [];
  for (const record of records) {
    if (record.label === 'REPOSITORY') {
      groups.push({ repository: record.fields, records: [] });
    } else if (groups.length > 0) {
      groups.at(-1)?.records.push(record);
    }
  }
  return groups;
}

/**
 * @param {Map<string, RuleDescriptor>} catalog
 * @param {ReportRecord[]} records
 * @param {{status?: string}} options
 * @param {Record<string, unknown>|null} repository
 */
function buildRun(catalog, records, options, repository) {
  const rules = new Map(catalog);
  const results = [];
  for (const record of records) {
    if (!RESULT_LABELS.has(record.label)) continue;
    const ruleId = String(record.fields.type ?? `actions-warden/${record.label.toLowerCase()}`);
    if (!rules.has(ruleId)) rules.set(ruleId, syntheticRule(ruleId, record));
    results.push(buildResult(record, ruleId, repository !== null));
  }
  return {
    tool: {
      driver: {
        name: 'actions-warden',
        informationUri: 'https://github.com/chiz0me/actions-warden',
        rules: [...rules.values()],
      },
    },
    ...(repository ? versionControlProvenance(repository) : {}),
    invocations: [{
      executionSuccessful: options.status !== 'ERROR',
    }],
    results,
  };
}

/**
 * @param {string} ruleId
 * @param {ReportRecord} record
 * @returns {RuleDescriptor}
 */
function syntheticRule(ruleId, record) {
  const fields = record.fields;
  return ruleDescriptor({
    id: ruleId,
    text: ruleId,
    level: record.label === 'ERROR' ? 'error' : sarifLevel(String(fields.sev ?? 'low')),
    // Only findings carry a security severity; operational errors, warnings, and
    // change plans are not security alerts.
    severity: record.label === 'FINDING' ? String(fields.sev ?? '') : '',
  });
}

/**
 * @param {{id: string, text: string, level: string, severity: string}} descriptor
 * @returns {RuleDescriptor}
 */
function ruleDescriptor({ id, text, level, severity }) {
  const score = SECURITY_SEVERITY.get(severity);
  return {
    id,
    shortDescription: { text },
    defaultConfiguration: { level },
    ...(score ? { properties: { 'security-severity': score } } : {}),
  };
}

/**
 * @param {ReportRecord} record
 * @param {string} ruleId
 * @param {boolean} repositoryRelative Use the repo-relative `path` for locations.
 */
function buildResult(record, ruleId, repositoryRelative) {
  const fields = record.fields;
  const location = repositoryRelative ? (fields.path ?? fields.file) : fields.file;
  const file = location ? String(location) : null;
  const line = Number(fields.line);
  return {
    ruleId,
    level: resultLevel(record),
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
}

/** @param {ReportRecord} record */
function resultLevel(record) {
  if (record.label === 'ERROR') return 'error';
  if (record.label === 'WARNING') return 'warning';
  return sarifLevel(String(record.fields.sev ?? (record.label === 'FINDING' ? 'warning' : 'low')));
}

/**
 * @param {Record<string, unknown>} repository The REPOSITORY record's fields.
 * @returns {{versionControlProvenance?: Array<Record<string, string>>}}
 */
function versionControlProvenance(repository) {
  if (!repository.url) return {};
  return {
    versionControlProvenance: [{
      repositoryUri: String(repository.url),
      ...(repository.commit ? { revisionId: String(repository.commit) } : {}),
      ...(repository.branch ? { branch: String(repository.branch) } : {}),
    }],
  };
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
