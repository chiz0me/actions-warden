import { describe, it, expect } from 'vitest';
import { parseWorkflowSource } from '../src/lib/parser.js';
import * as unpinned from '../src/rules/unpinned-action.js';
import * as perms from '../src/rules/excessive-permissions.js';
import * as secrets from '../src/rules/secrets-in-env.js';
import * as injection from '../src/rules/script-injection.js';
import * as prTarget from '../src/rules/pull-request-target-checkout.js';
import * as unpinnedDocker from '../src/rules/unpinned-docker-action.js';
import * as unpinnedContainer from '../src/rules/unpinned-container-image.js';
import * as reusableSecrets from '../src/rules/reusable-workflow-secrets.js';
import * as selfHosted from '../src/rules/untrusted-self-hosted-runner.js';
import * as workflowRunArtifact from '../src/rules/workflow-run-artifact-execution.js';
import * as structure from '../src/rules/workflow-structure.js';

function parse(src) {
  return parseWorkflowSource(src, 'x.yml');
}

describe('unpinned-action', () => {
  it('flags tag-based refs', () => {
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n`);
    expect(unpinned.check(doc)).toHaveLength(1);
  });
  it('preserves action subpaths in remediation guidance', () => {
    const raw = 'octo/repo/actions/build@v1';
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: ${raw}\n`);
    expect(unpinned.check(doc)[0].explain).toContain(`\`${raw}\``);
    expect(unpinned.check(doc)[0].explain).toContain('preserving any action or workflow subpath');
  });
  it('accepts SHA-pinned refs', () => {
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11\n`);
    expect(unpinned.check(doc)).toHaveLength(0);
  });
  it('ignores local actions', () => {
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: ./local\n`);
    expect(unpinned.check(doc)).toHaveLength(0);
  });
  it('ignores self-repository actions and reusable workflows', () => {
    const doc = parse(`name: x\non: push\njobs:\n  local:\n    uses: $/.github/workflows/build.yml\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: $/actions/setup\n`);
    expect(unpinned.check(doc)).toHaveLength(0);
  });
  it('flags mutable job-level reusable workflows', () => {
    const doc = parse(`name: x\non: push\njobs:\n  call:\n    uses: octo/repo/.github/workflows/build.yml@main\n`);
    const findings = unpinned.check(doc);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ line: 5 });
    expect(findings[0].fields.action)
      .toBe('octo/repo/.github/workflows/build.yml@main');
  });
  it('flags mutable actions used inside composite actions', () => {
    const doc = parseWorkflowSource(
      `name: x\nruns:\n  using: composite\n  steps:\n    - uses: actions/setup-node@v4\n`,
      'action.yml',
    );
    const findings = unpinned.check(doc);
    expect(findings).toHaveLength(1);
    expect(findings[0].fields.action).toBe('actions/setup-node@v4');
  });
});

describe('unpinned-docker-action', () => {
  it('flags mutable Docker action tags', () => {
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: docker://alpine:3.20\n`);
    expect(unpinnedDocker.check(doc)).toHaveLength(1);
  });

  it('accepts sha256-pinned Docker actions', () => {
    const digest = 'a'.repeat(64);
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: docker://alpine@sha256:${digest}\n`);
    expect(unpinnedDocker.check(doc)).toHaveLength(0);
  });
});

