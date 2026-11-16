import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { renderOrganizationScan, scanOrganization } from '../src/commands/org-scan.js';
import { buildOrganizationReport } from '../src/lib/org-report.js';
import { writeOrganizationReportDirectory } from '../src/lib/org-report-directory.js';
import { createGoldenFetch, GOLDEN_ORGANIZATION } from './fixtures/org-golden-fixture.js';

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, '..');
const GOLDEN_DIRECTORY = './fixtures/org-golden';
const FORMATS = [
  ['json', 'report.json'],
  ['toon', 'report.toon'],
  ['text', 'report.txt'],
  ['csv', 'report.csv'],
  ['sarif', 'report.sarif'],
  ['html', 'report.html'],
];

describe('organization report golden files', () => {
  let cwd;
  let previousCacheDir;
  let result;

  beforeAll(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'aw-org-golden-'));
    previousCacheDir = process.env.ACTIONS_WARDEN_CACHE_DIR;
    process.env.ACTIONS_WARDEN_CACHE_DIR = join(cwd, 'cache');
    vi.stubGlobal('fetch', createGoldenFetch());
    result = await scanOrganization({
      organization: GOLDEN_ORGANIZATION,
      cwd,
      token: 'golden-test-token',
    });
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    if (previousCacheDir === undefined) delete process.env.ACTIONS_WARDEN_CACHE_DIR;
    else process.env.ACTIONS_WARDEN_CACHE_DIR = previousCacheDir;
    await rm(cwd, { recursive: true, force: true });
  });

  it.each(FORMATS)('renders the %s report byte-for-byte', async (outputFormat, filename) => {
    const rendered = renderOrganizationScan(result, { format: outputFormat, cwd });
    await expect(rendered).toMatchFileSnapshot(`${GOLDEN_DIRECTORY}/${filename}`);
  });

  it('builds a document equal to the parsed JSON rendering', async () => {
    const report = buildOrganizationReport(result, { cwd });
    expect(report).toStrictEqual(
      JSON.parse(renderOrganizationScan(result, { format: 'json', cwd })),
    );
    const golden = await readFile(
      resolve(import.meta.dirname, 'fixtures/org-golden/report.json'),
      'utf8',
    );
    expect(report).toStrictEqual(JSON.parse(golden));
  });

  it('redacts credentials in the document exactly as the JSON rendering does', () => {
    const secret = `ghp_${'A1b2C3d4E5'.repeat(4)}`;
    const tainted = structuredClone(result);
    tainted.findings[0].fields.action = `actions/checkout@${secret}`;
    tainted.repositories[0].findings[0].fields.action = `actions/checkout@${secret}`;

    const report = buildOrganizationReport(tainted, { cwd });
    expect(JSON.stringify(report)).not.toContain(secret);
    expect(report.findings[0].fields.action).toBe('actions/checkout@<redacted>');
    expect(report).toStrictEqual(
      JSON.parse(renderOrganizationScan(tainted, { format: 'json', cwd })),
    );
  });

  it('renders identical bytes on a second render', () => {
    for (const [outputFormat] of FORMATS) {
      expect(renderOrganizationScan(result, { format: outputFormat, cwd }))
        .toBe(renderOrganizationScan(result, { format: outputFormat, cwd }));
    }
  });

  it('writes the report directory byte-for-byte', async () => {
    await writeOrganizationReportDirectory({ result, path: 'report-dir', cwd });
    const golden = `${GOLDEN_DIRECTORY}/report-dir`;
    const manifestText = await readFile(join(cwd, 'report-dir', 'manifest.json'), 'utf8');
    await expect(manifestText).toMatchFileSnapshot(`${golden}/manifest.json`);
    const manifest = JSON.parse(manifestText);

    const aggregate = await readFile(join(cwd, 'report-dir', manifest.report.path), 'utf8');
    await expect(aggregate).toMatchFileSnapshot(`${golden}/${manifest.report.path}`);
    expect(manifest.repositories.map(item => item.repository)).toEqual([
      'octo-org/app',
      'octo-org/broken',
      'octo-org/clean',
      'octo-org/empty',
    ]);
    for (const artifact of manifest.repositories) {
      const content = await readFile(join(cwd, 'report-dir', artifact.path), 'utf8');
      await expect(content).toMatchFileSnapshot(`${golden}/${artifact.path}`);
    }
  });
});

describe('organization scan CLI with findings', () => {
  it('writes a receipt and a saved report that contains findings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aw-cli-org-golden-'));
    const preload = pathToFileURL(
      resolve(repositoryRoot, 'test/fixtures/mock-org-golden-fetch.js'),
    ).href;
    const env = { ...process.env, NODE_OPTIONS: `--import=${preload}` };
    delete env.ACTIONS_WARDEN_CONTEXT;
    delete env.ACTIONS_WARDEN_MODE;
    try {
      const run = await runCli([
        resolve(repositoryRoot, 'src/cli.js'),
        'org-scan',
        GOLDEN_ORGANIZATION,
        '--cwd',
        root,
        '--ignore-config',
        '--progress',
        'none',
      ], { cwd: repositoryRoot, env });
      expect(run.code).toBe(1);

      const receipt = JSON.parse(run.stdout);
      expect(Object.keys(receipt).sort()).toEqual([
        'checkpoint',
        'command',
        'coverage',
        'kind',
        'organization',
        'report',
        'schemaVersion',
        'status',
        'summary',
      ]);
      expect(receipt).toMatchObject({
        schemaVersion: '1.0',
        kind: 'actions-warden-org-scan-receipt',
        command: 'org-scan',
        organization: GOLDEN_ORGANIZATION,
        status: 'FAIL',
        summary: {
          repositoriesScanned: 4,
          repositoriesWithWorkflows: 3,
          files: 4,
          findings: 4,
          critical: 1,
          high: 2,
          low: 1,
          errors: 1,
        },
        report: { format: 'json', layout: 'single' },
        checkpoint: { resumed: false, repositoriesReused: 0 },
        coverage: { complete: false, incompleteRepositories: 2 },
      });
      expect(receipt).not.toHaveProperty('findings');
      expect(receipt).not.toHaveProperty('repositories');

      const report = JSON.parse(await readFile(join(root, receipt.report.path), 'utf8'));
      expect(report.status).toBe('FAIL');
      expect(report.findings.map(finding => finding.ruleId).sort()).toEqual([
        'excessive-permissions',
        'parse-error',
        'script-injection',
        'unpinned-action',
      ]);
      expect(report.errors).toHaveLength(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function runCli(args, options) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, args, options);
    return { code: 0, stdout, stderr };
  } catch (error) {
    if (typeof error.code !== 'number') throw error;
    return { code: error.code, stdout: error.stdout, stderr: error.stderr };
  }
}
