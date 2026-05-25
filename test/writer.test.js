import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileGuarded, assertSafePath } from '../src/lib/writer.js';

describe('writeFileGuarded', () => {
  let dir;
  beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'aw-')); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

  it('does not write when dryRun=true (default)', async () => {
    const result = await writeFileGuarded({ path: 'a.txt', content: 'hi', cwd: dir });
    expect(result.dryRun).toBe(true);
    expect(result.written).toBe(false);
    await expect(readFile(join(dir, 'a.txt'), 'utf8')).rejects.toThrow();
  });

  it('writes when dryRun=false', async () => {
    const result = await writeFileGuarded({ path: 'a.txt', content: 'hi', dryRun: false, cwd: dir });
    expect(result.written).toBe(true);
    expect(await readFile(join(dir, 'a.txt'), 'utf8')).toBe('hi');
  });

  it('rejects path traversal', async () => {
    await expect(writeFileGuarded({ path: '../escape.txt', content: 'x', cwd: dir }))
      .rejects.toThrow(/outside/);
  });
});

describe('assertSafePath', () => {
  it('rejects ..', () => {
    expect(() => assertSafePath('../foo')).toThrow();
  });
  it('rejects nulls', () => {
    expect(() => assertSafePath('foo\0bar')).toThrow();
  });
});
