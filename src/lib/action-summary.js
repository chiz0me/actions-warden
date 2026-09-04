/**
 * Bounded, redacted GitHub Actions job summaries and numeric output metrics.
 *
 * Command payloads can contain attacker-controlled workflow and GitHub API
 * data. Keep that data in plain escaped table cells; never turn it into links
 * or copy the complete serialized report into the job summary.
 */

import { isAbsolute, resolve } from 'node:path';
import { canonicalPath } from './identity.js';
import { redact } from './redact.js';
import { listRules } from '../rules/index.js';

const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const SEVERITY_ORDER = new Map(SEVERITIES.map((severity, index) => [severity, index]));
const MAX_ROWS_PER_SECTION = 10;
const MAX_CELL_LENGTH = 240;

/** Hard ceiling for Markdown written to the GitHub Actions job summary. */
export const MAX_ACTION_SUMMARY_LENGTH = 32_000;

const RULE_DESCRIPTIONS = new Map([
  ...listRules().map(rule => [rule.id, rule.description]),
  ['parse-error', 'Fix the workflow YAML syntax before relying on the scan result.'],
]);

/**
 * GitHub Action output names and their corresponding metric object keys.
 * Every numeric output is written for every command, using zero when it does
 * not apply, so downstream expressions do not need command-specific guards.
 */
export const ACTION_NUMERIC_OUTPUTS = Object.freeze([
  ['findings', 'findings'],
  ['total-findings', 'totalFindings'],
  ['critical', 'critical'],
  ['high', 'high'],
  ['medium', 'medium'],
  ['low', 'low'],
  ['suppressed', 'suppressed'],
  ['errors', 'errors'],
  ['repositories-discovered', 'repositoriesDiscovered'],
  ['repositories-selected', 'repositoriesSelected'],
  ['repositories-scanned', 'repositoriesScanned'],
  ['repositories-resumed', 'repositoriesResumed'],
  ['repositories-failed', 'repositoriesFailed'],
  ['new-findings', 'newFindings'],
  ['resolved-findings', 'resolvedFindings'],
  ['unchanged-findings', 'unchangedFindings'],
  ['unknown-findings', 'unknownFindings'],
]);

/** Return the complete, zero-filled shape used for stable numeric outputs. */
export function emptyActionMetrics({ errors = 0 } = {}) {
  return {
    findings: 0,
    totalFindings: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    suppressed: 0,
    errors: count(errors),
    repositoriesDiscovered: 0,
    repositoriesSelected: 0,
    repositoriesScanned: 0,
    repositoriesResumed: 0,
    repositoriesFailed: 0,
    newFindings: 0,
    resolvedFindings: 0,
    unchangedFindings: 0,
    unknownFindings: 0,
  };
}

/**
 * Derive stable numeric Action outputs without changing any command result or
 * serialized JSON/SARIF contract.
 */
export function collectActionMetrics({ command, result, repositoriesReused = 0 }) {
  const findings = findingsFor(command, result);
  const summary = findingSummaryFor(command, result);
  const severityCounts = summarizeSeverities(findings);
  const suppressed = count(summary?.suppressed);
  const activeFindings = count(summary?.findings, findings.length);
  const metrics = {
    ...emptyActionMetrics(),
    findings: activeFindings,
    totalFindings: count(summary?.totalFindings, activeFindings + suppressed),
    critical: count(summary?.critical, severityCounts.critical),
    high: count(summary?.high, severityCounts.high),
    medium: count(summary?.medium, severityCounts.medium),
    low: count(summary?.low, severityCounts.low),
    suppressed,
    errors: operationalErrorsFor(command, result).length,
  };

  if (command === 'org-scan') {
    metrics.repositoriesDiscovered = count(summary?.repositoriesDiscovered);
    metrics.repositoriesSelected = count(summary?.repositoriesSelected);
    metrics.repositoriesScanned = count(summary?.repositoriesScanned);
    metrics.repositoriesResumed = count(repositoriesReused);
    metrics.repositoriesFailed = count(summary?.repositoriesFailed);
    metrics.newFindings = count(result?.comparison?.summary?.newFindings);
    metrics.resolvedFindings = count(result?.comparison?.summary?.resolvedFindings);
    metrics.unchangedFindings = count(result?.comparison?.summary?.unchangedFindings);
    metrics.unknownFindings = count(result?.comparison?.summary?.unknownFindings);
  }
  return metrics;
}

/**
 * Render a concise GitHub-flavored Markdown job summary.
 */
