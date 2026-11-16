#!/usr/bin/env node

import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
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
import { createOrganizationProgressReporter } from './lib/org-progress.js';
import { runOrganizationScan } from './lib/org-run.js';
import { SEVERITIES, VISIBILITIES } from './lib/org-schema.js';
import { loadConfig } from './lib/config.js';
import { loadBaseline } from './lib/baseline.js';
import {
  assertDestinationsDoNotReplaceControls,
  assertDestinationsUseSafeNames,
  validateWriteDestination,
} from './lib/destination.js';
import {
  ACTION_NUMERIC_OUTPUTS,
  collectActionMetrics,
  emptyActionMetrics,
  renderActionFailureSummary,
  renderActionSummary,
} from './lib/action-summary.js';
import {
  collectAnnotations,
  limitAnnotations,
  renderAnnotationCommands,
} from './lib/annotations.js';

const FORMATS = new Set(['toon', 'json', 'text', 'csv', 'sarif', 'html']);
const MODES = new Set(['major', 'minor', 'patch']);

async function main() {
  const inputs = readInputs();
  assertInputCombinations(inputs);
  const outcome = await runCommand(inputs);
  await publishOutcome(inputs, outcome);
}

function readInputs() {
  const command = input('command') || 'audit';
  const requestedFormat = input('format') || 'auto';
  const format = requestedFormat === 'auto'
    ? (command === 'org-scan' ? 'json' : 'toon')
    : requestedFormat;
  return {
    command,
    format,
    ...readRepositoryInputs(),
    ...readOrganizationInputs(),
    requestedOutput: input('output-path') || undefined,
  };
}

function readRepositoryInputs() {
  return {
    cwd: resolve(input('working-directory') || process.env.GITHUB_WORKSPACE || process.cwd()),
    workflows: parseStringList(input('workflow'), 'workflow'),
    token: input('token') || undefined,
    severity: optionalChoice(input('severity'), SEVERITIES, 'severity'),
    mode: choice(input('mode') || 'minor', MODES, 'mode'),
    minAgeDays: nonNegativeInteger(input('min-age') || '7', 'min-age'),
    explain: booleanInput('explain', false),
    offline: booleanInput('offline', false),
    write: booleanInput('write', false),
    failOnFindings: booleanInput('fail-on-findings', true),
    annotationsEnabled: booleanInput('annotations', true),
    fix: input('fix') || undefined,
    configPath: input('config') || undefined,
    ignoreConfig: booleanInput('ignore-config', false),
    baseline: input('baseline') || undefined,
  };
}

function readOrganizationInputs() {
  return {
    organization: input('organization') || undefined,
    repositories: parseStringList(input('repository'), 'repository'),
    visibility: choice(input('visibility') || 'all', VISIBILITIES, 'visibility'),
    includeArchived: booleanInput('include-archived', false),
    includeDisabled: booleanInput('include-disabled', false),
    includeForks: booleanInput('include-forks', false),
    maxRepositories: optionalPositiveInteger(input('max-repos'), 'max-repos'),
    concurrency: positiveInteger(input('concurrency') || '4', 'concurrency'),
    checkpointPath: input('checkpoint-path') || undefined,
    resumeFrom: input('resume-from') || undefined,
    previousReportPath: input('previous-report') || undefined,
    progress: booleanInput('progress', true),
    fresh: booleanInput('fresh', false),
    autoCheckpoint: booleanInput('auto-checkpoint', true),
  };
}

function assertInputCombinations({ command, format, requestedOutput, previousReportPath }) {
  if (!FORMATS.has(format)) throw new Error(`invalid format: ${format}`);
  if (command !== 'org-scan' && ['csv', 'html'].includes(format) && !requestedOutput) {
    throw new Error(`output-path is required when format is ${format}`);
  }
  if (previousReportPath && command !== 'org-scan') {
    throw new Error('previous-report applies only to org-scan');
  }
  if (previousReportPath && format === 'sarif') {
    throw new Error('previous-report cannot be used with format sarif');
  }
}

const COMMAND_RUNNERS = new Map([
  ['audit', runAuditCommand],
  ['pin', runPinCommand],
  ['upgrade', runUpgradeCommand],
  ['report', runReportCommand],
  ['verify', runVerifyCommand],
  ['org-scan', runOrganizationCommand],
  ['rules', runRulesCommand],
]);

async function runCommand(inputs) {
  const reportPath = inputs.command === 'org-scan' ? '' : await guardRepositoryOutput(inputs);
  const runner = COMMAND_RUNNERS.get(inputs.command);
  if (!runner) throw new Error(`unknown command: ${inputs.command}`);
  return {
    reportPath,
    requestedOutput: inputs.requestedOutput,
    checkpointPath: '',
    checkpointResumed: false,
    repositoriesReused: 0,
    ...await runner(inputs),
  };
}

