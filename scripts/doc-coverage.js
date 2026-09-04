import { readdir, readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import {
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import { pathToFileURL } from 'node:url';
import YAML from 'yaml';

const MARKDOWN_LINK = /!?\[[^\]]*]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\s*\)/g;

/**
 * Verify that every public, user-facing surface has an owning documentation
 * entry, every package-root export has direct JSDoc, and every exported
 * runtime function or class has a directly leading contract comment.
 *
 * @param {{root?: string}} [options]
 */
export async function checkDocumentationCoverage({ root = process.cwd() } = {}) {
  const repository = resolve(root);
  const checks = [];
  const add = (category, item, covered, message) => {
    checks.push({ category, item, covered, message: covered ? '' : message });
  };

  const indexPath = resolve(repository, 'src/index.js');
  const apiPath = resolve(repository, 'docs/JAVASCRIPT-API.md');
  const [indexSource, apiSource] = await Promise.all([
    readFile(indexPath, 'utf8'),
    readFile(apiPath, 'utf8'),
  ]);
  const publicExports = parsePublicReexports(indexSource);
  const exportReference = tableEntries(markdownSection(
    apiSource,
    'Complete root export reference',
  ));
  const publicNames = new Set(publicExports.map(item => item.publicName));

  for (const item of publicExports) {
    const reference = exportReference.get(item.publicName);
    add(
      'JavaScript exports documented',
      item.publicName,
      Boolean(reference?.description),
      `docs/JAVASCRIPT-API.md: missing non-empty reference row for export ${item.publicName}`,
    );

    const sourcePath = resolve(dirname(indexPath), item.modulePath);
    const source = await readFile(sourcePath, 'utf8');
    const commentStatus = exportedDeclarationComment(source, item.importedName);
    add(
      'JavaScript exports commented',
      item.publicName,
      commentStatus === 'documented',
      commentStatus === 'missing-declaration'
        ? `${display(repository, sourcePath)}: exported declaration not found for ${item.importedName}`
        : `${display(repository, sourcePath)}: public export ${item.importedName} needs direct JSDoc`,
    );
  }
  for (const name of exportReference.keys()) {
    if (!publicNames.has(name)) {
      add(
        'JavaScript export reference freshness',
        name,
        false,
        `docs/JAVASCRIPT-API.md: stale root export reference ${name}`,
      );
    }
  }

  const runtimeFiles = (await walkFiles(resolve(repository, 'src')))
    .filter(path => extname(path).toLowerCase() === '.js')
    .sort();
  for (const sourcePath of runtimeFiles) {
    const source = await readFile(sourcePath, 'utf8');
    for (const name of exportedRuntimeExecutables(source)) {
      const commentStatus = exportedDeclarationComment(source, name);
      add(
        'Exported runtime functions commented',
        `${display(repository, sourcePath)}#${name}`,
        commentStatus === 'documented',
        `${display(repository, sourcePath)}: exported runtime function ${name}`
          + ' needs directly leading, non-empty JSDoc',
      );
    }
  }

  const packageData = JSON.parse(await readFile(resolve(repository, 'package.json'), 'utf8'));
  const packageEntries = Object.keys(packageData.exports ?? {})
    .filter(entry => entry !== '.')
    .map(entry => `${packageData.name}/${entry.replace(/^\.\//, '')}`)
    .sort();
  const entryPointReference = tableEntries(markdownSection(apiSource, 'Package entry points'));
  for (const entry of packageEntries) {
    add(
      'Package entry points documented',
      entry,
      Boolean(entryPointReference.get(entry)?.description),
      `docs/JAVASCRIPT-API.md: missing package entry-point row for ${entry}`,
    );
  }
  for (const entry of entryPointReference.keys()) {
    if (!packageEntries.includes(entry)) {
      add(
        'Package entry-point reference freshness',
        entry,
        false,
        `docs/JAVASCRIPT-API.md: stale package entry-point reference ${entry}`,
      );
    }
  }

  const cliPath = resolve(repository, 'src/cli.js');
  const cliDocPath = resolve(repository, 'docs/CLI.md');
  const [cliSource, cliDoc] = await Promise.all([
    readFile(cliPath, 'utf8'),
    readFile(cliDocPath, 'utf8'),
  ]);
  const commands = parseCliCommands(cliSource);
  for (const command of commands) {
    add(
      'CLI commands documented',
      command,
      cliDoc.split(/\r?\n/).some(line => line.trim() === `## \`${command}\``),
      `docs/CLI.md: missing command section ## \`${command}\``,
    );
  }
  const cliOptions = collectCliOptions({ cliPath, commands });
  for (const option of cliOptions) {
    add(
      'CLI options documented',
      option,
      cliDoc.includes(option),
      `docs/CLI.md: missing option reference ${option}`,
    );
  }

  const actionPath = resolve(repository, 'action.yml');
  const actionDocPath = resolve(repository, 'docs/GITHUB-ACTION.md');
  const [actionSource, actionDoc] = await Promise.all([
    readFile(actionPath, 'utf8'),
    readFile(actionDocPath, 'utf8'),
  ]);
  const action = YAML.parse(actionSource);
  const documentedInputs = tableEntries(markdownSection(actionDoc, 'Inputs'));
  const documentedOutputs = tableEntries(markdownSection(actionDoc, 'Outputs and failure policy'));
  addNamedTableCoverage({
    add,
    category: 'Action inputs documented',
    names: Object.keys(action.inputs ?? {}),
    documented: documentedInputs,
    document: 'docs/GITHUB-ACTION.md',
    kind: 'input',
  });
  addNamedTableCoverage({
    add,
    category: 'Action outputs documented',
    names: Object.keys(action.outputs ?? {}),
    documented: documentedOutputs,
    document: 'docs/GITHUB-ACTION.md',
    kind: 'output',
  });

  const configDocPath = resolve(repository, 'docs/CONFIGURATION.md');
  const configDoc = await readFile(configDocPath, 'utf8');
  const documentedRules = tableEntries(markdownSection(configDoc, 'Rule IDs'));
  const rulesModule = await import(pathToFileURL(resolve(repository, 'src/rules/index.js')).href);
  const rules = rulesModule.listRules().map(rule => rule.id).sort();
  addNamedTableCoverage({
    add,
    category: 'Audit rules documented',
    names: rules,
    documented: documentedRules,
    document: 'docs/CONFIGURATION.md',
    kind: 'rule',
  });

  const docsDirectory = resolve(repository, 'docs');
  const docsIndex = await readFile(resolve(docsDirectory, 'README.md'), 'utf8');
  const guides = (await readdir(docsDirectory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && extname(entry.name).toLowerCase() === '.md')
    .map(entry => entry.name)
    .filter(name => name !== 'README.md')
    .sort();
  for (const guide of guides) {
    add(
      'Documentation guides indexed',
      guide,
      docsIndex.includes(`./${guide}`),
      `docs/README.md: missing guide link for ${guide}`,
    );
  }

  const examplesDirectory = resolve(repository, 'examples');
  const exampleFiles = (await walkFiles(examplesDirectory)).sort();
  const reachableExamples = await linkedFilesFrom({
    root: examplesDirectory,
    entry: resolve(examplesDirectory, 'README.md'),
  });
  for (const file of exampleFiles) {
    const name = display(examplesDirectory, file);
    add(
      'Examples indexed',
      name,
      reachableExamples.has(file),
      `examples/README.md: ${name} is not reachable through the examples documentation index`,
    );
  }

  const covered = checks.filter(check => check.covered).length;
  const total = checks.length;
  const byCategory = Object.fromEntries([...new Set(checks.map(check => check.category))]
    .sort()
    .map(category => {
      const categoryChecks = checks.filter(check => check.category === category);
      return [category, {
        covered: categoryChecks.filter(check => check.covered).length,
        total: categoryChecks.length,
      }];
    }));
  return {
    covered,
    total,
    percentage: total === 0 ? 0 : (covered / total) * 100,
    byCategory,
    errors: checks.filter(check => !check.covered).map(check => check.message),
  };
}

/** Parse named ESM re-exports from the package root. */
export function parsePublicReexports(source) {
  const exports = [];
  for (const match of source.matchAll(
    /export\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"]/g,
  )) {
    for (const rawName of match[1].split(',')) {
      const parts = rawName.trim().split(/\s+as\s+/);
      if (!parts[0]) continue;
      exports.push({
        importedName: parts[0],
        publicName: parts[1] ?? parts[0],
        modulePath: match[2],
      });
    }
  }
  return exports;
}

/** Return whether a named exported declaration has directly leading JSDoc. */
export function exportedDeclarationComment(source, name) {
  const declaration = new RegExp(
    `export\\s+(?:async\\s+)?(?:function|const|class)\\s+${escapeRegExp(name)}\\b`,
  ).exec(source);
  if (!declaration) return 'missing-declaration';
  const prefix = source.slice(0, declaration.index).trimEnd();
  const open = prefix.lastIndexOf('/**');
  if (open === -1) return 'missing-comment';
  const close = prefix.indexOf('*/', open);
  if (close === -1 || prefix.slice(close + 2).trim()) return 'missing-comment';
  const content = prefix.slice(open + 3, close).replace(/^\s*\* ?/gm, '').trim();
  return content ? 'documented' : 'missing-comment';
}

/** Return backticked first-column entries and their final non-empty cell. */
export function tableEntries(source) {
  const entries = new Map();
  for (const line of source.split(/\r?\n/)) {
    if (!line.trimStart().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    const name = cells[0]?.match(/^`([^`]+)`$/)?.[1];
    if (!name) continue;
    entries.set(name, {
      cells,
      description: cells.at(-1)?.replace(/^`+|`+$/g, '').trim() ?? '',
    });
  }
  return entries;
}

function addNamedTableCoverage({ add, category, names, documented, document, kind }) {
  const expected = new Set(names);
  for (const name of [...expected].sort()) {
    add(
      category,
      name,
      Boolean(documented.get(name)?.description),
      `${document}: missing non-empty ${kind} row for ${name}`,
    );
  }
  for (const name of documented.keys()) {
    if (!expected.has(name)) {
      add(
        `${category} freshness`,
        name,
        false,
        `${document}: stale ${kind} reference ${name}`,
      );
    }
  }
}

function parseCliCommands(source) {
  return [...new Set([...source.matchAll(/program\.command\(\s*['"]([^'"]+)/g)]
    .map(match => match[1].split(/\s+/, 1)[0]))].sort();
}

function exportedRuntimeExecutables(source) {
  return [...source.matchAll(
    /^export\s+(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)/gm,
  )].map(match => match[1]);
}

function collectCliOptions({ cliPath, commands }) {
  const invocations = [[], ...commands.map(command => [command])];
  const options = new Set();
  for (const invocation of invocations) {
    const result = spawnSync(process.execPath, [cliPath, ...invocation, '--help'], {
      cwd: dirname(dirname(cliPath)),
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    });
    if (result.status !== 0) {
      throw new Error(`could not inspect CLI help for ${invocation[0] ?? 'root command'}`);
    }
    for (const match of result.stdout.matchAll(/--[a-z][a-z0-9-]*/g)) options.add(match[0]);
  }
  return [...options].sort();
}

function markdownSection(source, heading) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex(line => line.trim() === `## ${heading}`);
  if (start === -1) return '';
  const endOffset = lines.slice(start + 1).findIndex(line => /^##\s+/.test(line));
  const end = endOffset === -1 ? lines.length : start + 1 + endOffset;
  return lines.slice(start + 1, end).join('\n');
}

async function linkedFilesFrom({ root, entry }) {
  const boundary = resolve(root);
  const reached = new Set([resolve(entry)]);
  const queue = [resolve(entry)];
  while (queue.length > 0) {
    const document = queue.shift();
    const source = await readFile(document, 'utf8');
    for (const match of source.matchAll(MARKDOWN_LINK)) {
      const rawTarget = match[1].replace(/^<|>$/g, '');
      if (
        rawTarget.startsWith('#')
        || rawTarget.startsWith('//')
        || /^[a-z][a-z0-9+.-]*:/i.test(rawTarget)
      ) continue;
      let decoded;
      try {
        decoded = decodeURIComponent(rawTarget.split('#', 1)[0]);
      } catch {
        continue;
      }
      const target = resolve(dirname(document), decoded);
      if (outside(boundary, target)) continue;
      let metadata;
      try {
        metadata = await stat(target);
      } catch {
        continue;
      }
      if (!metadata.isFile()) continue;
      if (!reached.has(target)) {
        reached.add(target);
        if (extname(target).toLowerCase() === '.md') queue.push(target);
      }
    }
  }
  return reached;
}

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(path));
    if (entry.isFile()) files.push(path);
  }
  return files;
}

function outside(root, path) {
  const fromRoot = relative(root, path);
  return fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot);
}

function display(root, path) {
  return relative(root, path).split(sep).join('/');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
