/**
 * YAML workflow parser.
 *
 * Parses GitHub Actions workflow files into a structure annotated with line
 * numbers for every job, step, and `uses:` reference. Line numbers refer to
 * 1-indexed positions in the source.
 */

import { readFile } from 'node:fs/promises';
import {
  parseDocument,
  isAlias,
  isMap,
  isSeq,
  isPair,
  isScalar,
} from 'yaml';

const MAX_PARALLEL_DEPTH = 10;

/**
 * @typedef {object} ActionRef
 * @property {string} raw            - e.g. `actions/checkout@v3` or `./local`
 * @property {string|null} owner
 * @property {string|null} repo
 * @property {string|null} subpath   - reusable-workflow sub-path
 * @property {string|null} ref       - tag, branch, or SHA after `@`
 * @property {'external'|'reusable-workflow'|'local'|'self'|'docker'|'unknown'} kind
 * @property {number} line
 * @property {number} column
 * @property {number} start
 * @property {number} end
 * @property {number} lineStart
 * @property {number} lineEnd
 * @property {boolean} alias
 */

/**
 * @typedef {object} ImageRef
 * @property {string} raw
 * @property {number} line
 * @property {number} start
 * @property {number} end
 * @property {string} context
 * @property {string|null} jobName
 */

/**
 * @typedef {object} StepNode
 * @property {string|null} name
 * @property {string|null} id
 * @property {boolean} ifDeclared
 * @property {ActionRef|null} uses
 * @property {boolean} usesDeclared
 * @property {string|null} run
 * @property {boolean} runDeclared
 * @property {unknown} env
 * @property {unknown} with_
 * @property {string|null} workingDirectory
 * @property {string|null} shell
 * @property {boolean} shellDeclared
 * @property {'wait'|'wait-all'|'cancel'|'parallel'|null} control
 * @property {unknown} controlValue
 * @property {number} primaryCount
 * @property {unknown} background
 * @property {boolean} backgroundDeclared
 * @property {boolean} parallelValid
 * @property {number} parallelDepth
 * @property {number} line
 * @property {number} runLine
 * @property {number} envLine
 */

/**
 * @typedef {object} JobNode
 * @property {string} name
 * @property {unknown} permissions
 * @property {boolean} permissionsDeclared
 * @property {unknown} runsOn
 * @property {boolean} runsOnDeclared
 * @property {unknown} env
 * @property {ActionRef|null} uses
 * @property {boolean} usesDeclared
 * @property {unknown} with_
 * @property {unknown} secrets
 * @property {StepNode[]} steps
 * @property {boolean} stepsDeclared
 * @property {boolean} stepsValid
 * @property {boolean} validMapping
 * @property {number} line
 * @property {number} permissionsLine
 * @property {number} envLine
 */

/**
 * @typedef {object} WorkflowDoc
 * @property {string} path
 * @property {string} source
 * @property {'workflow'|'composite-action'|'unknown'} kind
 * @property {string|null} name
 * @property {unknown} on
 * @property {boolean} onDeclared
 * @property {unknown} permissions
 * @property {boolean} permissionsDeclared
 * @property {object|null} env
 * @property {JobNode[]} jobs
 * @property {ImageRef[]} images
 * @property {number} permissionsLine
 * @property {number} envLine
 * @property {object} raw         - the parsed plain object (for rules to query)
 */

/**
 * @param {string} raw e.g. `actions/checkout@v3` or `./local`
 * @param {number} line
 * @param {{column?: number, start?: number, end?: number, lineStart?: number, lineEnd?: number}} [location]
 * @returns {ActionRef}
 */
