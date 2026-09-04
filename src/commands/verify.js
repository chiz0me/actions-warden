import { readFile } from 'node:fs/promises';
import { parseWorkflowSource, collectUses } from '../lib/parser.js';
import { resolveTargets } from '../lib/targets.js';
import {
  resolveRefToSha,
  resolveToken,
  verifyCommitInRepo,
} from '../lib/resolver.js';
import { readVersionComment } from '../lib/patcher.js';
import { occurrenceId, canonicalPath } from '../lib/identity.js';
import { format } from '../lib/formatter.js';
import { mapLimit } from '../lib/concurrency.js';

const SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * Verify that external action references are full repository-owned commit
 * SHAs and that optional actions-warden version metadata resolves to the same
 * commit.
 *
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @param {string[]} [options.workflows]
 * @param {string} [options.token]
 * @returns {Promise<{files: string[], checks: object[], warnings: object[], errors: object[], status: 'OK'|'FAIL'}>}
 */
export async function verify({ cwd = process.cwd(), workflows, token } = {}) {
  const files = await resolveTargets({ workflows, cwd });
  const resolvedToken = resolveToken(token);
  const checks = [];
  const warnings = [];
  const errors = [];

  for (const file of files) {
    let source;
    let workflow;
    try {
      source = await readFile(file, 'utf8');
      workflow = parseWorkflowSource(source, file);
    } catch (error) {
      errors.push({ file, error: String(error.message ?? error) });
      continue;
    }

    const refs = collectUses(workflow)
      .map(item => item.ref)
      .filter(ref => ref.kind === 'external' || ref.kind === 'reusable-workflow');
    const results = await mapLimit(refs, 4, async ref => {
      const id = occurrenceId({
        kind: 'verify',
        file,
        cwd,
        line: ref.line,
        start: ref.start,
        subject: ref.raw,
      });
      if (!ref.ref || !SHA_RE.test(ref.ref)) {
        return { type: 'error', value: {
          id,
          file,
          line: ref.line,
          action: ref.raw,
          error: 'reference is not pinned to a full commit SHA',
        } };
      }

      try {
        await verifyCommitInRepo({
          owner: ref.owner,
          repo: ref.repo,
          sha: ref.ref,
          token: resolvedToken,
          cwd,
        });
        const version = readVersionComment(source, ref);
        if (!version) {
          const warning = {
            id,
            file,
            line: ref.line,
            action: ref.raw,
            warning: 'pinned SHA has no actions-warden-ref version metadata',
          };
          return {
            type: 'warning',
            value: warning,
            check: { id, file, line: ref.line, action: ref.raw, sha: ref.ref },
          };
        }
        const expected = await resolveRefToSha({
          owner: ref.owner,
          repo: ref.repo,
          ref: version,
          token: resolvedToken,
          cwd,
        });
        if (expected.sha.toLowerCase() !== ref.ref.toLowerCase()) {
          throw new Error(`version metadata ${version} resolves to ${expected.sha}, not ${ref.ref}`);
        }
        return { type: 'check', value: {
          id,
          file,
          line: ref.line,
          action: `${ref.owner}/${ref.repo}${ref.subpath ? `/${ref.subpath}` : ''}`,
          version,
          sha: ref.ref.toLowerCase(),
        } };
      } catch (error) {
        return { type: 'error', value: {
          id,
          file,
          line: ref.line,
          action: ref.raw,
          error: String(error.message ?? error),
        } };
      }
    });
    for (const result of results) {
      if (result.type === 'error') errors.push(result.value);
      if (result.type === 'warning') {
        warnings.push(result.value);
        checks.push(result.check);
      }
      if (result.type === 'check') checks.push(result.value);
    }
  }

  return {
    files,
    checks,
    warnings,
    errors,
    status: errors.length === 0 ? 'OK' : 'FAIL',
  };
}

/**
 * Render a verification result in a supported public output format.
 *
 * @param {Awaited<ReturnType<typeof verify>>} result
 * @param {{format: 'toon'|'json'|'text'|'csv'|'sarif'|'html', cwd?: string}} options
 * @returns {string}
 */
export function renderVerify(result, { format: outputFormat, cwd = process.cwd() }) {
  if (outputFormat === 'json') {
    return format('json', [], {
      status: result.status,
      json: {
        schemaVersion: '1.0',
        files: result.files.map(file => canonicalPath(file, cwd)),
        checks: result.checks.map(check => ({ ...check, file: canonicalPath(check.file, cwd) })),
        warnings: result.warnings.map(warning => ({
          ...warning,
          file: canonicalPath(warning.file, cwd),
        })),
        errors: result.errors.map(error => ({
          ...error,
          file: error.file ? canonicalPath(error.file, cwd) : undefined,
        })),
        status: result.status,
      },
    });
  }
  const records = [];
  for (const check of result.checks) {
    records.push({
      label: 'VERIFIED',
      fields: {
        id: check.id,
        file: canonicalPath(check.file, cwd),
        line: check.line,
        action: check.action,
        version: check.version,
        sha: check.sha,
      },
    });
  }
  for (const warning of result.warnings) {
    records.push({
      label: 'WARNING',
      fields: {
        id: warning.id,
        file: canonicalPath(warning.file, cwd),
        line: warning.line,
        action: warning.action,
        msg: warning.warning,
      },
    });
  }
  for (const error of result.errors) {
    records.push({
      label: 'ERROR',
      fields: {
        id: error.id,
        file: error.file ? canonicalPath(error.file, cwd) : undefined,
        line: error.line,
        action: error.action,
        msg: error.error,
      },
    });
  }
  records.push({
    label: 'SUMMARY',
    fields: {
      verified: result.checks.length,
      warnings: result.warnings.length,
      errors: result.errors.length,
    },
  });
  return format(outputFormat, records, {
    status: result.status,
    title: 'Pinned action verification',
  });
}