export function renderActionSummary({
  command,
  result,
  cwd = process.cwd(),
  metrics = collectActionMetrics({ command, result }),
  annotations = 0,
  annotationsSkipped = 0,
  reportPath = '',
  checkpointPath = '',
  checkpointResumed = false,
  repositoriesReused = metrics.repositoriesResumed,
  write = false,
}) {
  const sections = [
    `### actions-warden (${markdownText(command, 64)})`,
    renderTable(
      ['Result', 'Value'],
      overviewRows({
        command,
        result,
        cwd,
        metrics,
        annotations,
        annotationsSkipped,
        reportPath,
        checkpointPath,
        checkpointResumed,
        repositoriesReused,
        write,
      }),
      new Set([1]),
    ),
  ];

  const findings = findingsFor(command, result);
  if (findingSummaryFor(command, result)) {
    sections.push(renderSeveritySection(metrics));
  }
  if (command === 'org-scan') {
    sections.push(renderOrganizationCoverage(result.summary, result.coverage));
    if (result.comparison) sections.push(renderComparison(result.comparison));
  }
  if (findings.length > 0) {
    sections.push(renderRuleBreakdown(findings));
    sections.push(renderFindingDetails({ command, result, findings, cwd }));
  }

  const changes = changesFor(command, result);
  if (changes.length > 0) {
    sections.push(renderChanges(changes, cwd, write && command !== 'report'));
  }

  const skipped = skippedFor(command, result);
  if (skipped.length > 0) sections.push(renderSkipped(skipped, cwd));

  const warnings = command === 'verify' ? array(result?.warnings) : [];
  if (warnings.length > 0) sections.push(renderWarnings(warnings, cwd));

  const errors = operationalErrorsFor(command, result);
  if (errors.length > 0) sections.push(renderErrors(errors, cwd));

  return boundSummary(`${sections.filter(Boolean).join('\n\n')}\n`);
}

/**
 * Render an invocation-level failure when no normal command result exists.
 */
export function renderActionFailureSummary({
  command,
  message,
  annotations = 0,
}) {
  const summary = [
    `### actions-warden (${markdownText(command, 64)})`,
    renderTable(['Result', 'Value'], [
      ['Status', 'FAIL'],
      ['Operational errors', 1],
      ['Annotations', `${count(annotations)} emitted`],
    ], new Set([1])),
    '#### Invocation error',
    markdownText(message || 'actions-warden could not complete the requested command.', 2_000),
  ].join('\n\n');
  return boundSummary(`${summary}\n`);
}

function overviewRows({
  command,
  result,
  cwd,
  metrics,
  annotations,
  annotationsSkipped,
  reportPath,
  checkpointPath,
  checkpointResumed,
  repositoriesReused,
  write,
}) {
  const rows = [['Status', result?.status ?? 'UNKNOWN']];
  const summary = findingSummaryFor(command, result);

  if (summary) {
    rows.push(
      ['Files scanned', count(summary.files)],
      ['Active findings', metrics.findings],
      ['Total findings before baseline', metrics.totalFindings],
      ['Suppressed by baseline', metrics.suppressed],
      ['Operational errors', metrics.errors],
    );
  } else if (command === 'pin') {
    rows.push(
      [write ? 'Changes applied' : 'Changes planned', array(result?.changes).length],
      ['Operational errors', metrics.errors],
    );
  } else if (command === 'upgrade') {
    rows.push(
      [write ? 'Changes applied' : 'Changes planned', array(result?.changes).length],
      ['Upgrades skipped', array(result?.skipped).length],
      ['Operational errors', metrics.errors],
    );
  } else if (command === 'verify') {
    rows.push(
      ['Files scanned', array(result?.files).length],
      ['References verified', array(result?.checks).length],
      ['Warnings', array(result?.warnings).length],
      ['Operational errors', metrics.errors],
    );
  } else if (command === 'rules') {
    rows.push(['Rules listed', listRules().length]);
  }

  if (command === 'report') {
    rows.push(
      ['Pin changes planned', array(result?.pin?.changes).length],
      ['Upgrade changes planned', array(result?.upgrade?.changes).length],
      ['Upgrades skipped', array(result?.upgrade?.skipped).length],
    );
  }
  if (command === 'org-scan') rows.splice(1, 0, ['Organization', result?.organization ?? '']);

  rows.push([
    'Annotations',
    `${count(annotations)} emitted; ${count(annotationsSkipped)} omitted`,
  ]);
  if (reportPath) rows.push(['Saved report', workspacePath(reportPath, cwd)]);
  if (command === 'org-scan' && checkpointPath) {
    rows.push(
      ['Checkpoint', workspacePath(checkpointPath, cwd)],
      ['Checkpoint resumed', checkpointResumed ? 'yes' : 'no'],
      ['Repositories reused', count(repositoriesReused)],
    );
  }
  return rows;
}

