/**
 * On-disk cache for GitHub API responses.
 *
 * Keyed by sha1 of the request identity. TTL is stored in each cache entry.
 * Files live outside the scanned repository, under ACTIONS_WARDEN_CACHE_DIR,
 * XDG_CACHE_HOME, or the user's platform cache directory.
 */

import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';

/**
 * @typedef {object} CacheEntry
 * @property {number} savedAt   - ms epoch
 * @property {number} ttlMs
 * @property {unknown} value
 * @property {string|undefined} etag
 */

/**
 * @param {string} cwd
 * @returns {string}
 */
export function cacheDir(cwd = process.cwd()) {
  const base = process.env.ACTIONS_WARDEN_CACHE_DIR
    ?? (process.env.XDG_CACHE_HOME
      ? join(process.env.XDG_CACHE_HOME, 'actions-warden')
      : join(homedir(), '.cache', 'actions-warden'));
  return join(resolve(base), digest(resolve(cwd)));
}

/**
 * @param {string} key
 * @returns {string}
 */
function digest(key) {
  return createHash('sha1').update(key).digest('hex');
}

/**
 * @param {object} opts
 * @param {string} opts.key
 * @param {number} [opts.ttlMs]     - default 1h
 * @param {string} [opts.cwd]
 * @returns {Promise<unknown|undefined>}
 */
export async function readCache({ key, ttlMs = 3600 * 1000, cwd = process.cwd() }) {
  const cached = await readCacheEntry({ key, ttlMs, cwd });
  return cached?.fresh ? cached.value : undefined;
}

/**
 * Read cache metadata, optionally including an expired value for ETag
 * revalidation.
 */
export async function readCacheEntry({
  key,
  ttlMs = 3600 * 1000,
  cwd = process.cwd(),
  allowExpired = false,
}) {
  const path = join(cacheDir(cwd), `${digest(key)}.json`);
  try {
    const raw = await readFile(path, 'utf8');
    /** @type {CacheEntry} */
    const entry = JSON.parse(raw);
    const fresh = Date.now() - entry.savedAt <= Math.min(entry.ttlMs, ttlMs);
    if (!fresh && !allowExpired) return undefined;
    return { value: entry.value, etag: entry.etag, fresh };
  } catch {
    return undefined;
  }
}

/**
 * @param {object} opts
 * @param {string} opts.key
 * @param {unknown} opts.value
 * @param {number} [opts.ttlMs]
 * @param {string} [opts.cwd]
 * @param {string} [opts.etag]
 */
export async function writeCache({
  key,
  value,
  ttlMs = 3600 * 1000,
  cwd = process.cwd(),
  etag,
}) {
  const dir = cacheDir(cwd);
  await mkdir(dir, { recursive: true });
  /** @type {CacheEntry} */
  const entry = { savedAt: Date.now(), ttlMs, value, ...(etag ? { etag } : {}) };
  const path = join(dir, `${digest(key)}.json`);
  const temp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(entry), { encoding: 'utf8', mode: 0o600 });
    await rename(temp, path);
  } catch (error) {
    await unlink(temp).catch(() => {});
    throw error;
  }
}
