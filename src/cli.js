#!/usr/bin/env node
/**
 * actions-warden CLI entry point.
 *
 * Commands: audit, pin, upgrade, verify, report, org-scan, rules
 * Common command flags include --format, --output, --output-path, and --workflow.
 *
 * Mutating operations (pin, upgrade) only write when --write is present.
 *
 * Exit codes:
 *   0  completed with status OK (or displayed help/version)
 *   1  completed with a structured FAIL result
 *   2  invocation-level failure
 */

import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { Command, CommanderError, InvalidArgumentError, Option } from 'commander';

import { audit, renderAudit } from './commands/audit.js';
import { pin, renderPin } from './commands/pin.js';
import { upgrade, renderUpgrade } from './commands/upgrade.js';
import { report, renderReport } from './commands/report.js';
import { verify, renderVerify } from './commands/verify.js';
import { scanOrganization, renderOrganizationScan } from './commands/org-scan.js';
import { listRules } from './rules/index.js';
import { format as fmt } from './lib/formatter.js';
import { writeFileGuarded } from './lib/writer.js';
import { serializeBaseline } from './lib/baseline.js';
import {
  createOrganizationProgressReporter,
  isScanFailureReported,
} from './lib/org-progress.js';
import { redact } from './lib/redact.js';
import { resolveTargets } from './lib/targets.js';
import {
  EXECUTION_CONTEXT_ENVIRONMENT_VARIABLE,
  renderOrganizationScanReceipt,
  resolveExecutionContext,
} from './lib/org-artifacts.js';
import { runOrganizationScan } from './lib/org-run.js';
import { SEVERITY_LEVELS, VISIBILITY_FILTERS } from './lib/org-schema.js';
import { writeOrganizationReportDirectory } from './lib/org-report-directory.js';
import {
  assertDestinationsAreDistinct,
  assertDestinationsDoNotReplaceControls,
  assertDestinationsUseSafeNames,
  validateWriteDestination,
} from './lib/destination.js';

const program = new Command();
const require = createRequire(import.meta.url);
const { version } = require('../package.json');
const FIX_ID_RE = /^[0-9a-f]{16}$/i;
let structuredProgressContext = null;
program
  .name('actions-warden')
  .description('Audit GitHub Actions across repositories and organizations; pin, verify, and upgrade dependencies.')
  .version(version)
  .exitOverride(error => {
    if (error.exitCode !== 0) error.exitCode = 2;
    throw error;
  });

function createFormatOption(defaultValue = 'toon') {
  return new Option('--format <fmt>', 'output format')
    .choices(['toon', 'json', 'text', 'csv', 'sarif', 'html'])
    .default(defaultValue);
}

function createOutputOption(defaultValue = 'stdout') {
  return new Option('--output <dest>', 'output destination')
    .choices(['stdout', 'file'])
    .default(defaultValue);
}

function createOutputPathOption() {
  return new Option('--output-path <path>', 'report path (implies --output=file)')
    .argParser(value => parseNonEmpty(value, '--output-path'))
    .implies({ output: 'file' });
}

function createCwdOption() {
  return new Option('--cwd <dir>', 'working directory')
    .argParser(value => parseNonEmpty(value, '--cwd'))
    .default(process.cwd(), 'current directory');
}

function createTokenOption() {
  return new Option('--token <token>', 'GitHub token override (prefer GITHUB_TOKEN or GH_TOKEN)')
    .argParser(value => parseNonEmpty(value, '--token'));
}

function addCommonOptions(cmd, { includeToken = true } = {}) {
  const configured = cmd
    .addOption(new Option('-w, --workflow <pattern...>', 'workflow path or glob (repeatable)')
      .argParser((value, previous) => collectNonEmpty(value, previous, '--workflow')))
    .addOption(createCwdOption());
  if (includeToken) configured.addOption(createTokenOption());
  return configured
    .addOption(createFormatOption())
    .addOption(createOutputOption())
    .addOption(createOutputPathOption());
}

