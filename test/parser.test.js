import { describe, it, expect } from 'vitest';
import {
  collectImages,
  collectUses,
  parseActionRef,
  parseWorkflowSource,
} from '../src/lib/parser.js';

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
  it('detects self-repository paths', () => {
    expect(parseActionRef('$/actions/build', 1).kind).toBe('self');
    expect(parseActionRef('$/.github/workflows/build.yml', 1).kind).toBe('self');
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

  it('collects job-level reusable workflow calls', () => {
    const doc = parseWorkflowSource([
      'name: caller',
      'on: push',
      'jobs:',
      '  reusable:',
      '    uses: octo/repo/.github/workflows/build.yml@main',
      '',
    ].join('\n'), 'caller.yml');
    const uses = collectUses(doc);
    expect(uses).toHaveLength(1);
    expect(uses[0]).toMatchObject({
      target: 'job',
      location: 'job',
      stepIndex: -1,
    });
    expect(uses[0].ref.kind).toBe('reusable-workflow');
    expect(uses[0].ref.line).toBe(5);
    expect(uses[0].ref.start).toBeGreaterThan(0);
  });

  it('throws on invalid YAML', () => {
    expect(() => parseWorkflowSource(':\n :\n :', 'bad.yml')).toThrow();
  });

  it('parses uses steps from composite action metadata', () => {
    const doc = parseWorkflowSource([
      'name: composite',
      'runs:',
      '  using: composite',
      '  steps:',
      '    - uses: actions/setup-node@v4',
      '    - shell: bash',
      '      run: echo ok',
      '',
    ].join('\n'), 'action.yml');
    expect(doc.kind).toBe('composite-action');
    expect(collectUses(doc)).toHaveLength(1);
    expect(collectUses(doc)[0].ref.raw).toBe('actions/setup-node@v4');
    expect(doc.jobs[0].steps[1]).toMatchObject({
      runDeclared: true,
      shellDeclared: true,
      shell: 'bash',
    });
  });

  it('retains structural key declarations even when values are empty', () => {
    const doc = parseWorkflowSource([
      'name: invalid',
      'on: push',
      'jobs:',
      '  build:',
      '    runs-on:',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '        run:',
      '',
    ].join('\n'), '.github/workflows/invalid.yml');
    expect(doc.jobs[0]).toMatchObject({
      runsOnDeclared: true,
      stepsDeclared: true,
      stepsValid: true,
    });
    expect(doc.jobs[0].steps[0]).toMatchObject({
      usesDeclared: true,
      runDeclared: true,
    });
  });

  it('parses background controls and traverses actions inside parallel groups', () => {
    const sha = 'a'.repeat(40);
    const doc = parseWorkflowSource([
      'name: concurrent',
      'on: push',
      'jobs:',
      '  build:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - id: server',
      '        run: npm start',
      '        background: true',
      '      - wait: server',
      '      - wait-all:',
      '      - cancel: server',
      '      - parallel:',
      '          - run: npm run build:web',
      `          - uses: owner/action@${sha}`,
      '',
    ].join('\n'), 'concurrent.yml');

    expect(doc.jobs[0].steps).toHaveLength(7);
    expect(doc.jobs[0].steps.map(step => step.control)).toEqual([
      null,
      'wait',
      'wait-all',
      'cancel',
      'parallel',
      null,
      null,
    ]);
    expect(doc.jobs[0].steps[0]).toMatchObject({
      id: 'server',
      backgroundDeclared: true,
      background: true,
    });
    expect(doc.jobs[0].steps[5].parallelDepth).toBe(1);
    expect(collectUses(doc).map(item => item.ref.raw)).toEqual([
      `owner/action@${sha}`,
    ]);
  });

  it('resolves aliased uses scalars at every occurrence', () => {
    const doc = parseWorkflowSource([
      'name: aliases',
      'on: push',
      'jobs:',
      '  build:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: &checkout actions/checkout@v3',
      '      - uses: *checkout',
      '',
    ].join('\n'), 'aliases.yml');
    const uses = collectUses(doc);
    expect(uses).toHaveLength(2);
    expect(uses.map(item => item.ref.raw)).toEqual([
      'actions/checkout@v3',
      'actions/checkout@v3',
    ]);
    expect(uses[1].ref).toMatchObject({ alias: true, line: 8 });
  });

  it('resolves aliased container image scalars', () => {
    const doc = parseWorkflowSource([
      'name: aliases',
      'on: push',
      'jobs:',
      '  first:',
      '    runs-on: ubuntu-latest',
      '    container: &node_image node:20',
      '    steps: []',
      '  second:',
      '    runs-on: ubuntu-latest',
      '    container: *node_image',
      '    steps: []',
      '',
    ].join('\n'), 'aliases.yml');
    expect(collectImages(doc).map(image => image.raw)).toEqual(['node:20', 'node:20']);
    expect(collectImages(doc)[1].line).toBe(10);
  });
});
