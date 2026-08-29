import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';

const execFileAsync = promisify(execFile);
const cwd = resolve(import.meta.dirname, '..');
const cli = resolve(cwd, 'src/cli.js');
const pkg = JSON.parse(await readFile(resolve(cwd, 'package.json'), 'utf8'));

describe('CLI safety contract', () => {
  it('reports the package version from a single source', async () => {
    const { stdout } = await execFileAsync(process.execPath, [cli, '--version'], { cwd });
    expect(stdout.trim()).toBe(pkg.version);
  });

  it('does not accept a false dry-run value as write authorization', async () => {
    await expect(execFileAsync(process.execPath, [
      cli,
      'pin',
      '--dry-run=false',
      '-w',
      'test/fixtures/clean.yml',
    ], { cwd })).rejects.toMatchObject({ code: 1 });
  });

  it('returns usage error for an unmatched explicit target', async () => {
    await expect(execFileAsync(process.execPath, [
      cli,
      'audit',
      '-w',
      'missing.yml',
    ], { cwd })).rejects.toMatchObject({
      code: 2,
      stderr: expect.stringContaining('no workflows matched'),
    });
  });

  it('requires an output path for file output', async () => {
    await expect(execFileAsync(process.execPath, [
      cli,
      'audit',
      '-w',
      'test/fixtures/clean.yml',
      '--output',
      'file',
    ], { cwd })).rejects.toMatchObject({
      code: 2,
      stderr: expect.stringContaining('--output-path is required'),
    });
  });

  it('validates organization scan limits before making network requests', async () => {
    await expect(execFileAsync(process.execPath, [
      cli,
      'org-scan',
      'octo-org',
      '--concurrency',
      '0',
    ], { cwd })).rejects.toMatchObject({
      code: 2,
      stderr: expect.stringContaining('--concurrency must be a positive integer'),
    });
  });

  it('rejects ambiguous or overlapping organization checkpoint paths', async () => {
    await expect(execFileAsync(process.execPath, [
      cli,
      'org-scan',
      'octo-org',
      '--checkpoint',
      'checkpoint.json',
      '--resume',
      'previous.json',
    ], { cwd })).rejects.toMatchObject({
      code: 2,
      stderr: expect.stringContaining('--checkpoint and --resume cannot be used together'),
    });

    await expect(execFileAsync(process.execPath, [
      cli,
      'org-scan',
      'octo-org',
      '--checkpoint',
      'scan.json',
      '--output',
      'file',
      '--output-path',
      'scan.json',
    ], { cwd })).rejects.toMatchObject({
      code: 2,
      stderr: expect.stringContaining('checkpoint and report output paths must be different'),
    });
  });

  it('keeps forced live progress on stderr and JSON reports clean', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aw-cli-progress-'));
    const preload = pathToFileURL(resolve(cwd, 'test/fixtures/mock-org-fetch.js')).href;
    const common = [
      cli,
      'org-scan',
      'octo-org',
      '--cwd',
      root,
      '--ignore-config',
      '--format',
      'json',
    ];
    const options = {
      cwd,
      env: {
        ...process.env,
        ACTIONS_WARDEN_MODE: '',
        NODE_OPTIONS: `--import=${preload}`,
      },
    };
    try {
      const initial = await execFileAsync(process.execPath, [
        ...common,
        '--checkpoint',
        'scan-checkpoint.json',
        '--progress',
        'never',
      ], options);
      const { stdout, stderr } = await execFileAsync(process.execPath, [
        ...common,
        '--resume',
        'scan-checkpoint.json',
        '--progress',
        'always',
      ], options);
      expect(JSON.parse(stdout)).toMatchObject({
        organization: 'octo-org',
        status: 'OK',
      });
      expect(stdout).toBe(initial.stdout);
      expect(stderr).toContain('[actions-warden] starting organization scan');
      expect(stderr).toContain('[1/1] resumed octo-org/app');
      expect(stdout).not.toContain('[actions-warden]');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('uses bounded output and scope-compatible automatic resume in agent mode', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aw-cli-agent-'));
    const preload = pathToFileURL(resolve(cwd, 'test/fixtures/mock-org-fetch.js')).href;
    const common = [
      cli,
      'org-scan',
      'octo-org',
      '--cwd',
      root,
      '--ignore-config',
      '--agent-mode',
    ];
    const options = {
      cwd,
      env: {
        ...process.env,
        ACTIONS_WARDEN_MODE: '',
        NODE_OPTIONS: `--import=${preload}`,
      },
    };
    try {
      const first = await execFileAsync(process.execPath, common, options);
      const firstReceipt = JSON.parse(first.stdout);
      expect(first.stderr).toBe('');
      expect(firstReceipt).toMatchObject({
        schemaVersion: '1.0',
        kind: 'actions-warden-agent-receipt',
        command: 'org-scan',
        organization: 'octo-org',
        status: 'OK',
        summary: {
          repositoriesDiscovered: 1,
          repositoriesScanned: 1,
          repositoriesFailed: 0,
          errors: 0,
        },
        report: { format: 'json' },
        checkpoint: { resumed: false },
      });
      expect(firstReceipt.report.path).toMatch(
        /^\.actions-warden-agent(?:\.[0-9a-f]{8}){4}\.report\.json$/,
      );
      expect(firstReceipt.checkpoint.path).toMatch(
        /^\.actions-warden-agent(?:\.[0-9a-f]{8}){4}\.checkpoint\.json$/,
      );

      const report = JSON.parse(
        await readFile(join(root, firstReceipt.report.path), 'utf8'),
      );
      expect(report).toMatchObject({
        schemaVersion: '1.0',
        organization: 'octo-org',
        status: 'OK',
      });
      expect(report.repositories).toHaveLength(1);
      const checkpoint = JSON.parse(
        await readFile(join(root, firstReceipt.checkpoint.path), 'utf8'),
      );
      expect(checkpoint.kind).toBe('actions-warden-org-scan');

      const resumed = await execFileAsync(process.execPath, [
        ...common,
        '--progress',
        'always',
      ], options);
      const resumedReceipt = JSON.parse(resumed.stdout);
      expect(resumedReceipt.report.path).toBe(firstReceipt.report.path);
      expect(resumedReceipt.checkpoint).toEqual({
        path: firstReceipt.checkpoint.path,
        resumed: true,
      });
      expect(resumed.stderr).toContain('[1/1] resumed octo-org/app');

      const changedScope = await execFileAsync(process.execPath, [
        ...common,
        '--severity',
        'high',
      ], options);
      const changedReceipt = JSON.parse(changedScope.stdout);
      expect(changedReceipt.checkpoint.resumed).toBe(false);
      expect(changedReceipt.checkpoint.path).not.toBe(firstReceipt.checkpoint.path);
      expect(changedReceipt.report.path).not.toBe(firstReceipt.report.path);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('lets explicit CLI flags disable or override environment agent mode', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aw-cli-no-agent-'));
    const preload = pathToFileURL(resolve(cwd, 'test/fixtures/mock-org-fetch.js')).href;
    const options = {
      cwd,
      env: {
        ...process.env,
        ACTIONS_WARDEN_MODE: 'agent',
        NODE_OPTIONS: `--import=${preload}`,
      },
    };
    try {
      const disabled = await execFileAsync(process.execPath, [
        cli,
        'org-scan',
        'octo-org',
        '--cwd',
        root,
        '--ignore-config',
        '--no-agent-mode',
        '--progress',
        'never',
        '--format',
        'json',
      ], options);
      expect(JSON.parse(disabled.stdout)).toMatchObject({
        organization: 'octo-org',
        status: 'OK',
      });
      expect(disabled.stdout).not.toContain('actions-warden-agent-receipt');
      expect((await readdir(root)).filter(file => file.startsWith('.actions-warden-agent.')))
        .toEqual([]);

      const explicitStdout = await execFileAsync(process.execPath, [
        cli,
        'org-scan',
        'octo-org',
        '--cwd',
        root,
        '--ignore-config',
        '--output',
        'stdout',
        '--format',
        'toon',
        '--progress',
        'never',
      ], options);
      expect(explicitStdout.stdout).toContain('REPOSITORY:');
      expect(explicitStdout.stdout).toContain('STATUS: OK');
      expect(explicitStdout.stdout).not.toContain('actions-warden-agent-receipt');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects unsupported agent mode environment values', async () => {
    await expect(execFileAsync(process.execPath, [
      cli,
      'org-scan',
      'octo-org',
    ], {
      cwd,
      env: { ...process.env, ACTIONS_WARDEN_MODE: 'automatic' },
    })).rejects.toMatchObject({
      code: 2,
      stderr: expect.stringContaining('ACTIONS_WARDEN_MODE must be "agent" when set'),
    });
  });

  it('rejects output paths outside the selected working directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aw-cli-'));
    const repo = join(root, 'repo');
    await mkdir(join(repo, '.github/workflows'), { recursive: true });
    await writeFile(
      join(repo, '.github/workflows/clean.yml'),
      'permissions: read-all\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n',
      'utf8',
    );
    try {
      await expect(execFileAsync(process.execPath, [
        cli,
        'audit',
        '--cwd',
        repo,
        '--output',
        'file',
        '--output-path',
        '../escaped.json',
      ], { cwd })).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringContaining('refusing to write outside working directory'),
      });
      await expect(access(join(root, 'escaped.json'))).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('creates and then applies a finding baseline', async () => {
    const repo = await mkdtemp(join(tmpdir(), 'aw-cli-baseline-'));
    await mkdir(join(repo, '.github/workflows'), { recursive: true });
    await writeFile(
      join(repo, '.github/workflows/ci.yml'),
      'on: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: octo/action@v1\n',
    );
    try {
      const created = await execFileAsync(process.execPath, [
        cli,
        'audit',
        '--cwd',
        repo,
        '--create-baseline',
        '.actions-warden-baseline.json',
        '--format',
        'json',
      ], { cwd });
      expect(JSON.parse(created.stdout)).toMatchObject({
        status: 'OK',
        path: '.actions-warden-baseline.json',
      });
      const baseline = JSON.parse(
        await readFile(join(repo, '.actions-warden-baseline.json'), 'utf8'),
      );
      expect(baseline.findings.length).toBeGreaterThan(0);

      const applied = await execFileAsync(process.execPath, [
        cli,
        'audit',
        '--cwd',
        repo,
        '--baseline',
        '.actions-warden-baseline.json',
        '--format',
        'json',
      ], { cwd });
      const result = JSON.parse(applied.stdout);
      expect(result.status).toBe('OK');
      expect(result.summary.suppressed).toBe(baseline.findings.length);
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  it('flushes large piped output before exiting', async () => {
    const repo = await mkdtemp(join(tmpdir(), 'aw-cli-large-'));
    await mkdir(join(repo, '.github', 'workflows'), { recursive: true });
    const steps = Array.from(
      { length: 2500 },
      (_, index) => `      - uses: octo/action-${index}@v1`,
    );
    await writeFile(join(repo, '.github', 'workflows', 'large.yml'), [
      'on: push',
      'permissions:',
      '  contents: read',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      ...steps,
      '',
    ].join('\n'));
    try {
      let failure;
      try {
        await execFileAsync(process.execPath, [
          cli,
          'audit',
          '--cwd',
          repo,
          '--format',
          'json',
        ], { cwd, maxBuffer: 20 * 1024 * 1024 });
      } catch (error) {
        failure = error;
      }
      expect(failure?.code).toBe(1);
      const result = JSON.parse(String(failure.stdout));
      expect(result.findings).toHaveLength(2500);
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });
});
