# JavaScript API

actions-warden is an ECMAScript module for Node.js 20 or newer. Public command
functions return structured objects and do not write reports to stdout.

```sh
npm install actions-warden
```

```js
import { audit } from 'actions-warden';

const result = await audit({
  cwd: '/path/to/repository',
  severity: 'high',
  explain: true,
});

if (result.status === 'FAIL') {
  for (const finding of result.findings) {
    console.log(finding.id, finding.ruleId, finding.file, finding.line);
  }
}
```

From CommonJS, use a dynamic import:

```js
const { audit } = await import('actions-warden');
```

The raw API result does not include `schemaVersion`; renderers add the versioned
wire format.

## Complete root export reference

The package root deliberately exposes a finite public surface. Every export is
listed here; adding an export without a non-empty reference entry fails
`npm run check:docs`.

| export | category | contract |
|---|---|---|
| `audit` | command | Audit discovered or selected local workflow files |
| `auditSources` | command | Audit caller-supplied YAML sources entirely in memory |
| `renderAudit` | renderer | Serialize an audit result in a supported output format |
| `pin` | command | Plan or explicitly apply immutable SHA pins |
| `renderPin` | renderer | Serialize a pin result in a supported output format |
| `rewriteUses` | rewrite utility | Return source with one parsed action reference rewritten to a SHA |
| `upgrade` | command | Plan or explicitly apply cooldown-aware dependency upgrades |
| `renderUpgrade` | renderer | Serialize an upgrade result in a supported output format |
| `report` | command | Combine audit, dry-run pin, and dry-run upgrade results |
| `renderReport` | renderer | Serialize a combined report result |
| `verify` | command | Verify SHA ownership and version metadata against GitHub |
| `renderVerify` | renderer | Serialize a verification result |
| `scanOrganization` | command | Audit eligible organization repositories through read-only GitHub APIs |
| `renderOrganizationScan` | renderer | Serialize an organization scan result |
| `compareOrganizationReports` | comparison | Classify new, resolved, unchanged, and unknown findings across compatible organization reports |
| `loadOrganizationReport` | comparison | Safely load and validate a bounded organization JSON report inside the working directory |
| `listRules` | rule catalog | Return the live rule IDs, default severities, and descriptions |
| `parseWorkflowFile` | parser | Read and parse one workflow or composite-action YAML file |
| `parseWorkflowSource` | parser | Parse one supplied YAML string without executing it |
| `collectUses` | parser utility | Return external, reusable, local, and Docker action references from a parsed document |
| `collectImages` | parser utility | Return job, service, and Docker-action image references from a parsed document |
| `parseActionRef` | parser utility | Classify one `uses` scalar while preserving source location metadata |
| `format` | formatter | Dispatch records to TOON, JSON, text, CSV, SARIF, or HTML rendering |
| `renderToon` | formatter | Render line-oriented TOON records |
| `renderJson` | formatter | Render recursively redacted, indented JSON |
| `renderText` | formatter | Render escaped human-readable records |
| `renderCsv` | formatter | Render deterministic, control-safe, spreadsheet-safe CSV records |
| `renderSarif` | formatter | Render SARIF 2.1.0 results |
| `renderHtml` | formatter | Render a deterministic, self-contained, searchable HTML report |
| `summarize` | formatter utility | Count findings by severity |
| `SEVERITY_ORDER` | constant | Lowest-to-highest severity ordering |
| `discoverWorkflows` | discovery | Discover default or caller-selected workflow paths inside a repository |
| `redact` | security utility | Replace credential-like substrings in one value |
| `parseIgnoreDirectives` | ignore utility | Parse line, block, next-line, and file ignore directives |
| `isIgnored` | ignore utility | Test whether a rule occurrence is inside an ignore scope |
| `loadConfig` | policy | Discover, load, and strictly normalize repository policy |
| `DEFAULT_CONFIG` | policy constant | Normalized built-in policy used when no config file is active |
| `listOrganizationRepositories` | GitHub reader | List every organization repository visible to the supplied token |
| `fetchRepositoryWorkflowTree` | GitHub reader | Fetch and validate a default-branch workflow tree snapshot |
| `fetchRepositoryWorkflows` | GitHub reader | Fetch bounded workflow YAML blobs from a validated tree |
| `isWorkflowPath` | GitHub reader utility | Test whether a Git tree path is in remote workflow discovery scope |
| `MAX_WORKFLOW_BYTES` | limit | Maximum decoded bytes accepted for one remote YAML file |
| `MAX_WORKFLOW_FILES` | limit | Maximum remote workflow files accepted per repository |
| `MAX_REPOSITORY_WORKFLOW_BYTES` | limit | Maximum cumulative decoded YAML bytes accepted per repository |
| `loadBaseline` | baseline | Load and validate accepted finding IDs and fingerprints |
| `serializeBaseline` | baseline | Serialize reviewed findings deterministically, excluding parser failures |
| `assignBaselineFingerprints` | baseline | Attach stable semantic fingerprints to finding objects |