async function emit(payload, opts) {
  if (opts.output === 'file') {
    if (!opts.outputPath) throw new Error('--output-path is required when --output=file');
    await writeFileGuarded({
      path: resolve(opts.cwd ?? process.cwd(), opts.outputPath),
      content: payload,
      dryRun: false,
      cwd: opts.cwd ?? process.cwd(),
    });
    return;
  }
  process.stdout.write(payload);
}

addCommonOptions(program.command('audit'), { includeToken: false })
  .description('Scan workflows for security findings')
  .addOption(new Option('--severity <level>', 'minimum severity').choices(SEVERITY_LEVELS))
  .option('--explain', 'include plain-English remediation hint for each finding')
  .addOption(new Option('--config <path>', 'repository policy file (default: .actions-warden.yml)')
    .argParser(value => parseNonEmpty(value, '--config'))
    .conflicts('ignoreConfig'))
  .addOption(new Option('--ignore-config', 'do not load repository policy').conflicts('config'))
  .addOption(new Option('--baseline <path>', 'suppress findings recorded in a baseline')
    .argParser(value => parseNonEmpty(value, '--baseline'))
    .conflicts('createBaseline'))
  .addOption(new Option('--create-baseline <path>', 'write the current findings as a baseline')
    .argParser(value => parseNonEmpty(value, '--create-baseline'))
    .conflicts('baseline'))
  .action(async (opts) => {
    const createBaseline = opts.createBaseline;
    const destinations = await preflightRepositoryCommand(opts, {
      additionalDestinations: createBaseline
        ? [{ option: '--create-baseline', path: createBaseline }]
        : [],
    });
    const result = await audit({
      cwd: opts.cwd,
      workflows: opts.workflow,
      severity: opts.severity,
      explain: Boolean(opts.explain),
      configPath: opts.ignoreConfig ? false : opts.config,
      baseline: opts.baseline,
      ignoreBaseline: Boolean(createBaseline),
    });
    await assertDestinationsDoNotReplaceControls(destinations, [
      { label: 'active config', path: result.configPath },
      ...(!createBaseline ? [{ label: 'active baseline', path: result.baseline.path }] : []),
    ]);
    if (createBaseline) {
      await writeFileGuarded({
        path: resolve(opts.cwd, createBaseline),
        content: serializeBaseline(result.allFindings, opts.cwd),
        dryRun: false,
        cwd: opts.cwd,
      });
      const payload = fmt(opts.format, [{
        label: 'BASELINE',
        fields: {
          path: createBaseline,
          findings: result.allFindings.length,
        },
      }], {
        status: 'OK',
        title: 'Finding baseline created',
        metadata: { path: createBaseline },
        json: {
          schemaVersion: '1.0',
          path: createBaseline,
          findings: result.allFindings.length,
          status: 'OK',
        },
      });
      await emit(payload, opts);
      process.exitCode = 0;
      return;
    }
    const payload = renderAudit(result, { format: opts.format, explain: Boolean(opts.explain), cwd: opts.cwd });
    await emit(payload, opts);
    process.exitCode = result.status === 'OK' ? 0 : 1;
  });

addCommonOptions(program.command('pin'))
  .description('Pin tag/branch refs to immutable commit SHAs')
  .addOption(new Option('--write', 'apply changes (disables dry-run)').conflicts('dryRun'))
  .addOption(new Option('--dry-run', 'explicitly keep dry-run mode (the default)').conflicts('write'))
  .addOption(new Option('--fix <id>', 'select only the 16-hex change id').argParser(parseFixId))
  .action(async (opts) => {
    await preflightRepositoryCommand(opts);
    const dryRun = !opts.write;
    const result = await pin({
      cwd: opts.cwd,
      workflows: opts.workflow,
      dryRun,
      token: opts.token,
      fix: opts.fix,
    });
    const payload = renderPin(result, { format: opts.format, dryRun, cwd: opts.cwd });
    await emit(payload, opts);
    process.exitCode = result.status === 'OK' ? 0 : 1;
  });

