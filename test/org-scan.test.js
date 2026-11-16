import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  renderOrganizationScan,
  scanOrganization,
} from '../src/commands/org-scan.js';
import {
  ORGANIZATION_ANALYSIS_GENERATION,
  createOrganizationCheckpointArtifactKey,
} from '../src/lib/org-checkpoint.js';
import { compareOrganizationReports } from '../src/lib/org-report-comparison.js';
import { VERSION } from '../src/version.js';
import { MOCK_COMMIT_SHA, withCommitResolution } from './fixtures/org-fetch-helpers.js';

describe('organization scan command', () => {
  let cwd;
  let previousCacheDir;
  const workflowSha = 'a'.repeat(40);
  const treeSha = 'b'.repeat(40);
  const workflow = [
    'name: ci',
    'on: push',
    'permissions:',
    '  contents: read',
    'jobs:',
    '  test:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v5',
    '',
  ].join('\n');

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'aw-org-scan-'));
    previousCacheDir = process.env.ACTIONS_WARDEN_CACHE_DIR;
    process.env.ACTIONS_WARDEN_CACHE_DIR = join(cwd, 'cache');
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    if (previousCacheDir === undefined) delete process.env.ACTIONS_WARDEN_CACHE_DIR;
    else process.env.ACTIONS_WARDEN_CACHE_DIR = previousCacheDir;
    await rm(cwd, { recursive: true, force: true });
  });

  it('filters repositories and builds aggregate JSON and SARIF reports', async () => {
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async (url) => {
      const value = String(url);
      if (value.includes('/orgs/octo-org/repos?')) {
        return response([
          repository('app'),
          repository('empty'),
          repository('archive', { archived: true }),
          repository('fork', { fork: true }),
        ]);
      }
      if (value.includes('/repos/octo-org/app/git/trees/')) {
        return response({
          sha: treeSha,
          truncated: false,
          tree: [{
            path: '.github/workflows/ci.yml',
            type: 'blob',
            sha: workflowSha,
            size: Buffer.byteLength(workflow),
          }],
        });
      }
      if (value.includes('/repos/octo-org/empty/git/trees/')) {
        return response({ sha: 'c'.repeat(40), truncated: false, tree: [] });
      }
      if (value.endsWith(`/git/blobs/${workflowSha}`)) {
        return response({
          sha: workflowSha,
          encoding: 'base64',
          size: Buffer.byteLength(workflow),
          content: Buffer.from(workflow).toString('base64'),
        });
      }
      return response({}, 404);
    })));

    const result = await scanOrganization({
      organization: 'octo-org',
      cwd,
      token: 'secret-token',
      severity: 'high',
      explain: true,
      concurrency: 2,
    });
    expect(result.status).toBe('FAIL');
    expect(result.repositories.map(item => item.repository.name)).toEqual(['app', 'empty']);
    expect(result.summary).toMatchObject({
      repositoriesDiscovered: 4,
      repositoriesEligible: 2,
      repositoriesSelected: 2,
      repositoriesScanned: 2,
      repositoriesWithWorkflows: 1,
      repositoriesWithFindings: 1,
      repositoriesFailed: 0,
      repositoriesSkipped: 2,
      files: 1,
      findings: 1,
      high: 1,
      errors: 0,
    });
    expect(result.coverage).toEqual({
      complete: true,
      enumerationComplete: true,
      selectedRepositoriesComplete: true,
      eligibleRepositoriesComplete: true,
      limitedByMaxRepositories: false,
      repositoriesOmittedByLimit: 0,
      incompleteRepositories: [],
    });
    expect(result.findings[0]).toMatchObject({
      repository: 'octo-org/app',
      ruleId: 'unpinned-action',
      line: 9,
    });
    expect(result.findings[0].url).toBe(
      'https://github.com/octo-org/app/blob/main/.github/workflows/ci.yml#L9',
    );

    const json = JSON.parse(renderOrganizationScan(result, { format: 'json', cwd }));
    expect(json.analysis).toEqual({
      generation: ORGANIZATION_ANALYSIS_GENERATION,
      identity: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(json.findings[0].file).toBe('octo-org/app/.github/workflows/ci.yml');
    expect(json.findings[0].fields.action).toBe('actions/checkout@v5');
    expect(json.repositories[0].files).toEqual(['.github/workflows/ci.yml']);
    expect(json.coverage).toEqual(result.coverage);
    expect(compareOrganizationReports({ previous: json, current: json }).summary)
      .toMatchObject({ unchangedFindings: 1, complete: true });
    const sarif = JSON.parse(renderOrganizationScan(result, { format: 'sarif', cwd }));
    expect(sarif.runs).toHaveLength(2);
    expect(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri)
      .toBe('.github/workflows/ci.yml');
    expect(sarif.runs[0].versionControlProvenance).toEqual([{
      repositoryUri: 'https://github.com/octo-org/app',
      revisionId: MOCK_COMMIT_SHA,
      branch: 'main',
    }]);
    expect(sarif.runs[1].results).toEqual([]);

    const html = renderOrganizationScan(result, { format: 'html', cwd });
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('Organization scan: octo-org');
    expect(html).toContain('Repository breakdown');
    expect(html).toContain('octo-org/app');
    expect(html).toContain('https://github.com/octo-org/app/blob/main/');

    const csv = renderOrganizationScan(result, { format: 'csv', cwd });
    expect(csv).toMatch(/^record_type,status,organization,repo,/);
    expect(csv).toContain('\r\nREPOSITORY,');
    expect(csv).toContain('\r\nFINDING,');
    expect(csv).toContain('\r\nCOVERAGE,');
    expect(csv).toMatch(/\r\nSTATUS,FAIL(?:,)*\r\n$/);

    result.comparison = {
      summary: {
        newFindings: 1,
        resolvedFindings: 0,
        unchangedFindings: 0,
        unknownFindings: 0,
        complete: true,
      },
      findings: {
        new: json.findings,
        resolved: [],
        unchanged: [],
        unknown: [],
      },
    };
    const compared = JSON.parse(renderOrganizationScan(result, { format: 'json', cwd }));
    expect(compared.comparison.summary.newFindings).toBe(1);
    expect(renderOrganizationScan(result, { format: 'toon', cwd }))
      .toContain('NEW_FINDING:');
    expect(renderOrganizationScan(result, { format: 'csv', cwd }))
      .toContain('\r\nNEW_FINDING,');
  });

  it('reports a repository limit as explicit incomplete eligible coverage', async () => {
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
      const value = String(url);
      if (value.includes('/orgs/octo-org/repos?')) {
        return response([repository('app'), repository('worker')]);
      }
      if (value.includes('/git/trees/')) {
        return response({ sha: treeSha, truncated: false, tree: [] });
      }
      return response({}, 404);
    })));

    const result = await scanOrganization({
      organization: 'octo-org',
      cwd,
      maxRepositories: 1,
    });

    expect(result.status).toBe('OK');
    expect(result.coverage).toMatchObject({
      complete: false,
      selectedRepositoriesComplete: true,
      eligibleRepositoriesComplete: false,
      limitedByMaxRepositories: true,
      repositoriesOmittedByLimit: 1,
      incompleteRepositories: [],
    });
    const cappedReport = JSON.parse(renderOrganizationScan(result, { format: 'json', cwd }));
    const comparison = compareOrganizationReports({
      previous: cappedReport,
      current: cappedReport,
    });
    expect(comparison.summary).toMatchObject({
      complete: false,
      resolvedFindings: 0,
      unknownFindings: 0,
    });
    expect(renderOrganizationScan(result, { format: 'html', cwd }))
      .toContain('Coverage is incomplete');
  });

  it('forwards one resolved token through organization, tree, and blob requests', async () => {
    const token = 'org-scan-test-token';
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async (url, options) => {
      expect(options.headers.authorization).toBe(`Bearer ${token}`);
      const value = String(url);
      if (value.includes('/orgs/octo-org/repos?')) return response([repository('app')]);
      if (value.includes('/git/trees/')) return treeResponse(treeSha, workflowSha, workflow);
      if (value.endsWith(`/git/blobs/${workflowSha}`)) return blobResponse(workflowSha, workflow);
      return response({}, 404);
    })));

    const result = await scanOrganization({ organization: 'octo-org', cwd, token });

    expect(result.repositories).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('continues after an inaccessible repository and reports an operational failure', async () => {
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
      const value = String(url);
      if (value.includes('/orgs/octo-org/repos?')) {
        return response([repository('denied'), repository('empty')]);
      }
      if (value.includes('/repos/octo-org/denied/git/trees/')) return response({}, 403);
      if (value.includes('/repos/octo-org/empty/git/trees/')) {
        return response({ sha: treeSha, truncated: false, tree: [] });
      }
      return response({}, 404);
    })));

    const result = await scanOrganization({ organization: 'octo-org', cwd });
    expect(result.repositories).toHaveLength(2);
    expect(result.summary.repositoriesFailed).toBe(1);
    expect(result.summary.errors).toBe(1);
    expect(result.errors[0]).toMatchObject({ repository: 'octo-org/denied' });
    expect(result.coverage).toMatchObject({
      complete: false,
      selectedRepositoriesComplete: false,
      eligibleRepositoriesComplete: false,
      incompleteRepositories: ['octo-org/denied'],
    });
    expect(result.status).toBe('FAIL');
  });

  it('rejects explicit repository filters that match no eligible repository', async () => {
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
      if (String(url).includes('/orgs/octo-org/repos?')) return response([repository('app')]);
      return response({}, 404);
    })));
    await expect(scanOrganization({
      organization: 'octo-org',
      cwd,
      repositories: ['service-*'],
    })).rejects.toThrow(/no repositories matched/);
  });

  it('applies organization policy before downloading ignored workflow blobs', async () => {
    await writeFile(join(cwd, '.actions-warden.yml'), [
      'version: 1',
      'ignore-paths:',
      '  - octo-org/app/**',
      '',
    ].join('\n'));
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
      const value = String(url);
      if (value.includes('/orgs/octo-org/repos?')) return response([repository('app')]);
      if (value.includes('/git/trees/')) {
        return response({
          sha: treeSha,
          truncated: false,
          tree: [{
            path: '.github/workflows/ci.yml',
            type: 'blob',
            sha: workflowSha,
            size: Buffer.byteLength(workflow),
          }],
        });
      }
      return response({}, 500);
    })));

    const result = await scanOrganization({ organization: 'octo-org', cwd });
    expect(result.status).toBe('OK');
    expect(result.summary.files).toBe(0);
    expect(result.summary.errors).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('resumes unchanged repositories without downloading blobs and emits live progress', async () => {
    const checkpointPath = 'scan-checkpoint.json';
    const token = `ghp_${'T'.repeat(36)}`;
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
      const value = String(url);
      if (value.includes('/orgs/octo-org/repos?')) return response([repository('app')]);
      if (value.includes('/git/trees/')) return treeResponse(treeSha, workflowSha, workflow);
      if (value.endsWith(`/git/blobs/${workflowSha}`)) return blobResponse(workflowSha, workflow);
      return response({}, 404);
    })));

    const initial = await scanOrganization({
      organization: 'octo-org',
      cwd,
      token,
      severity: 'high',
      explain: true,
      checkpointPath,
    });
    const checkpointSource = await readFile(join(cwd, checkpointPath), 'utf8');
    const checkpoint = JSON.parse(checkpointSource);
    expect(checkpoint).toMatchObject({
      schemaVersion: '1.1',
      kind: 'actions-warden-org-scan',
      toolVersion: VERSION,
      identity: {
        analysisGeneration: ORGANIZATION_ANALYSIS_GENERATION,
      },
    });
    expect(checkpoint.identity).not.toHaveProperty('toolVersion');
    expect(checkpoint.repositories).toHaveLength(1);
    expect(checkpointSource).not.toContain(token);
    expect(checkpointSource).not.toContain(workflow);

    const progress = [];
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
      const value = String(url);
      if (value.includes('/orgs/octo-org/repos?')) return response([repository('app')]);
      if (value.includes('/git/trees/')) return treeResponse(treeSha, workflowSha, workflow);
      return response({}, 500);
    })));
    const resumed = await scanOrganization({
      organization: 'octo-org',
      cwd,
      token: 'rotated-token',
      severity: 'high',
      explain: true,
      checkpointPath,
      resume: true,
      onProgress: event => progress.push(event),
    });

    expect(renderOrganizationScan(resumed, { format: 'json', cwd }))
      .toBe(renderOrganizationScan(initial, { format: 'json', cwd }));
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(progress).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'checkpoint-loaded', repositories: 1 }),
      expect.objectContaining({
        type: 'repository-completed',
        repository: 'octo-org/app',
        reused: true,
      }),
      expect.objectContaining({ type: 'scan-completed', reused: 1 }),
    ]));
  });

  it('resumes across compatible package versions and refreshes producer metadata', async () => {
    const checkpointPath = 'scan-checkpoint.json';
    vi.stubGlobal('fetch', organizationFetch({ treeSha, workflowSha, workflow }));
    await scanOrganization({ organization: 'octo-org', cwd, checkpointPath });

    const checkpoint = JSON.parse(await readFile(join(cwd, checkpointPath), 'utf8'));
    checkpoint.toolVersion = '0.3.1';
    await writeFile(join(cwd, checkpointPath), `${JSON.stringify(checkpoint)}\n`);
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
      const value = String(url);
      if (value.includes('/orgs/octo-org/repos?')) return response([repository('app')]);
      if (value.includes('/git/trees/')) return treeResponse(treeSha, workflowSha, workflow);
      return response({}, 500);
    })));

    const result = await scanOrganization({
      organization: 'octo-org',
      cwd,
      checkpointPath,
      resume: true,
    });

    expect(result.status).toBe('FAIL');
    expect(result.findings).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(3);
    const migrated = JSON.parse(await readFile(join(cwd, checkpointPath), 'utf8'));
    expect(migrated).toMatchObject({
      schemaVersion: '1.1',
      toolVersion: VERSION,
      identity: { analysisGeneration: ORGANIZATION_ANALYSIS_GENERATION },
    });
  });

  it.each([1, 2])('rejects generation-%i checkpoints (generation mismatch)', async generation => {
    const checkpointPath = 'scan-checkpoint.json';
    vi.stubGlobal('fetch', organizationFetch({ treeSha, workflowSha, workflow }));
    await scanOrganization({ organization: 'octo-org', cwd, checkpointPath });

    const current = JSON.parse(await readFile(join(cwd, checkpointPath), 'utf8'));
    current.identity.analysisGeneration = generation;
    await writeFile(join(cwd, checkpointPath), `${JSON.stringify(current)}\n`);
    vi.stubGlobal('fetch', vi.fn());

    await expect(scanOrganization({
      organization: 'octo-org',
      cwd,
      checkpointPath,
      resume: true,
    })).rejects.toThrow(/does not match current analysisGeneration/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('produces different automatic artifact keys for generation 2 and 3', () => {
    const baseIdentity = {
      rulesHash: 'a'.repeat(64),
      organization: 'octo-org',
      scope: {
        repositories: [],
        visibility: 'all',
        includeArchived: false,
        includeDisabled: false,
        includeForks: false,
        maxRepositories: null,
        severity: null,
        explain: false,
      },
      configHash: null,
      baselineHash: null,
    };
    const keyGen2 = createOrganizationCheckpointArtifactKey({
      ...baseIdentity,
      analysisGeneration: 2,
    });
    const keyCurrent = createOrganizationCheckpointArtifactKey({
      ...baseIdentity,
      analysisGeneration: ORGANIZATION_ANALYSIS_GENERATION,
    });
    expect(ORGANIZATION_ANALYSIS_GENERATION).toBe(3);
    expect(keyGen2).not.toBe(keyCurrent);
    expect(keyGen2).toMatch(/^[0-9a-f]{32}$/);
    expect(keyCurrent).toMatch(/^[0-9a-f]{32}$/);
  });

  it('rejects a schema 1.0 checkpoint with an actionable error', async () => {
    const checkpointPath = 'scan-checkpoint.json';
    vi.stubGlobal('fetch', organizationFetch({ treeSha, workflowSha, workflow }));
    await scanOrganization({ organization: 'octo-org', cwd, checkpointPath });

    const current = JSON.parse(await readFile(join(cwd, checkpointPath), 'utf8'));
    await writeFile(
      join(cwd, checkpointPath),
      `${JSON.stringify(asSchema10Checkpoint(current))}\n`,
    );
    vi.stubGlobal('fetch', vi.fn());

    await expect(scanOrganization({
      organization: 'octo-org',
      cwd,
      checkpointPath,
      resume: true,
    })).rejects.toThrow(/schemaVersion must be "1\.1".*start a fresh scan/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects checkpoints from an incompatible analysis generation before discovery', async () => {
    const checkpointPath = 'scan-checkpoint.json';
    vi.stubGlobal('fetch', organizationFetch({ treeSha, workflowSha, workflow }));
    await scanOrganization({ organization: 'octo-org', cwd, checkpointPath });

    const checkpoint = JSON.parse(await readFile(join(cwd, checkpointPath), 'utf8'));
    checkpoint.identity.analysisGeneration += 1;
    await writeFile(join(cwd, checkpointPath), `${JSON.stringify(checkpoint)}\n`);
    vi.stubGlobal('fetch', vi.fn());

    await expect(scanOrganization({
      organization: 'octo-org',
      cwd,
      checkpointPath,
      resume: true,
    })).rejects.toThrow(/does not match current analysisGeneration/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rescans a checkpointed repository when its default-branch tree changes', async () => {
    const checkpointPath = 'scan-checkpoint.json';
    vi.stubGlobal('fetch', organizationFetch({ treeSha, workflowSha, workflow }));
    await scanOrganization({ organization: 'octo-org', cwd, checkpointPath });

    const changedTreeSha = 'd'.repeat(40);
    const progress = [];
    vi.stubGlobal('fetch', organizationFetch({
      treeSha: changedTreeSha,
      workflowSha,
      workflow,
    }));
    const result = await scanOrganization({
      organization: 'octo-org',
      cwd,
      checkpointPath,
      resume: true,
      onProgress: event => progress.push(event),
    });

    expect(result.repositories[0].revision.treeSha).toBe(changedTreeSha);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(progress).toContainEqual(expect.objectContaining({
      type: 'repository-completed',
      reused: false,
    }));
  });

  it('keeps completed work after interruption and resumes the remaining repositories', async () => {
    const checkpointPath = 'scan-checkpoint.json';
    const appTreeSha = 'b'.repeat(40);
    const workerTreeSha = 'c'.repeat(40);
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
      const value = String(url);
      if (value.includes('/orgs/octo-org/repos?')) {
        return response([repository('app'), repository('worker')]);
      }
      if (value.includes('/repos/octo-org/app/git/trees/')) {
        return treeResponse(appTreeSha, workflowSha, workflow);
      }
      if (value.endsWith(`/git/blobs/${workflowSha}`)) return blobResponse(workflowSha, workflow);
      return response({}, 500);
    })));

    await expect(scanOrganization({
      organization: 'octo-org',
      cwd,
      concurrency: 1,
      checkpointPath,
      onProgress: event => {
        if (event.type === 'repository-completed') throw new Error('simulated interruption');
      },
    })).rejects.toThrow(/progress callback failed/);
    const interrupted = JSON.parse(await readFile(join(cwd, checkpointPath), 'utf8'));
    expect(interrupted.repositories.map(result => result.repository)).toEqual(['octo-org/app']);

    const progress = [];
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
      const value = String(url);
      if (value.includes('/orgs/octo-org/repos?')) {
        return response([repository('app'), repository('worker')]);
      }
      if (value.includes('/repos/octo-org/app/git/trees/')) {
        return treeResponse(appTreeSha, workflowSha, workflow);
      }
      if (value.includes('/repos/octo-org/worker/git/trees/')) {
        return treeResponse(workerTreeSha, workflowSha, workflow);
      }
      if (value.endsWith(`/git/blobs/${workflowSha}`)) return blobResponse(workflowSha, workflow);
      return response({}, 404);
    })));
    const result = await scanOrganization({
      organization: 'octo-org',
      cwd,
      concurrency: 1,
      checkpointPath,
      resume: true,
      onProgress: event => progress.push(event),
    });

    expect(result.repositories).toHaveLength(2);
    expect(fetch).toHaveBeenCalledTimes(6);
    expect(progress.filter(event => event.type === 'repository-completed'))
      .toEqual([
        expect.objectContaining({ repository: 'octo-org/app', reused: true }),
        expect.objectContaining({ repository: 'octo-org/worker', reused: false }),
      ]);
    expect(progress).toContainEqual(expect.objectContaining({
      type: 'discovery-page',
      page: 1,
      repositoriesDiscovered: 2,
    }));
    expect(progress).toContainEqual(expect.objectContaining({
      type: 'repository-phase',
      repository: 'octo-org/worker',
      phase: 'auditing workflows',
    }));
    expect(progress).toContainEqual(expect.objectContaining({
      type: 'checkpoint-written',
      repository: 'octo-org/worker',
      repositories: 2,
    }));
  });

  it('retries checkpointed repository failures instead of reusing them', async () => {
    const checkpointPath = 'scan-checkpoint.json';
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
      const value = String(url);
      if (value.includes('/orgs/octo-org/repos?')) return response([repository('app')]);
      if (value.includes('/git/trees/')) return response({}, 403);
      return response({}, 404);
    })));
    const failed = await scanOrganization({ organization: 'octo-org', cwd, checkpointPath });
    expect(failed.summary.repositoriesFailed).toBe(1);

    const progress = [];
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
      const value = String(url);
      if (value.includes('/orgs/octo-org/repos?')) return response([repository('app')]);
      if (value.includes('/git/trees/')) {
        return response({ sha: treeSha, truncated: false, tree: [] });
      }
      return response({}, 404);
    })));
    const resumed = await scanOrganization({
      organization: 'octo-org',
      cwd,
      checkpointPath,
      resume: true,
      onProgress: event => progress.push(event),
    });
    expect(resumed.status).toBe('OK');
    expect(progress).toContainEqual(expect.objectContaining({
      type: 'repository-completed',
      reused: false,
    }));
  });

  it('retries checkpointed repositories containing parse-error findings instead of reusing them', async () => {
    const checkpointPath = 'scan-checkpoint.json';
    const brokenWorkflow = 'name: [invalid yaml\n';
    const brokenWorkflowSha = 'e'.repeat(40);
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
      const value = String(url);
      if (value.includes('/orgs/octo-org/repos?')) return response([repository('app')]);
      if (value.includes('/repos/octo-org/app/git/trees/')) {
        return treeResponse(treeSha, brokenWorkflowSha, brokenWorkflow);
      }
      if (value.endsWith(`/git/blobs/${brokenWorkflowSha}`)) {
        return blobResponse(brokenWorkflowSha, brokenWorkflow);
      }
      return response({}, 404);
    })));
    const initial = await scanOrganization({ organization: 'octo-org', cwd, checkpointPath });
    expect(initial.findings.some(f => f.ruleId === 'parse-error')).toBe(true);

    const progress = [];
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
      const value = String(url);
      if (value.includes('/orgs/octo-org/repos?')) return response([repository('app')]);
      if (value.includes('/repos/octo-org/app/git/trees/')) {
        return treeResponse(treeSha, workflowSha, workflow);
      }
      if (value.endsWith(`/git/blobs/${workflowSha}`)) {
        return blobResponse(workflowSha, workflow);
      }
      return response({}, 404);
    })));
    const resumed = await scanOrganization({
      organization: 'octo-org',
      cwd,
      checkpointPath,
      resume: true,
      onProgress: event => progress.push(event),
    });
    expect(resumed.findings.some(f => f.ruleId === 'parse-error')).toBe(false);
    expect(progress).toContainEqual(expect.objectContaining({
      type: 'repository-completed',
      reused: false,
    }));
  });

  it('fails before discovery for corrupt or option-mismatched checkpoints', async () => {
    const checkpointPath = join(cwd, 'scan-checkpoint.json');
    await writeFile(checkpointPath, '{not-json');
    vi.stubGlobal('fetch', vi.fn());
    await expect(scanOrganization({
      organization: 'octo-org',
      cwd,
      checkpointPath,
      resume: true,
    })).rejects.toThrow(/not valid JSON/);
    expect(fetch).not.toHaveBeenCalled();

    vi.stubGlobal('fetch', organizationFetch({ treeSha, workflowSha, workflow }));
    await scanOrganization({ organization: 'octo-org', cwd, checkpointPath });
    const tampered = JSON.parse(await readFile(checkpointPath, 'utf8'));
    tampered.repositories[0].files = ['../outside.yml'];
    await writeFile(checkpointPath, JSON.stringify(tampered));
    vi.stubGlobal('fetch', vi.fn());
    await expect(scanOrganization({
      organization: 'octo-org',
      cwd,
      checkpointPath,
      resume: true,
    })).rejects.toThrow(/invalid checkpoint workflow path/);
    expect(fetch).not.toHaveBeenCalled();

    vi.stubGlobal('fetch', organizationFetch({ treeSha, workflowSha, workflow }));
    await scanOrganization({ organization: 'octo-org', cwd, checkpointPath });
    vi.stubGlobal('fetch', vi.fn());
    await expect(scanOrganization({
      organization: 'octo-org',
      cwd,
      severity: 'high',
      checkpointPath,
      resume: true,
    })).rejects.toThrow(/does not match current scope/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects an unsafe checkpoint path before organization discovery', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(scanOrganization({
      organization: 'octo-org',
      cwd,
      checkpointPath: '../escaped-checkpoint.json',
    })).rejects.toThrow(/refusing to write outside working directory/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('invalidates a checkpoint when normalized organization policy changes', async () => {
    const checkpointPath = 'scan-checkpoint.json';
    await writeFile(join(cwd, '.actions-warden.yml'), [
      'version: 1',
      'rules:',
      '  unpinned-action:',
      '    severity: high',
      '',
    ].join('\n'));
    vi.stubGlobal('fetch', organizationFetch({ treeSha, workflowSha, workflow }));
    await scanOrganization({ organization: 'octo-org', cwd, checkpointPath });

    await writeFile(join(cwd, '.actions-warden.yml'), [
      'version: 1',
      'rules:',
      '  unpinned-action:',
      '    severity: critical',
      '',
    ].join('\n'));
    vi.stubGlobal('fetch', vi.fn());
    await expect(scanOrganization({
      organization: 'octo-org',
      cwd,
      checkpointPath,
      resume: true,
    })).rejects.toThrow(/does not match current configHash/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not allow a checkpoint to replace active policy state', async () => {
    await writeFile(join(cwd, '.actions-warden.yml'), 'version: 1\n');
    vi.stubGlobal('fetch', vi.fn());
    await expect(scanOrganization({
      organization: 'octo-org',
      cwd,
      checkpointPath: '.actions-warden.yml',
    })).rejects.toThrow(/cannot replace the active config/);
    expect(fetch).not.toHaveBeenCalled();
  });

  describe('commit, file details, and permalinks', () => {
    const permalinkBase = `https://github.com/octo-org/app/blob/${MOCK_COMMIT_SHA}`;

    async function checkpointDocument(checkpointPath) {
      vi.stubGlobal('fetch', organizationFetch({ treeSha, workflowSha, workflow }));
      await scanOrganization({ organization: 'octo-org', cwd, checkpointPath });
      return JSON.parse(await readFile(join(cwd, checkpointPath), 'utf8'));
    }

    async function expectResumeRejected(checkpointPath, message) {
      vi.stubGlobal('fetch', vi.fn());
      await expect(scanOrganization({
        organization: 'octo-org',
        cwd,
        checkpointPath,
        resume: true,
      })).rejects.toThrow(message);
      expect(fetch).not.toHaveBeenCalled();
    }

    it('records the commit, per-file details, and permalinks beside unchanged URLs', async () => {
      vi.stubGlobal('fetch', organizationFetch({ treeSha, workflowSha, workflow }));
      const result = await scanOrganization({ organization: 'octo-org', cwd });
      const [repositoryResult] = result.repositories;

      expect(repositoryResult.revision).toEqual({
        branch: 'main',
        treeSha,
        commitSha: MOCK_COMMIT_SHA,
      });
      expect(repositoryResult.files).toEqual(['.github/workflows/ci.yml']);
      expect(repositoryResult.fileDetails).toEqual([{
        path: '.github/workflows/ci.yml',
        blobSha: workflowSha,
        bytes: Buffer.byteLength(workflow),
        status: 'scanned',
        findings: 1,
        permalink: `${permalinkBase}/.github/workflows/ci.yml`,
      }]);
      expect(result.findings[0]).toMatchObject({
        path: '.github/workflows/ci.yml',
        blobSha: workflowSha,
        url: 'https://github.com/octo-org/app/blob/main/.github/workflows/ci.yml#L9',
        permalink: `${permalinkBase}/.github/workflows/ci.yml#L9`,
      });
      expect(repositoryResult.findings[0]).toEqual(result.findings[0]);
    });

    it('encodes link paths and omits the line fragment when there is no line', async () => {
      const brokenName = '.github/workflows/my flow#1.yml';
      const broken = 'name: [unclosed\n';
      vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
        const value = String(url);
        if (value.includes('/orgs/octo-org/repos?')) return response([repository('app')]);
        if (value.includes('/git/trees/')) {
          return response({
            sha: treeSha,
            truncated: false,
            tree: [{
              path: brokenName,
              type: 'blob',
              sha: workflowSha,
              size: Buffer.byteLength(broken),
            }],
          });
        }
        if (value.endsWith(`/git/blobs/${workflowSha}`)) return blobResponse(workflowSha, broken);
        return response({}, 404);
      })));

      const result = await scanOrganization({ organization: 'octo-org', cwd });
      const encoded = `${permalinkBase}/.github/workflows/my%20flow%231.yml`;
      expect(result.repositories[0].fileDetails[0]).toMatchObject({
        status: 'parse-error',
        findings: 1,
        permalink: encoded,
      });
      expect(result.findings[0])
        .toMatchObject({ ruleId: 'parse-error', line: 0, permalink: encoded });
    });

    it('lists unreadable workflow files with their tree size and a permalink', async () => {
      vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
        const value = String(url);
        if (value.includes('/orgs/octo-org/repos?')) return response([repository('app')]);
        if (value.includes('/git/trees/')) return treeResponse(treeSha, workflowSha, workflow);
        return response({}, 404);
      })));

      const result = await scanOrganization({ organization: 'octo-org', cwd });
      const [repositoryResult] = result.repositories;
      expect(repositoryResult.files).toEqual([]);
      expect(repositoryResult.fileDetails).toEqual([{
        path: '.github/workflows/ci.yml',
        blobSha: workflowSha,
        bytes: Buffer.byteLength(workflow),
        status: 'unreadable',
        findings: 0,
        permalink: `${permalinkBase}/.github/workflows/ci.yml`,
      }]);
      expect(repositoryResult.errors[0]).toMatchObject({
        path: '.github/workflows/ci.yml',
        permalink: `${permalinkBase}/.github/workflows/ci.yml`,
      });
      expect(result.status).toBe('FAIL');
    });

    it('reports a resumed repository against the live commit, like a fresh scan', async () => {
      const checkpointPath = 'scan-checkpoint.json';
      await checkpointDocument(checkpointPath);
      const liveCommit = 'e'.repeat(40);
      const treeOnly = async url => {
        const value = String(url);
        if (value.includes('/orgs/octo-org/repos?')) return response([repository('app')]);
        if (value.includes('/git/trees/')) return treeResponse(treeSha, workflowSha, workflow);
        return response({}, 500);
      };

      vi.stubGlobal('fetch', vi.fn(withCommitResolution(treeOnly, liveCommit)));
      const resumed = await scanOrganization({
        organization: 'octo-org',
        cwd,
        checkpointPath,
        resume: true,
      });
      expect(fetch).toHaveBeenCalledTimes(3);

      vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
        const value = String(url);
        if (value.endsWith(`/git/blobs/${workflowSha}`)) return blobResponse(workflowSha, workflow);
        return treeOnly(url);
      }, liveCommit)));
      const fresh = await scanOrganization({ organization: 'octo-org', cwd });

      expect(resumed.repositories[0].revision.commitSha).toBe(liveCommit);
      expect(resumed.findings[0].permalink).toBe(
        `https://github.com/octo-org/app/blob/${liveCommit}/.github/workflows/ci.yml#L9`,
      );
      expect(renderOrganizationScan(resumed, { format: 'json', cwd }))
        .toBe(renderOrganizationScan(fresh, { format: 'json', cwd }));
    });

    it('stores file details without links or commits and no derived finding fields', async () => {
      const checkpoint = await checkpointDocument('scan-checkpoint.json');
      const source = JSON.stringify(checkpoint);
      expect(source).not.toContain(MOCK_COMMIT_SHA);
      expect(source).not.toContain('commitSha');
      expect(source).not.toContain('permalink');

      const [stored] = checkpoint.repositories;
      expect(stored.fileDetails).toEqual([{
        path: '.github/workflows/ci.yml',
        blobSha: workflowSha,
        bytes: Buffer.byteLength(workflow),
        status: 'scanned',
        findings: 1,
      }]);
      for (const derived of ['repository', 'branch', 'url', 'path', 'blobSha', 'permalink']) {
        expect(stored.findings[0]).not.toHaveProperty(derived);
      }
    });

    it.each([
      ['are missing', checkpoint => { delete checkpoint.repositories[0].fileDetails; },
        /invalid checkpoint fileDetails for octo-org\/app/],
      ['repeat a path', checkpoint => {
        const [detail] = checkpoint.repositories[0].fileDetails;
        checkpoint.repositories[0].fileDetails.push({ ...detail });
      }, /duplicate checkpoint fileDetails path/],
      ['are out of order', checkpoint => {
        const [detail] = checkpoint.repositories[0].fileDetails;
        checkpoint.repositories[0].fileDetails.unshift({
          ...detail,
          path: '.github/workflows/z.yml',
        });
      }, /checkpoint fileDetails are not ordered/],
      ['carry an unknown key', checkpoint => {
        checkpoint.repositories[0].fileDetails[0].permalink = 'https://example.com/';
      }, /invalid checkpoint fileDetails entry/],
      ['use an unknown status', checkpoint => {
        checkpoint.repositories[0].fileDetails[0].status = 'skipped';
      }, /invalid checkpoint fileDetails entry/],
      ['have a negative size', checkpoint => {
        checkpoint.repositories[0].fileDetails[0].bytes = -1;
      }, /invalid checkpoint fileDetails entry/],
      ['have a malformed blob SHA', checkpoint => {
        checkpoint.repositories[0].fileDetails[0].blobSha = 'xyz';
      }, /invalid checkpoint fileDetails entry/],
      ['name a non-workflow path', checkpoint => {
        checkpoint.repositories[0].fileDetails[0].path = 'README.md';
      }, /invalid checkpoint fileDetails entry/],
      ['miscount findings', checkpoint => {
        checkpoint.repositories[0].fileDetails[0].findings = 0;
      }, /inconsistent checkpoint fileDetails/],
      ['omit a scanned file', checkpoint => {
        checkpoint.repositories[0].fileDetails = [];
      }, /inconsistent checkpoint fileDetails/],
      ['mark a scanned file unreadable', checkpoint => {
        checkpoint.repositories[0].fileDetails[0].status = 'unreadable';
      }, /inconsistent checkpoint fileDetails/],
      ['claim a parse error without a finding', checkpoint => {
        checkpoint.repositories[0].fileDetails[0].status = 'parse-error';
      }, /inconsistent checkpoint fileDetails/],
    ])('rejects a checkpoint whose file details %s', async (_name, tamper, message) => {
      const checkpointPath = 'scan-checkpoint.json';
      const checkpoint = await checkpointDocument(checkpointPath);
      tamper(checkpoint);
      await writeFile(join(cwd, checkpointPath), `${JSON.stringify(checkpoint)}\n`);
      await expectResumeRejected(checkpointPath, message);
    });

    it('rejects a generation 2 checkpoint that predates file details', async () => {
      const checkpointPath = 'scan-checkpoint.json';
      const checkpoint = await checkpointDocument(checkpointPath);
      checkpoint.identity.analysisGeneration = 2;
      for (const stored of checkpoint.repositories) delete stored.fileDetails;
      await writeFile(join(cwd, checkpointPath), `${JSON.stringify(checkpoint)}\n`);
      await expectResumeRejected(checkpointPath, /does not match current analysisGeneration/);
    });

    it('accepts workflow names ordered by code unit, not locale', async () => {
      const names = ['.github/workflows/B.yml', '.github/workflows/a.yml'];
      vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
        const value = String(url);
        if (value.includes('/orgs/octo-org/repos?')) return response([repository('app')]);
        if (value.includes('/git/trees/')) {
          return response({
            sha: treeSha,
            truncated: false,
            tree: names.map((path, index) => ({
              path,
              type: 'blob',
              sha: String(index + 1).repeat(40),
              size: Buffer.byteLength(workflow),
            })),
          });
        }
        return blobResponse(value.split('/git/blobs/')[1], workflow);
      })));
      const checkpointPath = 'mixed-case.json';
      const first = await scanOrganization({ organization: 'octo-org', cwd, checkpointPath });
      expect(first.repositories[0].files).toEqual(names);
      expect(first.repositories[0].fileDetails.map(detail => detail.path)).toEqual(names);

      const resumed = await scanOrganization({
        organization: 'octo-org',
        cwd,
        checkpointPath,
        resume: true,
      });
      expect(renderOrganizationScan(resumed, { format: 'json', cwd }))
        .toBe(renderOrganizationScan(first, { format: 'json', cwd }));
    });
  });
});

