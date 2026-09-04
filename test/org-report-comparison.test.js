import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  compareOrganizationReports,
  loadOrganizationReport,
} from '../src/lib/org-report-comparison.js';
import { renderOrganizationScan } from '../src/commands/org-scan.js';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0)
    .map(directory => rm(directory, { recursive: true, force: true })));
});

describe('organization report comparison', () => {
  it('classifies changes without claiming resolution for incomplete coverage', () => {
    const previous = report({
      repositories: [repository('octo-org/app'), repository('octo-org/removed')],
      findings: [
        finding('octo-org/app', 'a', { line: 4 }),
        finding('octo-org/app', 'b', { line: 8 }),
        finding('octo-org/removed', 'c', { line: 3 }),
      ],
    });
    const current = report({
      repositories: [
        repository('octo-org/app'),
        repository('octo-org/new'),
        repository('octo-org/broken', ['tree unavailable']),
      ],
      findings: [
        finding('octo-org/new', 'e', { line: 2 }),
        finding('octo-org/app', 'd', { line: 12 }),
        finding('octo-org/app', 'a', { line: 6 }),
      ],
      errors: [{ repository: 'octo-org/broken', error: 'tree unavailable' }],
    });

    const comparison = compareOrganizationReports({ previous, current });

    expect(comparison.summary).toEqual({
      newFindings: 2,
      resolvedFindings: 1,
      unchangedFindings: 1,
      unknownFindings: 1,
      repositoriesComparable: 1,
      repositoriesAdded: 2,
      repositoriesRemoved: 1,
      repositoriesFailed: 1,
      complete: false,
    });
    expect(comparison.repositories).toEqual({
      previous: 2,
      current: 3,
      comparable: 1,
      added: ['octo-org/broken', 'octo-org/new'],
      removed: ['octo-org/removed'],
      failed: ['octo-org/broken'],
    });
    expect(comparison.findings.new.map(item => item.fingerprint))
      .toEqual(['dddddddddddddddd', 'eeeeeeeeeeeeeeee']);
    expect(comparison.findings.resolved[0].fingerprint).toBe('bbbbbbbbbbbbbbbb');
    expect(comparison.findings.unchanged[0]).toMatchObject({
      fingerprint: 'aaaaaaaaaaaaaaaa',
      line: 6,
    });
    expect(comparison.findings.unknown[0].fingerprint).toBe('cccccccccccccccc');
  });

  it('fails closed for mismatched analysis identities and duplicate findings', () => {
    const previous = report({
      repositories: [repository('octo-org/app')],
      findings: [finding('octo-org/app', 'a')],
    });
    const changedScope = {
      ...report({ repositories: [repository('octo-org/app')] }),
      analysis: { generation: 1, identity: 'f'.repeat(64) },
    };
    expect(() => compareOrganizationReports({ previous, current: changedScope }))
      .toThrow(/does not match the current analysis scope and policy/);

    const duplicate = report({
      repositories: [repository('octo-org/app')],
      findings: [finding('octo-org/app', 'a'), finding('octo-org/app', 'a')],
    });
    expect(() => compareOrganizationReports({ previous: duplicate, current: duplicate }))
      .toThrow(/duplicate finding identity/);
  });

  it('does not resolve findings when the current repository has a parse error', () => {
    const previousFinding = finding('octo-org/app', 'a');
    const previous = report({
      repositories: [repository('octo-org/app')],
      findings: [previousFinding],
    });
    const currentRepository = repository('octo-org/app');
    currentRepository.findings.push(
      finding('octo-org/app', 'f', { ruleId: 'parse-error', severity: 'critical' }),
    );
    const current = report({ repositories: [currentRepository] });

    const comparison = compareOrganizationReports({ previous, current });

    expect(comparison.findings.resolved).toEqual([]);
    expect(comparison.findings.unknown).toEqual([previousFinding]);
    expect(comparison.repositories.failed).toEqual(['octo-org/app']);
    expect(comparison.summary.complete).toBe(false);
  });

  it('loads only valid, bounded JSON reports inside the working directory', async () => {
    const cwd = await temporaryDirectory();
    const valid = report({ repositories: [repository('octo-org/app')] });
    await writeFile(join(cwd, 'previous.json'), `${JSON.stringify(valid)}\n`);
    await writeFile(join(cwd, 'invalid.json'), '{not-json');

    await expect(loadOrganizationReport({ path: 'previous.json', cwd }))
      .resolves.toEqual(valid);
    await expect(loadOrganizationReport({ path: 'invalid.json', cwd }))
      .rejects.toThrow(/not valid JSON/);
    await expect(loadOrganizationReport({ path: '../outside.json', cwd }))
      .rejects.toThrow(/path traversal rejected/);
  });

  it('rejects reports containing invalid finding fields', () => {
    const invalidFields = report({
      repositories: [repository('octo-org/app')],
      findings: [finding('octo-org/app', 'a', { fields: 'not-an-object' })],
    });
    expect(() => compareOrganizationReports({ previous: invalidFields, current: invalidFields }))
      .toThrow(/contains an invalid finding/);

    const invalidJsonFields = report({
      repositories: [repository('octo-org/app')],
      findings: [finding('octo-org/app', 'a', { fields: { fn: () => {} } })],
    });
    expect(() => compareOrganizationReports({ previous: invalidJsonFields, current: invalidJsonFields }))
      .toThrow(/contains an invalid finding/);
  });

  it('preserves canonical property precedence over finding fields in rendered comparison', () => {
    const craftedFinding = finding('octo-org/app', 'a', {
      fields: {
        id: 'spoofed_id',
        change: 'spoofed_change',
        type: 'spoofed_type',
        sev: 'low',
        repo: 'spoofed_repo',
        extra: 'legit_extra',
      },
    });
    const previous = report({
      repositories: [repository('octo-org/app')],
      findings: [craftedFinding],
    });
    const current = report({
      repositories: [repository('octo-org/app')],
      findings: [],
    });
    const comparison = compareOrganizationReports({ previous, current });
    const rendered = renderOrganizationScan({
      ...current,
      comparison,
    }, { format: 'toon' });
    expect(rendered).toContain('RESOLVED_FINDING');
    expect(rendered).toContain('aaaaaaaaaaaaaaaa');
    expect(rendered).not.toContain('spoofed_id');
  });

  it('rejects inconsistent coverage and repository counts', () => {
    const valid = report({ repositories: [repository('octo-org/app')] });

    const inconsistentFindings = {
      ...valid,
      findings: [finding('octo-org/app', 'a')],
    };
    expect(() => compareOrganizationReports({ previous: inconsistentFindings, current: valid }))
      .toThrow(/findings are inconsistent with repository results/);

    const inconsistentErrors = {
      ...valid,
      errors: [{ repository: 'octo-org/app', error: 'boom' }],
    };
    expect(() => compareOrganizationReports({ previous: inconsistentErrors, current: valid }))
      .toThrow(/errors are inconsistent with repository results/);

    const mismatchedFinding = report({
      repositories: [repository('octo-org/app')],
      findings: [finding('octo-org/app', 'a')],
    });
    mismatchedFinding.repositories[0].findings[0] = finding('octo-org/app', 'b');
    expect(() => compareOrganizationReports({ previous: mismatchedFinding, current: valid }))
      .toThrow(/findings are inconsistent with repository results/);

    const mismatchedError = report({
      repositories: [repository('octo-org/app', ['nested failure'])],
    });
    mismatchedError.errors[0] = {
      repository: 'octo-org/app',
      error: 'different flattened failure',
    };
    expect(() => compareOrganizationReports({ previous: mismatchedError, current: valid }))
      .toThrow(/errors are inconsistent with repository results/);

    const repoWithFailure = repository('octo-org/app', ['failure']);
    const failedRepoMarkedComplete = {
      ...report({ repositories: [repoWithFailure] }),
      coverage: {
        complete: true,
        enumerationComplete: true,
        selectedRepositoriesComplete: true,
        eligibleRepositoriesComplete: true,
        limitedByMaxRepositories: false,
        repositoriesOmittedByLimit: 0,
        incompleteRepositories: [],
      },
    };
    expect(() => compareOrganizationReports({ previous: valid, current: failedRepoMarkedComplete }))
      .toThrow(/failed repository octo-org\/app not marked incomplete/);

    const cleanRepoMarkedIncomplete = {
      ...valid,
      coverage: {
        complete: false,
        enumerationComplete: true,
        selectedRepositoriesComplete: false,
        eligibleRepositoriesComplete: false,
        limitedByMaxRepositories: false,
        repositoriesOmittedByLimit: 0,
        incompleteRepositories: ['octo-org/app'],
      },
    };
    expect(() => compareOrganizationReports({ previous: cleanRepoMarkedIncomplete, current: valid }))
      .toThrow(/error-free repository octo-org\/app marked incomplete/);

    const invalidScope = {
      ...valid,
      scope: { ...valid.scope, visibility: 'invalid' },
    };
    expect(() => compareOrganizationReports({ previous: invalidScope, current: valid }))
      .toThrow(/scope visibility is invalid/);

    const invalidBaseline = {
      ...valid,
      baseline: { path: 123, suppressed: 0 },
    };
    expect(() => compareOrganizationReports({ previous: invalidBaseline, current: valid }))
      .toThrow(/baseline path is invalid/);
  });
});

