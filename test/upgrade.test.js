import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { upgrade } from '../src/commands/upgrade.js';

describe('upgrade command', () => {
  let cwd;
  let workflow;
  let previousCacheDir;
  const oldSha = 'b'.repeat(40);
  const newSha = 'a'.repeat(40);

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'aw-upgrade-'));
    workflow = join(cwd, '.github', 'workflows', 'ci.yml');
    await mkdir(join(cwd, '.github', 'workflows'), { recursive: true });
    await writeFile(workflow, [
      'name: ci',
      'on: push',
      'permissions:',
      '  contents: read',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      `      - uses: octo/action@${oldSha} # actions-warden-ref: v1.0.0; rationale`,
      '',
    ].join('\n'));
    previousCacheDir = process.env.ACTIONS_WARDEN_CACHE_DIR;
    process.env.ACTIONS_WARDEN_CACHE_DIR = join(cwd, 'cache');
    vi.stubGlobal('fetch', vi.fn(async url => {
      const text = String(url);
      if (text.includes('/tags?')) {
        return new Response(JSON.stringify([
          { name: 'v1.1.0', commit: { sha: newSha } },
          { name: 'v1.0.0', commit: { sha: oldSha } },
        ]), { status: 200 });
      }
      if (text.includes('/releases/tags/')) {
        return new Response(JSON.stringify({
          published_at: '2020-01-01T00:00:00Z',
        }), { status: 200 });
      }
      if (text.includes('/git/refs/tags/')) {
        return new Response(JSON.stringify({
          object: { sha: newSha, type: 'commit' },
        }), { status: 200 });
      }
      if (text.includes('/commits/')) {
        return new Response(JSON.stringify({ sha: newSha }), { status: 200 });
      }
      return new Response('{}', { status: 404 });
    }));
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    if (previousCacheDir === undefined) delete process.env.ACTIONS_WARDEN_CACHE_DIR;
    else process.env.ACTIONS_WARDEN_CACHE_DIR = previousCacheDir;
    await rm(cwd, { recursive: true, force: true });
  });

  it('plans then applies one exact upgrade while preserving comments', async () => {
    const plan = await upgrade({ cwd, dryRun: true, mode: 'minor', minAgeDays: 7 });
    expect(plan.status).toBe('OK');
    expect(plan.changes).toHaveLength(1);
    expect(plan.changes[0]).toMatchObject({
      fromVersion: 'v1.0.0',
      toTag: 'v1.1.0',
      toSha: newSha,
    });
    expect(await readFile(workflow, 'utf8')).toContain(oldSha);

    const applied = await upgrade({
      cwd,
      dryRun: false,
      mode: 'minor',
      minAgeDays: 7,
      fix: plan.changes[0].id,
    });
    expect(applied.status).toBe('OK');
    const source = await readFile(workflow, 'utf8');
    expect(source).toContain(`octo/action@${newSha}`);
    expect(source).toContain('actions-warden-ref: v1.1.0; rationale');
  });

  it('fails for an unknown upgrade fix ID', async () => {
    const result = await upgrade({
      cwd,
      dryRun: true,
      mode: 'minor',
      minAgeDays: 0,
      fix: 'unknown',
    });
    expect(result.status).toBe('FAIL');
    expect(result.errors.at(-1).error).toMatch(/fix id not found/);
    expect(fetch).not.toHaveBeenCalled();
  });
});
