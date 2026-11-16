import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderOrganizationScan, scanOrganization } from '../src/commands/org-scan.js';
import { format } from '../src/lib/formatter.js';
import {
  redact,
  redactDeep,
  redactField,
  redactIdentifier,
} from '../src/lib/redact.js';

const COMMIT_SHA = 'a'.repeat(40);
const LONG_REPOSITORY = 'acme-corporation-engineering/payments-platform-service-gateway-v2';
const LONG_PATH = '.github/workflows/build-and-deploy-production-services-to-kubernetes.yml';
const LONG_URL = `https://github.com/${LONG_REPOSITORY}`;
const LONG_ACTION = 'some-organization/some-very-long-action-repository-name/setup@v1.2.3';
const GITHUB_PAT = `ghp_${'A1b2C3d4E5'.repeat(4)}`;
const AWS_SECRET = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
const RANDOM_BLOB = 'Zx9Qw8Er7Ty6Ui5Op4As3Df2Gh1Jk0LmNb';

describe('readable identifier fields', () => {
  it('keeps long name-like values readable in identifier fields', () => {
    for (const [key, value] of [
      ['repository', LONG_REPOSITORY],
      ['repo', LONG_REPOSITORY],
      ['fullName', LONG_REPOSITORY],
      ['htmlUrl', LONG_URL],
      ['path', LONG_PATH],
      ['file', `${LONG_REPOSITORY}/${LONG_PATH}`],
      ['workflow', LONG_PATH],
      ['action', LONG_ACTION],
      ['uri', LONG_PATH],
      ['repositoryUri', LONG_URL],
      ['path', 'services/k8s-cluster-config-prod-eu-west-1-manifests/ec2-s3-oauth2-sha256.yml'],
    ]) {
      expect(redactField(key, value), `${key}=${value}`).toBe(value);
    }
  });

  it('still redacts the same long values outside identifier fields', () => {
    expect(redact(LONG_REPOSITORY)).toContain('<redacted>');
    expect(redactField('explain', LONG_PATH)).toContain('<redacted>');
    expect(redactField('msg', LONG_URL)).toContain('<redacted>');
    expect(redactField(undefined, LONG_PATH)).toContain('<redacted>');
  });

  it('redacts random-looking runs even in identifier fields', () => {
    const hexName = 'b3f9c2e1b8d74f60a3f9c2e1b8d74f60';
    for (const [key, value] of [
      ['path', `.github/workflows/${RANDOM_BLOB}.yml`],
      ['path', `deploy/${AWS_SECRET}.yml`],
      ['repository', `acme/${AWS_SECRET}`],
      ['file', `ci/${hexName}.yml`],
      ['file', 'ci/123e4567-e89b-12d3-a456-426614174000-123e4567-e89b-12d3.yml'],
      ['path', '.github/workflows/aGVsbG8gd29ybGQgdGhpcyBpcyBhIGJhc2U2NCBzZWNyZXQ=.yml'],
      ['path', `x/${'abcdefghijklmnopqrstuvwxyzabcdefghijkl'}`],
    ]) {
      expect(redactField(key, value), `${key}=${value}`).toContain('<redacted>');
    }
    expect(redactField('path', `.github/workflows/${RANDOM_BLOB}.yml`)).not.toContain(RANDOM_BLOB);
    expect(redactField('repository', `acme/${AWS_SECRET}`)).not.toContain('bPxRfiCY');
  });

  it('still redacts credential patterns embedded in identifier fields', () => {
    const cases = [
      ['path', `.github/workflows/${GITHUB_PAT}.yml`, GITHUB_PAT],
      ['htmlUrl', `https://github.com/acme/${GITHUB_PAT}`, GITHUB_PAT],
      ['action', `org/repo/github_pat_${'Ab1_Cd2'.repeat(6)}@v1`, 'github_pat_'],
      ['path', '.github/workflows/AKIAABCDEFGHIJKLMNOP.yml', 'AKIAABCDEFGHIJKLMNOP'],
      ['file', 'acme/app/deploy.yml?token=Zx9Qw8Er7Ty6Ui5Op4As3Df2Gh1Jk0Lm', 'Zx9Qw8Er7Ty6'],
    ];
    for (const [key, value, leaked] of cases) {
      const output = redactField(key, value);
      expect(output, `${key}=${value}`).toContain('<redacted>');
      expect(output).not.toContain(leaked);
    }
  });

  it('keeps source links readable only when every segment is a SHA or reads like words', () => {
    const sha = '0123456789abcdef0123456789abcdef01234567';
    const base = `https://github.com/${LONG_REPOSITORY}/blob/${sha}`;
    const readable = [
      `${base}/${LONG_PATH}#L12`,
      `${base}/services/payments/${'a'.repeat(20)}-handler-deploy-production.yml`,
      `https://github.com/${LONG_REPOSITORY}/blob/main/${LONG_PATH}`,
      `${base}/.github/workflows/deploy%20to%20production-environment-service.yml#L3`,
    ];
    for (const link of readable) expect(redact(link), link).toBe(link);

    const secretLike = [
      `${base}/.github/workflows/${RANDOM_BLOB}.yml#L1`,
      `https://github.com/acme/app/blob/main/config/${AWS_SECRET}`,
      `${base}/${`b3f9c2e1b8d74f60a3f9c2e1b8d74f60`}.yml`,
    ];
    for (const link of secretLike) {
      const output = redact(link);
      expect(output, link).toContain('<redacted>');
      expect(output).not.toContain('Zx9Qw8Er7Ty6');
      expect(output).not.toContain('bPxRfiCY');
      expect(output).not.toContain('b3f9c2e1b8d74f60');
    }
  });

  it('exposes the same behavior through redactIdentifier', () => {
    expect(redactIdentifier(LONG_REPOSITORY)).toBe(LONG_REPOSITORY);
    expect(redactIdentifier(`${LONG_REPOSITORY}/${RANDOM_BLOB}`)).toContain('<redacted>');
    expect(redactIdentifier(null)).toBe('');
  });

  it('applies by field name when redacting nested values', () => {
    const redacted = redactDeep({
      repository: { fullName: LONG_REPOSITORY, htmlUrl: LONG_URL },
      findings: [{ path: LONG_PATH, explain: LONG_PATH, apiToken: LONG_PATH }],
      repositories: [LONG_REPOSITORY],
    });
    expect(redacted.repository).toStrictEqual({ fullName: LONG_REPOSITORY, htmlUrl: LONG_URL });
    expect(redacted.findings[0].path).toBe(LONG_PATH);
    expect(redacted.findings[0].explain).toContain('<redacted>');
    expect(redacted.findings[0].apiToken).toBe('<redacted>');
    expect(redacted.repositories[0]).toContain('<redacted>');
  });
});

