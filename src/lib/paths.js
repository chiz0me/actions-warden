/**
 * Workflow file discovery with safe path handling.
 */

import { readdir, stat } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import picomatch from 'picomatch';

/**
 * Default workflow and composite-action globs.
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
  const abs = resolve(cwd, p);
  const rel = relative(cwd, abs);
  if (rel.startsWith('..') || rel.includes('\0')) {
    throw new Error(`path traversal rejected: ${p}`);
  }
  return abs;
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
  for (const p of patterns) assertInside(p, cwd);
  const matchers = patterns.map(p => picomatch(p, { dot: true }));
  const all = await walk(cwd);
  const out = [];
  for (const file of all) {
    const rel = relative(cwd, file);
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
    if (st.isDirectory()) {
      const files = await walk(abs);
      return files.filter(f => /\.ya?ml$/.test(f));
    }
    return [abs];
  } catch {
    return discoverWorkflows({ patterns: [input], cwd });
  }
}
