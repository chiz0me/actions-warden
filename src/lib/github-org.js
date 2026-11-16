/**
 * Read-only GitHub organization/repository discovery.
 *
 * Repository code is fetched as Git objects and parsed in memory. Nothing is
 * cloned, checked out, or executed by the organization scanner.
 */

import { TextDecoder } from 'node:util';
import { GIT_SHA_RE, NAME_RE, REPOSITORY_VISIBILITIES } from './org-schema.js';
import { ghFetch } from './resolver.js';

const API = 'https://api.github.com';

/** HTTP status GitHub returns for Git requests against a repository with no commits. */
const EMPTY_REPOSITORY_STATUS = 409;

/** Maximum decoded bytes accepted for one remote workflow YAML blob. */
export const MAX_WORKFLOW_BYTES = 2 * 1024 * 1024;

/** Maximum workflow and composite-action files accepted per repository. */
export const MAX_WORKFLOW_FILES = 1000;

/** Maximum cumulative decoded workflow bytes accepted per repository. */
export const MAX_REPOSITORY_WORKFLOW_BYTES = 32 * 1024 * 1024;

/**
 * List every repository visible to the supplied token for an organization.
 * The optional page observer receives only bounded counters and sanitized
 * GitHub rate-limit metadata; repository objects remain in the final result.
 *
 * @param {object} [options]
 * @param {string} options.organization
 * @param {string} [options.token]
 * @param {string} [options.cwd]
 * @param {(event: object) => void|Promise<void>} [options.onRetry]
 * @param {(event: object) => void|Promise<void>} [options.onPage]
 */
export async function listOrganizationRepositories({
  organization,
  token,
  cwd,
  onRetry,
  onPage,
} = {}) {
  const org = validateName(organization, 'organization');
  if (onPage !== undefined && typeof onPage !== 'function') {
    throw new Error('onPage must be a function');
  }
  const repositories = [];
  const seen = new Set();

  for (let page = 1; page <= 1000; page += 1) {
    const query = new URLSearchParams({
      type: 'all',
      sort: 'full_name',
      direction: 'asc',
      per_page: '100',
      page: String(page),
    });
    let responseMetadata;
    const response = await ghFetch({
      url: `${API}/orgs/${encodeURIComponent(org)}/repos?${query}`,
      token,
      cwd,
      useCache: false,
      onRetry,
      onResponse: event => {
        responseMetadata = event;
      },
    });
    if (response.status !== 200) {
      throw new Error(`could not list repositories for ${org} (HTTP ${response.status})`);
    }
    if (!Array.isArray(response.body)) {
      throw new Error(`invalid repository response for ${org}`);
    }

    for (const raw of response.body) {
      const repository = normalizeRepository(raw, org);
      const key = repository.fullName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      repositories.push(repository);
    }
    if (onPage) {
      await onPage(Object.freeze({
        page,
        repositoriesDiscovered: repositories.length,
        rateLimit: responseMetadata?.rateLimit ?? null,
      }));
    }
    if (response.body.length < 100) {
      return repositories.sort((left, right) => left.fullName.localeCompare(right.fullName));
    }
  }
  throw new Error(`repository listing for ${org} exceeded 100000 entries`);
}

/**
 * Fetch and validate the workflow-bearing portion of a repository tree.
 * The default-branch commit is resolved first and the tree is then read by that
 * commit's tree SHA, so the evidence and its permalinks describe one revision.
 * The returned snapshot can be compared with a checkpoint before any blobs
 * are downloaded.
 */
export async function fetchRepositoryWorkflowTree({
  repository,
  token,
  cwd,
  includePath,
  onRetry,
} = {}) {
  const normalized = normalizeRepository(repository, repository?.owner);
  if (includePath !== undefined && typeof includePath !== 'function') {
    throw new Error('includePath must be a function');
  }
  const emptyTree = () => workflowTree(normalized, {
    entries: [],
    empty: true,
    treeSha: null,
    commitSha: null,
  });
  if (!normalized.defaultBranch) return emptyTree();
  const commit = await fetchDefaultBranchCommit({ repository: normalized, token, cwd, onRetry });
  if (commit === null) return emptyTree();

  const treeResponse = await ghFetch({
    url: `${repositoryApiUrl(normalized)}/git/trees/${commit.treeSha}?recursive=1`,
    token,
    cwd,
    useCache: false,
    onRetry,
  });
  if (treeResponse.status !== 200) {
    throw new Error(
      `could not read ${normalized.fullName}@${normalized.defaultBranch} tree`
      + ` (HTTP ${treeResponse.status})`,
    );
  }
  const entries = selectWorkflowEntries(treeResponse.body, {
    repository: normalized,
    expectedTreeSha: commit.treeSha,
    includePath,
  });
  return workflowTree(normalized, {
    entries,
    empty: false,
    treeSha: commit.treeSha,
    commitSha: commit.commitSha,
  });
}

