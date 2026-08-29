import { createHash } from 'node:crypto';
import { relative, sep } from 'node:path';

/**
 * Return a stable repository-relative path using POSIX separators.
 *
 * @param {string} file
 * @param {string} cwd
 */
export function canonicalPath(file, cwd = process.cwd()) {
  return relative(cwd, file).split(sep).join('/');
}

/**
 * Create a stable, collision-resistant identifier for a source occurrence.
 *
 * IDs deliberately exclude absolute paths so they remain stable across clones.
 *
 * @param {object} input
 * @param {string} input.kind
 * @param {string} input.file
 * @param {string} input.cwd
 * @param {number} [input.line]
 * @param {number} [input.start]
 * @param {string} [input.subject]
 */
export function occurrenceId({
  kind,
  file,
  cwd = process.cwd(),
  line = 0,
  start = 0,
  subject = '',
}) {
  const identity = JSON.stringify({
    kind,
    file: canonicalPath(file, cwd),
    line,
    start,
    subject,
  });
  return createHash('sha256').update(identity).digest('hex').slice(0, 16);
}

/**
 * The ID shared by an unpinned-action finding and its pin change.
 *
 * @param {object} input
 * @param {string} input.file
 * @param {string} input.cwd
 * @param {{line: number, start?: number, raw: string}} input.ref
 */
export function pinOccurrenceId({ file, cwd, ref }) {
  return occurrenceId({
    kind: 'pin',
    file,
    cwd,
    line: ref.line,
    start: ref.start ?? 0,
    subject: ref.raw,
  });
}
