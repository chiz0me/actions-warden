/**
 * Native GitHub Actions annotation support.
 *
 * This module stays independent of stdout and the Action runtime so collection,
 * ordering, limits, and workflow-command encoding can be tested as pure logic.
 */

import { isAbsolute, relative, resolve, sep } from 'node:path';
import { listRules } from '../rules/index.js';
import { redact } from './redact.js';

const LEVEL_ORDER = new Map([
  ['error', 0],
  ['warning', 1],
  ['notice', 2],
]);
const SEVERITY_ORDER = new Map([
  ['critical', 0],
  ['high', 1],
  ['medium', 2],
  ['low', 3],
]);
const RULE_DESCRIPTIONS = new Map(
  listRules().map(rule => [rule.id, rule.description]),
);

/**
 * @typedef {object} Annotation
 * @property {'error'|'warning'|'notice'} level
 * @property {string} title
 * @property {string} message
 * @property {string} [file]
 * @property {number} [line]
 * @property {number} [column]
 * @property {string} [id]
 * @property {'critical'|'high'|'medium'|'low'} [severity]
 */

/**
 * Convert one command result into native annotation records.
 *
 * @param {object} input
 * @param {string} input.command
 * @param {object} input.result
 * @param {string} [input.cwd]
 * @returns {Annotation[]}
 */
export function collectAnnotations({ command, result, cwd = process.cwd() }) {
  /** @type {Annotation[]} */
  const annotations = [];
  if (command === 'audit') {
    annotations.push(...(result.findings ?? []).map(finding => (
      findingAnnotation(finding, cwd)
    )));
  } else if (command === 'report') {
    annotations.push(...(result.audit?.findings ?? []).map(finding => (
      findingAnnotation(finding, cwd)
    )));
    annotations.push(...errorAnnotations('pin', result.pin?.errors, cwd));
    annotations.push(...errorAnnotations('upgrade', result.upgrade?.errors, cwd));
  } else if (command === 'org-scan') {
    annotations.push(...(result.findings ?? []).map(finding => (
      findingAnnotation({
        ...finding,
        file: undefined,
        fields: {
          ...finding.fields,
          repository: finding.repository,
          remote_path: finding.fields?.file,
          source_url: finding.url,
        },
      }, cwd)
    )));
    annotations.push(...errorAnnotations('org-scan', result.errors, cwd));
  } else if (command === 'verify') {
    annotations.push(...(result.warnings ?? []).map(warning => ({
      level: 'warning',
      severity: 'medium',
      title: 'actions-warden: verification warning',
      message: diagnosticMessage(warning.warning, warning),
      ...location(warning, cwd),
      id: warning.id,
    })));
    annotations.push(...errorAnnotations('verify', result.errors, cwd));
  } else if (command === 'pin' || command === 'upgrade') {
    annotations.push(...errorAnnotations(command, result.errors, cwd));
  }
  return annotations.sort(compareAnnotations);
}

/**
 * Apply a deterministic per-level cap.
 *
 * GitHub currently limits warning and error annotations per Action step. A
 * matching notice cap keeps output bounded and predictable.
 *
 * @param {Annotation[]} annotations
 * @param {number} [limitPerLevel]
 */
export function limitAnnotations(annotations, limitPerLevel = 10) {
  const limit = Math.max(0, Math.min(10, Number.isInteger(limitPerLevel) ? limitPerLevel : 10));
  const counts = new Map();
  const emitted = [];
  const omittedByLevel = { error: 0, warning: 0, notice: 0 };
  for (const annotation of [...annotations].sort(compareAnnotations)) {
    const count = counts.get(annotation.level) ?? 0;
    if (count >= limit) {
      omittedByLevel[annotation.level] += 1;
      continue;
    }
    counts.set(annotation.level, count + 1);
    emitted.push(annotation);
  }
  const omitted = Object.values(omittedByLevel).reduce((sum, count) => sum + count, 0);
  return { emitted, omitted, omittedByLevel };
}

/**
 * Encode annotations as GitHub workflow commands.
 *
 * @param {Annotation[]} annotations
 */
