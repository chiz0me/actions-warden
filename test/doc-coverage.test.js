import { describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  checkDocumentationCoverage,
  exportedDeclarationComment,
  findExportedDeclaration,
  parsePublicReexports,
  tableEntries,
} from '../scripts/doc-coverage.js';

const repository = resolve(import.meta.dirname, '..');

describe('documentation coverage', () => {
  it('covers every current public surface and public export comment', async () => {
    const result = await checkDocumentationCoverage({ root: repository });

    expect(result.errors).toEqual([]);
    expect(result.percentage).toBe(100);
    expect(result.covered).toBe(364);
    expect(result.total).toBe(364);
    expect(result.byCategory).toEqual({
      'Action inputs documented': { covered: 33, total: 33 },
      'Action outputs documented': { covered: 23, total: 23 },
      'Audit rules documented': { covered: 11, total: 11 },
      'CLI commands documented': { covered: 7, total: 7 },
      'CLI options documented': { covered: 36, total: 36 },
      'Documentation guides indexed': { covered: 7, total: 7 },
      'Examples indexed': { covered: 18, total: 18 },
      'Exported runtime functions commented': { covered: 129, total: 129 },
      'JavaScript exports commented': { covered: 47, total: 47 },
      'JavaScript exports documented': { covered: 47, total: 47 },
      'Package entry points documented': { covered: 6, total: 6 },
    });
  }, 15_000);

  it('detects undocumented declarations while accepting direct JSDoc', () => {
    expect(exportedDeclarationComment(
      '/** Public contract. */\nexport function documented() {}\n',
      'documented',
    )).toBe('documented');
    expect(exportedDeclarationComment(
      '// A line comment is not API JSDoc.\nexport const undocumented = 1;\n',
      'undocumented',
    )).toBe('missing-comment');
    expect(exportedDeclarationComment('/** */\nexport const empty = 1;\n', 'empty'))
      .toBe('missing-comment');
    expect(exportedDeclarationComment(
      '/** File overview. */\nconst internal = 1;\nexport const indirect = 2;\n',
      'indirect',
    )).toBe('missing-comment');
    expect(exportedDeclarationComment('export const other = 1;\n', 'missing'))
      .toBe('missing-declaration');
  });

  it('follows re-exports to the module that declares the export', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'aw-doc-reexport-'));
    try {
      await writeFile(join(directory, 'barrel.js'), "export { alias as renamed, plain } from './impl.js';\n");
      await writeFile(join(directory, 'impl.js'), [
        '/** Documented. */',
        'export function alias() {}',
        'export function plain() {}',
        '',
      ].join('\n'));
      const renamed = await findExportedDeclaration(join(directory, 'barrel.js'), 'renamed');
      expect(renamed.sourcePath).toBe(join(directory, 'impl.js'));
      expect(exportedDeclarationComment(renamed.source, 'alias')).toBe('documented');

      const plain = await findExportedDeclaration(join(directory, 'barrel.js'), 'plain');
      expect(exportedDeclarationComment(plain.source, 'plain')).toBe('missing-comment');

      const absent = await findExportedDeclaration(join(directory, 'barrel.js'), 'nothing');
      expect(absent.sourcePath).toBe(join(directory, 'barrel.js'));
      expect(exportedDeclarationComment(absent.source, 'nothing')).toBe('missing-declaration');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('parses aliased root exports and non-empty Markdown table entries', () => {
    expect(parsePublicReexports(`
      export { internal as publicName, direct } from './module.js';
    `)).toEqual([
      {
        importedName: 'internal',
        publicName: 'publicName',
        modulePath: './module.js',
      },
      {
        importedName: 'direct',
        publicName: 'direct',
        modulePath: './module.js',
      },
    ]);
    expect(tableEntries(`
      | export | purpose |
      |---|---|
      | \`publicName\` | Public contract |
    `).get('publicName')?.description).toBe('Public contract');
  });
});
