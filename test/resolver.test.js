import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getTagAgeEvidence,
  ghFetch,
  listTags,
  pickLatestTag,
  resolveRefToSha,
  resolveToken,
} from '../src/lib/resolver.js';
import { cacheDir } from '../src/lib/cache.js';

describe('resolveToken', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('prefers an explicit token, then GITHUB_TOKEN, then GH_TOKEN', () => {
    vi.stubEnv('GITHUB_TOKEN', 'github-token');
    vi.stubEnv('GH_TOKEN', 'gh-token');
    expect(resolveToken('explicit-token')).toBe('explicit-token');
    expect(resolveToken()).toBe('github-token');
    vi.stubEnv('GITHUB_TOKEN', '');
    expect(resolveToken()).toBe('gh-token');
  });
});

describe('pickLatestTag', () => {
  it('ignores non-version tags and prefers a specific release tag over aliases', () => {
    const tags = [
      { name: 'build-999', sha: '1' },
      { name: 'v4', sha: '2' },
      { name: 'v4.2.1', sha: '3' },
      { name: 'v4.2', sha: '4' },
    ];
    expect(pickLatestTag({ tags, currentRef: 'v4.0.0', mode: 'minor' }))
      .toMatchObject({ name: 'v4.2.1' });
  });

  it('does not downgrade when only older matching tags are returned', () => {
    const tags = [{ name: 'v4.1.0', sha: '1' }];
    expect(pickLatestTag({ tags, currentRef: 'v4.2.0', mode: 'minor' })).toBeNull();
  });

  it('excludes prereleases by default', () => {
    const tags = [
      { name: 'v5.0.0-beta.1', sha: '1' },
      { name: 'v4.3.0', sha: '2' },
    ];
    expect(pickLatestTag({ tags, currentRef: 'v4', mode: 'major' }))
      .toMatchObject({ name: 'v4.3.0' });
  });
});

