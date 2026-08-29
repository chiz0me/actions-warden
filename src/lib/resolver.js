/**
 * GitHub API version resolver.
 *
 * Resolves tags/branches to commit SHAs and looks up latest releases. Uses
 * native fetch, with exponential backoff on rate-limit (HTTP 403 + ratelimit
 * remaining 0) and 5xx responses. Caches successful responses to disk.
 */

import semver from 'semver';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { readCache, readCacheEntry, writeCache } from './cache.js';
import { redact } from './redact.js';

const API = 'https://api.github.com';
const IN_FLIGHT = new Map();
const COMMIT_SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * Resolve the API token. Precedence: explicit param > GITHUB_TOKEN > GH_TOKEN.
 *
 * @param {string|undefined} explicit
 * @returns {string|undefined}
 */
export function resolveToken(explicit) {
  if (explicit && explicit.length > 0) return explicit;
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  return undefined;
}

/**
 * @param {object} opts
 * @param {string} opts.url
 * @param {string} [opts.token]
 * @param {number} [opts.retries]
 * @param {string} [opts.cwd]
 * @param {boolean} [opts.useCache]
 * @param {(event: {attempt: number, maxRetries: number, reason: 'network'|'rate-limit'|'server-error', delayMs: number, status?: number}) => void|Promise<void>} [opts.onRetry]
 * @returns {Promise<{status: number, body: unknown}>}
 */
export function ghFetch(options) {
  const {
    url,
    token,
    cwd = process.cwd(),
    useCache = true,
  } = options;
  const inFlightKey = `${requestCacheKey(url, token)}|cwd=${resolve(cwd)}|cache=${useCache}`;
  const existing = IN_FLIGHT.get(inFlightKey);
  if (existing) return existing;
  const request = ghFetchInternal(options).finally(() => {
    if (IN_FLIGHT.get(inFlightKey) === request) IN_FLIGHT.delete(inFlightKey);
  });
  IN_FLIGHT.set(inFlightKey, request);
  return request;
}

async function ghFetchInternal({
  url,
  token,
  retries = 3,
  cwd = process.cwd(),
  useCache = true,
  onRetry,
}) {
  if (onRetry !== undefined && typeof onRetry !== 'function') {
    throw new Error('onRetry must be a function');
  }
  const cacheKey = requestCacheKey(url, token);
  const cached = useCache
    ? await readCacheEntry({ key: cacheKey, cwd, allowExpired: true })
    : undefined;
  if (cached?.fresh) return { status: 200, body: cached.value };

  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'actions-warden',
    'x-github-api-version': '2022-11-28',
  };
  if (token) headers.authorization = `Bearer ${token}`;
  if (cached?.etag) headers['if-none-match'] = cached.etag;

  let attempt = 0;
  for (;;) {
    let response;
    try {
      response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      if (attempt >= retries) throw new Error(`github fetch failed: ${redact(String(err))}`);
      const delayMs = backoff(attempt);
      await notifyRetry(onRetry, {
        attempt: attempt + 1,
        maxRetries: retries,
        reason: 'network',
        delayMs,
      });
      await sleep(delayMs);
      attempt += 1;
      continue;
    }
    const remaining = response.headers.get('x-ratelimit-remaining');
    if (response.status === 304 && cached) {
      await writeCache({
        key: cacheKey,
        value: cached.value,
        etag: cached.etag,
        cwd,
      });
      return { status: 200, body: cached.value };
    }
    if ((response.status === 403 && remaining === '0') || response.status === 429) {
      const reset = Number(response.headers.get('x-ratelimit-reset') ?? 0) * 1000;
      const wait = Math.max(reset - Date.now(), backoff(attempt));
      if (attempt >= retries) {
        const resetMessage = Number.isFinite(reset) && reset > Date.now()
          ? `; resets at ${new Date(reset).toISOString()}`
          : '';
        throw new Error(`github rate limit exhausted${resetMessage}`);
      }
      const delayMs = Math.min(wait, 30_000);
      await notifyRetry(onRetry, {
        attempt: attempt + 1,
        maxRetries: retries,
        reason: 'rate-limit',
        delayMs,
        status: response.status,
      });
      await sleep(delayMs);
      attempt += 1;
      continue;
    }
    if (response.status >= 500 && attempt < retries) {
      const delayMs = backoff(attempt);
      await notifyRetry(onRetry, {
        attempt: attempt + 1,
        maxRetries: retries,
        reason: 'server-error',
        delayMs,
        status: response.status,
      });
      await sleep(delayMs);
      attempt += 1;
      continue;
    }
    const text = await response.text();
    /** @type {unknown} */
    let body;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (response.status === 200 && useCache) {
      await writeCache({
        key: cacheKey,
        value: body,
        etag: response.headers.get('etag') ?? undefined,
        cwd,
      });
    }
    return { status: response.status, body };
  }
}