describe('unpinned-container-image', () => {
  it('flags mutable job and service images', () => {
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    container: node:20\n    services:\n      db:\n        image: postgres:16\n    steps: []\n`);
    const findings = unpinnedContainer.check(doc);
    expect(findings).toHaveLength(2);
    expect(findings.map(f => f.fields.context)).toEqual([
      'job-container',
      'service-container',
    ]);
  });

  it('accepts digest-pinned container images', () => {
    const digest = 'a'.repeat(64);
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    container:\n      image: node@sha256:${digest}\n    steps: []\n`);
    expect(unpinnedContainer.check(doc)).toHaveLength(0);
  });

  it('allows local Dockerfiles only for Docker action metadata', () => {
    const action = parseWorkflowSource(`name: x\nruns:\n  using: docker\n  image: Dockerfile\n`, 'action.yml');
    expect(unpinnedContainer.check(action)).toHaveLength(0);

    const nested = parseWorkflowSource(`name: x\nruns:\n  using: docker\n  image: docker/Dockerfile\n`, 'action.yml');
    expect(unpinnedContainer.check(nested)).toHaveLength(0);

    const invalidLocal = parseWorkflowSource(`name: x\nruns:\n  using: docker\n  image: ./container-image\n`, 'action.yml');
    expect(unpinnedContainer.check(invalidLocal)).toHaveLength(1);

    const workflow = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    container: Dockerfile\n    steps: []\n`);
    expect(unpinnedContainer.check(workflow)).toHaveLength(1);
  });
});

describe('excessive-permissions', () => {
  it('flags write-all at workflow scope', () => {
    const doc = parse(`name: x\non: push\npermissions: write-all\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps: []\n`);
    const findings = perms.check(doc);
    expect(findings.some(f => f.fields.scope === 'write-all')).toBe(true);
  });
  it('flags missing top-level permissions as low', () => {
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps: []\n`);
    const findings = perms.check(doc);
    expect(findings.some(f => f.severity === 'low')).toBe(true);
  });
  it('accepts narrow read-only permissions', () => {
    const doc = parse(`name: x\non: push\npermissions:\n  contents: read\njobs:\n  b:\n    runs-on: ubuntu-latest\n    permissions:\n      contents: read\n    steps: []\n`);
    expect(perms.check(doc)).toHaveLength(0);
  });
  it('distinguishes a declared bare permissions key from an absent key', () => {
    const doc = parse(`name: x\non: push\npermissions:\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps: []\n`);
    expect(doc.permissionsDeclared).toBe(true);
    expect(perms.check(doc)).toHaveLength(0);
  });
  it('does not require a permissions block on composite actions', () => {
    const doc = parseWorkflowSource(
      'name: x\nruns:\n  using: composite\n  steps: []\n',
      'action.yml',
    );
    expect(perms.check(doc)).toHaveLength(0);
  });
});

