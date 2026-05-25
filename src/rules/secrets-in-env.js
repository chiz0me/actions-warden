/**
 * Rule: secrets exposed via env at workflow/job level leak to every step,
 * including third-party actions. Prefer step-scoped `env`.
 */

export const id = 'secrets-in-env';
export const severity = 'critical';
export const description = 'Secret is exposed broadly via workflow- or job-level env.';

const SECRET_EXPR = /\$\{\{\s*secrets\./i;

/**
 * @param {unknown} env
 * @returns {string[]} keys that reference secrets
 */
function secretKeys(env) {
  if (!env || typeof env !== 'object') return [];
  const out = [];
  for (const [key, val] of Object.entries(env)) {
    if (typeof val === 'string' && SECRET_EXPR.test(val)) out.push(key);
  }
  return out;
}

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
export function check(workflow) {
  const findings = [];
  for (const key of secretKeys(workflow.env)) {
    findings.push({
      id,
      severity,
      line: 1,
      fields: { type: id, sev: severity, key, scope: 'workflow' },
      explain: `secret ${key} is in workflow-level env — every step (including 3rd-party) can read it`,
    });
  }
  for (const job of workflow.jobs) {
    for (const key of secretKeys(job.env)) {
      findings.push({
        id,
        severity,
        line: job.line,
        fields: { type: id, sev: severity, key, scope: 'job', job: job.name },
        explain: `secret ${key} is in job-level env for "${job.name}"`,
      });
    }
  }
  return findings;
}
