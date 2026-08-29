import { readFile } from 'node:fs/promises';
import { canonicalPath, occurrenceId } from './identity.js';
import { resolveRepositoryFile } from './config.js';

/**
 * Load a versioned baseline and return its finding IDs.
 */
export async function loadBaseline({ path, cwd = process.cwd() }) {
  const resolvedPath = await resolveRepositoryFile(path, cwd);
  const raw = JSON.parse(await readFile(resolvedPath, 'utf8'));
  if (!raw || typeof raw !== 'object' || raw.schemaVersion !== '1.0') {
    throw new Error('baseline schemaVersion must be "1.0"');
  }
  if (!Array.isArray(raw.findings)) {
    throw new Error('baseline findings must be an array');
  }
  const ids = new Set();
  const fingerprints = new Set();
  for (const finding of raw.findings) {
    if (!finding || typeof finding !== 'object' || typeof finding.id !== 'string') {
      throw new Error('every baseline finding must contain a string id');
    }
    ids.add(finding.id);
    if (finding.fingerprint !== undefined && typeof finding.fingerprint !== 'string') {
      throw new Error('baseline finding fingerprints must be strings');
    }
    if (finding.fingerprint) fingerprints.add(finding.fingerprint);
  }
  return { path: resolvedPath, ids, fingerprints };
}

/**
 * Serialize current findings deterministically for review and version control.
 */
export function serializeBaseline(findings, cwd = process.cwd()) {
  const records = findings
    .filter(finding => finding.ruleId !== 'parse-error')
    .map(finding => ({
      id: finding.id,
      fingerprint: finding.fingerprint,
      ruleId: finding.ruleId,
      severity: finding.severity,
      file: canonicalPath(finding.file, cwd),
      line: finding.line,
    }))
    .sort((a, b) => (
      a.file.localeCompare(b.file)
      || a.line - b.line
      || a.ruleId.localeCompare(b.ruleId)
      || a.id.localeCompare(b.id)
    ));
  return `${JSON.stringify({
    schemaVersion: '1.0',
    generatedBy: 'actions-warden',
    findings: records,
  }, null, 2)}\n`;
}

/**
 * Attach line-independent semantic fingerprints while distinguishing repeated
 * equivalent findings by their source-order ordinal.
 */
export function assignBaselineFingerprints(findings, cwd = process.cwd()) {
  const ordered = [...findings].sort((a, b) => (
    canonicalPath(a.file, cwd).localeCompare(canonicalPath(b.file, cwd))
    || a.line - b.line
    || a.ruleId.localeCompare(b.ruleId)
    || a.id.localeCompare(b.id)
  ));
  const occurrences = new Map();
  for (const finding of ordered) {
    const semantic = stableValue(Object.fromEntries(
      Object.entries(finding.fields ?? {})
        .filter(([key]) => !['file', 'line', 'sev', 'source_line'].includes(key)),
    ));
    const key = JSON.stringify({
      ruleId: finding.ruleId,
      file: canonicalPath(finding.file, cwd),
      fields: semantic,
    });
    const ordinal = occurrences.get(key) ?? 0;
    occurrences.set(key, ordinal + 1);
    finding.fingerprint = occurrenceId({
      kind: 'baseline',
      file: finding.file,
      cwd,
      subject: `${key}#${ordinal}`,
    });
  }
  return findings;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}
