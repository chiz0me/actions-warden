#!/usr/bin/env node

import { appendFile, realpath } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { audit, renderAudit } from './commands/audit.js';
import { pin, renderPin } from './commands/pin.js';
import { upgrade, renderUpgrade } from './commands/upgrade.js';
import { report, renderReport } from './commands/report.js';
import { verify, renderVerify } from './commands/verify.js';
import { scanOrganization, renderOrganizationScan } from './commands/org-scan.js';
import { listRules } from './rules/index.js';
import { format as renderFormat } from './lib/formatter.js';
import { redact } from './lib/redact.js';
import { writeFileGuarded } from './lib/writer.js';
import { shouldFailAction } from './lib/action-status.js';
import { formatOrganizationProgress } from './lib/org-progress.js';
import {
  collectAnnotations,
  limitAnnotations,
  renderAnnotationCommands,
} from './lib/annotations.js';

const FORMATS = new Set(['toon', 'json', 'text', 'sarif']);
const MODES = new Set(['major', 'minor', 'patch']);
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
const VISIBILITIES = new Set(['all', 'public', 'private', 'internal']);

async function main() {
  const command = input('command') || 'audit';
  const format = input('format') || 'toon';
  const cwd = resolve(input('working-directory') || process.env.GITHUB_WORKSPACE || process.cwd());
  const workflows = parseStringList(input('workflow'), 'workflow');
  const token = input('token') || undefined;
  const severity = optionalChoice(input('severity'), SEVERITIES, 'severity');
  const mode = choice(input('mode') || 'minor', MODES, 'mode');
  const minAgeDays = nonNegativeInteger(input('min-age') || '7', 'min-age');
  const explain = booleanInput('explain', false);
  const offline = booleanInput('offline', false);
  const write = booleanInput('write', false);
  const failOnFindings = booleanInput('fail-on-findings', true);
  const annotationsEnabled = booleanInput('annotations', true);
  const fix = input('fix') || undefined;
  const configPath = input('config') || undefined;
  const ignoreConfig = booleanInput('ignore-config', false);
  const baseline = input('baseline') || undefined;
  const organization = input('organization') || undefined;
  const repositories = parseStringList(input('repository'), 'repository');
  const visibility = choice(input('visibility') || 'all', VISIBILITIES, 'visibility');
  const includeArchived = booleanInput('include-archived', false);
  const includeDisabled = booleanInput('include-disabled', false);
  const includeForks = booleanInput('include-forks', false);
  const maxRepositories = optionalPositiveInteger(input('max-repos'), 'max-repos');
  const concurrency = positiveInteger(input('concurrency') || '4', 'concurrency');
  const checkpointPath = input('checkpoint-path') || undefined;
  const resumeFrom = input('resume-from') || undefined;
  const progress = booleanInput('progress', true);

  if (!FORMATS.has(format)) throw new Error(`invalid format: ${format}`);

  let result;
  let payload;
  let findings = 0;

  switch (command) {
    case 'audit':
      result = await audit({
        cwd,
        workflows,
        severity,
        explain,
        configPath: ignoreConfig ? false : configPath,
        baseline,
      });
      payload = renderAudit(result, { format, explain, cwd });
      findings = result.summary.findings;
      break;
    case 'pin':
      result = await pin({ cwd, workflows, dryRun: !write, token, fix });
      payload = renderPin(result, { format, dryRun: !write, cwd });
      break;
    case 'upgrade':
      result = await upgrade({
        cwd,
        workflows,
        dryRun: !write,
        token,
        mode,
        minAgeDays,
        fix,
      });
      payload = renderUpgrade(result, { format, dryRun: !write, mode, cwd });
      break;
    case 'report':
      result = await report({
        cwd,
        workflows,
        token,
        mode,
        severity,
        explain,
        skipResolve: offline,
        minAgeDays,
        configPath: ignoreConfig ? false : configPath,
        baseline,
      });
      payload = renderReport(result, { format, mode, cwd });
      findings = result.audit.summary.findings;
      break;
    case 'verify':
      result = await verify({ cwd, workflows, token });
      payload = renderVerify(result, { format, cwd });
      break;
    case 'org-scan':
      if (!organization) throw new Error('organization is required for org-scan');
      if (checkpointPath && resumeFrom) {
        throw new Error('checkpoint-path and resume-from cannot be used together');
      }
      if (
        (resumeFrom ?? checkpointPath)
        && input('output-path')
        && await samePath(
          resolve(cwd, resumeFrom ?? checkpointPath),
          resolve(cwd, input('output-path')),
        )
      ) throw new Error('checkpoint and report output paths must be different');
      result = await scanOrganization({
        organization,
        cwd,
        token,
        repositories,
        visibility,
        includeArchived,
        includeDisabled,
        includeForks,
        maxRepositories,
        concurrency,
        severity,
        explain,
        configPath: ignoreConfig ? false : configPath,
        baseline,
        checkpointPath: resumeFrom ?? checkpointPath,
        resume: Boolean(resumeFrom),
        onProgress: progress
          ? event => {
              const message = formatOrganizationProgress(event);
              if (message) process.stderr.write(message);
            }
          : undefined,
      });
      payload = renderOrganizationScan(result, { format, cwd });
      findings = result.summary.findings;
      break;
    case 'rules': {
      const rules = listRules();
      result = { status: 'OK' };
      payload = renderFormat(
        format,
        rules.map(rule => ({ label: 'RULE', fields: rule })),
        { status: 'OK', json: { schemaVersion: '1.0', rules, status: 'OK' } },
      );
      break;
    }
    default:
      throw new Error(`unknown command: ${command}`);
  }

  process.stdout.write(payload);
  const annotationResult = annotationsEnabled
    ? limitAnnotations(collectAnnotations({ command, result, cwd }))
    : { emitted: [], omitted: 0 };
  const annotationCommands = renderAnnotationCommands(annotationResult.emitted);
  if (annotationCommands) process.stdout.write(annotationCommands);

  let reportPath = '';
  const requestedOutput = input('output-path');
  if (requestedOutput) {
    reportPath = resolve(cwd, requestedOutput);
    await writeFileGuarded({
      path: reportPath,
      content: payload,
      dryRun: false,
      cwd,
    });
  }

  await setOutput('status', result.status);
  await setOutput('findings', String(findings));
  await setOutput('annotations', String(annotationResult.emitted.length));
  await setOutput('annotations-skipped', String(annotationResult.omitted));
  if (reportPath) await setOutput('report-path', reportPath);
  await writeSummary({
    command,
    status: result.status,
    findings,
    annotations: annotationResult.emitted.length,
    annotationsSkipped: annotationResult.omitted,
    payload,
  });

  if (shouldFailAction({ command, result, failOnFindings })) {
    process.exitCode = 1;
  }
}

