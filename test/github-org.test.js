import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  fetchRepositoryWorkflowTree,
  fetchRepositoryWorkflows,
  isWorkflowPath,
  listOrganizationRepositories,
  MAX_WORKFLOW_BYTES,
  MAX_WORKFLOW_FILES,
} from '../src/lib/github-org.js';

describe('GitHub organization source discovery', () => {
  let cwd;
  let previousCacheDir;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'aw-github-org-'));
    previousCacheDir = process.env.ACTIONS_WARDEN_CACHE_DIR;
    process.env.ACTIONS_WARDEN_CACHE_DIR = join(cwd, 'cache');
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    if (previousCacheDir === undefined) delete process.env.ACTIONS_WARDEN_CACHE_DIR;
    else process.env.ACTIONS_WARDEN_CACHE_DIR = previousCacheDir;
    await rm(cwd, { recursive: true, force: true });
  });

  it('paginates and normalizes every visible organization repository', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => repository(`repo-${index}`));
    vi.stubGlobal('fetch', vi.fn(async url => {
      const page = new URL(String(url)).searchParams.get('page');
      return new Response(JSON.stringify(page === '1' ? firstPage : [repository('repo-100')]), {
        status: 200,
      });
    }));

    const repositories = await listOrganizationRepositories({
      organization: 'octo-org',
      token: 'test-token',
      cwd,
    });
    expect(repositories).toHaveLength(101);
    expect(repositories[0]).toMatchObject({
      owner: 'octo-org',
      fullName: 'octo-org/repo-0',
      defaultBranch: 'main',
      visibility: 'public',
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][1].headers.authorization).toBe('Bearer test-token');
  });

  it('fetches only workflow and composite-action blobs as validated UTF-8', async () => {
    const workflow = [
      'on: push',
      'permissions:',
      '  contents: read',
      'jobs: {}',
      '',
    ].join('\n');
    const action = 'name: local\nruns:\n  using: composite\n  steps: []\n';
    const workflowSha = 'a'.repeat(40);
    const actionSha = 'b'.repeat(40);
    vi.stubGlobal('fetch', vi.fn(async url => {
      const value = String(url);
      if (value.includes('/git/trees/')) {
        return jsonResponse({
          sha: 'c'.repeat(40),
          truncated: false,
          tree: [
            blob('.github/workflows/ci.yml', workflowSha, workflow),
            blob('.github/actions/check/action.yaml', actionSha, action),
            blob('.github/workflows/nested/ignored.yml', 'd'.repeat(40), 'ignored'),
            blob('README.md', 'e'.repeat(40), 'ignored'),
          ],
        });
      }
      if (value.endsWith(workflowSha)) return blobResponse(workflow, workflowSha);
      if (value.endsWith(actionSha)) return blobResponse(action, actionSha);
      return jsonResponse({}, 404);
    }));

    const workflowTree = await fetchRepositoryWorkflowTree({
      repository: normalizedRepository(),
      cwd,
    });
    expect(workflowTree.treeSha).toBe('c'.repeat(40));
    const result = await fetchRepositoryWorkflows({
      repository: normalizedRepository(),
      cwd,
      workflowTree,
    });
    expect(result.treeSha).toBe('c'.repeat(40));
    expect(result.errors).toEqual([]);
    expect(result.sources.map(source => source.path)).toEqual([
      '.github/actions/check/action.yaml',
      '.github/workflows/ci.yml',
    ]);
    expect(result.sources[1].source).toBe(workflow);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('forwards the same bearer token through repository, tree, and blob requests', async () => {
    const token = 'authenticated-test-token';
    const workflow = 'on: push\npermissions: {}\njobs: {}\n';
    const workflowSha = 'a'.repeat(40);
    const treeSha = 'b'.repeat(40);
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      expect(options.headers.authorization).toBe(`Bearer ${token}`);
      const value = String(url);
      if (value.includes('/orgs/octo-org/repos?')) {
        return jsonResponse([repository('app')]);
      }
      if (value.includes('/git/trees/')) {
        return jsonResponse({
          sha: treeSha,
          truncated: false,
          tree: [blob('.github/workflows/ci.yml', workflowSha, workflow)],
        });
      }
      if (value.endsWith(`/git/blobs/${workflowSha}`)) {
        return blobResponse(workflow, workflowSha);
      }
      return jsonResponse({}, 404);
    }));

    const [discovered] = await listOrganizationRepositories({
      organization: 'octo-org',
      token,
      cwd,
    });
    const workflowTree = await fetchRepositoryWorkflowTree({
      repository: discovered,
      token,
      cwd,
    });
    const result = await fetchRepositoryWorkflows({
      repository: discovered,
      token,
      cwd,
      workflowTree,
    });

    expect(result.sources).toHaveLength(1);
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([
      expect.stringContaining('/orgs/octo-org/repos?'),
      expect.stringContaining('/repos/octo-org/app/git/trees/main'),
      expect.stringContaining(`/repos/octo-org/app/git/blobs/${workflowSha}`),
    ]);
  });

  it('fails closed on a truncated repository tree', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      sha: 'a'.repeat(40),
      truncated: true,
      tree: [],
    })));
    await expect(fetchRepositoryWorkflows({
      repository: normalizedRepository(),
      cwd,
    })).rejects.toThrow(/truncated/);
  });

  it('fails closed when tree truncation metadata is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      sha: 'a'.repeat(40),
      tree: [],
    })));
    await expect(fetchRepositoryWorkflows({
      repository: normalizedRepository(),
      cwd,
    })).rejects.toThrow(/truncation state/);
  });

  it('records oversized workflow files without downloading their blobs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      sha: 'a'.repeat(40),
      truncated: false,
      tree: [{
        path: '.github/workflows/large.yml',
        type: 'blob',
        sha: 'b'.repeat(40),
        size: MAX_WORKFLOW_BYTES + 1,
      }],
    })));
    const result = await fetchRepositoryWorkflows({
      repository: normalizedRepository(),
      cwd,
    });
    expect(result.sources).toEqual([]);
    expect(result.errors[0]).toMatchObject({ path: '.github/workflows/large.yml' });
    expect(result.errors[0].error).toMatch(/scan limit/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects repositories with an unbounded number of workflow files', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      sha: 'a'.repeat(40),
      truncated: false,
      tree: Array.from({ length: MAX_WORKFLOW_FILES + 1 }, (_, index) => ({
        path: `.github/workflows/${index}.yml`,
        type: 'blob',
        sha: 'b'.repeat(40),
        size: 1,
      })),
    })));
    await expect(fetchRepositoryWorkflows({
      repository: normalizedRepository(),
      cwd,
    })).rejects.toThrow(/unbounded scan/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('matches the same default workflow scope as local discovery', () => {
    expect(isWorkflowPath('.github/workflows/ci.yaml')).toBe(true);
    expect(isWorkflowPath('action.yml')).toBe(true);
    expect(isWorkflowPath('.github/actions/action.yml')).toBe(true);
    expect(isWorkflowPath('.github/actions/lint/action.yaml')).toBe(true);
    expect(isWorkflowPath('.github/workflows/nested/ci.yml')).toBe(false);
    expect(isWorkflowPath('.github/workflows/CI.YML')).toBe(false);
    expect(isWorkflowPath('nested/action.yml')).toBe(false);
    expect(isWorkflowPath('.github/actions/../action.yml')).toBe(false);
    expect(isWorkflowPath('.github/actions/evil\\path/action.yml')).toBe(false);
  });
});

function repository(name) {
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
  };
}

function normalizedRepository() {
  return {
    owner: 'octo-org',
    name: 'app',
    fullName: 'octo-org/app',
    defaultBranch: 'main',
    visibility: 'private',
    private: true,
    fork: false,
    archived: false,
    disabled: false,
    htmlUrl: 'https://github.com/octo-org/app',
  };
}

function blob(path, sha, content) {
  return { path, type: 'blob', sha, size: Buffer.byteLength(content) };
}

function blobResponse(content, sha) {
  return jsonResponse({
    sha,
    encoding: 'base64',
    size: Buffer.byteLength(content),
    content: Buffer.from(content).toString('base64'),
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status });
}
