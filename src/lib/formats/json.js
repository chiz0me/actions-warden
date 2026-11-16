// @ts-check
/**
 * Recursively redacted, 2-space-indented JSON serialization.
 */

import { redactDeep } from '../redact.js';

/**
 * Render recursively redacted JSON with 2-space indentation. Object key order
 * follows the caller-provided value.
 *
 * @param {unknown} payload
 * @returns {string}
 */
export function renderJson(payload) {
  return JSON.stringify(redactDeep(payload), null, 2) + '\n';
}
