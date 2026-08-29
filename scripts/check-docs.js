#!/usr/bin/env node

import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRECTORIES = new Set(['.git', 'dist', 'node_modules']);
const DOCUMENT_NAMES = new Set(['llms.txt']);
const MARKDOWN_LINK = /!?\[[^\]]*]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\s*\)/g;

const documents = (await walk(ROOT))
  .filter(path => extname(path).toLowerCase() === '.md' || DOCUMENT_NAMES.has(relative(ROOT, path)))
  .sort();

const headingCache = new Map();
const errors = [];

for (const document of documents) {
  const source = await readFile(document, 'utf8');
  let fenced = false;
  const lines = source.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;

    for (const match of line.matchAll(MARKDOWN_LINK)) {
      const rawTarget = match[1].replace(/^<|>$/g, '');
      if (
        rawTarget.startsWith('#')
        || rawTarget.startsWith('//')
        || /^[a-z][a-z0-9+.-]*:/i.test(rawTarget)
      ) continue;

      const [encodedPath, encodedFragment] = rawTarget.split('#', 2);
      let decodedPath;
      let fragment;
      try {
        decodedPath = decodeURIComponent(encodedPath);
        fragment = encodedFragment ? decodeURIComponent(encodedFragment) : '';
      } catch {
        errors.push(`${display(document)}:${index + 1}: invalid URI encoding in ${rawTarget}`);
        continue;
      }

      const target = resolve(dirname(document), decodedPath || '.');
      if (isOutsideRoot(target)) {
        errors.push(`${display(document)}:${index + 1}: link escapes repository: ${rawTarget}`);
        continue;
      }

      let targetStats;
      try {
        targetStats = await stat(target);
      } catch {
        errors.push(`${display(document)}:${index + 1}: missing link target: ${rawTarget}`);
        continue;
      }

      if (fragment && targetStats.isFile() && isMarkdownDocument(target)) {
        const headings = await headingsFor(target);
        if (!headings.has(fragment.toLowerCase())) {
          errors.push(`${display(document)}:${index + 1}: missing heading #${fragment} in ${display(target)}`);
        }
      }
    }
  }
}

if (errors.length > 0) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`documentation links OK (${documents.length} files)\n`);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    if (entry.isFile()) files.push(path);
  }
  return files;
}

async function headingsFor(path) {
  if (headingCache.has(path)) return headingCache.get(path);
  const source = await readFile(path, 'utf8');
  const headings = new Set();
  const seen = new Map();
  let fenced = false;

  for (const line of source.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;

    const match = line.match(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (!match) continue;

    const base = githubSlug(match[1]);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    headings.add(count === 0 ? base : `${base}-${count}`);
  }

  headingCache.set(path, headings);
  return headings;
}

function githubSlug(heading) {
  return heading
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

function isMarkdownDocument(path) {
  return extname(path).toLowerCase() === '.md' || DOCUMENT_NAMES.has(relative(ROOT, path));
}

function isOutsideRoot(path) {
  const pathFromRoot = relative(ROOT, path);
  return pathFromRoot === '..'
    || pathFromRoot.startsWith(`..${sep}`)
    || isAbsolute(pathFromRoot);
}

function display(path) {
  return relative(ROOT, path).split(sep).join('/');
}