/**
 * Fetch workflow and composite-action YAML from a repository's default branch.
 */
export async function fetchRepositoryWorkflows({
  repository,
  token,
  cwd,
  includePath,
  workflowTree: suppliedWorkflowTree,
  onRetry,
} = {}) {
  const normalized = normalizeRepository(repository, repository?.owner);
  if (suppliedWorkflowTree !== undefined && includePath !== undefined) {
    throw new Error('includePath cannot be combined with a supplied workflow tree');
  }
  const tree = suppliedWorkflowTree ?? await fetchRepositoryWorkflowTree({
    repository: normalized,
    token,
    cwd,
    includePath,
    onRetry,
  });
  validateWorkflowTree(tree, normalized);
  const result = {
    sources: [],
    errors: [],
    entries: [],
    empty: tree.empty,
    treeSha: tree.treeSha,
    commitSha: tree.commitSha,
  };
  if (tree.empty) return result;

  let sourceBytes = 0;
  const request = { owner: normalized.owner, repo: normalized.name, token, cwd, onRetry };
  for (const entry of tree.entries) {
    const outcome = await readWorkflowEntry(entry, request);
    result.entries.push(outcome.detail);
    if (outcome.error) {
      result.errors.push({ path: entry.path, error: outcome.error });
      continue;
    }
    sourceBytes += Buffer.byteLength(outcome.text);
    if (sourceBytes > MAX_REPOSITORY_WORKFLOW_BYTES) throw repositoryLimitError(normalized);
    result.sources.push({ path: entry.path, source: outcome.text, sha: outcome.detail.blobSha });
  }
  return result;
}

/**
 * Return whether a validated Git tree path belongs to the supported workflow
 * or composite-action discovery scope.
 *
 * @param {unknown} path
 * @returns {boolean}
 */
export function isWorkflowPath(path) {
  if (
    typeof path !== 'string'
    || path.includes('\0')
    || path.includes('\\')
    || path.split('/').some(segment => !segment || segment === '.' || segment === '..')
  ) return false;
  return (
    /^\.github\/workflows\/[^/]+\.ya?ml$/.test(path)
    || /^action\.ya?ml$/.test(path)
    || /^\.github\/actions\/(?:.*\/)?action\.ya?ml$/.test(path)
  );
}

