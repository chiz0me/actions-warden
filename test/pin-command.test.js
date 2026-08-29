import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { audit } from '../src/commands/audit.js';
import { pin } from '../src/commands/pin.js';

describe('pin command targeting', () => {
  let cwd;
  let workflow;
  let previousCacheDir;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'aw-pin-command-'));
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
      '      - uses: actions/checkout@v3',
      '      - uses: actions/checkout@v3',
      '',
    ].join('\n'));
    previousCacheDir = process.env.ACTIONS_WARDEN_CACHE_DIR;
    process.env.ACTIONS_WARDEN_CACHE_DIR = join(cwd, 'cache');
    vi.stubGlobal('fetch', vi.fn(async url => {
      const sha = 'a'.repeat(40);
      if (String(url).includes('/commits/')) {
        return new Response(JSON.stringify({ sha }), { status: 200 });
      }
      return new Response(JSON.stringify({
        object: { sha, type: 'commit' },
      }), { status: 200 });
    }));
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    if (previousCacheDir === undefined) delete process.env.ACTIONS_WARDEN_CACHE_DIR;
    else process.env.ACTIONS_WARDEN_CACHE_DIR = previousCacheDir;
    await rm(cwd, { recursive: true, force: true });
  });

  it('uses the audit finding ID to target exactly one pin occurrence', async () => {
    const auditResult = await audit({ cwd });
    const findings = auditResult.findings.filter(f => f.ruleId === 'unpinned-action');
    expect(findings).toHaveLength(2);
    expect(findings[0].id).not.toBe(findings[1].id);

    const result = await pin({ cwd, dryRun: true, fix: findings[1].id });
    expect(result.status).toBe('OK');
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].id).toBe(findings[1].id);
    expect(result.changes[0].line).toBe(10);
  });

  it('fails when a requested fix ID does not exist', async () => {
    const result = await pin({ cwd, dryRun: true, fix: 'not-a-real-id' });
    expect(result.status).toBe('FAIL');
    expect(result.errors[0].error).toMatch(/fix id not found/);
  });

  it('keeps earlier file results when a later guarded write fails', async () => {
    const later = join(cwd, '.github', 'workflows', 'z-later.yml');
    const outside = await mkdtemp(join(tmpdir(), 'aw-pin-outside-'));
    const outsideTarget = join(outside, 'target.yml');
    await writeFile(outsideTarget, 'unchanged\n');
    await writeFile(later, [
      'name: later',
      'on: push',
      'permissions: {}',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: octo/action@v1',
      '',
    ].join('\n'));

    vi.stubGlobal('fetch', vi.fn(async url => {
      const text = String(url);
      const sha = text.includes('/octo/action/') ? 'b'.repeat(40) : 'a'.repeat(40);
      if (text.includes('/repos/octo/action/commits/')) {
        await unlink(later);
        await symlink(outsideTarget, later);
        return new Response(JSON.stringify({ sha }), { status: 200 });
      }
      if (text.includes('/commits/')) {
        return new Response(JSON.stringify({ sha }), { status: 200 });
      }
      return new Response(JSON.stringify({
        object: { sha, type: 'commit' },
      }), { status: 200 });
    }));

    const result = await pin({
      cwd,
      workflows: [workflow, later],
      dryRun: false,
    });
    expect(result.status).toBe('FAIL');
    expect(result.changes).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toMatch(/z-later\.yml$/);
    expect(result.errors[0].error).toMatch(/symlink/);
    expect(await readFile(workflow, 'utf8')).toContain('actions/checkout@aaaaaaaa');
    expect(await readFile(outsideTarget, 'utf8')).toBe('unchanged\n');
    await rm(outside, { recursive: true, force: true });
  });
});
