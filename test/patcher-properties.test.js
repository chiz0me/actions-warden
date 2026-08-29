import { describe, expect, it } from 'vitest';
import { rewriteUses } from '../src/commands/pin.js';
import { collectUses, parseActionRef, parseWorkflowSource } from '../src/lib/parser.js';
import { readVersionComment } from '../src/lib/patcher.js';

const SHA = 'b4ffde65f46336ab88eb53be808477a3936bae11';
const quotes = ['', "'", '"'];
const comments = [
  '',
  ' # rationale ✓',
  ' # v1',
  ' # actions-warden-ref: v0; rationale ✓',
];
const newlines = ['\n', '\r\n'];

describe('exact patching properties', () => {
  it('preserves valid YAML and unrelated bytes across scalar variants', () => {
    for (const quote of quotes) {
      for (const comment of comments) {
        for (const newline of newlines) {
          const source = [
            'name: "unicode ✓"',
            'on: push',
            'permissions: {}',
            'jobs:',
            '  test:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            '      - name: before',
            '        run: echo "unchanged # text"',
            `      - uses: ${quote}octo/action@v1${quote}${comment}`,
            '      - name: after',
            '        run: echo done',
            '',
          ].join(newline);
          const workflow = parseWorkflowSource(source, 'generated.yml');
          const [occurrence] = collectUses(workflow);
          const rewritten = rewriteUses(source, occurrence.ref, SHA);
          const reparsed = parseWorkflowSource(rewritten, 'generated.yml');

          expect(collectUses(reparsed)[0].ref.ref).toBe(SHA);
          expect(rewritten).toContain('run: echo "unchanged # text"');
          expect(rewritten).toContain('name: "unicode ✓"');
          expect(readVersionComment(rewritten, collectUses(reparsed)[0].ref)).toBe('v1');
          if (comment.includes('rationale')) expect(rewritten).toContain('rationale ✓');
          if (newline === '\r\n') expect(rewritten).toContain('\r\n');
        }
      }
    }
  });

  it('derives a missing line end before adding version metadata', () => {
    const source = [
      'steps:',
      '  - uses: octo/action@v1',
      '  - run: echo done # keep',
      '',
    ].join('\n');
    const raw = 'octo/action@v1';
    const start = source.indexOf(raw);
    const rewritten = rewriteUses(source, {
      ...parseActionRef(raw, 2),
      start,
      end: start + raw.length,
    }, SHA);
    expect(rewritten).toContain(`uses: octo/action@${SHA} # actions-warden-ref: v1`);
    expect(rewritten).toContain('run: echo done # keep');
  });
});