describe('secrets-in-env', () => {
  it('flags workflow-level secret env', () => {
    const doc = parse(`name: x\non: push\nenv:\n  T: \${{ secrets.AWS }}\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps: []\n`);
    const findings = secrets.check(doc);
    expect(findings).toHaveLength(1);
    expect(findings[0].fields.key).toBe('T');
    expect(findings[0].severity).toBe('high');
  });

  it('detects bracket access and classifies dynamic all-secret access', () => {
    const doc = parse(`name: x\non: push\nenv:\n  ONE: \${{ secrets['AWS_KEY'] }}\n  DYNAMIC: \${{ secrets[format('KEY_{0}', matrix.target)] }}\n  ALL: \${{ toJSON(secrets) }}\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps: []\n`);
    const findings = secrets.check(doc);
    expect(findings).toHaveLength(3);
    expect(findings.find(f => f.fields.key === 'ONE')).toMatchObject({
      severity: 'high',
      fields: { exposure: 'named-secret' },
    });
    expect(findings.every(f => f.severity === 'high')).toBe(true);
    expect(findings.filter(f => f.fields.exposure === 'all-secrets')).toHaveLength(2);
    expect(findings.find(f => f.fields.key === 'ALL').explain).toContain(
      'explicit named secret references',
    );
  });

  it('treats a named job-scoped secret as a medium exposure', () => {
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    env:\n      TOKEN: \${{ secrets.TOKEN }}\n    steps: []\n`);
    expect(secrets.check(doc)).toEqual([
      expect.objectContaining({
        severity: 'medium',
        fields: expect.objectContaining({ scope: 'job', exposure: 'named-secret' }),
      }),
    ]);
  });

  it('allows a secret scoped to only the consuming step', () => {
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - env:\n          TOKEN: \${{ secrets.TOKEN }}\n        run: use-token\n`);
    expect(secrets.check(doc)).toHaveLength(0);
  });

  it('does not mistake the word secrets in a string for the secrets context', () => {
    const doc = parse(`name: x\non: push\nenv:\n  MESSAGE: \${{ vars.MESSAGE == 'secrets' }}\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps: []\n`);
    expect(secrets.check(doc)).toHaveLength(0);
  });

  it('flags dynamic all-secret access even at step scope', () => {
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - env:\n          TOKEN: \${{ secrets[matrix.secret_name] }}\n        run: use-token\n`);
    expect(secrets.check(doc)).toEqual([
      expect.objectContaining({
        severity: 'high',
        fields: expect.objectContaining({ scope: 'step', exposure: 'all-secrets' }),
      }),
    ]);
  });
});

describe('script-injection', () => {
  it('flags github.event.issue.title in run script', () => {
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo "\${{ github.event.issue.title }}"\n`);
    expect(injection.check(doc)).toHaveLength(1);
  });
  it('does not flag non-tainted expressions', () => {
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo "\${{ github.sha }}"\n`);
    expect(injection.check(doc)).toHaveLength(0);
  });
  it('flags PR repository metadata and commit author identity', () => {
    for (const expression of [
      'github.event.pull_request.head.repo.default_branch',
      'github.event.head_commit.author.name',
      'github.event.head_commit.author.email',
      'github.event.commits[0].author.email',
      'github.event.review_comment.body',
      'github.event.pages[0].page_name',
      'github.event.workflow_run.display_title',
      'github.event.workflow_run.head_repository.default_branch',
    ]) {
      const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo "\${{ ${expression} }}"\n`);
      expect(injection.check(doc), expression).toHaveLength(1);
    }
  });

  it('does not flag repository identifiers constrained to shell-safe characters', () => {
    for (const expression of [
      'github.event.pull_request.head.repo.name',
      'github.event.pull_request.head.repo.full_name',
    ]) {
      const doc = parse(`name: x\non: pull_request\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo "\${{ ${expression} }}"\n`);
      expect(injection.check(doc), expression).toHaveLength(0);
    }
  });

  it('gives sink-specific remediation that avoids expression interpolation', () => {
    const shell = parse(`name: x\non: issue_comment\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo "\${{ github.event.comment.body }}"\n`);
    expect(injection.check(shell)[0].explain).toContain('not `${{ env.VALUE }}`');

    const script = parse(`name: x\non: issue_comment\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/github-script@v8\n        with:\n          script: console.log("\${{ github.event.comment.body }}")\n`);
    expect(injection.check(script)[0].explain).toContain('process.env');
  });

  it('recognizes formatted expressions and first-party action names case-insensitively', () => {
    const doc = parse(`name: x
on: issue_comment
jobs:
  b:
    runs-on: ubuntu-latest
    steps:
      - uses: Actions/GitHub-Script@v8
        with:
          script: |
            console.log("\${{ format('{0}', github.event.comment.body) }}")
`);
    expect(injection.check(doc)).toHaveLength(1);
  });

  it('tracks untrusted values re-interpolated through env expressions', () => {
    const unsafe = parse(`name: x\non: issue_comment\nenv:\n  BODY: \${{ github.event.comment.body }}\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo "\${{ env.BODY }}"\n`);
    expect(injection.check(unsafe)).toEqual([
      expect.objectContaining({
        fields: expect.objectContaining({ via_env: 'BODY' }),
      }),
    ]);

    const safe = parse(`name: x\non: issue_comment\nenv:\n  BODY: \${{ github.event.comment.body }}\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo "$BODY"\n      - env:\n          BODY: fixed\n        run: echo "\${{ env.BODY }}"\n`);
    expect(injection.check(safe)).toHaveLength(0);
  });
});