describe('renderers keep identifier fields readable', () => {
  const records = [
    {
      label: 'FINDING',
      fields: {
        id: 'f1',
        type: 'script-injection',
        sev: 'high',
        repo: LONG_REPOSITORY,
        file: `${LONG_REPOSITORY}/${LONG_PATH}`,
        path: LONG_PATH,
        action: LONG_ACTION,
        url: `${LONG_URL}/blob/main/${LONG_PATH}`,
        explain: LONG_PATH,
      },
    },
    {
      label: 'FINDING',
      fields: { id: 'f2', type: 'script-injection', sev: 'high', path: `${RANDOM_BLOB}.yml` },
    },
  ];

  it.each(['toon', 'text', 'csv', 'html'])('%s output', outputFormat => {
    const output = format(outputFormat, records, { status: 'FAIL' });
    expect(output).toContain(LONG_REPOSITORY);
    expect(output).toContain(LONG_PATH);
    expect(output).toContain(LONG_ACTION);
    expect(output).not.toContain(RANDOM_BLOB);
    expect(output).toMatch(outputFormat === 'html' ? /&lt;redacted&gt;/ : /<redacted>/);
  });

  it('keeps explain redacted in every format', () => {
    for (const outputFormat of ['toon', 'text', 'csv']) {
      const output = format(outputFormat, [{ label: 'FINDING', fields: { explain: LONG_PATH } }]);
      expect(output, outputFormat).not.toContain(LONG_PATH);
    }
  });

  it('keeps SARIF locations and repository URIs readable', () => {
    const sarifRecords = [
      { label: 'RULE', fields: { id: 'script-injection', severity: 'high', description: 'x' } },
      {
        label: 'REPOSITORY',
        fields: { repo: LONG_REPOSITORY, branch: 'main', commit: COMMIT_SHA, url: LONG_URL },
      },
      {
        label: 'FINDING',
        fields: {
          id: 'f1',
          type: 'script-injection',
          sev: 'high',
          repo: LONG_REPOSITORY,
          path: LONG_PATH,
          line: 3,
        },
      },
    ];
    const run = JSON.parse(format('sarif', sarifRecords, { status: 'FAIL' })).runs[0];
    expect(run.versionControlProvenance[0].repositoryUri).toBe(LONG_URL);
    expect(run.results[0].locations[0].physicalLocation.artifactLocation.uri).toBe(LONG_PATH);
  });
});

