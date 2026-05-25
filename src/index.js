/**
 * Public programmatic API.
 *
 * Each command can be invoked without spawning a subprocess:
 *
 *   import { audit, pin, upgrade, report } from 'actions-warden';
 *   const result = await audit({ cwd: '/repo' });
 */

export { audit, renderAudit } from './commands/audit.js';
export { pin, renderPin, rewriteUses } from './commands/pin.js';
export { upgrade, renderUpgrade } from './commands/upgrade.js';
export { report, renderReport } from './commands/report.js';
export { listRules } from './rules/index.js';
export { parseWorkflowFile, parseWorkflowSource, collectUses, parseActionRef } from './lib/parser.js';
export { format, renderToon, renderJson, renderText, summarize, SEVERITY_ORDER } from './lib/formatter.js';
export { discoverWorkflows } from './lib/paths.js';
export { redact } from './lib/redact.js';
export { parseIgnoreDirectives, isIgnored } from './lib/ignore.js';
