import { describe, it, expect } from 'vitest';
import { parseIgnoreDirectives, isIgnored } from '../src/lib/ignore.js';
import { audit } from '../src/commands/audit.js';
import { writeFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('parseIgnoreDirectives', () => {
  it('silences the whole file', () => {
    const scope = parseIgnoreDirectives('# actions-warden-ignore-file\n- uses: a/b@v1\n');
    expect(scope.wholeFile).toBe(true);
    expect(isIgnored(scope, 2, 'any-rule')).toBe(true);
  });

  it('silences a block between start and end', () => {
    const src = [
      '# actions-warden-ignore-start',
      '- uses: a/b@v1',
      '- uses: c/d@v2',
      '# actions-warden-ignore-end',
      '- uses: e/f@v3',
    ].join('\n');
    const scope = parseIgnoreDirectives(src);
    expect(isIgnored(scope, 2, 'unpinned-action')).toBe(true);
    expect(isIgnored(scope, 3, 'unpinned-action')).toBe(true);
    expect(isIgnored(scope, 5, 'unpinned-action')).toBe(false);
  });

  it('silences the next non-comment line', () => {
    const src = [
      '# actions-warden-ignore-next-line',
      '',
      '# comment',
      '- uses: a/b@v1',
      '- uses: c/d@v2',
    ].join('\n');
    const scope = parseIgnoreDirectives(src);
    expect(isIgnored(scope, 4, 'unpinned-action')).toBe(true);
    expect(isIgnored(scope, 5, 'unpinned-action')).toBe(false);
  });

  it('silences inline on the same line', () => {
    const src = '- uses: a/b@v1  # actions-warden-ignore\n';
    const scope = parseIgnoreDirectives(src);
    expect(isIgnored(scope, 1, 'unpinned-action')).toBe(true);
  });

  it('respects rule-id filters', () => {
    const src = '- uses: a/b@v1  # actions-warden-ignore: secrets-in-env\n';
    const scope = parseIgnoreDirectives(src);
    expect(isIgnored(scope, 1, 'unpinned-action')).toBe(false);
    expect(isIgnored(scope, 1, 'secrets-in-env')).toBe(true);
  });

  it('accepts the short aw- prefix', () => {
    const scope = parseIgnoreDirectives('# aw-ignore-file\n');
    expect(scope.wholeFile).toBe(true);
  });
});

describe('audit honors ignore directives', () => {
  it('drops findings on ignored lines', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'aw-ign-'));
    await mkdir(join(tmp, '.github', 'workflows'), { recursive: true });
    const wf = join(tmp, '.github/workflows/x.yml');
    await writeFile(wf, [
      'name: x',
      'on: push',
      'permissions:',
      '  contents: read',
      'jobs:',
      '  b:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v3 # actions-warden-ignore: unpinned-action',
      '      - uses: actions/setup-node@v4',
      '',
    ].join('\n'));
    const result = await audit({ cwd: tmp });
    const unpinned = result.findings.filter(f => f.ruleId === 'unpinned-action');
    expect(unpinned).toHaveLength(1);
    expect(unpinned[0].line).toBe(10);
    await rm(tmp, { recursive: true, force: true });
  });
});
