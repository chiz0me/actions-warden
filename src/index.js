/**
 * Public programmatic API.
 *
 * Each command can be invoked without spawning a subprocess:
 *
 *   import { audit, pin, upgrade, report, scanOrganization } from 'actions-warden';
 *   const result = await audit({ cwd: '/repo' });
 */

export { audit, auditSources, renderAudit } from './commands/audit.js';
export { pin, renderPin, rewriteUses } from './commands/pin.js';
export { upgrade, renderUpgrade } from './commands/upgrade.js';
export { report, renderReport } from './commands/report.js';
export { verify, renderVerify } from './commands/verify.js';
export { scanOrganization, renderOrganizationScan } from './commands/org-scan.js';
export { listRules } from './rules/index.js';
export { parseWorkflowFile, parseWorkflowSource, collectUses, collectImages, parseActionRef } from './lib/parser.js';
export { format, renderToon, renderJson, renderText, renderCsv, renderSarif, renderHtml, summarize, SEVERITY_ORDER } from './lib/formatter.js';
export { discoverWorkflows } from './lib/paths.js';
export { redact } from './lib/redact.js';
export { parseIgnoreDirectives, isIgnored } from './lib/ignore.js';
export { loadConfig, DEFAULT_CONFIG } from './lib/config.js';
export {
  fetchRepositoryWorkflowTree,
  fetchRepositoryWorkflows,
  isWorkflowPath,
  listOrganizationRepositories,
  MAX_REPOSITORY_WORKFLOW_BYTES,
  MAX_WORKFLOW_BYTES,
  MAX_WORKFLOW_FILES,
} from './lib/github-org.js';
export {
  assignBaselineFingerprints,
  loadBaseline,
  serializeBaseline,
} from './lib/baseline.js';
export {
  compareOrganizationReports,
  loadOrganizationReport,
} from './lib/org-report-comparison.js';
