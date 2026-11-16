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

  describe('GitHub source links', () => {
    const commit = '34e114876b0b11c390a56381ad16ebd13914f8d5';
    const awsSecret = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

    it('keeps permalinks and long branch links the scanner builds', () => {
      for (const link of [
        `https://github.com/octo-org/app/blob/${commit}/.github/workflows/ci.yml#L9`,
        'https://github.com/some-long-organization-name/some-long-repository-name'
          + `/blob/${commit}/.github/workflows/continuous-integration.yml#L120`,
        'https://github.com/some-long-organization-name/some-long-repository-name'
          + '/blob/main/.github/workflows/continuous-integration.yml#L120',
        'https://github.com/octo-org/app/blob/release%2F1.0/.github/actions/setup/action.yml',
      ]) {
        expect(redact(link)).toBe(link);
      }
    });

    it('still redacts secret-like text around or outside such links', () => {
      const link = `https://github.com/octo-org/app/blob/${commit}/ci.yml`;
      expect(redact(`${link} ${awsSecret}`)).toBe(`${link} <redacted>`);
      expect(redact(`key ${awsSecret} here`)).toBe('key <redacted> here');
      expect(redact(`https://example.com/blob/${commit}/${awsSecret}`)).not.toContain(awsSecret);
      expect(redact(`https://github.com/octo-org/app/tree/${commit}/${awsSecret}`))
        .not.toContain(awsSecret);
    });

    it('still applies token patterns inside a source link', () => {
      const token = `ghp_${'A1b2C3d4E5'.repeat(4)}`;
      const redacted = redact(`https://github.com/octo-org/app/blob/${commit}/${token}.yml`);
      expect(redacted).not.toContain(token);
      expect(redacted).toContain('<redacted>');
    });
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

  it('preserves public organization report schema discriminators', () => {
    for (const value of [
      'actions-warden-agent-receipt',
      'actions-warden-org-scan-receipt',
      'actions-warden-org-scan-directory',
      'actions-warden-org-scan-manifest',
      'actions-warden-org-scan-progress',
      'actions-warden-org-scan-repository',
    ]) {
      expect(redact(value)).toBe(value);
    }
  });

  it('redacts Dates, Errors, Sets, and Maps safely in redactDeep', () => {
    const date = new Date('2026-09-04T00:00:00.000Z');
    const error = new Error('error with ghp_0123456789abcdefghijklmnopqrstuvwxyz');
    const set = new Set(['hello', 'ghp_0123456789abcdefghijklmnopqrstuvwxyz']);
    const map = new Map([
      ['secret_token', 'my-secret'],
      ['safe_key', 'safe_value'],
    ]);

    expect(redactDeep({
      date,
      error,
      set,
      map,
    })).toEqual({
      date: '2026-09-04T00:00:00.000Z',
      error: {
        name: 'Error',
        message: 'error with <redacted>',
      },
      set: ['hello', '<redacted>'],
      map: {
        secret_token: '<redacted>',
        safe_key: 'safe_value',
      },
    });
  });
});
