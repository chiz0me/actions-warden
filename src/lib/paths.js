/**
 * Workflow file discovery with safe path handling.
 */

import { readdir, stat, realpath } from 'node:fs/promises';
import { resolve, join, relative, isAbsolute, sep } from 'node:path';
import picomatch from 'picomatch';

/**
 * Default workflow directory globs.
 */
export const DEFAULT_WORKFLOW_PATTERNS = [
  '.github/workflows/*.yml',
  '.github/workflows/*.yaml',
  'action.yml',
  'action.yaml',
  '**/action.yml',
  '**/action.yaml',
];

/**
 * Reject path-traversal and absolute-escape attempts.
 *
 * @param {string} p
 * @param {string} cwd
 */
function assertInside(p, cwd) {
  if (typeof p !== 'string' || p.includes('\0')) {
    throw new Error('invalid workflow path');
  }
  const root = resolve(cwd);
  const abs = resolve(cwd, p);
  const rel = relative(root, abs);
  if (isOutside(rel)) {
    throw new Error(`path traversal rejected: ${p}`);
  }
  return abs;
}

function isOutside(rel) {
  return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}

async function assertRealInside(path, cwd) {
  const [root, target] = await Promise.all([realpath(resolve(cwd)), realpath(path)]);
  if (isOutside(relative(root, target))) {
    throw new Error(`symlink escape rejected: ${path}`);
  }
  return target;
}

/**
 * Recursively list files under a directory.
 *
 * @param {string} dir
 * @param {string[]} acc
 * @returns {Promise<string[]>}
 */
async function walk(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.git') && entry.name !== '.github') continue;
    if (entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, acc);
    } else if (entry.isFile()) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * Discover workflow files matching the given patterns (relative to cwd).
 *
 * @param {object} opts
 * @param {string[]} [opts.patterns]
 * @param {string} [opts.cwd]
 * @returns {Promise<string[]>}
 */
export async function discoverWorkflows({ patterns = DEFAULT_WORKFLOW_PATTERNS, cwd = process.cwd() } = {}) {
  const root = resolve(cwd);
  for (const p of patterns) assertInside(p, root);
  const normalizedPatterns = patterns.map(p => {
    const pattern = isAbsolute(p) ? relative(root, p) : p;
    return pattern.split(sep).join('/');
  });
  const matchers = normalizedPatterns.map(p => picomatch(p, { dot: true }));
  const all = await walk(root);
  const out = [];
  for (const file of all) {
    const rel = relative(root, file).split(sep).join('/');
    if (matchers.some(m => m(rel))) out.push(file);
  }
  return out.sort();
}

/**
 * Resolve a single workflow path argument. If it's a directory or glob,
 * expand it; if a file, validate it exists.
 *
 * @param {string} input
 * @param {string} [cwd]
 * @returns {Promise<string[]>}
 */
export async function resolveWorkflowArg(input, cwd = process.cwd()) {
  const abs = assertInside(input, cwd);
  try {
    const st = await stat(abs);
    const safePath = await assertRealInside(abs, cwd);
    if (st.isDirectory()) {
      const files = await walk(safePath);
      return files.filter(f => /\.ya?ml$/i.test(f)).sort();
    }
    if (!st.isFile()) return [];
    return [safePath];
  } catch {
    return discoverWorkflows({ patterns: [input], cwd });
  }
}
