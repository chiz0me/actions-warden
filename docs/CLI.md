# CLI reference

This reference describes the public `actions-warden` command-line interface.
The command's own help is authoritative for the installed version:

```sh
actions-warden --help
actions-warden audit --help
actions-warden org-scan --help
```

## Install and authenticate

Node.js 20 or newer is required.

```sh
npm install --global actions-warden
actions-warden --version
```

For reproducible one-off automation, invoke an exact package version:

```sh
npx --yes actions-warden@0.5.0 audit
```

Network-backed commands resolve credentials in this order:

1. `--token <token>`
2. `GITHUB_TOKEN`
3. `GH_TOKEN`
4. anonymous GitHub API access

Prefer an environment variable over `--token` because command-line arguments
may be visible to other local processes. Give the token only the repository
metadata and contents read access needed for the requested scope.

## Quick cheat sheet

Here is a quick summary of the most common commands you will use daily:

```sh
# 1. Audit your workflows for security vulnerabilities with clear explanations
actions-warden audit --explain

# 2. Preview the pin plan (safe dry-run; no files are modified)
actions-warden pin

# 3. Apply the reviewed pin plan to your workflow files
actions-warden pin --write

# 4. Verify that pinned commit SHAs match their GitHub repositories
actions-warden verify

# 5. Check if newer versions of your pinned actions are available
actions-warden upgrade

# 6. Apply available upgrades to your files
actions-warden upgrade --write

# 7. Scan an entire GitHub organization
actions-warden org-scan my-org --severity=high

# 8. Export an interactive HTML report to view in your browser
actions-warden audit --format=html --output-path=audit-report.html
```

## Target and output options

The repository commands (`audit`, `pin`, `verify`, `upgrade`, and `report`)
share these target and output options:

| option | default | behavior |
|---|---|---|
| `-w, --workflow <pattern...>` | discovery | One or more files, directories, or globs |
| `--cwd <dir>` | current directory | Repository and path-safety root |
| `--format <format>` | `toon` | `toon`, `json`, `text`, `csv`, `sarif`, or `html` |
| `--output <destination>` | `stdout` | `stdout` or `file` |
| `--output-path <path>` | none | Report path inside `--cwd`; implies `--output=file` |

`pin`, `verify`, `upgrade`, and online `report` also accept `--token`. `audit`
is entirely local and does not accept a token. `report --offline` rejects an
explicit token, mode, or cooldown because those options would otherwise be
silently unused.

Without `--workflow`, actions-warden discovers:

```text
.github/workflows/*.yml
.github/workflows/*.yaml
action.yml
action.yaml
**/action.yml
**/action.yaml
```

Paths and directories may be absolute or relative to `--cwd`. Quote globs so
actions-warden, not the shell, expands them. An explicit file, directory, or
glob that resolves to no workflow files is an error.

```sh
actions-warden audit -w .github/workflows/release.yml
actions-warden audit -w '.github/workflows/*.yml'
actions-warden audit -w .github/workflows .github/actions
actions-warden audit --cwd ../service
```

Output files are created atomically and must remain within the real working
directory after symlinks are resolved. Their parent directory must already
exist. `--output=file` without a path and an explicit
`--output=stdout --output-path=...` are invocation errors. Report, baseline,
and checkpoint destinations are preflighted before network or mutation work;
they cannot be directories, symlinks, selected workflows, default workflow
discovery paths, or the reserved `.actions-warden.yml` and
`.actions-warden.yaml` policy paths. Active configuration and baseline paths
are checked again before any report or baseline destination is written.

```sh
actions-warden audit \
  --format=sarif \
  --output-path=reports/actions-warden.sarif
```

`--output=file --output-path=...` remains valid when an explicit destination
is clearer in automation.

HTML is intended as a saved human-review artifact:

```sh
actions-warden audit \
  --format=html \
  --output-path=reports/actions-warden.html
```

