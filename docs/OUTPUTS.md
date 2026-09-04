# Output contracts

actions-warden separates three concepts:

- the selected serialization format;
- the result's semantic `status`;
- the process exit code used by a shell or CI runner.

Automation should read all three deliberately.

## Formats

| format | contract | use case |
|---|---|---|
| `toon` | Labeled, one-record-per-line text | Compact terminal or LLM context |
| `json` | Command-specific object with `schemaVersion: "1.0"` | Programmatic integrations |
| `text` | Bracketed, one-record-per-line text | Human-readable logs |
| `csv` | Flat RFC 4180-compatible record table | Spreadsheets, warehouses, and compliance exports |
| `sarif` | SARIF 2.1.0 JSON | Code scanning and compatible tooling |
| `html` | Self-contained interactive document | Human review and retained artifacts |

Select a format with `--format`. Repository commands default to `toon`.
`org-scan` defaults to JSON saved in a guarded scope-keyed file, because a
complete organization result can be large and may expose private security
posture.

All serialized values pass through credential redaction. Known token formats,
credential-shaped key/value pairs, private keys, JWTs, and likely high-entropy
secrets are replaced with `<redacted>`. Do not use the output as a secret
transport.

## Status and exit codes

Every normal command result has semantic status `OK` or `FAIL`. TOON ends with
`STATUS: ...`; JSON has a top-level `status`; text ends with `==> ...`; CSV ends
with a `STATUS` record; HTML shows the status in its report header.

| command | `OK` | `FAIL` |
|---|---|---|
| `audit` | No unsuppressed findings | One or more findings |
| `pin` | Resolution and planning/writes had no errors | One or more errors |
| `upgrade` | Resolution and planning/writes had no errors | One or more errors |
| `verify` | No verification errors; warnings are allowed | One or more verification errors |
| `report` | Audit, pin plan, and upgrade plan are all `OK` | Any phase is `FAIL` |
| `org-scan` | No findings and no repository errors | Findings or repository errors |
| `rules` | Rule catalog rendered | Not applicable during a normal result |

The CLI maps results to process codes:

| code | meaning |
|---|---|
| `0` | Semantic status `OK` (No unsuppressed findings) |
| `1` | Semantic status `FAIL`; findings were reported, inspect the emitted report |
| `2` | Invalid arguments, invalid policy, unsafe paths, or another invocation-level failure |

> [!NOTE]
> **Why exit code 1 is normal for findings:**
> Just like linters or compilers in CI/CD, an exit code of `1` allows automated pipelines (such as GitHub Actions or GitLab CI) to flag pull requests containing security vulnerabilities. It does not mean the command crashed; the full structured report is available on stdout (or in the saved report file). Exit code `2` indicates an actual invocation or syntax failure.

An invocation-level failure is normally written to stderr as `error: <message>`. Unknown
options, missing values, invalid choices, conflicting flags, malformed numeric
values, unsafe destinations, and a missing command all return `2`. The failure
may occur before a structured payload can be rendered, so do not assume stdout
contains JSON when the process exits `2`.

Organization-scan live progress is also a stderr-only channel. It never becomes
part of JSON, CSV, SARIF, TOON, text, or HTML stdout. `--progress=auto` enables
plain lines for an interactive stderr, `plain` enables human-readable output,
`json` emits JSON Lines, and `none` disables it. `always` and `never` are
compatibility aliases for `plain` and `none`. Once a JSON progress channel has
started, a fatal scan error is represented by `scan-failed` instead of an
additional plain `error:` line. GitHub Action organization scans show the same
phase, repository, retry, checkpoint, and completion updates in the step log by
default.

Each `--progress=json` line is an independently parseable object:

```js
{
  schemaVersion: '1.0',
  kind: 'actions-warden-org-scan-progress',
  event: string,
  timestamp: string, // ISO 8601 UTC
  elapsedMs: number,
  // event-specific bounded fields
}
```

