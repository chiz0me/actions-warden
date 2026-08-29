/**
 * Safe file writer with dry-run guard.
 *
 * Every mutation flows through {@link writeFileGuarded}. When `dryRun` is true
 * (the default), no bytes are written - the change is recorded and reported.
 */

import { open, rename, unlink, lstat, realpath } from 'node:fs/promises';
import { resolve, relative, dirname, basename, isAbsolute, sep, join } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * @typedef {object} WriteResult
 * @property {string} path
 * @property {boolean} written
 * @property {boolean} dryRun
 * @property {number} bytes
 */

/**
 * @param {object} args
 * @param {string} args.path
 * @param {string} args.content
 * @param {boolean} [args.dryRun]
 * @param {string} [args.cwd]
 * @returns {Promise<WriteResult>}
 */
export async function writeFileGuarded({ path, content, dryRun = true, cwd = process.cwd() }) {
  if (typeof path !== 'string' || path.includes('\0')) throw new Error('invalid path');
  const requestedRoot = resolve(cwd);
  const requestedPath = resolve(requestedRoot, path);
  if (!isAbsolute(path) && isOutside(relative(requestedRoot, requestedPath))) {
    throw new Error(`refusing to write outside working directory: ${path}`);
  }
  const root = await realpath(requestedRoot);
  const parent = await realpath(dirname(requestedPath));
  if (isOutside(relative(root, parent))) {
    throw new Error(`refusing to write outside working directory: ${path}`);
  }
  const abs = join(parent, basename(requestedPath));
  let existingMode;
  try {
    const entry = await lstat(requestedPath);
    if (entry.isSymbolicLink()) {
      throw new Error(`refusing to write through a symlink: ${path}`);
    }
    existingMode = entry.mode & 0o777;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const bytes = Buffer.byteLength(content, 'utf8');
  if (dryRun) {
    return { path: abs, written: false, dryRun: true, bytes };
  }
  const tempPath = join(parent, `.${basename(abs)}.actions-warden-${process.pid}-${randomUUID()}`);
  let handle;
  try {
    handle = await open(tempPath, 'wx', existingMode ?? 0o600);
    await handle.writeFile(content, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(tempPath, abs);
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    await unlink(tempPath).catch(() => {});
    throw error;
  }
  return { path: abs, written: true, dryRun: false, bytes };
}

/**
 * Throws on path traversal attempts.
 *
 * @param {string} path
 * @param {string} [cwd]
 * @returns {string} absolute path
 */
export function assertSafePath(path, cwd = process.cwd()) {
  if (typeof path !== 'string' || path.includes('\0')) {
    throw new Error('invalid path');
  }
  const root = resolve(cwd);
  const abs = resolve(root, path);
  if (isOutside(relative(root, abs))) {
    throw new Error(`path traversal rejected: ${path}`);
  }
  return abs;
}

function isOutside(rel) {
  return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}
