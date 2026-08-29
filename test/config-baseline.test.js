import { afterEach, describe, expect, it } from 'vitest';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { audit } from '../src/commands/audit.js';
import { serializeBaseline } from '../src/lib/baseline.js';

const temporary = [];

async function repository(workflow, config) {
  const cwd = await mkdtemp(join(tmpdir(), 'aw-policy-'));
  temporary.push(cwd);
  await mkdir(join(cwd, '.github', 'workflows'), { recursive: true });
  await writeFile(join(cwd, '.github', 'workflows', 'ci.yml'), workflow);
  if (config) await writeFile(join(cwd, '.actions-warden.yml'), config);
  return cwd;
}

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => (
    rm(path, { recursive: true, force: true })
  )));
});

describe('repository policy', () => {
  it('supports rule disabling and severity overrides', async () => {
    const cwd = await repository(
      'on: push\npermissions: {}\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: octo/action@v1\n',
      'version: 1\nrules:\n  unpinned-action:\n    severity: medium\n',
    );
    const high = await audit({ cwd, severity: 'high' });
    expect(high.status).toBe('OK');
    const all = await audit({ cwd });
    expect(all.findings).toHaveLength(1);
    expect(all.findings[0].severity).toBe('medium');

    await writeFile(join(cwd, '.actions-warden.yml'), [
      'version: 1',
      'rules:',
      '  unpinned-action:',
      '    enabled: false',
      '',
    ].join('\n'));
    expect((await audit({ cwd })).status).toBe('OK');
    expect((await audit({ cwd, configPath: false })).status).toBe('FAIL');
  });

  it('rejects unknown configuration keys and rule IDs', async () => {
    const workflow = 'on: push\npermissions: {}\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps: []\n';
    const unknownKey = await repository(workflow, 'version: 1\nseverty: high\n');
    await expect(audit({ cwd: unknownKey })).rejects.toThrow(/unknown config key/);

    const unknownRule = await repository(
      workflow,
      'version: 1\nrules:\n  imaginary-rule:\n    enabled: false\n',
    );
    await expect(audit({ cwd: unknownRule })).rejects.toThrow(/unknown rule/);
  });

  it('excludes configured paths before scanning', async () => {
    const cwd = await repository(
      'on: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: octo/action@v1\n',
      'version: 1\nignore-paths:\n  - .github/workflows/ci.yml\n',
    );
    const result = await audit({ cwd });
    expect(result.files).toEqual([]);
    expect(result.status).toBe('OK');
  });
});

describe('finding baselines', () => {
  it('suppresses matching stable IDs while reporting total counts', async () => {
    const cwd = await repository(
      'on: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: octo/action@v1\n',
    );
    const initial = await audit({ cwd, explain: true });
    const baselinePath = join(cwd, '.actions-warden-baseline.json');
    await writeFile(baselinePath, serializeBaseline(initial.allFindings, cwd));

    const result = await audit({ cwd, baseline: '.actions-warden-baseline.json' });
    expect(result.status).toBe('OK');
    expect(result.findings).toEqual([]);
    expect(result.summary.totalFindings).toBe(initial.allFindings.length);
    expect(result.summary.suppressed).toBe(initial.allFindings.length);
    const saved = JSON.parse(await readFile(baselinePath, 'utf8'));
    expect(new Set(saved.findings.map(finding => finding.id)))
      .toEqual(new Set(initial.allFindings.map(finding => finding.id)));
    expect(saved.findings.every(finding => finding.fingerprint)).toBe(true);

    const sourcePath = join(cwd, '.github', 'workflows', 'ci.yml');
    const source = await readFile(sourcePath, 'utf8');
    await writeFile(sourcePath, `name: moved-lines\n${source}`);
    const moved = await audit({ cwd, baseline: '.actions-warden-baseline.json' });
    expect(moved.status).toBe('OK');
    expect(moved.summary.suppressed).toBe(initial.allFindings.length);
  });

  it('never suppresses parser failures', async () => {
    const cwd = await repository('jobs: [\n');
    const initial = await audit({ cwd, explain: true });
    expect(initial.findings[0].ruleId).toBe('parse-error');
    await writeFile(join(cwd, 'baseline.json'), JSON.stringify({
      schemaVersion: '1.0',
      findings: [{ id: initial.findings[0].id }],
    }));
    const result = await audit({ cwd, baseline: 'baseline.json' });
    expect(result.status).toBe('FAIL');
    expect(result.findings[0].ruleId).toBe('parse-error');
    expect(JSON.parse(serializeBaseline(initial.allFindings, cwd)).findings).toEqual([]);
  });

  it('uses occurrence ordinals so one accepted duplicate does not hide another', async () => {
    const cwd = await repository(
      'on: push\npermissions: {}\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: octo/action@v1\n      - uses: octo/action@v1\n',
    );
    const initial = await audit({ cwd, explain: true });
    expect(initial.findings).toHaveLength(2);
    await writeFile(
      join(cwd, 'baseline.json'),
      serializeBaseline([initial.allFindings[0]], cwd),
    );
    const result = await audit({ cwd, baseline: 'baseline.json' });
    expect(result.findings).toHaveLength(1);
    expect(result.summary.suppressed).toBe(1);
  });
});