Event names are `scan-started`, `checkpoint-loaded`, `checkpoint-created`,
`discovery-started`, `discovery-page`, `discovery-completed`,
`repository-started`, `repository-phase`, `request-retry`,
`checkpoint-written`, `repository-completed`, `scan-completed`, and
`scan-failed`. A failure after scanning, such as incompatible comparison
evidence or report persistence, emits `command-failed`. Values are
credential-redacted before serialization.

### Organization file receipt

`org-scan` defaults the complete report to a guarded scope-keyed file. Its
stdout is a separate bounded JSON receipt. Normal scans use kind
`actions-warden-org-scan-receipt`; `--agent-mode`, or
`ACTIONS_WARDEN_CONTEXT=agent`, uses `actions-warden-agent-receipt` and disables
implicit progress. `ACTIONS_WARDEN_MODE=agent` remains a legacy alias:

```js
{
  schemaVersion: '1.0',
  kind: 'actions-warden-org-scan-receipt' | 'actions-warden-agent-receipt',
  command: 'org-scan',
  organization: string,
  status: 'OK' | 'FAIL',
  summary: object,
  report: {
    path: string,
    format: 'toon' | 'json' | 'text' | 'csv' | 'sarif' | 'html',
    layout: 'single' | 'directory',
    directory?: string,
    manifest?: string
  },
  checkpoint: {
    path: string | null,
    resumed: boolean,
    repositoriesReused: number
  },
  coverage: {
    complete: boolean,
    enumerationComplete: boolean,
    selectedRepositoriesComplete: boolean,
    eligibleRepositoriesComplete: boolean,
    limitedByMaxRepositories: boolean,
    repositoriesOmittedByLimit: number,
    incompleteRepositories: number
  },
  comparison?: object
}
```

`summary` is the normal bounded organization coverage and severity summary;
the receipt never embeds repository arrays, findings, or operational error
details. When comparison was requested, `comparison` is its bounded count
summary rather than its finding arrays. Read `report.path` for the complete
evidence. The receipt remains JSON even when an explicit format selects TOON,
text, CSV, SARIF, or HTML for the saved report.
`checkpoint.resumed` says that checkpoint input was loaded;
`checkpoint.repositoriesReused` is the exact number whose live revision still
matched. Directory layout receipts also identify the directory and manifest.
Status and process exit semantics are unchanged. An invocation error may occur
before a receipt exists.

Explicit `--output=stdout` overrides the file default. In that case stdout is
the complete report in the selected format and no receipt is appended. The
automatic checkpoint remains enabled unless `--no-auto-checkpoint` is also
passed.

A mutation plan may contain changes and still return `0`: proposed changes are
not errors. Conversely, `audit` may emit valid JSON and return `1`: findings are
the result of a successful scan.

### Shell handling

Do not let `set -e` discard a valid finding report. Capture the exit code and
parse stdout for codes `0` and `1`:

```sh
set +e
actions-warden audit --format=json > actions-warden.json
warden_status=$?
set -e

if [ "$warden_status" -eq 2 ]; then
  echo "actions-warden could not complete" >&2
  exit 2
fi

node -e '
  const fs = require("node:fs");
  const report = JSON.parse(fs.readFileSync("actions-warden.json", "utf8"));
  console.log(report.status, report.summary.findings);
'
```

Writing reports through a guarded output path is safer than shell redirection
when repository path containment matters. `--output-path` implies file output:

```sh
actions-warden audit \
  --format=json \
  --output-path=reports/actions-warden.json
```

The parent directory must exist. Destination safety is checked before command
work, then active policy and baseline collisions are checked again before the
report is written. Explicit `--output=stdout --output-path=...` is rejected.

## TOON

TOON is Token-Oriented Object Notation. Each line is:

```text
LABEL: key=value key=value
```

Values containing whitespace, `=`, quotes, backslashes, or control characters
are JSON-quoted. Empty and null fields are omitted. Embedded newlines are
escaped, so inspected workflow content cannot forge another record.

Record labels by command:

