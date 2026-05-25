/**
 * Rule: external action references must be pinned to a 40-character commit SHA.
 *
 * Tags like `v4` or `main` can be rewritten by repo owners (or attackers with
 * write access), making them an unstable supply-chain link.
 */

import { collectUses } from '../lib/parser.js';

export const id = 'unpinned-action';
export const severity = 'high';
export const description = 'External action is not pinned to a commit SHA.';

const SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 * @returns {Array<{id: string, severity: string, line: number, fields: object, explain: string}>}
 */
export function check(workflow) {
  const findings = [];
  for (const { ref } of collectUses(workflow)) {
    if (ref.kind !== 'external' && ref.kind !== 'reusable-workflow') continue;
    if (ref.ref && SHA_RE.test(ref.ref)) continue;
    findings.push({
      id,
      severity,
      line: ref.line,
      fields: {
        type: id,
        sev: severity,
        action: ref.raw,
        ref: ref.ref ?? '',
      },
      explain: `pin ${ref.owner}/${ref.repo} to a 40-char commit SHA — tags are mutable`,
    });
  }
  return findings;
}