describe('pull-request-target-checkout', () => {
  it('flags checkout of PR head under pull_request_target', () => {
    const doc = parse(`name: x\non:\n  pull_request_target:\n    types: [opened]\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: \${{ github.event.pull_request.head.ref }}\n          allow-unsafe-pr-checkout: true\n      - run: make test\n`);
    expect(prTarget.check(doc)).toEqual([
      expect.objectContaining({
        severity: 'critical',
        fields: expect.objectContaining({ checkout_protection: 'explicit-opt-out' }),
      }),
    ]);
  });
  it('reports checkout alone at lower severity', () => {
    const doc = parse(`name: x\non: pull_request_target\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: \${{ github.event.pull_request.head.sha }}\n          allow-unsafe-pr-checkout: true\n`);
    expect(prTarget.check(doc)).toEqual([
      expect.objectContaining({ severity: 'high' }),
    ]);
  });
  it('recognizes the built-in protection in current checkout releases', () => {
    const doc = parse(`name: x\non: pull_request_target\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v7\n        with:\n          ref: \${{ github.event.pull_request.head.sha }}\n      - run: make test\n`);
    expect(prTarget.check(doc)).toHaveLength(0);
  });
  it('does not trust a version comment attached to a pinned checkout SHA', () => {
    const sha = 'a'.repeat(40);
    const doc = parse(`name: x\non: pull_request_target\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@${sha} # actions-warden-ref: v7\n        with:\n          ref: \${{ github.event.pull_request.head.sha }}\n      - run: make test\n`);
    expect(prTarget.check(doc)).toHaveLength(1);
  });
  it('recognizes exact protected tags and release SHAs', () => {
    for (const ref of [
      'v2.8.0',
      'v3.7.0',
      'v4.4.0',
      'v5.1.0',
      'v6.1.0',
      'v7.0.0',
      '11d5960a326750d5838078e36cf38b85af677262',
      '3d3c42e5aac5ba805825da76410c181273ba90b1',
    ]) {
      const doc = parse(`name: x\non: pull_request_target\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@${ref}\n        with:\n          ref: \${{ github.event.pull_request.head.sha }}\n      - run: make test\n`);
      expect(prTarget.check(doc), ref).toHaveLength(0);
    }
  });
  it('flags versions before the protection backport and dynamic opt-outs', () => {
    const old = parse(`name: x\non: pull_request_target\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4.3.1\n        with:\n          ref: \${{ github.event.pull_request.head.sha }}\n      - run: make test\n`);
    expect(prTarget.check(old)).toHaveLength(1);

    const dynamic = parse(`name: x\non: pull_request_target\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v7\n        with:\n          ref: \${{ github.event.pull_request.head.sha }}\n          allow-unsafe-pr-checkout: \${{ inputs.allow_unsafe }}\n      - run: make test\n`);
    expect(prTarget.check(dynamic)[0].fields.checkout_protection).toBe('dynamic-opt-out');
  });
  it('recognizes merge-commit refs and checkout casing', () => {
    const doc = parse(`name: x
on: pull_request_target
jobs:
  b:
    runs-on: ubuntu-latest
    steps:
      - uses: Actions/Checkout@v4.3.1
        with:
          ref: \${{ github.event.pull_request.merge_commit_sha }}
      - run: npm test
`);
    const [finding] = prTarget.check(doc);
    expect(finding).toMatchObject({ severity: 'critical' });
    expect(finding.explain).toContain('full SHA');
  });
  it('ignores harmless shell commands and deduplicates execution per job', () => {
    const harmless = parse(`name: x\non: pull_request_target\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: \${{ github.event.pull_request.head.sha }}\n          allow-unsafe-pr-checkout: true\n      - run: echo done\n`);
    expect(prTarget.check(harmless)).toEqual([
      expect.objectContaining({ severity: 'high' }),
    ]);
    const executing = parse(`name: x\non: pull_request_target\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: \${{ github.event.pull_request.head.sha }}\n          allow-unsafe-pr-checkout: true\n      - run: make test\n      - run: npm test\n`);
    expect(prTarget.check(executing)).toHaveLength(1);
  });
  it('does not treat command names or paths printed by echo as execution', () => {
    const doc = parse(`name: x\non: pull_request_target\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: \${{ github.event.pull_request.head.sha }}\n          allow-unsafe-pr-checkout: true\n      - run: echo "npm test ./scripts/build.sh"\n`);
    expect(prTarget.check(doc)).toEqual([
      expect.objectContaining({ severity: 'high' }),
    ]);
  });
  it('retains every untrusted checkout path until it is consumed', () => {
    const doc = parse(`name: x
on: pull_request_target
jobs:
  b:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
          path: first
          allow-unsafe-pr-checkout: true
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
          path: second
          allow-unsafe-pr-checkout: true
      - run: first/scripts/test.sh
`);
    const [finding] = prTarget.check(doc);
    expect(finding).toMatchObject({
      severity: 'critical',
      fields: expect.objectContaining({ source_line: 7 }),
    });
  });
  it('recognizes numbered gh PR checkouts and third-party build actions', () => {
    const doc = parse(`name: x\non: pull_request_target\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - run: gh pr checkout 123\n      - uses: vendor/build-action@v1\n`);
    expect(prTarget.check(doc)).toHaveLength(1);
  });
  it('recognizes pull refspecs without the optional refs prefix', () => {
    const doc = parse(`name: x\non: pull_request_target\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - run: git fetch origin pull/123/head:pr-head\n      - run: npm test\n`);
    expect(prTarget.check(doc)).toHaveLength(1);
  });
  it('does not flag pull_request', () => {
    const doc = parse(`name: x\non: pull_request\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: \${{ github.event.pull_request.head.ref }}\n`);
    expect(prTarget.check(doc)).toHaveLength(0);
  });
});

