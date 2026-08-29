import { describe, expect, it } from 'vitest';
import {
  collectAnnotations,
  limitAnnotations,
  renderAnnotationCommands,
} from '../src/lib/annotations.js';

describe('GitHub annotations', () => {
  it('maps findings to deterministic severity and source annotations', () => {
    const annotations = collectAnnotations({
      command: 'audit',
      cwd: '/repo',
      result: {
        findings: [
          {
            id: 'low-id',
            ruleId: 'excessive-permissions',
            severity: 'low',
            file: '/repo/.github/workflows/b.yml',
            line: 1,
            fields: { scope: 'workflow-default-unspecified' },
          },
          {
            id: 'high-id',
            ruleId: 'unpinned-action',
            severity: 'high',
            file: '/repo/.github/workflows/a.yml',
            line: 12,
            fields: { action: 'actions/checkout@v5' },
          },
          {
            id: 'medium-id',
            ruleId: 'excessive-permissions',
            severity: 'medium',
            file: '.github\\workflows\\c.yml',
            line: 4,
            fields: { scope: 'write-all' },
          },
        ],
      },
    });

    expect(annotations.map(annotation => annotation.level)).toEqual([
      'error',
      'warning',
      'notice',
    ]);
    expect(annotations[0]).toMatchObject({
      file: '.github/workflows/a.yml',
      line: 12,
      title: 'actions-warden: unpinned-action',
      id: 'high-id',
    });
    expect(annotations[0].message).toContain('action=actions/checkout@v5');
    expect(annotations[1].file).toBe('.github/workflows/c.yml');
  });

  it('escapes workflow-command injection in data and properties', () => {
    const rendered = renderAnnotationCommands([{
      level: 'error',
      title: 'rule: bad, title',
      message: `unsafe%\r\n::error file=owned::injected ghp_${'a'.repeat(35)}`,
      file: '.github/workflows/a,b.yml',
      line: 2,
    }]);

    expect(rendered.match(/^::/gm)).toHaveLength(1);
    expect(rendered).toContain('file=.github/workflows/a%2Cb.yml');
    expect(rendered).toContain('title=rule%3A bad%2C title');
    expect(rendered).toContain('unsafe%25%0D%0A::error file=owned::injected');
    expect(rendered).toContain('<redacted>');
    expect(rendered).not.toContain(`ghp_${'a'.repeat(35)}`);
  });

  it('caps every level at ten and reports omitted counts', () => {
    const annotations = ['error', 'warning', 'notice'].flatMap(level => (
      Array.from({ length: 12 }, (_, index) => ({
        level,
        severity: level === 'error' ? 'high' : level === 'warning' ? 'medium' : 'low',
        title: `rule-${index}`,
        message: `finding ${index}`,
        file: `.github/workflows/${index}.yml`,
        line: index + 1,
      }))
    ));

    const limited = limitAnnotations(annotations);
    expect(limited.emitted).toHaveLength(30);
    expect(limited.omitted).toBe(6);
    expect(limited.omittedByLevel).toEqual({ error: 2, warning: 2, notice: 2 });
  });

  it('omits source metadata for paths outside the workspace', () => {
    const annotations = collectAnnotations({
      command: 'verify',
      cwd: '/repo',
      result: {
        warnings: [],
        errors: [{
          id: 'outside',
          file: '/other/workflow.yml',
          line: 8,
          error: 'not verifiable',
        }],
      },
    });

    expect(annotations[0]).not.toHaveProperty('file');
    expect(annotations[0]).not.toHaveProperty('line');
  });

  it('reports organization findings without attaching them to the runner repository', () => {
    const annotations = collectAnnotations({
      command: 'org-scan',
      cwd: '/repo',
      result: {
        findings: [{
          id: 'remote-finding',
          ruleId: 'unpinned-action',
          severity: 'high',
          repository: 'octo-org/app',
          file: '/repo/octo-org/app/.github/workflows/ci.yml',
          line: 8,
          fields: {
            file: 'octo-org/app/.github/workflows/ci.yml',
            action: 'actions/checkout@v5',
          },
        }],
        errors: [],
      },
    });
    expect(annotations[0]).not.toHaveProperty('file');
    expect(annotations[0].message).toContain('octo-org/app/.github/workflows/ci.yml');
  });
});