function repository(name, overrides = {}) {
  return {
    name,
    full_name: `octo-org/${name}`,
    owner: { login: 'octo-org' },
    default_branch: 'main',
    visibility: 'public',
    private: false,
    fork: false,
    archived: false,
    disabled: false,
    html_url: `https://github.com/octo-org/${name}`,
    ...overrides,
  };
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function treeResponse(sha, blobSha, source) {
  return response({
    sha,
    truncated: false,
    tree: [{
      path: '.github/workflows/ci.yml',
      type: 'blob',
      sha: blobSha,
      size: Buffer.byteLength(source),
    }],
  });
}

function blobResponse(sha, source) {
  return response({
    sha,
    encoding: 'base64',
    size: Buffer.byteLength(source),
    content: Buffer.from(source).toString('base64'),
  });
}

function organizationFetch({ treeSha: revision, workflowSha: blobSha, workflow: source }) {
  return vi.fn(withCommitResolution(async url => {
    const value = String(url);
    if (value.includes('/orgs/octo-org/repos?')) return response([repository('app')]);
    if (value.includes('/git/trees/')) return treeResponse(revision, blobSha, source);
    if (value.endsWith(`/git/blobs/${blobSha}`)) return blobResponse(blobSha, source);
    return response({}, 404);
  }));
}

function asSchema10Checkpoint(checkpoint) {
  return {
    schemaVersion: '1.0',
    kind: checkpoint.kind,
    identity: {
      toolVersion: '0.3.0',
      rulesHash: checkpoint.identity.rulesHash,
      organization: checkpoint.identity.organization,
      scope: checkpoint.identity.scope,
      configHash: checkpoint.identity.configHash,
      baselineHash: checkpoint.identity.baselineHash,
    },
    repositories: checkpoint.repositories,
  };
}
