import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const cwd = resolve(import.meta.dirname, '..');
const actionEntry = resolve(cwd, 'dist/index.js');

async function runAction({
  command,
  workflow = '',
  format = '',
  outputPath = '',
  annotations = true,
  failOnFindings = true,
  organization = '',
  checkpointPath = '',
  resumeFrom = '',
  previousReport = '',
  progress = true,
  fresh = false,
  autoCheckpoint = true,
  mockOrganization = false,
  workflowSource,
  workingDirectory: requestedWorkingDirectory,
}) {
  const temp = await mkdtemp(join(tmpdir(), 'aw-action-'));
  const outputFile = join(temp, 'github-output.txt');
  const summaryFile = join(temp, 'summary.md');
  const workingDirectory = requestedWorkingDirectory
    ? await realpath(requestedWorkingDirectory)
    : (workflowSource === undefined && !mockOrganization ? cwd : await realpath(temp));
  const selectedWorkflow = workflowSource === undefined ? workflow : 'workflow.yml';
  if (workflowSource !== undefined) {
    await writeFile(join(temp, selectedWorkflow), workflowSource, 'utf8');
  }
  let exitCode = 0;
  let stdout = '';
  let stderr = '';
  const preload = pathToFileURL(resolve(cwd, 'test/fixtures/mock-org-fetch.js')).href;
  try {
    const execution = await execFileAsync(process.execPath, [actionEntry], {
      cwd,
      env: {
        ...process.env,
        INPUT_COMMAND: command,
        INPUT_WORKFLOW: selectedWorkflow,
        INPUT_SEVERITY: '',
        INPUT_FORMAT: format,
        INPUT_MODE: 'minor',
        'INPUT_MIN-AGE': '7',
        INPUT_WRITE: 'false',
        INPUT_EXPLAIN: 'false',
        INPUT_OFFLINE: 'true',
        'INPUT_OUTPUT-PATH': outputPath,
        INPUT_TOKEN: '',
        'INPUT_WORKING-DIRECTORY': workingDirectory,
        INPUT_ANNOTATIONS: String(annotations),
        'INPUT_FAIL-ON-FINDINGS': String(failOnFindings),
        INPUT_CONFIG: '',
        'INPUT_IGNORE-CONFIG': 'false',
        INPUT_BASELINE: '',
        INPUT_ORGANIZATION: organization,
        'INPUT_CHECKPOINT-PATH': checkpointPath,
        'INPUT_RESUME-FROM': resumeFrom,
        'INPUT_PREVIOUS-REPORT': previousReport,
        INPUT_PROGRESS: String(progress),
        INPUT_FRESH: String(fresh),
        'INPUT_AUTO-CHECKPOINT': String(autoCheckpoint),
        GITHUB_WORKSPACE: workingDirectory,
        GITHUB_OUTPUT: outputFile,
        GITHUB_STEP_SUMMARY: summaryFile,
        ...(mockOrganization ? { NODE_OPTIONS: `--import=${preload}` } : {}),
      },
    });
    stdout = String(execution.stdout);
    stderr = String(execution.stderr);
  } catch (error) {
    exitCode = error.code;
    stdout = String(error.stdout ?? '');
    stderr = String(error.stderr ?? '');
  }
  const outputs = await readFile(outputFile, 'utf8');
  const summary = await readFile(summaryFile, 'utf8').catch(() => '');
  const writtenReportPath = outputValue(outputs, 'report-path');
  const writtenCheckpointPath = outputValue(outputs, 'checkpoint-path');
  const report = writtenReportPath
    ? await readFile(writtenReportPath, 'utf8').catch(() => '')
    : '';
  const checkpoint = writtenCheckpointPath
    ? await readFile(writtenCheckpointPath, 'utf8').catch(() => '')
    : '';
  await rm(temp, { recursive: true, force: true });
  return {
    checkpoint,
    checkpointPath: writtenCheckpointPath,
    exitCode,
    outputs,
    report,
    reportPath: writtenReportPath,
    summary,
    stdout,
    stderr,
  };
}

