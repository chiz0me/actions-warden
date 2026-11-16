// @ts-check
/**
 * Shared definitions for organization scans, reports, checkpoints, and
 * comparisons: identifier patterns, closed value sets, and small structural
 * guards. Each definition lives here once so validators cannot drift apart.
 */

/** Pattern accepted for GitHub organization, owner, and repository names. */
export const NAME_RE = /^[A-Za-z0-9_.-]+$/;

/** Pattern for a full 40-hex Git object ID. */
export const GIT_SHA_RE = /^[0-9a-f]{40}$/i;

/** Finding severities ordered from lowest to highest. */
export const SEVERITY_LEVELS = Object.freeze(['low', 'medium', 'high', 'critical']);

/** Finding severities as a set for membership checks. */
export const SEVERITIES = new Set(SEVERITY_LEVELS);

/** Visibility values GitHub reports for a repository. */
export const REPOSITORY_VISIBILITIES = Object.freeze(['public', 'private', 'internal']);

/** Visibility filters accepted for an organization scan. */
export const VISIBILITY_FILTERS = Object.freeze(['all', ...REPOSITORY_VISIBILITIES]);

/** Visibility filters as a set for membership checks. */
export const VISIBILITIES = new Set(VISIBILITY_FILTERS);

/**
 * Return whether a value is a plain, non-array object.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Return whether a value is finite JSON data without cycles.
 *
 * @param {unknown} value
 * @param {Set<object>} [seen]
 * @returns {boolean}
 */
export function isJsonValue(value, seen = new Set()) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!value || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  const valid = Array.isArray(value)
    ? value.every(item => isJsonValue(item, seen))
    : Object.entries(value).every(([key, item]) => (
      typeof key === 'string' && isJsonValue(item, seen)
    ));
  seen.delete(value);
  return valid;
}

/**
 * Validate repository filters and remove duplicates while keeping order.
 *
 * @param {unknown} patterns Undefined, or an array of non-empty strings.
 * @returns {string[]}
 */
export function normalizePatterns(patterns) {
  if (patterns === undefined) return [];
  if (
    !Array.isArray(patterns)
    || patterns.some(pattern => typeof pattern !== 'string' || !pattern)
  ) throw new Error('repository filters must be non-empty strings');
  return [...new Set(patterns)];
}

/** Scan outcomes recorded for each workflow file in a repository result. */
export const FILE_STATUSES = new Set(['scanned', 'parse-error', 'unreadable']);

/**
 * Compare repository paths by UTF-16 code unit so ordering does not depend on
 * the runtime locale.
 *
 * @param {string} left
 * @param {string} right
 * @returns {number}
 */
export function comparePaths(left, right) {
  if (left < right) return -1;
  return left > right ? 1 : 0;
}
