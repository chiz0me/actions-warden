import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { discoverWorkflows } from '../src/lib/paths.js';

describe('discoverWorkflows', () => {
  it('discovers workflows and composite actions but excludes dependencies', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'actions-warden-paths-'));
    const workflowDir = join(cwd, '.github', 'workflows');
    const compositeDir = join(cwd, '.github', 'actions', 'setup');
    const nestedCompositeDir = join(cwd, 'automation', 'actions', 'build');
    const dependencyDir = join(cwd, 'node_modules', 'third-party');
    await mkdir(workflowDir, { recursive: true });
    await mkdir(compositeDir, { recursive: true });
    await mkdir(nestedCompositeDir, { recursive: true });
    await mkdir(dependencyDir, { recursive: true });
    await writeFile(join(workflowDir, 'ci.yml'), 'jobs: {}\n');
    await writeFile(join(cwd, 'action.yaml'), 'runs: { using: composite, steps: [] }\n');
    await writeFile(join(compositeDir, 'action.yml'), 'runs: { using: composite, steps: [] }\n');
    await writeFile(
      join(nestedCompositeDir, 'action.yml'),
      'runs: { using: composite, steps: [] }\n',
    );
    await writeFile(join(dependencyDir, 'action.yml'), 'runs: { using: composite, steps: [] }\n');

    const files = await discoverWorkflows({ cwd });
    expect(files.map(file => file.slice(cwd.length + 1))).toEqual([
      '.github/actions/setup/action.yml',
      '.github/workflows/ci.yml',
      'action.yaml',
      'automation/actions/build/action.yml',
    ]);
  });
});
