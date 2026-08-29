#!/usr/bin/env node
/**
 * actions-warden CLI entry point.
 *
 * Commands: audit, pin, upgrade, verify, report, org-scan, rules
 * Global flags: --format, --output, --output-path, --workflow, --token
 *
 * Mutating operations (pin, upgrade) only write when --write is present.
 *
 * Exit codes:
 *   0  no findings / no errors
 *   1  findings reported (audit FAIL) or errors during pin/upgrade
 *   2  invalid arguments
 */

import { realpath } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { Command, Option } from 'commander';

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
import { formatOrganizationProgress } from './lib/org-progress.js';
import {
  AGENT_MODE_ENVIRONMENT_VARIABLE,
  createOrganizationAgentArtifacts,
  renderOrganizationAgentReceipt,
  resolveAgentMode,
} from './lib/agent-mode.js';

const program = new Command();
const require = createRequire(import.meta.url);
const { version } = require('../package.json');
program
  .name('actions-warden')
  .description('Audit GitHub Actions across repositories and organizations; pin, verify, and upgrade dependencies.')
  .version(version);

const formatOption = new Option('--format <fmt>', 'output format').choices(['toon', 'json', 'text', 'sarif']).default('toon');
const outputOption = new Option('--output <dest>', 'output destination').choices(['stdout', 'file']).default('stdout');

