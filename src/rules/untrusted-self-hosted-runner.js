import { hasTrigger } from '../lib/triggers.js';
import picomatch from 'picomatch';
import {
  checkoutOfUntrustedPr,
  fetchesUntrustedPrCode,
} from './pull-request-target-checkout.js';

export const id = 'untrusted-self-hosted-runner';
export const severity = 'high';
export const description = 'Untrusted pull-request code can reach a self-hosted runner.';

function runnerRisk(value, policy) {
  const labels = collectLabels(value);
  const configuredLabel = labels.find(label => (
    policy.selfHostedLabels.some(pattern => picomatch.isMatch(label, pattern))
  ));
  if (labels.includes('self-hosted')) return { selector: 'self-hosted' };
  if (configuredLabel) return { selector: configuredLabel };
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const group = typeof value.group === 'string' ? value.group : null;
    if (
      group
      && policy.flagUnknownGroups
      && !policy.trustedGroups.some(pattern => picomatch.isMatch(group, pattern))
    ) {
      return { selector: `group:${group}` };
    }
  }
  return null;
}

function collectLabels(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectLabels);
  if (value && typeof value === 'object' && 'labels' in value) {
    return collectLabels(value.labels);
  }
  return [];
}

function matrixRunnerRisk(job, rawJob, policy) {
  const matrix = rawJob?.strategy?.matrix;
  if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix)) return null;
  for (const key of matrixRunnerKeys(job.runsOn)) {
    const values = [];
    if (Array.isArray(matrix[key])) values.push(...matrix[key]);
    if (Array.isArray(matrix.include)) {
      for (const entry of matrix.include) {
        if (entry && typeof entry === 'object' && key in entry) values.push(entry[key]);
      }
    }
    for (const value of values) {
      const risk = runnerRisk(value, policy);
      if (risk) return { selector: `matrix.${key}:${risk.selector}` };
    }
  }
  return null;
}

function matrixRunnerKeys(value) {
  if (Array.isArray(value)) return new Set(value.flatMap(item => [...matrixRunnerKeys(item)]));
  if (value && typeof value === 'object') {
    return new Set(Object.values(value).flatMap(item => [...matrixRunnerKeys(item)]));
  }
  if (typeof value !== 'string') return new Set();
  const match = value.trim().match(
    /^\$\{\{\s*matrix(?:\.([A-Za-z_][A-Za-z0-9_-]*)|\[['"]([^'"]+)['"]\])\s*\}\}$/i,
  );
  return new Set(match ? [match[1] ?? match[2]] : []);
}

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
export function check(workflow, context = {}) {
  const pullRequest = hasTrigger(workflow.on, 'pull_request');
  const pullRequestTarget = hasTrigger(workflow.on, 'pull_request_target');
  if (!pullRequest && !pullRequestTarget) return [];
  const policy = {
    trustedGroups: [],
    selfHostedLabels: [],
    flagUnknownGroups: false,
    ...(context.runnerPolicy ?? {}),
  };
  return workflow.jobs.flatMap(job => {
    if (
      pullRequestTarget
      && !pullRequest
      && !job.steps.some(step => (
        checkoutOfUntrustedPr(step) || fetchesUntrustedPrCode(step)
      ))
    ) return [];
    const risk = runnerRisk(job.runsOn, policy)
      ?? matrixRunnerRisk(job, workflow.raw?.jobs?.[job.name], policy);
    if (!risk) return [];
    return [{
      id,
      severity,
      line: job.line,
      fields: {
        type: id,
        sev: severity,
        job: job.name,
        selector: risk.selector,
      },
      explain: 'use a GitHub-hosted runner or a clean one-job ephemeral runner isolated from credentials and sensitive networks; treat approval as an additional gate, not runner cleanup',
    }];
  });
}
