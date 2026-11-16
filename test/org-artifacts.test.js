import { describe, expect, it } from 'vitest';
import { renderOrganizationScanReceipt } from '../src/lib/org-artifacts.js';
import { VERSION } from '../src/version.js';

const result = {
  organization: 'octo-org',
  status: 'OK',
  summary: { findings: 0 },
  coverage: { complete: true },
};

function receipt(overrides = {}) {
  return JSON.parse(renderOrganizationScanReceipt({
    result,
    startedAt: new Date('2026-11-16T10:00:00.000Z'),
    finishedAt: new Date('2026-11-16T10:00:01.250Z'),
    reportPath: 'report.json',
    reportFormat: 'json',
    checkpointPath: null,
    resumed: false,
    ...overrides,
  }));
}

describe('organization scan receipt provenance', () => {
  it('records the tool version and run timing from the supplied timestamps', () => {
    const value = receipt();
    expect(value.tool).toEqual({ name: 'actions-warden', version: VERSION });
    expect(value.run).toEqual({
      startedAt: '2026-11-16T10:00:00.000Z',
      finishedAt: '2026-11-16T10:00:01.250Z',
      durationMs: 1250,
    });
  });

  it('never reports a negative duration', () => {
    const value = receipt({
      startedAt: new Date('2026-11-16T10:00:05.000Z'),
      finishedAt: new Date('2026-11-16T10:00:04.000Z'),
    });
    expect(value.run.durationMs).toBe(0);
  });

  it('keeps the receipt bounded and in the same envelope as before', () => {
    const value = receipt();
    expect(Object.keys(value)).toEqual([
      'schemaVersion',
      'kind',
      'command',
      'organization',
      'tool',
      'run',
      'status',
      'summary',
      'report',
      'checkpoint',
      'coverage',
    ]);
    expect(value).not.toHaveProperty('findings');
    expect(value).not.toHaveProperty('repositories');
  });
});
