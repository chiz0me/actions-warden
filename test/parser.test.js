import { describe, it, expect } from 'vitest';
import { parseWorkflowSource, parseActionRef, collectUses } from '../src/lib/parser.js';

describe('parseActionRef', () => {
  it('extracts owner/repo/ref', () => {
    const ref = parseActionRef('actions/checkout@v3', 10);
    expect(ref).toMatchObject({ owner: 'actions', repo: 'checkout', ref: 'v3', kind: 'external', line: 10 });
  });
  it('detects reusable workflows', () => {
    const ref = parseActionRef('octo/repo/.github/workflows/deploy.yml@main', 1);
    expect(ref.kind).toBe('reusable-workflow');
    expect(ref.subpath).toBe('.github/workflows/deploy.yml');
  });
  it('detects local paths', () => {
    expect(parseActionRef('./local-action', 1).kind).toBe('local');
  });
  it('detects docker', () => {
    expect(parseActionRef('docker://node:20', 1).kind).toBe('docker');
  });
  it('returns unknown for malformed', () => {
    expect(parseActionRef('not-a-ref', 1).kind).toBe('unknown');
  });
});

describe('parseWorkflowSource', () => {
  const src = `name: ci
on: [push]
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: echo hi
  deploy:
    uses: octo/repo/.github/workflows/deploy.yml@main
`;
  it('parses jobs and steps with line numbers', () => {
    const doc = parseWorkflowSource(src, 'x.yml');
    expect(doc.kind).toBe('workflow');
    expect(doc.jobs).toHaveLength(2);
    expect(doc.jobs[0].name).toBe('build');
    expect(doc.jobs[0].steps).toHaveLength(2);
    expect(doc.jobs[0].steps[0].uses.raw).toBe('actions/checkout@v3');
    expect(doc.jobs[0].steps[0].uses.line).toBe(9);
  });

  it('collectUses returns step actions and job-level reusable workflows', () => {
    const doc = parseWorkflowSource(src, 'x.yml');
    const uses = collectUses(doc);
    expect(uses).toHaveLength(2);
    expect(uses[0].jobName).toBe('build');
    expect(uses[0].location).toBe('step');
    expect(uses[1]).toMatchObject({
      jobName: 'deploy',
      stepIndex: -1,
      location: 'job',
    });
    expect(uses[1].ref).toMatchObject({
      raw: 'octo/repo/.github/workflows/deploy.yml@main',
      kind: 'reusable-workflow',
      line: 12,
    });
  });

  it('collects action references from composite action steps', () => {
    const doc = parseWorkflowSource(`
name: composite
runs:
  using: composite
  steps:
    - uses: actions/setup-node@v4
    - shell: bash
      run: echo ok
`, 'action.yml');
    expect(doc.kind).toBe('composite-action');
    const uses = collectUses(doc);
    expect(uses).toHaveLength(1);
    expect(uses[0]).toMatchObject({
      jobName: null,
      stepIndex: 0,
      location: 'action-step',
    });
    expect(uses[0].ref).toMatchObject({ raw: 'actions/setup-node@v4', line: 6 });
  });

  it('throws on invalid YAML', () => {
    expect(() => parseWorkflowSource(':\n :\n :', 'bad.yml')).toThrow();
  });
});
