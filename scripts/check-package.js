#!/usr/bin/env node
/** Inspect the exact npm tarball manifest without creating a package archive. */

import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const MAX_FILES = 500;
const MAX_UNPACKED_BYTES = 5 * 1024 * 1024;

main().catch(error => {
  process.stderr.write(`error: ${error.message}\n`);
  process.exitCode = 1;
});

async function main() {
  const pkg = JSON.parse(await readFile(resolve(process.cwd(), 'package.json'), 'utf8'));
  const packed = runNpm(['pack', '--dry-run', '--json', '--ignore-scripts']);
  if (packed.status !== 0) {
    throw new Error(`npm pack inspection failed (exit ${packed.status ?? 'unknown'})`);
  }
  let raw;
  try {
    raw = JSON.parse(packed.stdout);
  } catch {
    throw new Error('npm pack did not return valid JSON');
  }
  const manifests = Array.isArray(raw) ? raw : Object.values(raw ?? {});
  if (manifests.length !== 1 || !isRecord(manifests[0])) {
    throw new Error('npm pack must return exactly one package manifest');
  }
  const manifest = manifests[0];
  if (manifest.name !== pkg.name || manifest.version !== pkg.version) {
    throw new Error('npm pack name/version does not match package.json');
  }
  if (!Array.isArray(manifest.files)) throw new Error('npm pack files are missing');
  if (manifest.files.length > MAX_FILES) {
    throw new Error(`npm package contains too many files: ${manifest.files.length}`);
  }
  if (!Number.isSafeInteger(manifest.unpackedSize) || manifest.unpackedSize > MAX_UNPACKED_BYTES) {
    throw new Error(`npm package unpacked size exceeds ${MAX_UNPACKED_BYTES} bytes`);
  }

  const files = new Map(manifest.files.map(file => [file.path, file]));
  const required = new Set([
    'AGENTS.md',
    'LICENSE',
    'README.md',
    'RELEASING.md',
    'package.json',
    'skills/actions-warden/SKILL.md',
    'src/index.js',
    'src/version.js',
    ...Object.values(pkg.bin ?? {}).map(packagePath),
    ...Object.values(pkg.exports ?? {})
      .filter(value => typeof value === 'string')
      .map(packagePath),
  ]);
  const missing = [...required].filter(path => !files.has(path));
  if (missing.length > 0) throw new Error(`npm package is missing: ${missing.join(', ')}`);

  const cliPath = packagePath(pkg.bin?.['actions-warden'] ?? '');
  const cliMode = files.get(cliPath)?.mode;
  if (!Number.isInteger(cliMode) || (cliMode & 0o111) === 0) {
    throw new Error(`npm CLI is not executable: ${cliPath}`);
  }
  const forbidden = [...files.keys()].filter(path => (
    path === 'package-lock.json'
    || path.startsWith('.git/')
    || path.startsWith('.github/')
    || path.startsWith('coverage/')
    || path.startsWith('node_modules/')
    || path.startsWith('test/')
    || /(^|\/)\.env(?:\.|$)/.test(path)
    || path.includes('.actions-warden-agent.')
    || path.includes('.actions-warden-org-checkpoint')
  ));
  if (forbidden.length > 0) {
    throw new Error(`npm package contains forbidden files: ${forbidden.join(', ')}`);
  }

  process.stdout.write(
    `npm package OK: ${manifest.name}@${manifest.version}, ${manifest.files.length} files, ${manifest.unpackedSize} bytes unpacked\n`,
  );
}

function packagePath(value) {
  return String(value).replace(/^\.\//, '');
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function runNpm(args) {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    return spawnSync(process.execPath, [npmExecPath, ...args], {
      cwd: process.cwd(),
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
  }
  return spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}