| command | labels before the final status |
|---|---|
| `audit` | `SCAN`, `FINDING`, `SUMMARY` |
| `pin` | `PIN`, `ERROR`, `SUMMARY` |
| `upgrade` | `UPGRADE`, `SKIP`, `ERROR`, `SUMMARY` |
| `verify` | `VERIFIED`, `WARNING`, `ERROR`, `SUMMARY` |
| `report` | `FINDING`, `PIN`, `UPGRADE`, `SKIP`, `ERROR`, `SUMMARY` |
| `org-scan` | `REPOSITORY`, `FINDING`, `ERROR`, `COVERAGE`, optional comparison records, `SUMMARY` |
| `rules` | `RULE` |

Example:

```text
SCAN: file=.github/workflows/ci.yml
FINDING: id=18b82e86d7c14fe2 type=unpinned-action sev=high file=.github/workflows/ci.yml action=actions/checkout@v5 line=14
SUMMARY: files=1 findings=1 totalFindings=1 suppressed=0 critical=0 high=1 medium=0 low=0
STATUS: FAIL
```

Consumers should split only on the first `:`, then parse whitespace-delimited
`key=value` fields with JSON-string awareness. If a real parser is available,
prefer JSON rather than implementing a partial TOON parser.

An organization comparison adds `COMPARISON`, `NEW_FINDING`,
`RESOLVED_FINDING`, `UNCHANGED_FINDING`, and `UNKNOWN_FINDING` records before
the normal organization `SUMMARY`. Text, CSV, and HTML use the same underlying
record set.

## JSON

JSON output is command-specific and ends with a newline. Every top-level object
contains:

```json
{
  "schemaVersion": "1.0",
  "status": "OK"
}
```

Treat `schemaVersion` as the compatibility switch and ignore unknown fields so
additive metadata does not break consumers.

### Finding

Audit and organization findings use this core shape:

```js
{
  id: string,             // stable source-occurrence ID
  fingerprint: string,    // line-independent baseline identity
  ruleId: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  file: string,           // POSIX-style path relative to the selected cwd
  line: number,
  fields: object,         // rule-specific structured evidence
  explain?: string
}
```

Organization findings additionally include `repository`, `branch`, and `url`.
`fields.type`, `fields.sev`, and `fields.file` provide the equivalent flat
fields used by line-oriented formats.

### `audit`

```js
{
  schemaVersion: '1.0',
  files: string[],
  findings: Finding[],
  summary: {
    files: number,
    findings: number,
    totalFindings: number,
    suppressed: number,
    critical: number,
    high: number,
    medium: number,
    low: number
  },
  baseline: { path: string | null, suppressed: number },
  configPath: string | null,
  status: 'OK' | 'FAIL'
}
```

### `pin`

```js
{
  schemaVersion: '1.0',
  dryRun: boolean,
  changes: [{
    id: string,
    file: string,
    action: string,
    fromRef: string,
    toSha: string,
    line: number,
    refType: 'tag' | 'branch' | 'commit'
  }],
  errors: object[],
  status: 'OK' | 'FAIL'
}
```

### `upgrade`

```js
{
  schemaVersion: '1.0',
  dryRun: boolean,
  mode: 'major' | 'minor' | 'patch',
  changes: [{
    id: string,
    file: string,
    action: string,
    fromRef: string,
    fromVersion: string | null,
    toTag: string,
    toSha: string,
    level: 'major' | 'minor' | 'patch' | 'unknown',
    line: number
  }],
  skipped: object[],
  errors: object[],
  status: 'OK' | 'FAIL'
}
```

### `verify`

```js
{
  schemaVersion: '1.0',
  files: string[],
  checks: object[],
  warnings: object[],
  errors: object[],
  status: 'OK' | 'FAIL'
}
```

### `report`