describe('permission accuracy', () => {
  it('does not label required OIDC permission as excessive', () => {
    const doc = parse(`name: x\non: push\npermissions:\n  contents: read\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    permissions:\n      contents: read\n      id-token: write\n    steps: []\n`);
    expect(perms.check(doc)).toHaveLength(0);
  });

  it('does not label one purpose-specific job write scope as excessive', () => {
    const doc = parse(`name: x\non: push\npermissions:\n  contents: read\njobs:\n  release:\n    runs-on: ubuntu-latest\n    permissions:\n      contents: write\n    steps: []\n`);
    expect(perms.check(doc)).toHaveLength(0);
  });

  it('allows one purpose-specific actions or packages write scope', () => {
    for (const scope of ['actions', 'packages']) {
      const doc = parse(`name: x\non: push\npermissions:\n  contents: read\njobs:\n  release:\n    runs-on: ubuntu-latest\n    permissions:\n      ${scope}: write\n    steps: []\n`);
      expect(perms.check(doc), scope).toHaveLength(0);
    }
  });

  it('flags maps with several writable scopes', () => {
    const doc = parse(`name: x\non: push\npermissions:\n  contents: write\n  issues: write\n  pull-requests: write\njobs:\n  release:\n    runs-on: ubuntu-latest\n    steps: []\n`);
    expect(perms.check(doc)).toEqual([
      expect.objectContaining({ severity: 'medium' }),
    ]);
  });
});

