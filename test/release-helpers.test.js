import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import semver from 'semver';
import { INVOCATION_PATHS } from '../scripts/version-sources.js';

const execFileAsync = promisify(execFile);
const repository = resolve(import.meta.dirname, '..');
const setVersion = resolve(repository, 'scripts/set-version.js');
const verifyVersion = resolve(repository, 'scripts/verify-version-sync.js');
const checkReleaseVersion = resolve(repository, 'scripts/check-release-version.js');
const fixturePaths = [
  'package.json',
  'package-lock.json',
  '.claude-plugin/plugin.json',
  'src/version.js',
  ...INVOCATION_PATHS,
];
const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => (
    rm(path, { recursive: true, force: true })
  )));
});

describe('release version helpers', () => {
  it('updates every version source without requiring a Git checkout', async () => {
    const fixture = await createFixture();
    const current = JSON.parse(await readFile(resolve(fixture, 'package.json'), 'utf8')).version;
    const next = semver.inc(current, 'patch');

    const prepared = await execFileAsync(process.execPath, [setVersion, next], { cwd: fixture });
    expect(prepared.stdout).toContain(`prepared ${next}`);
    expect(prepared.stdout).toContain('no commit, tag, push, or publish was performed');

    const verified = await execFileAsync(process.execPath, [verifyVersion], { cwd: fixture });
    expect(verified.stdout).toContain(`versions in sync: ${next}`);

    const pkg = JSON.parse(await readFile(resolve(fixture, 'package.json'), 'utf8'));
    const lock = JSON.parse(await readFile(resolve(fixture, 'package-lock.json'), 'utf8'));
    const plugin = JSON.parse(
      await readFile(resolve(fixture, '.claude-plugin/plugin.json'), 'utf8'),
    );
    expect(pkg.version).toBe(next);
    expect(lock.version).toBe(next);
    expect(lock.packages[''].version).toBe(next);
    expect(plugin.version).toBe(next);
    expect(await readFile(resolve(fixture, 'src/version.js'), 'utf8'))
      .toContain(`'${next}'`);
    for (const path of INVOCATION_PATHS) {
      expect(await readFile(resolve(fixture, path), 'utf8'))
        .toContain(`actions-warden@${next}`);
    }
  });

  it('rejects a non-incrementing version before changing files', async () => {
    const fixture = await createFixture();
    const packagePath = resolve(fixture, 'package.json');
    const before = await readFile(packagePath, 'utf8');
    const current = JSON.parse(before).version;

    await expect(execFileAsync(process.execPath, [setVersion, current], { cwd: fixture }))
      .rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining(`must be greater than ${current}`),
      });
    expect(await readFile(packagePath, 'utf8')).toBe(before);
  });

  it('allows an existing retry only when registry and local package integrity match', async () => {
    const fixture = await createFixture();
    const current = JSON.parse(await readFile(resolve(fixture, 'package.json'), 'utf8')).version;
    const fakeNpm = resolve(fixture, 'fake-npm.cjs');
    await writeFile(fakeNpm, `
const args = process.argv.slice(2);
if (args[0] === 'view' && args[2] === 'dist-tags.latest') {
  process.stdout.write(JSON.stringify([process.env.FAKE_NPM_LATEST]));
} else if (args[0] === 'view' && args[2] === 'versions') {
  process.stdout.write(process.env.FAKE_NPM_VERSIONS);
} else if (args[0] === 'view' && args[2] === 'dist.integrity') {
  process.stdout.write(JSON.stringify([process.env.FAKE_NPM_REGISTRY_INTEGRITY]));
} else if (args[0] === 'pack') {
  process.stdout.write(JSON.stringify({ package: {
    integrity: process.env.FAKE_NPM_LOCAL_INTEGRITY,
  }}));
} else {
  process.exitCode = 2;
}
`, 'utf8');
    const environment = {
      ...process.env,
      npm_execpath: fakeNpm,
      FAKE_NPM_LATEST: current,
      FAKE_NPM_VERSIONS: JSON.stringify([current]),
      FAKE_NPM_REGISTRY_INTEGRITY: 'sha512-matching',
      FAKE_NPM_LOCAL_INTEGRITY: 'sha512-matching',
    };

    const checked = await execFileAsync(process.execPath, [
      checkReleaseVersion,
      '--tag',
      `v${current}`,
      '--allow-existing',
    ], { cwd: fixture, env: environment });
    expect(checked.stdout).toContain('contents verified; rerun allowed');

    await expect(execFileAsync(process.execPath, [
      checkReleaseVersion,
      '--allow-existing',
    ], {
      cwd: fixture,
      env: { ...environment, FAKE_NPM_LOCAL_INTEGRITY: 'sha512-different' },
    })).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('does not match the tagged package contents'),
    });

    const next = semver.inc(current, 'patch');
    await execFileAsync(process.execPath, [setVersion, next], { cwd: fixture });
    await expect(execFileAsync(process.execPath, [
      checkReleaseVersion,
      '--allow-existing',
    ], {
      cwd: fixture,
      env: {
        ...environment,
        FAKE_NPM_VERSIONS: JSON.stringify([current, next]),
      },
    })).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining(`exists on npm but latest is ${current}`),
    });
  });
});

async function createFixture() {
  const fixture = await mkdtemp(join(tmpdir(), 'actions-warden-release-'));
  temporaryDirectories.push(fixture);
  for (const path of fixturePaths) {
    const target = resolve(fixture, path);
    await mkdir(dirname(target), { recursive: true });
    await cp(resolve(repository, path), target);
  }
  return fixture;
}