function report({
  repositories = [],
  findings = null,
  errors = null,
  coverage = null,
  analysis = { generation: 1, identity: '0'.repeat(64) },
  scope = null,
  baseline = { path: null, suppressed: 0 },
  configPath = null,
  status = null,
} = {}) {
  const clonedRepositories = repositories.map(repo => ({
    ...repo,
    repository: { ...repo.repository },
    revision: { ...repo.revision },
    files: [...repo.files],
    findings: [...repo.findings],
    errors: [...repo.errors],
    summary: { ...repo.summary },
  }));

  let finalFindings;
  if (findings !== null) {
    finalFindings = [...findings];
    for (const repo of clonedRepositories) {
      if (repo.findings.length === 0) {
        repo.findings = finalFindings.filter(
          f => f.repository.toLowerCase() === repo.repository.fullName.toLowerCase(),
        );
      }
    }
  } else {
    finalFindings = clonedRepositories.flatMap(r => r.findings);
  }

  let finalErrors;
  if (errors !== null) {
    finalErrors = [...errors];
    for (const repo of clonedRepositories) {
      if (repo.errors.length === 0) {
        repo.errors = finalErrors.filter(
          e => (e.repository ?? '').toLowerCase() === repo.repository.fullName.toLowerCase(),
        );
      }
    }
  } else {
    finalErrors = clonedRepositories.flatMap(r => r.errors);
  }

  for (const repo of clonedRepositories) {
    repo.summary.findings = repo.findings.length;
    repo.status = (repo.findings.length === 0 && repo.errors.length === 0) ? 'OK' : 'FAIL';
  }

  const incompleteRepositories = clonedRepositories
    .filter(r => r.errors.length > 0 || r.findings.some(f => f?.ruleId === 'parse-error'))
    .map(r => r.repository.fullName)
    .sort((a, b) => a.localeCompare(b));

  const selectedRepositoriesComplete = incompleteRepositories.length === 0;

  const finalCoverage = coverage ?? {
    complete: selectedRepositoriesComplete,
    enumerationComplete: true,
    selectedRepositoriesComplete,
    eligibleRepositoriesComplete: selectedRepositoriesComplete,
    limitedByMaxRepositories: false,
    repositoriesOmittedByLimit: 0,
    incompleteRepositories,
  };

  const finalStatus = status ?? (
    finalFindings.length === 0 && finalErrors.length === 0 ? 'OK' : 'FAIL'
  );

  return {
    schemaVersion: '1.0',
    organization: 'octo-org',
    analysis,
    scope: scope ?? {
      repositories: [],
      visibility: 'all',
      includeArchived: false,
      includeDisabled: false,
      includeForks: false,
      maxRepositories: null,
      severity: null,
      explain: false,
    },
    coverage: finalCoverage,
    repositories: clonedRepositories,
    findings: finalFindings,
    errors: finalErrors,
    summary: { findings: finalFindings.length },
    baseline,
    configPath,
    status: finalStatus,
  };
}

function repository(fullName, errors = []) {
  const [owner, name] = fullName.split('/');
  return {
    repository: { owner, name, fullName },
    revision: { branch: 'main', treeSha: '1'.repeat(40) },
    files: [],
    findings: [],
    errors: errors.map(error => ({ repository: fullName, error })),
    summary: { findings: 0 },
    status: errors.length > 0 ? 'FAIL' : 'OK',
  };
}

function finding(repositoryName, identity, overrides = {}) {
  const value = identity.repeat(16);
  return {
    id: value,
    fingerprint: value,
    ruleId: 'unpinned-action',
    severity: 'high',
    file: `${repositoryName}/.github/workflows/ci.yml`,
    line: 1,
    fields: { action: 'actions/checkout@v5' },
    repository: repositoryName,
    branch: 'main',
    url: `https://github.com/${repositoryName}/blob/main/.github/workflows/ci.yml#L1`,
    ...overrides,
  };
}

async function temporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'aw-report-comparison-'));
  temporaryDirectories.push(directory);
  return directory;
}
