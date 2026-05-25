import { describe, it, expect } from 'vitest';
import { rewriteUses } from '../src/commands/pin.js';
import { parseActionRef } from '../src/lib/parser.js';

describe('rewriteUses', () => {
  const SHA = 'b4ffde65f46336ab88eb53be808477a3936bae11';

  it('replaces tag with SHA and adds comment', () => {
    const src = '      - uses: actions/checkout@v3\n';
    const ref = parseActionRef('actions/checkout@v3', 1);
    const out = rewriteUses(src, ref, SHA);
    expect(out).toBe(`      - uses: actions/checkout@${SHA} # v3\n`);
  });

  it('preserves quoting', () => {
    const src = `      - uses: "actions/checkout@v3"\n`;
    const ref = parseActionRef('actions/checkout@v3', 1);
    const out = rewriteUses(src, ref, SHA);
    expect(out).toContain(`"actions/checkout@${SHA}"`);
  });

  it('replaces existing inline comment', () => {
    const src = '      - uses: actions/checkout@v3 # old-comment\n';
    const ref = parseActionRef('actions/checkout@v3', 1);
    const out = rewriteUses(src, ref, SHA);
    expect(out).toContain('# v3');
    expect(out).not.toContain('# old-comment');
  });

  it('handles reusable workflow subpaths', () => {
    const src = '      - uses: octo/repo/.github/workflows/deploy.yml@main\n';
    const ref = parseActionRef('octo/repo/.github/workflows/deploy.yml@main', 1);
    const out = rewriteUses(src, ref, SHA);
    expect(out).toContain(`octo/repo/.github/workflows/deploy.yml@${SHA} # main`);
  });
});