function requestCacheKey(url, token) {
  if (!token) return `${url}|auth=anonymous`;
  const identity = createHash('sha256').update(token).digest('hex').slice(0, 16);
  return `${url}|auth=${identity}`;
}

function backoff(attempt) {
  return Math.min(1000 * 2 ** attempt, 8000);
}
function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function notifyRetry(onRetry, event) {
  if (onRetry) await onRetry(event);
}

/**
 * Resolve a ref (tag, branch, or commit-ish) to an immutable commit SHA.
 *
 * @param {object} opts
 * @param {string} opts.owner
 * @param {string} opts.repo
 * @param {string} opts.ref
 * @param {string} [opts.token]
 * @param {string} [opts.cwd]
 * @returns {Promise<{sha: string, type: 'tag'|'branch'|'commit'}>}
 */
export async function resolveRefToSha({ owner, repo, ref, token, cwd }) {
  // Already a full SHA?
  if (COMMIT_SHA_RE.test(ref)) {
    return { sha: ref.toLowerCase(), type: 'commit' };
  }
  // Try as tag.
  const tagUrl = `${API}/repos/${owner}/${repo}/git/refs/tags/${encodeURIComponent(ref)}`;
  const tagRes = await ghFetch({ url: tagUrl, token, cwd });
  if (tagRes.status === 200 && tagRes.body && typeof tagRes.body === 'object') {
    const obj = tagRes.body.object;
    if (obj && COMMIT_SHA_RE.test(String(obj.sha))) {
      if (obj.type === 'tag') {
        const sha = await dereferenceTagToCommit({
          owner,
          repo,
          sha: String(obj.sha),
          token,
          cwd,
        });
        return { sha, type: 'tag' };
      }
      if (obj.type !== 'commit') {
        throw new Error(`tag ${owner}/${repo}@${ref} does not resolve to a commit`);
      }
      return { sha: String(obj.sha).toLowerCase(), type: 'tag' };
    }
  }
  // Try as branch.
  const branchUrl = `${API}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(ref)}`;
  const branchRes = await ghFetch({ url: branchUrl, token, cwd });
  if (
    branchRes.status === 200
    && branchRes.body?.object?.type === 'commit'
    && COMMIT_SHA_RE.test(String(branchRes.body.object.sha))
  ) {
    return { sha: String(branchRes.body.object.sha).toLowerCase(), type: 'branch' };
  }
  // Try as commit.
  const commitUrl = `${API}/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`;
  const commitRes = await ghFetch({ url: commitUrl, token, cwd });
  if (commitRes.status === 200 && COMMIT_SHA_RE.test(String(commitRes.body?.sha))) {
    return { sha: String(commitRes.body.sha).toLowerCase(), type: 'commit' };
  }
  throw new Error(`could not resolve ${owner}/${repo}@${ref}`);
}

async function dereferenceTagToCommit({ owner, repo, sha, token, cwd }) {
  let currentSha = sha;
  for (let depth = 0; depth < 10; depth += 1) {
    const url = `${API}/repos/${owner}/${repo}/git/tags/${currentSha}`;
    const response = await ghFetch({ url, token, cwd });
    const target = response.body?.object;
    if (
      response.status !== 200
      || !target
      || !COMMIT_SHA_RE.test(String(target.sha))
    ) {
      throw new Error(`could not dereference annotated tag ${owner}/${repo}@${sha}`);
    }
    if (target.type === 'commit') return String(target.sha).toLowerCase();
    if (target.type !== 'tag') {
      throw new Error(`annotated tag ${owner}/${repo}@${sha} targets ${target.type ?? 'an unknown object'}, not a commit`);
    }
    currentSha = String(target.sha);
  }
  throw new Error(`annotated tag chain is too deep for ${owner}/${repo}@${sha}`);
}

/**
 * Confirm that a commit SHA is reachable through the requested repository's
 * commits API rather than merely looking like a SHA.
 */
export async function verifyCommitInRepo({ owner, repo, sha, token, cwd }) {
  if (!COMMIT_SHA_RE.test(sha)) {
    throw new Error(`invalid commit SHA for ${owner}/${repo}`);
  }
  const url = `${API}/repos/${owner}/${repo}/commits/${encodeURIComponent(sha)}`;
  const response = await ghFetch({ url, token, cwd });
  if (
    response.status !== 200
    || !response.body
    || typeof response.body !== 'object'
    || String(response.body.sha).toLowerCase() !== sha.toLowerCase()
  ) {
    throw new Error(`commit ${sha} is not verifiable in ${owner}/${repo} (HTTP ${response.status})`);
  }
  return true;
}

/**
 * List all tags for a repo.
 *
 * @param {object} opts
 * @param {string} opts.owner
 * @param {string} opts.repo
 * @param {string} [opts.token]
 * @param {string} [opts.cwd]
 * @returns {Promise<Array<{name: string, sha: string}>>}
 */
