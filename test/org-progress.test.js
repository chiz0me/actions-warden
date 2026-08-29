import { describe, expect, it } from 'vitest';
import { formatOrganizationProgress } from '../src/lib/org-progress.js';

describe('organization progress rendering', () => {
  it('renders repository completion with bounded counters', () => {
    expect(formatOrganizationProgress({
      type: 'repository-completed',
      repository: 'octo-org/app',
      completed: 2,
      total: 5,
      reused: true,
      status: 'FAIL',
      files: 3,
      findings: 4,
      errors: 1,
    })).toBe(
      '[actions-warden] [2/5] resumed octo-org/app: FAIL, 3 files, 4 findings, 1 error\n',
    );
  });

  it('keeps hostile values on one redacted log line', () => {
    const token = `ghp_${'A'.repeat(36)}`;
    const rendered = formatOrganizationProgress({
      type: 'repository-started',
      repository: `octo/app\n::error::${token}`,
      position: 1,
      total: 1,
    });
    expect(rendered.split('\n')).toHaveLength(2);
    expect(rendered).not.toMatch(/\n::error/);
    expect(rendered).not.toContain(token);
  });

  it('describes retry waits without exposing request URLs', () => {
    expect(formatOrganizationProgress({
      type: 'request-retry',
      repository: 'octo-org/app',
      attempt: 2,
      maxRetries: 3,
      reason: 'rate-limit',
      delayMs: 30000,
    })).toContain('GitHub request retry 2/3 after rate-limit (30000ms)');
  });
});
