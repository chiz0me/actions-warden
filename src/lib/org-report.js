/**
 * Canonical organization report document.
 *
 * The public JSON document is assembled once here. Every serialization,
 * comparison, and report-directory artifact is derived from it so the formats
 * cannot drift apart.
 */

import { canonicalPath } from './identity.js';
import { redactDeep } from './redact.js';
import { listRules } from '../rules/index.js';

/**
 * Build the plain, credential-redacted public document for an organization
 * scan result. Paths are repository-relative to `cwd` and the value is safe to
 * serialize with `JSON.stringify`.
 *
 * @param {object} result Value returned by `scanOrganization`.
 * @param {{cwd?: string, comparison?: object}} [options]
 * @returns {object}
 */
export function buildOrganizationReport(result, {
  cwd = process.cwd(),
  comparison = result.comparison,
} = {}) {
  const report = {
    schemaVersion: '1.0',
    organization: result.organization,
    analysis: result.analysis,
    scope: result.scope,
    coverage: result.coverage,
    repositories: result.repositories.map(repositoryResult => ({
      repository: repositoryResult.repository,
      revision: repositoryResult.revision,
      files: repositoryResult.files,
      findings: repositoryResult.findings.map(finding => normalizeFinding(finding, cwd)),
      errors: repositoryResult.errors,
      summary: repositoryResult.summary,
      status: repositoryResult.status,
    })),
    findings: result.findings.map(finding => normalizeFinding(finding, cwd)),
    errors: result.errors,
    summary: result.summary,
    baseline: {
      ...result.baseline,
      path: result.baseline.path ? canonicalPath(result.baseline.path, cwd) : null,
    },
    configPath: result.configPath ? canonicalPath(result.configPath, cwd) : null,
    ...(comparison ? { comparison } : {}),
    status: result.status,
  };
  return JSON.parse(JSON.stringify(redactDeep(report)));
}

/**
 * Project a report document into the labeled records shared by the TOON, text,
 * CSV, SARIF, and HTML renderers, together with the HTML title and metadata.
 *
 * @param {ReturnType<typeof buildOrganizationReport>} report
 * @param {{format: 'toon'|'text'|'csv'|'sarif'|'html'}} options
 * @returns {{records: Array<{label: string, fields: Record<string, unknown>}>,
 *   title: string, metadata: Record<string, unknown>}}
 */
export function organizationReportRecords(report, { format }) {
  const records = [];
  if (format === 'sarif') {
    for (const rule of listRules()) records.push({ label: 'RULE', fields: rule });
  }
  for (const repositoryResult of report.repositories) {
    appendRepositoryRecords(records, repositoryResult, format);
  }
  records.push({
    label: 'COVERAGE',
    fields: {
      complete: report.coverage.complete,
      enumerationComplete: report.coverage.enumerationComplete,
      selectedRepositoriesComplete: report.coverage.selectedRepositoriesComplete,
      eligibleRepositoriesComplete: report.coverage.eligibleRepositoriesComplete,
      limitedByMaxRepositories: report.coverage.limitedByMaxRepositories,
      repositoriesOmittedByLimit: report.coverage.repositoriesOmittedByLimit,
      incompleteRepositories: report.coverage.incompleteRepositories.length,
    },
  });
  if (report.comparison) appendComparisonRecords(records, report.comparison);
  records.push({
    label: 'SUMMARY',
    fields: { organization: report.organization, ...report.summary },
  });
  return {
    records,
    title: `Organization scan: ${report.organization}`,
    metadata: reportMetadata(report),
  };
}

function appendRepositoryRecords(records, repositoryResult, format) {
  records.push({
    label: 'REPOSITORY',
    fields: {
      repo: repositoryResult.repository.fullName,
      visibility: repositoryResult.repository.visibility,
      branch: repositoryResult.revision.branch,
      files: repositoryResult.files.length,
      findings: repositoryResult.findings.length,
      errors: repositoryResult.errors.length,
      status: repositoryResult.status,
    },
  });
  for (const finding of repositoryResult.findings) {
    records.push({
      label: 'FINDING',
      fields: {
        id: finding.id,
        ...finding.fields,
        repo: finding.repository,
        file: finding.file,
        line: finding.line,
        url: finding.url,
        ...(finding.explain ? { explain: finding.explain } : {}),
        ...(format === 'sarif' && finding.fingerprint
          ? { fingerprint: finding.fingerprint }
          : {}),
      },
    });
  }
  for (const error of repositoryResult.errors) {
    records.push({
      label: 'ERROR',
      fields: {
        repo: error.repository,
        file: error.path ? `${error.repository}/${error.path}` : undefined,
        msg: error.error,
      },
    });
  }
}

function appendComparisonRecords(records, comparison) {
  records.push({ label: 'COMPARISON', fields: comparison.summary });
  for (const [change, findings] of Object.entries(comparison.findings)) {
    for (const finding of findings) {
      records.push({
        label: `${change.toUpperCase()}_FINDING`,
        fields: {
          ...finding.fields,
          id: finding.id,
          change,
          type: finding.ruleId,
          sev: finding.severity,
          repo: finding.repository,
          file: finding.file,
          line: finding.line,
          url: finding.url,
          explain: finding.explain,
        },
      });
    }
  }
}

function reportMetadata(report) {
  return {
    organization: report.organization,
    analysisGeneration: report.analysis.generation,
    visibility: report.scope.visibility,
    repositoryFilters: report.scope.repositories.length > 0
      ? report.scope.repositories.join(', ')
      : 'all eligible repositories',
    includeArchived: report.scope.includeArchived,
    includeDisabled: report.scope.includeDisabled,
    includeForks: report.scope.includeForks,
    maxRepositories: report.scope.maxRepositories ?? 'none',
    severity: report.scope.severity ?? 'all levels',
    baseline: report.baseline.path ?? 'none',
    coverageComplete: report.coverage.complete,
  };
}

function normalizeFinding(finding, cwd) {
  return {
    ...finding,
    file: canonicalPath(finding.file, cwd),
  };
}