export function parseActionRef(raw, line, location = {}) {
  /** @type {ActionRef} */
  const base = {
    raw,
    owner: null,
    repo: null,
    subpath: null,
    ref: null,
    kind: 'unknown',
    line,
    column: location.column ?? 0,
    start: location.start ?? 0,
    end: location.end ?? 0,
    lineStart: location.lineStart ?? 0,
    lineEnd: location.lineEnd ?? 0,
    alias: Boolean(location.alias),
  };
  if (typeof raw !== 'string' || raw.length === 0) return base;
  if (raw.startsWith('./') || raw.startsWith('../')) {
    return { ...base, kind: 'local' };
  }
  if (raw.startsWith('$/')) {
    return { ...base, kind: 'self' };
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
 * Return exact source offsets for a scalar node.
 *
 * @param {string} source
 * @param {{range?: number[]}} node
 */
function locationFromRange(source, node) {
  const start = node?.range?.[0] ?? 0;
  const end = node?.range?.[1] ?? start;
  const lineStart = source.lastIndexOf('\n', Math.max(start - 1, 0)) + 1;
  const newline = source.indexOf('\n', end);
  const lineEnd = newline === -1 ? source.length : newline;
  return {
    start,
    end,
    lineStart,
    lineEnd,
    column: start - lineStart + 1,
  };
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
 * @param {object} stepsNode
 * @param {number} [parallelDepth]
 * @returns {StepNode[]}
 */
function extractSteps(source, stepsNode, doc, parallelDepth = 0) {
  if (!isSeq(stepsNode)) return [];
  const steps = [];
  for (const stepNode of stepsNode.items) {
    if (!isMap(stepNode)) continue;
    const usesPair = findPair(stepNode, 'uses');
    const runPair = findPair(stepNode, 'run');
    const namePair = findPair(stepNode, 'name');
    const idPair = findPair(stepNode, 'id');
    const ifPair = findPair(stepNode, 'if');
    const envPair = findPair(stepNode, 'env');
    const withPair = findPair(stepNode, 'with');
    const workingDirectoryPair = findPair(stepNode, 'working-directory');
    const shellPair = findPair(stepNode, 'shell');
    const waitPair = findPair(stepNode, 'wait');
    const waitAllPair = findPair(stepNode, 'wait-all');
    const cancelPair = findPair(stepNode, 'cancel');
    const parallelPair = findPair(stepNode, 'parallel');
    const backgroundPair = findPair(stepNode, 'background');
    const controlPairs = [
      ['wait', waitPair],
      ['wait-all', waitAllPair],
      ['cancel', cancelPair],
      ['parallel', parallelPair],
    ].filter(([, pair]) => Boolean(pair));
    const [control, controlPair] = controlPairs[0] ?? [null, null];
    const stepLine = lineFromRange(source, stepNode);
    /** @type {StepNode} */
    const step = {
      name: namePair && isScalar(namePair.value) ? String(namePair.value.value) : null,
      id: idPair && isScalar(idPair.value) ? String(idPair.value.value) : null,
      ifDeclared: Boolean(ifPair),
      uses: null,
      usesDeclared: Boolean(usesPair),
      run: runPair && isScalar(runPair.value) ? String(runPair.value.value) : null,
      runDeclared: Boolean(runPair),
      env: envPair ? toJs(envPair.value) : null,
      with_: withPair ? toJs(withPair.value) : null,
      workingDirectory: workingDirectoryPair && isScalar(workingDirectoryPair.value)
        ? String(workingDirectoryPair.value.value)
        : null,
      shell: shellPair && isScalar(shellPair.value) ? String(shellPair.value.value) : null,
      shellDeclared: Boolean(shellPair),
      control,
      controlValue: controlPair ? toJs(controlPair.value) : null,
      primaryCount: Number(Boolean(usesPair)) + Number(Boolean(runPair)) + controlPairs.length,
      background: backgroundPair ? toJs(backgroundPair.value) : null,
      backgroundDeclared: Boolean(backgroundPair),
      parallelValid: Boolean(
        parallelPair
        && isSeq(parallelPair.value)
        && parallelPair.value.items.length > 0
        && parallelPair.value.items.every(item => isMap(item)),
      ),
      parallelDepth,
      line: stepLine,
      runLine: runPair ? lineFromRange(source, runPair.key) : 0,
      envLine: envPair ? lineFromRange(source, envPair.key) : 0,
    };
    const usesValue = usesPair ? resolveScalar(usesPair.value, doc) : null;
    if (usesValue) {
      const usesLine = lineFromRange(source, usesValue.location);
      step.uses = parseActionRef(
        String(usesValue.scalar.value),
        usesLine,
        {
          ...locationFromRange(source, usesValue.location),
          alias: usesValue.alias,
        },
      );
    }
    steps.push(step);
    if (parallelPair && isSeq(parallelPair.value)) {
      if (parallelDepth >= MAX_PARALLEL_DEPTH) {
        throw new Error(`parallel step nesting exceeded maximum depth of ${MAX_PARALLEL_DEPTH}`);
      }
      steps.push(...extractSteps(source, parallelPair.value, doc, parallelDepth + 1));
    }
  }
  return steps;
}

function imageRef(source, scalarValue, context, jobName = null) {
  const location = locationFromRange(source, scalarValue.location);
  return {
    raw: String(scalarValue.scalar.value),
    line: lineFromRange(source, scalarValue.location),
    start: location.start,
    end: location.end,
    context,
    jobName,
  };
}

/**
 * @param {string} source
 * @param {object} doc - yaml Document
 * @returns {JobNode[]}
 */
function extractJobs(source, doc, images) {
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
      permissionsDeclared: false,
      runsOn: null,
      runsOnDeclared: false,
      env: null,
      uses: null,
      usesDeclared: false,
      with_: null,
      secrets: null,
      steps: [],
      stepsDeclared: false,
      stepsValid: false,
      validMapping: isMap(jobNode),
      line: jobLine,
      permissionsLine: 0,
      envLine: 0,
    };

    if (isMap(jobNode)) {
      const perms = findPair(jobNode, 'permissions');
      if (perms) {
        job.permissions = toJs(perms.value);
        job.permissionsDeclared = true;
        job.permissionsLine = lineFromRange(source, perms.key);
      }
      const runsOn = findPair(jobNode, 'runs-on');
      if (runsOn) {
        job.runsOn = toJs(runsOn.value);
        job.runsOnDeclared = true;
      }
      const env = findPair(jobNode, 'env');
      if (env) {
        job.env = toJs(env.value);
        job.envLine = lineFromRange(source, env.key);
      }
      const jobUses = findPair(jobNode, 'uses');
      job.usesDeclared = Boolean(jobUses);
      const jobUsesValue = jobUses ? resolveScalar(jobUses.value, doc) : null;
      if (jobUsesValue) {
        const usesLine = lineFromRange(source, jobUsesValue.location);
        job.uses = parseActionRef(
          String(jobUsesValue.scalar.value),
          usesLine,
          {
            ...locationFromRange(source, jobUsesValue.location),
            alias: jobUsesValue.alias,
          },
        );
      }
      const jobWith = findPair(jobNode, 'with');
      if (jobWith) job.with_ = toJs(jobWith.value);
      const jobSecrets = findPair(jobNode, 'secrets');
      if (jobSecrets) job.secrets = toJs(jobSecrets.value);

      const containerPair = findPair(jobNode, 'container');
      const containerValue = containerPair ? resolveScalar(containerPair.value, doc) : null;
      if (containerValue) {
        images.push(imageRef(source, containerValue, 'job-container', jobName));
      } else if (containerPair && isMap(containerPair.value)) {
        const imagePair = findPair(containerPair.value, 'image');
        const imageValue = imagePair ? resolveScalar(imagePair.value, doc) : null;
        if (imageValue) {
          images.push(imageRef(source, imageValue, 'job-container', jobName));
        }
      }

      const servicesPair = findPair(jobNode, 'services');
      if (servicesPair && isMap(servicesPair.value)) {
        for (const servicePair of servicesPair.value.items) {
          if (!isPair(servicePair) || !isMap(servicePair.value)) continue;
          const imagePair = findPair(servicePair.value, 'image');
          const imageValue = imagePair ? resolveScalar(imagePair.value, doc) : null;
          if (imageValue) {
            images.push(imageRef(source, imageValue, 'service-container', jobName));
          }
        }
      }

      const stepsPair = findPair(jobNode, 'steps');
      if (stepsPair) {
        job.stepsDeclared = true;
        job.stepsValid = isSeq(stepsPair.value)
          && stepsPair.value.items.every(item => isMap(item));
        job.steps = extractSteps(source, stepsPair.value, doc);
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
    kind: 'unknown',
    name: null,
    on: null,
    onDeclared: false,
    permissions: null,
    permissionsDeclared: false,
    env: null,
    jobs: [],
    images: [],
    permissionsLine: 0,
    envLine: 0,
    raw: doc.toJS() ?? {},
  };
  if (!doc.contents || !isMap(doc.contents)) return result;
  const namePair = findPair(doc.contents, 'name');
  if (namePair && isScalar(namePair.value)) result.name = String(namePair.value.value);
  const onPair = findPair(doc.contents, 'on');
  if (onPair) {
    result.on = toJs(onPair.value);
    result.onDeclared = true;
  }
  const permPair = findPair(doc.contents, 'permissions');
  if (permPair) {
    result.permissions = toJs(permPair.value);
    result.permissionsDeclared = true;
    result.permissionsLine = lineFromRange(source, permPair.key);
  }
  const envPair = findPair(doc.contents, 'env');
  if (envPair) {
    result.env = toJs(envPair.value);
    result.envLine = lineFromRange(source, envPair.key);
  }
  const runsPair = findPair(doc.contents, 'runs');
  const usingPair = runsPair && isMap(runsPair.value) ? findPair(runsPair.value, 'using') : null;
  if (usingPair?.value?.value === 'composite') {
    result.kind = 'composite-action';
    const stepsPair = findPair(runsPair.value, 'steps');
    result.jobs = [{
      name: 'composite',
      permissions: null,
      permissionsDeclared: false,
      runsOn: null,
      runsOnDeclared: false,
      env: null,
      uses: null,
      usesDeclared: false,
      with_: null,
      secrets: null,
      steps: stepsPair ? extractSteps(source, stepsPair.value, doc) : [],
      stepsDeclared: Boolean(stepsPair),
      stepsValid: Boolean(
        stepsPair
        && isSeq(stepsPair.value)
        && stepsPair.value.items.every(item => isMap(item)),
      ),
      validMapping: true,
      line: lineFromRange(source, runsPair.key),
      permissionsLine: 0,
      envLine: 0,
    }];
  } else {
    result.kind = findPair(doc.contents, 'jobs') ? 'workflow' : 'unknown';
    result.jobs = extractJobs(source, doc, result.images);
    if (usingPair?.value?.value === 'docker') {
      result.kind = 'unknown';
      const imagePair = findPair(runsPair.value, 'image');
      const imageValue = imagePair ? resolveScalar(imagePair.value, doc) : null;
      if (imageValue) {
        result.images.push(imageRef(source, imageValue, 'docker-action'));
      }
    }
  }
  return result;
}

function resolveScalar(node, doc) {
  if (isScalar(node)) return { scalar: node, location: node, alias: false };
  if (!isAlias(node)) return null;
  const scalar = node.resolve(doc);
  return isScalar(scalar) ? { scalar, location: node, alias: true } : null;
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
 * @returns {Array<{ref: ActionRef, jobName: string|null, stepIndex: number, target: 'job'|'step', location: 'job'|'step'|'action-step'}>}
 */
export function collectUses(workflow) {
  const out = [];
  for (const job of workflow.jobs) {
    if (job.uses) {
      out.push({
        ref: job.uses,
        jobName: job.name,
        stepIndex: -1,
        target: 'job',
        location: 'job',
      });
    }
    job.steps.forEach((step, i) => {
      if (!step.uses) return;
      const composite = workflow.kind === 'composite-action';
      out.push({
        ref: step.uses,
        jobName: composite ? null : job.name,
        stepIndex: i,
        target: 'step',
        location: composite ? 'action-step' : 'step',
      });
    });
  }
  return out;
}

/**
 * Return container images referenced by jobs, services, and Docker actions.
 *
 * @param {WorkflowDoc} workflow
 * @returns {ImageRef[]}
 */
export function collectImages(workflow) {
  return [...workflow.images];
}