addCommonOptions(program.command('upgrade'))
  .description('Upgrade pinned/tagged actions to a newer version')
  .addOption(new Option('--write', 'apply changes (disables dry-run)').conflicts('dryRun'))
  .addOption(new Option('--dry-run', 'explicitly keep dry-run mode (the default)').conflicts('write'))
  .addOption(new Option('--mode <m>', 'upgrade scope').choices(['major', 'minor', 'patch']).default('minor'))
  .addOption(new Option('--min-age <days>', 'cooldown: only accept tags older than this many days')
    .argParser(value => parseInteger(value, '--min-age', { min: 0 }))
    .default(7))
  .addOption(new Option('--fix <id>', 'select only the 16-hex change id').argParser(parseFixId))
  .action(async (opts) => {
    await preflightRepositoryCommand(opts);
    const dryRun = !opts.write;
    const result = await upgrade({
      cwd: opts.cwd,
      workflows: opts.workflow,
      dryRun,
      token: opts.token,
      mode: opts.mode,
      fix: opts.fix,
      minAgeDays: opts.minAge,
    });
    const payload = renderUpgrade(result, { format: opts.format, dryRun, mode: opts.mode, cwd: opts.cwd });
    await emit(payload, opts);
    process.exitCode = result.status === 'OK' ? 0 : 1;
  });

addCommonOptions(program.command('report'))
  .description('Combined audit + pin (dry) + upgrade (dry) report')
  .addOption(new Option('--mode <m>', 'upgrade scope').choices(['major', 'minor', 'patch']).default('minor'))
  .addOption(new Option('--severity <level>', 'minimum audit severity').choices(SEVERITY_LEVELS))
  .option('--explain', 'include remediation hints in audit findings')
  .addOption(new Option('--min-age <days>', 'cooldown for upgrades (days)')
    .argParser(value => parseInteger(value, '--min-age', { min: 0 }))
    .default(7))
  .addOption(new Option('--offline', 'skip network calls (audit only)')
    .conflicts(['token', 'mode', 'minAge']))
  .addOption(new Option('--config <path>', 'repository policy file (default: .actions-warden.yml)')
    .argParser(value => parseNonEmpty(value, '--config'))
    .conflicts('ignoreConfig'))
  .addOption(new Option('--ignore-config', 'do not load repository policy').conflicts('config'))
  .addOption(new Option('--baseline <path>', 'suppress audit findings recorded in a baseline')
    .argParser(value => parseNonEmpty(value, '--baseline')))
  .action(async (opts) => {
    const destinations = await preflightRepositoryCommand(opts);
    const result = await report({
      cwd: opts.cwd,
      workflows: opts.workflow,
      token: opts.token,
      mode: opts.mode,
      severity: opts.severity,
      explain: Boolean(opts.explain),
      skipResolve: Boolean(opts.offline),
      minAgeDays: opts.minAge,
      configPath: opts.ignoreConfig ? false : opts.config,
      baseline: opts.baseline,
    });
    await assertDestinationsDoNotReplaceControls(destinations, [
      { label: 'active config', path: result.audit.configPath },
      { label: 'active baseline', path: result.audit.baseline.path },
    ]);
    const payload = renderReport(result, { format: opts.format, mode: opts.mode, cwd: opts.cwd });
    await emit(payload, opts);
    process.exitCode = result.status === 'OK' ? 0 : 1;
  });

addCommonOptions(program.command('verify'))
  .description('Verify pinned SHAs and version metadata against GitHub')
  .action(async (opts) => {
    await preflightRepositoryCommand(opts);
    const result = await verify({
      cwd: opts.cwd,
      workflows: opts.workflow,
      token: opts.token,
    });
    const payload = renderVerify(result, { format: opts.format, cwd: opts.cwd });
    await emit(payload, opts);
    process.exitCode = result.status === 'OK' ? 0 : 1;
  });

