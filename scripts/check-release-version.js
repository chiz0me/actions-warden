#!/usr/bin/env node
/** Verify release monotonicity and the contents of an already-published retry. */

import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import semver from 'semver';

main().catch(error => {
  process.stderr.write(`error: ${error.message}\n`);
  process.exitCode = 1;
});

async function main() {
  const { tag, allowExisting } = parseArguments(process.argv.slice(2));
  const pkg = JSON.parse(await readFile(resolve(process.cwd(), 'package.json'), 'utf8'));
  const candidate = pkg.version;
  if (semver.valid(candidate) !== candidate || semver.prerelease(candidate)) {
    throw new Error('package version must be an exact stable X.Y.Z version');
  }
  if (tag !== undefined && tag !== `v${candidate}`) {
    throw new Error(`tag ${tag} does not match package version ${candidate}`);
  }

  const published = readJsonString(
    runNpm(['view', pkg.name, 'dist-tags.latest', '--json']),
    'npm latest version',
  );
  if (!semver.valid(published)) {
    throw new Error('npm latest version response was not valid SemVer');
  }
  if (semver.lt(candidate, published)) {
    throw new Error(`candidate ${candidate} is older than npm latest ${published}`);
  }
  const publishedVersions = readVersionList(
    runNpm(['view', pkg.name, 'versions', '--json']),
  );
  const candidateExists = publishedVersions.includes(candidate);
  if (candidateExists && !semver.eq(candidate, published)) {
    throw new Error(
      `candidate ${candidate} exists on npm but latest is ${published}; choose a new version`,
    );
  }
  if (semver.eq(candidate, published) && !candidateExists) {
    throw new Error(`npm latest ${published} is missing from the published version list`);
  }
  if (candidateExists && !allowExisting) {
    throw new Error(`candidate ${candidate} is already published; choose a newer version`);
  }
  let state = 'new';
  if (candidateExists) {
    const registryIntegrity = readJsonString(
      runNpm(['view', `${pkg.name}@${candidate}`, 'dist.integrity', '--json']),
      'npm registry integrity',
    );
    const localIntegrity = await packIntegrity();
    if (localIntegrity !== registryIntegrity) {
      throw new Error(
        `published ${pkg.name}@${candidate} does not match the tagged package contents`,
      );
    }
    state = 'already published; contents verified; rerun allowed';
  }
  process.stdout.write(`release version OK: ${candidate} (${state}; npm latest ${published})\n`);
}

function readVersionList(result) {
  if (result.status !== 0) {
    throw new Error(
      `npm published versions lookup failed (exit ${result.status ?? 'unknown'})`,
    );
  }
  let versions;
  try {
    versions = JSON.parse(result.stdout);
  } catch {
    throw new Error('npm published versions response was not valid JSON');
  }
  if (typeof versions === 'string') versions = [versions];
  if (!Array.isArray(versions) || versions.some(version => !semver.valid(version))) {
    throw new Error('npm published versions response was not a SemVer list');
  }
  return versions;
}

async function packIntegrity() {
  const destination = await mkdtemp(join(tmpdir(), 'actions-warden-release-pack-'));
  try {
    const packed = runNpm([
      'pack',
      '--json',
      '--ignore-scripts',
      '--pack-destination',
      destination,
    ]);
    if (packed.status !== 0) {
      throw new Error(`npm package integrity check failed (exit ${packed.status ?? 'unknown'})`);
    }
    let raw;
    try {
      raw = JSON.parse(packed.stdout);
    } catch {
      throw new Error('npm package integrity response was not valid JSON');
    }
    const manifests = Array.isArray(raw) ? raw : Object.values(raw ?? {});
    if (manifests.length !== 1 || typeof manifests[0]?.integrity !== 'string') {
      throw new Error('npm package integrity response did not contain one package');
    }
    return manifests[0].integrity;
  } finally {
    await rm(destination, { recursive: true, force: true });
  }
}

function readJsonString(result, label) {
  if (result.status !== 0) {
    throw new Error(`${label} lookup failed (exit ${result.status ?? 'unknown'})`);
  }
  let value;
  try {
    value = JSON.parse(result.stdout);
  } catch {
    throw new Error(`${label} response was not valid JSON`);
  }
  if (Array.isArray(value) && value.length === 1) [value] = value;
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} response was missing`);
  }
  return value;
}

function parseArguments(args) {
  let tag;
  let allowExisting = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--allow-existing') {
      allowExisting = true;
    } else if (argument === '--tag') {
      tag = args[index + 1];
      if (!tag) throw new Error('--tag requires a value');
      index += 1;
    } else {
      throw new Error(`unknown option: ${argument}`);
    }
  }
  return { tag, allowExisting };
}

function runNpm(args) {
  // npm_execpath is injected by npm, but environment-key casing is not stable
  // on Windows. The dedicated override keeps tests and recovery tooling
  // deterministic without depending on that platform-specific behavior.
  const npmExecPath = process.env.ACTIONS_WARDEN_NPM_EXEC_PATH
    ?? process.env.npm_execpath;
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
