import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runOrganizationScan } from '../src/lib/org-run.js';

const LABELS = { output: '--output-path', checkpoint: '--checkpoint', resume: '--resume' };

describe('organization scan runner', () => {
  let cwd;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'aw-org-run-'));
    await mkdir(join(cwd, '.github/workflows'), { recursive: true });
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  function options(overrides = {}) {
    return {
      scan: {
        organization: 'octo-org',
        cwd,
        visibility: 'all',
        includeArchived: false,
        includeDisabled: false,
        includeForks: false,
        explain: false,
        configPath: false,
      },
      scanOrganization: vi.fn(async () => fakeResult()),
      format: 'json',
      output: 'file',
      labels: LABELS,
      openProgress: () => ({ emit: vi.fn(), failScan: vi.fn() }),
      ...overrides,
    };
  }

  it('selects scope-keyed automatic artifacts and resumes an existing checkpoint', async () => {
    const first = await runOrganizationScan(options());
    expect(first.reportPath).toMatch(
      /^\.actions-warden-org-scan(?:\.[0-9a-f]{8}){4}\.report\.json$/,
    );
    expect(first.checkpointPath).toMatch(
      /^\.actions-warden-org-scan(?:\.[0-9a-f]{8}){4}\.checkpoint\.json$/,
    );
    expect(first.resumed).toBe(false);
    expect(first.outputDestination.path).toBe(join(cwd, first.reportPath));

    await writeFile(join(cwd, first.checkpointPath), '{}');
    const second = await runOrganizationScan(options());
    expect(second.checkpointPath).toBe(first.checkpointPath);
    expect(second.resumed).toBe(true);

    const fresh = await runOrganizationScan(options({ fresh: true }));
    expect(fresh.resumed).toBe(false);
    const stateless = await runOrganizationScan(options({ autoCheckpoint: false }));
    expect(stateless).toMatchObject({ checkpointPath: null, resumed: false });
    expect(stateless.checkpointDestination).toBeNull();
  });

  it('resumes an explicit checkpoint only if it exists, and always a resume path', async () => {
    const missing = await runOrganizationScan(options({ checkpointPath: 'scan.json' }));
    expect(missing.resumed).toBe(false);
    await writeFile(join(cwd, 'scan.json'), '{}');
    const existing = await runOrganizationScan(options({ checkpointPath: 'scan.json' }));
    expect(existing.resumed).toBe(true);
    const forced = await runOrganizationScan(options({ resumePath: 'scan.json', fresh: true }));
    expect(forced.resumed).toBe(true);
  });

  it('prints to stdout without choosing a report destination', async () => {
    const run = await runOrganizationScan(options({ output: 'stdout', autoCheckpoint: false }));
    expect(run.reportPath).toBeUndefined();
    expect(run.outputDestination).toBeNull();
  });

  it.each([
    ['a workflow path', { outputPath: '.github/workflows/ci.yml' },
      '--output-path cannot use a default workflow discovery path'],
    ['a reserved config path', { checkpointPath: '.actions-warden.yml' },
      '--checkpoint cannot replace the reserved config path'],
    ['the checkpoint path', { outputPath: 'scan.json', checkpointPath: 'scan.json' },
      'checkpoint and report output paths must be different'],
    ['the previous report', { outputPath: 'prior.json', previousReportPath: 'prior.json' },
      'output and previous report paths must be different'],
    ['the previous report as checkpoint',
      { checkpointPath: 'prior.json', previousReportPath: 'prior.json' },
      'checkpoint and previous report paths must be different'],
  ])('refuses %s before any scan work', async (_name, overrides, message) => {
    const request = options(overrides);
    await expect(runOrganizationScan(request)).rejects.toThrow(message);
    expect(request.scanOrganization).not.toHaveBeenCalled();
  });

  it('uses the caller labels in destination errors', async () => {
    const request = options({
      outputPath: '.github/workflows/ci.yml',
      labels: { output: 'output-path', checkpoint: 'checkpoint-path', resume: 'resume-from' },
    });
    await expect(runOrganizationScan(request))
      .rejects.toThrow('output-path cannot use a default workflow discovery path');
  });

  it('rejects a report directory that overlaps the checkpoint before scanning', async () => {
    await mkdir(join(cwd, 'reports'));
    const request = options({
      output: 'file',
      reportDirectory: 'reports',
      checkpointPath: 'reports/scan.json',
    });
    await expect(runOrganizationScan(request))
      .rejects.toThrow('--report-dir cannot overlap the checkpoint');
    expect(request.scanOrganization).not.toHaveBeenCalled();

    const dedicated = await runOrganizationScan(options({
      reportDirectory: 'reports',
      autoCheckpoint: false,
    }));
    expect(dedicated.reportDirectory).toBe(join(cwd, 'reports'));
    expect(dedicated.outputDestination).toBeNull();
  });

  it('counts reused repositories and forwards every progress event', async () => {
    const progress = { emit: vi.fn(), failScan: vi.fn() };
    const events = [
      { type: 'repository-completed', reused: true },
      { type: 'repository-completed', reused: false },
      { type: 'repository-completed', reused: true },
    ];
    const run = await runOrganizationScan(options({
      openProgress: () => progress,
      scanOrganization: async scan => {
        for (const event of events) scan.onProgress(event);
        return fakeResult();
      },
    }));
    expect(run.repositoriesReused).toBe(2);
    expect(progress.emit.mock.calls.map(([event]) => event)).toEqual(events);
  });

  it('reports a failed scan to the progress channel and rethrows it', async () => {
    const progress = { emit: vi.fn(), failScan: vi.fn() };
    const failure = new Error('discovery failed');
    await expect(runOrganizationScan(options({
      openProgress: () => progress,
      scanOrganization: async () => { throw failure; },
    }))).rejects.toBe(failure);
    expect(progress.failScan).toHaveBeenCalledWith('octo-org', failure);
  });

  it('does not open progress when preflight fails', async () => {
    const openProgress = vi.fn();
    await expect(runOrganizationScan(options({
      outputPath: '.github/workflows/ci.yml',
      openProgress,
    }))).rejects.toThrow('default workflow discovery path');
    expect(openProgress).not.toHaveBeenCalled();
  });

  it('passes the selected checkpoint to the scan', async () => {
    const scanOrganization = vi.fn(async () => fakeResult());
    await writeFile(join(cwd, 'scan.json'), '{}');
    await runOrganizationScan(options({ scanOrganization, checkpointPath: 'scan.json' }));
    expect(scanOrganization).toHaveBeenCalledWith(expect.objectContaining({
      organization: 'octo-org',
      checkpointPath: 'scan.json',
      resume: true,
      onProgress: expect.any(Function),
    }));
  });
});

function fakeResult() {
  return {
    organization: 'octo-org',
    status: 'OK',
    configPath: null,
    baseline: { path: null },
    summary: {},
    coverage: {},
  };
}
