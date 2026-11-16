import { describe, expect, it } from 'vitest';
import { renderSarif } from '../src/lib/formats/sarif.js';

const COMMIT = 'a'.repeat(40);

function parse(records, options) {
  return JSON.parse(renderSarif(records, options));
}

function ruleById(run, id) {
  return run.tool.driver.rules.find(rule => rule.id === id);
}

const rule = (id, severity) => ({
  label: 'RULE',
  fields: { id, severity, description: `${id} description.` },
});
const catalog = [
  rule('unpinned-action', 'high'),
  rule('script-injection', 'critical'),
  rule('workflow-structure', 'medium'),
  rule('excessive-permissions', 'low'),
];

describe('SARIF security severity', () => {
  it('adds a string score to every catalog rule descriptor, for local audits too', () => {
    const sarif = parse([
      ...catalog,
      {
        label: 'FINDING',
        fields: { id: 'f1', type: 'unpinned-action', sev: 'high', file: 'ci.yml', line: 3 },
      },
    ]);
    const [run] = sarif.runs;
    const scores = Object.fromEntries(run.tool.driver.rules.map(
      rule => [rule.id, rule.properties?.['security-severity']],
    ));
    expect(scores).toEqual({
      'unpinned-action': '7.0',
      'script-injection': '9.5',
      'workflow-structure': '4.0',
      'excessive-permissions': '1.0',
    });
    for (const score of Object.values(scores)) expect(typeof score).toBe('string');
  });

  it('keeps critical inside GitHub\'s documented "over 9.0" band', () => {
    const [run] = parse(catalog).runs;
    expect(Number(ruleById(run, 'script-injection').properties['security-severity']))
      .toBeGreaterThan(9);
  });

  it('scores a synthesized finding rule but not operational error or plan rules', () => {
    const [run] = parse([
      { label: 'FINDING', fields: { id: 'p', type: 'parse-error', sev: 'high', file: 'a.yml' } },
      { label: 'ERROR', fields: { msg: 'could not read', file: 'a.yml' } },
      { label: 'PIN', fields: { id: 'c', file: 'a.yml', action: 'actions/checkout' } },
    ]).runs;
    expect(ruleById(run, 'parse-error').properties).toEqual({ 'security-severity': '7.0' });
    expect(ruleById(run, 'actions-warden/error')).not.toHaveProperty('properties');
    expect(ruleById(run, 'actions-warden/pin')).not.toHaveProperty('properties');
  });

  it('omits the score for an unknown severity', () => {
    const [run] = parse([
      { label: 'RULE', fields: { id: 'odd', severity: 'constructor', description: 'x' } },
      { label: 'RULE', fields: { id: 'none', description: 'x' } },
    ]).runs;
    expect(ruleById(run, 'odd')).not.toHaveProperty('properties');
    expect(ruleById(run, 'none')).not.toHaveProperty('properties');
  });
});

describe('SARIF runs', () => {
  const repository = (name, extra = {}) => ({
    label: 'REPOSITORY',
    fields: {
      repo: `octo-org/${name}`,
      branch: 'main',
      url: `https://github.com/octo-org/${name}`,
      ...extra,
    },
  });
  const finding = (name, path) => ({
    label: 'FINDING',
    fields: {
      id: `id-${name}`,
      type: 'unpinned-action',
      sev: 'high',
      file: `octo-org/${name}/${path}`,
      path,
      line: 4,
    },
  });

  it('keeps one run for records without repositories', () => {
    const sarif = parse([
      ...catalog,
      {
        label: 'FINDING',
        fields: { id: 'f', type: 'unpinned-action', sev: 'high', file: 'ci.yml' },
      },
    ]);
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0]).not.toHaveProperty('versionControlProvenance');
    expect(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri)
      .toBe('ci.yml');
  });

  it('emits one run per repository, in order, with repository-relative locations', () => {
    const sarif = parse([
      ...catalog,
      repository('app', { commit: COMMIT }),
      finding('app', '.github/workflows/ci.yml'),
      repository('worker', { commit: 'b'.repeat(40) }),
      finding('worker', '.github/workflows/build.yml'),
      { label: 'COVERAGE', fields: { complete: true } },
      { label: 'SUMMARY', fields: { organization: 'octo-org' } },
    ]);
    expect(sarif.runs).toHaveLength(2);
    expect(sarif.runs.map(run => run.versionControlProvenance[0].repositoryUri)).toEqual([
      'https://github.com/octo-org/app',
      'https://github.com/octo-org/worker',
    ]);
    expect(sarif.runs[0].versionControlProvenance).toEqual([{
      repositoryUri: 'https://github.com/octo-org/app',
      revisionId: COMMIT,
      branch: 'main',
    }]);
    expect(sarif.runs.map(run => (
      run.results.map(result => result.locations[0].physicalLocation.artifactLocation.uri)
    ))).toEqual([['.github/workflows/ci.yml'], ['.github/workflows/build.yml']]);
    expect(ruleById(sarif.runs[0], 'script-injection').properties['security-severity'])
      .toBe('9.5');
  });

  it('gives a repository without findings an empty run and omits an unknown commit', () => {
    const sarif = parse([repository('empty')]);
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].results).toEqual([]);
    expect(sarif.runs[0].versionControlProvenance).toEqual([{
      repositoryUri: 'https://github.com/octo-org/empty',
      branch: 'main',
    }]);
  });

  it('omits provenance when the repository URL is unknown', () => {
    const [run] = parse([{ label: 'REPOSITORY', fields: { repo: 'octo-org/app' } }]).runs;
    expect(run).not.toHaveProperty('versionControlProvenance');
  });

  it('puts a repository-level error in that repository\'s run, without a location', () => {
    const sarif = parse([
      repository('app'),
      repository('denied'),
      {
        label: 'ERROR',
        fields: { repo: 'octo-org/denied', msg: 'could not read tree (HTTP 403)' },
      },
      repository('later'),
    ]);
    expect(sarif.runs.map(run => run.results.length)).toEqual([0, 1, 0]);
    const [error] = sarif.runs[1].results;
    expect(error).toMatchObject({ ruleId: 'actions-warden/error', level: 'error' });
    expect(error).not.toHaveProperty('locations');
  });

  it('does not turn FILE records into results', () => {
    const [run] = parse([
      repository('app'),
      { label: 'FILE', fields: { repo: 'octo-org/app', path: 'a.yml', status: 'scanned' } },
    ]).runs;
    expect(run.results).toEqual([]);
  });
});