async function guardRepositoryOutput({
  requestedOutput,
  cwd,
  ignoreConfig,
  configPath,
  baseline,
  workflows,
}) {
  if (!requestedOutput) return '';
  const outputDestination = await validateWriteDestination({
    label: 'output-path',
    path: requestedOutput,
    cwd,
  });
  await assertDestinationsUseSafeNames([outputDestination], cwd);
  const config = await loadConfig({
    cwd,
    path: ignoreConfig ? false : configPath,
    ruleIds: listRules().map(rule => rule.id),
  });
  const baselinePath = baseline ?? config.baseline;
  const baselineData = baselinePath
    ? await loadBaseline({ path: baselinePath, cwd })
    : { path: null };
  await assertDestinationsDoNotReplaceControls(
    [outputDestination],
    [
      { label: 'active config', path: config.path },
      { label: 'active baseline', path: baselineData.path },
      ...workflows.map(wf => ({ label: 'workflow file', path: resolve(cwd, wf) })),
    ],
  );
  return outputDestination.path;
}

async function runAuditCommand(inputs) {
  const { cwd, workflows, severity, explain, baseline, format } = inputs;
  const result = await audit({
    cwd,
    workflows,
    severity,
    explain,
    configPath: inputs.ignoreConfig ? false : inputs.configPath,
    baseline,
  });
  return { result, payload: renderAudit(result, { format, explain, cwd }) };
}

async function runPinCommand({ cwd, workflows, write, token, fix, format }) {
  const result = await pin({ cwd, workflows, dryRun: !write, token, fix });
  return { result, payload: renderPin(result, { format, dryRun: !write, cwd }) };
}

async function runUpgradeCommand(inputs) {
  const { cwd, workflows, write, token, mode, minAgeDays, fix, format } = inputs;
  const result = await upgrade({
    cwd,
    workflows,
    dryRun: !write,
    token,
    mode,
    minAgeDays,
    fix,
  });
  return { result, payload: renderUpgrade(result, { format, dryRun: !write, mode, cwd }) };
}

async function runReportCommand(inputs) {
  const { cwd, workflows, token, mode, severity, explain, offline, minAgeDays } = inputs;
  const result = await report({
    cwd,
    workflows,
    token,
    mode,
    severity,
    explain,
    skipResolve: offline,
    minAgeDays,
    configPath: inputs.ignoreConfig ? false : inputs.configPath,
    baseline: inputs.baseline,
  });
  return { result, payload: renderReport(result, { format: inputs.format, mode, cwd }) };
}

async function runVerifyCommand({ cwd, workflows, token, format }) {
  const result = await verify({ cwd, workflows, token });
  return { result, payload: renderVerify(result, { format, cwd }) };
}

function runRulesCommand({ format }) {
  const rules = listRules();
  return {
    result: { status: 'OK' },
    payload: renderFormat(
      format,
      rules.map(rule => ({ label: 'RULE', fields: rule })),
      {
        status: 'OK',
        title: 'Audit rule catalog',
        json: { schemaVersion: '1.0', rules, status: 'OK' },
      },
    ),
  };
}

async function runOrganizationCommand(inputs) {
  const { organization, cwd, format } = inputs;
  if (!organization) throw new Error('organization is required for org-scan');
  if (inputs.checkpointPath && inputs.resumeFrom) {
    throw new Error('checkpoint-path and resume-from cannot be used together');
  }
  if (inputs.fresh && inputs.resumeFrom) {
    throw new Error('fresh and resume-from cannot be used together');
  }
  let progressReporter;
  try {
    const run = await runOrganizationScan({
      scan: {
        organization,
        cwd,
        token: inputs.token,
        repositories: inputs.repositories,
        visibility: inputs.visibility,
        includeArchived: inputs.includeArchived,
        includeDisabled: inputs.includeDisabled,
        includeForks: inputs.includeForks,
        maxRepositories: inputs.maxRepositories,
        concurrency: inputs.concurrency,
        severity: inputs.severity,
        explain: inputs.explain,
        configPath: inputs.ignoreConfig ? false : inputs.configPath,
        baseline: inputs.baseline,
      },
      scanOrganization,
      format,
      output: 'file',
      outputPath: inputs.requestedOutput,
      checkpointPath: inputs.checkpointPath,
      resumePath: inputs.resumeFrom,
      fresh: inputs.fresh,
      autoCheckpoint: inputs.autoCheckpoint,
      previousReportPath: inputs.previousReportPath,
      labels: { output: 'output-path', checkpoint: 'checkpoint-path', resume: 'resume-from' },
      openProgress: () => {
        progressReporter = createOrganizationProgressReporter({
          mode: inputs.progress ? 'plain' : 'none',
          context: 'ci',
          stream: process.stderr,
        });
        return progressReporter;
      },
    });
    return {
      result: run.result,
      payload: renderOrganizationScan(run.result, { format, cwd }),
      reportPath: run.outputDestination.path,
      requestedOutput: run.reportPath,
      checkpointPath: run.checkpointDestination?.path ?? '',
      checkpointResumed: run.resumed,
      repositoriesReused: run.repositoriesReused,
    };
  } finally {
    progressReporter?.close();
  }
}

