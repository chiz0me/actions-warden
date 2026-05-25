/**
 * Rule: attacker-controlled fields like `github.event.issue.title` interpolated
 * directly into `run:` scripts allow arbitrary command execution.
 *
 * Safe pattern: pass through env vars and quote, e.g.
 *   env: { TITLE: ${{ github.event.issue.title }} }
 *   run: echo "$TITLE"
 */

export const id = 'script-injection';
export const severity = 'critical';
export const description = 'Untrusted GitHub context interpolated into shell script.';

const TAINTED_PATTERNS = [
  /github\.event\.issue\.(title|body)/i,
  /github\.event\.pull_request\.(title|body|head\.ref|head\.label)/i,
  /github\.event\.comment\.body/i,
  /github\.event\.review\.body/i,
  /github\.event\.discussion\.(title|body)/i,
  /github\.event\.commits\.[\d*]+\.message/i,
  /github\.event\.workflow_run\.head_branch/i,
  /github\.head_ref/i,
];

/**
 * @param {string} run
 * @returns {string|null}
 */
function detectTaintedExpr(run) {
  if (typeof run !== 'string') return null;
  for (const pat of TAINTED_PATTERNS) {
    const m = run.match(new RegExp(`\\$\\{\\{[^}]*${pat.source}[^}]*\\}\\}`, 'i'));
    if (m) return m[0];
  }
  return null;
}

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
export function check(workflow) {
  const findings = [];
  for (const job of workflow.jobs) {
    for (const step of job.steps) {
      if (!step.run) continue;
      const match = detectTaintedExpr(step.run);
      if (match) {
        findings.push({
          id,
          severity,
          line: step.line,
          fields: { type: id, sev: severity, job: job.name, expr: match },
          explain: 'move untrusted input through an env var and quote it in the script',
        });
      }
    }
  }
  return findings;
}
