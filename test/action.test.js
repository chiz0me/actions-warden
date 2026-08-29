import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const cwd = resolve(import.meta.dirname, '..');
const actionEntry = resolve(cwd, 'dist/index.js');

async function runAction({
  command,
  workflow = '',
  format = 'toon',
  outputPath = '',
  annotations = true,
  failOnFindings = true,
  organization = '',
  checkpointPath = '',
  resumeFrom = '',
  progress = true,
  mockOrganization = false,
}) {
  const temp = await mkdtemp(join(tmpdir(), 'aw-action-'));
  const outputFile = join(temp, 'github-output.txt');
  const summaryFile = join(temp, 'summary.md');
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
        INPUT_WORKFLOW: workflow,
        INPUT_SEVERITY: '',
        INPUT_FORMAT: format,
        INPUT_MODE: 'minor',
        'INPUT_MIN-AGE': '7',
        INPUT_WRITE: 'false',
        INPUT_EXPLAIN: 'false',
        INPUT_OFFLINE: 'true',
        'INPUT_OUTPUT-PATH': outputPath,
        INPUT_TOKEN: '',
        'INPUT_WORKING-DIRECTORY': cwd,
        INPUT_ANNOTATIONS: String(annotations),
        'INPUT_FAIL-ON-FINDINGS': String(failOnFindings),
        INPUT_CONFIG: '',
        'INPUT_IGNORE-CONFIG': 'false',
        INPUT_BASELINE: '',
        INPUT_ORGANIZATION: organization,
        'INPUT_CHECKPOINT-PATH': checkpointPath,
        'INPUT_RESUME-FROM': resumeFrom,
        INPUT_PROGRESS: String(progress),
        GITHUB_WORKSPACE: cwd,
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
  await rm(temp, { recursive: true, force: true });
  return { exitCode, outputs, summary, stdout, stderr };
}

describe('bundled JavaScript action runner', () => {
  it('sets outputs and summary when audit findings cause exit 1', async () => {
    const result = await runAction({
      command: 'audit',
      workflow: 'test/fixtures/dangerous.yml',
    });
    expect(result.exitCode).toBe(1);
    expect(result.outputs).toMatch(/status<<[^\n]+\nFAIL\n/);
    expect(result.outputs).toMatch(/findings<<[^\n]+\n[1-9][0-9]*\n/);
    expect(result.outputs).toMatch(/annotations<<[^\n]+\n[1-9][0-9]*\n/);
    expect(result.stdout).toMatch(
      /::error file=test\/fixtures\/dangerous\.yml,line=\d+,title=actions-warden%3A/,
    );
    expect(result.summary).toContain('actions-warden (audit)');
    expect(result.summary).toMatch(/annotations: `\d+`/);
  });

  it('parses JSON outputs without exiting at grep', async () => {
    const result = await runAction({
      command: 'audit',
      workflow: 'test/fixtures/clean.yml',
      format: 'json',
    });
    expect(result.exitCode).toBe(0);
    expect(result.outputs).toMatch(/status<<[^\n]+\nOK\n/);
    expect(result.outputs).toMatch(/findings<<[^\n]+\n0\n/);
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
    expect(result.outputs).toMatch(/status<<[^\n]+\nOK\n/);
  });

  it('requires an organization before starting an organization scan', async () => {
    const result = await runAction({ command: 'org-scan', format: 'json' });
    expect(result.exitCode).toBe(2);
    expect(result.outputs).toMatch(/status<<[^\n]+\nFAIL\n/);
    expect(result.stdout).toContain('organization is required for org-scan');
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
  });

  it('shows organization progress in the step log without prefixing JSON stdout', async () => {
    const result = await runAction({
      command: 'org-scan',
      format: 'json',
      organization: 'octo-org',
      mockOrganization: true,
    });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      organization: 'octo-org',
      status: 'OK',
    });
    expect(result.stderr).toContain('[actions-warden] starting organization scan');
    expect(result.stderr).toContain('[1/1] completed octo-org/app');
  });

  it('can disable annotations without changing finding behavior', async () => {
    const result = await runAction({
      command: 'audit',
      workflow: 'test/fixtures/dangerous.yml',
      annotations: false,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).not.toMatch(/^::(?:error|warning|notice)/m);
    expect(result.outputs).toMatch(/annotations<<[^\n]+\n0\n/);
  });

  it('emits annotations while fail-on-findings keeps the step successful', async () => {
    const result = await runAction({
      command: 'audit',
      workflow: 'test/fixtures/dangerous.yml',
      failOnFindings: false,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/^::error /m);
    expect(result.outputs).toMatch(/status<<[^\n]+\nFAIL\n/);
  });
});
