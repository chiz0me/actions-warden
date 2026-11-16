/**
 * Shared JSDoc type definitions for audit findings and organization reports.
 * This module has no runtime exports; files that opt in with `// @ts-check`
 * import the types with `import('./types.js')`.
 */

/**
 * @typedef {'low'|'medium'|'high'|'critical'} Severity
 */

/**
 * One audit finding as produced by `audit` and `auditSources`.
 *
 * @typedef {object} Finding
 * @property {string} id Stable source-occurrence ID.
 * @property {string} [fingerprint] Line-independent baseline identity.
 * @property {string} ruleId Rule that produced the finding, or `parse-error`.
 * @property {Severity} severity
 * @property {string} file Path of the audited file.
 * @property {number} line One-based line, or 0 when there is no line.
 * @property {Record<string, unknown>} fields Rule-specific structured evidence.
 * @property {string} [explain] Remediation text, present when requested.
 */

/**
 * A finding reported by an organization scan, with its repository and source
 * locations.
 *
 * @typedef {Finding & {
 *   repository: string,
 *   branch: string|null,
 *   url: string,
 *   path: string,
 *   blobSha: string|null,
 *   permalink: string
 * }} OrganizationFinding
 */

/**
 * One workflow file selected for a repository, whether or not it could be read.
 *
 * @typedef {object} FileDetail
 * @property {string} path Repo-relative POSIX path.
 * @property {string|null} blobSha Lowercase 40-hex blob ID from the tree entry.
 * @property {number|null} bytes Decoded size when read, else tree size, else null.
 * @property {'scanned'|'parse-error'|'unreadable'} status
 * @property {number} findings Unsuppressed findings reported for this file.
 * @property {string} permalink Link pinned to the scanned commit.
 */

/**
 * @typedef {object} RepositoryInfo
 * @property {string} owner
 * @property {string} name
 * @property {string} fullName
 * @property {string|null} defaultBranch
 * @property {'public'|'private'|'internal'} visibility
 * @property {string} htmlUrl
 */

/**
 * The scan result for one repository in the public report document.
 *
 * @typedef {object} RepositoryResult
 * @property {RepositoryInfo} repository
 * @property {{branch: string|null, treeSha: string|null, commitSha: string|null}} revision
 * @property {string[]} files Workflow files that were read and audited.
 * @property {FileDetail[]} fileDetails Every selected workflow file, sorted by path.
 * @property {OrganizationFinding[]} findings
 * @property {Array<{repository: string, path?: string, error: string, permalink?: string}>} errors
 * @property {Record<string, number>} summary
 * @property {'OK'|'FAIL'} status
 */

/**
 * The credential-redacted public organization report document.
 *
 * @typedef {object} OrganizationReport
 * @property {'1.0'} schemaVersion
 * @property {string} organization
 * @property {{generation: number, identity: string}} analysis
 * @property {Record<string, any>} scope
 * @property {Record<string, any>} coverage
 * @property {RepositoryResult[]} repositories
 * @property {OrganizationFinding[]} findings Flattened across repositories.
 * @property {RepositoryResult['errors']} errors Flattened across repositories.
 * @property {Record<string, number>} summary
 * @property {{path: string|null, suppressed: number}} baseline
 * @property {string|null} configPath
 * @property {Record<string, any>} [comparison]
 * @property {'OK'|'FAIL'} status
 */

/**
 * The raw value returned by `scanOrganization`, before redaction and before
 * paths are made relative. Its shape matches the public report document.
 *
 * @typedef {Omit<OrganizationReport, 'schemaVersion'>} OrganizationScanResult
 */

/**
 * Options accepted by `scanOrganization`.
 *
 * @typedef {object} OrganizationScanOptions
 * @property {string} organization
 * @property {string} cwd
 * @property {string} [token]
 * @property {string[]} [repositories]
 * @property {'all'|'public'|'private'|'internal'} visibility
 * @property {boolean} includeArchived
 * @property {boolean} includeDisabled
 * @property {boolean} includeForks
 * @property {number} [maxRepositories]
 * @property {number} [concurrency]
 * @property {Severity} [severity]
 * @property {boolean} explain
 * @property {string|false} [configPath]
 * @property {string} [baseline]
 * @property {string} [checkpointPath]
 * @property {boolean} [resume]
 * @property {(event: ScanProgressEvent) => void|Promise<void>} [onProgress]
 */

/**
 * A progress event emitted during an organization scan. `type` names the event;
 * the remaining fields are event-specific.
 *
 * @typedef {{type: string, reused?: boolean} & Record<string, any>} ScanProgressEvent
 */

/**
 * A labeled line-oriented record shared by TOON, text, CSV, SARIF, and HTML.
 *
 * @typedef {{label: string, fields: Record<string, unknown>}} ReportRecord
 */

export {};
