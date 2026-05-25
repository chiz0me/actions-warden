/**
 * GitHub API version resolver.
 *
 * Resolves tags/branches to commit SHAs and looks up latest releases. Uses
 * native fetch, with exponential backoff on rate-limit (HTTP 403 + ratelimit
 * remaining 0) and 5xx responses. Caches successful responses to disk.
 */

import semver from 'semver';
import { readCache, writeCache } from './cache.js';
import { redact } from './redact.js';

const API = 'https://api.github.com';

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
 * @returns {Promise<{status: number, body: unknown}>}
 */
export async function ghFetch({ url, token, retries = 3, cwd = process.cwd(), useCache = true }) {
  if (useCache) {
    const cached = await readCache({ key: url, cwd });
    if (cached !== undefined) return { status: 200, body: cached };
  }

  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'actions-warden',
    'x-github-api-version': '2022-11-28',
  };
  if (token) headers.authorization = `Bearer ${token}`;

  let attempt = 0;
  for (;;) {
    let response;
    try {
      response = await fetch(url, { headers });
    } catch (err) {
      if (attempt >= retries) throw new Error(`github fetch failed: ${redact(String(err))}`);
      await sleep(backoff(attempt));
      attempt += 1;
      continue;
    }
    const remaining = response.headers.get('x-ratelimit-remaining');
    if ((response.status === 403 && remaining === '0') || response.status === 429) {
      const reset = Number(response.headers.get('x-ratelimit-reset') ?? 0) * 1000;
      const wait = Math.max(reset - Date.now(), backoff(attempt));
      if (attempt >= retries) {
        throw new Error('github rate limit exhausted');
      }
      await sleep(Math.min(wait, 30_000));
      attempt += 1;
      continue;
    }
    if (response.status >= 500 && attempt < retries) {
      await sleep(backoff(attempt));
      attempt += 1;
      continue;
    }
    const text = await response.text();
    /** @type {unknown} */
    let body;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (response.status === 200 && useCache) {
      await writeCache({ key: url, value: body, cwd });
    }
    return { status: response.status, body };
  }
}

function backoff(attempt) {
  return Math.min(1000 * 2 ** attempt, 8000);
}
function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
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
  if (/^[0-9a-f]{40}$/i.test(ref)) {
    return { sha: ref.toLowerCase(), type: 'commit' };
  }
  // Try as tag.
  const tagUrl = `${API}/repos/${owner}/${repo}/git/refs/tags/${encodeURIComponent(ref)}`;
  const tagRes = await ghFetch({ url: tagUrl, token, cwd });
  if (tagRes.status === 200 && tagRes.body && typeof tagRes.body === 'object') {
    const obj = tagRes.body.object;
    if (obj && obj.sha) {
      if (obj.type === 'tag') {
        // Annotated tag — dereference to commit.
        const tagObjUrl = `${API}/repos/${owner}/${repo}/git/tags/${obj.sha}`;
        const tagObj = await ghFetch({ url: tagObjUrl, token, cwd });
        if (tagObj.status === 200 && tagObj.body && tagObj.body.object) {
          return { sha: tagObj.body.object.sha, type: 'tag' };
        }
      }
      return { sha: obj.sha, type: 'tag' };
    }
  }
  // Try as branch.
  const branchUrl = `${API}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(ref)}`;
  const branchRes = await ghFetch({ url: branchUrl, token, cwd });
  if (branchRes.status === 200 && branchRes.body?.object?.sha) {
    return { sha: branchRes.body.object.sha, type: 'branch' };
  }
  // Try as commit.
  const commitUrl = `${API}/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`;
  const commitRes = await ghFetch({ url: commitUrl, token, cwd });
  if (commitRes.status === 200 && commitRes.body?.sha) {
    return { sha: commitRes.body.sha, type: 'commit' };
  }
  throw new Error(`could not resolve ${owner}/${repo}@${ref}`);
}

/**
 * List all tags for a repo (paginated, up to 200).
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
  for (let page = 1; page <= 2; page += 1) {
    const url = `${API}/repos/${owner}/${repo}/tags?per_page=100&page=${page}`;
    const res = await ghFetch({ url, token, cwd });
    if (res.status !== 200 || !Array.isArray(res.body)) break;
    for (const t of res.body) {
      if (t && t.name && t.commit?.sha) out.push({ name: t.name, sha: t.commit.sha });
    }
    if (res.body.length < 100) break;
  }
  return out;
}

/**
 * Fetch the committer date of a commit (ms epoch).
 *
 * @param {object} opts
 * @param {string} opts.owner
 * @param {string} opts.repo
 * @param {string} opts.sha
 * @param {string} [opts.token]
 * @param {string} [opts.cwd]
 * @returns {Promise<number>}
 */
export async function getCommitDate({ owner, repo, sha, token, cwd }) {
  const url = `${API}/repos/${owner}/${repo}/commits/${encodeURIComponent(sha)}`;
  const res = await ghFetch({ url, token, cwd });
  if (res.status !== 200 || !res.body) {
    throw new Error(`could not fetch commit date for ${owner}/${repo}@${sha}`);
  }
  const dateStr = res.body.commit?.committer?.date ?? res.body.commit?.author?.date;
  if (!dateStr) throw new Error('commit response missing date');
  const ms = Date.parse(dateStr);
  if (!Number.isFinite(ms)) throw new Error(`invalid commit date: ${dateStr}`);
  return ms;
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
    .map(t => ({ tag: t, parsed: semver.coerce(t.name) }))
    .filter(x => x.parsed)
    .map(x => ({ tag: x.tag, version: x.parsed.version }))
    .sort((a, b) => semver.rcompare(a.version, b.version));
  if (semverTags.length === 0) return null;

  const current = currentRef ? semver.coerce(currentRef) : null;
  if (!current || mode === 'major') return semverTags[0].tag;
  for (const candidate of semverTags) {
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
