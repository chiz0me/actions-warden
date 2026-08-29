#!/usr/bin/env node
/**
 * Verify package, plugin, lockfile, and exact public invocation versions agree.
 *
 * The release workflow expects every source to track together; a mismatch can
 * publish an out-of-sync CLI, Action bundle, documentation, or plugin.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { INVOCATION_PATHS } from './version-sources.js';

const pkgPath = resolve(process.cwd(), 'package.json');
const pluginPath = resolve(process.cwd(), '.claude-plugin/plugin.json');
const lockPath = resolve(process.cwd(), 'package-lock.json');
const runtimeVersionPath = resolve(process.cwd(), 'src/version.js');

const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
const plugin = JSON.parse(await readFile(pluginPath, 'utf8'));
const lock = JSON.parse(await readFile(lockPath, 'utf8'));
const runtimeVersionSource = await readFile(runtimeVersionPath, 'utf8');
const runtimeVersion = runtimeVersionSource.match(/VERSION\s*=\s*['"](\d+\.\d+\.\d+)['"]/)?.[1];

const versions = {
  'package.json': pkg.version,
  '.claude-plugin/plugin.json': plugin.version,
  'package-lock.json': lock.version,
  'package-lock.json#packages[""]': lock.packages?.['']?.version,
  'src/version.js': runtimeVersion,
};
for (const path of INVOCATION_PATHS) {
  const source = await readFile(resolve(process.cwd(), path), 'utf8');
  const matches = [...source.matchAll(/actions-warden@(\d+\.\d+\.\d+)/g)]
    .map(match => match[1]);
  if (matches.length === 0) {
    process.stderr.write(`version mismatch: ${path} has no exact actions-warden@X.Y.Z invocation\n`);
    process.exit(1);
  }
  const uniqueMatches = new Set(matches);
  if (uniqueMatches.size !== 1) {
    process.stderr.write(
      `version mismatch: ${path} invocations use ${[...uniqueMatches].join(', ')}\n`,
    );
    process.exit(1);
  }
  versions[path] = matches[0];
}
const unique = new Set(Object.values(versions));
if (unique.size !== 1) {
  process.stderr.write(
    `version mismatch:\n${Object.entries(versions)
      .map(([file, version]) => `  ${file.padEnd(38)} ${version ?? '<missing>'}`)
      .join('\n')}\n`,
  );
  process.stderr.write('bump every version source to the same value before committing.\n');
  process.exit(1);
}
process.stdout.write(`versions in sync: ${pkg.version}\n`);
