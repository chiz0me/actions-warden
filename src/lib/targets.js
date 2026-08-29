import { discoverWorkflows, resolveWorkflowArg } from './paths.js';

/**
 * Resolve command workflow targets and reject empty scopes.
 *
 * @param {object} input
 * @param {string[]|undefined} input.workflows
 * @param {string} input.cwd
 */
export async function resolveTargets({ workflows, cwd }) {
  if (!workflows || workflows.length === 0) {
    const discovered = await discoverWorkflows({ cwd });
    if (discovered.length === 0) {
      throw new Error('no workflow or composite action files found');
    }
    return discovered;
  }

  const out = new Set();
  for (const workflow of workflows) {
    const files = await resolveWorkflowArg(workflow, cwd);
    if (files.length === 0) {
      throw new Error(`no workflows matched: ${workflow}`);
    }
    for (const file of files) out.add(file);
  }
  return [...out].sort();
}
