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
export const description = 'Untrusted GitHub context is interpolated into run or github-script code.';

const TAINTED_PATTERNS = [
  /github\.event\.issue\.(title|body)/i,
  /github\.event\.pull_request\.(title|body|head\.ref|head\.label)/i,
  /github\.event\.pull_request\.head\.repo\.default_branch/i,
  /github\.event\.comment\.body/i,
  /github\.event\.review\.body/i,
  /github\.event\.review_comment\.body/i,
  /github\.event\.discussion\.(title|body)/i,
  /github\.event\.commits(?:\[[^\]]+\]|\.[\d*]+)\.message/i,
  /github\.event\.commits(?:\[[^\]]+\]|\.[\d*]+)\.author\.(name|email)/i,
  /github\.event\.head_commit\.message/i,
  /github\.event\.head_commit\.author\.(name|email)/i,
  /github\.event\.label\.name/i,
  /github\.event\.milestone\.title/i,
  /github\.event\.release\.(name|body|tag_name)/i,
  /github\.event\.pages(?:\[[^\]]+\]|\.[\d*]+)\.page_name/i,
  /github\.event\.workflow_run\.(display_title|head_branch)/i,
  /github\.event\.workflow_run\.head_repository\.default_branch/i,
  /github\.head_ref/i,
];

/**
 * @param {string} run
 * @returns {string|null}
 */
function detectTaintedExpr(run) {
  if (typeof run !== 'string') return null;
  for (const expression of expressionsIn(run)) {
    for (const pat of TAINTED_PATTERNS) {
      if (pat.test(expression)) return expression;
    }
  }
  return null;
}

function detectTaintedEnvExpr(value, taintedKeys) {
  if (typeof value !== 'string') return null;
  for (const expression of expressionsIn(value)) {
    for (const key of taintedKeys) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const property = `env(?:\\.${escaped}|\\[\\s*['"]${escaped}['"]\\s*\\])`;
      if (new RegExp(property, 'i').test(expression)) return { expression, key };
    }
  }
  return null;
}

function expressionsIn(value) {
  return value.match(/\$\{\{[\s\S]*?\}\}/g) ?? [];
}

function mergeTaintedEnv(inherited, env) {
  const merged = new Set(inherited);
  if (!env || typeof env !== 'object' || Array.isArray(env)) return merged;
  for (const [key, value] of Object.entries(env)) {
    merged.delete(key);
    if (
      detectTaintedExpr(value)
      || detectTaintedEnvExpr(value, inherited)
    ) merged.add(key);
  }
  return merged;
}

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
export function check(workflow) {
  const findings = [];
  const workflowTaintedEnv = mergeTaintedEnv(new Set(), workflow.env);
  for (const job of workflow.jobs) {
    const jobTaintedEnv = mergeTaintedEnv(workflowTaintedEnv, job.env);
    for (const step of job.steps) {
      const stepTaintedEnv = mergeTaintedEnv(jobTaintedEnv, step.env);
      const sinks = [];
      if (step.run) sinks.push({ kind: 'run', value: step.run, line: step.runLine || step.line });
      if (
        step.uses?.owner?.toLowerCase() === 'actions'
        && step.uses?.repo?.toLowerCase() === 'github-script'
        && typeof step.with_?.script === 'string'
      ) {
        sinks.push({ kind: 'github-script', value: step.with_.script, line: step.line });
      }
      for (const sink of sinks) {
        const directMatch = detectTaintedExpr(sink.value);
        const envMatch = directMatch
          ? null
          : detectTaintedEnvExpr(sink.value, stepTaintedEnv);
        const match = directMatch ?? envMatch?.expression;
        if (!match) continue;
        findings.push({
          id,
          severity,
          line: sink.line,
          fields: {
            type: id,
            sev: severity,
            job: job.name,
            sink: sink.kind,
            expr: match,
            ...(envMatch ? { via_env: envMatch.key } : {}),
          },
          explain: sink.kind === 'github-script'
            ? 'assign the expression to step-level `env`, then read it through `process.env`; do not interpolate `${{ }}` into the script body'
            : 'assign the expression to step-level `env`, then read it with the shell\'s quoted variable syntax (for example, `"$VALUE"`), not `${{ env.VALUE }}`',
        });
      }
    }
  }
  return findings;
}
