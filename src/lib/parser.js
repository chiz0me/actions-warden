/**
 * YAML workflow parser.
 *
 * Parses GitHub Actions workflow files into a structure annotated with line
 * numbers for every job, step, and `uses:` reference. Line numbers refer to
 * 1-indexed positions in the source.
 */

import { readFile } from 'node:fs/promises';
import { parseDocument, isMap, isSeq, isPair, isScalar } from 'yaml';

/**
 * @typedef {object} ActionRef
 * @property {string} raw            - e.g. `actions/checkout@v3` or `./local`
 * @property {string|null} owner
 * @property {string|null} repo
 * @property {string|null} subpath   - reusable-workflow sub-path
 * @property {string|null} ref       - tag, branch, or SHA after `@`
 * @property {'external'|'reusable-workflow'|'local'|'docker'|'unknown'} kind
 * @property {number} line
 */

/**
 * @typedef {object} StepNode
 * @property {string|null} name
 * @property {string|null} id
 * @property {ActionRef|null} uses
 * @property {string|null} run
 * @property {object|null} env
 * @property {object|null} with_
 * @property {number} line
 */

/**
 * @typedef {object} JobNode
 * @property {string} name
 * @property {object|null} permissions
 * @property {string|null} runsOn
 * @property {object|null} env
 * @property {StepNode[]} steps
 * @property {number} line
 */

/**
 * @typedef {object} WorkflowDoc
 * @property {string} path
 * @property {string} source
 * @property {string|null} name
 * @property {unknown} on
 * @property {object|null} permissions
 * @property {object|null} env
 * @property {JobNode[]} jobs
 * @property {object} raw         - the parsed plain object (for rules to query)
 */

/**
 * @param {string} raw e.g. `actions/checkout@v3` or `./local`
 * @param {number} line
 * @returns {ActionRef}
 */
export function parseActionRef(raw, line) {
  /** @type {ActionRef} */
  const base = {
    raw,
    owner: null,
    repo: null,
    subpath: null,
    ref: null,
    kind: 'unknown',
    line,
  };
  if (typeof raw !== 'string' || raw.length === 0) return base;
  if (raw.startsWith('./') || raw.startsWith('../')) {
    return { ...base, kind: 'local' };
  }
  if (raw.startsWith('docker://')) {
    return { ...base, kind: 'docker' };
  }
  const atIndex = raw.lastIndexOf('@');
  if (atIndex <= 0) return base;
  const left = raw.slice(0, atIndex);
  const ref = raw.slice(atIndex + 1);
  const parts = left.split('/');
  if (parts.length < 2) return base;
  const owner = parts[0];
  const repo = parts[1];
  const rest = parts.slice(2).join('/');
  const kind = /\.(yml|yaml)$/.test(rest) ? 'reusable-workflow' : 'external';
  return { ...base, owner, repo, subpath: rest || null, ref, kind };
}

/**
 * @param {unknown} node
 * @returns {number}
 */
function lineOf(node) {
  if (node && typeof node === 'object' && 'range' in node && Array.isArray(node.range)) {
    // We won't use this path; line is computed externally from the document.
  }
  return 0;
}

/**
 * Find the 1-based line of a Pair/Scalar node within the YAML document.
 *
 * @param {string} source
 * @param {{range?: number[]}} node
 * @returns {number}
 */
