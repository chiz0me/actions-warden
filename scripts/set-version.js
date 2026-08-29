#!/usr/bin/env node
/**
 * Prepare every version-bearing source for a stable release.
 *
 * This updates local files only. It never commits, tags, pushes, or publishes.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import semver from 'semver';
import { INVOCATION_PATHS } from './version-sources.js';

const root = process.cwd();

main().catch(error => {
  process.stderr.write(`error: ${error.message}\n`);
  process.exitCode = 1;
});

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    throw new Error('usage: npm run release:prepare -- X.Y.Z');
  }
  const nextVersion = args[0];
  if (semver.valid(nextVersion) !== nextVersion || semver.prerelease(nextVersion)) {
    throw new Error('release version must be an exact stable X.Y.Z version without a v prefix');
  }

  const packagePath = resolve(root, 'package.json');
  const pluginPath = resolve(root, '.claude-plugin/plugin.json');
  const lockPath = resolve(root, 'package-lock.json');
  const runtimePath = resolve(root, 'src/version.js');
  const [packageSource, pluginSource, lockSource, runtimeSource] = await Promise.all([
    readFile(packagePath, 'utf8'),
    readFile(pluginPath, 'utf8'),
    readFile(lockPath, 'utf8'),
    readFile(runtimePath, 'utf8'),
  ]);
  const pkg = JSON.parse(packageSource);
  const plugin = JSON.parse(pluginSource);
  const lock = JSON.parse(lockSource);
  const currentVersion = pkg.version;
  if (!semver.valid(currentVersion)) throw new Error('package.json version is not valid SemVer');
  if (!semver.gt(nextVersion, currentVersion)) {
    throw new Error(`release version ${nextVersion} must be greater than ${currentVersion}`);
  }

  const runtimeVersion = runtimeSource.match(
    /VERSION\s*=\s*['"](\d+\.\d+\.\d+)['"]/,
  )?.[1];
  const observed = {
    'package.json': currentVersion,
    '.claude-plugin/plugin.json': plugin.version,
    'package-lock.json': lock.version,
    'package-lock.json#packages[""]': lock.packages?.['']?.version,
    'src/version.js': runtimeVersion,
  };
  const invocationSources = new Map();
  for (const path of INVOCATION_PATHS) {
    const source = await readFile(resolve(root, path), 'utf8');
    const matches = [...source.matchAll(/actions-warden@(\d+\.\d+\.\d+)/g)]
      .map(match => match[1]);
    if (matches.length === 0 || new Set(matches).size !== 1) {
      throw new Error(`${path} must contain one consistent exact actions-warden version`);
    }
    observed[path] = matches[0];
    invocationSources.set(path, source);
  }
  const mismatches = Object.entries(observed)
    .filter(([, version]) => version !== currentVersion);
  if (mismatches.length > 0) {
    throw new Error(
      `current version sources are not synchronized: ${mismatches
        .map(([path, version]) => `${path}=${version ?? '<missing>'}`)
        .join(', ')}`,
    );
  }

  pkg.version = nextVersion;
  plugin.version = nextVersion;
  lock.version = nextVersion;
  lock.packages[''].version = nextVersion;
  const versionPattern = new RegExp(`actions-warden@${escapeRegExp(currentVersion)}`, 'g');
  const writes = [
    [packagePath, `${JSON.stringify(pkg, null, 2)}\n`],
    [pluginPath, `${JSON.stringify(plugin, null, 2)}\n`],
    [lockPath, `${JSON.stringify(lock, null, 2)}\n`],
    [
      runtimePath,
      runtimeSource.replace(
        /(VERSION\s*=\s*['"])\d+\.\d+\.\d+(['"])/,
        `$1${nextVersion}$2`,
      ),
    ],
    ...[...invocationSources].map(([path, source]) => [
      resolve(root, path),
      source.replace(versionPattern, `actions-warden@${nextVersion}`),
    ]),
  ];
  for (const [path, content] of writes) await writeFile(path, content, 'utf8');

  process.stdout.write(
    `prepared ${nextVersion} in ${writes.length} files; no commit, tag, push, or publish was performed\n`,
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
