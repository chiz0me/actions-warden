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
  scope,
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
| `discovery-completed` | `discovered`, `eligible`, `selected` |
| `repository-started` | `repository`, `position`, `total` |
| `request-retry` | optional `repository`, `attempt`, `maxRetries`, `reason`, `delayMs`, optional `status` |
| `repository-completed` | `repository`, `completed`, `total`, `reused`, `status`, `files`, `findings`, `errors` |
| `scan-completed` | `organization`, `status`, `completed`, `total`, `reused`, `findings`, `errors`, `elapsedMs` |

Progress is observational and is not included in the returned result or its
rendered wire formats.

The CLI's `--agent-mode` is an output-routing adapter, not a
`scanOrganization()` option. JavaScript callers already control checkpoint
paths, progress callbacks, rendering, persistence, and how much of the returned
object enters an AI context. Implement the same bounded behavior by saving the
rendered report and returning only `status`, `summary`, and the saved path to
the agent.

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
`renderText`, `renderSarif`, `summarize`, and `SEVERITY_ORDER`.

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

Command entry points are also available as explicit package subpaths:

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