function renderSeveritySection(metrics) {
  return [
    '#### Severity breakdown',
    renderTable(
      ['Critical', 'High', 'Medium', 'Low'],
      [[metrics.critical, metrics.high, metrics.medium, metrics.low]],
      new Set([0, 1, 2, 3]),
    ),
  ].join('\n\n');
}

function renderOrganizationCoverage(summary = {}, coverage = {}) {
  return [
    '#### Repository coverage',
    renderTable(['Coverage', 'Count'], [
      ['Eligible coverage complete', coverage.complete === true ? 'yes' : 'no'],
      ['Discovered', count(summary.repositoriesDiscovered)],
      ['Eligible', count(summary.repositoriesEligible)],
      ['Selected', count(summary.repositoriesSelected)],
      ['Scanned', count(summary.repositoriesScanned)],
      ['With workflows', count(summary.repositoriesWithWorkflows)],
      ['With findings', count(summary.repositoriesWithFindings)],
      ['Failed', count(summary.repositoriesFailed)],
      ['Skipped by scope', count(summary.repositoriesSkipped)],
      ['Omitted by repository limit', count(coverage.repositoriesOmittedByLimit)],
      ['Incomplete repositories', array(coverage.incompleteRepositories).length],
    ], new Set([1])),
  ].join('\n\n');
}

function renderComparison(comparison) {
  const summary = comparison?.summary ?? {};
  return [
    '#### Change since previous report',
    renderTable(['Change', 'Count'], [
      ['New findings', count(summary.newFindings)],
      ['Resolved findings', count(summary.resolvedFindings)],
      ['Unchanged findings', count(summary.unchangedFindings)],
      ['Unknown resolution', count(summary.unknownFindings)],
      ['Comparable repositories', count(summary.repositoriesComparable)],
      ['Removed repositories', count(summary.repositoriesRemoved)],
      ['Failed repositories', count(summary.repositoriesFailed)],
      ['Comparison complete', summary.complete === true ? 'yes' : 'no'],
    ], new Set([1])),
  ].join('\n\n');
}

function renderRuleBreakdown(findings) {
  const byRule = new Map();
  for (const finding of findings) {
    const ruleId = String(finding?.ruleId ?? 'unknown');
    const severity = normalizeSeverity(finding?.severity);
    const record = byRule.get(ruleId) ?? {
      ruleId,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: 0,
    };
    record[severity] += 1;
    record.total += 1;
    byRule.set(ruleId, record);
  }
  const records = [...byRule.values()].sort((left, right) => (
    right.total - left.total || compareText(left.ruleId, right.ruleId)
  ));
  const visible = records.slice(0, MAX_ROWS_PER_SECTION);
  const section = [
    '#### Findings by rule',
    renderTable(
      ['Rule', 'Critical', 'High', 'Medium', 'Low', 'Total'],
      visible.map(record => [
        record.ruleId,
        record.critical,
        record.high,
        record.medium,
        record.low,
        record.total,
      ]),
      new Set([1, 2, 3, 4, 5]),
    ),
  ];
  if (records.length > visible.length) section.push(showingNote(visible.length, records.length, 'rules'));
  return section.join('\n\n');
}

function renderFindingDetails({ command, result, findings, cwd }) {
  const explanations = findingExplanations(command, result);
  const sorted = [...findings].sort((left, right) => (
    severityRank(left?.severity) - severityRank(right?.severity)
    || compareText(location(left, cwd), location(right, cwd))
    || count(left?.line) - count(right?.line)
    || compareText(left?.ruleId, right?.ruleId)
    || compareText(left?.id, right?.id)
  ));
  const visible = sorted.slice(0, MAX_ROWS_PER_SECTION);
  const section = [
    '#### Top findings',
    renderTable(['Severity', 'Rule', 'Location', 'ID', 'Remediation'], visible.map(finding => [
      normalizeSeverity(finding?.severity),
      finding?.ruleId ?? 'unknown',
      location(finding, cwd),
      finding?.id ?? '',
      finding?.explain
        ?? explanations.get(finding?.id)
        ?? RULE_DESCRIPTIONS.get(finding?.ruleId)
        ?? 'Review the complete report evidence and update the workflow safely.',
    ])),
  ];
  if (findings.length > visible.length) {
    section.push(showingNote(visible.length, findings.length, 'findings'));
  }
  return section.join('\n\n');
}