async function publishOutcome(inputs, outcome) {
  const { command, format, cwd } = inputs;
  const { result, payload, requestedOutput } = outcome;
  if (command !== 'org-scan' && (!['csv', 'html'].includes(format) || !requestedOutput)) {
    process.stdout.write(payload);
  }
  const annotationResult = inputs.annotationsEnabled
    ? limitAnnotations(collectAnnotations({ command, result, cwd }))
    : { emitted: [], omitted: 0 };
  const annotationCommands = renderAnnotationCommands(annotationResult.emitted);
  if (annotationCommands) process.stdout.write(annotationCommands);
  const reportPath = await writeReportOutput(inputs, outcome);
  await publishActionOutputs(inputs, { ...outcome, reportPath }, annotationResult);
  if (shouldFailAction({ command, result, failOnFindings: inputs.failOnFindings })) {
    process.exitCode = 1;
  }
}

async function writeReportOutput({ command, format, cwd }, outcome) {
  const { requestedOutput, payload } = outcome;
  if (!requestedOutput) return outcome.reportPath;
  const reportPath = outcome.reportPath || resolve(cwd, requestedOutput);
  await writeFileGuarded({ path: reportPath, content: payload, dryRun: false, cwd });
  if (command === 'org-scan') {
    process.stdout.write(
      `Organization ${format.toUpperCase()} report written to ${actionLogText(requestedOutput)}\n`,
    );
  } else if (['csv', 'html'].includes(format)) {
    process.stdout.write(
      `${format.toUpperCase()} report written to ${actionLogText(requestedOutput)}\n`,
    );
  }
  return reportPath;
}

async function publishActionOutputs(inputs, outcome, annotationResult) {
  const { command, cwd, write } = inputs;
  const { result, reportPath, checkpointPath, checkpointResumed, repositoriesReused } = outcome;
  const metrics = collectActionMetrics({ command, result, repositoriesReused });
  await setOutput('status', result.status);
  await setNumericOutputs(metrics);
  await setOutput(
    'coverage-complete',
    command === 'org-scan' ? String(result.coverage?.complete === true) : '',
  );
  await setOutput('annotations', String(annotationResult.emitted.length));
  await setOutput('annotations-skipped', String(annotationResult.omitted));
  await setOutput('report-path', reportPath);
  await setOutput('checkpoint-path', checkpointPath);
  await appendSummary(renderActionSummary({
    command,
    result,
    cwd,
    metrics,
    annotations: annotationResult.emitted.length,
    annotationsSkipped: annotationResult.omitted,
    reportPath,
    checkpointPath,
    checkpointResumed,
    repositoriesReused,
    write,
  }));
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

async function setOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  const delimiter = `actions_warden_${randomUUID().replaceAll('-', '')}`;
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `${name}<<${delimiter}\n${value}\n${delimiter}\n`,
    'utf8',
  );
}

async function setNumericOutputs(metrics) {
  for (const [output, key] of ACTION_NUMERIC_OUTPUTS) {
    await setOutput(output, String(metrics[key]));
  }
}

async function appendSummary(markdown) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    markdown,
    'utf8',
  );
}

/** Redact and visibly escape control bytes before writing ordinary Action logs. */
function actionLogText(value) {
  return [...redact(value)].map(character => {
    const codePoint = character.codePointAt(0);
    return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)
      ? `\\u${codePoint.toString(16).padStart(4, '0')}`
      : character;
  }).join('');
}

main().catch(async error => {
  const message = actionLogText(String(error?.message ?? error));
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
  const annotations = annotationsEnabled ? 1 : 0;
  await setOutput('status', 'FAIL').catch(() => {});
  await setNumericOutputs(emptyActionMetrics({ errors: 1 })).catch(() => {});
  await setOutput('coverage-complete', '').catch(() => {});
  await setOutput('annotations', String(annotations)).catch(() => {});
  await setOutput('annotations-skipped', '0').catch(() => {});
  await setOutput('report-path', '').catch(() => {});
  await setOutput('checkpoint-path', '').catch(() => {});
  await appendSummary(renderActionFailureSummary({
    command: input('command') || 'audit',
    message,
    annotations,
  })).catch(() => {});
  process.exitCode = 2;
});
