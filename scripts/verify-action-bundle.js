#!/usr/bin/env node

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundleFiles = ['dist/index.js', 'dist/package.json'];
try {
  const indexedBundles = new Map();

  for (const file of bundleFiles) {
    const tracked = spawnSync('git', ['show', `:${file}`], {
      cwd: root,
      maxBuffer: 16 * 1024 * 1024,
    });
    if (tracked.status !== 0) {
      throw new Error(`${file} is not staged or tracked; the tagged Action ref would not contain a runnable bundle`);
    }
    indexedBundles.set(file, tracked.stdout);
  }

  const output = await mkdtemp(join(tmpdir(), 'actions-warden-bundle-'));
  try {
    const cli = resolve(root, 'node_modules', '@vercel', 'ncc', 'dist', 'ncc', 'cli.js');
    const built = spawnSync(process.execPath, [cli, 'build', 'src/action.js', '-o', output], {
      cwd: root,
      stdio: 'inherit',
    });
    if (built.status !== 0) {
      throw new Error(`Action bundle build failed with exit code ${built.status ?? 'unknown'}`);
    }

    for (const file of bundleFiles) {
      const name = file.slice('dist/'.length);
      const [workingTree, generated] = await Promise.all([
        readFile(resolve(root, file)),
        readFile(resolve(output, name)),
      ]);
      if (!workingTree.equals(generated)) {
        throw new Error(`${file} is stale; run npm run build:action and commit the result`);
      }
      if (!indexedBundles.get(file).equals(generated)) {
        throw new Error(`${file} has generated changes that are not staged`);
      }
    }
  } finally {
    await rm(output, { recursive: true, force: true });
  }

  console.log('Action bundle is tracked and reproducible.');
} catch (error) {
  process.stderr.write(`error: ${error.message}\n`);
  process.exitCode = 1;
}
