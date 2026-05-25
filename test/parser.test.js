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
`;
  it('parses jobs and steps with line numbers', () => {
    const doc = parseWorkflowSource(src, 'x.yml');
    expect(doc.jobs).toHaveLength(1);
    expect(doc.jobs[0].name).toBe('build');
    expect(doc.jobs[0].steps).toHaveLength(2);
    expect(doc.jobs[0].steps[0].uses.raw).toBe('actions/checkout@v3');
    expect(doc.jobs[0].steps[0].uses.line).toBe(9);
  });

  it('collectUses returns all action refs', () => {
    const doc = parseWorkflowSource(src, 'x.yml');
    const uses = collectUses(doc);
    expect(uses).toHaveLength(1);
    expect(uses[0].jobName).toBe('build');
  });

  it('throws on invalid YAML', () => {
    expect(() => parseWorkflowSource(':\n :\n :', 'bad.yml')).toThrow();
  });
});
