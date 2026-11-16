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
import { withCommitResolution } from './fixtures/org-fetch-helpers.js';

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
    const pages = [];
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
      const page = new URL(String(url)).searchParams.get('page');
      return new Response(JSON.stringify(page === '1' ? firstPage : [repository('repo-100')]), {
        status: 200,
        headers: {
          'x-ratelimit-remaining': page === '1' ? '4999' : '4998',
          'x-ratelimit-resource': 'core',
        },
      });
    })));

    const repositories = await listOrganizationRepositories({
      organization: 'octo-org',
      token: 'test-token',
      cwd,
      onPage: event => pages.push(event),
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
    expect(pages).toEqual([
      {
        page: 1,
        repositoriesDiscovered: 100,
        rateLimit: { remaining: 4999, resource: 'core' },
      },
      {
        page: 2,
        repositoriesDiscovered: 101,
        rateLimit: { remaining: 4998, resource: 'core' },
      },
    ]);
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
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async url => {
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
    })));

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
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('forwards the same bearer token through repository, tree, and blob requests', async () => {
    const token = 'authenticated-test-token';
    const workflow = 'on: push\npermissions: {}\njobs: {}\n';
    const workflowSha = 'a'.repeat(40);
    const treeSha = 'b'.repeat(40);
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async (url, options) => {
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
    })));

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
      expect.stringContaining('/repos/octo-org/app/commits/heads/main'),
      expect.stringContaining(`/repos/octo-org/app/git/trees/${treeSha}?recursive=1`),
      expect.stringContaining(`/repos/octo-org/app/git/blobs/${workflowSha}`),
    ]);
  });

  it('fails closed on a truncated repository tree', async () => {
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async () => jsonResponse({
      sha: 'a'.repeat(40),
      truncated: true,
      tree: [],
    }))));
    await expect(fetchRepositoryWorkflows({
      repository: normalizedRepository(),
      cwd,
    })).rejects.toThrow(/truncated/);
  });

  it('fails closed when tree truncation metadata is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async () => jsonResponse({
      sha: 'a'.repeat(40),
      tree: [],
    }))));
    await expect(fetchRepositoryWorkflows({
      repository: normalizedRepository(),
      cwd,
    })).rejects.toThrow(/truncation state/);
  });

  it('records oversized workflow files without downloading their blobs', async () => {
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async () => jsonResponse({
      sha: 'a'.repeat(40),
      truncated: false,
      tree: [{
        path: '.github/workflows/large.yml',
        type: 'blob',
        sha: 'b'.repeat(40),
        size: MAX_WORKFLOW_BYTES + 1,
      }],
    }))));
    const result = await fetchRepositoryWorkflows({
      repository: normalizedRepository(),
      cwd,
    });
    expect(result.sources).toEqual([]);
    expect(result.errors[0]).toMatchObject({ path: '.github/workflows/large.yml' });
    expect(result.errors[0].error).toMatch(/scan limit/);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects repositories with an unbounded number of workflow files', async () => {
    vi.stubGlobal('fetch', vi.fn(withCommitResolution(async () => jsonResponse({
      sha: 'a'.repeat(40),
      truncated: false,
      tree: Array.from({ length: MAX_WORKFLOW_FILES + 1 }, (_, index) => ({
        path: `.github/workflows/${index}.yml`,
        type: 'blob',
        sha: 'b'.repeat(40),
        size: 1,
      })),
    }))));
    await expect(fetchRepositoryWorkflows({
      repository: normalizedRepository(),
      cwd,
    })).rejects.toThrow(/unbounded scan/);
    expect(fetch).toHaveBeenCalledTimes(2);
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

  describe('default-branch commit resolution', () => {
    const commitSha = 'c'.repeat(40);
    const treeSha = 'b'.repeat(40);

    function stubRepository({ commit, tree, blobs = {} } = {}) {
      const urls = [];
      vi.stubGlobal('fetch', vi.fn(async url => {
        const value = String(url);
        urls.push(value);
        if (value.includes('/commits/heads/')) return commit ?? jsonResponse({}, 404);
        if (value.includes('/git/trees/')) return tree ?? jsonResponse({}, 404);
        const blobSha = value.split('/git/blobs/')[1];
        return blobs[blobSha] ?? jsonResponse({}, 404);
      }));
      return urls;
    }

    function commitBody(overrides = {}) {
      return { sha: commitSha, commit: { tree: { sha: treeSha } }, ...overrides };
    }

    function treeBody(entries = [], overrides = {}) {
      return { sha: treeSha, truncated: false, tree: entries, ...overrides };
    }

    it('reads the commit first, then the tree by that commit\'s tree SHA', async () => {
      const urls = stubRepository({
        commit: jsonResponse(commitBody({
          sha: commitSha.toUpperCase(),
          commit: { tree: { sha: treeSha.toUpperCase() } },
        })),
        tree: jsonResponse(treeBody([], { sha: treeSha.toUpperCase() })),
      });
      const tree = await fetchRepositoryWorkflowTree({
        repository: normalizedRepository(),
        cwd,
      });
      expect(urls).toEqual([
        'https://api.github.com/repos/octo-org/app/commits/heads/main',
        `https://api.github.com/repos/octo-org/app/git/trees/${treeSha}?recursive=1`,
      ]);
      expect(tree).toMatchObject({ empty: false, treeSha, commitSha });
    });

    it('encodes a default branch containing slashes', async () => {
      const urls = stubRepository({
        commit: jsonResponse(commitBody()),
        tree: jsonResponse(treeBody()),
      });
      await fetchRepositoryWorkflowTree({
        repository: { ...normalizedRepository(), defaultBranch: 'release/1.0' },
        cwd,
      });
      expect(urls[0]).toBe(
        'https://api.github.com/repos/octo-org/app/commits/heads/release%2F1.0',
      );
    });

    it('treats a 409 commit response as an empty repository without a tree request', async () => {
      const urls = stubRepository({
        commit: jsonResponse({ message: 'Git Repository is empty.' }, 409),
      });
      const tree = await fetchRepositoryWorkflowTree({
        repository: normalizedRepository(),
        cwd,
      });
      expect(tree).toMatchObject({ empty: true, entries: [], treeSha: null, commitSha: null });
      expect(urls).toHaveLength(1);
      const workflows = await fetchRepositoryWorkflows({
        repository: normalizedRepository(),
        workflowTree: tree,
        cwd,
      });
      expect(workflows).toMatchObject({
        empty: true,
        sources: [],
        errors: [],
        entries: [],
        treeSha: null,
        commitSha: null,
      });
    });

    it.each([403, 404, 422])('fails closed on a %i commit response', async status => {
      const urls = stubRepository({ commit: jsonResponse({}, status) });
      await expect(fetchRepositoryWorkflowTree({
        repository: normalizedRepository(),
        cwd,
      })).rejects.toThrow(`could not read octo-org/app@main commit (HTTP ${status})`);
      expect(urls).toHaveLength(1);
    });

    it.each([
      ['an empty object', {}],
      ['a missing commit SHA', { commit: { tree: { sha: 'b'.repeat(40) } } }],
      ['a malformed commit SHA', { sha: 'not-a-sha', commit: { tree: { sha: 'b'.repeat(40) } } }],
      ['a missing tree', { sha: 'c'.repeat(40) }],
      ['a malformed tree SHA', { sha: 'c'.repeat(40), commit: { tree: { sha: 'bad' } } }],
    ])('rejects a commit response with %s', async (_name, body) => {
      const urls = stubRepository({ commit: jsonResponse(body) });
      await expect(fetchRepositoryWorkflowTree({
        repository: normalizedRepository(),
        cwd,
      })).rejects.toThrow('invalid commit response for octo-org/app');
      expect(urls).toHaveLength(1);
    });

    it('rejects a tree whose SHA differs from the commit tree', async () => {
      stubRepository({
        commit: jsonResponse(commitBody()),
        tree: jsonResponse(treeBody([], { sha: 'e'.repeat(40) })),
      });
      await expect(fetchRepositoryWorkflowTree({
        repository: normalizedRepository(),
        cwd,
      })).rejects.toThrow('tree response for octo-org/app did not match the commit');
    });

    it('treats a tree conflict after a resolved commit as an error', async () => {
      stubRepository({
        commit: jsonResponse(commitBody()),
        tree: jsonResponse({ message: 'Git Repository is empty.' }, 409),
      });
      await expect(fetchRepositoryWorkflowTree({
        repository: normalizedRepository(),
        cwd,
      })).rejects.toThrow('tree (HTTP 409)');
    });

    it('requires a valid commit in a supplied workflow tree snapshot', async () => {
      const snapshot = {
        repository: 'octo-org/app',
        branch: 'main',
        entries: [],
        empty: false,
        treeSha,
        commitSha,
      };
      await expect(fetchRepositoryWorkflows({
        repository: normalizedRepository(),
        workflowTree: snapshot,
        cwd,
      })).resolves.toMatchObject({ commitSha, treeSha });
      for (const broken of [
        { ...snapshot, commitSha: undefined },
        { ...snapshot, commitSha: null },
        { ...snapshot, commitSha: 'short' },
      ]) {
        await expect(fetchRepositoryWorkflows({
          repository: normalizedRepository(),
          workflowTree: broken,
          cwd,
        })).rejects.toThrow('invalid workflow tree snapshot for octo-org/app');
      }
    });

    it('reports per-file blob SHAs and sizes, including files that could not be read', async () => {
      const bomContent = '﻿on: push\njobs: {}\n';
      const upperSha = 'A'.repeat(40);
      stubRepository({
        commit: jsonResponse(commitBody()),
        tree: jsonResponse(treeBody([
          blob('.github/workflows/a.yml', upperSha, bomContent),
          { path: '.github/workflows/b.yml', type: 'blob', sha: 'b'.repeat(40), size: 10 },
          { path: '.github/workflows/c.yml', type: 'blob', sha: 'not-a-sha', size: 5 },
          { path: '.github/workflows/d.yml', type: 'blob', sha: 'd'.repeat(40) },
        ])),
        blobs: { [upperSha]: blobResponse(bomContent, upperSha) },
      });
      const tree = await fetchRepositoryWorkflowTree({
        repository: normalizedRepository(),
        cwd,
      });
      const result = await fetchRepositoryWorkflows({
        repository: normalizedRepository(),
        workflowTree: tree,
        cwd,
      });
      expect(result.entries).toEqual([
        { path: '.github/workflows/a.yml', blobSha: 'a'.repeat(40), bytes: 21, readable: true },
        { path: '.github/workflows/b.yml', blobSha: 'b'.repeat(40), bytes: 10, readable: false },
        { path: '.github/workflows/c.yml', blobSha: null, bytes: 5, readable: false },
        { path: '.github/workflows/d.yml', blobSha: 'd'.repeat(40), bytes: null, readable: false },
      ]);
      expect(result.sources.map(source => source.path)).toEqual(['.github/workflows/a.yml']);
      // The decoder drops the BOM from the text, but the reported size is the blob's.
      expect(Buffer.byteLength(result.sources[0].source)).toBe(18);
      expect(result.errors.map(error => error.path)).toEqual([
        '.github/workflows/b.yml',
        '.github/workflows/c.yml',
        '.github/workflows/d.yml',
      ]);
    });
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
