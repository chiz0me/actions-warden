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
npx --yes actions-warden@0.3.0 audit
```

Network-backed commands resolve credentials in this order:

1. `--token <token>`
2. `GITHUB_TOKEN`
3. `GH_TOKEN`
4. anonymous GitHub API access

Prefer an environment variable over `--token` because command-line arguments
may be visible to other local processes. Give the token only the repository
metadata and contents read access needed for the requested scope.

## Target and output options

The repository commands (`audit`, `pin`, `verify`, `upgrade`, and `report`)
share these options:

| option | default | behavior |
|---|---|---|
| `-w, --workflow <pattern...>` | discovery | One or more files, directories, or globs |
| `--cwd <dir>` | current directory | Repository and path-safety root |
| `--token <token>` | environment | GitHub API credential for network-backed work |
| `--format <format>` | `toon` | `toon`, `json`, `text`, or `sarif` |
| `--output <destination>` | `stdout` | `stdout` or `file` |
| `--output-path <path>` | none | Required with `--output=file`; resolved inside `--cwd` |

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
directory after symlinks are resolved:

```sh
actions-warden audit \
  --format=sarif \
  --output=file \
  --output-path=reports/actions-warden.sarif
```

## `audit`

Scan local workflows and composite actions without making network calls or
changing files.

```sh
actions-warden audit \
  [--severity=low|medium|high|critical] \
  [--explain] \
  [--config=<path> | --ignore-config] \
  [--baseline=<path>]
```

The default includes every severity. `--severity` keeps findings at or above
the selected threshold; parse errors always remain visible. `--explain` adds a
plain-language remediation field.

Create a reviewed baseline from all current findings:

```sh
actions-warden audit \
  --create-baseline=.actions-warden-baseline.json
```

`--create-baseline` cannot be combined with `--baseline`. Parser failures are
never written into the baseline. See [configuration and baselines](./CONFIGURATION.md).

Exit code `0` means no unsuppressed findings; `1` means findings were reported;
`2` means the scan could not be invoked safely or correctly.

## `pin`

Resolve mutable external action and reusable-workflow refs to full commit SHAs.

```sh
actions-warden pin [--dry-run] [--write] [--fix=<id>]
```

Dry-run is the default. A planned rewrite looks like:

```yaml
- uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # actions-warden-ref: v5
```

The metadata preserves the readable version for `verify` and `upgrade`.
Existing comments and scalar quoting are preserved. The target commit is
verified as belonging to the referenced repository before a plan is accepted.

Review the dry-run output, then either apply the whole plan:

```sh
actions-warden pin --write
```

or one exact stable ID:

```sh
actions-warden pin --fix=18b82e86d7c14fe2 --write
```

`--write` and `--dry-run` together are rejected.

## `verify`

Verify action and reusable-workflow pins against GitHub.

```sh
actions-warden verify
```

For every external reference, verification checks that:

1. the ref is a full 40-character commit SHA;
2. the commit belongs to the referenced repository; and
3. `actions-warden-ref` metadata, when present, resolves to that SHA.

A valid SHA without version metadata produces a warning. An unpinned,
unverifiable, or metadata-mismatched reference is an error and returns status
`FAIL`.

## `upgrade`

Plan or apply newer action versions while preserving immutable SHA pins.

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
Missing evidence fails closed.

SHA-pinned references need `actions-warden-ref` metadata to establish the
current semantic version. Legacy plain-semver comments remain readable.

```sh
# Review every eligible minor update
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
local audit.

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
  [--checkpoint=<path> | --resume=<path>] \
  [--progress=auto|always|never] \
  [--agent-mode | --no-agent-mode] \
  [--format=toon|json|text|sarif] \
  [--output=stdout|file] [--output-path=<path>]
