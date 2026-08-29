/**
 * Rule: workflows triggered by `pull_request_target` that check out the PR
 * head ref expose secrets to attacker-supplied code (pwn-request pattern).
 */

import { hasTrigger } from '../lib/triggers.js';
import { executesWorkspace, normalizeSourcePath } from '../lib/execution.js';
import semver from 'semver';

export const id = 'pull-request-target-checkout';
export const severity = 'critical';
export const description = 'pull_request_target can fetch attacker-controlled code without an active checkout guard.';

// GitHub backported fork-PR checkout protection on 2026-07-20. Floating major
// tags v2-v7 received it automatically; immutable callers need one of these
// release commits (or a later release that a future warden version recognizes).
const PROTECTED_MINIMUM = new Map([
  [2, '2.8.0'],
  [3, '3.7.0'],
  [4, '4.4.0'],
  [5, '5.1.0'],
  [6, '6.1.0'],
  [7, '7.0.0'],
]);
const KNOWN_PROTECTED_SHAS = new Set([
  '0717577d45739eb3c851188b29f50ed6c0b2194e', // v2.8.0
  'a37ce9120846195fa4ece8f58b268e6043cb2f26', // v3.7.0
  '11d5960a326750d5838078e36cf38b85af677262', // v4.4.0
  'fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09', // v5.1.0
  'd23441a48e516b6c34aea4fa41551a30e30af803', // v6.1.0
  '9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0', // v7.0.0
  '3d3c42e5aac5ba805825da76410c181273ba90b1', // v7.0.1
]);

function checkoutProtection(step) {
  const optOut = step.with_?.['allow-unsafe-pr-checkout'];
  if (optOut === true || (typeof optOut === 'string' && optOut.trim().toLowerCase() === 'true')) {
    return { active: false, reason: 'explicit-opt-out' };
  }
  if (typeof optOut === 'string' && optOut.includes('${{')) {
    return { active: false, reason: 'dynamic-opt-out' };
  }

  const ref = step.uses?.ref ?? '';
  if (KNOWN_PROTECTED_SHAS.has(ref.toLowerCase())) {
    return { active: true, reason: 'protected-release-sha' };
  }
  const majorTag = ref.match(/^v([2-7])$/i);
  if (majorTag) return { active: true, reason: 'protected-floating-major' };

  const version = ref.match(/^v?(\d+)\.(\d+)(?:\.(\d+))?$/i);
  if (version) {
    const major = Number(version[1]);
    const minimum = PROTECTED_MINIMUM.get(major);
    const normalized = `${major}.${version[2]}.${version[3] ?? '0'}`;
    if (minimum && semver.gte(normalized, minimum)) {
      return { active: true, reason: 'protected-release-tag' };
    }
  }
  return { active: false, reason: 'unknown-or-unprotected-version' };
}

export function checkoutOfUntrustedPr(step) {
  if (!step.uses) return null;
  if (
    step.uses.owner?.toLowerCase() !== 'actions'
    || step.uses.repo?.toLowerCase() !== 'checkout'
  ) return null;
  const ref = step.with_?.ref;
  const repository = step.with_?.repository;
  const untrustedRef = typeof ref === 'string' && (
    /github\.event\.pull_request\.head/i.test(ref)
    || /github\.event\.pull_request\.merge_commit_sha/i.test(ref)
    || /github\.head_ref/i.test(ref)
    || /refs\/pull\//i.test(ref)
  );
  const untrustedRepository = typeof repository === 'string'
    && /github\.event\.pull_request\.head\.repo/i.test(repository);
  if (!untrustedRef && !untrustedRepository) return null;

  const protection = checkoutProtection(step);
  if (protection.active) return null;

  return {
    line: step.uses.line,
    path: normalizeSourcePath(step.with_?.path),
    protection: protection.reason,
  };
}

export function fetchesUntrustedPrCode(step) {
  if (typeof step.run !== 'string') return false;
  if (/\bgh\s+pr\s+(?:checkout|co)\b/i.test(step.run)) return true;
  return /\bgit\s+fetch\b[\s\S]*(?:(?:refs\/)?pull\/|github\.event\.pull_request\.(?:head|number)|github\.head_ref)/i
    .test(step.run);
}

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
export function check(workflow) {
  if (!hasTrigger(workflow.on, 'pull_request_target')) return [];
  const findings = [];
  for (const job of workflow.jobs) {
    const untrustedSources = [];
    let executed = false;
    for (const step of job.steps) {
      const checkout = checkoutOfUntrustedPr(step);
      if (checkout) {
        untrustedSources.push(checkout);
        continue;
      }
      if (fetchesUntrustedPrCode(step)) {
        untrustedSources.push({
          line: step.runLine || step.line,
          path: '.',
          protection: 'not-applicable-direct-fetch',
        });
        continue;
      }
      const untrustedSource = untrustedSources.find(source => (
        executesWorkspace(step, { sourcePaths: [source.path] })
      ));
      if (untrustedSource) {
        findings.push({
          id,
          severity,
          line: step.runLine || step.line,
          fields: {
            type: id,
            sev: severity,
            job: job.name,
            source_line: untrustedSource.line,
            checkout_protection: untrustedSource.protection,
          },
          explain: remediation(untrustedSource.protection, true),
        });
        executed = true;
        break;
      }
    }
    if (untrustedSources.length > 0 && !executed) {
      const [untrustedSource] = untrustedSources;
      findings.push({
        id,
        severity: 'high',
        line: untrustedSource.line,
        fields: {
          type: id,
          sev: 'high',
          job: job.name,
          source_line: untrustedSource.line,
          stage: 'checkout-only',
          checkout_protection: untrustedSource.protection,
        },
        explain: remediation(untrustedSource.protection, false),
      });
    }
  }
  return findings;
}

function remediation(protection, executed) {
  if (protection === 'explicit-opt-out' || protection === 'dynamic-opt-out') {
    return executed
      ? 'remove `allow-unsafe-pr-checkout` and keep the built-in fork guard; run pull-request code under `pull_request`, or split untrusted build from privileged publication'
      : 'remove `allow-unsafe-pr-checkout` unless this job only inspects data; if the opt-out is required, use a dedicated path, disable persisted credentials, minimize permissions and secrets, and never execute the checkout';
  }
  if (protection === 'unknown-or-unprotected-version') {
    return executed
      ? 'pin the full SHA of a current protected actions/checkout release, or run pull-request code under `pull_request` and keep privileged publication in a separate trusted job'
      : 'pin the full SHA of a current protected actions/checkout release and avoid consuming the pull-request checkout in this privileged job';
  }
  return executed
    ? 'do not fetch and execute pull-request code in a privileged `pull_request_target` job; use `pull_request` or split untrusted build from privileged publication'
    : 'avoid fetching pull-request code in a privileged `pull_request_target` job; if inspection is required, isolate it as data with minimal permissions and no persisted credentials';
}