describe('workflow structure', () => {
  it('reports bare permissions as invalid syntax instead of an unset default', () => {
    const doc = parse(`name: x\non: push\npermissions:\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n`);
    expect(perms.check(doc)).toHaveLength(0);
    expect(structure.check(doc)).toEqual([
      expect.objectContaining({
        fields: expect.objectContaining({ issue: 'permissions' }),
      }),
    ]);
  });

  it('reports invalid permissions values rather than classifying them as broad', () => {
    const doc = parse(`name: x\non: push\npermissions: write\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n`);
    expect(perms.check(doc)).toHaveLength(0);
    expect(structure.check(doc)).toEqual([
      expect.objectContaining({
        fields: expect.objectContaining({ issue: 'permissions' }),
      }),
    ]);
  });

  it('detects empty keys and invalid reusable-job combinations', () => {
    const doc = parse(`name: x\non: push\njobs:\n  called:\n    uses: octo/repo/.github/workflows/build.yml@v1\n    runs-on: ubuntu-latest\n    steps: []\n  local:\n    runs-on:\n    steps:\n      - uses: actions/checkout@v4\n        run:\n`);
    expect(structure.check(doc).map(f => f.fields.issue)).toEqual([
      'reusable-job-runs-on',
      'reusable-job-steps',
      'missing-runs-on',
      'step-run-uses',
    ]);
  });

  it('detects missing workflow jobs and composite run shells', () => {
    const missingJobs = parseWorkflowSource(
      'name: x\non: push\n',
      '.github/workflows/missing.yml',
    );
    expect(structure.check(missingJobs)[0].fields.issue).toBe('missing-jobs');

    const composite = parseWorkflowSource(
      'name: x\nruns:\n  using: composite\n  steps:\n    - run: echo hi\n',
      'action.yml',
    );
    expect(structure.check(composite)[0].fields.issue).toBe('composite-step-shell');
  });

  it('detects empty triggers and malformed or empty steps', () => {
    const workflow = parse(`name: x\non: []\njobs:\n  malformed:\n    runs-on: ubuntu-latest\n    steps:\n      - not-a-step\n  empty:\n    runs-on: ubuntu-latest\n    steps:\n      - name: no command\n  self-ref:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: $/actions/build@v1\n`);
    expect(structure.check(workflow).map(f => f.fields.issue)).toEqual([
      'trigger-shape',
      'steps-sequence',
      'step-action',
      'step-uses',
    ]);

    const composite = parseWorkflowSource(
      'name: x\nruns:\n  using: composite\n  steps: []\n',
      'action.yml',
    );
    expect(structure.check(composite)[0].fields.issue).toBe('composite-steps');
  });

  it('rejects empty runner selectors and empty workflow step sequences', () => {
    const workflow = parse(`name: x
on: push
jobs:
  no-runner:
    runs-on: []
    steps:
      - run: echo ok
  no-steps:
    runs-on: ubuntu-latest
    steps: []
`);
    expect(structure.check(workflow).map(f => f.fields.issue)).toEqual([
      'missing-runs-on',
      'empty-steps',
    ]);
  });

  it('rejects empty action refs and reusable workflows outside the required directory', () => {
    const workflow = parse(`name: x
on: push
jobs:
  called:
    uses: octo/repo/workflows/build.yml@v1
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: owner/action@
      - uses: docker://
`);
    expect(structure.check(workflow).map(f => f.fields.issue)).toEqual([
      'reusable-job-uses',
      'step-uses',
      'step-uses',
    ]);
  });

  it('accepts exact local and self-repository reusable workflow paths', () => {
    const workflow = parse(`name: x
on: push
jobs:
  local:
    uses: ./.github/workflows/build.yml
  self:
    uses: $/.github/workflows/test.yaml
`);
    expect(structure.check(workflow)).toHaveLength(0);
  });

  it('accepts a local action stored at the repository root', () => {
    const workflow = parse(`name: x
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: ./
`);
    expect(structure.check(workflow)).toHaveLength(0);
  });

  it('accepts current background and control-step syntax', () => {
    const sha = 'a'.repeat(40);
    const workflow = parse(`name: concurrent
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - id: server
        uses: owner/server@${sha}
        background: true
      - wait: [server]
      - id: monitor
        run: npm start
        background: true
      - cancel: monitor
      - wait-all:
      - parallel:
          - run: npm run build:web
          - uses: owner/action@${sha}
`);
    expect(structure.check(workflow)).toHaveLength(0);
  });

  it('validates background and control-step shapes', () => {
    const workflow = parse(`name: concurrent
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm start
        background: yes
      - wait: []
      - wait-all: all
      - cancel: [server]
      - parallel: []
      - wait: server
        if: always()
      - cancel: server
        background: true
`);
    expect(structure.check(workflow).map(f => f.fields.issue)).toEqual([
      'background-value',
      'wait-value',
      'wait-all-value',
      'cancel-value',
      'parallel-steps',
      'control-step-if',
      'background-step-type',
    ]);
  });

  it('rejects concurrent-step controls inside composite actions', () => {
    const composite = parseWorkflowSource(`name: x
runs:
  using: composite
  steps:
    - shell: bash
      run: npm start
      background: true
    - parallel:
        - uses: $/actions/build
`, 'action.yml');
    expect(structure.check(composite).map(f => f.fields.issue)).toEqual([
      'composite-step-background',
      'composite-step-control',
    ]);
  });

  it('runs security rules against steps nested in parallel groups', () => {
    const workflow = parse(`name: concurrent
on: issue_comment
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - parallel:
          - uses: owner/action@v1
          - run: echo "\${{ github.event.comment.body }}"
`);
    expect(unpinned.check(workflow)).toHaveLength(1);
    expect(injection.check(workflow)).toHaveLength(1);
  });
});

describe('reusable workflow secret boundaries', () => {
  it('flags inheritance into an external reusable workflow', () => {
    const doc = parse(`name: x\non: push\njobs:\n  deploy:\n    uses: octo/repo/.github/workflows/deploy.yml@v1\n    secrets: inherit\n`);
    expect(reusableSecrets.check(doc)).toHaveLength(1);
  });

  it('allows explicitly selected secrets', () => {
    const doc = parse(`name: x\non: push\njobs:\n  deploy:\n    uses: octo/repo/.github/workflows/deploy.yml@v1\n    secrets:\n      token: \${{ secrets.DEPLOY_TOKEN }}\n`);
    expect(reusableSecrets.check(doc)).toHaveLength(0);
  });
});

