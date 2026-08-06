import { describe, it, expect } from 'vitest';
import { parseWorkflowSource } from '../src/lib/parser.js';
import * as unpinned from '../src/rules/unpinned-action.js';
import * as perms from '../src/rules/excessive-permissions.js';
import * as secrets from '../src/rules/secrets-in-env.js';
import * as injection from '../src/rules/script-injection.js';
import * as prTarget from '../src/rules/pull-request-target-checkout.js';

function parse(src) {
  return parseWorkflowSource(src, 'x.yml');
}

describe('unpinned-action', () => {
  it('flags tag-based refs', () => {
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n`);
    expect(unpinned.check(doc)).toHaveLength(1);
  });
  it('accepts SHA-pinned refs', () => {
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11\n`);
    expect(unpinned.check(doc)).toHaveLength(0);
  });
  it('ignores local actions', () => {
    const doc = parse(`name: x\non: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: ./local\n`);
    expect(unpinned.check(doc)).toHaveLength(0);
  });
  it('flags mutable job-level reusable workflows', () => {
    const doc = parse(`name: x\non: push\njobs:\n  call:\n    uses: octo/repo/.github/workflows/build.yml@main\n`);
    const findings = unpinned.check(doc);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ line: 5 });
    expect(findings[0].fields.action).toBe('octo/repo/.github/workflows/build.yml@main');
  });
  it('flags mutable actions used inside composite actions', () => {
    const doc = parseWorkflowSource(`name: x\nruns:\n  using: composite\n  steps:\n    - uses: actions/setup-node@v4\n`, 'action.yml');
    const findings = unpinned.check(doc);
    expect(findings).toHaveLength(1);
    expect(findings[0].fields.action).toBe('actions/setup-node@v4');
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
  it('does not require a permissions block on composite actions', () => {
    const doc = parseWorkflowSource('name: x\nruns:\n  using: composite\n  steps: []\n', 'action.yml');
    expect(perms.check(doc)).toHaveLength(0);
  });
});

describe('secrets-in-env', () => {
  it('flags workflow-level secret env', () => {
    const doc = parse(`name: x\non: push\nenv:\n  T: \${{ secrets.AWS }}\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps: []\n`);
    const findings = secrets.check(doc);
    expect(findings).toHaveLength(1);
    expect(findings[0].fields.key).toBe('T');
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
});

describe('pull-request-target-checkout', () => {
  it('flags checkout of PR head under pull_request_target', () => {
    const doc = parse(`name: x\non:\n  pull_request_target:\n    types: [opened]\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: \${{ github.event.pull_request.head.ref }}\n`);
    expect(prTarget.check(doc)).toHaveLength(1);
  });
  it('does not flag pull_request', () => {
    const doc = parse(`name: x\non: pull_request\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: \${{ github.event.pull_request.head.ref }}\n`);
    expect(prTarget.check(doc)).toHaveLength(0);
  });
});