```js
{
  schemaVersion: '1.0',
  audit: {
    files: string[],
    findings: Finding[],
    summary: object,
    baseline: object,
    status: 'OK' | 'FAIL'
  },
  pin: {
    changes: object[],
    errors: object[],
    status: 'OK' | 'FAIL'
  },
  upgrade: {
    changes: object[],
    skipped: object[],
    errors: object[],
    mode: 'major' | 'minor' | 'patch',
    status: 'OK' | 'FAIL'
  },
  offline: boolean,
  status: 'OK' | 'FAIL'
}
```

### `org-scan`

```js
{
  schemaVersion: '1.0',
  organization: string,
  analysis: {
    generation: number,
    identity: string       // stable 64-hex scope/policy/rule identity
  },
  scope: object,
  coverage: {
    complete: boolean,
    enumerationComplete: true,
    selectedRepositoriesComplete: boolean,
    eligibleRepositoriesComplete: boolean,
    limitedByMaxRepositories: boolean,
    repositoriesOmittedByLimit: number,
    incompleteRepositories: string[]
  },
  repositories: [{
    repository: {
      owner: string,
      name: string,
      fullName: string,
      defaultBranch: string | null,
      visibility: 'public' | 'private' | 'internal',
      private: boolean,
      fork: boolean,
      archived: boolean,
      disabled: boolean,
      htmlUrl: string
    },
    revision: { branch: string | null, treeSha: string | null },
    files: string[],
    findings: Finding[],
    errors: object[],
    summary: object,
    status: 'OK' | 'FAIL'
  }],
  findings: Finding[],    // flattened across repositories
  errors: object[],       // flattened across repositories
  summary: object,
  baseline: object,
  configPath: string | null,
  comparison?: OrganizationComparison,
  status: 'OK' | 'FAIL'
}
```

The organization summary includes repository coverage counts in addition to
file, finding, suppression, error, and severity counts. A consumer can use the
flattened arrays for ingestion and the `repositories` array for coverage and
ownership views. `coverage.complete` requires every eligible repository in the
requested filters to be selected and free of API, blob, or parse coverage
gaps. A deliberate repository cap is therefore visible even when the selected
repositories have status `OK`.

`analysis.identity` covers the organization, repository filters, inclusion
flags, repository limit, severity, explanation setting, normalized policy,
baseline contents, analysis generation, and rule catalog. It is public hash
material rather than a credential and remains stable across compatible package
versions and concurrency changes.

With `--report-dir`, `organization-report.json` uses kind
`actions-warden-org-scan-directory`. It retains the top-level analysis, scope,
coverage, summary, baseline, config, comparison summary, and status, but each
repository entry contains counts plus an artifact pointer instead of complete
finding and error arrays:

```js
{
  schemaVersion: '1.0',
  kind: 'actions-warden-org-scan-directory',
  organization: string,
  analysis: object,
  scope: object,
  coverage: object,
  repositories: [{
    repository: object,
    revision: object,
    summary: object,
    status: 'OK' | 'FAIL',
    files: number,
    findings: number,
    errors: number,
    artifact: { path: string, bytes: number, sha256: string }
  }],
  summary: object,
  baseline: object,
  configPath: string | null,
  comparison?: { summary: object, artifact: object },
  status: 'OK' | 'FAIL'
}
```

Each repository pointer names an
`actions-warden-org-scan-repository` document containing the complete
repository result. `manifest.json` uses kind
`actions-warden-org-scan-manifest` and lists the compact report, every
repository artifact, and optional comparison artifact with its exact UTF-8
byte count and SHA-256 digest. The final manifest, rather than a directory
listing, identifies the current run; unrelated or stale regular files can
remain in the directory. Consumers must verify the listed sizes and digests;
a mismatch means the multi-file report is incomplete or was modified.

When `--previous-report` is supplied, `comparison` has this shape:

```js
{
  schemaVersion: '1.0',
  analysis: object,
  repositories: {
    previous: number,
    current: number,
    comparable: number,
    added: string[],
    removed: string[],
    failed: string[]
  },
  findings: {
    new: Finding[],
    resolved: Finding[],
    unchanged: Finding[],
    unknown: Finding[]
  },
  summary: {
    newFindings: number,
    resolvedFindings: number,
    unchangedFindings: number,
    unknownFindings: number,
    repositoriesComparable: number,
    repositoriesAdded: number,
    repositoriesRemoved: number,
    repositoriesFailed: number,
    complete: boolean
  }
}
```

