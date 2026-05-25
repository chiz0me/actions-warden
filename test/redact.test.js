import { describe, it, expect } from 'vitest';
import { redact } from '../src/lib/redact.js';

describe('redact', () => {
  it('redacts GitHub PATs', () => {
    expect(redact('header: ghp_0123456789abcdefghijklmnopqrstuvwxyz'))
      .toBe('header: <redacted>');
  });

  it('redacts AWS access keys', () => {
    expect(redact('akey=AKIA1234567890ABCDEF')).toContain('<redacted>');
  });

  it('redacts token=value pairs', () => {
    expect(redact('token=hunter2')).toBe('token=<redacted>');
    expect(redact('password: "secret123"')).toContain('<redacted>');
  });

  it('leaves harmless text alone', () => {
    expect(redact('hello world')).toBe('hello world');
  });
});