describe('GitHub tag resolution errors and age evidence', () => {
  let cwd;
  let previousCacheDir;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'aw-resolver-'));
    previousCacheDir = process.env.ACTIONS_WARDEN_CACHE_DIR;
    process.env.ACTIONS_WARDEN_CACHE_DIR = join(cwd, 'cache');
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (previousCacheDir === undefined) delete process.env.ACTIONS_WARDEN_CACHE_DIR;
    else process.env.ACTIONS_WARDEN_CACHE_DIR = previousCacheDir;
    await rm(cwd, { recursive: true, force: true });
  });

  it('fails instead of treating an HTTP error as an empty tag list', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 403 })));
    await expect(listTags({ owner: 'o', repo: 'r', cwd }))
      .rejects.toThrow(/HTTP 403/);
  });

  it('retries on secondary rate limit with retry-after header', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ message: 'You have exceeded a secondary rate limit' }), {
          status: 403,
          headers: { 'retry-after': '0', 'x-ratelimit-remaining': '100' },
        });
      }
      return new Response(JSON.stringify([{ name: 'v1.0.0', commit: { sha: 'a'.repeat(40) } }]), {
        status: 200,
        headers: { 'x-ratelimit-remaining': '99' },
      });
    }));

    const tags = await listTags({
      owner: 'o',
      repo: 'r',
      cwd,
    });
    expect(tags).toHaveLength(1);
    expect(calls).toBe(2);
  });

  it('revalidates expired cached responses with an ETag', async () => {
    const url = 'https://api.github.com/repos/o/r/example';
    const body = { value: 42 };
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { etag: '"example-etag"' },
        });
      }
      expect(options.headers['if-none-match']).toBe('"example-etag"');
      return new Response(null, { status: 304 });
    }));

    await expect(ghFetch({ url, cwd })).resolves.toMatchObject({ body });
    const [entryName] = await readdir(cacheDir(cwd));
    const entryPath = join(cacheDir(cwd), entryName);
    const entry = JSON.parse(await readFile(entryPath, 'utf8'));
    entry.savedAt = 0;
    await writeFile(entryPath, JSON.stringify(entry));

    await expect(ghFetch({ url, cwd })).resolves.toEqual({ status: 200, body });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('reports bounded retry waits to an optional observer', async () => {
    vi.useFakeTimers();
    const retries = [];
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 })));
    const request = ghFetch({
      url: 'https://api.github.com/repos/o/r/retry-example',
      cwd,
      useCache: false,
      retries: 1,
      onRetry: event => retries.push(event),
    });
    await vi.runAllTimersAsync();
    await expect(request).resolves.toEqual({ status: 200, body: { ok: true } });
    expect(retries).toEqual([{
      attempt: 1,
      maxRetries: 1,
      reason: 'server-error',
      delayMs: 1000,
      status: 503,
    }]);
  });

  it('reports sanitized response and rate-limit metadata without changing the result', async () => {
    const responses = [];
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"ok":true}', {
      status: 200,
      headers: {
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '4999',
        'x-ratelimit-used': '1',
        'x-ratelimit-reset': '1788291000',
        'x-ratelimit-resource': 'core',
      },
    })));

    await expect(ghFetch({
      url: 'https://api.github.com/repos/o/r/response-example',
      cwd,
      useCache: false,
      onResponse: event => responses.push(event),
    })).resolves.toEqual({ status: 200, body: { ok: true } });
    expect(responses).toEqual([{
      status: 200,
      rateLimit: {
        limit: 5000,
        remaining: 4999,
        used: 1,
        resetAt: '2026-09-01T19:30:00.000Z',
        resource: 'core',
      },
    }]);
  });

  it('fails closed when an annotated tag cannot be dereferenced', async () => {
    const tagSha = 'a'.repeat(40);
    vi.stubGlobal('fetch', vi.fn(async url => {
      if (String(url).includes('/git/refs/tags/')) {
        return new Response(JSON.stringify({
          object: { sha: tagSha, type: 'tag' },
        }), { status: 200 });
      }
      return new Response('{}', { status: 404 });
    }));
    await expect(resolveRefToSha({
      owner: 'o',
      repo: 'r',
      ref: 'v1',
      cwd,
    })).rejects.toThrow(/could not dereference annotated tag/);
  });

  it('rejects an annotated tag whose target is not a commit', async () => {
    const tagSha = 'a'.repeat(40);
    const blobSha = 'b'.repeat(40);
    vi.stubGlobal('fetch', vi.fn(async url => {
      if (String(url).includes('/git/refs/tags/')) {
        return new Response(JSON.stringify({
          object: { sha: tagSha, type: 'tag' },
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        object: { sha: blobSha, type: 'blob' },
      }), { status: 200 });
    }));
    await expect(resolveRefToSha({
      owner: 'o',
      repo: 'r',
      ref: 'v1',
      cwd,
    })).rejects.toThrow(/targets blob, not a commit/);
  });

  it('dereferences an annotated tag to its commit SHA', async () => {
    const tagSha = 'a'.repeat(40);
    const commitSha = 'b'.repeat(40);
    vi.stubGlobal('fetch', vi.fn(async url => {
      if (String(url).includes('/git/refs/tags/')) {
        return new Response(JSON.stringify({
          object: { sha: tagSha, type: 'tag' },
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        object: { sha: commitSha, type: 'commit' },
      }), { status: 200 });
    }));
    await expect(resolveRefToSha({
      owner: 'o',
      repo: 'r',
      ref: 'v1',
      cwd,
    })).resolves.toEqual({ sha: commitSha, type: 'tag' });
  });

  it('uses release publication time when available', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      published_at: '2020-01-02T03:04:05Z',
    }), { status: 200 })));
    await expect(getTagAgeEvidence({
      owner: 'o',
      repo: 'r',
      tag: 'v1.0.0',
      sha: 'a'.repeat(40),
      cwd,
    })).resolves.toEqual({
      dateMs: Date.parse('2020-01-02T03:04:05Z'),
      source: 'release',
    });
  });

  it('persists first-seen evidence for tags without releases', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));
    const input = {
      owner: 'o',
      repo: 'r',
      tag: 'v1.0.0',
      sha: 'a'.repeat(40),
      cwd,
    };
    const first = await getTagAgeEvidence(input);
    const second = await getTagAgeEvidence(input);
    expect(first.source).toBe('first-seen');
    expect(second).toEqual(first);
  });

  it('falls back to first-seen when a release timestamp is invalid', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      published_at: 'not-a-date',
    }), { status: 200 })));
    await expect(getTagAgeEvidence({
      owner: 'o',
      repo: 'r',
      tag: 'v1.0.0',
      sha: 'a'.repeat(40),
      cwd,
    })).resolves.toMatchObject({ source: 'first-seen' });
  });
});