program.command('org-scan <organization>')
  .description('Scan workflow security across a GitHub organization')
  .addOption(new Option('-r, --repository <pattern...>', 'repository name or glob (repeatable)')
    .argParser((value, previous) => collectNonEmpty(value, previous, '--repository')))
  .addOption(new Option('--visibility <visibility>', 'repository visibility').choices(VISIBILITY_FILTERS).default('all'))
  .option('--include-archived', 'include archived repositories')
  .option('--include-disabled', 'include disabled repositories')
  .option('--include-forks', 'include forked repositories')
  .addOption(new Option('--max-repos <count>', 'scan at most this many repositories')
    .argParser(value => parseInteger(value, '--max-repos', { min: 1 })))
  .addOption(new Option('--concurrency <count>', 'concurrent repository scans (1-16)')
    .argParser(value => parseInteger(value, '--concurrency', { min: 1, max: 16 }))
    .default(4))
  .addOption(new Option('--severity <level>', 'minimum severity').choices(SEVERITY_LEVELS))
  .option('--explain', 'include plain-English remediation hint for each finding')
  .addOption(new Option('--config <path>', 'organization-wide policy file (default: .actions-warden.yml)')
    .argParser(value => parseNonEmpty(value, '--config'))
    .conflicts('ignoreConfig'))
  .addOption(new Option('--ignore-config', 'do not load organization-wide policy').conflicts('config'))
  .addOption(new Option('--baseline <path>', 'suppress findings recorded in an organization baseline')
    .argParser(value => parseNonEmpty(value, '--baseline')))
  .addOption(new Option('--checkpoint <path>', 'create or automatically resume a scan checkpoint')
    .argParser(value => parseNonEmpty(value, '--checkpoint'))
    .conflicts('resume'))
  .addOption(new Option('--resume <path>', 'resume from and update an existing checkpoint')
    .argParser(value => parseNonEmpty(value, '--resume'))
    .conflicts('checkpoint'))
  .addOption(new Option('--fresh', 'start fresh and replace the selected checkpoint')
    .conflicts('resume'))
  .addOption(new Option('--no-auto-checkpoint', 'disable the automatic scope-specific checkpoint'))
  .addOption(new Option('--previous-report <path>', 'compare with a prior organization JSON report')
    .argParser(value => parseNonEmpty(value, '--previous-report')))
  .addOption(new Option('--progress <mode>', 'stderr progress: auto, plain, json, or none')
    .choices(['auto', 'plain', 'json', 'none'])
    .default('auto'))
  .addOption(new Option('--report-dir <dir>', 'write compact JSON plus per-repository artifacts')
    .argParser(value => parseNonEmpty(value, '--report-dir'))
    .conflicts('outputPath'))
  .option('--agent-mode', 'use bounded AI-agent output and automatic artifacts')
  .option('--no-agent-mode', 'disable agent mode from the environment')
  .addOption(createCwdOption())
  .addOption(createTokenOption())
  .addOption(createFormatOption('json'))
  .addOption(createOutputOption('file'))
  .addOption(createOutputPathOption())
  .action(async (organization, opts, command) => {
    await validateWorkingDirectory(opts.cwd);
    assertMutuallyExclusiveFlags('--agent-mode', '--no-agent-mode');
    const executionContext = resolveExecutionContext({
      optionValue: opts.agentMode,
      optionSource: command.getOptionValueSource('agentMode'),
      environmentValue: process.env[EXECUTION_CONTEXT_ENVIRONMENT_VARIABLE],
    });
    const effective = resolveOrganizationScanOptions(opts, command);
    let progressReporter;
    try {
      const run = await runOrganizationScan({
        ...organizationRunOptions(organization, effective),
        scanOrganization,
        openProgress: () => {
          progressReporter = openOrganizationProgress({
            organization,
            effective,
            command,
            executionContext,
          });
          return progressReporter;
        },
      });
      await writeOrganizationOutput({
        run,
        effective,
        agentMode: executionContext === 'agent',
      });
      process.exitCode = run.result.status === 'OK' ? 0 : 1;
      progressReporter?.close();
    } catch (error) {
      if (!structuredProgressContext) progressReporter?.close();
      throw error;
    }
  });