function addCommonOptions(cmd) {
  return cmd
    .option('-w, --workflow <pattern...>', 'workflow path or glob (repeatable)')
    .option('--cwd <dir>', 'working directory', process.cwd())
    .option('--token <token>', 'GitHub token (overrides GITHUB_TOKEN / GH_TOKEN)')
    .addOption(formatOption)
    .addOption(outputOption)
    .option('--output-path <path>', 'file path when --output=file');
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

addCommonOptions(program.command('audit'))
  .description('Scan workflows for security findings')
  .addOption(new Option('--severity <level>', 'minimum severity').choices(['low', 'medium', 'high', 'critical']))
  .option('--explain', 'include plain-English remediation hint for each finding', false)
  .option('--config <path>', 'repository policy file (default: .actions-warden.yml)')
  .option('--ignore-config', 'do not load repository policy', false)
  .option('--baseline <path>', 'suppress findings recorded in a baseline')
  .option('--create-baseline <path>', 'write the current findings as a baseline')
  .action(async (opts) => {
    const createBaseline = opts.createBaseline;
    if (createBaseline && opts.baseline) {
      throw new Error('--baseline and --create-baseline cannot be used together');
    }
    if (opts.ignoreConfig && opts.config) {
      throw new Error('--config and --ignore-config cannot be used together');
    }
    const result = await audit({
      cwd: opts.cwd,
      workflows: opts.workflow,
      severity: opts.severity,
      explain: Boolean(opts.explain),
      configPath: opts.ignoreConfig ? false : opts.config,
      baseline: opts.baseline,
      ignoreBaseline: Boolean(createBaseline),
    });
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
  .option('--write', 'apply changes (disables dry-run)', false)
  .option('--dry-run', 'explicitly keep dry-run mode (the default)', false)
  .option('--fix <id>', 'apply only the change with this id')
  .action(async (opts) => {
    if (opts.write && opts.dryRun) {
      process.stderr.write('error: --write and --dry-run cannot be used together\n');
      process.exitCode = 2;
      return;
    }
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
  .option('--write', 'apply changes (disables dry-run)', false)
  .option('--dry-run', 'explicitly keep dry-run mode (the default)', false)
  .addOption(new Option('--mode <m>', 'upgrade scope').choices(['major', 'minor', 'patch']).default('minor'))
  .option('--min-age <days>', 'cooldown: only accept tags older than this many days', '7')
  .option('--fix <id>', 'apply only the change with this id')
  .action(async (opts) => {
    if (opts.write && opts.dryRun) {
      process.stderr.write('error: --write and --dry-run cannot be used together\n');
      process.exitCode = 2;
      return;
    }
    const dryRun = !opts.write;
    const minAgeDays = Number.parseInt(opts.minAge, 10);
    if (Number.isNaN(minAgeDays) || minAgeDays < 0) {
      process.stderr.write('error: --min-age must be a non-negative integer\n');
      process.exitCode = 2;
      return;
    }
    const result = await upgrade({
      cwd: opts.cwd,
      workflows: opts.workflow,
      dryRun,
      token: opts.token,
      mode: opts.mode,
      fix: opts.fix,
      minAgeDays,
    });
    const payload = renderUpgrade(result, { format: opts.format, dryRun, mode: opts.mode, cwd: opts.cwd });
    await emit(payload, opts);
    process.exitCode = result.status === 'OK' ? 0 : 1;
  });

addCommonOptions(program.command('report'))
  .description('Combined audit + pin (dry) + upgrade (dry) report')
  .addOption(new Option('--mode <m>', 'upgrade scope').choices(['major', 'minor', 'patch']).default('minor'))
  .addOption(new Option('--severity <level>', 'minimum audit severity').choices(['low', 'medium', 'high', 'critical']))
  .option('--explain', 'include remediation hints in audit findings', false)
  .option('--min-age <days>', 'cooldown for upgrades (days)', '7')
  .option('--offline', 'skip network calls (audit only)', false)
  .option('--config <path>', 'repository policy file (default: .actions-warden.yml)')
  .option('--ignore-config', 'do not load repository policy', false)
  .option('--baseline <path>', 'suppress audit findings recorded in a baseline')
  .action(async (opts) => {
    const minAgeDays = Number.parseInt(opts.minAge, 10);
    if (Number.isNaN(minAgeDays) || minAgeDays < 0) {
      process.stderr.write('error: --min-age must be a non-negative integer\n');
      process.exitCode = 2;
      return;
    }
    if (opts.ignoreConfig && opts.config) {
      throw new Error('--config and --ignore-config cannot be used together');
    }
    const result = await report({
      cwd: opts.cwd,
      workflows: opts.workflow,
      token: opts.token,
      mode: opts.mode,
      severity: opts.severity,
      explain: Boolean(opts.explain),
      skipResolve: Boolean(opts.offline),
      minAgeDays,
      configPath: opts.ignoreConfig ? false : opts.config,
      baseline: opts.baseline,
    });
    const payload = renderReport(result, { format: opts.format, mode: opts.mode, cwd: opts.cwd });
    await emit(payload, opts);
    process.exitCode = result.status === 'OK' ? 0 : 1;
  });

addCommonOptions(program.command('verify'))
  .description('Verify pinned SHAs and version metadata against GitHub')
  .action(async (opts) => {
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
  .option('-r, --repository <pattern...>', 'repository name or glob (repeatable)')
  .addOption(new Option('--visibility <visibility>', 'repository visibility').choices(['all', 'public', 'private', 'internal']).default('all'))
  .option('--include-archived', 'include archived repositories', false)
  .option('--include-disabled', 'include disabled repositories', false)
  .option('--include-forks', 'include forked repositories', false)
  .option('--max-repos <count>', 'scan at most this many repositories')
  .option('--concurrency <count>', 'concurrent repository scans (1-16)', '4')
  .addOption(new Option('--severity <level>', 'minimum severity').choices(['low', 'medium', 'high', 'critical']))
  .option('--explain', 'include plain-English remediation hint for each finding', false)
  .option('--config <path>', 'organization-wide policy file (default: .actions-warden.yml)')
  .option('--ignore-config', 'do not load organization-wide policy', false)
  .option('--baseline <path>', 'suppress findings recorded in an organization baseline')
  .option('--checkpoint <path>', 'create or replace a resumable scan checkpoint')
  .option('--resume <path>', 'resume from and update an existing checkpoint')
  .addOption(new Option('--progress <mode>', 'live progress on stderr').choices(['auto', 'always', 'never']).default('auto'))
  .option('--agent-mode', 'use bounded AI-agent output and automatic artifacts')
  .option('--no-agent-mode', 'disable agent mode from the environment')
  .option('--cwd <dir>', 'working directory', process.cwd())
  .option('--token <token>', 'GitHub token (overrides GITHUB_TOKEN / GH_TOKEN)')
  .addOption(formatOption)
  .addOption(outputOption)
  .option('--output-path <path>', 'file path when --output=file')
  .action(async (organization, opts, command) => {
    if (opts.ignoreConfig && opts.config) {
      throw new Error('--config and --ignore-config cannot be used together');
    }
    if (opts.checkpoint && opts.resume) {
      throw new Error('--checkpoint and --resume cannot be used together');
    }
    const concurrency = parsePositiveInteger(opts.concurrency, '--concurrency');
    const maxRepositories = opts.maxRepos === undefined
      ? undefined
      : parsePositiveInteger(opts.maxRepos, '--max-repos');
    const agentMode = resolveAgentMode({
      optionValue: opts.agentMode,
      optionSource: command.getOptionValueSource('agentMode'),
      environmentValue: process.env[AGENT_MODE_ENVIRONMENT_VARIABLE],
    });
    const effective = { ...opts };
    if (agentMode) {
      if (command.getOptionValueSource('format') === 'default') effective.format = 'json';
      if (command.getOptionValueSource('output') === 'default') effective.output = 'file';
      if (command.getOptionValueSource('progress') === 'default') effective.progress = 'never';
    }
    const agentArtifacts = agentMode
      ? await createOrganizationAgentArtifacts({
          organization,
          cwd: effective.cwd,
          repositories: effective.repository,
          visibility: effective.visibility,
          includeArchived: Boolean(effective.includeArchived),
          includeDisabled: Boolean(effective.includeDisabled),
          includeForks: Boolean(effective.includeForks),
          maxRepositories,
          severity: effective.severity,
          explain: Boolean(effective.explain),
          configPath: effective.ignoreConfig ? false : effective.config,
          baseline: effective.baseline,
          reportFormat: effective.format,
        })
      : null;
    if (agentMode && effective.output === 'file' && !effective.outputPath) {
      effective.outputPath = agentArtifacts.reportPath;
    }
    let checkpointPath = effective.resume ?? effective.checkpoint;
    let resume = Boolean(effective.resume);
    if (agentMode && !checkpointPath) {
      checkpointPath = agentArtifacts.checkpointPath;
      resume = agentArtifacts.resume;
    }
    if (
      checkpointPath
      && effective.output === 'file'
      && effective.outputPath
      && await samePath(
        resolve(effective.cwd, checkpointPath),
        resolve(effective.cwd, effective.outputPath),
      )
    ) {
      throw new Error('checkpoint and report output paths must be different');
    }
    const result = await scanOrganization({
      organization,
      cwd: effective.cwd,
      token: effective.token,
      repositories: effective.repository,
      visibility: effective.visibility,
      includeArchived: Boolean(effective.includeArchived),
      includeDisabled: Boolean(effective.includeDisabled),
      includeForks: Boolean(effective.includeForks),
      maxRepositories,
      concurrency,
      severity: effective.severity,
      explain: Boolean(effective.explain),
      configPath: effective.ignoreConfig ? false : effective.config,
      baseline: effective.baseline,
      checkpointPath,
      resume,
      onProgress: progressEnabled(effective.progress)
        ? event => {
            const message = formatOrganizationProgress(event);
            if (message) process.stderr.write(message);
          }
        : undefined,
    });
    const payload = renderOrganizationScan(result, {
      format: effective.format,
      cwd: effective.cwd,
    });
    await emit(payload, effective);
    if (agentMode && effective.output === 'file') {
      process.stdout.write(renderOrganizationAgentReceipt({
        result,
        reportPath: effective.outputPath,
        reportFormat: effective.format,
        checkpointPath,
        resumed: resume,
      }));
    }
    process.exitCode = result.status === 'OK' ? 0 : 1;
  });

program.command('rules')
  .description('List available audit rules')
  .addOption(formatOption)
  .action((opts) => {
    const rules = listRules();
    const payload = fmt(opts.format, rules.map(r => ({ label: 'RULE', fields: r })), {
      status: 'OK',
      json: { schemaVersion: '1.0', rules, status: 'OK' },
    });
    process.stdout.write(payload);
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`error: ${err.message}\n`);
  process.exitCode = 2;
});

function parsePositiveInteger(value, option) {
  if (!/^\d+$/.test(value) || Number.parseInt(value, 10) < 1) {
    throw new Error(`${option} must be a positive integer`);
  }
  return Number.parseInt(value, 10);
}

function progressEnabled(mode) {
  return mode === 'always' || (mode === 'auto' && Boolean(process.stderr.isTTY));
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
