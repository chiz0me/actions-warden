/**
 * Pin command - rewrite tag-based `uses:` refs to immutable commit SHAs.
 *
 * Format: `uses: owner/repo@<sha>  # actions-warden-ref: <original-ref>`
 *
 * The original tag is preserved as explicit metadata so upgrades can find the
 * human-readable version later.
 */

import { readFile } from 'node:fs/promises';
import { parseWorkflowSource, collectUses } from '../lib/parser.js';
import { resolveRefToSha, resolveToken, verifyCommitInRepo } from '../lib/resolver.js';
import { writeFileGuarded } from '../lib/writer.js';
import { parseIgnoreDirectives, isIgnored } from '../lib/ignore.js';
import { format } from '../lib/formatter.js';
import { pinOccurrenceId, canonicalPath } from '../lib/identity.js';
import { applyPatches, planUsesPatches } from '../lib/patcher.js';
import { resolveTargets } from '../lib/targets.js';
import { mapLimit } from '../lib/concurrency.js';

const SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * @typedef {object} PinChange
 * @property {string} id
 * @property {string} file
 * @property {string} action        - owner/repo
 * @property {string} fromRef
 * @property {string} toSha
 * @property {number} line
 * @property {'tag'|'branch'|'commit'} refType
 */

/**
 * @param {object} opts
 * @param {string} [opts.cwd]
 * @param {string[]} [opts.workflows]
 * @param {boolean} [opts.dryRun]
 * @param {string} [opts.token]
 * @param {string} [opts.fix]            - finding/change id to apply (skip others)
 * @returns {Promise<{changes: PinChange[], errors: object[], status: 'OK'|'FAIL'}>}
 */
export async function pin({ cwd = process.cwd(), workflows, dryRun = true, token, fix } = {}) {
  const files = await resolveTargets({ workflows, cwd });
  const tok = resolveToken(token);
  /** @type {PinChange[]} */
  const changes = [];
  const errors = [];
  let matchedFix = false;

  for (const file of files) {
    let source;
    try {
      source = await readFile(file, 'utf8');
    } catch (err) {
      errors.push({ file, error: String(err.message ?? err) });
      continue;
    }
    let doc;
    try {
      doc = parseWorkflowSource(source, file);
    } catch (err) {
      errors.push({ file, error: String(err.message ?? err) });
      continue;
    }
    /** @type {Array<{ref: import('../lib/parser.js').ActionRef, sha: string, type: string}>} */
    const planned = [];
    const candidates = [];
    const ignore = parseIgnoreDirectives(source);
    for (const { ref } of collectUses(doc)) {
      if (ref.kind !== 'external' && ref.kind !== 'reusable-workflow') continue;
      if (!ref.ref || SHA_RE.test(ref.ref)) continue;
      if (isIgnored(ignore, ref.line, 'unpinned-action')) continue;
      const id = pinOccurrenceId({ file, cwd, ref });
      if (fix && fix !== id) continue;
      if (fix === id) matchedFix = true;
      candidates.push({ id, ref });
    }
    const resolutions = await mapLimit(candidates, 4, async ({ id, ref }) => {
      try {
        const resolved = await resolveRefToSha({
          owner: ref.owner,
          repo: ref.repo,
          ref: ref.ref,
          token: tok,
          cwd,
        });
        await verifyCommitInRepo({
          owner: ref.owner,
          repo: ref.repo,
          sha: resolved.sha,
          token: tok,
          cwd,
        });
        return {
          planned: { id, ref, sha: resolved.sha, type: resolved.type },
        };
      } catch (err) {
        return {
          error: { file, action: ref.raw, error: String(err.message ?? err) },
        };
      }
    });
    for (const result of resolutions) {
      if (result.planned) planned.push(result.planned);
      if (result.error) errors.push(result.error);
    }
    if (planned.length === 0) continue;

    const patches = [];
    const fileChanges = [];
    for (const { id, ref, sha, type } of planned) {
      const change = {
        id,
        file,
        action: `${ref.owner}/${ref.repo}${ref.subpath ? `/${ref.subpath}` : ''}`,
        fromRef: ref.ref,
        toSha: sha,
        line: ref.line,
        refType: type,
      };
      patches.push(...planUsesPatches(source, ref, sha, ref.ref));
      fileChanges.push(change);
    }
    try {
      const newSource = applyPatches(source, patches);
      if (newSource !== source) {
        parseWorkflowSource(newSource, file);
        await writeFileGuarded({ path: file, content: newSource, dryRun, cwd });
      }
      changes.push(...fileChanges);
    } catch (err) {
      errors.push({ file, error: String(err.message ?? err) });
    }
  }
  if (fix && !matchedFix) {
    errors.push({ error: `fix id not found: ${fix}` });
  }
  return { changes, errors, status: errors.length === 0 ? 'OK' : 'FAIL' };
}

/**
 * Replace `uses: owner/repo[/sub]@<ref>` with the pinned SHA + comment.
 *
 * Operates on the source string; preserves quoting and whitespace.
 *
 * @param {string} source
 * @param {import('../lib/parser.js').ActionRef} ref
 * @param {string} sha
 * @returns {string}
 */
export function rewriteUses(source, ref, sha) {
  return applyPatches(source, planUsesPatches(source, ref, sha, ref.ref));
}

/**
 * @param {Awaited<ReturnType<typeof pin>>} result
 * @param {{format: 'toon'|'json'|'text', dryRun: boolean, cwd?: string}} opts
 */
export function renderPin(result, opts) {
  const cwd = opts.cwd ?? process.cwd();
  if (opts.format === 'json') {
    return format('json', [], {
      status: result.status,
      json: {
        schemaVersion: '1.0',
        dryRun: opts.dryRun,
        changes: result.changes.map(c => ({ ...c, file: rel(c.file, cwd) })),
        errors: result.errors.map(error => ({
          ...error,
          file: error.file ? rel(error.file, cwd) : undefined,
        })),
        status: result.status,
      },
    });
  }
  const records = [];
  for (const c of result.changes) {
    records.push({
      label: 'PIN',
      fields: {
        id: c.id,
        file: rel(c.file, cwd),
        line: c.line,
        action: c.action,
        from: c.fromRef,
        to: c.toSha,
        kind: c.refType,
        applied: !opts.dryRun,
      },
    });
  }
  for (const e of result.errors) {
    records.push({ label: 'ERROR', fields: { file: rel(e.file ?? '', cwd), action: e.action ?? '', msg: e.error } });
  }
  records.push({ label: 'SUMMARY', fields: { changes: result.changes.length, errors: result.errors.length, dry_run: opts.dryRun } });
  return format(opts.format, records, { status: result.status });
}

function rel(p, cwd) {
  return p ? canonicalPath(p, cwd) : p;
}
