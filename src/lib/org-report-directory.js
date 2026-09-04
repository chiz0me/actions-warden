/**
 * Guarded directory layout for large organization JSON reports.
 *
 * The aggregate is intentionally compact. Complete repository evidence is
 * stored in independently hashed JSON files, and a manifest written last makes
 * the current artifact set explicit. Existing unrelated files are preserved.
 */

import { createHash } from 'node:crypto';
import { lstat, mkdir, readdir, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { renderOrganizationScan } from '../commands/org-scan.js';
import { canonicalPath } from './identity.js';
import { renderJson } from './formatter.js';
import { writeFileGuarded } from './writer.js';

const AGGREGATE_FILENAME = 'organization-report.json';
const COMPARISON_FILENAME = 'organization-comparison.json';
const MANIFEST_FILENAME = 'manifest.json';
const REPOSITORIES_DIRECTORY = 'repositories';

/**
 * Validate a future organization report directory without creating it.
 * Existing path components and owned entries must be real directories/files,
 * never symbolic links.
 */
export async function validateOrganizationReportDirectory({ path, cwd = process.cwd() }) {
  const directory = await resolveGuardedDirectory({ path, cwd, create: false });
  await validateExistingLayout(directory);
  return directory;
}

/**
 * Write a compact aggregate, complete per-repository JSON artifacts, optional
 * comparison evidence, and a final integrity manifest.
 */
export async function writeOrganizationReportDirectory({
  result,
  path,
  cwd = process.cwd(),
}) {
  const directory = await resolveGuardedDirectory({ path, cwd, create: true });
  await validateExistingLayout(directory);
  const repositoriesDirectory = join(directory, REPOSITORIES_DIRECTORY);
  await ensureDirectory(repositoriesDirectory);

  const complete = JSON.parse(renderOrganizationScan(result, { format: 'json', cwd }));
  const repositoryArtifacts = [];
  const compactRepositories = [];
  for (const repositoryResult of complete.repositories) {
    const artifactName = repositoryArtifactName(repositoryResult.repository);
    const artifactPath = join(repositoriesDirectory, artifactName);
    const relativePath = `${REPOSITORIES_DIRECTORY}/${artifactName}`;
    const content = renderJson({
      schemaVersion: '1.0',
      kind: 'actions-warden-org-scan-repository',
      organization: complete.organization,
      analysis: complete.analysis,
      scope: complete.scope,
      repository: repositoryResult,
      status: repositoryResult.status,
    });
    await writeFileGuarded({ path: artifactPath, content, dryRun: false, cwd });
    const artifact = integrity(relativePath, content);
    repositoryArtifacts.push({
      repository: repositoryResult.repository.fullName,
      ...artifact,
    });
    compactRepositories.push({
      repository: repositoryResult.repository,
      revision: repositoryResult.revision,
      summary: repositoryResult.summary,
      status: repositoryResult.status,
      files: repositoryResult.files.length,
      findings: repositoryResult.findings.length,
      errors: repositoryResult.errors.length,
      artifact,
    });
  }

  let comparisonArtifact;
  if (complete.comparison) {
    const content = renderJson(complete.comparison);
    await writeFileGuarded({
      path: join(directory, COMPARISON_FILENAME),
      content,
      dryRun: false,
      cwd,
    });
    comparisonArtifact = integrity(COMPARISON_FILENAME, content);
  }

  const aggregate = {
    schemaVersion: '1.0',
    kind: 'actions-warden-org-scan-directory',
    organization: complete.organization,
    analysis: complete.analysis,
    scope: complete.scope,
    coverage: complete.coverage,
    repositories: compactRepositories,
    summary: complete.summary,
    baseline: complete.baseline,
    configPath: complete.configPath,
    ...(complete.comparison ? {
      comparison: {
        summary: complete.comparison.summary,
        artifact: comparisonArtifact,
      },
    } : {}),
    status: complete.status,
  };
  const aggregateContent = renderJson(aggregate);
  await writeFileGuarded({
    path: join(directory, AGGREGATE_FILENAME),
    content: aggregateContent,
    dryRun: false,
    cwd,
  });
  const aggregateArtifact = integrity(AGGREGATE_FILENAME, aggregateContent);
  const manifest = {
    schemaVersion: '1.0',
    kind: 'actions-warden-org-scan-manifest',
    organization: complete.organization,
    analysis: complete.analysis,
    report: aggregateArtifact,
    repositories: repositoryArtifacts,
    ...(comparisonArtifact ? { comparison: comparisonArtifact } : {}),
    status: complete.status,
  };
  await writeFileGuarded({
    path: join(directory, MANIFEST_FILENAME),
    content: renderJson(manifest),
    dryRun: false,
    cwd,
  });

  return {
    directory: canonicalPath(directory, cwd),
    reportPath: canonicalPath(join(directory, AGGREGATE_FILENAME), cwd),
    manifestPath: canonicalPath(join(directory, MANIFEST_FILENAME), cwd),
    repositories: repositoryArtifacts.length,
  };
}

async function resolveGuardedDirectory({ path, cwd, create }) {
  if (typeof path !== 'string' || !path || path.includes('\0')) {
    throw new Error('--report-dir must be a non-empty path');
  }
  const requestedRoot = resolve(cwd);
  const requested = resolve(requestedRoot, path);
  if (!isAbsolute(path) && isOutside(relative(requestedRoot, requested))) {
    throw new Error(`refusing to write outside working directory: ${path}`);
  }
  const root = await realpath(requestedRoot);
  const lexicalRelative = relative(requestedRoot, requested);
  if (isOutside(lexicalRelative)) {
    throw new Error(`refusing to write outside working directory: ${path}`);
  }
  if (lexicalRelative === '') {
    throw new Error('--report-dir must be a dedicated subdirectory inside the working directory');
  }
  let cursor = root;
  for (const segment of lexicalRelative.split(sep).filter(Boolean)) {
    cursor = join(cursor, segment);
    try {
      const metadata = await lstat(cursor);
      if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
        throw new Error(`organization report path is not a regular directory: ${cursor}`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (create) await mkdir(cursor, { mode: 0o700 });
    }
  }
  // Keep the caller's lexical root for stable workspace-relative receipt
  // paths. Every component above was still checked through the real root.
  return requested;
}

async function validateExistingLayout(directory) {
  try {
    const metadata = await lstat(directory);
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      throw new Error(`organization report path is not a regular directory: ${directory}`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const name of [AGGREGATE_FILENAME, COMPARISON_FILENAME, MANIFEST_FILENAME]) {
    await validateOptionalFile(join(directory, name));
  }
  const repositoriesDirectory = join(directory, REPOSITORIES_DIRECTORY);
  try {
    const metadata = await lstat(repositoriesDirectory);
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      throw new Error(`organization report repositories path is unsafe: ${repositoriesDirectory}`);
    }
    const entries = await readdir(repositoriesDirectory, { withFileTypes: true });
    if (entries.some(entry => entry.isSymbolicLink() || !entry.isFile())) {
      throw new Error(`organization report repositories contain an unsafe entry: ${repositoriesDirectory}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function validateOptionalFile(path) {
  try {
    const metadata = await lstat(path);
    if (metadata.isSymbolicLink() || !metadata.isFile()) {
      throw new Error(`organization report artifact is not a regular file: ${path}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function ensureDirectory(path) {
  try {
    const metadata = await lstat(path);
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      throw new Error(`organization report path is not a regular directory: ${path}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await mkdir(path, { mode: 0o700 });
  }
}

function repositoryArtifactName(repository) {
  const name = String(repository?.name ?? 'repository').toLowerCase();
  const safeName = /^[a-z0-9_.-]+$/.test(name) ? name : 'repository';
  const hash = createHash('sha256')
    .update(String(repository?.fullName ?? '').toLowerCase())
    .digest('hex')
    .slice(0, 16);
  return `${safeName}.${hash}.json`;
}

function integrity(path, content) {
  return {
    path,
    bytes: Buffer.byteLength(content),
    sha256: createHash('sha256').update(content).digest('hex'),
  };
}

function isOutside(value) {
  return value === '..' || value.startsWith(`..${sep}`) || isAbsolute(value);
}
