import { describe, it, expect } from 'vitest';
import { redact, redactDeep } from '../src/lib/redact.js';

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

  it('redacts underscore-delimited credential keys', () => {
    for (const key of [
      'access_token',
      'refresh_token',
      'client_secret',
      'AWS_SECRET_ACCESS_KEY',
    ]) {
      expect(redact(`${key}=credential-value`)).toBe(`${key}=<redacted>`);
    }
  });

  it('redacts common provider tokens and JWTs', () => {
    const credentials = [
      `sk_live_${'a'.repeat(24)}`,
      `AIza${'A'.repeat(31)}`,
      `ya29.${'b'.repeat(24)}`,
      `npm_${'c'.repeat(24)}`,
      `eyJ${'a'.repeat(12)}.${'b'.repeat(12)}.${'c'.repeat(12)}`,
      'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    ];
    for (const credential of credentials) {
      expect(redact(`value=${credential}`)).not.toContain(credential);
    }
  });

  it('redacts high-entropy values but preserves commit SHAs and digests', () => {
    expect(redact('value=Ab3+/xyZ9_Qp7Lm2Nc8Vr5Ts1Ju4Kz0W'))
      .toBe('value=<redacted>');
    expect(redact('a'.repeat(40))).toBe('a'.repeat(40));
    expect(redact('b'.repeat(64))).toBe('b'.repeat(64));
  });

  it('redacts values based on object key names', () => {
    expect(redactDeep({ access_token: 'short', nested: { client_secret: 'also-short' } }))
      .toEqual({
        access_token: '<redacted>',
        nested: { client_secret: '<redacted>' },
      });
  });

  it('preserves repeated references while still breaking real cycles', () => {
    const shared = { value: 'safe' };
    const input = { first: shared, second: shared };
    input.self = input;
    expect(redactDeep(input)).toEqual({
      first: { value: 'safe' },
      second: { value: 'safe' },
      self: '<circular>',
    });
  });

  it('leaves harmless text alone', () => {
    expect(redact('hello world')).toBe('hello world');
  });

  it('preserves the public reusable-workflow rule id', () => {
    expect(redact('reusable-workflow-secrets-inherit'))
      .toBe('reusable-workflow-secrets-inherit');
  });
});
