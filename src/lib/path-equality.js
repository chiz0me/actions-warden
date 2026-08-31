import { realpath } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

/**
 * Compare two existing or prospective file paths after resolving their real
 * parents. Existing entries are fully resolved so a control-file symlink is
 * compared with its target rather than only with the symlink name.
 */
export async function sameFilePath(left, right) {
  const [leftPath, rightPath] = await Promise.all([
    canonicalPath(left),
    canonicalPath(right),
  ]);
  return comparablePath(leftPath) === comparablePath(rightPath);
}

async function canonicalPath(path) {
  try {
    return await realpath(path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return join(await realpath(dirname(path)), basename(path));
  }
}

function comparablePath(path) {
  return process.platform === 'win32' || process.platform === 'darwin'
    ? path.toLowerCase()
    : path;
}