## Package entry points

The command modules are also available as explicit package subpaths. Each
subpath exposes the exports declared by its referenced command module.

| entry point | primary exports |
|---|---|
| `actions-warden/commands/audit` | `audit`, `auditSources`, `renderAudit` |
| `actions-warden/commands/pin` | `pin`, `renderPin`, `rewriteUses` |
| `actions-warden/commands/upgrade` | `upgrade`, `renderUpgrade` |
| `actions-warden/commands/report` | `report`, `renderReport` |
| `actions-warden/commands/verify` | `verify`, `renderVerify` |
| `actions-warden/commands/org-scan` | `scanOrganization`, `renderOrganizationScan` |

## Command functions

### `audit(options)`

```js
const result = await audit({
  cwd,
  workflows,       // string[] of files, directories, or globs
  severity,        // low | medium | high | critical
  explain,         // boolean
  configPath,      // string, false to disable policy, or undefined for discovery
  baseline,        // baseline path
  ignoreBaseline,  // boolean; primarily used while creating a baseline
});
```

Returns:

```js
{
  files,
  findings,
  allFindings,
  summary,
  baseline,
  configPath,
  status
}
```

`findings` reflects severity and baseline filtering. `allFindings` is the
unfiltered rule output used to create a baseline.

### `auditSources(options)`

Audit caller-supplied YAML without writing it to disk:

```js
import { auditSources, DEFAULT_CONFIG } from 'actions-warden';

const result = await auditSources({
  cwd: '/virtual/root',
  sources: [
    {
      file: '/virtual/root/acme/service/.github/workflows/ci.yml',
      source: workflowYaml,
    },
  ],
  severity: 'high',
  explain: true,
  config: DEFAULT_CONFIG,
});
```

Every source needs a unique string `file` and string `source`. The function uses
the same parser, ignore directives, identities, and rules as local audit. It
does not execute supplied YAML.

When passing a custom config, use the normalized shape returned by `loadConfig`,
not raw YAML keys.

#### Embedding in a broader repository scanner

If a caller already owns GitHub discovery and has downloaded a bounded,
revision-identified evidence snapshot, call `auditSources` for the workflow
files in that snapshot. Do not also call `scanOrganization` for the same
repositories: two independent discovery passes can consume extra API quota and
can observe different tree revisions.

The ownership boundary is:

- the embedding scanner owns authentication, organization inventory, Git tree
  completeness, blob-size limits, snapshot identity, cache/checkpoint policy,
  non-workflow checks, and aggregate reporting;
- actions-warden owns YAML parsing, ignore-directive behavior, finding
  identity, severity/baseline filtering, and the complete rule catalog returned
  by `listRules()`;
- repository source remains data: neither side should import or execute it.

Pass unique paths rooted under one stable virtual `cwd` so finding IDs and
relative paths remain deterministic. Cache identity must include the exact
actions-warden version and live rule catalog, in addition to the repository
revision and caller policy. A rule upgrade must not reuse results from a prior
catalog.

### `pin(options)`

```js
const result = await pin({
  cwd,
  workflows,
  dryRun: true,    // default
  token,
  fix,             // optional stable change ID
});
```

Returns `{ changes, errors, status }`. Set `dryRun: false` only after explicit
write authorization.

### `verify(options)`

```js
const result = await verify({ cwd, workflows, token });
```

Returns `{ files, checks, warnings, errors, status }`. Warnings do not make the
status fail.

### `upgrade(options)`

```js
const result = await upgrade({
  cwd,
  workflows,
  dryRun: true,    // default
  token,
  mode: 'minor',   // major | minor | patch
  minAgeDays: 7,
  fix,
});
```

Returns `{ changes, skipped, errors, status }`.

### `report(options)`