export function renderAnnotationCommands(annotations) {
  if (annotations.length === 0) return '';
  return annotations.map(annotation => {
    const properties = [];
    if (annotation.file) properties.push(`file=${escapeProperty(annotation.file)}`);
    if (annotation.file && annotation.line) properties.push(`line=${annotation.line}`);
    if (annotation.file && annotation.column) properties.push(`col=${annotation.column}`);
    properties.push(`title=${escapeProperty(annotation.title)}`);
    const suffix = properties.length > 0 ? ` ${properties.join(',')}` : '';
    return `::${annotation.level}${suffix}::${escapeData(redact(annotation.message))}`;
  }).join('\n') + '\n';
}

function findingAnnotation(finding, cwd) {
  const severity = normalizeSeverity(finding.severity);
  const description = finding.explain
    || RULE_DESCRIPTIONS.get(finding.ruleId)
    || 'GitHub Actions security finding.';
  return {
    level: annotationLevel(severity),
    severity,
    title: `actions-warden: ${finding.ruleId}`,
    message: diagnosticMessage(description, {
      ...finding.fields,
      ruleId: finding.ruleId,
      id: finding.id,
    }),
    ...location(finding, cwd),
    id: finding.id,
  };
}

function errorAnnotations(command, errors = [], cwd) {
  return errors.map(error => ({
    level: 'error',
    severity: 'critical',
    title: `actions-warden: ${command} error`,
    message: diagnosticMessage(error.error, error),
    ...location(error, cwd),
    id: error.id,
  }));
}

function diagnosticMessage(primary, diagnostic) {
  const detailEntries = Object.entries(diagnostic ?? {})
    .filter(([key, value]) => (
      !['error', 'warning', 'explain', 'file', 'line', 'column', 'id'].includes(key)
      && value !== null
      && value !== undefined
      && ['string', 'number', 'boolean'].includes(typeof value)
    ))
    .map(([key, value]) => `${key}=${String(value)}`);
  const parts = [
    String(primary || 'actions-warden reported a problem.'),
    detailEntries.join(' '),
    diagnostic?.id ? `[${diagnostic.id}]` : '',
  ].filter(Boolean);
  return truncate(parts.join(' '), 16_000);
}

function location(diagnostic, cwd) {
  const file = normalizeFile(diagnostic?.file, cwd);
  if (!file) return {};
  const line = positiveInteger(diagnostic?.line) ?? 1;
  const column = positiveInteger(diagnostic?.column);
  return {
    file,
    line,
    ...(column ? { column } : {}),
  };
}

function normalizeFile(file, cwd) {
  if (typeof file !== 'string' || file.length === 0 || file.includes('\0')) return undefined;
  const root = resolve(cwd);
  const absolute = resolve(root, file);
  const rel = relative(root, absolute);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return undefined;
  return rel.split(/[\\/]/).join('/');
}

function normalizeSeverity(severity) {
  return SEVERITY_ORDER.has(severity) ? severity : 'low';
}

function annotationLevel(severity) {
  if (severity === 'critical' || severity === 'high') return 'error';
  if (severity === 'medium') return 'warning';
  return 'notice';
}

function compareAnnotations(a, b) {
  return (LEVEL_ORDER.get(a.level) ?? 3) - (LEVEL_ORDER.get(b.level) ?? 3)
    || (SEVERITY_ORDER.get(a.severity) ?? 4) - (SEVERITY_ORDER.get(b.severity) ?? 4)
    || compareText(a.file, b.file)
    || (a.line ?? 0) - (b.line ?? 0)
    || compareText(a.title, b.title)
    || compareText(a.id, b.id);
}

function compareText(a, b) {
  const left = String(a ?? '');
  const right = String(b ?? '');
  return left < right ? -1 : left > right ? 1 : 0;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function escapeData(value) {
  return String(value)
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A');
}

function escapeProperty(value) {
  return escapeData(value)
    .replaceAll(':', '%3A')
    .replaceAll(',', '%2C');
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}
