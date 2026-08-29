#!/usr/bin/env node
/**
 * Parse each YAML file passed on the command line; fail on syntax errors.
 *
 * Used as a pre-commit hook so broken workflow YAML is caught before push.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';

const requested = process.argv.slice(2);
const files = requested.length > 0 ? requested : await discover(process.cwd());
let failed = 0;

for (const file of files) {
  try {
    parse(await readFile(file, 'utf8'));
  } catch (err) {
    process.stderr.write(`${file}: ${err.message}\n`);
    failed += 1;
  }
}

if (failed > 0) {
  process.stderr.write(`\n${failed} file(s) failed YAML parsing.\n`);
  process.exit(1);
}

async function discover(directory, output = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (['.git', 'node_modules', 'dist', 'coverage'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await discover(path, output);
    } else if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) {
      output.push(path);
    }
  }
  return output.sort();
}
