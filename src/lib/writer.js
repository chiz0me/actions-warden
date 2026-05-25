/**
 * Safe file writer with dry-run guard.
 *
 * Every mutation flows through {@link writeFileGuarded}. When `dryRun` is true
 * (the default), no bytes are written - the change is recorded and reported.
 */

import { writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

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
  const abs = resolve(cwd, path);
  const rel = relative(cwd, abs);
  if (rel.startsWith('..') || rel.includes('\0')) {
    throw new Error(`refusing to write outside working directory: ${path}`);
  }
  const bytes = Buffer.byteLength(content, 'utf8');
  if (dryRun) {
    return { path: abs, written: false, dryRun: true, bytes };
  }
  await writeFile(abs, content, 'utf8');
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
  if (path.includes('..')) {
    throw new Error(`path traversal rejected: ${path}`);
  }
  return resolve(cwd, path);
}
