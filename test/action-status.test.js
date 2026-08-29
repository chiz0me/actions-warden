import { describe, expect, it } from 'vitest';
import { shouldFailAction } from '../src/lib/action-status.js';

describe('JavaScript Action exit status', () => {
  it('allows findings-only audit failures to be advisory', () => {
    expect(shouldFailAction({
      command: 'audit',
      failOnFindings: false,
      result: {
        status: 'FAIL',
        findings: [{ ruleId: 'unpinned-action' }],
      },
    })).toBe(false);
  });

  it('never masks audit parse errors', () => {
    expect(shouldFailAction({
      command: 'audit',
      failOnFindings: false,
      result: {
        status: 'FAIL',
        findings: [{ ruleId: 'parse-error' }],
      },
    })).toBe(true);
  });

  it('never masks report resolution errors', () => {
    expect(shouldFailAction({
      command: 'report',
      failOnFindings: false,
      result: {
        status: 'FAIL',
        audit: { findings: [] },
        pin: { errors: [{ error: '404' }] },
        upgrade: { errors: [] },
      },
    })).toBe(true);
  });

  it('allows organization findings to be advisory but never masks scan errors', () => {
    expect(shouldFailAction({
      command: 'org-scan',
      failOnFindings: false,
      result: {
        status: 'FAIL',
        findings: [{ ruleId: 'unpinned-action' }],
        errors: [],
      },
    })).toBe(false);
    expect(shouldFailAction({
      command: 'org-scan',
      failOnFindings: false,
      result: {
        status: 'FAIL',
        findings: [],
        errors: [{ repository: 'octo-org/private', error: 'HTTP 403' }],
      },
    })).toBe(true);
  });
});
