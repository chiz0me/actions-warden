import { describe, expect, it, vi } from 'vitest';
import { Writable } from 'node:stream';
import {
  createOrganizationProgressReporter,
  formatOrganizationProgress,
  normalizeOrganizationProgressMode,
  resolveOrganizationProgressMode,
} from '../src/lib/org-progress.js';

describe('organization progress reporting', () => {
  it('resolves explicit contexts and compatibility aliases without heuristics', () => {
    expect(normalizeOrganizationProgressMode('always')).toBe('plain');
    expect(normalizeOrganizationProgressMode('never')).toBe('none');
    expect(resolveOrganizationProgressMode({ mode: 'auto', context: 'agent', isTTY: true }))
      .toBe('none');
    expect(resolveOrganizationProgressMode({ mode: 'auto', context: 'ci', isTTY: false }))
      .toBe('plain');
    expect(resolveOrganizationProgressMode({
      mode: 'auto',
      context: 'interactive',
      isTTY: false,
    })).toBe('plain');
    expect(resolveOrganizationProgressMode({ mode: 'auto', context: 'auto', isTTY: true }))
      .toBe('plain');
    expect(resolveOrganizationProgressMode({ mode: 'auto', context: 'auto', isTTY: false }))
      .toBe('none');
    expect(() => resolveOrganizationProgressMode({ context: 'automatic' }))
      .toThrow(/progress context must be/);
  });

  it('writes metadata-complete, redacted JSON Lines', () => {
    let output = '';
    let clock = Date.parse('2026-09-02T00:00:00.000Z');
    const token = `ghp_${'a'.repeat(36)}`;
    const reporter = createOrganizationProgressReporter({
      mode: 'json',
      stream: { write: value => { output += value; } },
      now: () => (clock += 25),
    });
    reporter.emit({
      type: 'repository-phase',
      schemaVersion: 'forged',
      kind: 'forged',
      event: 'forged',
      timestamp: 'forged',
      elapsedMs: -1,
      organization: 'example',
      repository: 'example/app',
      phase: `downloading ${token}`,
      position: 1,
      total: 2,
    });

    const event = JSON.parse(output.trim());
    expect(event).toMatchObject({
      schemaVersion: '1.0',
      kind: 'actions-warden-org-scan-progress',
      event: 'repository-phase',
      organization: 'example',
      repository: 'example/app',
      elapsedMs: 25,
    });
    expect(event.timestamp).toBe('2026-09-02T00:00:00.050Z');
    expect(event.phase).toContain('<redacted>');
    expect(output).not.toContain(token);
  });

  it('keeps human progress single-line and disables a failed stream', () => {
    expect(formatOrganizationProgress({
      type: 'checkpoint-written',
      repository: 'example/app\nforged',
      repositories: 2,
      total: 3,
    })).toBe('[actions-warden] example/app forged: checkpoint durable (2/3 repositories)\n');

    const write = vi.fn(() => {
      throw new Error('closed');
    });
    const reporter = createOrganizationProgressReporter({ mode: 'plain', stream: { write } });
    expect(reporter.emit({ type: 'scan-started', organization: 'example' })).toBeNull();
    expect(reporter.emit({ type: 'scan-started', organization: 'example' })).toBeNull();
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('keeps its error handler through a real asynchronous Writable failure', async () => {
    const failure = Object.assign(new Error('write EPIPE'), { code: 'EPIPE' });
    const stream = new Writable({
      write(_chunk, _encoding, callback) {
        setImmediate(() => callback(failure));
      },
    });
    const reporter = createOrganizationProgressReporter({ mode: 'plain', stream });
    const reporterErrorListener = stream.listeners('error')[0];
    expect(reporterErrorListener).toBeTypeOf('function');

    const errorObserved = new Promise(resolve => {
      stream.once('error', error => resolve({
        error,
        reporterStillAttached: stream.listeners('error').includes(reporterErrorListener),
      }));
    });
    const streamClosed = new Promise(resolve => stream.once('close', resolve));

    reporter.emit({ type: 'scan-started', organization: 'example' });
    reporter.close();
    expect(stream.listeners('error')).toContain(reporterErrorListener);

    const observed = await errorObserved;
    expect(observed).toEqual({ error: failure, reporterStillAttached: true });
    await streamClosed;
    await new Promise(resolve => setImmediate(resolve));
    expect(stream.listeners('error')).not.toContain(reporterErrorListener);
    expect(reporter.emit({ type: 'scan-started', organization: 'example' })).toBeNull();
  });
});
