#!/usr/bin/env node
/**
 * actions-warden CLI entry point.
 *
 * Commands: audit, pin, upgrade, report, rules
 * Global flags: --format, --output, --output-path, --workflow, --token
 *
 * Destructive operations (pin, upgrade) default to --dry-run=true. Pass
 * --write to mutate workflow files.
 *
 * Exit codes:
 *   0  no findings / no errors
 *   1  findings reported (audit FAIL) or errors during pin/upgrade
 *   2  invalid arguments
 */

import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Command, Option } from 'commander';

import { audit, renderAudit } from './commands/audit.js';
import { pin, renderPin } from './commands/pin.js';
import { upgrade, renderUpgrade } from './commands/upgrade.js';
import { report, renderReport } from './commands/report.js';
import { listRules } from './rules/index.js';
import { format as fmt } from './lib/formatter.js';

const program = new Command();
program
  .name('actions-warden')
  .description('Audit, pin, and upgrade GitHub Actions workflows.')
  .version('0.1.0');

const formatOption = new Option('--format <fmt>', 'output format').choices(['toon', 'json', 'text']).default('toon');
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
    const path = opts.outputPath ?? 'actions-warden-output.txt';
    await writeFile(resolve(opts.cwd ?? process.cwd(), path), payload, 'utf8');
    return;
  }
  process.stdout.write(payload);
}

addCommonOptions(program.command('audit'))
  .description('Scan workflows for security findings')
  .addOption(new Option('--severity <level>', 'minimum severity').choices(['low', 'medium', 'high', 'critical']))
  .option('--explain', 'include plain-English remediation hint for each finding', false)
  .action(async (opts) => {
    const result = await audit({
      cwd: opts.cwd,
      workflows: opts.workflow,
      severity: opts.severity,
      explain: Boolean(opts.explain),
    });
    const payload = renderAudit(result, { format: opts.format, explain: Boolean(opts.explain), cwd: opts.cwd });
    await emit(payload, opts);
    process.exit(result.status === 'OK' ? 0 : 1);
  });

addCommonOptions(program.command('pin'))
  .description('Pin tag/branch refs to immutable commit SHAs')
  .option('--write', 'apply changes (disables dry-run)', false)
  .option('--dry-run <bool>', 'dry-run mode', 'true')
  .option('--fix <id>', 'apply only the change with this id')
  .action(async (opts) => {
    const dryRun = !opts.write && opts.dryRun !== 'false';
    const result = await pin({
      cwd: opts.cwd,
      workflows: opts.workflow,
      dryRun,
      token: opts.token,
      fix: opts.fix,
    });
    const payload = renderPin(result, { format: opts.format, dryRun, cwd: opts.cwd });
    await emit(payload, opts);
    process.exit(result.status === 'OK' ? 0 : 1);
  });

addCommonOptions(program.command('upgrade'))
  .description('Upgrade pinned/tagged actions to a newer version')
  .option('--write', 'apply changes (disables dry-run)', false)
  .option('--dry-run <bool>', 'dry-run mode', 'true')
  .addOption(new Option('--mode <m>', 'upgrade scope').choices(['major', 'minor', 'patch']).default('minor'))
  .option('--min-age <days>', 'cooldown: only accept tags older than this many days', '7')
  .option('--fix <id>', 'apply only the change with this id')
  .action(async (opts) => {
    const dryRun = !opts.write && opts.dryRun !== 'false';
    const minAgeDays = Number.parseInt(opts.minAge, 10);
    if (Number.isNaN(minAgeDays) || minAgeDays < 0) {
      process.stderr.write('error: --min-age must be a non-negative integer\n');
      process.exit(2);
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
    process.exit(result.status === 'OK' ? 0 : 1);
  });

addCommonOptions(program.command('report'))
  .description('Combined audit + pin (dry) + upgrade (dry) report')
  .addOption(new Option('--mode <m>', 'upgrade scope').choices(['major', 'minor', 'patch']).default('minor'))
  .option('--min-age <days>', 'cooldown for upgrades (days)', '7')
  .option('--offline', 'skip network calls (audit only)', false)
  .action(async (opts) => {
    const minAgeDays = Number.parseInt(opts.minAge, 10);
    if (Number.isNaN(minAgeDays) || minAgeDays < 0) {
      process.stderr.write('error: --min-age must be a non-negative integer\n');
      process.exit(2);
    }
    const result = await report({
      cwd: opts.cwd,
      workflows: opts.workflow,
      token: opts.token,
      mode: opts.mode,
      skipResolve: Boolean(opts.offline),
      minAgeDays,
    });
    const payload = renderReport(result, { format: opts.format, mode: opts.mode, cwd: opts.cwd });
    await emit(payload, opts);
    process.exit(result.status === 'OK' ? 0 : 1);
  });

program.command('rules')
  .description('List available audit rules')
  .addOption(formatOption)
  .action((opts) => {
    const rules = listRules();
    const payload = fmt(opts.format, rules.map(r => ({ label: 'RULE', fields: r })), { status: 'OK', json: { rules, status: 'OK' } });
    process.stdout.write(payload);
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`error: ${err.message}\n`);
  process.exit(2);
});
