/**
 * Secret redaction utility.
 *
 * Replaces values that look like tokens, credentials, or high-entropy strings
 * with `<redacted>`. Conservative by design: prefers false positives over leaks.
 */

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
// This public rule ID is long enough to trip the generic entropy heuristic.
// Keep the exception exact instead of weakening detection for arbitrary
// kebab-case values, which may still be credentials or passphrases.
const SAFE_PUBLIC_VALUES = new Set([
  'reusable-workflow-secrets-inherit',
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
  s = s.replace(HIGH_ENTROPY, value => (
    shouldRedactHighEntropy(value) ? '<redacted>' : value
  ));
  return s;
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
  if (Array.isArray(input)) {
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