function lineFromRange(source, node) {
  if (!node || !node.range || node.range.length === 0) return 0;
  const offset = node.range[0];
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

/**
 * Read a Pair value into a JS scalar where possible.
 *
 * @param {unknown} node
 */
function toJs(node) {
  if (node == null) return null;
  if (typeof node !== 'object') return node;
  if ('toJSON' in node && typeof node.toJSON === 'function') return node.toJSON();
  return node;
}

/**
 * Locate a child Pair by key within a YAMLMap.
 *
 * @param {object} map  - yaml YAMLMap node
 * @param {string} key
 * @returns {object|null}
 */
function findPair(map, key) {
  if (!map || !isMap(map)) return null;
  for (const item of map.items) {
    if (isPair(item) && isScalar(item.key) && item.key.value === key) {
      return item;
    }
  }
  return null;
}

/**
 * @param {string} source
 * @param {object} doc - yaml Document
 * @returns {JobNode[]}
 */
function extractJobs(source, doc) {
  /** @type {JobNode[]} */
  const jobs = [];
  const jobsPair = findPair(doc.contents, 'jobs');
  if (!jobsPair || !isMap(jobsPair.value)) return jobs;

  for (const jobPair of jobsPair.value.items) {
    if (!isPair(jobPair) || !isScalar(jobPair.key)) continue;
    const jobName = String(jobPair.key.value);
    const jobNode = jobPair.value;
    const jobLine = lineFromRange(source, jobPair.key);

    /** @type {JobNode} */
    const job = {
      name: jobName,
      permissions: null,
      runsOn: null,
      env: null,
      steps: [],
      line: jobLine,
    };

    if (isMap(jobNode)) {
      const perms = findPair(jobNode, 'permissions');
      if (perms) job.permissions = toJs(perms.value);
      const runsOn = findPair(jobNode, 'runs-on');
      if (runsOn) job.runsOn = toJs(runsOn.value);
      const env = findPair(jobNode, 'env');
      if (env) job.env = toJs(env.value);

      const stepsPair = findPair(jobNode, 'steps');
      if (stepsPair && isSeq(stepsPair.value)) {
        for (const stepNode of stepsPair.value.items) {
          if (!isMap(stepNode)) continue;
          const usesPair = findPair(stepNode, 'uses');
          const runPair = findPair(stepNode, 'run');
          const namePair = findPair(stepNode, 'name');
          const idPair = findPair(stepNode, 'id');
          const envPair = findPair(stepNode, 'env');
          const withPair = findPair(stepNode, 'with');

          const stepLine = lineFromRange(source, stepNode);
          /** @type {StepNode} */
          const step = {
            name: namePair && isScalar(namePair.value) ? String(namePair.value.value) : null,
            id: idPair && isScalar(idPair.value) ? String(idPair.value.value) : null,
            uses: null,
            run: runPair && isScalar(runPair.value) ? String(runPair.value.value) : null,
            env: envPair ? toJs(envPair.value) : null,
            with_: withPair ? toJs(withPair.value) : null,
            line: stepLine,
          };
          if (usesPair && isScalar(usesPair.value)) {
            const usesLine = lineFromRange(source, usesPair.value);
            step.uses = parseActionRef(String(usesPair.value.value), usesLine);
          }
          job.steps.push(step);
        }
      }
    }
    jobs.push(job);
  }
  return jobs;
}

/**
 * Parse a workflow YAML source into a {@link WorkflowDoc}.
 *
 * @param {string} source
 * @param {string} path
 * @returns {WorkflowDoc}
 */
export function parseWorkflowSource(source, path) {
  const doc = parseDocument(source, { keepSourceTokens: true });
  if (doc.errors && doc.errors.length > 0) {
    const first = doc.errors[0];
    throw new Error(`yaml parse error in ${path}: ${first.message}`);
  }
  /** @type {WorkflowDoc} */
  const result = {
    path,
    source,
    name: null,
    on: null,
    permissions: null,
    env: null,
    jobs: [],
    raw: doc.toJS() ?? {},
  };
  if (!doc.contents || !isMap(doc.contents)) return result;
  const namePair = findPair(doc.contents, 'name');
  if (namePair && isScalar(namePair.value)) result.name = String(namePair.value.value);
  const onPair = findPair(doc.contents, 'on');
  if (onPair) result.on = toJs(onPair.value);
  const permPair = findPair(doc.contents, 'permissions');
  if (permPair) result.permissions = toJs(permPair.value);
  const envPair = findPair(doc.contents, 'env');
  if (envPair) result.env = toJs(envPair.value);
  result.jobs = extractJobs(source, doc);
  return result;
}

/**
 * @param {string} path
 * @returns {Promise<WorkflowDoc>}
 */
export async function parseWorkflowFile(path) {
  const source = await readFile(path, 'utf8');
  return parseWorkflowSource(source, path);
}

/**
 * Iterate every action reference in a workflow.
 *
 * @param {WorkflowDoc} workflow
 * @returns {Array<{ref: ActionRef, jobName: string, stepIndex: number}>}
 */
export function collectUses(workflow) {
  const out = [];
  for (const job of workflow.jobs) {
    job.steps.forEach((step, i) => {
      if (step.uses) out.push({ ref: step.uses, jobName: job.name, stepIndex: i });
    });
  }
  return out;
}
