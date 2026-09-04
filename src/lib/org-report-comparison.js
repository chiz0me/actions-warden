/**
 * Deterministic comparison of complete organization JSON reports.
 *
 * Resolution claims fail closed: a previous finding is resolved only when the
 * current report used the same analysis identity and successfully covered the
 * finding's repository. Missing or failed repositories make findings unknown.
 */

import { readFile, stat } from 'node:fs/promises';
import { resolveRepositoryFile } from './config.js';

const MAX_ORGANIZATION_REPORT_BYTES = 256 * 1024 * 1024;
const ANALYSIS_ID_RE = /^[0-9a-f]{64}$/;
const FINDING_ID_RE = /^[0-9a-f]{16}$/;
const NAME_RE = /^[A-Za-z0-9_.-]+$/;
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
const VISIBILITIES = new Set(['all', 'public', 'private', 'internal']);

/**
 * Load and validate an organization JSON report from inside the working
 * directory, with a bounded read and real-path escape protection.
 */
export async function loadOrganizationReport({ path, cwd = process.cwd() }) {
  const resolvedPath = await resolveRepositoryFile(path, cwd);
  const metadata = await stat(resolvedPath);
  if (!metadata.isFile()) throw new Error('previous organization report must be a file');
  if (metadata.size > MAX_ORGANIZATION_REPORT_BYTES) {
    throw new Error(
      `previous organization report exceeds ${MAX_ORGANIZATION_REPORT_BYTES} bytes`,
    );
  }
  let report;
  try {
    report = JSON.parse(await readFile(resolvedPath, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('previous organization report is not valid JSON');
    }
    throw error;
  }
  return validateOrganizationReport(report, 'previous');
}

/**
 * Compare two validated organization reports by semantic finding fingerprint.
 * Returned arrays are deterministically ordered and retain complete finding
 * evidence from the report where each classification originated.
 */
export function compareOrganizationReports({ previous, current }) {
  const before = validateOrganizationReport(previous, 'previous');
  const after = validateOrganizationReport(current, 'current');
  if (before.organization.toLocaleLowerCase() !== after.organization.toLocaleLowerCase()) {
    throw new Error('organization reports belong to different organizations');
  }
  if (
    before.analysis.generation !== after.analysis.generation
    || before.analysis.identity !== after.analysis.identity
  ) {
    throw new Error(
      'previous organization report does not match the current analysis scope and policy',
    );
  }

  const previousRepositories = repositoryMap(before.repositories, 'previous');
  const currentRepositories = repositoryMap(after.repositories, 'current');
  const previousFindings = findingMap(before.findings, 'previous');
  const currentFindings = findingMap(after.findings, 'current');
  const newFindings = [];
  const resolvedFindings = [];
  const unchangedFindings = [];
  const unknownFindings = [];

  for (const [key, finding] of currentFindings) {
    if (previousFindings.has(key)) {
      unchangedFindings.push(finding);
      previousFindings.delete(key);
    } else {
      newFindings.push(finding);
    }
  }
  for (const finding of previousFindings.values()) {
    const repository = currentRepositories.get(finding.repository.toLocaleLowerCase());
    if (repository && repositoryCoverageComplete(repository, after.coverage)) resolvedFindings.push(finding);
    else unknownFindings.push(finding);
  }

  const previousNames = [...previousRepositories.keys()];
  const currentNames = [...currentRepositories.keys()];
  const added = currentNames.filter(name => !previousRepositories.has(name)).sort();
  const removed = previousNames.filter(name => !currentRepositories.has(name)).sort();
  const failed = [...currentRepositories]
    .filter(([, repository]) => !repositoryCoverageComplete(repository, after.coverage))
    .map(([name]) => name)
    .sort();
  const comparable = currentNames.filter(name => (
    previousRepositories.has(name)
    && repositoryCoverageComplete(currentRepositories.get(name), after.coverage)
  )).length;

  newFindings.sort(compareFindings);
  resolvedFindings.sort(compareFindings);
  unchangedFindings.sort(compareFindings);
  unknownFindings.sort(compareFindings);
  const complete = after.coverage.complete === true
    && removed.length === 0
    && failed.length === 0
    && after.errors.length === 0;

  return {
    schemaVersion: '1.0',
    analysis: { ...after.analysis },
    repositories: {
      previous: previousRepositories.size,
      current: currentRepositories.size,
      comparable,
      added,
      removed,
      failed,
    },
    findings: {
      new: newFindings,
      resolved: resolvedFindings,
      unchanged: unchangedFindings,
      unknown: unknownFindings,
    },
    summary: {
      newFindings: newFindings.length,
      resolvedFindings: resolvedFindings.length,
      unchangedFindings: unchangedFindings.length,
      unknownFindings: unknownFindings.length,
      repositoriesComparable: comparable,
      repositoriesAdded: added.length,
      repositoriesRemoved: removed.length,
      repositoriesFailed: failed.length,
      complete,
    },
  };
}

function validateOrganizationReport(report, label) {
  if (!isRecord(report) || report.schemaVersion !== '1.0') {
    throw new Error(`${label} organization report schemaVersion must be "1.0"`);
  }
  if (typeof report.organization !== 'string' || !report.organization) {
    throw new Error(`${label} organization report organization is invalid`);
  }
  if (
    !isRecord(report.analysis)
    || !Number.isSafeInteger(report.analysis.generation)
    || report.analysis.generation < 1
    || typeof report.analysis.identity !== 'string'
    || !ANALYSIS_ID_RE.test(report.analysis.identity)
  ) {
    throw new Error(`${label} organization report analysis identity is invalid`);
  }
  if (!Array.isArray(report.repositories)) {
    throw new Error(`${label} organization report repositories must be an array`);
  }
  if (!Array.isArray(report.findings)) {
    throw new Error(`${label} organization report findings must be an array`);
  }
  if (!Array.isArray(report.errors)) {
    throw new Error(`${label} organization report errors must be an array`);
  }
  if (!isRecord(report.summary)) {
    throw new Error(`${label} organization report summary is invalid`);
  }
  if (!['OK', 'FAIL'].includes(report.status)) {
    throw new Error(`${label} organization report status is invalid`);
  }
  validateScope(report.scope, label);
  validateBaselineAndConfig(report, label);
  const repositories = repositoryMap(report.repositories, label);
  const findings = findingMap(report.findings, label);
  for (const finding of findings.values()) {
    if (!repositories.has(finding.repository.toLocaleLowerCase())) {
      throw new Error(
        `${label} organization report finding references an unknown repository`,
      );
    }
  }
  validateReportEvidence({ report, repositories, findings, label });
  validateCoverage(report.coverage, label, repositories);
  if (
    !Number.isSafeInteger(report.summary.findings)
    || report.summary.findings !== findings.size
  ) {
    throw new Error(`${label} organization report finding summary is inconsistent`);
  }
  // Status describes the selected repositories. Coverage separately records
  // whether an intentional repository cap prevented a complete organization scan.
  const expectedReportStatus = report.findings.length === 0 && report.errors.length === 0
    ? 'OK'
    : 'FAIL';
  if (report.status !== expectedReportStatus) {
    throw new Error(`${label} organization report status is inconsistent`);
  }
  return report;
}

function validateScope(scope, label) {
  if (!isRecord(scope)) {
    throw new Error(`${label} organization report scope is invalid`);
  }
  if (!Array.isArray(scope.repositories) || scope.repositories.some(r => typeof r !== 'string')) {
    throw new Error(`${label} organization report scope repositories is invalid`);
  }
  if (!VISIBILITIES.has(scope.visibility)) {
    throw new Error(`${label} organization report scope visibility is invalid`);
  }
  for (const flag of ['includeArchived', 'includeDisabled', 'includeForks']) {
    if (typeof scope[flag] !== 'boolean') {
      throw new Error(`${label} organization report scope ${flag} is invalid`);
    }
  }
  if (
    scope.maxRepositories !== null
    && (!Number.isSafeInteger(scope.maxRepositories) || scope.maxRepositories <= 0)
  ) {
    throw new Error(`${label} organization report scope maxRepositories is invalid`);
  }
  if (scope.severity !== null && !SEVERITIES.has(scope.severity)) {
    throw new Error(`${label} organization report scope severity is invalid`);
  }
  if (scope.explain !== undefined && typeof scope.explain !== 'boolean') {
    throw new Error(`${label} organization report scope explain is invalid`);
  }
  if (
    scope.concurrency !== undefined
    && (!Number.isSafeInteger(scope.concurrency) || scope.concurrency <= 0)
  ) {
    throw new Error(`${label} organization report scope concurrency is invalid`);
  }
}

function validateCoverage(coverage, label, repositories) {
  if (!isRecord(coverage)) {
    throw new Error(`${label} organization report coverage is invalid`);
  }
  for (const flag of [
    'complete',
    'enumerationComplete',
    'selectedRepositoriesComplete',
    'eligibleRepositoriesComplete',
    'limitedByMaxRepositories',
  ]) {
    if (typeof coverage[flag] !== 'boolean') {
      throw new Error(`${label} organization report coverage ${flag} is invalid`);
    }
  }
  if (
    !Number.isSafeInteger(coverage.repositoriesOmittedByLimit)
    || coverage.repositoriesOmittedByLimit < 0
  ) {
    throw new Error(`${label} organization report coverage repositoriesOmittedByLimit is invalid`);
  }
  if (
    !Array.isArray(coverage.incompleteRepositories)
    || coverage.incompleteRepositories.some(r => typeof r !== 'string')
  ) {
    throw new Error(`${label} organization report coverage incompleteRepositories is invalid`);
  }
  const incompleteSet = new Set(coverage.incompleteRepositories.map(r => r.toLowerCase()));
  for (const repoName of incompleteSet) {
    if (!repositories.has(repoName)) {
      throw new Error(`${label} organization report coverage references unknown incomplete repository ${repoName}`);
    }
  }
  for (const [name, repo] of repositories) {
    const hasFailure = repo.errors.length > 0 || repo.findings.some(f => f?.ruleId === 'parse-error');
    if (hasFailure && !incompleteSet.has(name)) {
      throw new Error(`${label} organization report coverage is inconsistent: failed repository ${repo.repository?.fullName} not marked incomplete`);
    }
    if (!hasFailure && incompleteSet.has(name)) {
      throw new Error(`${label} organization report coverage is inconsistent: error-free repository ${repo.repository?.fullName} marked incomplete`);
    }
  }
  if (coverage.selectedRepositoriesComplete !== (incompleteSet.size === 0)) {
    throw new Error(`${label} organization report coverage selectedRepositoriesComplete is inconsistent`);
  }
  if (coverage.complete !== (incompleteSet.size === 0 && !coverage.limitedByMaxRepositories && coverage.enumerationComplete && coverage.selectedRepositoriesComplete && coverage.eligibleRepositoriesComplete)) {
    throw new Error(`${label} organization report coverage complete is inconsistent`);
  }
}

function validateBaselineAndConfig(report, label) {
  if (!isRecord(report.baseline)) {
    throw new Error(`${label} organization report baseline is invalid`);
  }
  if (report.baseline.path !== null && typeof report.baseline.path !== 'string') {
    throw new Error(`${label} organization report baseline path is invalid`);
  }
  if (!Number.isSafeInteger(report.baseline.suppressed) || report.baseline.suppressed < 0) {
    throw new Error(`${label} organization report baseline suppressed is invalid`);
  }
  if (report.configPath !== null && typeof report.configPath !== 'string') {
    throw new Error(`${label} organization report configPath is invalid`);
  }
}

function repositoryMap(repositories, label) {
  const mapped = new Map();
  for (const result of repositories) {
    if (!isRecord(result)) {
      throw new Error(`${label} organization report contains an invalid repository result`);
    }
    const repoInfo = result.repository;
    if (!isRecord(repoInfo) || typeof repoInfo.fullName !== 'string') {
      throw new Error(`${label} organization report contains an invalid repository result`);
    }
    const name = repoInfo.fullName;
    const parts = name.split('/');
    if (
      parts.length !== 2
      || parts.some(part => !NAME_RE.test(part) || part === '.' || part === '..')
      || !Array.isArray(result.errors)
      || !Array.isArray(result.findings)
      || !Array.isArray(result.files)
      || !isRecord(result.summary)
      || !['OK', 'FAIL'].includes(result.status)
    ) {
      throw new Error(`${label} organization report contains an invalid repository result`);
    }
    if (
      !Number.isSafeInteger(result.summary.findings)
      || result.summary.findings !== result.findings.length
    ) {
      throw new Error(`${label} organization report repository summary is inconsistent for ${name}`);
    }
    const expectedStatus = (result.findings.length === 0 && result.errors.length === 0) ? 'OK' : 'FAIL';
    if (result.status !== expectedStatus) {
      throw new Error(`${label} organization report repository status is inconsistent for ${name}`);
    }
    const key = name.toLocaleLowerCase();
    if (mapped.has(key)) {
      throw new Error(`${label} organization report contains duplicate repository ${name}`);
    }
    mapped.set(key, result);
  }
  return mapped;
}

/**
 * Validate that the flattened evidence is an exact, order-independent copy of
 * the evidence owned by each repository result. Counts alone are insufficient:
 * a report could otherwise replace one finding or error with unrelated data.
 */
function validateReportEvidence({ report, repositories, findings, label }) {
  const nestedFindings = new Map();
  const nestedErrors = [];

  for (const [repositoryKey, result] of repositories) {
    const repositoryName = result.repository.fullName;
    const repositoryFindings = findingMap(
      result.findings,
      label,
      ` repository ${repositoryName}`,
    );
    for (const [key, finding] of repositoryFindings) {
      if (finding.repository.toLocaleLowerCase() !== repositoryKey) {
        throw new Error(
          `${label} organization report repository ${repositoryName} contains a finding for another repository`,
        );
      }
      if (nestedFindings.has(key)) {
        throw new Error(`${label} organization report contains duplicate finding identity`);
      }
      nestedFindings.set(key, finding);
    }
    for (const error of result.errors) {
      nestedErrors.push(validateReportError(error, {
        label,
        expectedRepository: repositoryName,
      }));
    }
  }

  if (!sameRecordMap(findings, nestedFindings)) {
    throw new Error(`${label} organization report findings are inconsistent with repository results`);
  }

  const flattenedErrors = report.errors.map(error => {
    const validated = validateReportError(error, { label });
    if (!repositories.has(validated.repository.toLocaleLowerCase())) {
      throw new Error(
        `${label} organization report error references an unknown repository`,
      );
    }
    return validated;
  });
  if (!sameRecordMultiset(flattenedErrors, nestedErrors)) {
    throw new Error(`${label} organization report errors are inconsistent with repository results`);
  }
}

function validateReportError(error, { label, expectedRepository } = {}) {
  if (
    !isRecord(error)
    || !isJsonValue(error)
    || typeof error.repository !== 'string'
    || !error.repository
    || typeof error.error !== 'string'
    || (error.path !== undefined && typeof error.path !== 'string')
  ) {
    throw new Error(`${label} organization report contains an invalid error`);
  }
  if (
    expectedRepository !== undefined
    && error.repository.toLocaleLowerCase() !== expectedRepository.toLocaleLowerCase()
  ) {
    throw new Error(
      `${label} organization report repository ${expectedRepository} contains an error for another repository`,
    );
  }
  return error;
}

function sameRecordMap(left, right) {
  if (left.size !== right.size) return false;
  for (const [key, value] of left) {
    if (!right.has(key) || stableJson(value) !== stableJson(right.get(key))) return false;
  }
  return true;
}

function sameRecordMultiset(left, right) {
  if (left.length !== right.length) return false;
  const counts = new Map();
  for (const value of left) {
    const key = stableJson(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const value of right) {
    const key = stableJson(value);
    const count = counts.get(key) ?? 0;
    if (count === 0) return false;
    if (count === 1) counts.delete(key);
    else counts.set(key, count - 1);
  }
  return counts.size === 0;
}

function stableJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(',')}}`;
}

function repositoryCoverageComplete(repository, coverage) {
  const incompleteSet = new Set(
    (coverage?.incompleteRepositories ?? []).map(name => name.toLowerCase()),
  );
  return repository.errors.length === 0
    && !repository.findings.some(finding => finding?.ruleId === 'parse-error')
    && !incompleteSet.has(repository.repository.fullName.toLowerCase());
}

function findingMap(findings, label, context = '') {
  const mapped = new Map();
  for (const finding of findings) {
    if (
      !isRecord(finding)
      || !isJsonValue(finding)
      || typeof finding.repository !== 'string'
      || typeof finding.id !== 'string'
      || !FINDING_ID_RE.test(finding.id)
      || (finding.fingerprint !== undefined
        && (typeof finding.fingerprint !== 'string'
          || !FINDING_ID_RE.test(finding.fingerprint)))
      || typeof finding.ruleId !== 'string'
      || !finding.ruleId
      || !SEVERITIES.has(finding.severity)
      || typeof finding.file !== 'string'
      || !Number.isSafeInteger(finding.line)
      || (finding.fields !== undefined
        && (!isRecord(finding.fields) || !isJsonValue(finding.fields)))
    ) {
      throw new Error(`${label} organization report${context} contains an invalid finding`);
    }
    const identity = finding.fingerprint ?? finding.id;
    const key = `${finding.repository.toLocaleLowerCase()}\0${identity}`;
    if (mapped.has(key)) {
      throw new Error(
        `${label} organization report${context} contains duplicate finding identity`,
      );
    }
    mapped.set(key, finding);
  }
  return mapped;
}

function compareFindings(left, right) {
  return left.repository.localeCompare(right.repository)
    || left.file.localeCompare(right.file)
    || left.line - right.line
    || left.ruleId.localeCompare(right.ruleId)
    || left.id.localeCompare(right.id);
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isJsonValue(value, seen = new Set()) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!value || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  const valid = Array.isArray(value)
    ? value.every(item => isJsonValue(item, seen))
    : Object.entries(value).every(([key, item]) => (
      typeof key === 'string' && isJsonValue(item, seen)
    ));
  seen.delete(value);
  return valid;
}
