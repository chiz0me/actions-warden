import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
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
    ], { cwd })).rejects.toMatchObject({
      code: 2,
      stderr: expect.stringContaining("unknown option '--dry-run=false'"),
    });
  });

  it('uses exit code 2 for command-line usage errors', async () => {
    await expect(execFileAsync(process.execPath, [
      cli,
      'audit',
      '--not-an-option',
    ], { cwd })).rejects.toMatchObject({
      code: 2,
      stderr: expect.stringContaining("unknown option '--not-an-option'"),
    });

    await expect(execFileAsync(process.execPath, [
      cli,
      'audit',
      '--token',
      'not-needed',
    ], { cwd })).rejects.toMatchObject({
      code: 2,
      stderr: expect.stringContaining("unknown option '--token'"),
    });
  });

  it('collects repeated variadic workflow options', async () => {
    const { stdout } = await execFileAsync(process.execPath, [
      cli,
      'audit',
      '--workflow',
      'test/fixtures/clean.yml',
      '--workflow',
      'test/fixtures/clean workflow.yml',
      '--format',
      'json',
      '--output',
      'stdout',
    ], { cwd });
    expect(JSON.parse(stdout).files).toEqual([
      'test/fixtures/clean workflow.yml',
      'test/fixtures/clean.yml',
    ]);
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

  it('validates output before an authorized workflow write can run', async () => {
    const repo = await mkdtemp(join(tmpdir(), 'aw-cli-preflight-'));
    const workflowDirectory = join(repo, '.github/workflows');
    const workflowPath = join(workflowDirectory, 'ci.yml');
    const original = 'on: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: octo/action@v1\n';
    await mkdir(workflowDirectory, { recursive: true });
    await writeFile(workflowPath, original);
    try {
      await expect(execFileAsync(process.execPath, [
        cli,
        'pin',
        '--cwd',
        repo,
        '--write',
        '--output',
        'file',
      ], { cwd })).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringContaining('--output-path is required'),
      });
      expect(await readFile(workflowPath, 'utf8')).toBe(original);
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  it('lets --output-path imply file output and rejects contradictory output flags', async () => {
    const repo = await mkdtemp(join(tmpdir(), 'aw-cli-output-'));
    await mkdir(join(repo, '.github/workflows'), { recursive: true });
    await writeFile(
      join(repo, '.github/workflows/ci.yml'),
      await readFile(join(cwd, 'test/fixtures/clean.yml'), 'utf8'),
    );
    try {
      const written = await execFileAsync(process.execPath, [
        cli,
        'audit',
        '--cwd',
        repo,
        '--format',
        'json',
        '--output-path',
        'report.json',
      ], { cwd });
      expect(written.stdout).toBe('');
      expect(JSON.parse(await readFile(join(repo, 'report.json'), 'utf8')))
        .toMatchObject({ status: 'OK' });

      await expect(execFileAsync(process.execPath, [
        cli,
        'audit',
        '--cwd',
        repo,
        '--output',
        'stdout',
        '--output-path',
        'ignored.json',
      ], { cwd })).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringContaining('--output-path cannot be used with --output=stdout'),
      });
      await expect(access(join(repo, 'ignored.json'))).rejects.toThrow();
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  it('writes a self-contained HTML report without logging the file payload', async () => {
    const repo = await mkdtemp(join(tmpdir(), 'aw-cli-html-'));
    await mkdir(join(repo, '.github/workflows'), { recursive: true });
    await writeFile(
      join(repo, '.github/workflows/ci.yml'),
      await readFile(join(cwd, 'test/fixtures/clean.yml'), 'utf8'),
    );
    try {
      const result = await execFileAsync(process.execPath, [
        cli,
        'audit',
        '--cwd',
        repo,
        '--format',
        'html',
        '--output-path',
        'report.html',
      ], { cwd });
      const html = await readFile(join(repo, 'report.html'), 'utf8');
      expect(result.stdout).toBe('');
      expect(html).toMatch(/^<!doctype html>/);
      expect(html).toContain('Workflow security audit');
      expect(html).toContain('Content-Security-Policy');
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  it('writes a spreadsheet-safe CSV report with a semantic status row', async () => {
    const repo = await mkdtemp(join(tmpdir(), 'aw-cli-csv-'));
    await mkdir(join(repo, '.github/workflows'), { recursive: true });
    await writeFile(
      join(repo, '.github/workflows/ci.yml'),
      await readFile(join(cwd, 'test/fixtures/clean.yml'), 'utf8'),
    );
    try {
      const result = await execFileAsync(process.execPath, [
        cli,
        'audit',
        '--cwd',
        repo,
        '--format',
        'csv',
        '--output-path',
        'report.csv',
      ], { cwd });
      const csv = await readFile(join(repo, 'report.csv'), 'utf8');
      expect(result.stdout).toBe('');
      expect(csv).toMatch(/^record_type,status,/);
      expect(csv).toContain('\r\nSCAN,');
      expect(csv).toContain('\r\nSUMMARY,');
      expect(csv).toMatch(/\r\nSTATUS,OK(?:,)*\r\n$/);
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  it('refuses report and baseline destinations that could replace control or workflow files', async () => {
    const repo = await mkdtemp(join(tmpdir(), 'aw-cli-collision-'));
    const workflowDirectory = join(repo, '.github/workflows');
    const workflowPath = join(workflowDirectory, 'ci.yml');
    const original = 'permissions: read-all\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n';
    await mkdir(workflowDirectory, { recursive: true });
    await writeFile(workflowPath, original);
    try {
      await expect(execFileAsync(process.execPath, [
        cli,
        'audit',
        '--cwd',
        repo,
        '--output-path',
        '.github/workflows/ci.yml',
      ], { cwd })).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringContaining('cannot use a default workflow discovery path'),
      });
      expect(await readFile(workflowPath, 'utf8')).toBe(original);

      await expect(execFileAsync(process.execPath, [
        cli,
        'audit',
        '--cwd',
        repo,
        '--create-baseline',
        'same.json',
        '--output-path',
        'same.json',
      ], { cwd })).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringContaining('must use different paths'),
      });
      await expect(access(join(repo, 'same.json'))).rejects.toThrow();

      await expect(execFileAsync(process.execPath, [
        cli,
        'audit',
        '--cwd',
        repo,
        '--create-baseline',
        '.actions-warden.yml',
      ], { cwd })).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringContaining('cannot replace the reserved config path'),
      });
      await expect(access(join(repo, '.actions-warden.yml'))).rejects.toThrow();
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  it('strictly validates numeric limits and stable change ids before work starts', async () => {
    const cases = [
      {
        args: ['upgrade', '--min-age', '7days'],
        message: '--min-age must be an integer',
      },
      {
        args: ['report', '--min-age', '1.5'],
        message: '--min-age must be an integer',
      },
      {
        args: ['org-scan', 'octo-org', '--max-repos', '999999999999999999999999999'],
        message: '--max-repos must be a positive integer',
      },
      {
        args: ['pin', '--fix', 'not-an-id'],
        message: '--fix must be a 16-character hexadecimal change id',
      },
      {
        args: ['audit', '--output-path', ''],
        message: '--output-path must be non-empty',
      },
    ];
    for (const testCase of cases) {
      await expect(execFileAsync(process.execPath, [cli, ...testCase.args], { cwd }))
        .rejects.toMatchObject({
          code: 2,
          stderr: expect.stringContaining(testCase.message),
        });
    }
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
      stderr: expect.stringContaining('--concurrency must be an integer from 1 to 16'),
    });
  });

  it('rejects contradictory agent and offline options', async () => {
    await expect(execFileAsync(process.execPath, [
      cli,
      'org-scan',
      'octo-org',
      '--agent-mode',
      '--no-agent-mode',
    ], { cwd })).rejects.toMatchObject({
      code: 2,
      stderr: expect.stringContaining('--agent-mode and --no-agent-mode cannot be used together'),
    });

    await expect(execFileAsync(process.execPath, [
      cli,
      'report',
      '--offline',
      '--token',
      'unused-token',
    ], { cwd })).rejects.toMatchObject({
      code: 2,
      stderr: expect.stringContaining("option '--offline' cannot be used with option '--token"),
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
      stderr: expect.stringContaining("option '--checkpoint <path>' cannot be used with option '--resume <path>'"),
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
      '--output',
      'stdout',
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
        '--checkpoint',
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

  it('emits parseable JSON Lines progress without mixing plain fatal errors', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aw-cli-json-progress-'));
    const preload = pathToFileURL(resolve(cwd, 'test/fixtures/mock-org-fetch.js')).href;
    const options = {
      cwd,
      env: {
        ...process.env,
        ACTIONS_WARDEN_CONTEXT: '',
        ACTIONS_WARDEN_MODE: '',
        NODE_OPTIONS: `--import=${preload}`,
      },
    };
    try {
      const successful = await execFileAsync(process.execPath, [
        cli,
        'org-scan',
        'octo-org',
        '--cwd',
        root,
        '--ignore-config',
        '--format',
        'json',
        '--output',
        'stdout',
        '--no-auto-checkpoint',
        '--progress',
        'json',
      ], options);
      expect(JSON.parse(successful.stdout).status).toBe('OK');
      const events = successful.stderr.trim().split('\n').map(line => JSON.parse(line));
      expect(events.every(event => (
        event.kind === 'actions-warden-org-scan-progress'
        && event.schemaVersion === '1.0'
      ))).toBe(true);
      expect(events.map(event => event.event)).toEqual(expect.arrayContaining([
        'scan-started',
        'discovery-page',
        'repository-phase',
        'scan-completed',
      ]));

      let failed;
      try {
        await execFileAsync(process.execPath, [
          cli,
          'org-scan',
          'missing-org',
          '--cwd',
          root,
          '--ignore-config',
          '--format',
          'json',
          '--output',
          'stdout',
          '--no-auto-checkpoint',
          '--progress',
          'json',
        ], options);
      } catch (error) {
        failed = error;
      }
      expect(failed).toMatchObject({ code: 2, stdout: '' });
      const failureEvents = String(failed.stderr).trim().split('\n')
        .map(line => JSON.parse(line));
      expect(failureEvents.at(-1)).toMatchObject({
        kind: 'actions-warden-org-scan-progress',
        event: 'scan-failed',
        organization: 'missing-org',
      });
      expect(String(failed.stderr)).not.toContain('\nerror: ');

      await writeFile(join(root, 'previous.json'), successful.stdout);
      let postScanFailure;
      try {
        await execFileAsync(process.execPath, [
          cli,
          'org-scan',
          'octo-org',
          '--cwd',
          root,
          '--ignore-config',
          '--severity',
          'high',
          '--previous-report',
          'previous.json',
          '--format',
          'json',
          '--output',
          'stdout',
          '--no-auto-checkpoint',
          '--progress',
          'json',
        ], options);
      } catch (error) {
        postScanFailure = error;
      }
      expect(postScanFailure).toMatchObject({ code: 2, stdout: '' });
      const postScanEvents = String(postScanFailure.stderr).trim().split('\n')
        .map(line => JSON.parse(line));
      expect(postScanEvents.at(-1)).toMatchObject({
        kind: 'actions-warden-org-scan-progress',
        event: 'command-failed',
        organization: 'octo-org',
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('writes an integrity-manifested organization report directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aw-cli-report-dir-'));
    const preload = pathToFileURL(resolve(cwd, 'test/fixtures/mock-org-fetch.js')).href;
    const options = {
      cwd,
      env: {
        ...process.env,
        ACTIONS_WARDEN_CONTEXT: '',
        ACTIONS_WARDEN_MODE: '',
        NODE_OPTIONS: `--import=${preload}`,
      },
    };
    try {
      const execution = await execFileAsync(process.execPath, [
        cli,
        'org-scan',
        'octo-org',
        '--cwd',
        root,
        '--ignore-config',
        '--report-dir',
        'reports/organization',
        '--no-auto-checkpoint',
        '--progress',
        'none',
      ], options);
      const receipt = JSON.parse(execution.stdout);
      expect(receipt.report).toEqual({
        path: 'reports/organization/organization-report.json',
        format: 'json',
        layout: 'directory',
        directory: 'reports/organization',
        manifest: 'reports/organization/manifest.json',
      });
      const aggregateContent = await readFile(join(root, receipt.report.path), 'utf8');
      const aggregate = JSON.parse(aggregateContent);
      expect(aggregate).toMatchObject({
        kind: 'actions-warden-org-scan-directory',
        organization: 'octo-org',
        coverage: { complete: true },
      });
      expect(aggregate.repositories).toHaveLength(1);
      expect(aggregate.repositories[0].findings).toBe(0);
      expect(aggregate.repositories[0].findings).not.toBeInstanceOf(Array);

      const manifest = JSON.parse(
        await readFile(join(root, receipt.report.manifest), 'utf8'),
      );
      expect(manifest).toMatchObject({
        kind: 'actions-warden-org-scan-manifest',
        report: {
          path: 'organization-report.json',
          bytes: Buffer.byteLength(aggregateContent),
          sha256: createHash('sha256').update(aggregateContent).digest('hex'),
        },
      });
      expect(manifest.repositories).toHaveLength(1);
      const repositoryContent = await readFile(
        join(root, 'reports/organization', manifest.repositories[0].path),
        'utf8',
      );
      expect(JSON.parse(repositoryContent)).toMatchObject({
        kind: 'actions-warden-org-scan-repository',
        repository: {
          repository: { fullName: 'octo-org/app' },
          status: 'OK',
        },
      });
      expect(manifest.repositories[0].sha256)
        .toBe(createHash('sha256').update(repositoryContent).digest('hex'));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects unsafe or contradictory organization report directories before scanning', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aw-cli-report-dir-safety-'));
    try {
      for (const [args, message] of [
        [['--report-dir', '.'], 'dedicated subdirectory'],
        [['--report-dir', '.github/workflows/reports'], 'workflow discovery path'],
        [['--report-dir', '.actions-warden.yml/reports'], 'reserved config path'],
        [['--report-dir', 'nested/action.yml/reports'], 'workflow discovery path'],
        [['--report-dir', 'reports', '--format', 'html'], 'supports only --format=json'],
        [['--report-dir', 'reports', '--output', 'stdout'], 'cannot be used with --output=stdout'],
      ]) {
        await expect(execFileAsync(process.execPath, [
          cli,
          'org-scan',
          'octo-org',
          '--cwd',
          root,
          '--ignore-config',
          ...args,
        ], { cwd })).rejects.toMatchObject({
          code: 2,
          stderr: expect.stringContaining(message),
        });
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('compares compatible organization reports and protects the previous input', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aw-cli-comparison-'));
    const preload = pathToFileURL(resolve(cwd, 'test/fixtures/mock-org-fetch.js')).href;
    const common = [
      cli,
      'org-scan',
      'octo-org',
      '--cwd',
      root,
      '--ignore-config',
      '--progress',
      'never',
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
      await execFileAsync(process.execPath, [
        ...common,
        '--format',
        'json',
        '--output-path',
        'previous.json',
      ], options);
      const current = await execFileAsync(process.execPath, [
        ...common,
        '--format',
        'json',
        '--output',
        'stdout',
        '--previous-report',
        'previous.json',
      ], options);
      expect(JSON.parse(current.stdout).comparison).toMatchObject({
        summary: {
          newFindings: 0,
          resolvedFindings: 0,
          unchangedFindings: 0,
          unknownFindings: 0,
          repositoriesComparable: 1,
          complete: true,
        },
      });

      await expect(execFileAsync(process.execPath, [
        ...common,
        '--format',
        'html',
        '--previous-report',
        'previous.json',
        '--output-path',
        'previous.json',
      ], options)).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringContaining('output and previous report paths must be different'),
      });
      await expect(execFileAsync(process.execPath, [
        ...common,
        '--format',
        'sarif',
        '--previous-report',
        'previous.json',
      ], options)).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringContaining('--previous-report cannot be used with --format=sarif'),
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('uses safe organization artifacts and automatic resume by default', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aw-cli-org-defaults-'));
    const preload = pathToFileURL(resolve(cwd, 'test/fixtures/mock-org-fetch.js')).href;
    const common = [
      cli,
      'org-scan',
      'octo-org',
      '--cwd',
      root,
      '--ignore-config',
      '--progress',
      'never',
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
      expect(firstReceipt).toMatchObject({
        schemaVersion: '1.0',
        kind: 'actions-warden-org-scan-receipt',
        command: 'org-scan',
        organization: 'octo-org',
        status: 'OK',
        report: { format: 'json', layout: 'single' },
        checkpoint: { resumed: false, repositoriesReused: 0 },
        coverage: { complete: true },
      });
      expect(firstReceipt).not.toHaveProperty('repositories');
      expect(firstReceipt.report.path).toMatch(
        /^\.actions-warden-org-scan(?:\.[0-9a-f]{8}){4}\.report\.json$/,
      );
      expect(firstReceipt.checkpoint.path).toMatch(
        /^\.actions-warden-org-scan(?:\.[0-9a-f]{8}){4}\.checkpoint\.json$/,
      );
      expect(JSON.parse(await readFile(join(root, firstReceipt.report.path), 'utf8')))
        .toMatchObject({ organization: 'octo-org', status: 'OK' });

      const resumed = await execFileAsync(process.execPath, [
        ...common,
        '--progress',
        'always',
      ], options);
      const resumedReceipt = JSON.parse(resumed.stdout);
      expect(resumedReceipt.kind).toBe('actions-warden-org-scan-receipt');
      expect(resumedReceipt.report.path).toBe(firstReceipt.report.path);
      expect(resumedReceipt.checkpoint).toEqual({
        path: firstReceipt.checkpoint.path,
        resumed: true,
        repositoriesReused: 1,
      });
      expect(resumed.stderr).toContain('[1/1] resumed octo-org/app');

      const fresh = await execFileAsync(process.execPath, [
        ...common,
        '--fresh',
        '--progress',
        'always',
      ], options);
      expect(JSON.parse(fresh.stdout).checkpoint).toEqual({
        path: firstReceipt.checkpoint.path,
        resumed: false,
        repositoriesReused: 0,
      });
      expect(fresh.stderr).toContain('[1/1] completed octo-org/app');

      const withoutCheckpoint = await execFileAsync(process.execPath, [
        ...common,
        '--severity',
        'critical',
        '--no-auto-checkpoint',
      ], options);
      expect(JSON.parse(withoutCheckpoint.stdout).checkpoint).toEqual({
        path: null,
        resumed: false,
        repositoriesReused: 0,
      });

      const filesBeforeStdout = await readdir(root);
      const explicitStdout = await execFileAsync(process.execPath, [
        ...common,
        '--severity',
        'high',
        '--output',
        'stdout',
        '--no-auto-checkpoint',
      ], options);
      expect(JSON.parse(explicitStdout.stdout)).toMatchObject({
        organization: 'octo-org',
        status: 'OK',
      });
      expect(explicitStdout.stdout).not.toContain('actions-warden-org-scan-receipt');
      expect(await readdir(root)).toEqual(filesBeforeStdout);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('uses bounded output and scope-compatible automatic resume in agent mode', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aw-cli-agent-'));
    const preload = pathToFileURL(resolve(cwd, 'test/fixtures/mock-org-fetch.js')).href;
    const base = [
      cli,
      'org-scan',
      'octo-org',
      '--cwd',
      root,
      '--ignore-config',
    ];
    const common = [
      ...base,
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
        report: { format: 'json', layout: 'single' },
        checkpoint: { resumed: false, repositoriesReused: 0 },
        coverage: { complete: true },
      });
      expect(firstReceipt.report.path).toMatch(
        /^\.actions-warden-org-scan(?:\.[0-9a-f]{8}){4}\.report\.json$/,
      );
      expect(firstReceipt.checkpoint.path).toMatch(
        /^\.actions-warden-org-scan(?:\.[0-9a-f]{8}){4}\.checkpoint\.json$/,
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
      expect(checkpoint).toMatchObject({
        schemaVersion: '1.1',
        kind: 'actions-warden-org-scan',
        toolVersion: pkg.version,
        identity: { analysisGeneration: 2 },
      });

      const normalRun = await execFileAsync(process.execPath, [
        ...base,
        '--progress',
        'always',
      ], options);
      const normalReceipt = JSON.parse(normalRun.stdout);
      expect(normalReceipt.kind).toBe('actions-warden-org-scan-receipt');
      expect(normalReceipt.report.path).toBe(firstReceipt.report.path);
      expect(normalReceipt.checkpoint).toEqual({
        path: firstReceipt.checkpoint.path,
        resumed: true,
        repositoriesReused: 1,
      });
      expect(normalRun.stderr).toContain('[1/1] resumed octo-org/app');

      const htmlRun = await execFileAsync(process.execPath, [
        ...common,
        '--format',
        'html',
      ], options);
      const htmlReceipt = JSON.parse(htmlRun.stdout);
      expect(htmlReceipt.report).toMatchObject({ format: 'html' });
      expect(htmlReceipt.report.path).toMatch(/\.report\.html$/);
      expect(await readFile(join(root, htmlReceipt.report.path), 'utf8'))
        .toMatch(/^<!doctype html>/);

      const csvRun = await execFileAsync(process.execPath, [
        ...common,
        '--format',
        'csv',
      ], options);
      const csvReceipt = JSON.parse(csvRun.stdout);
      expect(csvReceipt.report).toMatchObject({ format: 'csv' });
      expect(csvReceipt.report.path).toMatch(/\.report\.csv$/);
      expect(await readFile(join(root, csvReceipt.report.path), 'utf8'))
        .toMatch(/^record_type,status,/);

      const legacyCheckpointPath = firstReceipt.checkpoint.path.replace(
        /^\.actions-warden-org-scan\./,
        '.actions-warden-agent.',
      );
      await writeFile(join(root, legacyCheckpointPath), `${JSON.stringify({
        schemaVersion: '1.1',
        kind: checkpoint.kind,
        toolVersion: '0.4.0',
        identity: checkpoint.identity,
        repositories: checkpoint.repositories,
      })}\n`);
      await rm(join(root, firstReceipt.checkpoint.path));

      const resumed = await execFileAsync(process.execPath, [
        ...base,
        '--progress',
        'always',
      ], options);
      const resumedReceipt = JSON.parse(resumed.stdout);
      expect(resumedReceipt.kind).toBe('actions-warden-org-scan-receipt');
      expect(resumedReceipt.report.path).toBe(firstReceipt.report.path);
      expect(resumedReceipt.checkpoint).toEqual({
        path: firstReceipt.checkpoint.path,
        resumed: true,
        repositoriesReused: 1,
      });
      expect(resumed.stderr).toContain('[1/1] resumed octo-org/app');
      const migratedCheckpoint = JSON.parse(
        await readFile(join(root, firstReceipt.checkpoint.path), 'utf8'),
      );
      expect(migratedCheckpoint).toMatchObject({
        schemaVersion: '1.1',
        toolVersion: pkg.version,
        identity: { analysisGeneration: 2 },
      });
      expect(migratedCheckpoint.identity).not.toHaveProperty('toolVersion');
      expect(JSON.parse(await readFile(join(root, legacyCheckpointPath), 'utf8')))
        .toMatchObject({ schemaVersion: '1.1', toolVersion: '0.4.0' });

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
        ACTIONS_WARDEN_CONTEXT: 'agent',
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
        '--output',
        'stdout',
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

    await expect(execFileAsync(process.execPath, [
      cli,
      'org-scan',
      'octo-org',
    ], {
      cwd,
      env: {
        ...process.env,
        ACTIONS_WARDEN_CONTEXT: 'automatic',
        ACTIONS_WARDEN_MODE: '',
      },
    })).rejects.toMatchObject({
      code: 2,
      stderr: expect.stringContaining(
        'ACTIONS_WARDEN_CONTEXT must be agent, auto, ci, or interactive',
      ),
    });
  });

  it('uses explicit execution context for bounded output and progress defaults', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aw-cli-context-'));
    const preload = pathToFileURL(resolve(cwd, 'test/fixtures/mock-org-fetch.js')).href;
    const baseEnvironment = {
      ...process.env,
      ACTIONS_WARDEN_MODE: '',
      NODE_OPTIONS: `--import=${preload}`,
    };
    try {
      const agent = await execFileAsync(process.execPath, [
        cli,
        'org-scan',
        'octo-org',
        '--cwd',
        root,
        '--ignore-config',
      ], {
        cwd,
        env: { ...baseEnvironment, ACTIONS_WARDEN_CONTEXT: 'agent' },
      });
      expect(agent.stderr).toBe('');
      expect(JSON.parse(agent.stdout)).toMatchObject({
        kind: 'actions-warden-agent-receipt',
        report: { layout: 'single' },
      });

      const ci = await execFileAsync(process.execPath, [
        cli,
        'org-scan',
        'octo-org',
        '--cwd',
        root,
        '--ignore-config',
        '--output',
        'stdout',
        '--no-auto-checkpoint',
      ], {
        cwd,
        env: { ...baseEnvironment, ACTIONS_WARDEN_CONTEXT: 'ci' },
      });
      expect(JSON.parse(ci.stdout).status).toBe('OK');
      expect(ci.stderr).toContain('[actions-warden] starting organization scan');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
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
