import { describe, expect, it } from 'vitest';
import {
  ACTION_NUMERIC_OUTPUTS,
  MAX_ACTION_SUMMARY_LENGTH,
  collectActionMetrics,
  emptyActionMetrics,
  renderActionFailureSummary,
  renderActionSummary,
} from '../src/lib/action-summary.js';

describe('GitHub Action reporting', () => {
  it('derives finding, suppression, severity, and parse-error metrics', () => {
    const result = {
      status: 'FAIL',
      findings: [
        finding({ id: 'critical-id', severity: 'critical' }),
        finding({ id: 'parse-id', ruleId: 'parse-error', severity: 'high', line: 0 }),
      ],
      summary: {
        files: 1,
        findings: 2,
        totalFindings: 4,
        suppressed: 2,
        critical: 1,
        high: 1,
        medium: 0,
        low: 0,
      },
    };

    expect(collectActionMetrics({ command: 'audit', result })).toEqual({
      ...emptyActionMetrics(),
      findings: 2,
      totalFindings: 4,
      suppressed: 2,
      critical: 1,
      high: 1,
      errors: 1,
    });
    expect(ACTION_NUMERIC_OUTPUTS.map(([name]) => name)).toEqual([
      'findings',
      'total-findings',
      'critical',
      'high',
      'medium',
      'low',
      'suppressed',
      'errors',
      'repositories-discovered',
      'repositories-selected',
      'repositories-scanned',
      'repositories-resumed',
      'repositories-failed',
      'new-findings',
      'resolved-findings',
      'unchanged-findings',
      'unknown-findings',
    ]);
  });

  it('combines report phase errors and exposes organization coverage', () => {
    const reportResult = {
      status: 'FAIL',
      audit: {
        findings: [finding({ id: 'parse-id', ruleId: 'parse-error', severity: 'high' })],
        summary: {
          files: 1,
          findings: 1,
          totalFindings: 1,
          suppressed: 0,
          critical: 0,
          high: 1,
          medium: 0,
          low: 0,
        },
      },
      pin: { changes: [], errors: [{ error: 'pin failed' }] },
      upgrade: { changes: [], skipped: [], errors: [{ error: 'upgrade failed' }] },
    };
    expect(collectActionMetrics({ command: 'report', result: reportResult }).errors).toBe(3);

    const organizationResult = {
      status: 'FAIL',
      findings: [finding({ id: 'parse-id', ruleId: 'parse-error', severity: 'high' })],
      errors: [{ repository: 'example/app', error: 'blob unavailable' }],
      summary: {
        repositoriesDiscovered: 9,
        repositoriesSelected: 7,
        repositoriesScanned: 7,
        repositoriesFailed: 1,
        files: 3,
        findings: 1,
        totalFindings: 1,
        suppressed: 0,
        critical: 0,
        high: 1,
        medium: 0,
        low: 0,
      },
      comparison: {
        summary: {
          newFindings: 3,
          resolvedFindings: 4,
          unchangedFindings: 5,
          unknownFindings: 1,
          repositoriesComparable: 6,
          repositoriesRemoved: 1,
          repositoriesFailed: 1,
          complete: false,
        },
      },
      coverage: {
        complete: false,
        repositoriesOmittedByLimit: 1,
        incompleteRepositories: ['example/app'],
      },
    };
    const organizationMetrics = collectActionMetrics({
      command: 'org-scan',
      result: organizationResult,
      repositoriesReused: 2,
    });
    expect(organizationMetrics)
      .toMatchObject({
        findings: 1,
        errors: 2,
        repositoriesDiscovered: 9,
        repositoriesSelected: 7,
        repositoriesScanned: 7,
        repositoriesResumed: 2,
        repositoriesFailed: 1,
        newFindings: 3,
        resolvedFindings: 4,
        unchangedFindings: 5,
        unknownFindings: 1,
      });
    const organizationSummary = renderActionSummary({
      command: 'org-scan',
      result: organizationResult,
      metrics: organizationMetrics,
      cwd: '/repo',
      checkpointPath: '/repo/.actions-warden-org-scan.checkpoint.json',
      checkpointResumed: true,
      repositoriesReused: 2,
    });
    expect(organizationSummary).toContain('#### Change since previous report');
    expect(organizationSummary).toContain('| New findings | 3 |');
    expect(organizationSummary).toContain('| Comparison complete | no |');
    expect(organizationSummary).toContain('| Checkpoint | .actions-warden-org-scan.checkpoint.json |');
    expect(organizationSummary).toContain('| Checkpoint resumed | yes |');
    expect(organizationSummary).toContain('| Repositories reused | 2 |');
    expect(organizationSummary).toContain('| Eligible coverage complete | no |');
    expect(organizationSummary).toContain('| Omitted by repository limit | 1 |');
  });

  it('renders structured details without allowing Markdown or secret injection', () => {
    const token = `ghp_${'a'.repeat(35)}`;
    const findings = Array.from({ length: 12 }, (_, index) => finding({
      id: `finding-${String(index).padStart(2, '0')}`,
      ruleId: index === 0 ? 'unsafe|rule\n#### forged heading' : 'unpinned-action',
      severity: index === 0 ? 'critical' : 'high',
      file: `/repo/.github/workflows/file-${index}.yml`,
      line: index + 1,
      explain: index === 0 ? `Fix this | now\n#### forged ${token}` : 'Pin the action.',
    }));
    const result = {
      status: 'FAIL',
      findings,
      summary: {
        files: 12,
        findings: 12,
        totalFindings: 14,
        suppressed: 2,
        critical: 1,
        high: 11,
        medium: 0,
        low: 0,
      },
    };

    const summary = renderActionSummary({
      command: 'audit',
      result,
      cwd: '/repo',
      annotations: 10,
      annotationsSkipped: 2,
      reportPath: '/repo/reports/actions-warden.json',
    });

    expect(summary).toContain('### actions-warden (audit)');
    expect(summary).toContain('#### Severity breakdown');
    expect(summary).toContain('#### Findings by rule');
    expect(summary).toContain('#### Top findings');
    expect(summary).toContain('reports/actions-warden.json');
    expect(summary).toContain('Showing 10 of 12 findings');
    expect(summary).toContain('&#124;');
    expect(summary).toContain('&lt;redacted&gt;');
    expect(summary).not.toContain(token);
    expect(summary).not.toContain('\n#### forged heading');
    expect(summary).not.toContain('\n#### forged ');
    expect(summary).not.toContain('FINDING:');
    expect(summary.length).toBeLessThanOrEqual(MAX_ACTION_SUMMARY_LENGTH);
  });

  it('renders dependency plans, cooldown skips, and verification diagnostics', () => {
    const upgradeResult = {
      status: 'OK',
      changes: [{
        id: 'upgrade-id',
        action: 'owner/action',
        fromVersion: 'v1.0.0',
        toTag: 'v1.1.0',
        file: '/repo/.github/workflows/ci.yml',
        line: 9,
      }],
      skipped: [{
        action: 'owner/other',
        tag: 'v2.0.0',
        reason: 'cooldown',
        ageDays: 2,
        ageSource: 'release',
        file: '/repo/.github/workflows/ci.yml',
        line: 10,
      }],
      errors: [],
    };
    const upgradeSummary = renderActionSummary({
      command: 'upgrade',
      result: upgradeResult,
      cwd: '/repo',
    });
    expect(upgradeSummary).toContain('#### Planned changes');
    expect(upgradeSummary).toContain('#### Skipped upgrades');
    expect(upgradeSummary).toContain('v1.0.0');
    expect(upgradeSummary).toContain('2 days (release)');

    const verifyResult = {
      status: 'FAIL',
      files: ['/repo/.github/workflows/ci.yml'],
      checks: [],
      warnings: [{
        id: 'warning-id',
        file: '/repo/.github/workflows/ci.yml',
        line: 4,
        action: 'owner/action@sha',
        warning: 'version metadata is missing',
      }],
      errors: [{
        id: 'error-id',
        file: '/repo/.github/workflows/ci.yml',
        line: 5,
        action: 'owner/other@v1',
        error: 'reference is not pinned',
      }],
    };
    const verifySummary = renderActionSummary({
      command: 'verify',
      result: verifyResult,
      cwd: '/repo',
    });
    expect(collectActionMetrics({ command: 'verify', result: verifyResult }).errors).toBe(1);
    expect(verifySummary).toContain('#### Verification warnings');
    expect(verifySummary).toContain('#### Operational errors');
  });

  it('caps dense multi-phase summaries while retaining a truncation notice', () => {
    const long = '|'.repeat(600);
    const findings = Array.from({ length: 20 }, (_, index) => finding({
      id: `finding-${index}`,
      ruleId: `rule-${index}-${long}`,
      severity: SEVERITIES[index % SEVERITIES.length],
      file: `/repo/.github/workflows/${index}-${long}.yml`,
      line: index + 1,
      explain: long,
    }));
    const changes = Array.from({ length: 20 }, (_, index) => ({
      id: `change-${index}-${long}`,
      file: `/repo/.github/workflows/${index}.yml`,
      line: index + 1,
      action: `owner/action-${index}-${long}`,
      fromRef: long,
      toSha: 'a'.repeat(40),
    }));
    const errors = Array.from({ length: 20 }, (_, index) => ({
      file: `/repo/.github/workflows/${index}.yml`,
      action: long,
      error: long,
    }));
    const result = {
      status: 'FAIL',
      audit: {
        findings,
        summary: {
          files: 20,
          findings: 20,
          totalFindings: 20,
          suppressed: 0,
          critical: 5,
          high: 5,
          medium: 5,
          low: 5,
        },
      },
      pin: { changes, errors },
      upgrade: {
        changes,
        errors,
        skipped: changes.map(change => ({
          ...change,
          tag: long,
          reason: long,
          ageDays: 7,
          ageSource: long,
        })),
      },
    };

    const summary = renderActionSummary({ command: 'report', result, cwd: '/repo' });
    expect(summary.length).toBeLessThanOrEqual(MAX_ACTION_SUMMARY_LENGTH);
    expect(summary).toContain('Summary truncated; use the complete command output or saved report.');
  });

  it('redacts and escapes invocation-level failures', () => {
    const token = `ghp_${'z'.repeat(35)}`;
    const summary = renderActionFailureSummary({
      command: 'audit)\n# forged',
      message: `token=${token}\n| forged | row |`,
      annotations: 1,
    });

    expect(summary).toContain('#### Invocation error');
    expect(summary).toContain('&lt;redacted&gt;');
    expect(summary).toContain('&#124;');
    expect(summary).not.toContain(token);
    expect(summary).not.toContain('\n# forged');
    expect(summary.length).toBeLessThanOrEqual(MAX_ACTION_SUMMARY_LENGTH);
  });
});

const SEVERITIES = ['critical', 'high', 'medium', 'low'];

function finding(overrides = {}) {
  return {
    id: 'finding-id',
    ruleId: 'unpinned-action',
    severity: 'high',
    file: '/repo/.github/workflows/ci.yml',
    line: 8,
    fields: { action: 'actions/checkout@v5' },
    ...overrides,
  };
}
