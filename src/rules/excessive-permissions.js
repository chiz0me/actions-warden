/**
 * Rule: workflows and jobs should not grant `write-all` or default-broad
 * permissions when scoped tokens would suffice.
 */

export const id = 'excessive-permissions';
export const severity = 'medium';
export const description = 'Workflow or job grants broadly writable GITHUB_TOKEN permissions.';

const BROAD_VALUES = new Set(['write-all']);

/**
 * @param {unknown} permissions
 * @param {boolean} declared
 * @returns {string|null}  - returns an offending scope label, or null
 */
function inspect(permissions, declared) {
  if (!declared) return 'unset-default';
  if (permissions === undefined || permissions === null) return null;
  if (typeof permissions === 'string') {
    return BROAD_VALUES.has(permissions) ? permissions : null;
  }
  if (typeof permissions === 'object') {
    const writable = Object.entries(permissions)
      .filter(([scope, value]) => value === 'write' && scope !== 'id-token')
      .map(([scope]) => scope);
    // Specific job capabilities such as contents:write or security-events:write
    // are often the least privilege needed. Flag only maps broad enough to
    // approximate write-all. Other rules independently report untrusted code
    // flowing into privileged trigger contexts.
    if (writable.length >= 3) return writable.map(scope => `${scope}=write`).join(',');
  }
  return null;
}

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
export function check(workflow) {
  if (workflow.kind !== 'workflow') return [];
  const findings = [];
  const topScope = inspect(workflow.permissions, workflow.permissionsDeclared);
  if (topScope === 'unset-default') {
    findings.push({
      id,
      severity: 'low',
      line: 1,
      fields: { type: id, sev: 'low', scope: 'workflow-default-unspecified' },
      explain: 'declare workflow-level `permissions: {}` and grant only the read or write scopes each job requires, so configurable repository defaults cannot broaden the token',
    });
  } else if (topScope) {
    findings.push({
      id,
      severity,
      line: workflow.permissionsLine || 1,
      fields: { type: id, sev: severity, scope: topScope, target: 'workflow' },
      explain: `replace workflow ${topScope} with an empty permissions map, then grant only the scopes required by each job`,
    });
  }
  for (const job of workflow.jobs) {
    const jobScope = inspect(job.permissions, job.permissionsDeclared);
    if (jobScope && jobScope !== 'unset-default') {
      findings.push({
        id,
        severity,
        line: job.permissionsLine || job.line,
        fields: { type: id, sev: severity, scope: jobScope, job: job.name },
        explain: `replace ${jobScope} in job "${job.name}" with only the specific read or write scopes its steps require`,
      });
    }
  }
  return findings;
}