Semantic fingerprints tolerate line movement. Resolution is fail-closed:
unmatched previous findings are `resolved` only for repositories successfully
covered and parsed by the current report; otherwise they are `unknown`. A
missing, failed, or unparseable repository makes the comparison incomplete. Current scan status does
not change merely because findings were resolved. Comparison requires matching
analysis identities and is unavailable with SARIF.

### `rules`

```js
{
  schemaVersion: '1.0',
  rules: [{
    id: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string
  }],
  status: 'OK'
}
```

## CSV

CSV is a deterministic flat view of the same labeled records used by TOON,
text, SARIF, and HTML. It uses UTF-8, commas, and CRLF row endings. The first
column is always `record_type`; every scanner record occupies one physical row;
and a final `STATUS` row contains `OK` or `FAIL`.

The remaining header is the union of fields present in the result. Common
fields use this stable preferred order when present:

```text
status,organization,repo,repository,file,line,id,type,ruleId,sev,severity,
action,image,from,to,sha,version,level,change,msg,explain,url
```

Additional field names follow in lexical order. Empty, null, and missing
values produce empty cells. Nested arrays and objects become compact JSON
cells. The name `record_type` is reserved for the scanner label.

Values containing commas or quotes use standard CSV quoting, with embedded
quotes doubled. Carriage returns, newlines, tabs, and remaining control
characters are rendered as visible backslash escapes so untrusted evidence
cannot create extra rows or GitHub workflow commands. String cells whose first
non-whitespace character is `=`, `+`, `-`, or `@` receive a leading apostrophe
to prevent spreadsheet formula execution. Credential redaction runs before
serialization.

```csv
record_type,status,file,line,id,type,sev,action,files,findings
SCAN,,.github/workflows/ci.yml,,,,,,,
FINDING,,.github/workflows/ci.yml,14,18b82e86d7c14fe2,unpinned-action,high,actions/checkout@v5,,
SUMMARY,,,,,,,,1,1
STATUS,FAIL,,,,,,,,
```

CSV is intended for review and flat ingestion, not lossless round trips. Use
JSON for nested command data, schema-versioned automation, or a future
`--previous-report` input. Organization comparison rows are included in CSV,
but the previous report itself must remain compatible organization JSON. See
the [CSV reporting example](../examples/csv-reporting/README.md).

## HTML

HTML reports are deterministic, self-contained documents designed for saved
human-review artifacts. They provide:

- status and explicit incomplete-coverage warnings;
- report scope and summary metric cards;
- severity/rule and organization repository breakdowns;
- client-side search plus record type, severity, and repository filters;
- complete record tables, HTTPS source links, and comparison groups;
- print styling without external fonts, scripts, stylesheets, or network calls.

Every dynamic value passes through credential redaction and HTML escaping. No
report data is inserted into executable JavaScript, unsafe URL schemes are not
linked, and a restrictive content security policy blocks external resources.
The generated document is capped at 32 MiB; use JSON, CSV, or SARIF, or narrow the
requested scope, if rendering exceeds that bound.

```sh
actions-warden org-scan my-org \
  --format=html \
  --output-path=reports/actions-warden.html
```

The document can contain private repository names, paths, source URLs, and
security posture. Protect it with the same retention and access controls as a
JSON organization report. HTML is not accepted as `--previous-report`; retain
JSON when a later scan will calculate changes.
See the [HTML organization report example](../examples/html-organization-report/README.md)
for a copyable artifact-first workflow.

## SARIF

SARIF output uses version 2.1.0 and identifies the tool as `actions-warden`.
Findings and operational records become SARIF results. Finding IDs and semantic
fingerprints are included as partial fingerprints where available, and source
locations use repository-relative POSIX paths.

