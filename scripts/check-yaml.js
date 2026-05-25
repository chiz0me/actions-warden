#!/usr/bin/env node
/**
 * Parse each YAML file passed on the command line; fail on syntax errors.
 *
 * Used as a pre-commit hook so broken workflow YAML is caught before push.
 */

import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

const files = process.argv.slice(2);
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
