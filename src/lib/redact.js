/**
 * Secret redaction utility.
 *
 * Replaces values that look like tokens, credentials, or high-entropy strings
 * with `<redacted>`. Conservative by design: prefers false positives over leaks.
 */

import { RULES } from '../rules/index.js';

const TOKEN_PATTERNS = [
  /ghp_[A-Za-z0-9]{30,}/g,
  /ghs_[A-Za-z0-9]{30,}/g,
  /gho_[A-Za-z0-9]{30,}/g,
  /ghu_[A-Za-z0-9]{30,}/g,
  /github_pat_[A-Za-z0-9_]{30,}/g,
  /xox[abprs]-[A-Za-z0-9-]{10,}/g,
  /(?:AKIA|ASIA)[0-9A-Z]{16}/g,
  /sk-[A-Za-z0-9]{20,}/g,
  /(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g,
  /AIza[0-9A-Za-z_-]{30,}/g,
  /ya29\.[0-9A-Za-z_-]{20,}/g,
  /npm_[0-9A-Za-z]{20,}/g,
  /eyJ[0-9A-Za-z_-]{8,}\.[0-9A-Za-z_-]{8,}\.[0-9A-Za-z_-]{8,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

const SENSITIVE_KEY = /(?:token|secret|password|api[_-]?key|auth[_-]?token|access[_-]?key|private[_-]?key)$/i;
const KV_TOKEN_KEYS = /([\w-]*(?:token|secret|password|api[_-]?key|auth[_-]?token|access[_-]?key|private[_-]?key))(\s*[:=]\s*)["']?([^"'\s,]+)/gi;
const HIGH_ENTROPY = /[A-Za-z0-9_+/-]{32,}={0,2}/g;
// Source links the scanner itself builds: https://github.com/<owner>/<repo>/blob/<ref>/<path>
// with an optional #L<line>. A commit SHA in the ref makes the whole link one long
// high-entropy run, so these links are exempt from the entropy heuristic only; explicit
// token patterns above still redact credential-shaped text inside them. The shape is exact
// (encodeURIComponent characters only) and isReadableSourceUrl also requires every segment
// to be a commit SHA or to read like words, so it cannot shelter secret-like file names.
const URL_SEGMENT = "[A-Za-z0-9._~%!'()*-]+";
const GITHUB_SOURCE_URL = new RegExp(
  `https://github\\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/blob/${URL_SEGMENT}`
  + `(?:/${URL_SEGMENT})+(?:#L\\d{1,9})?`,
  'g',
);
// Public rule IDs and artifact kinds long enough to trip the generic entropy
// heuristic. Keep the exceptions exact instead of weakening detection for
// arbitrary kebab-case values, which may still be credentials or passphrases.
const SAFE_PUBLIC_VALUES = new Set([
  ...RULES.map(rule => rule.id),
  'actions-warden-agent-receipt',
  'actions-warden-org-scan-receipt',
  'actions-warden-org-scan-directory',
  'actions-warden-org-scan-manifest',
  'actions-warden-org-scan-progress',
  'actions-warden-org-scan-repository',
]);
// Fields, or arrays of strings under them, whose values the scanner derives from GitHub
// identifiers: repository names, file paths, action references, and URLs. Only these may
// keep a long run readable when it reads like words; see redactIdentifier. Free text such
// as explain or msg is never in this set.
const READABLE_IDENTIFIER_KEYS = new Set([
  'file',
  'files',
  'path',
  'repo',
  'repository',
  'incompleteRepositories',
  'fullName',
  'action',
  'workflow',
  'htmlUrl',
  'url',
  'permalink',
  'uri',
  'repositoryUri',
]);
const FULL_SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i;
const NAME_PART_SEPARATORS = /[-_./]/;
const MAX_NAME_PART_LENGTH = 24;
const MAX_NAME_PART_TRANSITIONS = 4;

/**
 * Redacts sensitive substrings from a value.
 *
 * @param {unknown} input
 * @returns {string}
 */
export function redact(input) {
  return redactWith(input, false);
}

/**
 * Redact a value that the scanner knows is a name: a repository, file path, action
 * reference, or URL. Credential patterns and `key=value` secrets are still redacted.
 * Only the generic entropy heuristic is relaxed, and only for runs that read like
 * words, so long `payments-platform-service-gateway` names stay readable while hex,
 * base64, and mixed-case random tokens are still redacted.
 *
 * @param {unknown} input
 * @returns {string}
 */
export function redactIdentifier(input) {
  return redactWith(input, true);
}

/**
 * Redact the string value of one named field. Fields in the identifier set use
 * {@link redactIdentifier}; every other field uses {@link redact}.
 *
 * @param {unknown} key Field name, such as `path` or `htmlUrl`.
 * @param {unknown} input
 * @returns {string}
 */
export function redactField(key, input) {
  return READABLE_IDENTIFIER_KEYS.has(key) ? redactIdentifier(input) : redact(input);
}

function redactWith(input, readableNames) {
  if (input == null) return '';
  let s = typeof input === 'string' ? input : String(input);
  for (const re of TOKEN_PATTERNS) s = s.replace(re, '<redacted>');
  s = s.replace(KV_TOKEN_KEYS, (_, key, separator) => `${key}${separator}<redacted>`);
  return redactHighEntropyOutsideSourceUrls(s, readableNames);
}

function redactHighEntropyOutsideSourceUrls(input, readableNames) {
  let output = '';
  let position = 0;
  for (const match of input.matchAll(GITHUB_SOURCE_URL)) {
    if (!isReadableSourceUrl(match[0])) continue;
    output += redactHighEntropy(input.slice(position, match.index), readableNames) + match[0];
    position = match.index + match[0].length;
  }
  return output + redactHighEntropy(input.slice(position), readableNames);
}

function redactHighEntropy(text, readableNames) {
  return text.replace(HIGH_ENTROPY, value => (
    shouldRedactHighEntropy(value, readableNames) ? '<redacted>' : value
  ));
}

/**
 * Recursively redact strings in a JSON-compatible value.
 *
 * @param {unknown} input
 * @param {WeakSet<object>} [seen]
 * @returns {unknown}
 */
export function redactDeep(input, seen = new WeakSet()) {
  if (typeof input === 'string') return redact(input);
  if (input === null || typeof input !== 'object') return input;
  if (seen.has(input)) return '<circular>';
  seen.add(input);
  let output;
  if (input instanceof Date) {
    output = input.toISOString();
  } else if (input instanceof Error) {
    output = {
      name: redact(input.name),
      message: redact(input.message),
    };
    for (const [key, value] of Object.entries(input)) {
      output[key] = redactEntry(key, value, seen);
    }
  } else if (input instanceof Set) {
    output = [...input].map(item => redactDeep(item, seen));
  } else if (input instanceof Map) {
    output = Object.fromEntries(
      [...input.entries()].map(([k, v]) => [redact(String(k)), redactEntry(String(k), v, seen)]),
    );
  } else if (Array.isArray(input)) {
    output = input.map(item => redactDeep(item, seen));
  } else {
    output = {};
    for (const [key, value] of Object.entries(input)) {
      output[key] = redactEntry(key, value, seen);
    }
  }
  seen.delete(input);
  return output;
}

function redactEntry(key, value, seen) {
  if (SENSITIVE_KEY.test(key)) return '<redacted>';
  if (typeof value === 'string') return redactField(key, value);
  if (Array.isArray(value) && READABLE_IDENTIFIER_KEYS.has(key)) {
    return value.map(item => (
      typeof item === 'string' ? redactIdentifier(item) : redactDeep(item, seen)
    ));
  }
  return redactDeep(value, seen);
}

function shouldRedactHighEntropy(value, readableNames) {
  if (SAFE_PUBLIC_VALUES.has(value)) return false;
  if (FULL_SHA.test(value)) return false;
  if (readableNames && readsLikeWords(value)) return false;
  const categories = [
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[_+/=-]/.test(value),
  ].filter(Boolean).length;
  if (categories < 2) return false;
  const frequencies = new Map();
  for (const char of value) frequencies.set(char, (frequencies.get(char) ?? 0) + 1);
  let entropy = 0;
  for (const count of frequencies.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy >= 3.5;
}

// A source link stays readable only when every owner, repository, ref, and path segment
// is a full commit SHA or reads like words, so a secret-shaped file name inside a link is
// still redacted. Percent-escapes count as separators.
function isReadableSourceUrl(url) {
  const segments = url.replace(/#L\d{1,9}$/, '').split('/').slice(3);
  return segments.every(segment => (
    FULL_SHA.test(segment) || readsLikeWords(segment.replace(/%[0-9A-Fa-f]{2}/g, '-'))
  ));
}

// A run reads like words when every `-`, `_`, `.`, or `/` separated part is short,
// alphanumeric, not hex-like, and changes between lowercase, uppercase, and digits only
// a few times (`payments`, `PaymentsGatewayV2`, `k8s`). Random hex, base64, and
// mixed-case tokens fail at least one of those tests.
function readsLikeWords(run) {
  return run.split(NAME_PART_SEPARATORS).every(isNamePart);
}

function isNamePart(part) {
  if (part.length > MAX_NAME_PART_LENGTH || !/^[A-Za-z0-9]*$/.test(part)) return false;
  if (part.length >= 8 && /^[0-9a-f]+$/i.test(part) && /\d/.test(part) && /[a-f]/i.test(part)) {
    return false;
  }
  return characterClassTransitions(part) <= MAX_NAME_PART_TRANSITIONS;
}

function characterClassTransitions(part) {
  let transitions = 0;
  let previous = '';
  for (const character of part) {
    const kind = characterClass(character);
    if (previous && kind !== previous) transitions += 1;
    previous = kind;
  }
  return transitions;
}

function characterClass(character) {
  if (character >= 'a' && character <= 'z') return 'lower';
  if (character >= 'A' && character <= 'Z') return 'upper';
  return 'digit';
}

/**
 * Wraps console.error/log so any string-coerced argument is redacted first.
 *
 * @param {(...args: unknown[]) => void} fn
 * @returns {(...args: unknown[]) => void}
 */
export function safeLogger(fn) {
  return (...args) => fn(...args.map(a => redactDeep(a)));
}