```js
const result = await report({
  cwd,
  workflows,
  token,
  mode: 'minor',
  severity: 'high',
  explain: true,
  skipResolve: false,
  minAgeDays: 7,
  configPath,
  baseline,
});
```

Returns `{ audit, pin, upgrade, offline, status }`. Both mutation phases are
always dry-runs.

### `scanOrganization(options)`

```js
const result = await scanOrganization({
  organization: 'my-org',
  cwd: process.cwd(),
  token: process.env.GITHUB_TOKEN,
  repositories: ['service-*', 'my-org/platform-*'],
  visibility: 'all',
  includeArchived: false,
  includeDisabled: false,
  includeForks: false,
  maxRepositories: 100,
  concurrency: 4,
  severity: 'high',
  explain: true,
  configPath: '.actions-warden.yml',
  baseline: '.actions-warden-baseline.json',
  checkpointPath: '.actions-warden-org-checkpoint.json',
  resume: false,
  onProgress(event) {
    console.error(event.type, event.repository ?? '');
  },
});
```

Returns:

```js
{
  organization,
  analysis,
  scope,
  coverage,
  repositories,
  findings,
  errors,
  summary,
  baseline,
  configPath,
  status
}
```

`findings` and `errors` are flattened for ingestion. `repositories` retains
per-repository identity, revision, files, findings, errors, summary, and status.
`analysis` contains a compatibility generation and stable public identity that
covers scan scope, policy, baseline contents, and the rule catalog.
`coverage` distinguishes successful coverage of selected repositories from
complete coverage of every eligible repository; `maxRepositories` can make it
incomplete without changing an otherwise clean selected result to `FAIL`.

The organization scan is read-only and does not clone, check out, execute, or
persist raw remote workflow sources. Repository failures are accumulated when
possible; failures that prevent organization discovery throw.

`checkpointPath` explicitly enables atomic checkpoint writes inside `cwd`.
Set `resume: true` to require, validate, and update an existing checkpoint at
that path. The organization, selection and audit options, normalized policy,
baseline contents, analysis generation, and rule catalog must match.
Concurrency, token, and compatible package-version changes are allowed. The
producing package version remains metadata, and compatible older checkpoints
are atomically migrated on the first successful resume. Resume performs fresh
discovery and tree reads; it reuses only error-free results whose repository,
default branch, and tree SHA remain unchanged. Checkpoints contain redacted
report data and revision metadata, never tokens or raw YAML.

`onProgress` may be synchronous or asynchronous and is awaited in event order
at each emission point. A callback error rejects the scan; repository results
whose completion event was reached have already been checkpointed. Event
objects are shallow-frozen and use these `type` values:

| type | important fields |
|---|---|
| `scan-started` | `organization` |
| `checkpoint-loaded` | `repositories` |
| `checkpoint-created` | none |
| `discovery-started` | `organization` |
| `discovery-page` | `organization`, `page`, `repositoriesDiscovered`, optional `rateLimitRemaining` |
| `discovery-completed` | `discovered`, `eligible`, `selected` |
| `repository-started` | `repository`, `position`, `total`, `completed`, `active`, `concurrency` |
| `repository-phase` | `repository`, `position`, `total`, `completed`, `active`, `concurrency`, `phase` |
| `request-retry` | optional `repository`, `attempt`, `maxRetries`, `reason`, `delayMs`, optional `status` |
| `checkpoint-written` | `repository`, `position`, `total`, `repositories` |
| `repository-completed` | `repository`, `completed`, `total`, `reused`, `status`, `files`, `findings`, `errors`, `active`, `concurrency` |
| `scan-completed` | `organization`, `status`, `completed`, `total`, `reused`, `findings`, `errors`, `elapsedMs` |

Progress is observational and is not included in the returned result or its
rendered wire formats.

The CLI's `--agent-mode` is an output-routing adapter, not a
`scanOrganization()` option. JavaScript callers already control checkpoint
paths, progress callbacks, rendering, persistence, and how much of the returned
object enters an AI context. Implement the same bounded behavior by saving the
rendered report and returning only `status`, `summary`, and the saved path to
the agent.

### Comparing organization reports

Load a prior JSON report, create the current JSON contract, and compare their
semantic finding fingerprints:

