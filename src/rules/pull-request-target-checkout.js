/**
 * Rule: workflows triggered by `pull_request_target` that check out the PR
 * head ref expose secrets to attacker-supplied code (pwn-request pattern).
 */

export const id = 'pull-request-target-checkout';
export const severity = 'critical';
export const description = 'pull_request_target workflow checks out attacker-controlled head ref.';

function hasPullRequestTarget(on) {
  if (!on) return false;
  if (typeof on === 'string') return on === 'pull_request_target';
  if (Array.isArray(on)) return on.includes('pull_request_target');
  if (typeof on === 'object') return Object.prototype.hasOwnProperty.call(on, 'pull_request_target');
  return false;
}

function checksOutHead(step) {
  if (!step.uses) return false;
  if (step.uses.owner !== 'actions' || step.uses.repo !== 'checkout') return false;
  const ref = step.with_?.ref;
  if (typeof ref !== 'string') return false;
  return /github\.event\.pull_request\.head/i.test(ref) || /github\.head_ref/i.test(ref);
}

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
export function check(workflow) {
  if (!hasPullRequestTarget(workflow.on)) return [];
  const findings = [];
  for (const job of workflow.jobs) {
    for (const step of job.steps) {
      if (checksOutHead(step)) {
        findings.push({
          id,
          severity,
          line: step.line,
          fields: { type: id, sev: severity, job: job.name },
          explain: 'avoid checking out PR head under pull_request_target — use pull_request, or split build/deploy',
        });
      }
    }
  }
  return findings;
}