function renderChanges(changes, cwd, applied) {
  const sorted = [...changes].sort((left, right) => (
    compareText(left.stage, right.stage)
    || compareText(location(left.change, cwd), location(right.change, cwd))
    || compareText(left.change?.action, right.change?.action)
    || compareText(left.change?.id, right.change?.id)
  ));
  const visible = sorted.slice(0, MAX_ROWS_PER_SECTION);
  const section = [
    applied ? '#### Applied changes' : '#### Planned changes',
    renderTable(['Stage', 'Action', 'From', 'To', 'Location', 'ID'], visible.map(({ stage, change }) => [
      stage,
      change?.action ?? '',
      change?.fromVersion ?? change?.fromRef ?? '',
      stage === 'pin' ? change?.toSha ?? '' : change?.toTag ?? change?.toSha ?? '',
      location(change, cwd),
      change?.id ?? '',
    ])),
  ];
  if (changes.length > visible.length) {
    section.push(showingNote(visible.length, changes.length, 'changes'));
  }
  return section.join('\n\n');
}

function renderSkipped(skipped, cwd) {
  const sorted = [...skipped].sort((left, right) => (
    compareText(location(left, cwd), location(right, cwd))
    || compareText(left?.action, right?.action)
    || compareText(left?.tag, right?.tag)
  ));
  const visible = sorted.slice(0, MAX_ROWS_PER_SECTION);
  const section = [
    '#### Skipped upgrades',
    renderTable(['Action', 'Candidate', 'Reason', 'Age', 'Location'], visible.map(skip => [
      skip?.action ?? '',
      skip?.tag ?? '',
      skip?.reason ?? '',
      skip?.ageDays === undefined
        ? skip?.ageSource ?? ''
        : `${count(skip.ageDays)} days${skip?.ageSource ? ` (${skip.ageSource})` : ''}`,
      location(skip, cwd),
    ])),
  ];
  if (skipped.length > visible.length) {
    section.push(showingNote(visible.length, skipped.length, 'skipped upgrades'));
  }
  return section.join('\n\n');
}

function renderWarnings(warnings, cwd) {
  const sorted = [...warnings].sort(compareDiagnostics(cwd));
  const visible = sorted.slice(0, MAX_ROWS_PER_SECTION);
  const section = [
    '#### Verification warnings',
    renderTable(['Location', 'Action', 'Warning', 'ID'], visible.map(warning => [
      location(warning, cwd),
      warning?.action ?? '',
      warning?.warning ?? 'Verification warning.',
      warning?.id ?? '',
    ])),
  ];
  if (warnings.length > visible.length) {
    section.push(showingNote(visible.length, warnings.length, 'warnings'));
  }
  return section.join('\n\n');
}

function renderErrors(errors, cwd) {
  const sorted = [...errors].sort((left, right) => (
    compareText(left.stage, right.stage)
    || compareDiagnostics(cwd)(left.error, right.error)
  ));
  const visible = sorted.slice(0, MAX_ROWS_PER_SECTION);
  const section = [
    '#### Operational errors',
    renderTable(['Stage', 'Location', 'Subject', 'Error'], visible.map(({ stage, error }) => [
      stage,
      location(error, cwd),
      error?.action ?? error?.repository ?? '',
      error?.error ?? 'actions-warden reported an operational error.',
    ])),
  ];
  if (errors.length > visible.length) {
    section.push(showingNote(visible.length, errors.length, 'errors'));
  }
  return section.join('\n\n');
}

function findingsFor(command, result) {
  if (command === 'audit' || command === 'org-scan') return array(result?.findings);
  if (command === 'report') return array(result?.audit?.findings);
  return [];
}

function findingSummaryFor(command, result) {
  if (command === 'audit' || command === 'org-scan') return result?.summary;
  if (command === 'report') return result?.audit?.summary;
  return undefined;
}

function findingExplanations(command, result) {
  const auditResult = command === 'report' ? result?.audit : command === 'audit' ? result : undefined;
  return new Map(array(auditResult?.allFindings)
    .filter(finding => finding?.id && finding?.explain)
    .map(finding => [finding.id, finding.explain]));
}

function changesFor(command, result) {
  if (command === 'pin' || command === 'upgrade') {
    return array(result?.changes).map(change => ({ stage: command, change }));
  }
  if (command === 'report') {
    return [
      ...array(result?.pin?.changes).map(change => ({ stage: 'pin', change })),
      ...array(result?.upgrade?.changes).map(change => ({ stage: 'upgrade', change })),
    ];
  }
  return [];
}

