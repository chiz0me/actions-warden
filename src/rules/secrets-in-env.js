/**
 * Rule: secrets exposed via env at workflow/job level are available to every
 * step in that scope, including third-party actions. Prefer step-scoped `env`
 * unless job scope is required for condition evaluation.
 */

export const id = 'secrets-in-env';
export const severity = 'medium';
export const description = 'Workflow- or job-level env exposes secrets to unrelated steps.';

/**
 * @param {unknown} env
 * @returns {Array<{key: string, exposure: 'named-secret'|'all-secrets'}>}
 */
function secretKeys(env) {
  if (!env || typeof env !== 'object') return [];
  const out = [];
  for (const [key, val] of Object.entries(env)) {
    if (typeof val !== 'string' || !containsSecretReference(val)) continue;
    out.push({ key, exposure: secretExposure(val) });
  }
  return out;
}

function secretExposure(value) {
  if (/\btoJSON\s*\(\s*secrets\s*\)/i.test(value)) return 'all-secrets';
  if (/\bsecrets\s*\.\s*\*/i.test(value)) return 'all-secrets';
  for (const match of value.matchAll(/\bsecrets\s*\[([^\]]+)\]/gi)) {
    if (!/^\s*(['"])[A-Za-z_][A-Za-z0-9_]*\1\s*$/.test(match[1])) {
      return 'all-secrets';
    }
  }
  if (/\bsecrets\s*(?:[,)]|\}\})/i.test(withoutQuotedStrings(value))) {
    return 'all-secrets';
  }
  return 'named-secret';
}

function containsSecretReference(value) {
  const expressions = value.match(/\$\{\{[\s\S]*?\}\}/g) ?? [];
  return expressions.some(expression => (
    /\bsecrets\s*(?:\.|\[|[,)]|\}\})/i.test(withoutQuotedStrings(expression))
  ));
}

function withoutQuotedStrings(value) {
  let output = '';
  let quote = null;
  let escaped = false;
  for (const char of value) {
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      output += ' ';
    } else if (char === '\'' || char === '"') {
      quote = char;
      output += ' ';
    } else {
      output += char;
    }
  }
  return output;
}

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
export function check(workflow) {
  const findings = [];
  for (const { key, exposure } of secretKeys(workflow.env)) {
    const findingSeverity = 'high';
    findings.push({
      id,
      severity: findingSeverity,
      line: workflow.envLine || 1,
      fields: {
        type: id,
        sev: findingSeverity,
        key,
        scope: 'workflow',
        exposure,
      },
      explain: exposure === 'all-secrets'
        ? `replace ${key} with explicit named secret references, then scope each reference to only the consuming step or action input; never serialize or dynamically index the secrets context`
        : `move ${key} to step-level env or a supported action input so only the step that consumes it receives the secret`,
    });
  }
  for (const job of workflow.jobs) {
    for (const { key, exposure } of secretKeys(job.env)) {
      const findingSeverity = exposure === 'all-secrets' ? 'high' : severity;
      findings.push({
        id,
        severity: findingSeverity,
        line: job.envLine || job.line,
        fields: {
          type: id,
          sev: findingSeverity,
          key,
          scope: 'job',
          job: job.name,
          exposure,
        },
        explain: exposure === 'all-secrets'
          ? `replace ${key} with explicit named secret references, then scope each reference to only the consuming step or action input; never serialize or dynamically index the secrets context`
          : `move ${key} to step-level env or an action input; if job scope is required for an if condition, keep every step in "${job.name}" trusted and minimize the secret's privileges`,
      });
    }
    for (const step of job.steps) {
      for (const { key, exposure } of secretKeys(step.env)) {
        if (exposure !== 'all-secrets') continue;
        findings.push({
          id,
          severity: 'high',
          line: step.envLine || step.line,
          fields: {
            type: id,
            sev: 'high',
            key,
            scope: 'step',
            job: job.name,
            exposure,
          },
          explain: `replace ${key} with explicit named secret references; dynamic indexing or toJSON(secrets) can expose every secret even when the env key is step-scoped`,
        });
      }
    }
  }
  return findings;
}