It is self-contained and does not load external assets. The report is
credential-redacted, HTML-escaped, protected by a restrictive content security
policy, deterministic for unchanged inputs, and capped at 32 MiB.

CSV can stream to stdout or be written as a guarded file:

```sh
actions-warden audit \
  --format=csv \
  --output-path=reports/actions-warden.csv
```

CSV provides a flat spreadsheet/export view. Use JSON for the versioned,
lossless machine contract and for future organization comparisons.

## `audit`

The `audit` command is completely local and offline. It inspects your workflow
files and composite actions for vulnerabilities, excessive permissions, script
injections, and unpinned dependencies without executing any workflows or making
network requests. It writes only an explicitly requested report or baseline.

```sh
actions-warden audit \
  [--severity=low|medium|high|critical] \
  [--explain] \
  [--config=<path> | --ignore-config] \
  [--baseline=<path>]
```

The default includes every severity. `--severity` keeps findings at or above
the selected threshold; parse errors always remain visible. `--explain` adds a
plain-language remediation explanation to each finding.

Create a reviewed baseline from all current findings (useful when adopting on existing projects):

```sh
actions-warden audit \
  --create-baseline=.actions-warden-baseline.json
```

`--create-baseline` cannot be combined with `--baseline`, cannot share the
report output path, and is validated before the audit begins. Parser failures
are never written into the baseline. See
[configuration and baselines](./CONFIGURATION.md).

> [!TIP]
> **Understanding exit codes:**
> - `0`: Clean! No unsuppressed security findings were found.
> - `1`: Findings reported. This is the normal exit code when issues are detected, allowing CI pipelines to catch vulnerabilities.
> - `2`: Invocation error. Occurs when command-line flags are invalid, contradictory, or missing required values.

## `pin`

The `pin` command protects your workflows against supply-chain attacks. It
resolves mutable version tags (such as `@v4` or `@main`) into immutable
40-character commit SHAs from GitHub, while preserving the human-readable version
as an inline comment.

```sh
actions-warden pin [--dry-run] [--write] [--fix=<id>]
```

**Dry-run is the default.** Running `actions-warden pin` will only show you a
safe preview on your terminal without touching any files. A planned rewrite looks like:

```yaml
- uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # actions-warden-ref: v5
```

The metadata preserves the readable version for `verify` and `upgrade`.
Existing comments and scalar quoting are preserved. The target commit is
verified as belonging to the referenced repository before a plan is accepted.

Review the dry-run output, then apply the whole plan to your files:

```sh
actions-warden pin --write
```

Or apply one exact reviewed action occurrence by its stable ID:

```sh
actions-warden pin --fix=18b82e86d7c14fe2 --write
```

`--write` and `--dry-run` together are rejected. `--fix` must be one exact
16-character hexadecimal ID from a current plan; uppercase input is normalized
for convenience.

## `verify`

The `verify` command checks that all pinned actions in your repository are
authentic and unmodified.

```sh
actions-warden verify
```

For every external reference, verification checks that:

1. the ref is a full 40-character commit SHA;
2. the commit truly belongs to the referenced repository on GitHub; and
3. `actions-warden-ref` metadata, when present, resolves to that exact SHA.

A valid SHA without version metadata produces a warning. An unpinned,
unverifiable, or metadata-mismatched reference is an error and returns status
`FAIL`.

## `upgrade`

The `upgrade` command checks for newer releases of your pinned actions while
keeping them securely pinned to commit SHAs. It includes a built-in **cooldown period**
(default: 7 days) to protect your team against newly published releases that may have
day-zero issues or compromised tags.

```sh
actions-warden upgrade \
  [--mode=major|minor|patch] \
  [--min-age=<days>] \
  [--dry-run] [--write] [--fix=<id>]
```

