/**
 * Shared destination and control-file collision validation.
 */

import { relative, resolve, sep } from 'node:path';
import { sameFilePath } from './path-equality.js';
import { writeFileGuarded } from './writer.js';

export const DEFAULT_CONFIG_PATHS = ['.actions-warden.yml', '.actions-warden.yaml'];

/**
 * Check if a path corresponds to a default workflow or composite-action path.
 *
 * @param {string} path
 * @param {string} cwd
 * @returns {boolean}
 */
export function isDefaultWorkflowPath(path, cwd) {
  const localPath = relative(resolve(cwd), path).split(sep).join('/');
  return /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(localPath)
    || /(^|\/)action\.ya?ml$/i.test(localPath);
}

/**
 * Ensure destination paths cannot replace reserved config paths or default workflow paths.
 *
 * @param {Array<{label?: string, option?: string, path: string}>} destinations
 * @param {string} cwd
 */
export async function assertDestinationsUseSafeNames(destinations, cwd) {
  await assertDestinationsDoNotReplaceControls(
    destinations,
    DEFAULT_CONFIG_PATHS.map(path => ({ label: 'reserved config path', path: resolve(cwd, path) })),
  );
  for (const destination of destinations) {
    if (isDefaultWorkflowPath(destination.path, cwd)) {
      const name = destination.option || destination.label || 'destination';
      throw new Error(`${name} cannot use a default workflow discovery path`);
    }
  }
}

/**
 * Ensure destination paths do not collide with control files.
 *
 * @param {Array<{label?: string, option?: string, path: string}>} destinations
 * @param {Array<{label: string, path: string|null|undefined}>} controls
 */
export async function assertDestinationsDoNotReplaceControls(destinations, controls) {
  for (const destination of destinations) {
    if (!destination.path) continue;
    for (const control of controls) {
      if (control.path && await sameFilePath(destination.path, resolve(control.path))) {
        const name = destination.option || destination.label || 'destination';
        throw new Error(`${name} cannot replace the ${control.label}`);
      }
    }
  }
}

/**
 * Ensure multiple write destinations are distinct from each other.
 *
 * @param {Array<{label?: string, option?: string, path: string}>} destinations
 */
export async function assertDestinationsAreDistinct(destinations) {
  for (let left = 0; left < destinations.length; left += 1) {
    for (let right = left + 1; right < destinations.length; right += 1) {
      if (await sameFilePath(destinations[left].path, destinations[right].path)) {
        const leftName = destinations[left].option || destinations[left].label || 'destination';
        const rightName = destinations[right].option || destinations[right].label || 'destination';
        throw new Error(`${leftName} and ${rightName} must use different paths`);
      }
    }
  }
}

/**
 * Validate that a write destination can be created safely.
 *
 * @param {{option?: string, label?: string, path: string, cwd: string}} options
 * @returns {Promise<{option?: string, label?: string, path: string}>}
 */
export async function validateWriteDestination({ option, label, path, cwd }) {
  const name = option || label || 'destination';
  if (typeof path !== 'string' || path.length === 0 || path.includes('\0')) {
    throw new Error(`${name} must be a non-empty path`);
  }
  try {
    await writeFileGuarded({ path, content: '', dryRun: true, cwd });
    return { option, label, path: resolve(cwd, path) };
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      throw new Error(`parent directory for ${name} must exist`);
    }
    throw error;
  }
}
