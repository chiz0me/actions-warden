export const id = 'workflow-structure';
export const severity = 'medium';
export const description = 'Workflow or composite action contains invalid or ambiguous GitHub Actions syntax.';

const PERMISSION_SHORTHANDS = new Set(['read-all', 'write-all']);
const PERMISSION_LEVELS = new Set(['read', 'write', 'none']);

/**
 * Detect high-value structural mistakes separately from security policy.
 *
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
export function check(workflow) {
  if (workflow.kind === 'composite-action') return checkCompositeAction(workflow);
  if (workflow.kind !== 'workflow') {
    return isWorkflowPath(workflow.path)
      ? [finding(1, 'missing-jobs', 'workflow files must declare a `jobs:` mapping')]
      : [];
  }

  const findings = [];
  if (!workflow.onDeclared) {
    findings.push(finding(1, 'missing-trigger', 'the workflow must declare an `on:` trigger'));
  } else if (workflow.on === null) {
    findings.push(finding(1, 'trigger', 'the workflow declares `on:` without a trigger value'));
  } else if (!validTriggers(workflow.on)) {
    findings.push(finding(1, 'trigger-shape', '`on` must name at least one workflow event'));
  }
  findings.push(...permissionFindings(
    workflow.permissions,
    workflow.permissionsDeclared,
    workflow.permissionsLine || 1,
    'permissions',
  ));

  if (!isRecord(workflow.raw?.jobs)) {
    findings.push(finding(1, 'jobs-mapping', '`jobs:` must be a mapping of job IDs to job definitions'));
    return findings;
  }
  if (Object.keys(workflow.raw.jobs).length === 0) {
    findings.push(finding(1, 'empty-jobs', 'the workflow must declare at least one job'));
  }

  for (const job of workflow.jobs) {
    if (!job.validMapping) {
      findings.push(finding(
        job.line,
        'job-definition',
        `job "${job.name}" must be a mapping`,
        job.name,
      ));
      continue;
    }
    findings.push(...permissionFindings(
      job.permissions,
      job.permissionsDeclared,
      job.permissionsLine || job.line,
      'job-permissions',
      job.name,
    ));

    if (job.usesDeclared) {
      if (!isReusableWorkflowRef(job.uses)) {
        findings.push(finding(
          job.line,
          'reusable-job-uses',
          `job "${job.name}" must reference a reusable workflow from its uses key`,
          job.name,
        ));
      }
      if (job.runsOnDeclared) {
        findings.push(finding(
          job.line,
          'reusable-job-runs-on',
          `job "${job.name}" cannot contain both a reusable workflow call and runs-on`,
          job.name,
        ));
      }
      if (job.stepsDeclared) {
        findings.push(finding(
          job.line,
          'reusable-job-steps',
          `job "${job.name}" cannot contain both a reusable workflow call and steps`,
          job.name,
        ));
      }
    } else {
      if (!job.runsOnDeclared || !validRunnerSelector(job.runsOn)) {
        findings.push(finding(
          job.line,
          'missing-runs-on',
          `job "${job.name}" must declare a non-empty runs-on value`,
          job.name,
        ));
      }
      if (!job.stepsDeclared) {
        findings.push(finding(
          job.line,
          'missing-steps',
          `job "${job.name}" must declare steps or call a reusable workflow`,
          job.name,
        ));
      } else if (!job.stepsValid) {
        findings.push(finding(
          job.line,
          'steps-sequence',
          `job "${job.name}" must declare steps as a sequence of mappings`,
          job.name,
        ));
      } else if (job.steps.length === 0) {
        findings.push(finding(
          job.line,
          'empty-steps',
          `job "${job.name}" must declare at least one step or call a reusable workflow`,
          job.name,
        ));
      }
    }
    findings.push(...checkSteps(job.steps, job.name, false));
  }
  return findings;
}

function checkCompositeAction(workflow) {
  const job = workflow.jobs[0];
  if (!job?.stepsDeclared) {
    return [finding(job?.line || 1, 'composite-steps', 'a composite action must declare `runs.steps`')];
  }
  if (!job.stepsValid) {
    return [finding(job.line, 'composite-steps', 'a composite action must declare `runs.steps` as a sequence of mappings')];
  }
  if (job.steps.length === 0) {
    return [finding(job.line, 'composite-steps', 'a composite action must declare at least one step')];
  }
  return checkSteps(job.steps, job.name, true);
}

function checkSteps(steps, jobName, composite) {
  const findings = [];
  for (const step of steps) {
    if (step.primaryCount === 0) {
      findings.push(finding(
        step.line,
        'step-action',
        'a step must contain run, uses, wait, wait-all, cancel, or parallel',
        jobName,
      ));
      continue;
    }
    if (step.primaryCount > 1) {
      const runAndUsesOnly = step.usesDeclared
        && step.runDeclared
        && step.primaryCount === 2;
      findings.push(finding(
        step.line,
        runAndUsesOnly ? 'step-run-uses' : 'step-primary',
        runAndUsesOnly
          ? 'a step cannot contain both run and uses'
          : 'a step can contain only one of run, uses, wait, wait-all, cancel, or parallel',
        jobName,
      ));
      continue;
    }
    if (step.backgroundDeclared && step.control) {
      findings.push(finding(
        step.line,
        'background-step-type',
        'background is supported only on run or uses steps',
        jobName,
      ));
    } else if (step.backgroundDeclared && typeof step.background !== 'boolean') {
      findings.push(finding(
        step.line,
        'background-value',
        'background must be a boolean value',
        jobName,
      ));
    }
    if (step.control) {
      findings.push(...controlStepFindings(step, jobName, composite));
      continue;
    }
    if (step.usesDeclared && !isStepActionRef(step.uses)) {
      findings.push(finding(
        step.line,
        'step-uses',
        'a step uses value must reference an action, Docker image, or local/self action',
        jobName,
      ));
    }
    if (step.runDeclared && step.run === null) {
      findings.push(finding(step.line, 'step-run', 'a run step must contain a script', jobName));
    }
    if (composite && step.runDeclared && (!step.shellDeclared || step.shell === null)) {
      findings.push(finding(
        step.line,
        'composite-step-shell',
        'run steps in a composite action must declare a non-empty shell',
        jobName,
      ));
    }
    if (composite && step.backgroundDeclared) {
      findings.push(finding(
        step.line,
        'composite-step-background',
        'background steps are not supported inside a composite action',
        jobName,
      ));
    }
  }
  return findings;
}

function controlStepFindings(step, jobName, composite) {
  if (composite) {
    return [finding(
      step.line,
      'composite-step-control',
      `${step.control} control steps are not supported inside a composite action`,
      jobName,
    )];
  }
  const findings = [];
  if (step.control === 'parallel') {
    if (!step.parallelValid) {
      findings.push(finding(
        step.line,
        'parallel-steps',
        'parallel must contain a non-empty sequence of step mappings',
        jobName,
      ));
    }
    return findings;
  }
  if (step.ifDeclared) {
    findings.push(finding(
      step.line,
      'control-step-if',
      `${step.control} control steps always run and do not support if`,
      jobName,
    ));
  }
  if (step.control === 'wait-all') {
    if (step.controlValue !== null) {
      findings.push(finding(step.line, 'wait-all-value', 'wait-all takes no value', jobName));
    }
    return findings;
  }
  if (step.control === 'wait') {
    const valid = (typeof step.controlValue === 'string' && step.controlValue.length > 0)
      || (
        Array.isArray(step.controlValue)
        && step.controlValue.length > 0
        && step.controlValue.every(value => typeof value === 'string' && value.length > 0)
      );
    if (!valid) {
      findings.push(finding(
        step.line,
        'wait-value',
        'wait must name one or more background step IDs',
        jobName,
      ));
    }
    return findings;
  }
  if (typeof step.controlValue !== 'string' || step.controlValue.length === 0) {
    findings.push(finding(
      step.line,
      'cancel-value',
      'cancel must name one background step ID',
      jobName,
    ));
  }
  return findings;
}

function permissionFindings(value, declared, line, issue, job) {
  if (!declared) return [];
  if (value === null) {
    return [finding(
      line,
      issue,
      job
        ? `job "${job}" has a bare permissions key; use an empty map or explicit scopes`
        : 'bare `permissions:` is invalid; use `permissions: {}` to disable all token permissions',
      job,
    )];
  }
  if (typeof value === 'string') {
    if (PERMISSION_SHORTHANDS.has(value)) return [];
    return [finding(
      line,
      issue,
      '`permissions` scalar values must be `read-all` or `write-all`',
      job,
    )];
  }
  if (!isRecord(value)) {
    return [finding(line, issue, '`permissions` must be a mapping or a supported shorthand', job)];
  }
  const invalid = Object.entries(value)
    .filter(([, level]) => !PERMISSION_LEVELS.has(level))
    .map(([scope]) => scope);
  return invalid.length === 0
    ? []
    : [finding(
      line,
      issue,
      `permission scopes must use read, write, or none; invalid: ${invalid.join(', ')}`,
      job,
    )];
}

function isReusableWorkflowRef(ref) {
  if (!ref) return false;
  if (ref.kind === 'reusable-workflow') {
    return Boolean(
      ref.owner
      && ref.repo
      && ref.ref
      && !/\s|@/.test(ref.ref)
      && /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(ref.subpath ?? ''),
    );
  }
  if (ref.kind === 'local') {
    return /^\.\/\.github\/workflows\/[^/]+\.ya?ml$/i.test(ref.raw);
  }
  return ref.kind === 'self'
    && /^\$\/\.github\/workflows\/[^/]+\.ya?ml$/i.test(ref.raw);
}

function isStepActionRef(ref) {
  if (!ref) return false;
  if (ref.kind === 'self') return /^\$\/[^@]+$/.test(ref.raw);
  if (ref.kind === 'external') {
    return Boolean(
      ref.owner
      && ref.repo
      && ref.ref
      && !/\s|@/.test(ref.ref)
      && /^[^/@\s]+\/[^/@\s]+(?:\/[^/@\s]+)*@[^@\s]+$/.test(ref.raw),
    );
  }
  if (ref.kind === 'local') {
    return ref.raw === './' || /^(?:\.\/|\.\.\/).+$/s.test(ref.raw);
  }
  if (ref.kind === 'docker') return /^docker:\/\/\S+$/.test(ref.raw);
  return false;
}

function isWorkflowPath(path) {
  return /(?:^|[\\/])\.github[\\/]workflows[\\/][^\\/]+\.ya?ml$/i.test(path);
}

function validTriggers(value) {
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) {
    return value.length > 0 && value.every(event => typeof event === 'string' && event.length > 0);
  }
  return isRecord(value) && Object.keys(value).length > 0;
}

function validRunnerSelector(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) {
    return value.length > 0
      && value.every(label => typeof label === 'string' && label.trim().length > 0);
  }
  if (!isRecord(value)) return false;
  const groupValid = typeof value.group === 'string' && value.group.trim().length > 0;
  const labelsValid = typeof value.labels === 'string'
    ? value.labels.trim().length > 0
    : Array.isArray(value.labels)
      && value.labels.length > 0
      && value.labels.every(label => typeof label === 'string' && label.trim().length > 0);
  return groupValid || labelsValid;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function finding(line, issue, explain, job) {
  return {
    id,
    severity,
    line,
    fields: {
      type: id,
      sev: severity,
      issue,
      ...(job ? { job } : {}),
    },
    explain,
  };
}