Defaults are `--mode=minor --min-age=7` and dry-run. Tag discovery is paginated;
prereleases and downgrades are excluded. A candidate tag must be older than the
cooldown. The age comes from GitHub release publication data when available,
then from locally recorded first-seen evidence for the exact tag-to-SHA mapping.
Missing evidence fails closed. `--min-age` accepts only a non-negative integer;
values such as `7days`, `1.5`, and values outside JavaScript's safe integer
range are rejected rather than truncated.

SHA-pinned references need `actions-warden-ref` metadata to establish the
current semantic version. Legacy plain-semver comments remain readable.

```sh
# Review every eligible minor update (dry-run preview)
actions-warden upgrade --mode=minor --min-age=14 --format=json

# Apply one reviewed change
actions-warden upgrade --fix=<ID> --write
```

## `report`

Produce one non-writing view of audit findings, pin plans, and upgrade plans.

```sh
actions-warden report \
  [--severity=low|medium|high|critical] \
  [--explain] \
  [--mode=major|minor|patch] \
  [--min-age=<days>] \
  [--offline] \
  [--config=<path> | --ignore-config] \
  [--baseline=<path>]
```

The audit determines the target set; pin and upgrade use exactly that same
scope. A location with an upgrade is not duplicated as a pin proposal.
`--offline` skips both network-backed planning phases and returns only the
local audit. Because they cannot affect an offline report, explicitly combining
`--offline` with `--token`, `--mode`, or `--min-age` is rejected.

Use report for review, issue generation, or an AI planning step. It never
accepts `--write`.

## `org-scan`

Audit workflow security across repositories visible to a GitHub token.

```sh
actions-warden org-scan <organization> \
  [--repository <pattern...>] \
  [--visibility=all|public|private|internal] \
  [--include-archived] [--include-disabled] [--include-forks] \
  [--max-repos=<count>] [--concurrency=<1-16>] \
  [--severity=low|medium|high|critical] [--explain] \
  [--config=<path> | --ignore-config] [--baseline=<path>] \
  [--checkpoint=<path> | --resume=<path>] [--fresh] \
  [--no-auto-checkpoint] \
  [--previous-report=<path>] \
  [--progress=auto|plain|json|none|always|never] \
  [--report-dir=<dedicated-directory>] \
  [--agent-mode | --no-agent-mode] \
  [--format=toon|json|text|csv|sarif|html] \
  [--output=stdout|file] [--output-path=<path>]
```

Defaults:

- visibility: `all`;
- archived, disabled, and forked repositories: excluded;
- repository concurrency: `4`;
- repository count: every eligible repository;
- audit severity: every level;
- format: `json`;
- output: a guarded scope-keyed file plus a compact JSON receipt on stdout;
- checkpoint: a guarded scope-keyed file, automatically resumed when present;
- progress: `auto` (plain stderr only when attached to an interactive terminal);
- agent mode: disabled unless explicitly selected or enabled by the
  environment.

Repository patterns match either `name` or `owner/name`, case-insensitively.
An explicit pattern set that matches no eligible repository is an error.
Selection is stable before `--max-repos` is applied. `--max-repos` must be a
positive safe integer, and `--concurrency` must be an integer from 1 through
16; malformed, fractional, or imprecise values fail before any API request.

The generated paths use these shapes:

```text
.actions-warden-org-scan.<scope-key>.report.json
.actions-warden-org-scan.<scope-key>.checkpoint.json
```

An explicit format changes the report extension while keeping the same
compatibility key. New files use mode `0600`; both report and checkpoint can
contain private repository names and security evidence.

The key covers scan scope, policy, baseline, rules, and analysis generation.
Running the same command again selects the same paths and resumes only
compatible, unchanged, error-free repository results. The report is complete;
stdout is a bounded `actions-warden-org-scan-receipt` containing status,
summary, report metadata, exact checkpoint reuse, coverage metadata, and
optional comparison counts.
Use `--output=stdout` when the complete selected report is intentionally wanted
on stdout. Use `--no-auto-checkpoint` for a stateless scan; file output still
uses a generated report path unless `--output-path` is supplied.