async function fetchBlobText({ owner, repo, sha, token, cwd, onRetry }) {
  const response = await ghFetch({
    url: `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
      + `/git/blobs/${encodeURIComponent(sha)}`,
    token,
    cwd,
    useCache: false,
    onRetry,
  });
  if (response.status !== 200) {
    throw new Error(`could not read workflow blob ${sha} (HTTP ${response.status})`);
  }
  const body = response.body;
  if (!body || typeof body !== 'object' || body.encoding !== 'base64' || typeof body.content !== 'string') {
    throw new Error(`invalid workflow blob response for ${sha}`);
  }
  if (String(body.sha ?? '').toLowerCase() !== sha.toLowerCase()) {
    throw new Error(`workflow blob response did not match ${sha}`);
  }
  if (body.size !== undefined && (!Number.isSafeInteger(body.size) || body.size < 0)) {
    throw new Error(`workflow blob ${sha} has an invalid size`);
  }
  if (Number.isFinite(body.size) && body.size > MAX_WORKFLOW_BYTES) {
    throw new Error(`workflow exceeds the ${MAX_WORKFLOW_BYTES}-byte scan limit`);
  }
  const compact = body.content.replace(/\s/g, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(compact)) {
    throw new Error(`workflow blob ${sha} is not valid base64`);
  }
  const bytes = Buffer.from(compact, 'base64');
  if (bytes.length > MAX_WORKFLOW_BYTES) {
    throw new Error(`workflow exceeds the ${MAX_WORKFLOW_BYTES}-byte scan limit`);
  }
  if (Number.isFinite(body.size) && bytes.length !== body.size) {
    throw new Error(`workflow blob ${sha} size did not match its metadata`);
  }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), bytes: bytes.length };
  } catch {
    throw new Error(`workflow blob ${sha} is not valid UTF-8`);
  }
}

async function readWorkflowEntry(entry, request) {
  const blobSha = GIT_SHA_RE.test(String(entry.sha ?? ''))
    ? String(entry.sha).toLowerCase()
    : null;
  const treeBytes = Number.isSafeInteger(entry.size) && entry.size >= 0 ? entry.size : null;
  const unreadable = error => ({
    detail: { path: entry.path, blobSha, bytes: treeBytes, readable: false },
    error,
  });
  const failure = checkEntryReadable(entry);
  if (failure) return unreadable(failure);
  try {
    const blob = await fetchBlobText({ ...request, sha: entry.sha });
    return {
      detail: { path: entry.path, blobSha, bytes: blob.bytes, readable: true },
      text: blob.text,
    };
  } catch (error) {
    return unreadable(String(error.message ?? error));
  }
}

function repositoryLimitError(repository) {
  return new Error(
    `${repository.fullName} workflow sources exceed`
    + ` the ${MAX_REPOSITORY_WORKFLOW_BYTES}-byte repository limit`,
  );
}

async function fetchDefaultBranchCommit({ repository, token, cwd, onRetry }) {
  const response = await ghFetch({
    url: `${repositoryApiUrl(repository)}/commits/heads/`
      + encodeURIComponent(repository.defaultBranch),
    token,
    cwd,
    useCache: false,
    onRetry,
  });
  if (response.status === EMPTY_REPOSITORY_STATUS) return null;
  if (response.status !== 200) {
    throw new Error(
      `could not read ${repository.fullName}@${repository.defaultBranch} commit`
      + ` (HTTP ${response.status})`,
    );
  }
  const commitSha = String(response.body?.sha ?? '');
  const treeSha = String(response.body?.commit?.tree?.sha ?? '');
  if (!GIT_SHA_RE.test(commitSha) || !GIT_SHA_RE.test(treeSha)) {
    throw new Error(`invalid commit response for ${repository.fullName}`);
  }
  return { commitSha: commitSha.toLowerCase(), treeSha: treeSha.toLowerCase() };
}

function selectWorkflowEntries(body, { repository, expectedTreeSha, includePath }) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.tree)) {
    throw new Error(`invalid tree response for ${repository.fullName}`);
  }
  if (typeof body.truncated !== 'boolean') {
    throw new Error(`invalid tree truncation state for ${repository.fullName}`);
  }
  if (!GIT_SHA_RE.test(String(body.sha ?? ''))) {
    throw new Error(`invalid tree SHA for ${repository.fullName}`);
  }
  if (String(body.sha).toLowerCase() !== expectedTreeSha) {
    throw new Error(`tree response for ${repository.fullName} did not match the commit`);
  }
  if (body.truncated === true) {
    throw new Error(
      `tree response for ${repository.fullName} was truncated; refusing an incomplete scan`,
    );
  }
  const entries = body.tree
    .filter(entry => (
      entry?.type === 'blob'
      && isWorkflowPath(entry.path)
      && (includePath === undefined || includePath(entry.path))
    ))
    .sort((left, right) => left.path.localeCompare(right.path));
  if (entries.length > MAX_WORKFLOW_FILES) {
    throw new Error(
      `${repository.fullName} has more than ${MAX_WORKFLOW_FILES} workflow files;`
      + ' refusing an unbounded scan',
    );
  }
  const declaredBytes = entries.reduce(
    (total, entry) => total + (
      Number.isSafeInteger(entry.size) && entry.size >= 0 ? entry.size : 0
    ),
    0,
  );
  if (declaredBytes > MAX_REPOSITORY_WORKFLOW_BYTES) {
    throw repositoryLimitError(repository);
  }
  return entries;
}

function checkEntryReadable(entry) {
  if (!GIT_SHA_RE.test(String(entry.sha ?? ''))) {
    return 'workflow tree entry has an invalid blob SHA';
  }
  if (entry.size !== undefined && (!Number.isSafeInteger(entry.size) || entry.size < 0)) {
    return 'workflow tree entry has an invalid size';
  }
  if (Number.isFinite(entry.size) && entry.size > MAX_WORKFLOW_BYTES) {
    return `workflow exceeds the ${MAX_WORKFLOW_BYTES}-byte scan limit`;
  }
  return null;
}

function repositoryApiUrl(repository) {
  return `${API}/repos/${encodeURIComponent(repository.owner)}`
    + `/${encodeURIComponent(repository.name)}`;
}

function workflowTree(repository, { entries, empty, treeSha, commitSha }) {
  return {
    repository: repository.fullName,
    branch: repository.defaultBranch,
    entries: entries.map(entry => ({
      path: entry.path,
      type: entry.type,
      sha: entry.sha,
      ...(entry.size === undefined ? {} : { size: entry.size }),
    })),
    empty,
    treeSha,
    commitSha,
  };
}

function validateWorkflowTree(tree, repository) {
  if (
    !tree
    || typeof tree !== 'object'
    || tree.repository !== repository.fullName
    || tree.branch !== repository.defaultBranch
    || typeof tree.empty !== 'boolean'
    || !Array.isArray(tree.entries)
    || (tree.treeSha !== null && !GIT_SHA_RE.test(String(tree.treeSha)))
    || (tree.commitSha !== null && !GIT_SHA_RE.test(String(tree.commitSha)))
  ) {
    throw new Error(`invalid workflow tree snapshot for ${repository.fullName}`);
  }
  if (tree.empty && tree.entries.length > 0) {
    throw new Error(`invalid workflow tree snapshot for ${repository.fullName}`);
  }
  if (!tree.empty && (tree.treeSha === null || tree.commitSha === null)) {
    throw new Error(`invalid workflow tree snapshot for ${repository.fullName}`);
  }
  if (tree.entries.length > MAX_WORKFLOW_FILES) {
    throw new Error(`invalid workflow tree snapshot for ${repository.fullName}`);
  }
  for (const entry of tree.entries) {
    if (
      !entry
      || typeof entry !== 'object'
      || entry.type !== 'blob'
      || !isWorkflowPath(entry.path)
    ) {
      throw new Error(`invalid workflow tree snapshot for ${repository.fullName}`);
    }
  }
}

function normalizeRepository(raw, expectedOwner) {
  if (!raw || typeof raw !== 'object') throw new Error('invalid repository record');
  const owner = validateName(
    raw.owner?.login ?? (typeof raw.owner === 'string' ? raw.owner : expectedOwner),
    'repository owner',
  );
  const name = validateName(raw.name, 'repository name');
  const fullName = `${owner}/${name}`;
  const suppliedFullName = raw.full_name ?? raw.fullName;
  if (
    suppliedFullName !== undefined
    && String(suppliedFullName).toLowerCase() !== fullName.toLowerCase()
  ) {
    throw new Error(`invalid repository identity: ${suppliedFullName}`);
  }
  const suppliedDefaultBranch = raw.default_branch ?? raw.defaultBranch;
  const defaultBranch = suppliedDefaultBranch == null
    ? null
    : validateRef(String(suppliedDefaultBranch));
  const visibility = REPOSITORY_VISIBILITIES.includes(raw.visibility)
    ? raw.visibility
    : raw.private === true ? 'private' : 'public';
  return {
    owner,
    name,
    fullName,
    defaultBranch,
    visibility,
    private: raw.private === true,
    fork: raw.fork === true,
    archived: raw.archived === true,
    disabled: raw.disabled === true,
    htmlUrl: typeof (raw.html_url ?? raw.htmlUrl) === 'string'
      ? (raw.html_url ?? raw.htmlUrl)
      : `https://github.com/${owner}/${name}`,
  };
}

function validateName(value, label) {
  if (typeof value !== 'string' || !NAME_RE.test(value) || value === '.' || value === '..') {
    throw new Error(`invalid ${label}`);
  }
  return value;
}

function validateRef(value) {
  if (!value || value.includes('\0') || value.startsWith('/') || value.endsWith('/')) {
    throw new Error('invalid default branch');
  }
  return value;
}