function skippedFor(command, result) {
  if (command === 'upgrade') return array(result?.skipped);
  if (command === 'report') return array(result?.upgrade?.skipped);
  return [];
}

function operationalErrorsFor(command, result) {
  const errors = [];
  const explanations = findingExplanations(command, result);
  for (const finding of findingsFor(command, result)) {
    if (finding?.ruleId !== 'parse-error') continue;
    errors.push({
      stage: 'parse',
      error: {
        ...finding,
        error: finding.explain
          ?? explanations.get(finding.id)
          ?? 'Workflow YAML could not be parsed.',
      },
    });
  }

  if (command === 'pin' || command === 'upgrade' || command === 'verify') {
    errors.push(...array(result?.errors).map(error => ({ stage: command, error })));
  } else if (command === 'report') {
    errors.push(
      ...array(result?.pin?.errors).map(error => ({ stage: 'pin', error })),
      ...array(result?.upgrade?.errors).map(error => ({ stage: 'upgrade', error })),
    );
  } else if (command === 'org-scan') {
    errors.push(...array(result?.errors).map(error => ({ stage: 'org-scan', error })));
  }
  return errors;
}

function summarizeSeverities(findings) {
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of findings) summary[normalizeSeverity(finding?.severity)] += 1;
  return summary;
}

function location(diagnostic, cwd) {
  let value = '';
  if (typeof diagnostic?.file === 'string' && diagnostic.file) {
    value = workspacePath(diagnostic.file, cwd);
  } else if (typeof diagnostic?.path === 'string' && diagnostic.path) {
    value = diagnostic?.repository
      ? `${diagnostic.repository}/${diagnostic.path}`
      : diagnostic.path;
  } else if (typeof diagnostic?.repository === 'string') {
    value = diagnostic.repository;
  }
  const line = positiveInteger(diagnostic?.line);
  return `${value || '—'}${line ? `:${line}` : ''}`;
}

function workspacePath(file, cwd) {
  if (typeof file !== 'string' || !file || file.includes('\0')) return '—';
  try {
    const absolute = isAbsolute(file) ? file : resolve(cwd, file);
    const relative = canonicalPath(absolute, resolve(cwd));
    if (relative === '') return '.';
    if (relative === '..' || relative.startsWith('../')) return '(outside working directory)';
    return relative;
  } catch {
    return '(invalid path)';
  }
}

function compareDiagnostics(cwd) {
  return (left, right) => (
    compareText(location(left, cwd), location(right, cwd))
    || count(left?.line) - count(right?.line)
    || compareText(left?.action, right?.action)
    || compareText(left?.id, right?.id)
    || compareText(left?.error ?? left?.warning, right?.error ?? right?.warning)
  );
}

function renderTable(headers, rows, numericColumns = new Set()) {
  const renderedHeaders = headers.map(header => markdownText(header, 80));
  const separator = headers.map((_, index) => numericColumns.has(index) ? '---:' : '---');
  return [
    `| ${renderedHeaders.join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...rows.map(row => (
      `| ${headers.map((_, index) => markdownText(row[index] ?? '', MAX_CELL_LENGTH)).join(' | ')} |`
    )),
  ].join('\n');
}

function markdownText(value, maxLength = MAX_CELL_LENGTH) {
  const withoutControls = [...redact(value)].map(character => {
    const codePoint = character.codePointAt(0);
    return codePoint <= 0x1f || codePoint === 0x7f ? ' ' : character;
  }).join('');
  const normalized = withoutControls
    .replace(/\s+/g, ' ')
    .trim();
  const truncated = truncate(normalized, maxLength);
  return truncated
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replace(/[\\`*_[\]#|]/g, character => `&#${character.codePointAt(0)};`);
}

function showingNote(visible, total, label) {
  return `_Showing ${visible} of ${total} ${label}; all records remain in the command output and any saved report._`;
}

function boundSummary(summary) {
  if (summary.length <= MAX_ACTION_SUMMARY_LENGTH) return summary;
  const marker = '\n\n_Summary truncated; use the complete command output or saved report._\n';
  return `${summary.slice(0, MAX_ACTION_SUMMARY_LENGTH - marker.length).trimEnd()}${marker}`;
}

function normalizeSeverity(value) {
  return SEVERITY_ORDER.has(value) ? value : 'low';
}

function severityRank(value) {
  return SEVERITY_ORDER.get(value) ?? SEVERITIES.length;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function count(value, fallback = 0) {
  return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function compareText(left, right) {
  const a = String(left ?? '');
  const b = String(right ?? '');
  return a < b ? -1 : a > b ? 1 : 0;
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}