```sh
actions-warden org-scan my-org \
  --repository 'service-*' 'my-org/platform-*' \
  --visibility=private \
  --severity=high \
  --format=json \
  --output=file \
  --output-path=reports/org.json
```

The result includes discovered, eligible, selected, scanned, skipped, failed,
and workflow-bearing repository counts. Per-repository operational errors make
the overall status `FAIL`; they do not abort reporting for repositories that
can still be scanned. The `coverage` object separately states whether every
eligible repository was covered. A deliberate `--max-repos` cap makes
`coverage.complete` false without turning an otherwise clean selected scan
into `FAIL`.

### HTML, CSV, and report comparison

Create a self-contained organization dashboard for human review:

```sh
actions-warden org-scan my-org \
  --severity=high \
  --format=html \
  --output-path=reports/org.html
```

It includes the requested scope, incomplete-coverage warning, severity and
rule summary, repository table, searchable/filterable evidence, HTTPS source
links, comparison sections when present, and operational errors. Treat the
file as sensitive because it may identify private repositories and findings.

Compare a current scan with a previous actions-warden organization JSON report:

```sh
actions-warden org-scan my-org \
  --severity=high \
  --previous-report=reports/org.previous.json \
  --format=json \
  --output-path=reports/org.current.json
```

The previous report must be inside `--cwd`, use schema `1.0`, contain a public
analysis identity, and match the current organization, scope, normalized
policy, baseline contents, rule catalog, and analysis generation. Reports made
before analysis identities were added must be regenerated once. Token,
concurrency, progress, and output destination do not affect compatibility.

Comparison uses semantic fingerprints and returns complete `new`, `resolved`,
`unchanged`, and `unknown` finding arrays plus repository and count summaries.
A previous finding is resolved only when its repository is present and has no
current API, blob, or workflow-parse coverage error. Missing, failed, or
unparseable repositories make unmatched prior findings unknown, and
`summary.complete` becomes `false`. The scan's normal
status remains based on current findings and errors.

`--previous-report` cannot be combined with SARIF because SARIF has no resolved
or unknown-result contract. Its path must differ from the output and checkpoint
paths so evidence is never overwritten. Retain JSON when it will be used as a
future comparison source; HTML is the human view rather than a comparison
input. CSV is likewise an export view rather than a comparison input.

### Directory JSON reports

For a broad report that will be uploaded or inspected repository by
repository, select a dedicated directory instead of one large JSON file:

```sh
actions-warden org-scan my-org \
  --severity=high \
  --report-dir=reports/actions-warden-org
```

`--report-dir` implies JSON file output. It cannot be combined with
`--output-path`, `--output=stdout`, or a non-JSON format. The directory must be
inside `--cwd`, cannot be the working directory itself or a workflow discovery
path, and cannot overlap the active checkpoint, config, baseline, previous
report, or reserved config paths. Symbolic-link layout components and non-file artifact entries are
rejected.

The layout is:

```text
reports/actions-warden-org/
  organization-report.json       compact aggregate and artifact pointers
  organization-comparison.json   complete comparison, when requested
  repositories/
    <repository>.<16-hex-id>.json complete repository evidence
  manifest.json                  paths, byte counts, and SHA-256 digests
```

Directories created by the command use mode `0700`; generated files use mode
`0600`. `manifest.json` is written last and is the authoritative file set for
the run. Unrelated and stale regular files are not deleted automatically.
Consumers should verify every listed byte count and digest and reject a
mismatch, which also detects an interrupted multi-file update.
Directory output bounds downstream reads and artifact handling, but the
scanner still constructs the complete result in memory before writing it. A
directory aggregate is not accepted as `--previous-report`; retain a normal
complete JSON report when future comparison input is required.

### Agent mode

There is no reliable universal way to infer that a process is running inside
an AI agent. Agent callers opt in explicitly:

