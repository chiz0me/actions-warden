/**
 * Upgrade command - bump pinned (or tagged) actions to the newest version
 * permitted by the chosen policy.
 *
 * For SHA-pinned refs, the human-readable version is read from the inline
 * comment (e.g. `# actions-warden-ref: v3.1.0`). Legacy plain semver comments
 * remain readable. If metadata is absent, the action is reported as `unknown`
 * and skipped.
 */

import { readFile } from 'node:fs/promises';
import semver from 'semver';
import { parseWorkflowSource, collectUses } from '../lib/parser.js';
import {
  getTagAgeEvidence,
  listTags,
  pickLatestTag,
  resolveRefToSha,
  resolveToken,
  verifyCommitInRepo,
} from '../lib/resolver.js';
import { writeFileGuarded } from '../lib/writer.js';
import { parseIgnoreDirectives, isIgnored } from '../lib/ignore.js';
import { format } from '../lib/formatter.js';
import { occurrenceId, canonicalPath } from '../lib/identity.js';
import { applyPatches, planUsesPatches, readVersionComment } from '../lib/patcher.js';
import { resolveTargets } from '../lib/targets.js';

const SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * @typedef {object} UpgradeChange
 * @property {string} id
 * @property {string} file
 * @property {string} action
 * @property {string} fromRef
 * @property {string|null} fromVersion
 * @property {string} toTag
 * @property {string} toSha
 * @property {'major'|'minor'|'patch'|'unknown'} level
 * @property {number} line
 */

/**
 * @param {object} opts
 * @param {string} [opts.cwd]
 * @param {string[]} [opts.workflows]
 * @param {boolean} [opts.dryRun]
 * @param {string} [opts.token]
 * @param {'major'|'minor'|'patch'} [opts.mode]
 * @param {string} [opts.fix]
 * @param {number} [opts.minAgeDays]   - skip tags newer than this many days
 * @returns {Promise<{changes: UpgradeChange[], errors: object[], skipped: object[], status: 'OK'|'FAIL'}>}
 */
