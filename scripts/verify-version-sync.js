#!/usr/bin/env node
/**
 * Verify the version field in package.json matches .claude-plugin/plugin.json.
 *
 * The release workflow expects these two to track together; a mismatch will
 * publish an out-of-sync plugin to the marketplace.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const pkgPath = resolve(process.cwd(), 'package.json');
const pluginPath = resolve(process.cwd(), '.claude-plugin/plugin.json');

const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
const plugin = JSON.parse(await readFile(pluginPath, 'utf8'));

if (pkg.version !== plugin.version) {
  process.stderr.write(
    `version mismatch:\n  package.json            ${pkg.version}\n  .claude-plugin/plugin.json ${plugin.version}\n`,
  );
  process.stderr.write('bump both files to the same value before committing.\n');
  process.exit(1);
}
process.stdout.write(`versions in sync: ${pkg.version}\n`);