program.command('rules')
  .description('List available audit rules')
  .addOption(createFormatOption())
  .action((opts) => {
    const rules = listRules();
    const payload = fmt(opts.format, rules.map(r => ({ label: 'RULE', fields: r })), {
      status: 'OK',
      title: 'Audit rule catalog',
      json: { schemaVersion: '1.0', rules, status: 'OK' },
    });
    process.stdout.write(payload);
  });

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof CommanderError) {
    process.exitCode = err.exitCode;
    return;
  }
  if (isScanFailureReported(err)) {
    // The scan adapter already emitted the terminal structured failure.
  } else if (structuredProgressContext) {
    structuredProgressContext.reporter.emit({
      type: 'command-failed',
      organization: structuredProgressContext.organization,
      error: String(err?.message ?? err),
    });
  } else {
    process.stderr.write(`error: ${cliErrorText(err)}\n`);
  }
  structuredProgressContext?.reporter.close();
  process.exitCode = 2;
});

function cliErrorText(error) {
  return [...redact(String(error?.message ?? error))]
    .map(char => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127 ? ' ' : char;
    })
    .join('');
}

function parseNonEmpty(value, option) {
  if (value.length === 0) {
    throw new InvalidArgumentError(`${option} must be non-empty`);
  }
  return value;
}

function collectNonEmpty(value, previous, option) {
  return [...(Array.isArray(previous) ? previous : []), parseNonEmpty(value, option)];
}

