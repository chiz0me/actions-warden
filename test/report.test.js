import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { report, renderReport } from '../src/commands/report.js';

describe('report command', () => {
  let cwd;
  let previousCacheDir;
  const oldSha = 'b'.repeat(40);
  const newSha = 'a'.repeat(40);

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'aw-report-'));
    await mkdir(join(cwd, '.github', 'workflows'), { recursive: true });
    await writeFile(join(cwd, '.github', 'workflows', 'ci.yml'), [
      'name: ci',
      'on: push',
      'permissions:',
      '  contents: read',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: octo/action@v1.0.0',
      '',
    ].join('\n'));
    previousCacheDir = process.env.ACTIONS_WARDEN_CACHE_DIR;
    process.env.ACTIONS_WARDEN_CACHE_DIR = join(cwd, 'cache');
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    if (previousCacheDir === undefined) delete process.env.ACTIONS_WARDEN_CACHE_DIR;
    else process.env.ACTIONS_WARDEN_CACHE_DIR = previousCacheDir;
    await rm(cwd, { recursive: true, force: true });
  });

  it('marks network-dependent stages explicitly when offline', async () => {
    const result = await report({ cwd, skipResolve: true, severity: 'high' });
    expect(result.offline).toBe(true);
    const json = JSON.parse(renderReport(result, { format: 'json', mode: 'minor', cwd }));
    expect(json.offline).toBe(true);
    expect(json.pin.changes).toEqual([]);
    expect(json.upgrade.changes).toEqual([]);
  });

  it('composes pin and upgrade into one non-conflicting desired change', async () => {
    vi.stubGlobal('fetch', vi.fn(async url => {
      const text = String(url);
      if (text.includes('/tags?')) {
        return new Response(JSON.stringify([
          { name: 'v1.1.0', commit: { sha: newSha } },
          { name: 'v1.0.0', commit: { sha: oldSha } },
        ]), { status: 200 });
      }
      if (text.includes('/git/refs/tags/v1.0.0')) {
        return new Response(JSON.stringify({
          object: { sha: oldSha, type: 'commit' },
        }), { status: 200 });
      }
      if (text.includes('/git/refs/tags/v1.1.0')) {
        return new Response(JSON.stringify({
          object: { sha: newSha, type: 'commit' },
        }), { status: 200 });
      }
      if (text.includes(`/commits/${oldSha}`)) {
        return new Response(JSON.stringify({ sha: oldSha }), { status: 200 });
      }
      if (text.includes(`/commits/${newSha}`)) {
        return new Response(JSON.stringify({ sha: newSha }), { status: 200 });
      }
      return new Response('{}', { status: 404 });
    }));

    const result = await report({ cwd, mode: 'minor', minAgeDays: 0 });
    expect(result.pin.changes).toHaveLength(0);
    expect(result.upgrade.changes).toHaveLength(1);
    expect(result.upgrade.changes[0].toTag).toBe('v1.1.0');
  });

  it('applies config path filtering to pin and upgrade phases', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await writeFile(join(cwd, '.actions-warden.yml'), [
      'version: 1',
      'ignore-paths:',
      '  - .github/workflows/**',
      '',
    ].join('\n'));
    const result = await report({ cwd });
    expect(result.audit.files).toEqual([]);
    expect(result.pin.changes).toEqual([]);
    expect(result.upgrade.changes).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('explains skipped upgrades and operational failures in line formats', () => {
    const result = {
      audit: {
        findings: [],
        summary: {
          files: 1,
          findings: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
      },
      pin: {
        changes: [],
        errors: [{ file: '/repo/ci.yml', action: 'octo/pin@v1', error: 'pin failed' }],
      },
      upgrade: {
        changes: [],
        skipped: [{
          file: '/repo/ci.yml',
          action: 'octo/upgrade',
          tag: 'v2.0.0',
          reason: 'cooldown',
          ageDays: 2,
          ageSource: 'release',
        }],
        errors: [{ file: '/repo/ci.yml', action: 'octo/upgrade@v1', error: 'upgrade failed' }],
      },
      offline: false,
      status: 'FAIL',
    };

    const toon = renderReport(result, { format: 'toon', mode: 'minor', cwd: '/repo' });
    expect(toon).toContain('SKIP: stage=upgrade');
    expect(toon).toContain('ERROR: stage=pin');
    expect(toon).toContain('ERROR: stage=upgrade');
    expect(toon).toContain('SUMMARY: files=1 findings=0');
    expect(toon).toContain('skipped=1 errors=2');
    expect(toon).toContain('STATUS: FAIL');
  });
});
