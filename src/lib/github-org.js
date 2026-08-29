/**
 * Read-only GitHub organization/repository discovery.
 *
 * Repository code is fetched as Git objects and parsed in memory. Nothing is
 * cloned, checked out, or executed by the organization scanner.
 */

import { TextDecoder } from 'node:util';
import { ghFetch } from './resolver.js';

const API = 'https://api.github.com';
const NAME_RE = /^[A-Za-z0-9_.-]+$/;
const SHA_RE = /^[0-9a-f]{40}$/i;
export const MAX_WORKFLOW_BYTES = 2 * 1024 * 1024;
export const MAX_WORKFLOW_FILES = 1000;
export const MAX_REPOSITORY_WORKFLOW_BYTES = 32 * 1024 * 1024;

/**
 * List every repository visible to the supplied token for an organization.
 */
export async function listOrganizationRepositories({ organization, token, cwd, onRetry } = {}) {
  const org = validateName(organization, 'organization');
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
    const response = await ghFetch({
      url: `${API}/orgs/${encodeURIComponent(org)}/repos?${query}`,
      token,
      cwd,
      useCache: false,
      onRetry,
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
    if (response.body.length < 100) {
      return repositories.sort((left, right) => left.fullName.localeCompare(right.fullName));
    }
  }
  throw new Error(`repository listing for ${org} exceeded 100000 entries`);
}

/**
 * Fetch and validate the workflow-bearing portion of a repository tree.
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
  if (!normalized.defaultBranch) {
    return workflowTree(normalized, { entries: [], empty: true, treeSha: null });
  }
  const treeUrl = `${API}/repos/${encodeURIComponent(normalized.owner)}`
    + `/${encodeURIComponent(normalized.name)}/git/trees/`
    + `${encodeURIComponent(normalized.defaultBranch)}?recursive=1`;
  const treeResponse = await ghFetch({
    url: treeUrl,
    token,
    cwd,
    useCache: false,
    onRetry,
  });
  if (treeResponse.status === 409) {
    return workflowTree(normalized, { entries: [], empty: true, treeSha: null });
  }
  if (treeResponse.status !== 200) {
    throw new Error(`could not read ${normalized.fullName}@${normalized.defaultBranch} tree (HTTP ${treeResponse.status})`);
  }
  if (!treeResponse.body || typeof treeResponse.body !== 'object' || !Array.isArray(treeResponse.body.tree)) {
    throw new Error(`invalid tree response for ${normalized.fullName}`);
  }
  if (typeof treeResponse.body.truncated !== 'boolean') {
    throw new Error(`invalid tree truncation state for ${normalized.fullName}`);
  }
  if (!SHA_RE.test(String(treeResponse.body.sha ?? ''))) {
    throw new Error(`invalid tree SHA for ${normalized.fullName}`);
  }
  if (treeResponse.body.truncated === true) {
    throw new Error(`tree response for ${normalized.fullName} was truncated; refusing an incomplete scan`);
  }

  const entries = treeResponse.body.tree
    .filter(entry => (
      entry?.type === 'blob'
      && isWorkflowPath(entry.path)
      && (includePath === undefined || includePath(entry.path))
    ))
    .sort((left, right) => left.path.localeCompare(right.path));
  if (entries.length > MAX_WORKFLOW_FILES) {
    throw new Error(
      `${normalized.fullName} has more than ${MAX_WORKFLOW_FILES} workflow files; refusing an unbounded scan`,
    );
  }
  const declaredBytes = entries.reduce(
    (total, entry) => total + (
      Number.isSafeInteger(entry.size) && entry.size >= 0 ? entry.size : 0
    ),
    0,
  );
  if (declaredBytes > MAX_REPOSITORY_WORKFLOW_BYTES) {
    throw new Error(
      `${normalized.fullName} workflow sources exceed the ${MAX_REPOSITORY_WORKFLOW_BYTES}-byte repository limit`,
    );
  }
  return workflowTree(normalized, {
    entries,
    empty: false,
    treeSha: String(treeResponse.body.sha).toLowerCase(),
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
  if (tree.empty) {
    return { sources: [], errors: [], empty: true, treeSha: tree.treeSha };
  }

  const sources = [];
  const errors = [];
  let sourceBytes = 0;
  for (const entry of tree.entries) {
    if (!SHA_RE.test(String(entry.sha ?? ''))) {
      errors.push({ path: entry.path, error: 'workflow tree entry has an invalid blob SHA' });
      continue;
    }
    if (
      entry.size !== undefined
      && (!Number.isSafeInteger(entry.size) || entry.size < 0)
    ) {
      errors.push({ path: entry.path, error: 'workflow tree entry has an invalid size' });
      continue;
    }
    if (Number.isFinite(entry.size) && entry.size > MAX_WORKFLOW_BYTES) {
      errors.push({
        path: entry.path,
        error: `workflow exceeds the ${MAX_WORKFLOW_BYTES}-byte scan limit`,
      });
      continue;
    }
    let source;
    try {
      source = await fetchBlobText({
        owner: normalized.owner,
        repo: normalized.name,
        sha: entry.sha,
        token,
        cwd,
        onRetry,
      });
    } catch (error) {
      errors.push({ path: entry.path, error: String(error.message ?? error) });
      continue;
    }
    sourceBytes += Buffer.byteLength(source);
    if (sourceBytes > MAX_REPOSITORY_WORKFLOW_BYTES) {
      throw new Error(
        `${normalized.fullName} workflow sources exceed the ${MAX_REPOSITORY_WORKFLOW_BYTES}-byte repository limit`,
      );
    }
    sources.push({ path: entry.path, source, sha: String(entry.sha).toLowerCase() });
  }
  return {
    sources,
    errors,
    empty: false,
    treeSha: tree.treeSha,
  };
}

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
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`workflow blob ${sha} is not valid UTF-8`);
  }
}

function workflowTree(repository, { entries, empty, treeSha }) {
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
    || (tree.treeSha !== null && !SHA_RE.test(String(tree.treeSha)))
  ) {
    throw new Error(`invalid workflow tree snapshot for ${repository.fullName}`);
  }
  if (tree.empty && tree.entries.length > 0) {
    throw new Error(`invalid workflow tree snapshot for ${repository.fullName}`);
  }
  if (!tree.empty && tree.treeSha === null) {
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
  const visibility = ['public', 'private', 'internal'].includes(raw.visibility)
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