```

Defaults:

- visibility: `all`;
- archived, disabled, and forked repositories: excluded;
- repository concurrency: `4`;
- repository count: every eligible repository;
- audit severity: every level;
- progress: `auto` (stderr only when attached to an interactive terminal);
- agent mode: disabled unless explicitly selected or enabled by the
  environment.

Repository patterns match either `name` or `owner/name`, case-insensitively.
An explicit pattern set that matches no eligible repository is an error.
Selection is stable before `--max-repos` is applied.

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
can still be scanned.

### Agent mode

There is no reliable cross-agent process or environment signal. Agent callers
opt in explicitly:

```sh
actions-warden org-scan my-org --agent-mode
```

An integration can instead set the mode once:

```sh
export ACTIONS_WARDEN_MODE=agent
actions-warden org-scan my-org
```

When the corresponding options were not explicitly supplied, agent mode sets:

- `--format=json`;
- `--output=file` with a guarded scope-keyed report path;
- `--progress=never`;
- a guarded scope-keyed checkpoint path, creating it when absent and resuming
  it when present.

The artifact key includes the organization, repository filters, inclusion
flags, repository limit, severity, explanation setting, normalized policy,
baseline contents, package version, and rule catalog. A scope or security
control change therefore selects a different checkpoint rather than
overwriting incompatible state. Generated paths have these shapes:

```text
.actions-warden-agent.<scope-key>.report.json
.actions-warden-agent.<scope-key>.checkpoint.json
```

An explicitly selected report format changes the report extension. Generated
files are mode `0600` when first created and may reveal private security
posture; protect them and ignore `.actions-warden-agent.*` in consuming
repositories when appropriate.

After writing the full report, stdout contains only a bounded JSON receipt:

```js
{
  schemaVersion: '1.0',
  kind: 'actions-warden-agent-receipt',
  command: 'org-scan',
  organization: string,
  status: 'OK' | 'FAIL',
  summary: object,
  report: { path: string, format: 'toon' | 'json' | 'text' | 'sarif' },
  checkpoint: { path: string, resumed: boolean }
}
```

The process still exits `0` for `OK`, `1` for a completed `FAIL`, and `2` for
an invocation error. Explicit `--format`, `--output`, `--output-path`,
`--progress`, `--checkpoint`, and `--resume` choices override agent defaults.
With explicit `--output=stdout`, stdout is the complete selected report and no
receipt is added. Use `--no-agent-mode` to override an inherited environment
marker. `ACTIONS_WARDEN_MODE` must be exactly `agent` when set.

### Progress and resume

Progress is independent of the report format and is written only to stderr.
This keeps stdout valid JSON, SARIF, TOON, or text. Select `always` for CI or a
redirected terminal log, and `never` when a caller wants no progress channel:

```sh
actions-warden org-scan my-org --format=json --progress=always > report.json
```

Create an atomic checkpoint after each completed repository:

```sh
actions-warden org-scan my-org \
  --severity=high \
  --checkpoint=.actions-warden-org-checkpoint.json \
  --format=json \
  --output=file \
  --output-path=reports/org.json
```

Resume with the same organization, filters, inclusion flags, repository limit,
severity, explanation setting, configuration, baseline, tool version, and rule
catalog:

```sh
actions-warden org-scan my-org \
  --severity=high \
  --resume=.actions-warden-org-checkpoint.json \
  --format=json \
  --output=file \
  --output-path=reports/org.json
```

The token, concurrency, output format, progress mode, and report destination do
not affect checkpoint compatibility. A resumed scan always lists repositories
again and fetches a fresh default-branch tree for each selected repository.
An error-free result is reused only when repository identity, default branch,
and tree SHA still match. Changed repositories and any checkpointed result with
an operational error are scanned again.

`--checkpoint` starts a new checkpoint and replaces an existing file at that
path. `--resume` requires a valid existing checkpoint and updates it. The
checkpoint and report paths must differ, remain inside `--cwd`, and have an
existing parent directory. A checkpoint cannot replace the active config or
baseline. Checkpoints contain redacted report evidence and revision metadata,
not the token or raw YAML, but can still reveal private repository names,
paths, findings, and security posture; protect and retain them accordingly.
Checkpoint reads and writes are capped at 256 MiB.

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
