/**
 * Rule registry.
 */

import * as unpinned from './unpinned-action.js';
import * as unpinnedDocker from './unpinned-docker-action.js';
import * as unpinnedContainer from './unpinned-container-image.js';
import * as perms from './excessive-permissions.js';
import * as secrets from './secrets-in-env.js';
import * as injection from './script-injection.js';
import * as prTarget from './pull-request-target-checkout.js';
import * as reusableSecrets from './reusable-workflow-secrets.js';
import * as selfHosted from './untrusted-self-hosted-runner.js';
import * as workflowRunArtifact from './workflow-run-artifact-execution.js';
import * as workflowStructure from './workflow-structure.js';

export const RULES = [
  unpinned,
  unpinnedDocker,
  unpinnedContainer,
  perms,
  secrets,
  injection,
  prTarget,
  reusableSecrets,
  selfHosted,
  workflowRunArtifact,
  workflowStructure,
];

/**
 * @returns {Array<{id: string, severity: string, description: string}>}
 */
export function listRules() {
  return RULES.map(r => ({ id: r.id, severity: r.severity, description: r.description }));
}