```js
import {
  compareOrganizationReports,
  loadOrganizationReport,
  renderOrganizationScan,
  scanOrganization,
} from 'actions-warden';

const previous = await loadOrganizationReport({
  path: 'reports/org.previous.json',
  cwd: '/repo',
});
const currentResult = await scanOrganization({
  organization: 'my-org',
  cwd: '/repo',
  token: process.env.GITHUB_TOKEN,
  severity: 'high',
});
const current = JSON.parse(renderOrganizationScan(currentResult, {
  format: 'json',
  cwd: '/repo',
}));
const comparison = compareOrganizationReports({ previous, current });
const html = renderOrganizationScan(currentResult, {
  format: 'html',
  cwd: '/repo',
  comparison,
});
```

Comparison requires matching analysis identities. It returns deterministically
ordered `new`, `resolved`, `unchanged`, and `unknown` finding arrays. A prior
finding is resolved only when the current report successfully covered that
repository without parse failures; missing, failed, or unparseable repositories
make resolution unknown.

## Renderers

Use the matching renderer to obtain the CLI-compatible wire format:

```js
import { audit, renderAudit } from 'actions-warden';

const result = await audit({ cwd: '/repo', explain: true });

const json = renderAudit(result, {
  format: 'json',
  explain: true,
  cwd: '/repo',
});

const toon = renderAudit(result, {
  format: 'toon',
  explain: true,
  cwd: '/repo',
});
```

Command/render pairs are:

| command | renderer |
|---|---|
| `audit` | `renderAudit` |
| `pin` | `renderPin` |
| `upgrade` | `renderUpgrade` |
| `verify` | `renderVerify` |
| `report` | `renderReport` |
| `scanOrganization` | `renderOrganizationScan` |

Lower-level formatters are also exported: `format`, `renderToon`, `renderJson`,
`renderText`, `renderCsv`, `renderSarif`, `renderHtml`, `summarize`, and
`SEVERITY_ORDER`.

`renderCsv(records, options)` accepts labeled records plus optional `status`.
It emits a deterministic union header, one physical row per record, and a final
status row. Nested values become compact JSON cells, control characters are
escaped, formula-like strings are neutralized, and credentials are redacted.

`renderHtml(records, options)` accepts the same labeled records used by TOON
and text plus optional `status`, `title`, and `metadata`. It redacts and escapes
dynamic values, permits only HTTPS links, loads no external assets, and rejects
documents larger than 32 MiB.

Every renderer applies credential redaction. See [output contracts](./OUTPUTS.md)
before depending on the serialized structure.

## Parser and policy utilities

The package root exports:

```js
import {
  collectImages,
  collectUses,
  discoverWorkflows,
  isIgnored,
  loadConfig,
  parseActionRef,
  parseIgnoreDirectives,
  parseWorkflowFile,
  parseWorkflowSource,
} from 'actions-warden';
```

Additional exports include baseline helpers, organization GitHub readers
(`listOrganizationRepositories`, `fetchRepositoryWorkflowTree`, and
`fetchRepositoryWorkflows`), redaction, the live rule catalog, and organization
size limits. A validated workflow-tree snapshot can be supplied to
`fetchRepositoryWorkflows` to avoid a duplicate tree request. See
[src/index.js](../src/index.js) for the exact export list in the checked-out
version.

The [package entry-point table](#package-entry-points) is exhaustive. Example
subpath imports:

```js
import { audit } from 'actions-warden/commands/audit';
import { scanOrganization } from 'actions-warden/commands/org-scan';
```

## Error handling

Command functions use two error channels:

- per-file or per-repository operational problems are usually returned in an
  `errors` array with status `FAIL`;
- invalid top-level input, unsafe paths, invalid policy, failed target
  discovery, or inability to list an organization rejects the promise.

Handle both:

```js
try {
  const result = await scanOrganization(options);

  if (result.status === 'FAIL') {
    for (const error of result.errors) {
      console.error(error.repository, error.path, error.error);
    }
  }
} catch (error) {
  console.error('scan could not start:', error.message);
}
```

Do not log tokens or raw credentials in an error handler. Built-in renderers
redact their output; arbitrary caller logging does not.

## Concurrency

Network-backed helpers use bounded concurrency. `pin` and `verify` resolve up to
four references at once. Organization scans accept `concurrency` from 1 through
16 and default to 4.

Do not mutate shared workflow files concurrently through multiple `pin` or
`upgrade` calls. Run a single plan/write cycle for a repository.

## Related guides

- [CLI reference](./CLI.md)
- [Output contracts](./OUTPUTS.md)
- [AI and coding agents](./AI-AGENTS.md)
- [Developer guide](./DEVELOPMENT.md)
