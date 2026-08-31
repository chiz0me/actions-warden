import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sameFilePath } from '../src/lib/path-equality.js';

describe('sameFilePath', () => {
  let directory;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'aw-path-equality-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('compares prospective paths through their real parents', async () => {
    expect(await sameFilePath(
      join(directory, 'report.json'),
      join(directory, '.', 'report.json'),
    )).toBe(true);
  });

  it('resolves an existing control-file symlink to its target', async () => {
    const target = join(directory, 'policy.yml');
    const link = join(directory, 'policy-link.yml');
    await writeFile(target, 'version: 1\n');
    await symlink(target, link);
    expect(await sameFilePath(target, link)).toBe(true);
  });
});
