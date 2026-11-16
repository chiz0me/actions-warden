import { createHash } from 'node:crypto';

export const GOLDEN_ORGANIZATION = 'octo-org';

const CI_WORKFLOW = [
  'name: ci',
  'on:',
  '  issues:',
  '    types: [opened]',
  'jobs:',
  '  build:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - name: greet',
  '        run: echo "${{ github.event.issue.title }}"',
  '',
].join('\n');

const CLEAN_WORKFLOW = [
  'name: lint',
  'on: push',
  'permissions:',
  '  contents: read',
  'jobs:',
  '  lint:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4.3.1',
  '      - run: npm run lint',
  '',
].join('\n');

const UNREADABLE_WORKFLOW = [
  'name: release',
  'on: workflow_dispatch',
  'permissions: {}',
  'jobs: {}',
  '',
].join('\n');

const INVALID_WORKFLOW = 'name: [unclosed\non: push\n';

const REPOSITORIES = [
  {
    name: 'app',
    treeSha: '1'.repeat(40),
    files: [
      { path: '.github/workflows/ci.yml', content: CI_WORKFLOW },
      { path: '.github/workflows/lint.yml', content: CLEAN_WORKFLOW },
      { path: '.github/workflows/release.yml', content: UNREADABLE_WORKFLOW, unreadable: true },
      { path: 'README.md', content: '# app\n' },
    ],
  },
  {
    name: 'broken',
    treeSha: '2'.repeat(40),
    files: [{ path: '.github/workflows/bad.yml', content: INVALID_WORKFLOW }],
  },
  {
    name: 'clean',
    treeSha: '3'.repeat(40),
    files: [{ path: '.github/workflows/build.yml', content: CLEAN_WORKFLOW }],
  },
  { name: 'empty', treeSha: null, files: [] },
];

/**
 * Create a `fetch` replacement serving the four-repository golden organization.
 *
 * @returns {(url: string | URL) => Promise<Response>}
 */
export function createGoldenFetch() {
  return async function goldenFetch(url) {
    const value = String(url);
    if (value.includes(`/orgs/${GOLDEN_ORGANIZATION}/repos?`)) {
      return jsonResponse(REPOSITORIES.map(repositoryRecord));
    }
    const match = new RegExp(
      `/repos/${GOLDEN_ORGANIZATION}/([^/]+)/git/(trees|blobs)/([^?]+)`,
    ).exec(value);
    const repository = REPOSITORIES.find(candidate => candidate.name === match?.[1]);
    if (!repository) return jsonResponse({}, 404);
    if (match[2] === 'trees') return treeResponse(repository);
    return blobResponse(repository, match[3]);
  };
}

function repositoryRecord({ name }) {
  return {
    name,
    full_name: `${GOLDEN_ORGANIZATION}/${name}`,
    owner: { login: GOLDEN_ORGANIZATION },
    default_branch: 'main',
    visibility: 'public',
    private: false,
    fork: false,
    archived: false,
    disabled: false,
    html_url: `https://github.com/${GOLDEN_ORGANIZATION}/${name}`,
  };
}

function treeResponse(repository) {
  if (repository.treeSha === null) {
    return jsonResponse({ message: 'Git Repository is empty.' }, 409);
  }
  return jsonResponse({
    sha: repository.treeSha,
    truncated: false,
    tree: [
      { path: '.github', type: 'tree', sha: '9'.repeat(40) },
      ...repository.files.map(file => ({
        path: file.path,
        type: 'blob',
        sha: blobSha(file.content),
        size: Buffer.byteLength(file.content),
      })),
    ],
  });
}

function blobResponse(repository, sha) {
  const file = repository.files.find(candidate => blobSha(candidate.content) === sha);
  if (!file || file.unreadable) return jsonResponse({ message: 'Not Found' }, 404);
  return jsonResponse({
    sha,
    encoding: 'base64',
    size: Buffer.byteLength(file.content),
    content: Buffer.from(file.content).toString('base64'),
  });
}

function blobSha(content) {
  return createHash('sha1')
    .update(`blob ${Buffer.byteLength(content)}\0`)
    .update(content)
    .digest('hex');
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status });
}
