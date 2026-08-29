import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verify } from '../src/commands/verify.js';

describe('verify command', () => {
  let cwd;
  let workflow;
  let previousCacheDir;
  const sha = 'a'.repeat(40);

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'aw-verify-'));
    workflow = join(cwd, '.github', 'workflows', 'ci.yml');
    await mkdir(join(cwd, '.github', 'workflows'), { recursive: true });
    previousCacheDir = process.env.ACTIONS_WARDEN_CACHE_DIR;
    process.env.ACTIONS_WARDEN_CACHE_DIR = join(cwd, 'cache');
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    if (previousCacheDir === undefined) delete process.env.ACTIONS_WARDEN_CACHE_DIR;
    else process.env.ACTIONS_WARDEN_CACHE_DIR = previousCacheDir;
    await rm(cwd, { recursive: true, force: true });
  });

  async function writeRef(ref, comment = '') {
    await writeFile(workflow, [
      'name: ci',
      'on: push',
      'permissions:',
      '  contents: read',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      `      - uses: octo/action@${ref}${comment}`,
      '',
    ].join('\n'));
  }

  it('verifies repository membership and version-to-SHA correspondence', async () => {
    await writeRef(sha, ' # actions-warden-ref: v1.0.0');
    vi.stubGlobal('fetch', vi.fn(async url => {
      if (String(url).includes('/commits/')) {
        return new Response(JSON.stringify({ sha }), { status: 200 });
      }
      return new Response(JSON.stringify({
        object: { sha, type: 'commit' },
      }), { status: 200 });
    }));
    const result = await verify({ cwd });
    expect(result.status).toBe('OK');
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].version).toBe('v1.0.0');
  });

  it('fails when version metadata points to a different commit', async () => {
    await writeRef(sha, ' # actions-warden-ref: v1.0.0');
    vi.stubGlobal('fetch', vi.fn(async url => {
      if (String(url).includes('/commits/')) {
        return new Response(JSON.stringify({ sha }), { status: 200 });
      }
      return new Response(JSON.stringify({
        object: { sha: 'b'.repeat(40), type: 'commit' },
      }), { status: 200 });
    }));
    const result = await verify({ cwd });
    expect(result.status).toBe('FAIL');
    expect(result.errors[0].error).toMatch(/resolves to/);
  });

  it('fails unpinned references without making network requests', async () => {
    await writeRef('v1');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await verify({ cwd });
    expect(result.status).toBe('FAIL');
    expect(result.errors[0].error).toMatch(/not pinned/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
