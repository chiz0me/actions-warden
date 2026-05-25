import { describe, it, expect } from 'vitest';
import { toonLine, renderToon, renderJson, summarize } from '../src/lib/formatter.js';

describe('toonLine', () => {
  it('renders bare key=value pairs', () => {
    expect(toonLine('FINDING', { type: 'unpinned', sev: 'high' }))
      .toBe('FINDING: type=unpinned sev=high');
  });

  it('quotes values containing spaces', () => {
    expect(toonLine('X', { msg: 'hello world' })).toBe('X: msg="hello world"');
  });

  it('omits null and empty values', () => {
    expect(toonLine('X', { a: 'v', b: null, c: '', d: undefined })).toBe('X: a=v');
  });

  it('escapes embedded quotes', () => {
    expect(toonLine('X', { msg: 'a "b" c' })).toBe('X: msg="a \\"b\\" c"');
  });

  it('redacts secret-shaped values', () => {
    const line = toonLine('X', { token: 'ghp_abcdefghijklmnopqrstuvwxyz0123456789' });
    expect(line).toContain('<redacted>');
  });
});

describe('renderToon', () => {
  it('appends STATUS: OK trailer', () => {
    const out = renderToon([{ label: 'X', fields: { a: 1 } }], { status: 'OK' });
    expect(out).toBe('X: a=1\nSTATUS: OK\n');
  });
});

describe('renderJson', () => {
  it('is valid JSON', () => {
    const out = renderJson({ a: 1, b: ['x'] });
    expect(JSON.parse(out)).toEqual({ a: 1, b: ['x'] });
  });
});

describe('summarize', () => {
  it('counts severity buckets', () => {
    expect(summarize([
      { severity: 'critical' },
      { severity: 'high' },
      { severity: 'high' },
      { severity: 'low' },
    ])).toEqual({ critical: 1, high: 2, medium: 0, low: 1 });
  });
});
