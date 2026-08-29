export const id = 'reusable-workflow-secrets-inherit';
export const severity = 'high';
export const description = 'Cross-repository reusable workflow inherits every caller secret.';

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
export function check(workflow) {
  const findings = [];
  for (const job of workflow.jobs) {
    if (
      job.uses?.kind !== 'reusable-workflow'
      || job.secrets !== 'inherit'
    ) {
      continue;
    }
    findings.push({
      id,
      severity,
      line: job.uses.line,
      start: job.uses.start,
      fields: {
        type: id,
        sev: severity,
        job: job.name,
        workflow: job.uses.raw,
      },
      explain: 'declare required names under the callee\'s `on.workflow_call.secrets`, then map only those secrets in this caller instead of using `inherit`',
    });
  }
  return findings;
}
