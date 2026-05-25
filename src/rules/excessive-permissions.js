/**
 * Rule: workflows and jobs should not grant `write-all` or default-broad
 * permissions when scoped tokens would suffice.
 */

export const id = 'excessive-permissions';
export const severity = 'medium';
export const description = 'Workflow or job grants overly broad GITHUB_TOKEN permissions.';

const BROAD_VALUES = new Set(['write-all', 'write', 'all']);
const WRITE_SCOPES = new Set([
  'contents',
  'actions',
  'packages',
  'deployments',
  'id-token',
  'issues',
  'pull-requests',
  'security-events',
]);

/**
 * @param {unknown} permissions
 * @returns {string|null}  - returns offending scope label, or null
 */
function inspect(permissions) {
  if (permissions === undefined || permissions === null) {
    return 'unset-default'; // GitHub default is permissive when not declared
  }
  if (typeof permissions === 'string') {
    return BROAD_VALUES.has(permissions) ? permissions : null;
  }
  if (typeof permissions === 'object') {
    for (const [scope, val] of Object.entries(permissions)) {
      if (val === 'write' && WRITE_SCOPES.has(scope)) {
        return `${scope}=write`;
      }
    }
  }
  return null;
}

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
export function check(workflow) {
  const findings = [];
  const topScope = inspect(workflow.permissions);
  if (topScope === 'unset-default') {
    findings.push({
      id,
      severity: 'low',
      line: 1,
      fields: { type: id, sev: 'low', scope: 'workflow-default' },
      explain: 'declare `permissions:` at workflow root with least-privilege scopes',
    });
  } else if (topScope) {
    findings.push({
      id,
      severity,
      line: 1,
      fields: { type: id, sev: severity, scope: topScope, target: 'workflow' },
      explain: `workflow grants ${topScope} — narrow to specific scopes`,
    });
  }
  for (const job of workflow.jobs) {
    const jobScope = inspect(job.permissions);
    if (jobScope && jobScope !== 'unset-default') {
      findings.push({
        id,
        severity,
        line: job.line,
        fields: { type: id, sev: severity, scope: jobScope, job: job.name },
        explain: `job "${job.name}" grants ${jobScope}`,
      });
    }
  }
  return findings;
}