describe('self-hosted runner trust', () => {
  it('flags self-hosted runners for pull request code', () => {
    const doc = parse(`name: x\non: pull_request\njobs:\n  test:\n    runs-on: [self-hosted, linux]\n    steps: []\n`);
    expect(selfHosted.check(doc)).toHaveLength(1);
  });

  it('flags object-form labels when pull_request_target fetches fork code', () => {
    const doc = parse(`name: x\non: pull_request_target\njobs:\n  test:\n    runs-on:\n      group: secure-runners\n      labels: [self-hosted, linux]\n    steps:\n      - uses: actions/checkout@v7\n        with:\n          ref: \${{ github.event.pull_request.head.sha }}\n          allow-unsafe-pr-checkout: true\n`);
    expect(selfHosted.check(doc)).toHaveLength(1);
  });

  it('does not treat a trusted pull_request_target labeling job as PR code execution', () => {
    const doc = parse(`name: x\non: pull_request_target\njobs:\n  label:\n    runs-on: self-hosted\n    steps:\n      - uses: actions/github-script@v8\n        with:\n          script: console.log('trusted workflow code')\n`);
    expect(selfHosted.check(doc)).toHaveLength(0);
  });

  it('supports configured custom labels and trusted runner groups', () => {
    const custom = parse(`name: x\non: pull_request\njobs:\n  test:\n    runs-on: private-linux\n    steps: []\n`);
    expect(selfHosted.check(custom, {
      runnerPolicy: {
        trustedGroups: [],
        selfHostedLabels: ['private-*'],
        flagUnknownGroups: false,
      },
    })).toHaveLength(1);

    const grouped = parse(`name: x\non: pull_request\njobs:\n  test:\n    runs-on:\n      group: github-hosted-large\n    steps: []\n`);
    expect(selfHosted.check(grouped, {
      runnerPolicy: {
        trustedGroups: ['github-hosted-*'],
        selfHostedLabels: [],
        flagUnknownGroups: true,
      },
    })).toHaveLength(0);
  });

  it('resolves literal self-hosted values selected through a runner matrix', () => {
    const risky = parse(`name: x
on: pull_request
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, self-hosted]
    runs-on: \${{ matrix.os }}
    steps: []
`);
    expect(selfHosted.check(risky)).toEqual([
      expect.objectContaining({
        fields: expect.objectContaining({ selector: 'matrix.os:self-hosted' }),
      }),
    ]);

    const hosted = parse(`name: x
on: pull_request
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
    runs-on: \${{ matrix.os }}
    steps: []
`);
    expect(selfHosted.check(hosted)).toHaveLength(0);
  });

  it('does not flag self-hosted runners on push-only workflows', () => {
    const doc = parse(`name: x\non: push\njobs:\n  test:\n    runs-on: self-hosted\n    steps: []\n`);
    expect(selfHosted.check(doc)).toHaveLength(0);
  });
});