describe('bundled JavaScript action runner', () => {
  it('sets outputs and summary when audit findings cause exit 1', async () => {
    const result = await runAction({
      command: 'audit',
      workflow: 'test/fixtures/dangerous.yml',
    });
    expect(result.exitCode).toBe(1);
    expect(outputValue(result.outputs, 'status')).toBe('FAIL');
    expect(Number(outputValue(result.outputs, 'findings'))).toBeGreaterThan(0);
    expect(outputValue(result.outputs, 'total-findings'))
      .toBe(outputValue(result.outputs, 'findings'));
    expect(Number(outputValue(result.outputs, 'critical'))).toBeGreaterThan(0);
    expect(outputValue(result.outputs, 'errors')).toBe('0');
    expect(Number(outputValue(result.outputs, 'annotations'))).toBeGreaterThan(0);
    expect(result.stdout).toMatch(
      /::error file=test\/fixtures\/dangerous\.yml,line=\d+,title=actions-warden%3A/,
    );
    expect(result.summary).toContain('actions-warden (audit)');
    expect(result.summary).toContain('#### Severity breakdown');
    expect(result.summary).toContain('#### Findings by rule');
    expect(result.summary).toContain('#### Top findings');
    expect(result.summary).toMatch(/\| Annotations \| \d+ emitted; \d+ omitted \|/);
    expect(result.summary).not.toContain('FINDING:');
  });

  it('parses JSON outputs without exiting at grep', async () => {
    const result = await runAction({
      command: 'audit',
      workflow: 'test/fixtures/clean.yml',
      format: 'json',
    });
    expect(result.exitCode).toBe(0);
    expect(outputValue(result.outputs, 'status')).toBe('OK');
    expect(outputValue(result.outputs, 'findings')).toBe('0');
    expect(outputValue(result.outputs, 'total-findings')).toBe('0');
    expect(outputValue(result.outputs, 'suppressed')).toBe('0');
    expect(outputValue(result.outputs, 'errors')).toBe('0');
    expect(outputValue(result.outputs, 'new-findings')).toBe('0');
    expect(outputValue(result.outputs, 'resolved-findings')).toBe('0');
  });

  it('writes HTML as an artifact without copying the document into step logs', async () => {
    const result = await runAction({
      command: 'audit',
      format: 'html',
      outputPath: 'actions-warden.html',
      workflowSource: [
        'on: push',
        'permissions: read-all',
        'jobs:',
        '  test:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - run: echo ok',
        '',
      ].join('\n'),
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('HTML report written to actions-warden.html');
    expect(result.stdout).not.toContain('<!doctype html>');
    expect(result.report).toMatch(/^<!doctype html>/);
    expect(result.report).toContain('Workflow security audit');
    expect(outputValue(result.outputs, 'report-path')).toMatch(/actions-warden\.html$/);
  });

  it('escapes control characters in saved-report log messages', async () => {
    const result = await runAction({
      command: 'audit',
      format: 'html',
      outputPath: 'report\n::warning title=forged::message.html',
      workflowSource: [
        'on: push',
        'permissions: read-all',
        'jobs:',
        '  test:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - run: echo ok',
        '',
      ].join('\n'),
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('report\\u000a::warning title=forged::message.html');
    expect(result.stdout).not.toMatch(/^::warning title=forged::/m);
  });

  it('requires an output path for Action HTML reports', async () => {
    const result = await runAction({ command: 'audit', format: 'html' });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('output-path is required when format is html');
  });

  it('writes CSV as an artifact without copying the table into step logs', async () => {
    const result = await runAction({
      command: 'audit',
      format: 'csv',
      outputPath: 'actions-warden.csv',
      workflowSource: [
        'on: push',
        'permissions: read-all',
        'jobs:',
        '  test:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - run: echo ok',
        '',
      ].join('\n'),
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('CSV report written to actions-warden.csv');
    expect(result.stdout).not.toContain('record_type,status');
    expect(result.report).toMatch(/^record_type,status,/);
    expect(result.report).toMatch(/\r\nSTATUS,OK(?:,)*\r\n$/);
    expect(outputValue(result.outputs, 'report-path')).toMatch(/actions-warden\.csv$/);
  });

  it('requires an output path for Action CSV reports', async () => {
    const result = await runAction({ command: 'audit', format: 'csv' });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('output-path is required when format is csv');
  });

  it('rejects comparison input for non-organization commands', async () => {
    const result = await runAction({
      command: 'audit',
      previousReport: 'previous.json',
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('previous-report applies only to org-scan');
  });

  it('reports YAML parse failures as findings and operational errors', async () => {
    const result = await runAction({
      command: 'audit',
      format: 'json',
      failOnFindings: false,
      workflowSource: 'name: invalid\non: [\n',
    });
    expect(result.exitCode).toBe(1);
    expect(outputValue(result.outputs, 'status')).toBe('FAIL');
    expect(outputValue(result.outputs, 'findings')).toBe('1');
    expect(outputValue(result.outputs, 'high')).toBe('1');
    expect(outputValue(result.outputs, 'errors')).toBe('1');
    expect(result.summary).toContain('#### Operational errors');
    expect(result.summary).toContain('| parse | workflow.yml |');
    expect(result.summary).toContain('yaml parse error in');
  });

  it('accepts a plain workflow path containing spaces', async () => {
    const result = await runAction({
      command: 'audit',
      workflow: 'test/fixtures/clean workflow.yml',
      format: 'json',
    });
    expect(result.exitCode).toBe(0);
    expect(result.outputs).toMatch(/status<<[^\n]+\nOK\n/);
  });

  it('runs the rules command without unsupported common flags', async () => {
    const result = await runAction({ command: 'rules', format: 'json' });
    expect(result.exitCode).toBe(0);
    expect(outputValue(result.outputs, 'status')).toBe('OK');
    expect(outputValue(result.outputs, 'findings')).toBe('0');
    expect(outputValue(result.outputs, 'errors')).toBe('0');
    expect(result.summary).toContain('| Rules listed |');
  });

  it('requires an organization before starting an organization scan', async () => {
    const result = await runAction({ command: 'org-scan', format: 'json' });
    expect(result.exitCode).toBe(2);
    expect(outputValue(result.outputs, 'status')).toBe('FAIL');
    expect(outputValue(result.outputs, 'findings')).toBe('0');
    expect(outputValue(result.outputs, 'errors')).toBe('1');
    expect(result.stdout).toContain('organization is required for org-scan');
    expect(result.summary).toContain('#### Invocation error');
    expect(result.summary).toContain('organization is required for org-scan');
  });

  it('rejects ambiguous organization checkpoint inputs', async () => {
    const result = await runAction({
      command: 'org-scan',
      format: 'json',
      organization: 'octo-org',
      checkpointPath: 'new.json',
      resumeFrom: 'old.json',
    });
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain('checkpoint-path and resume-from cannot be used together');

    const freshResume = await runAction({
      command: 'org-scan',
      organization: 'octo-org',
      resumeFrom: 'old.json',
      fresh: true,
    });
    expect(freshResume.exitCode).toBe(2);
    expect(freshResume.stdout).toContain('fresh and resume-from cannot be used together');
  });

  it('saves organization reports and checkpoints without copying the report into logs', async () => {
    const result = await runAction({
      command: 'org-scan',
      organization: 'octo-org',
      mockOrganization: true,
    });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.report)).toMatchObject({
      organization: 'octo-org',
      status: 'OK',
    });
    expect(result.stdout).toContain('Organization JSON report written to');
    expect(result.stdout).not.toContain('"repositories"');
    expect(result.reportPath).toMatch(
      /\.actions-warden-org-scan(?:\.[0-9a-f]{8}){4}\.report\.json$/,
    );
    expect(result.checkpointPath).toMatch(
      /\.actions-warden-org-scan(?:\.[0-9a-f]{8}){4}\.checkpoint\.json$/,
    );
    expect(JSON.parse(result.checkpoint)).toMatchObject({
      kind: 'actions-warden-org-scan',
      schemaVersion: '1.1',
    });
    expect(result.stderr).toContain('[actions-warden] starting organization scan');
    expect(result.stderr).toContain('[1/1] completed octo-org/app');
    expect(outputValue(result.outputs, 'repositories-discovered')).toBe('1');
    expect(outputValue(result.outputs, 'repositories-selected')).toBe('1');
    expect(outputValue(result.outputs, 'repositories-scanned')).toBe('1');
    expect(outputValue(result.outputs, 'repositories-resumed')).toBe('0');
    expect(outputValue(result.outputs, 'repositories-failed')).toBe('0');
    expect(outputValue(result.outputs, 'coverage-complete')).toBe('true');
    expect(result.summary).toContain('#### Repository coverage');
    expect(result.summary).toContain('| Eligible coverage complete | yes |');
    expect(result.summary).toContain('| Checkpoint resumed | no |');
  });

  it('automatically resumes repeated organization scans and supports fresh or stateless runs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aw-action-org-resume-'));
    try {
      const first = await runAction({
        command: 'org-scan',
        organization: 'octo-org',
        mockOrganization: true,
        progress: false,
        workingDirectory: root,
      });
      const resumed = await runAction({
        command: 'org-scan',
        organization: 'octo-org',
        mockOrganization: true,
        workingDirectory: root,
      });
      expect(resumed.reportPath).toBe(first.reportPath);
      expect(resumed.checkpointPath).toBe(first.checkpointPath);
      expect(resumed.stderr).toContain('[1/1] resumed octo-org/app');
      expect(outputValue(resumed.outputs, 'repositories-resumed')).toBe('1');
      expect(outputValue(resumed.outputs, 'coverage-complete')).toBe('true');
      expect(resumed.summary).toContain('| Checkpoint resumed | yes |');
      expect(resumed.summary).toContain('| Repositories reused | 1 |');

      const namedFirst = await runAction({
        command: 'org-scan',
        organization: 'octo-org',
        checkpointPath: 'caller-managed-checkpoint.json',
        mockOrganization: true,
        progress: false,
        workingDirectory: root,
      });
      const namedResumed = await runAction({
        command: 'org-scan',
        organization: 'octo-org',
        checkpointPath: 'caller-managed-checkpoint.json',
        mockOrganization: true,
        workingDirectory: root,
      });
      expect(namedFirst.checkpointPath)
        .toBe(join(await realpath(root), 'caller-managed-checkpoint.json'));
      expect(namedResumed.checkpointPath).toBe(namedFirst.checkpointPath);
      expect(namedResumed.stderr).toContain('[1/1] resumed octo-org/app');

      const freshRun = await runAction({
        command: 'org-scan',
        organization: 'octo-org',
        fresh: true,
        mockOrganization: true,
        workingDirectory: root,
      });
      expect(freshRun.checkpointPath).toBe(first.checkpointPath);
      expect(freshRun.stderr).toContain('[1/1] completed octo-org/app');
      expect(outputValue(freshRun.outputs, 'repositories-resumed')).toBe('0');
      expect(freshRun.summary).toContain('| Checkpoint resumed | no |');

      const stateless = await runAction({
        command: 'org-scan',
        organization: 'octo-org',
        autoCheckpoint: false,
        mockOrganization: true,
        progress: false,
        workingDirectory: root,
      });
      expect(stateless.checkpointPath).toBe('');
      expect(stateless.reportPath).toBe(first.reportPath);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('can disable annotations without changing finding behavior', async () => {
    const result = await runAction({
      command: 'audit',
      workflow: 'test/fixtures/dangerous.yml',
      annotations: false,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).not.toMatch(/^::(?:error|warning|notice)/m);
    expect(outputValue(result.outputs, 'annotations')).toBe('0');
  });

  it('refuses output destinations that collide with workflows or control files', async () => {
    const workflowCollision = await runAction({
      command: 'audit',
      outputPath: '.github/workflows/ci.yml',
    });
    expect(workflowCollision.exitCode).toBe(2);
    expect(workflowCollision.stderr)
      .toContain('output-path cannot use a default workflow discovery path');

    const configCollision = await runAction({
      command: 'audit',
      outputPath: '.actions-warden.yml',
    });
    expect(configCollision.exitCode).toBe(2);
    expect(configCollision.stderr)
      .toContain('output-path cannot replace the reserved config path');
  });

  it('refuses org-scan report or checkpoint destinations that collide with workflows or control files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aw-action-org-scan-collision-'));
    await mkdir(join(root, '.github/workflows'), { recursive: true });
    try {
      const workflowReportCollision = await runAction({
        command: 'org-scan',
        organization: 'octo-org',
        outputPath: '.github/workflows/ci.yml',
        mockOrganization: true,
        workingDirectory: root,
      });
      expect(workflowReportCollision.exitCode).toBe(2);
      expect(workflowReportCollision.stderr)
        .toContain('output-path cannot use a default workflow discovery path');

      const workflowCheckpointCollision = await runAction({
        command: 'org-scan',
        organization: 'octo-org',
        checkpointPath: '.github/workflows/ci.yml',
        mockOrganization: true,
        workingDirectory: root,
      });
      expect(workflowCheckpointCollision.exitCode).toBe(2);
      expect(workflowCheckpointCollision.stderr)
        .toContain('checkpoint-path cannot use a default workflow discovery path');

      const configCheckpointCollision = await runAction({
        command: 'org-scan',
        organization: 'octo-org',
        checkpointPath: '.actions-warden.yml',
        mockOrganization: true,
        workingDirectory: root,
      });
      expect(configCheckpointCollision.exitCode).toBe(2);
      expect(configCheckpointCollision.stderr)
        .toContain('checkpoint-path cannot replace the reserved config path');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('emits annotations while fail-on-findings keeps the step successful', async () => {
    const result = await runAction({
      command: 'audit',
      workflow: 'test/fixtures/dangerous.yml',
      failOnFindings: false,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/^::error /m);
    expect(outputValue(result.outputs, 'status')).toBe('FAIL');
  });
});

function outputValue(outputs, name) {
  const lines = outputs.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const prefix = `${name}<<`;
    if (!lines[index].startsWith(prefix)) continue;
    const delimiter = lines[index].slice(prefix.length);
    const value = [];
    for (index += 1; index < lines.length && lines[index] !== delimiter; index += 1) {
      value.push(lines[index]);
    }
    return value.join('\n');
  }
  return undefined;
}