```sh
actions-warden org-scan my-org --agent-mode
```

An integration can instead set the preferred execution context once:

```sh
export ACTIONS_WARDEN_CONTEXT=agent
actions-warden org-scan my-org
```

`ACTIONS_WARDEN_CONTEXT` accepts `agent`, `auto`, `ci`, or `interactive`.
`ACTIONS_WARDEN_MODE=agent` remains a compatibility alias for older
integrations. With implicit `--progress=auto`, agent context is quiet, CI and
interactive contexts use plain progress, and auto context follows stderr TTY
state.

The general organization-scan defaults already select JSON file output, a
scope-keyed checkpoint, compatible automatic resume, and a bounded receipt.
When progress was not explicitly supplied, agent context selects no progress.
It also selects `actions-warden-agent-receipt` so integrations can recognize
the bounded contract. It does not change scan scope, analysis, or artifact
identity.

The artifact key includes the organization, repository filters, inclusion
flags, repository limit, severity, explanation setting, normalized policy,
baseline contents, analysis generation, and rule catalog. A compatible package
upgrade therefore keeps the same paths, while a scope, security-control, or
analysis-behavior change selects a different checkpoint rather than
overwriting incompatible state. Normal, CI, interactive, and agent contexts
all use these paths:

```text
.actions-warden-org-scan.<scope-key>.report.json
.actions-warden-org-scan.<scope-key>.checkpoint.json
```

An explicitly selected report format changes the report extension. Generated
files are mode `0600` when first created and may reveal private security
posture; protect them and ignore `.actions-warden-org-scan.*` in consuming
repositories when appropriate. On an automatic-checkpoint run, a compatible
legacy `.actions-warden-agent.*` checkpoint is validated and copied atomically
to the common path before resume. The legacy file is retained as possible
audit evidence.

After writing the full report, stdout contains only a bounded JSON receipt:

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

The process still exits `0` for `OK`, `1` for a completed `FAIL`, and `2` for
an invocation error. Explicit `--format`, `--output`, `--output-path`,
`--report-dir`, `--progress`, `--checkpoint`, `--resume`, `--fresh`, and
`--no-auto-checkpoint` choices override agent defaults.
With explicit `--output=stdout`, stdout is the complete selected report and no
receipt is added. Use `--no-agent-mode` to override an inherited environment
marker. Passing both agent-mode flags is rejected. An explicit agent-mode flag
has precedence over both environment variables; the preferred context variable
has precedence over the legacy marker.

### Progress and resume

Progress is independent of the report format and is written only to stderr.
This keeps stdout valid JSON, CSV, SARIF, TOON, text, or HTML. Select `plain`
for human CI or redirected logs, `json` for one parseable event per line, and
`none` when a caller wants no progress channel. `always` and `never` remain
aliases for `plain` and `none`:

```sh
actions-warden org-scan my-org \
  --format=json \
  --output=stdout \
  --no-auto-checkpoint \
  --progress=plain > report.json
```

JSON Lines events use `schemaVersion: "1.0"`, kind
`actions-warden-org-scan-progress`, an event name, ISO timestamp, elapsed
milliseconds, and event-specific bounded fields. A fatal scan error ends that
channel with `scan-failed`; a post-scan comparison or persistence failure ends
it with `command-failed`. Neither appends a plain-text error line.

Choose stable, caller-managed report and checkpoint names when required by an
external storage convention:

```sh
actions-warden org-scan my-org \
  --severity=high \
  --checkpoint=.actions-warden-org-checkpoint.json \
  --format=json \
  --output=file \
  --output-path=reports/org.json
```

The first run creates the checkpoint; repeating that exact command
automatically resumes it. Use the strict `--resume` form when external
automation restored a checkpoint that must exist:

```sh
actions-warden org-scan my-org \
  --severity=high \
  --resume=.actions-warden-org-checkpoint.json \
  --format=json \
  --output=file \
  --output-path=reports/org.json
```

