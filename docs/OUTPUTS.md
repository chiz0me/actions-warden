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
| `sarif` | SARIF 2.1.0 JSON | Code scanning and compatible tooling |

Select a format with `--format`. The default is `toon`.

All serialized values pass through credential redaction. Known token formats,
credential-shaped key/value pairs, private keys, JWTs, and likely high-entropy
secrets are replaced with `<redacted>`. Do not use the output as a secret
transport.

## Status and exit codes

Every normal command result has semantic status `OK` or `FAIL`. TOON ends with
`STATUS: ...`; JSON has a top-level `status`; text ends with `==> ...`.

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
| `0` | Semantic status `OK` |
| `1` | Semantic status `FAIL`; inspect the emitted report |
| `2` | Invalid arguments, invalid policy, unsafe paths, or another invocation-level failure |

An invocation-level failure is written to stderr as `error: <message>`. Unknown
options, missing values, invalid choices, conflicting flags, malformed numeric
values, unsafe destinations, and a missing command all return `2`. The failure
may occur before a structured payload can be rendered, so do not assume stdout
contains JSON when the process exits `2`.

Organization-scan live progress is also a stderr-only channel. It never becomes
part of JSON, SARIF, TOON, or text stdout. `--progress=auto` enables it for an
interactive stderr, `always` enables it for redirected/CI logs, and `never`
disables it. GitHub Action organization scans show the same phase, repository,
retry, and completion updates in the step log by default.

### Agent-mode receipt

`org-scan --agent-mode`, or `ACTIONS_WARDEN_MODE=agent`, defaults the complete
report to a guarded scope-keyed file. Its stdout is a separate bounded JSON
receipt:

```js
{
  schemaVersion: '1.0',
  kind: 'actions-warden-agent-receipt',
  command: 'org-scan',
  organization: string,
  status: 'OK' | 'FAIL',
  summary: object,
  report: {
    path: string,
    format: 'toon' | 'json' | 'text' | 'sarif'
  },
  checkpoint: {
    path: string,
    resumed: boolean
  }
}
```

`summary` is the normal bounded organization coverage and severity summary;
the receipt never embeds repository arrays, findings, or operational error
details. Read `report.path` for the complete evidence. The receipt remains JSON
even when an explicit format selects TOON, text, or SARIF for the saved report.
Status and process exit semantics are unchanged. An invocation error may occur
before a receipt exists.

Explicit `--output=stdout` overrides the file default. In that case stdout is
the complete report in the selected format and no agent receipt is appended.

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
| `org-scan` | `REPOSITORY`, `FINDING`, `ERROR`, `SUMMARY` |
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
  scope: object,
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
  status: 'OK' | 'FAIL'
}
```

The organization summary includes repository coverage counts in addition to
file, finding, suppression, error, and severity counts. A consumer can use the
flattened arrays for ingestion and the `repositories` array for coverage and
ownership views.

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

The Action exposes `status`, `findings`, `report-path`, `annotations`, and
`annotations-skipped`. Its `fail-on-findings` input can allow audit findings to
leave the step successful, but operational errors always fail. See the
[GitHub Action guide](./GITHUB-ACTION.md#outputs-and-failure-policy).
