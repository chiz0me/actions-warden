import { describe, expect, it } from 'vitest';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateOrganizationReportDirectory,
  writeOrganizationReportDirectory,
} from '../src/lib/org-report-directory.js';

describe('organization report directory', () => {
  it('writes deterministic, private artifacts and preserves unrelated files', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aw-org-report-directory-'));
    try {
      await mkdir(join(cwd, 'reports'), { recursive: true });

      const first = await writeOrganizationReportDirectory({
        result: organizationResult(),
        path: 'reports/org',
        cwd,
      });
      const firstManifest = await readFile(join(cwd, first.manifestPath), 'utf8');
      await writeFile(join(cwd, 'reports', 'org', 'keep.txt'), 'caller-owned\n');
      const second = await writeOrganizationReportDirectory({
        result: organizationResult(),
        path: 'reports/org',
        cwd,
      });

      expect(second).toEqual(first);
      expect(await readFile(join(cwd, second.manifestPath), 'utf8')).toBe(firstManifest);
      expect(await readFile(join(cwd, 'reports', 'org', 'keep.txt'), 'utf8'))
        .toBe('caller-owned\n');
      if (process.platform !== 'win32') {
        expect((await stat(join(cwd, 'reports', 'org'))).mode & 0o077).toBe(0);
        expect((await stat(join(cwd, first.reportPath))).mode & 0o077).toBe(0);
      }
      const manifest = JSON.parse(firstManifest);
      expect(manifest.repositories).toHaveLength(1);
      expect(manifest.repositories[0]).toMatchObject({
        repository: 'octo-org/app',
        path: expect.stringMatching(/^repositories\/app\.[0-9a-f]{16}\.json$/),
        sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('rejects escape paths and symbolic-link layout components', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aw-org-report-directory-safety-'));
    const cwd = join(root, 'repo');
    await mkdir(cwd);
    try {
      await expect(validateOrganizationReportDirectory({ path: '.', cwd }))
        .rejects.toThrow(/dedicated subdirectory/);
      await expect(validateOrganizationReportDirectory({ path: '../outside', cwd }))
        .rejects.toThrow(/outside working directory/);

      await mkdir(join(cwd, 'real'));
      await symlink(join(cwd, 'real'), join(cwd, 'linked'));
      await expect(validateOrganizationReportDirectory({ path: 'linked', cwd }))
        .rejects.toThrow(/not a regular directory/);

      await mkdir(join(cwd, 'reports', 'repositories'), { recursive: true });
      await symlink(join(cwd, 'real'), join(cwd, 'reports', 'repositories', 'unsafe.json'));
      await expect(validateOrganizationReportDirectory({ path: 'reports', cwd }))
        .rejects.toThrow(/unsafe entry/);
      expect((await lstat(join(cwd, 'reports', 'repositories', 'unsafe.json')))
        .isSymbolicLink()).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('stores complete comparison evidence behind a manifested pointer', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aw-org-report-comparison-directory-'));
    try {
      const result = organizationResult();
      result.comparison = {
        schemaVersion: '1.0',
        analysis: result.analysis,
        repositories: {
          previous: 1,
          current: 1,
          comparable: 1,
          added: [],
          removed: [],
          failed: [],
        },
        findings: { new: [], resolved: [], unchanged: [], unknown: [] },
        summary: {
          newFindings: 0,
          resolvedFindings: 0,
          unchangedFindings: 0,
          unknownFindings: 0,
          repositoriesComparable: 1,
          repositoriesAdded: 0,
          repositoriesRemoved: 0,
          repositoriesFailed: 0,
          complete: true,
        },
      };

      const written = await writeOrganizationReportDirectory({
        result,
        path: 'reports/org',
        cwd,
      });
      const manifest = JSON.parse(await readFile(join(cwd, written.manifestPath), 'utf8'));
      const aggregate = JSON.parse(await readFile(join(cwd, written.reportPath), 'utf8'));
      expect(manifest.comparison).toMatchObject({
        path: 'organization-comparison.json',
        sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      });
      expect(aggregate.comparison).toEqual({
        summary: result.comparison.summary,
        artifact: manifest.comparison,
      });
      expect(JSON.parse(
        await readFile(join(cwd, 'reports/org', manifest.comparison.path), 'utf8'),
      )).toEqual(result.comparison);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

function organizationResult() {
  const repository = {
    name: 'app',
    fullName: 'octo-org/app',
    owner: 'octo-org',
    defaultBranch: 'main',
    visibility: 'public',
    private: false,
    fork: false,
    archived: false,
    disabled: false,
    url: 'https://github.com/octo-org/app',
  };
  const summary = {
    repositoriesDiscovered: 1,
    repositoriesEligible: 1,
    repositoriesSelected: 1,
    repositoriesScanned: 1,
    repositoriesWithWorkflows: 0,
    repositoriesWithFindings: 0,
    repositoriesFailed: 0,
    repositoriesSkipped: 0,
    files: 0,
    findings: 0,
    totalFindings: 0,
    suppressed: 0,
    errors: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  return {
    organization: 'octo-org',
    analysis: { generation: 1, identity: 'a'.repeat(64) },
    scope: {
      repositories: [],
      visibility: 'all',
      includeArchived: false,
      includeDisabled: false,
      includeForks: false,
      maxRepositories: null,
      concurrency: 4,
      severity: null,
    },
    coverage: {
      complete: true,
      enumerationComplete: true,
      selectedRepositoriesComplete: true,
      eligibleRepositoriesComplete: true,
      limitedByMaxRepositories: false,
      repositoriesOmittedByLimit: 0,
      incompleteRepositories: [],
    },
    repositories: [{
      repository,
      revision: { branch: 'main', treeSha: 'b'.repeat(40) },
      files: [],
      findings: [],
      errors: [],
      summary: {
        files: 0,
        findings: 0,
        totalFindings: 0,
        suppressed: 0,
        errors: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      status: 'OK',
    }],
    findings: [],
    errors: [],
    summary,
    baseline: { path: null, suppressed: 0 },
    configPath: null,
    status: 'OK',
  };
}
