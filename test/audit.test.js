import { describe, it, expect } from 'vitest';
import { audit, renderAudit } from '../src/commands/audit.js';
import { resolve } from 'node:path';

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
});