describe('workflow_run artifact trust', () => {
  it('flags execution after downloading an artifact', () => {
    const doc = parse(`name: publish\non:\n  workflow_run:\n    workflows: [build]\n    types: [completed]\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/download-artifact@v5\n        with:\n          run-id: \${{ github.event.workflow_run.id }}\n      - run: ./artifact/publish.sh\n`);
    const findings = workflowRunArtifact.check(doc);
    expect(findings).toHaveLength(1);
    expect(findings[0].explain).toContain('consume them only as inert data');
  });

  it('does not flag storage-only artifact handling', () => {
    const doc = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/download-artifact@v5\n        with:\n          run-id: \${{ github.event.workflow_run.id }}\n`);
    expect(workflowRunArtifact.check(doc)).toHaveLength(0);
  });

  it('does not mistake a same-run official download for workflow_run input', () => {
    const doc = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/download-artifact@v5\n      - run: ./artifact/publish.sh\n`);
    expect(workflowRunArtifact.check(doc)).toHaveLength(0);

    const current = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/download-artifact@v5\n        with:\n          run-id: \${{ github.run_id }}\n      - run: ./artifact/publish.sh\n`);
    expect(workflowRunArtifact.check(current)).toHaveLength(0);

    const currentCli = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - run: gh run download \${{ github.run_id }} --dir artifact\n      - run: ./artifact/publish.sh\n`);
    expect(workflowRunArtifact.check(currentCli)).toHaveLength(0);
  });

  it('matches the official download action case-insensitively', () => {
    const sameRun = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: Actions/Download-Artifact@v5\n      - run: ./artifact/publish.sh\n`);
    expect(workflowRunArtifact.check(sameRun)).toHaveLength(0);

    const crossRun = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: Actions/Download-Artifact@v5\n        with:\n          run-id: \${{ github.event.workflow_run.id }}\n      - run: ./artifact/publish.sh\n`);
    expect(workflowRunArtifact.check(crossRun)).toHaveLength(1);
  });

  it('treats a same numeric run ID in another repository as cross-run', () => {
    const doc = parse(`name: publish
on: workflow_run
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v5
        with:
          repository: other/repository
          run-id: \${{ github.run_id }}
          path: artifact
      - run: ./artifact/publish.sh
`);
    expect(workflowRunArtifact.check(doc)).toHaveLength(1);
  });

  it('retains every downloaded artifact source until it is consumed', () => {
    const doc = parse(`name: publish
on: workflow_run
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v5
        with:
          run-id: \${{ github.event.workflow_run.id }}
          path: first
      - uses: actions/download-artifact@v5
        with:
          run-id: \${{ github.event.workflow_run.id }}
          path: second
      - run: ./first/publish.sh
`);
    const [finding] = workflowRunArtifact.check(doc);
    expect(finding).toMatchObject({
      fields: expect.objectContaining({ source_line: 7 }),
    });
  });

  it('ignores harmless commands and emits at most one execution finding per job', () => {
    const harmless = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/download-artifact@v5\n        with:\n          run-id: \${{ github.event.workflow_run.id }}\n      - run: echo done\n`);
    expect(workflowRunArtifact.check(harmless)).toHaveLength(0);
    const executing = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/download-artifact@v5\n        with:\n          run-id: \${{ github.event.workflow_run.id }}\n      - run: ./artifact/publish.sh\n      - run: make publish\n`);
    expect(workflowRunArtifact.check(executing)).toHaveLength(1);
  });

  it('tracks a configured artifact path into working-directory execution', () => {
    const unrelated = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/download-artifact@v5\n        with:\n          run-id: \${{ github.event.workflow_run.id }}\n          path: artifacts\n      - run: npm test\n`);
    expect(workflowRunArtifact.check(unrelated)).toHaveLength(0);
    const consumed = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/download-artifact@v5\n        with:\n          run-id: \${{ github.event.workflow_run.id }}\n          path: artifacts\n      - run: npm test\n        working-directory: artifacts\n`);
    expect(workflowRunArtifact.check(consumed)).toHaveLength(1);
  });

  it('distinguishes an executable relative path from a path printed as data', () => {
    const printed = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/download-artifact@v5\n        with:\n          run-id: \${{ github.event.workflow_run.id }}\n          path: artifacts\n      - run: echo ./artifacts/publish.sh\n`);
    expect(workflowRunArtifact.check(printed)).toHaveLength(0);

    const executed = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/download-artifact@v5\n        with:\n          run-id: \${{ github.event.workflow_run.id }}\n          path: artifacts\n      - run: artifacts/publish.sh\n`);
    expect(workflowRunArtifact.check(executed)).toHaveLength(1);
  });

  it('keeps runner.temp artifacts isolated from unrelated workspace execution', () => {
    const isolated = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/download-artifact@v5\n        with:\n          run-id: \${{ github.event.workflow_run.id }}\n          path: \${{ runner.temp }}/artifacts\n      - run: npm test\n`);
    expect(workflowRunArtifact.check(isolated)).toHaveLength(0);

    const consumed = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/download-artifact@v5\n        with:\n          run-id: \${{ github.event.workflow_run.id }}\n          path: \${{ runner.temp }}/artifacts\n      - run: source \${{ runner.temp }}/artifacts/env.sh\n`);
    expect(workflowRunArtifact.check(consumed)).toHaveLength(1);

    const windows = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/download-artifact@v5\n        with:\n          run-id: \${{ github.event.workflow_run.id }}\n          path: \${{ runner.temp }}\\artifacts\n      - run: pwsh -File \${{ runner.temp }}\\artifacts\\publish.ps1\n`);
    expect(workflowRunArtifact.check(windows)).toHaveLength(1);
  });

  it('detects gh CLI and Actions API artifact downloads', () => {
    const gh = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - run: gh run download 123 --dir artifacts\n      - run: ./artifacts/publish.sh\n`);
    expect(workflowRunArtifact.check(gh)).toHaveLength(1);

    const api = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - run: gh api /repos/o/r/actions/artifacts/123/zip > artifact.zip\n      - run: ./publish.sh\n`);
    expect(workflowRunArtifact.check(api)).toHaveLength(1);

    const listOnly = parse(`name: publish\non: workflow_run\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - run: gh api /repos/o/r/actions/runs/123/artifacts > metadata.json\n      - run: ./publish.sh\n`);
    expect(workflowRunArtifact.check(listOnly)).toHaveLength(0);
  });
});