export async function upgrade({
  cwd = process.cwd(),
  workflows,
  dryRun = true,
  token,
  mode = 'minor',
  fix,
  minAgeDays = 7,
} = {}) {
  const files = await resolveTargets({ workflows, cwd });
  const tok = resolveToken(token);
  /** @type {UpgradeChange[]} */
  const changes = [];
  const errors = [];
  /** @type {object[]} */
  const skipped = [];
  const cooldownMs = Math.max(minAgeDays, 0) * 86_400_000;
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

    const ignore = parseIgnoreDirectives(source);
    const planned = [];
    for (const { ref } of collectUses(doc)) {
      if (ref.kind !== 'external' && ref.kind !== 'reusable-workflow') continue;
      if (isIgnored(ignore, ref.line, 'unpinned-action')) continue;
      const inlineVersion = readVersionComment(source, ref);
      const currentVersion = ref.ref && SHA_RE.test(ref.ref) ? inlineVersion : ref.ref;
      if (!currentVersion) continue;
      const id = occurrenceId({
        kind: 'upgrade',
        file,
        cwd,
        line: ref.line,
        start: ref.start,
        subject: ref.raw,
      });
      if (fix && fix !== id) continue;
      if (fix === id) matchedFix = true;

      let tags;
      try {
        tags = await listTags({ owner: ref.owner, repo: ref.repo, token: tok, cwd });
      } catch (err) {
        errors.push({ file, action: ref.raw, error: String(err.message ?? err) });
        continue;
      }
      const latest = await pickAgedTag({
        tags,
        currentRef: currentVersion,
        mode,
        cooldownMs,
        owner: ref.owner,
        repo: ref.repo,
        token: tok,
        cwd,
        skipped,
        errors,
        file,
        ref,
      });
      if (!latest) continue;
      if (latest.name === currentVersion) continue;
      const level = bumpLevel(currentVersion, latest.name);
      let resolved;
      try {
        resolved = await resolveRefToSha({
          owner: ref.owner,
          repo: ref.repo,
          ref: latest.name,
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
      } catch (err) {
        errors.push({ file, action: ref.raw, error: String(err.message ?? err) });
        continue;
      }
      planned.push({ id, ref, latest, sha: resolved.sha, level, currentVersion });
    }

    const patches = [];
    const fileChanges = [];
    for (const { id, ref, latest, sha, level, currentVersion } of planned) {
      const change = {
        id,
        file,
        action: `${ref.owner}/${ref.repo}`,
        fromRef: ref.ref,
        fromVersion: currentVersion,
        toTag: latest.name,
        toSha: sha,
        level,
        line: ref.line,
      };
      patches.push(...planUsesPatches(source, ref, sha, latest.name));
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
  return { changes, errors, skipped, status: errors.length === 0 ? 'OK' : 'FAIL' };
}

/**
 * Walk candidate tags newest-first and return the first whose commit is older
 * than the cooldown threshold. Skipped candidates are recorded.
 */
async function pickAgedTag({
  tags,
  currentRef,
  mode,
  cooldownMs,
  owner,
  repo,
  token,
  cwd,
  skipped,
  errors,
  file,
  ref,
}) {
  if (cooldownMs <= 0) {
    return pickLatestTag({ tags, currentRef, mode });
  }
  const remaining = [...tags];
  const cutoff = Date.now() - cooldownMs;
  for (;;) {
    const candidate = pickLatestTag({ tags: remaining, currentRef, mode });
    if (!candidate) return null;
    let evidence;
    try {
      evidence = await getTagAgeEvidence({
        owner,
        repo,
        tag: candidate.name,
        sha: candidate.sha,
        token,
        cwd,
      });
    } catch (err) {
      errors.push({
        file,
        action: ref.raw,
        error: String(err.message ?? err),
      });
      return null;
    }
    const { dateMs, source: ageSource } = evidence;
    if (dateMs <= cutoff) return candidate;
    skipped.push({
      file,
      action: `${ref.owner}/${ref.repo}`,
      tag: candidate.name,
      reason: 'cooldown',
      ageDays: Math.round((Date.now() - dateMs) / 86_400_000),
      ageSource,
    });
    const idx = remaining.findIndex(t => t.name === candidate.name);
    if (idx === -1) return null;
    remaining.splice(idx, 1);
  }
}

function bumpLevel(from, to) {
  const a = semver.coerce(from);
  const b = semver.coerce(to);
  if (!a || !b) return 'unknown';
  if (a.major !== b.major) return 'major';
  if (a.minor !== b.minor) return 'minor';
  return 'patch';
}

/**
 * @param {Awaited<ReturnType<typeof upgrade>>} result
 * @param {{format: 'toon'|'json'|'text', dryRun: boolean, mode: string, cwd?: string}} opts
 */
export function renderUpgrade(result, opts) {
  const cwd = opts.cwd ?? process.cwd();
  if (opts.format === 'json') {
    return format('json', [], {
      status: result.status,
      json: {
        schemaVersion: '1.0',
        dryRun: opts.dryRun,
        mode: opts.mode,
        changes: result.changes.map(c => ({ ...c, file: rel(c.file, cwd) })),
        skipped: (result.skipped ?? []).map(s => ({ ...s, file: rel(s.file ?? '', cwd) })),
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
      label: 'UPGRADE',
      fields: {
        id: c.id,
        file: rel(c.file, cwd),
        line: c.line,
        action: c.action,
        from: c.fromVersion ?? c.fromRef,
        to: c.toTag,
        sha: c.toSha,
        level: c.level,
        applied: !opts.dryRun,
      },
    });
  }
  for (const s of result.skipped ?? []) {
    records.push({
      label: 'SKIP',
      fields: {
        file: rel(s.file ?? '', cwd),
        action: s.action,
        tag: s.tag,
        reason: s.reason,
        age_days: s.ageDays,
        age_source: s.ageSource,
      },
    });
  }
  for (const e of result.errors) {
    records.push({ label: 'ERROR', fields: { file: rel(e.file ?? '', cwd), action: e.action ?? '', msg: e.error } });
  }
  records.push({ label: 'SUMMARY', fields: { changes: result.changes.length, skipped: (result.skipped ?? []).length, errors: result.errors.length, mode: opts.mode, dry_run: opts.dryRun } });
  return format(opts.format, records, { status: result.status });
}

function rel(p, cwd) {
  return p ? canonicalPath(p, cwd) : p;
}
