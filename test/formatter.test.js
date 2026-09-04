import { describe, it, expect } from 'vitest';
import {
  format,
  renderCsv,
  renderHtml,
  renderJson,
  renderToon,
  summarize,
  toonLine,
} from '../src/lib/formatter.js';

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

  it('escapes newlines so values cannot forge records', () => {
    const line = toonLine('X', { msg: 'safe\nSTATUS: OK' });
    expect(line).toBe('X: msg="safe\\nSTATUS: OK"');
    expect(line.split('\n')).toHaveLength(1);
  });

  it('sanitizes record keys containing spaces or special characters', () => {
    const line = toonLine('X', { 'bad key name': 'value', 'k=v': '1' });
    expect(line).toBe('X: bad_key_name=value k_v=1');
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

  it('deeply redacts secret-shaped strings', () => {
    const out = renderJson({
      nested: { token: 'ghp_0123456789abcdefghijklmnopqrstuvwxyz' },
    });
    expect(out).not.toContain('ghp_');
    expect(JSON.parse(out).nested.token).toBe('<redacted>');
  });
});

describe('renderCsv', () => {
  it('renders deterministic, flat records with an explicit status row', () => {
    const records = [{
      label: 'FINDING',
      fields: {
        repo: 'octo-org/app',
        file: 'workflow,one.yml',
        line: 7,
        id: 'abc123',
        sev: 'high',
        delta: -7,
        nested: { enabled: true },
      },
    }];

    const csv = renderCsv(records, { status: 'FAIL' });

    expect(csv).toBe(renderCsv(records, { status: 'FAIL' }));
    expect(csv).toBe([
      'record_type,status,repo,file,line,id,sev,delta,nested',
      'FINDING,,octo-org/app,"workflow,one.yml",7,abc123,high,-7,"{""enabled"":true}"',
      'STATUS,FAIL,,,,,,,',
      '',
    ].join('\r\n'));
    expect(format('csv', records, { status: 'FAIL' })).toBe(csv);
  });

  it('redacts secrets and neutralizes formulas and forged log lines', () => {
    const token = `ghp_${'x'.repeat(36)}`;
    const csv = renderCsv([{
      label: 'FINDING',
      fields: {
        msg: 'say "hello"\n::error::forged',
        formula: '  =HYPERLINK("https://example.invalid")',
        plus: '+cmd',
        minus: '-cmd',
        at: '@cmd',
        secret: token,
      },
    }], { status: 'FAIL' });

    expect(csv).not.toContain(token);
    expect(csv).not.toContain('\n::error::forged');
    expect(csv).toContain('\\n::error::forged');
    expect(csv).toContain("'  =HYPERLINK");
    expect(csv).toContain("'+cmd");
    expect(csv).toContain("'-cmd");
    expect(csv).toContain("'@cmd");
    expect(csv).toContain('<redacted>');
    expect(csv.split('\r\n')).toHaveLength(4);
  });
});

describe('renderHtml', () => {
  it('renders deterministic, filterable, self-contained reports', () => {
    const records = [
      {
        label: 'FINDING',
        fields: {
          id: 'abc123',
          repo: 'octo-org/app',
          type: 'unpinned-action',
          sev: 'high',
          file: 'octo-org/app/.github/workflows/ci.yml',
          url: 'https://github.com/octo-org/app/blob/main/.github/workflows/ci.yml#L8',
        },
      },
      { label: 'SUMMARY', fields: { findings: 1, errors: 0, high: 1 } },
    ];
    const options = {
      status: 'FAIL',
      title: 'Organization scan: octo-org',
      metadata: { visibility: 'all' },
    };

    const html = renderHtml(records, options);

    expect(html).toBe(renderHtml(records, options));
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain('Filter records');
    expect(html).toContain('Rule breakdown');
    expect(html).toContain('data-repository="octo-org/app"');
    expect(html).toContain('href="https://github.com/octo-org/app/blob/main/');
    expect(format('html', records, options)).toBe(html);
  });

  it('redacts and escapes untrusted markup without creating unsafe links', () => {
    const token = `ghp_${'x'.repeat(36)}`;
    const html = renderHtml([{
      label: 'FINDING</script><script>alert(1)</script>',
      fields: {
        msg: `<img src=x onerror=alert(1)> ${token}`,
        url: 'javascript:alert(1)',
      },
    }], { status: 'FAIL', title: '<script>forged</script>' });

    expect(html).not.toContain(token);
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>forged</script>');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('&lt;redacted&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('marks parser findings as incomplete coverage', () => {
    const html = renderHtml([
      { label: 'FINDING', fields: { type: 'parse-error', sev: 'high' } },
      { label: 'SUMMARY', fields: { findings: 1, errors: 0 } },
    ], { status: 'FAIL' });
    expect(html).toContain('Coverage is incomplete');
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
