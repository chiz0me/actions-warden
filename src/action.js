#!/usr/bin/env node

import { appendFile, lstat } from 'node:fs/promises';
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
import { sameFilePath } from './lib/path-equality.js';
import {
  compareOrganizationReports,
  loadOrganizationReport,
} from './lib/org-report-comparison.js';
import { createOrganizationScanArtifacts } from './lib/agent-mode.js';
import { loadConfig } from './lib/config.js';
import { loadBaseline } from './lib/baseline.js';
import {
  assertDestinationsAreDistinct,
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
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
const VISIBILITIES = new Set(['all', 'public', 'private', 'internal']);

async function main() {
  const command = input('command') || 'audit';
  const requestedFormat = input('format') || 'auto';
  const format = requestedFormat === 'auto'
    ? (command === 'org-scan' ? 'json' : 'toon')
    : requestedFormat;
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
  const configuredCheckpointPath = input('checkpoint-path') || undefined;
  const resumeFrom = input('resume-from') || undefined;
  const previousReportPath = input('previous-report') || undefined;
  const progress = booleanInput('progress', true);
  const fresh = booleanInput('fresh', false);
  const autoCheckpoint = booleanInput('auto-checkpoint', true);
  let requestedOutput = input('output-path') || undefined;

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

  let result;
  let payload;
  let reportPath = '';
  let activeCheckpointPath = '';
  let checkpointResumed = false;
  let repositoriesReused = 0;

  if (requestedOutput && command !== 'org-scan') {
    const outputDestination = await validateWriteDestination({
      label: 'output-path',
      path: requestedOutput,
      cwd,
    });
    reportPath = outputDestination.path;
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
  }

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
      break;
    case 'verify':
      result = await verify({ cwd, workflows, token });
      payload = renderVerify(result, { format, cwd });
      break;
    case 'org-scan': {
      if (!organization) throw new Error('organization is required for org-scan');
      if (configuredCheckpointPath && resumeFrom) {
        throw new Error('checkpoint-path and resume-from cannot be used together');
      }
      if (fresh && resumeFrom) {
        throw new Error('fresh and resume-from cannot be used together');
      }
      const needsGeneratedCheckpoint = (
        !configuredCheckpointPath
        && !resumeFrom
        && autoCheckpoint
      );
      const artifacts = await createOrganizationScanArtifacts({
        organization,
        cwd,
        repositories,
        visibility,
        includeArchived,
        includeDisabled,
        includeForks,
        maxRepositories,
        severity,
        explain,
        configPath: ignoreConfig ? false : configPath,
        baseline,
        reportFormat: format,
      });
      requestedOutput ??= artifacts.reportPath;
      const outputDestination = await validateWriteDestination({
        label: 'output-path',
        path: requestedOutput,
        cwd,
      });
      reportPath = outputDestination.path;
      const selectedCheckpointPath = resumeFrom
        ?? configuredCheckpointPath
        ?? (needsGeneratedCheckpoint ? artifacts.checkpointPath : undefined);
      checkpointResumed = Boolean(resumeFrom);
      if (selectedCheckpointPath && !resumeFrom) {
        checkpointResumed = !fresh && await pathExists(resolve(cwd, selectedCheckpointPath));
      }
      const checkpointDestination = selectedCheckpointPath
        ? await validateWriteDestination({
            label: resumeFrom ? 'resume-from' : 'checkpoint-path',
            path: selectedCheckpointPath,
            cwd,
          })
        : null;
      activeCheckpointPath = checkpointDestination?.path ?? '';
      const destinations = [outputDestination, checkpointDestination].filter(Boolean);
      await assertDestinationsAreDistinct(destinations);
      await assertDestinationsUseSafeNames(destinations, cwd);
      await assertDestinationsDoNotReplaceControls(
        destinations,
        [
          { label: 'active config', path: artifacts.configPath },
          { label: 'active baseline', path: artifacts.baselinePath },
        ],
      );
      if (
        activeCheckpointPath
        && await sameFilePath(activeCheckpointPath, reportPath)
      ) throw new Error('checkpoint and report output paths must be different');
      if (
        previousReportPath
        && activeCheckpointPath
        && await sameFilePath(
          resolve(cwd, previousReportPath),
          activeCheckpointPath,
        )
      ) throw new Error('checkpoint and previous report paths must be different');
      if (
        previousReportPath
        && await sameFilePath(
          resolve(cwd, previousReportPath),
          reportPath,
        )
      ) throw new Error('output and previous report paths must be different');
      const previousReport = previousReportPath
        ? await loadOrganizationReport({ path: previousReportPath, cwd })
        : null;
      const progressReporter = createOrganizationProgressReporter({
        mode: progress ? 'plain' : 'none',
        context: 'ci',
        stream: process.stderr,
      });
      try {
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
          checkpointPath: activeCheckpointPath || undefined,
          resume: checkpointResumed,
          onProgress: event => {
            if (event.type === 'repository-completed' && event.reused) {
              repositoriesReused += 1;
            }
            progressReporter.emit(event);
          },
        });
      } catch (error) {
        progressReporter.emit({
          type: 'scan-failed',
          organization,
          error: String(error?.message ?? error),
        });
        throw error;
      } finally {
        progressReporter.close();
      }
      if (previousReport) {
        const currentReport = JSON.parse(renderOrganizationScan(result, {
          format: 'json',
          cwd,
        }));
        result.comparison = compareOrganizationReports({
          previous: previousReport,
          current: currentReport,
        });
      }
      payload = renderOrganizationScan(result, { format, cwd });
      await assertDestinationsDoNotReplaceControls(
        [{ label: 'report output', path: reportPath }],
        [
          { label: 'active config', path: result.configPath },
          { label: 'active baseline', path: result.baseline.path },
        ],
      );
      break;
    }
    case 'rules': {
      const rules = listRules();
      result = { status: 'OK' };
      payload = renderFormat(
        format,
        rules.map(rule => ({ label: 'RULE', fields: rule })),
        {
          status: 'OK',
          title: 'Audit rule catalog',
          json: { schemaVersion: '1.0', rules, status: 'OK' },
        },
      );
      break;
    }
    default:
      throw new Error(`unknown command: ${command}`);
  }

  if (command !== 'org-scan' && (!['csv', 'html'].includes(format) || !requestedOutput)) {
    process.stdout.write(payload);
  }
  const annotationResult = annotationsEnabled
    ? limitAnnotations(collectAnnotations({ command, result, cwd }))
    : { emitted: [], omitted: 0 };
  const annotationCommands = renderAnnotationCommands(annotationResult.emitted);
  if (annotationCommands) process.stdout.write(annotationCommands);

  if (requestedOutput) {
    reportPath ||= resolve(cwd, requestedOutput);
    await writeFileGuarded({
      path: reportPath,
      content: payload,
      dryRun: false,
      cwd,
    });
    if (command === 'org-scan') {
      process.stdout.write(
        `Organization ${format.toUpperCase()} report written to ${actionLogText(requestedOutput)}\n`,
      );
    } else if (['csv', 'html'].includes(format)) {
      process.stdout.write(
        `${format.toUpperCase()} report written to ${actionLogText(requestedOutput)}\n`,
      );
    }
  }

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
  await setOutput('checkpoint-path', activeCheckpointPath);
  await appendSummary(renderActionSummary({
    command,
    result,
    cwd,
    metrics,
    annotations: annotationResult.emitted.length,
    annotationsSkipped: annotationResult.omitted,
    reportPath,
    checkpointPath: activeCheckpointPath,
    checkpointResumed,
    repositoriesReused,
    write,
  }));

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

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
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
