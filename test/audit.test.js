import { describe, it, expect } from 'vitest';
import { audit, renderAudit } from '../src/commands/audit.js';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const cwd = resolve(import.meta.dirname, '..');

describe('audit', () => {
  it('returns FAIL on the dangerous fixture', async () => {
    const result = await audit({ cwd, workflows: ['test/fixtures/dangerous.yml'] });
    expect(result.status).toBe('FAIL');
    expect(result.summary.critical).toBeGreaterThanOrEqual(2);
    expect(result.summary.high).toBeGreaterThanOrEqual(1);
  });

  it('returns OK on the clean fixture', async () => {
    const result = await audit({ cwd, workflows: ['test/fixtures/clean.yml'] });
    expect(result.status).toBe('OK');
    expect(result.summary.findings).toBe(0);
  });

  it('filters by minimum severity', async () => {
    const all = await audit({ cwd, workflows: ['test/fixtures/dangerous.yml'] });
    const onlyCrit = await audit({ cwd, workflows: ['test/fixtures/dangerous.yml'], severity: 'critical' });
    expect(onlyCrit.summary.findings).toBeLessThan(all.summary.findings);
    expect(onlyCrit.findings.every(f => f.severity === 'critical')).toBe(true);
  });

  it('retains parse errors above the requested severity threshold', async () => {
    const temp = await mkdtemp(join(tmpdir(), 'aw-audit-'));
    const file = join(temp, 'broken.yml');
    await writeFile(file, 'jobs:\n  broken: [\n');
    try {
      const result = await audit({
        cwd: temp,
        workflows: ['broken.yml'],
        severity: 'critical',
      });
      expect(result.status).toBe('FAIL');
      expect(result.findings).toEqual([
        expect.objectContaining({ ruleId: 'parse-error', severity: 'high' }),
      ]);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it('rejects an explicit target that does not match anything', async () => {
    await expect(audit({ cwd, workflows: ['does-not-exist.yml'] }))
      .rejects.toThrow(/no workflows matched/);
  });
});

describe('renderAudit', () => {
  it('emits TOON with STATUS trailer', async () => {
    const result = await audit({ cwd, workflows: ['test/fixtures/dangerous.yml'] });
    const out = renderAudit(result, { format: 'toon', cwd });
    expect(out).toContain('FINDING:');
    expect(out).toContain('SUMMARY:');
    expect(out.trim()).toMatch(/STATUS: FAIL$/);
  });

  it('emits valid JSON', async () => {
    const result = await audit({ cwd, workflows: ['test/fixtures/dangerous.yml'] });
    const out = renderAudit(result, { format: 'json', cwd });
    const parsed = JSON.parse(out);
    expect(parsed.status).toBe('FAIL');
    expect(parsed.findings.length).toBeGreaterThan(0);
  });

  it('includes explain when requested', async () => {
    const result = await audit({ cwd, workflows: ['test/fixtures/dangerous.yml'], explain: true });
    const out = renderAudit(result, { format: 'toon', explain: true, cwd });
    expect(out).toContain('explain=');
  });

  it('emits SARIF 2.1.0 with source locations', async () => {
    const result = await audit({
      cwd,
      workflows: ['test/fixtures/dangerous.yml'],
      explain: true,
    });
    const out = renderAudit(result, { format: 'sarif', explain: true, cwd });
    const sarif = JSON.parse(out);
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs[0].results.length).toBeGreaterThan(0);
    expect(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri)
      .toBe('test/fixtures/dangerous.yml');
    const fingerprints = sarif.runs[0].results[0].partialFingerprints;
    expect(fingerprints['actions-warden/semantic']).toMatch(/^[0-9a-f]{16}$/);
    expect(fingerprints.primaryLocationLineHash)
      .toBe(`${fingerprints['actions-warden/semantic']}:1`);
  });
});