The token, concurrency, output format, progress mode, and report destination do
not affect checkpoint compatibility. Neither does a package-version-only
upgrade: the producing version is retained as checkpoint metadata, and a
compatible older checkpoint is rewritten atomically on its first successful
resume. The
explicit analysis generation is advanced when discovery, parsing, finding
identity, rule evaluation, or persisted result behavior changes. An
incompatible generation fails closed; automatic organization scans select a
new keyed path. A resumed scan always lists repositories again and
fetches a fresh
default-branch tree for each selected repository. An error-free result is
reused only when repository identity, default branch, and tree SHA still match.
Changed repositories and any checkpointed result with an operational error are
scanned again.

`--checkpoint` creates a checkpoint when absent and automatically resumes it
when present. Add `--fresh` to ignore reusable results and atomically replace
the selected checkpoint. `--resume` requires a valid existing checkpoint and
cannot be combined with `--fresh`. `--no-auto-checkpoint` disables only the
generated checkpoint; an explicit `--checkpoint` or `--resume` still applies. The
checkpoint and report paths must differ, remain inside `--cwd`, and have an
existing parent directory. A checkpoint cannot replace the active config or
baseline. Checkpoints contain redacted report evidence and revision metadata,
not the token or raw YAML, but can still reveal private repository names,
paths, findings, and security posture; protect and retain them accordingly.
Checkpoint reads and writes are capped at 256 MiB.

Version-only upgrades and context switches do not create extra automatic
artifacts. When an analysis generation intentionally changes, the older keyed report and checkpoint are
retained rather than deleted automatically because they may be needed as audit
evidence; remove them according to the consuming repository's retention policy.

The scanner reads the default-branch Git tree and YAML blobs in memory. It
never clones, checks out, or executes remote content. It fails closed on
truncated trees and enforces these bounds per repository:

- 1,000 workflow and composite-action files;
- 2 MiB per YAML file;
- 32 MiB of YAML source in total.

Remote organization listings, trees, and blobs bypass the general disk cache so
a report uses a fresh branch view and raw private workflow content is not
persisted. An explicitly requested checkpoint stores only redacted report data
and validated revision metadata.
See [the scheduled Action example](../examples/org-scan.yml).

## `rules`

Print the rule catalog compiled into the installed version:

```sh
actions-warden rules
actions-warden rules --format=json
```

This command has no repository or network dependency.

## Exit status and invocation errors

Every command uses the same process contract:

- `0`: completed with status `OK`, or displayed help/version information;
- `1`: completed with a structured `FAIL` result, such as findings or
  operational errors;
- `2`: could not start or complete safely because the command line, paths,
  configuration, inputs, or environment were invalid.

Commander-level failures such as unknown flags, missing values, invalid
choices, conflicts, excess arguments, and a missing command also return `2`.
Argument parsing and destination preflight run before network requests and
before authorized workflow writes; active-control collisions are checked again
before output. On exit `2`, treat stderr as the error channel and do not assume
stdout contains a complete structured result.

## Cache and network behavior

Local `pin`, `verify`, `upgrade`, and online `report` work caches successful
GitHub API responses for one hour. The cache root is selected in this order:

1. `ACTIONS_WARDEN_CACHE_DIR`
2. `$XDG_CACHE_HOME/actions-warden`
3. `~/.cache/actions-warden`

Cache keys include a hash of the authentication identity, so authenticated
responses are not shared with anonymous or different-token calls. Requests
have timeouts, bounded retries, in-flight deduplication, and ETag revalidation
where available. Resolver failures are returned as errors; the CLI does not
silently substitute an unverified value.

## Related guides

- [Configuration](./CONFIGURATION.md)
- [Output contracts](./OUTPUTS.md)
- [GitHub Action](./GITHUB-ACTION.md)
- [AI and coding agents](./AI-AGENTS.md)