function input(name) {
  return process.env[`INPUT_${name.toUpperCase()}`]
    ?? process.env[`INPUT_${name.replace(/-/g, '_').toUpperCase()}`]
    ?? '';
}

function parseStringList(value, name) {
  if (!value.trim()) return undefined;
  if (value.trim().startsWith('[')) {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some(item => typeof item !== 'string')) {
      throw new Error(`${name} JSON input must be an array of strings`);
    }
    return parsed;
  }
  return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
}

function booleanInput(name, defaultValue) {
  const value = input(name);
  if (!value) return defaultValue;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be true or false`);
}

function choice(value, choices, name) {
  if (!choices.has(value)) throw new Error(`invalid ${name}: ${value}`);
  return value;
}

function optionalChoice(value, choices, name) {
  return value ? choice(value, choices, name) : undefined;
}

function nonNegativeInteger(value, name) {
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be a non-negative integer`);
  return Number.parseInt(value, 10);
}

function positiveInteger(value, name) {
  if (!/^\d+$/.test(value) || Number.parseInt(value, 10) < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return Number.parseInt(value, 10);
}

function optionalPositiveInteger(value, name) {
  return value ? positiveInteger(value, name) : undefined;
}

async function samePath(left, right) {
  const [leftParent, rightParent] = await Promise.all([
    realpath(dirname(left)),
    realpath(dirname(right)),
  ]);
  const leftTarget = join(leftParent, basename(left));
  const rightTarget = join(rightParent, basename(right));
  return process.platform === 'win32'
    ? leftTarget.toLowerCase() === rightTarget.toLowerCase()
    : leftTarget === rightTarget;
}

async function setOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  const delimiter = `actions_warden_${randomUUID().replaceAll('-', '')}`;
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `${name}<<${delimiter}\n${value}\n${delimiter}\n`,
    'utf8',
  );
}

async function writeSummary({
  command,
  status,
  findings,
  annotations,
  annotationsSkipped,
  payload,
}) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const indented = payload
    .slice(0, 8000)
    .split('\n')
    .map(line => `    ${line}`)
    .join('\n');
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `### actions-warden (${command})\n\nstatus: \`${status}\`  findings: \`${findings}\`  annotations: \`${annotations}\`  skipped: \`${annotationsSkipped}\`\n\n${indented}\n`,
    'utf8',
  );
}

main().catch(async error => {
  const message = redact(String(error?.message ?? error));
  process.stderr.write(`error: ${message}\n`);
  const annotationsEnabled = input('annotations') !== 'false';
  if (annotationsEnabled) {
    process.stdout.write(renderAnnotationCommands([{
      level: 'error',
      severity: 'critical',
      title: 'actions-warden: action error',
      message,
    }]));
  }
  await setOutput('status', 'FAIL').catch(() => {});
  await setOutput('findings', '0').catch(() => {});
  await setOutput('annotations', annotationsEnabled ? '1' : '0').catch(() => {});
  await setOutput('annotations-skipped', '0').catch(() => {});
  process.exitCode = 2;
});
