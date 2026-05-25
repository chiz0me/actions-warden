/**
 * Rule registry.
 */

import * as unpinned from './unpinned-action.js';
import * as perms from './excessive-permissions.js';
import * as secrets from './secrets-in-env.js';
import * as injection from './script-injection.js';
import * as prTarget from './pull-request-target-checkout.js';

export const RULES = [unpinned, perms, secrets, injection, prTarget];

/**
 * @returns {Array<{id: string, severity: string, description: string}>}
 */
export function listRules() {
  return RULES.map(r => ({ id: r.id, severity: r.severity, description: r.description }));
}