For a local repository, upload the generated file with the code-scanning tool
used by your CI platform. Organization findings point at files in other
repositories, so a single organization SARIF artifact is best treated as a
portable report unless your ingestion system explicitly supports
cross-repository locations.

GitHub Action annotations are separate from the selected output format. Choosing
SARIF does not disable annotations.

The [SARIF Code Scanning example](../examples/sarif-code-scanning/README.md)
shows a least-privilege trusted-run workflow that retains the file, uploads it,
and then enforces the actions-warden result.

## Stable identities and ordering

Occurrence IDs exclude absolute checkout paths so a cloned repository produces
the same ID for unchanged source. A pin finding and its corresponding pin plan
share an ID, enabling a precise `--fix=<id>` handoff.

Baseline fingerprints tolerate line movement while distinguishing repeated,
semantically equivalent findings by source order.

File discovery, repository selection, findings, baseline serialization, and
JSON key construction are deterministic for unchanged inputs. Network-backed
commands can still change when GitHub refs, releases, default branches, or
repository access change.

Resuming an organization scan does not add execution-history fields to the
final report. When all validated repository revisions are unchanged, a resumed
report has the same serialized bytes as a fresh result with the same inputs.
Checkpoint and progress metadata stay outside the report contract.

## GitHub Action outputs

Action outputs are a small machine-readable channel separate from the selected
TOON, JSON, text, CSV, SARIF, or HTML payload:

| output | semantics |
|---|---|
| `status` | Semantic `OK` or `FAIL` |
| `findings` | Unsuppressed findings after severity filtering |
| `total-findings` | Findings before baseline suppression and after severity filtering |
| `critical`, `high`, `medium`, `low` | Unsuppressed findings at each severity |
| `suppressed` | Findings accepted by the active baseline |
| `errors` | Operational errors, including parse failures |
| `repositories-discovered` | Repositories visible to `org-scan` discovery |
| `repositories-selected` | Repositories selected by `org-scan` scope and limit |
| `repositories-scanned` | Selected repositories with a completed result |
| `repositories-resumed` | Completed repositories reused from a revision-verified checkpoint |
| `repositories-failed` | Repositories with API, tree, or blob coverage errors |
| `coverage-complete` | `true` or `false` for eligible organization coverage; empty for other commands |
| `new-findings` | Findings added since `previous-report` |
| `resolved-findings` | Findings safely resolved since `previous-report` |
| `unchanged-findings` | Findings unchanged since `previous-report` |
| `unknown-findings` | Prior findings whose resolution is unknown because coverage was incomplete |
| `report-path` | Absolute saved report path; always populated by `org-scan` |
| `checkpoint-path` | Absolute active `org-scan` checkpoint path, or empty when disabled |
| `annotations` | Native annotations emitted |
| `annotations-skipped` | Annotations omitted by the per-level cap |

Every numeric output is emitted as a decimal string for every command, using
`0` when it does not apply. For finding commands, `total-findings` equals
`findings + suppressed`; severity counts describe `findings`, not suppressed
records. `errors` adds parse-error findings to the command's structured error
arrays so it matches the Action's operational-failure policy. An invocation
error sets `errors` to `1` and the finding and repository counts to `0`.
`coverage-complete` is not numeric: it is empty outside `org-scan`, and it can
be `false` for an otherwise `OK` capped scan.

The Action job summary is also separate from the selected format. It contains
bounded result tables, organization coverage, checkpoint/resume state,
severity/rule aggregates, and
top finding, change, warning, or error records as applicable. It does not embed
the complete payload. Dynamic summary text is redacted, Markdown-escaped, and
length-bounded. Organization scans and Action CSV/HTML reports keep complete
evidence in files; other formats remain on stdout and may also be saved.

The `fail-on-findings` input can allow audit findings to leave the step
successful, but operational errors always fail. See the
[GitHub Action guide](./GITHUB-ACTION.md#outputs-and-failure-policy).
