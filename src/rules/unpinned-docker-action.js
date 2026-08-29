import { collectUses } from '../lib/parser.js';

export const id = 'unpinned-docker-action';
export const severity = 'high';
export const description = 'Docker action image is not pinned to a SHA-256 digest.';

const DIGEST_RE = /@sha256:[0-9a-f]{64}$/i;

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
export function check(workflow) {
  const findings = [];
  for (const { ref } of collectUses(workflow)) {
    if (ref.kind !== 'docker' || DIGEST_RE.test(ref.raw)) continue;
    findings.push({
      id,
      severity,
      line: ref.line,
      start: ref.start,
      fields: {
        type: id,
        sev: severity,
        image: ref.raw.slice('docker://'.length),
      },
      explain: 'resolve the intended image from its trusted registry, then replace the tag with the verified `@sha256:<64-hex-digest>` reference',
    });
  }
  return findings;
}
