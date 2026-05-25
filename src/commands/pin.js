/**
 * Pin command - rewrite tag-based `uses:` refs to immutable commit SHAs.
 *
 * Format: `uses: owner/repo@<sha>  # <original-ref>`
 *
 * The original tag is preserved as an inline comment so upgrades can find
 * the human-readable version later.
 */

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseWorkflowSource, collectUses } from '../lib/parser.js';
import { discoverWorkflows, resolveWorkflowArg } from '../lib/paths.js';
import { resolveRefToSha, resolveToken } from '../lib/resolver.js';
import { writeFileGuarded } from '../lib/writer.js';
import { parseIgnoreDirectives, isIgnored } from '../lib/ignore.js';
import { format } from '../lib/formatter.js';

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
  const files = await resolveTargets(workflows, cwd);
  const tok = resolveToken(token);
  /** @type {PinChange[]} */
  const changes = [];
  const errors = [];

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
    const ignore = parseIgnoreDirectives(source);
    for (const { ref } of collectUses(doc)) {
      if (ref.kind !== 'external' && ref.kind !== 'reusable-workflow') continue;
      if (!ref.ref || SHA_RE.test(ref.ref)) continue;
      if (isIgnored(ignore, ref.line, 'unpinned-action')) continue;
      try {
        const resolved = await resolveRefToSha({
          owner: ref.owner,
          repo: ref.repo,
          ref: ref.ref,
          token: tok,
          cwd,
        });
        planned.push({ ref, sha: resolved.sha, type: resolved.type });
      } catch (err) {
        errors.push({ file, action: ref.raw, error: String(err.message ?? err) });
      }
    }
    if (planned.length === 0) continue;

    let newSource = source;
    for (const { ref, sha, type } of planned) {
      const change = {
        id: changeId(file, ref.raw),
        file,
        action: `${ref.owner}/${ref.repo}${ref.subpath ? `/${ref.subpath}` : ''}`,
        fromRef: ref.ref,
        toSha: sha,
        line: ref.line,
        refType: type,
      };
      if (fix && fix !== change.id) continue;
      newSource = rewriteUses(newSource, ref, sha);
      changes.push(change);
    }
    if (newSource !== source) {
      await writeFileGuarded({ path: file, content: newSource, dryRun, cwd });
    }
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
  const left = ref.subpath ? `${ref.owner}/${ref.repo}/${ref.subpath}` : `${ref.owner}/${ref.repo}`;
  const escLeft = escapeRegExp(left);
  const escRef = escapeRegExp(ref.ref);
  // Match: optional quote, owner/repo[/sub]@ref, optional quote, optional comment.
  const re = new RegExp(
    `(uses\\s*:\\s*['"]?)${escLeft}@${escRef}(['"]?)([^\\n]*)`,
    'g',
  );
  return source.replace(re, (_, prefix, closingQuote, trailing) => {
    const tail = stripExistingVersionComment(trailing);
    return `${prefix}${left}@${sha}${closingQuote}${tail} # ${ref.ref}`;
  });
}

function stripExistingVersionComment(trailing) {
  // Remove any existing inline comment so we don't stack `# v3 # v3`.
  const idx = trailing.indexOf('#');
  if (idx === -1) return trailing;
  return trailing.slice(0, idx).replace(/\s+$/, '');
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function changeId(file, raw) {
  return createHash('sha1').update(`pin:${file}:${raw}`).digest('hex').slice(0, 10);
}

async function resolveTargets(workflows, cwd) {
  if (!workflows || workflows.length === 0) return discoverWorkflows({ cwd });
  const out = new Set();
  for (const w of workflows) {
    for (const f of await resolveWorkflowArg(w, cwd)) out.add(f);
  }
  return [...out].sort();
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
        dryRun: opts.dryRun,
        changes: result.changes.map(c => ({ ...c, file: rel(c.file, cwd) })),
        errors: result.errors,
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
  if (p && p.startsWith(cwd)) return p.slice(cwd.length + 1);
  return p;
}