function parseInteger(value, option, { min, max = Number.MAX_SAFE_INTEGER }) {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError(`${option} must be an integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    if (min === 0 && max === Number.MAX_SAFE_INTEGER) {
      throw new InvalidArgumentError(`${option} must be a non-negative integer`);
    }
    if (min === 1 && max === Number.MAX_SAFE_INTEGER) {
      throw new InvalidArgumentError(`${option} must be a positive integer`);
    }
    throw new InvalidArgumentError(`${option} must be an integer from ${min} to ${max}`);
  }
  return parsed;
}

function parseFixId(value) {
  if (!FIX_ID_RE.test(value)) {
    throw new InvalidArgumentError('--fix must be a 16-character hexadecimal change id');
  }
  return value.toLowerCase();
}

async function preflightRepositoryCommand(opts, { additionalDestinations = [] } = {}) {
  await validateWorkingDirectory(opts.cwd);
  const outputDestination = await validateOutputDestination(opts);
  const destinations = outputDestination ? [outputDestination] : [];
  for (const destination of additionalDestinations) {
    destinations.push(await validateWriteDestination({
      ...destination,
      cwd: opts.cwd,
    }));
  }
  await assertDestinationsAreDistinct(destinations);
  await assertDestinationsUseSafeNames(destinations, opts.cwd);
  if (destinations.length > 0) {
    const workflows = await resolveTargets({ workflows: opts.workflow, cwd: opts.cwd });
    await assertDestinationsDoNotReplaceControls(
      destinations,
      workflows.map(path => ({ label: 'selected workflow', path })),
    );
  }
  return destinations;
}

async function validateWorkingDirectory(cwd) {
  if (typeof cwd !== 'string' || cwd.length === 0 || cwd.includes('\0')) {
    throw new Error('--cwd must be an existing directory');
  }
  let metadata;
  try {
    metadata = await stat(resolve(cwd));
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      throw new Error('--cwd must be an existing directory');
    }
    throw error;
  }
  if (!metadata.isDirectory()) throw new Error('--cwd must be an existing directory');
}

function assertOutputPathUsesFile(opts) {
  if (opts.outputPath && opts.output !== 'file') {
    throw new Error('--output-path cannot be used with --output=stdout');
  }
}

async function validateOutputDestination(opts) {
  assertOutputPathUsesFile(opts);
  if (opts.output !== 'file') return null;
  if (!opts.outputPath) throw new Error('--output-path is required when --output=file');
  return validateWriteDestination({
    option: '--output-path',
    path: opts.outputPath,
    cwd: opts.cwd ?? process.cwd(),
  });
}

function resolveOrganizationScanOptions(opts, command) {
  const effective = { ...opts };
  if (effective.reportDir) {
    if (command.getOptionValueSource('format') === 'cli' && effective.format !== 'json') {
      throw new Error('--report-dir supports only --format=json');
    }
    if (command.getOptionValueSource('output') === 'cli' && effective.output !== 'file') {
      throw new Error('--report-dir cannot be used with --output=stdout');
    }
    effective.format = 'json';
    effective.output = 'file';
  }
  if (effective.previousReport && effective.format === 'sarif') {
    throw new Error('--previous-report cannot be used with --format=sarif');
  }
  assertOutputPathUsesFile(effective);
  return effective;
}

function organizationRunOptions(organization, effective) {
  return {
    scan: {
      organization,
      cwd: effective.cwd,
      token: effective.token,
      repositories: effective.repository,
      visibility: effective.visibility,
      includeArchived: Boolean(effective.includeArchived),
      includeDisabled: Boolean(effective.includeDisabled),
      includeForks: Boolean(effective.includeForks),
      maxRepositories: effective.maxRepos,
      concurrency: effective.concurrency,
      severity: effective.severity,
      explain: Boolean(effective.explain),
      configPath: effective.ignoreConfig ? false : effective.config,
      baseline: effective.baseline,
    },
    format: effective.format,
    output: effective.output,
    outputPath: effective.outputPath,
    reportDirectory: effective.reportDir,
    checkpointPath: effective.checkpoint,
    resumePath: effective.resume,
    fresh: Boolean(effective.fresh),
    autoCheckpoint: effective.autoCheckpoint !== false,
    previousReportPath: effective.previousReport,
    labels: { output: '--output-path', checkpoint: '--checkpoint', resume: '--resume' },
  };
}

function openOrganizationProgress({ organization, effective, command, executionContext }) {
  const reporter = createOrganizationProgressReporter({
    mode: effective.progress,
    context: command.getOptionValueSource('progress') === 'cli' ? 'auto' : executionContext,
    stream: process.stderr,
  });
  if (reporter.mode === 'json') structuredProgressContext = { organization, reporter };
  return reporter;
}

async function writeOrganizationOutput({ run, effective, agentMode }) {
  const { result } = run;
  let reportPath = run.reportPath;
  let reportDirectoryPath;
  let manifestPath;
  if (run.reportDirectory) {
    const directoryResult = await writeOrganizationReportDirectory({
      result,
      path: effective.reportDir,
      cwd: effective.cwd,
    });
    reportPath = directoryResult.reportPath;
    reportDirectoryPath = directoryResult.directory;
    manifestPath = directoryResult.manifestPath;
  } else {
    const payload = renderOrganizationScan(result, {
      format: effective.format,
      cwd: effective.cwd,
    });
    await emit(payload, { ...effective, outputPath: run.reportPath });
  }
  if (effective.output !== 'file') return;
  process.stdout.write(renderOrganizationScanReceipt({
    result,
    reportPath,
    reportFormat: effective.format,
    checkpointPath: run.checkpointPath,
    resumed: run.resumed,
    repositoriesReused: run.repositoriesReused,
    reportLayout: run.reportDirectory ? 'directory' : 'single',
    reportDirectory: reportDirectoryPath,
    manifestPath,
    kind: agentMode ? 'actions-warden-agent-receipt' : 'actions-warden-org-scan-receipt',
  }));
}

function assertMutuallyExclusiveFlags(left, right) {
  const args = process.argv.slice(2);
  if (args.includes(left) && args.includes(right)) {
    throw new Error(`${left} and ${right} cannot be used together`);
  }
}