describe('organization scan of long repository and file names', () => {
  const owner = 'acme-corporation-engineering';
  const repository = 'payments-platform-service-gateway-v2';
  const secretLikePath = `.github/workflows/${RANDOM_BLOB}.yml`;
  const workflow = [
    'name: ci',
    'on:',
    '  issues:',
    '    types: [opened]',
    'jobs:',
    '  build:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - run: echo "${{ github.event.issue.title }}"',
    '',
  ].join('\n');
  const files = [
    { path: LONG_PATH, content: workflow },
    { path: secretLikePath, content: 'name: x\non: workflow_dispatch\npermissions: {}\njobs: {}\n' },
  ];
  let activeFiles = files;
  let cwd;
  let previousCacheDir;
  let result;

  beforeAll(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'aw-redact-identifiers-'));
    previousCacheDir = process.env.ACTIONS_WARDEN_CACHE_DIR;
    process.env.ACTIONS_WARDEN_CACHE_DIR = join(cwd, 'cache');
    vi.stubGlobal('fetch', async url => respond(String(url)));
    result = await scanOrganization({ organization: owner, cwd, token: 'test-token' });
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    if (previousCacheDir === undefined) delete process.env.ACTIONS_WARDEN_CACHE_DIR;
    else process.env.ACTIONS_WARDEN_CACHE_DIR = previousCacheDir;
    await rm(cwd, { recursive: true, force: true });
  });

  it.each(['json', 'toon', 'text', 'csv', 'sarif', 'html'])(
    'renders readable names and no random file name in %s',
    outputFormat => {
      const output = renderOrganizationScan(result, { format: outputFormat, cwd });
      expect(output).toContain(`${owner}/${repository}`);
      expect(output).toContain(LONG_PATH);
      expect(output).not.toContain(RANDOM_BLOB);
      expect(output).toMatch(/<redacted>|&lt;redacted&gt;/);
      expect(output).not.toContain(`${LONG_PATH.slice(0, 20)}<redacted>`);
    },
  );

  it('keeps the repository URL and permalinks readable in the JSON report', () => {
    const report = JSON.parse(renderOrganizationScan(result, { format: 'json', cwd }));
    const [entry] = report.repositories;
    expect(entry.repository.htmlUrl).toBe(`https://github.com/${owner}/${repository}`);
    expect(entry.fileDetails.map(detail => detail.path)).toContain(LONG_PATH);
    expect(entry.fileDetails.find(detail => detail.path === LONG_PATH).permalink)
      .toBe(`https://github.com/${owner}/${repository}/blob/${COMMIT_SHA}/${LONG_PATH}`);
    const finding = entry.findings.find(candidate => candidate.path === LONG_PATH);
    expect(finding.permalink).toContain(`/blob/${COMMIT_SHA}/${LONG_PATH}`);
    expect(entry.findings.map(candidate => candidate.path)).not.toContain(secretLikePath);
  });

  it('resumes a checkpoint written for long file names with an identical report', async () => {
    activeFiles = files.filter(file => file.path === LONG_PATH);
    try {
      const checkpointPath = join(cwd, 'long-names-checkpoint.json');
      const options = { organization: owner, cwd, token: 'test-token', checkpointPath };
      const first = await scanOrganization(options);
      const events = [];
      const resumed = await scanOrganization({
        ...options,
        resume: true,
        onProgress: event => events.push(event),
      });
      expect(events.filter(event => event.type === 'repository-completed' && event.reused))
        .toHaveLength(1);
      expect(renderOrganizationScan(resumed, { format: 'json', cwd }))
        .toBe(renderOrganizationScan(first, { format: 'json', cwd }));
      expect(resumed.repositories[0].fileDetails.map(detail => detail.path)).toContain(LONG_PATH);
    } finally {
      activeFiles = files;
    }
  });

  it('refuses to resume a checkpoint that stored a redacted secret-like file name', async () => {
    const checkpointPath = join(cwd, 'secret-name-checkpoint.json');
    const options = { organization: owner, cwd, token: 'test-token', checkpointPath };
    await scanOrganization(options);
    await expect(scanOrganization({ ...options, resume: true }))
      .rejects.toThrow('invalid checkpoint workflow path');
  });

  function respond(url) {
    if (url.includes(`/orgs/${owner}/repos?`)) return json([repositoryRecord()]);
    const match = new RegExp(`/repos/${owner}/${repository}/(commits/heads|git/trees|git/blobs)/([^?]+)`)
      .exec(url);
    if (!match) return json({}, 404);
    const treeSha = createHash('sha1')
      .update(activeFiles.map(file => file.path).join('\n'))
      .digest('hex');
    if (match[1] === 'commits/heads') {
      return json({ sha: COMMIT_SHA, commit: { tree: { sha: treeSha } } });
    }
    if (match[1] === 'git/trees') {
      return json({
        sha: treeSha,
        truncated: false,
        tree: activeFiles.map(file => ({
          path: file.path,
          type: 'blob',
          sha: blobSha(file.content),
          size: Buffer.byteLength(file.content),
        })),
      });
    }
    const file = activeFiles.find(candidate => blobSha(candidate.content) === match[2]);
    if (!file) return json({}, 404);
    return json({
      sha: match[2],
      encoding: 'base64',
      size: Buffer.byteLength(file.content),
      content: Buffer.from(file.content).toString('base64'),
    });
  }

  function repositoryRecord() {
    return {
      name: repository,
      full_name: `${owner}/${repository}`,
      owner: { login: owner },
      default_branch: 'main',
      visibility: 'public',
      private: false,
      fork: false,
      archived: false,
      disabled: false,
      html_url: `https://github.com/${owner}/${repository}`,
    };
  }
});

function blobSha(content) {
  return createHash('sha1')
    .update(`blob ${Buffer.byteLength(content)}\0`)
    .update(content)
    .digest('hex');
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status });
}
