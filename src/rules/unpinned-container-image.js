import { collectImages } from '../lib/parser.js';

export const id = 'unpinned-container-image';
export const severity = 'high';
export const description = 'Job, service, or Docker action image is not pinned to a SHA-256 digest.';

const DIGEST_RE = /@sha256:[0-9a-f]{64}$/i;

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
export function check(workflow) {
  const findings = [];
  for (const image of collectImages(workflow)) {
    const localDockerAction = image.context === 'docker-action'
      && !image.raw.startsWith('/')
      && /(?:^|\/)Dockerfile$/.test(image.raw);
    if (DIGEST_RE.test(image.raw) || localDockerAction) {
      continue;
    }
    findings.push({
      id,
      severity,
      line: image.line,
      start: image.start,
      fields: {
        type: id,
        sev: severity,
        image: image.raw,
        context: image.context,
        job: image.jobName,
      },
      explain: image.raw.includes('${{')
        ? 'make every possible expression or matrix value an immutable image reference ending in `@sha256:<64-hex-digest>`'
        : 'resolve the intended image from its trusted registry, then replace the tag with the verified `@sha256:<64-hex-digest>` reference',
    });
  }
  return findings;
}
