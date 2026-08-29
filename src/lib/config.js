import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import picomatch from 'picomatch';
import { parseDocument } from 'yaml';

const CONFIG_NAMES = ['.actions-warden.yml', '.actions-warden.yaml'];
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
const TOP_LEVEL_KEYS = new Set([
  'version',
  'baseline',
  'ignore-paths',
  'rules',
  'runner-policy',
]);

export const DEFAULT_CONFIG = Object.freeze({
  path: null,
  baseline: null,
  ignorePaths: [],
  rules: {},
  runnerPolicy: {
    trustedGroups: [],
    selfHostedLabels: [],
    flagUnknownGroups: false,
  },
});

/**
 * Load and strictly validate repository policy.
 *
 * @param {object} options
 * @param {string} [options.cwd]
 * @param {string|false} [options.path]
 * @param {string[]} [options.ruleIds]
 */
export async function loadConfig({
  cwd = process.cwd(),
  path,
  ruleIds = [],
} = {}) {
  if (path === false) {
    return { ...DEFAULT_CONFIG, runnerPolicy: { ...DEFAULT_CONFIG.runnerPolicy } };
  }
  let resolvedPath;
  if (path) {
    resolvedPath = await resolveRepositoryFile(path, cwd);
  } else {
    for (const candidate of CONFIG_NAMES) {
      try {
        resolvedPath = await resolveRepositoryFile(candidate, cwd);
        break;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }
  if (!resolvedPath) return { ...DEFAULT_CONFIG, runnerPolicy: { ...DEFAULT_CONFIG.runnerPolicy } };

  const source = await readFile(resolvedPath, 'utf8');
  const document = parseDocument(source);
  if (document.errors.length > 0) {
    throw new Error(`invalid actions-warden config: ${document.errors[0].message}`);
  }
  const raw = document.toJS() ?? {};
  if (!isRecord(raw)) throw new Error('actions-warden config must be a mapping');
  rejectUnknownKeys(raw, TOP_LEVEL_KEYS, 'config');
  if (raw.version !== undefined && raw.version !== 1) {
    throw new Error('actions-warden config version must be 1');
  }

  const knownRules = new Set(ruleIds);
  const rules = validateRules(raw.rules, knownRules);
  const runnerPolicy = validateRunnerPolicy(raw['runner-policy']);
  const baseline = optionalString(raw.baseline, 'baseline');
  const ignorePaths = stringArray(raw['ignore-paths'], 'ignore-paths');

  return {
    path: resolvedPath,
    baseline,
    ignorePaths,
    rules,
    runnerPolicy,
  };
}

export function filterIgnoredPaths(files, config, cwd) {
  if (config.ignorePaths.length === 0) return files;
  const matchers = config.ignorePaths.map(pattern => picomatch(pattern, { dot: true }));
  return files.filter(file => {
    const path = relative(cwd, file).split(sep).join('/');
    return !matchers.some(matches => matches(path));
  });
}

export async function resolveRepositoryFile(path, cwd = process.cwd()) {
  const requestedRoot = resolve(cwd);
  const requested = resolve(requestedRoot, path);
  if (!isAbsolute(path) && isOutside(relative(requestedRoot, requested))) {
    throw new Error(`path traversal rejected: ${path}`);
  }
  const [root, target] = await Promise.all([
    realpath(requestedRoot),
    realpath(requested),
  ]);
  if (isOutside(relative(root, target))) {
    throw new Error(`repository file escapes working directory: ${path}`);
  }
  return target;
}

function validateRules(value, knownRules) {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new Error('config.rules must be a mapping');
  const rules = {};
  for (const [ruleId, policy] of Object.entries(value)) {
    if (knownRules.size > 0 && !knownRules.has(ruleId)) {
      throw new Error(`unknown rule in config: ${ruleId}`);
    }
    if (!isRecord(policy)) throw new Error(`config.rules.${ruleId} must be a mapping`);
    rejectUnknownKeys(policy, new Set(['enabled', 'severity']), `config.rules.${ruleId}`);
    if (policy.enabled !== undefined && typeof policy.enabled !== 'boolean') {
      throw new Error(`config.rules.${ruleId}.enabled must be a boolean`);
    }
    if (policy.severity !== undefined && !SEVERITIES.has(policy.severity)) {
      throw new Error(`config.rules.${ruleId}.severity must be low, medium, high, or critical`);
    }
    rules[ruleId] = {
      enabled: policy.enabled ?? true,
      severity: policy.severity,
    };
  }
  return rules;
}

function validateRunnerPolicy(value) {
  if (value === undefined) return { ...DEFAULT_CONFIG.runnerPolicy };
  if (!isRecord(value)) throw new Error('config.runner-policy must be a mapping');
  rejectUnknownKeys(
    value,
    new Set(['trusted-groups', 'self-hosted-labels', 'flag-unknown-groups']),
    'config.runner-policy',
  );
  const flagUnknownGroups = value['flag-unknown-groups'] ?? false;
  if (typeof flagUnknownGroups !== 'boolean') {
    throw new Error('config.runner-policy.flag-unknown-groups must be a boolean');
  }
  return {
    trustedGroups: stringArray(value['trusted-groups'], 'runner-policy.trusted-groups'),
    selfHostedLabels: stringArray(
      value['self-hosted-labels'],
      'runner-policy.self-hosted-labels',
    ),
    flagUnknownGroups,
  };
}

function rejectUnknownKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`unknown ${label} key: ${key}`);
  }
}

function stringArray(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item)) {
    throw new Error(`config.${label} must be an array of non-empty strings`);
  }
  return [...new Set(value)];
}

function optionalString(value, label) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !value) {
    throw new Error(`config.${label} must be a non-empty string`);
  }
  return value;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isOutside(path) {
  return path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path);
}