export async function listTags({ owner, repo, token, cwd }) {
  /** @type {Array<{name: string, sha: string}>} */
  const out = [];
  for (let page = 1; page <= 100; page += 1) {
    const url = `${API}/repos/${owner}/${repo}/tags?per_page=100&page=${page}`;
    const res = await ghFetch({ url, token, cwd });
    if (res.status !== 200) {
      throw new Error(`could not list tags for ${owner}/${repo} (HTTP ${res.status})`);
    }
    if (!Array.isArray(res.body)) {
      throw new Error(`invalid tag response for ${owner}/${repo}`);
    }
    for (const t of res.body) {
      if (t && t.name && t.commit?.sha) out.push({ name: t.name, sha: t.commit.sha });
    }
    if (res.body.length < 100) break;
  }
  return out;
}

/**
 * Get conservative age evidence for a tag.
 *
 * Git commit and tagger timestamps are author-controlled, so they are not
 * suitable for a security cooldown. Prefer GitHub's release publication time.
 * For tags without releases, persist when this exact tag-to-SHA mapping was
 * first observed and age it from that point.
 *
 * @param {object} opts
 * @param {string} opts.owner
 * @param {string} opts.repo
 * @param {string} opts.tag
 * @param {string} opts.sha
 * @param {string} [opts.token]
 * @param {string} [opts.cwd]
 * @returns {Promise<{dateMs: number, source: 'release'|'first-seen'}>}
 */
export async function getTagAgeEvidence({ owner, repo, tag, sha, token, cwd = process.cwd() }) {
  const releaseUrl = `${API}/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`;
  const release = await ghFetch({ url: releaseUrl, token, cwd });
  if (release.status === 200 && release.body && typeof release.body === 'object') {
    const dateText = release.body.published_at;
    const dateMs = Date.parse(dateText);
    if (Number.isFinite(dateMs)) return { dateMs, source: 'release' };
  }
  // A release object without a trustworthy timestamp provides no stronger age
  // evidence than a tag without a release. Start the conservative first-seen
  // cooldown instead of failing the entire upgrade.
  if (release.status !== 404 && release.status !== 200) {
    throw new Error(`could not verify tag age for ${owner}/${repo}@${tag} (HTTP ${release.status})`);
  }

  const observationKey = `first-seen:${owner.toLowerCase()}/${repo.toLowerCase()}@${tag}:${sha}`;
  const ttlMs = 10 * 365 * 86_400_000;
  const existing = await readCache({ key: observationKey, ttlMs, cwd });
  if (existing && typeof existing === 'object' && Number.isFinite(existing.dateMs)) {
    return { dateMs: existing.dateMs, source: 'first-seen' };
  }
  const evidence = { dateMs: Date.now(), source: 'first-seen' };
  await writeCache({ key: observationKey, value: evidence, ttlMs, cwd });
  return evidence;
}

/**
 * Pick the highest semver tag matching the given policy.
 *
 * @param {object} opts
 * @param {Array<{name: string}>} opts.tags
 * @param {string|null} opts.currentRef    - current ref ("v3", "v3.1.0", branch)
 * @param {'major'|'minor'|'patch'} [opts.mode]
 * @returns {{name: string}|null}
 */
export function pickLatestTag({ tags, currentRef, mode = 'major' }) {
  const semverTags = tags
    .map(t => ({ tag: t, parsed: parseActionVersion(t.name) }))
    .filter(x => x.parsed)
    .filter(x => x.parsed.prerelease.length === 0)
    .map(x => ({
      tag: x.tag,
      version: x.parsed.version,
      specificity: versionSpecificity(x.tag.name),
    }))
    .sort((a, b) => semver.rcompare(a.version, b.version) || b.specificity - a.specificity);
  if (semverTags.length === 0) return null;

  const current = currentRef ? parseActionVersion(currentRef) : null;
  if (!current || mode === 'major') return semverTags[0].tag;
  for (const candidate of semverTags) {
    if (semver.lt(candidate.version, current.version)) continue;
    if (mode === 'minor' && semver.major(candidate.version) === current.major) {
      return candidate.tag;
    }
    if (
      mode === 'patch' &&
      semver.major(candidate.version) === current.major &&
      semver.minor(candidate.version) === current.minor
    ) {
      return candidate.tag;
    }
  }
  return null;
}

function parseActionVersion(input) {
  if (typeof input !== 'string') return null;
  const match = input.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(-[0-9A-Za-z.-]+)?$/);
  if (!match) return null;
  const normalized = `${match[1]}.${match[2] ?? '0'}.${match[3] ?? '0'}${match[4] ?? ''}`;
  return semver.parse(normalized);
}

function versionSpecificity(input) {
  const core = input.replace(/^v/, '').split('-')[0];
  return core.split('.').length;
}
