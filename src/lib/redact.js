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
// (encodeURIComponent characters only) so it cannot shelter arbitrary secret-like text.
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

/**
 * Redacts sensitive substrings from a value.
 *
 * @param {unknown} input
 * @returns {string}
 */
export function redact(input) {
  if (input == null) return '';
  let s = typeof input === 'string' ? input : String(input);
  for (const re of TOKEN_PATTERNS) s = s.replace(re, '<redacted>');
  s = s.replace(KV_TOKEN_KEYS, (_, key, separator) => `${key}${separator}<redacted>`);
  return redactHighEntropyOutsideSourceUrls(s);
}

function redactHighEntropyOutsideSourceUrls(input) {
  let output = '';
  let position = 0;
  for (const match of input.matchAll(GITHUB_SOURCE_URL)) {
    output += redactHighEntropy(input.slice(position, match.index)) + match[0];
    position = match.index + match[0].length;
  }
  return output + redactHighEntropy(input.slice(position));
}

function redactHighEntropy(text) {
  return text.replace(HIGH_ENTROPY, value => (
    shouldRedactHighEntropy(value) ? '<redacted>' : value
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
      output[key] = SENSITIVE_KEY.test(key) ? '<redacted>' : redactDeep(value, seen);
    }
  } else if (input instanceof Set) {
    output = [...input].map(item => redactDeep(item, seen));
  } else if (input instanceof Map) {
    output = Object.fromEntries(
      [...input.entries()].map(([k, v]) => [
        redact(String(k)),
        SENSITIVE_KEY.test(String(k)) ? '<redacted>' : redactDeep(v, seen),
      ]),
    );
  } else if (Array.isArray(input)) {
    output = input.map(item => redactDeep(item, seen));
  } else {
    output = {};
    for (const [key, value] of Object.entries(input)) {
      output[key] = SENSITIVE_KEY.test(key) ? '<redacted>' : redactDeep(value, seen);
    }
  }
  seen.delete(input);
  return output;
}

function shouldRedactHighEntropy(value) {
  if (SAFE_PUBLIC_VALUES.has(value)) return false;
  if (/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(value)) return false;
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

/**
 * Wraps console.error/log so any string-coerced argument is redacted first.
 *
 * @param {(...args: unknown[]) => void} fn
 * @returns {(...args: unknown[]) => void}
 */
export function safeLogger(fn) {
  return (...args) => fn(...args.map(a => redactDeep(a)));
}
