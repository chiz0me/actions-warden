import { describe, it, expect } from 'vitest';
import { rewriteUses } from '../src/commands/pin.js';
import { collectUses, parseActionRef, parseWorkflowSource } from '../src/lib/parser.js';

describe('rewriteUses', () => {
  const SHA = 'b4ffde65f46336ab88eb53be808477a3936bae11';

  it('replaces tag with SHA and adds comment', () => {
    const src = '      - uses: actions/checkout@v3\n';
    const ref = parseActionRef('actions/checkout@v3', 1);
    const out = rewriteUses(src, ref, SHA);
    expect(out).toBe(`      - uses: actions/checkout@${SHA} # actions-warden-ref: v3\n`);
  });

  it('preserves quoting', () => {
    const src = `      - uses: "actions/checkout@v3"\n`;
    const ref = parseActionRef('actions/checkout@v3', 1);
    const out = rewriteUses(src, ref, SHA);
    expect(out).toContain(`"actions/checkout@${SHA}"`);
  });

  it('preserves an existing inline comment and adds version metadata', () => {
    const src = '      - uses: actions/checkout@v3 # old-comment\n';
    const ref = parseActionRef('actions/checkout@v3', 1);
    const out = rewriteUses(src, ref, SHA);
    expect(out).toContain('# actions-warden-ref: v3; old-comment');
  });

  it('handles reusable workflow subpaths', () => {
    const src = '      - uses: octo/repo/.github/workflows/deploy.yml@main\n';
    const ref = parseActionRef('octo/repo/.github/workflows/deploy.yml@main', 1);
    const out = rewriteUses(src, ref, SHA);
    expect(out).toContain(`octo/repo/.github/workflows/deploy.yml@${SHA} # actions-warden-ref: main`);
  });

  it('rewrites only the selected duplicate occurrence', () => {
    const src = [
      'jobs:',
      '  a:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v3 # keep-first',
      '      - uses: actions/checkout@v3 # change-second',
      '',
    ].join('\n');
    const doc = parseWorkflowSource(src, 'x.yml');
    const [, second] = collectUses(doc);
    const out = rewriteUses(src, second.ref, SHA);
    expect(out).toContain('actions/checkout@v3 # keep-first');
    expect(out).toContain(`actions/checkout@${SHA} # actions-warden-ref: v3; change-second`);
  });
});
