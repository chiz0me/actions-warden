# actions-warden

[![npm](https://img.shields.io/npm/v/actions-warden?color=cb3837&logo=npm)](https://www.npmjs.com/package/actions-warden)
[![provenance](https://img.shields.io/badge/npm-provenance-5b21b6?logo=npm)](https://www.npmjs.com/package/actions-warden?activeTab=code)
[![ci](https://github.com/chiz0me/actions-warden/actions/workflows/ci.yml/badge.svg)](https://github.com/chiz0me/actions-warden/actions/workflows/ci.yml)
[![CodeQL](https://img.shields.io/badge/CodeQL-active-2188ff?logo=github)](https://github.com/chiz0me/actions-warden/security/code-scanning)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/chiz0me/actions-warden/badge)](https://securityscorecards.dev/viewer/?uri=github.com/chiz0me/actions-warden)
[![node](https://img.shields.io/node/v/actions-warden)](https://www.npmjs.com/package/actions-warden)
[![license: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

Audit, pin, and upgrade GitHub Actions workflows. Designed for safe, hands-off
invocation by humans **or** LLMs.

- **Audit** - scan workflows for supply-chain and injection vulnerabilities
- **Pin** - rewrite tag refs (`@v3`) to immutable commit SHAs
- **Upgrade** - bump pinned actions to the newest permitted version
- **Report** - combined audit + dry-run plan, ideal for LLM context

Inspired by [`actions-up`](https://github.com/azat-io/actions-up). The
update/pin core borrows its overall shape - YAML parsing plus regex-based
source rewrites that preserve formatting - and adds an audit layer, an
LLM-friendly TOON output format, inline ignore directives, an upgrade
cooldown, a Claude Code plugin, and a composite GitHub Action so the same
engine runs locally, in CI, and from inside Claude.

## Why

Tag references in `uses:` are mutable - anyone with write access to the action
repo (or a stolen maintainer token) can rewrite `v3` to point at malicious code.
Pinning to a 40-character commit SHA closes that hole. `actions-warden` finds
the holes, plans the fix, and applies it - but never without your explicit
say-so. `--dry-run` is the default for every destructive command.

## Install

```sh
npm install -g actions-warden
# or one-shot
npx actions-warden audit
```

Requires Node.js 20 or newer.

## Quick start

```sh
# Audit every workflow under .github/workflows
actions-warden audit

# Audit a specific file with remediation hints
actions-warden audit -w .github/workflows/release.yml --explain

# Plan a SHA-pinning pass (does NOT write)
actions-warden pin

# Actually write the pins
actions-warden pin --write

# Plan upgrades within the same major version
actions-warden upgrade --mode=minor

# Get one combined LLM-friendly report
actions-warden report --format=toon
```

## Output formats

### TOON (default - `--format=toon`)

Token-Oriented Object Notation. Each line is a labeled record with `key=value`
fields. Parses cleanly without a schema and ends with a machine-readable
`STATUS:` trailer.

```
SCAN: file=.github/workflows/release.yml
FINDING: id=18b82e86d7 type=unpinned-action sev=high action=actions/checkout@v3 line=15
FINDING: id=b50d0d45ab type=secrets-in-env sev=critical key=AWS_SECRET line=4
SUMMARY: files=1 findings=2 critical=1 high=1 medium=0 low=0
STATUS: FAIL
```

### JSON (`--format=json`)

Structured payload for programmatic integrations.

### Text (`--format=text`)

Plain human-readable lines - useful when piping through `less`.

## Commands

### `audit`

Scan workflows for security findings.

| flag | default | description |
|---|---|---|
| `-w, --workflow <pattern>` | discover under `.github/workflows/` | repeatable path or glob |
| `--severity <level>` | `low` (i.e. include all) | minimum severity to report |
| `--explain` | `false` | include plain-English remediation hint per finding |
| `--format <fmt>` | `toon` | `toon`, `json`, or `text` |
| `--output <dest>` | `stdout` | `stdout` or `file` |
| `--output-path <path>` | - | required when `--output=file` |
| `--cwd <dir>` | `.` | working directory |

Exit codes: `0` if no findings, `1` if any finding reported, `2` on usage error.

### `pin`

Resolve every tag/branch ref to a 40-char commit SHA. Preserves the original
tag as an inline `# v3` comment so `upgrade` can find it later.

| flag | default | description |
|---|---|---|
| `-w, --workflow <pattern>` | discover | repeatable |
| `--write` | `false` | apply changes (otherwise dry-run) |
| `--dry-run <bool>` | `true` | explicit dry-run toggle |
| `--token <token>` | `$GITHUB_TOKEN` | GitHub API token |
| `--fix <id>` | - | apply only the change with this id |
| `--format <fmt>` | `toon` | |

### `upgrade`

Bump pinned/tagged actions to the newest version allowed by `--mode`.

| flag | default | description |
|---|---|---|
| `--mode <m>` | `minor` | `major`, `minor`, or `patch` |
| `--write` | `false` | apply changes |
| `--fix <id>` | - | apply only this change id |
| `--token <token>` | `$GITHUB_TOKEN` | |

### `report`

Runs `audit`, plus dry-run `pin` and `upgrade`. Single combined output.

| flag | default | description |
|---|---|---|
| `--mode <m>` | `minor` | upgrade scope |
| `--offline` | `false` | skip network-dependent stages |

### `rules`

Print the rule catalog.

## Use it as a GitHub Action

`actions-warden` ships an `action.yml` at the repo root, so you can drop it
into any workflow.

```yaml
permissions:
  contents: read

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          persist-credentials: false
      - uses: <owner>/actions-warden@<commit-sha>   # pin to a SHA
        with:
          command: audit
          severity: high
          explain: 'true'
          token: ${{ github.token }}
```

Inputs (all optional unless noted):

| input | default | applies to | description |
|---|---|---|---|
| `command` | `audit` | all | `audit`, `pin`, `upgrade`, `report`, `rules` |
| `workflow` | discover | all | space-separated paths or globs |
| `severity` | - | audit/report | `low` / `medium` / `high` / `critical` |
| `format` | `toon` | all | `toon` / `json` / `text` |
| `mode` | `minor` | upgrade/report | `major` / `minor` / `patch` |
| `min-age` | `7` | upgrade/report | cooldown in days before accepting a new tag |
| `write` | `false` | pin/upgrade | `true` to apply changes |
| `explain` | `false` | audit | include remediation hints |
| `offline` | `false` | report | skip network calls |
| `output-path` | - | all | also save the report to this file |
| `token` | - | all | GitHub token (pass `${{ github.token }}`) |
| `working-directory` | `$GITHUB_WORKSPACE` | all | directory to scan |
| `node-version` | `20` | - | Node.js version to install |

Outputs:

| output | description |
|---|---|
| `status` | `OK` or `FAIL` (mirrors the CLI's exit signal) |
| `findings` | number of audit findings (audit/report) |
| `report-path` | absolute path of the saved report, if `output-path` was set |

The action also writes a job summary block with the output of the command,
making findings visible directly in the GitHub UI.

**Important:** the audit command exits non-zero when findings are reported,
which fails the job by default. To collect findings without failing the build,
set `continue-on-error: true` on the step.

## Use it from Claude Code

This repo is also a Claude Code plugin. Once installed, Claude will invoke
`actions-warden` automatically whenever a prompt asks to audit, pin, or
upgrade GitHub Actions workflows.

**Option A - via the plugin marketplace (recommended):**

```
/plugin marketplace add chiz0me/claude-plugins
/plugin install actions-warden@chiz0me
```

**Option B - drop the skill in directly (no marketplace):**

```sh
mkdir -p ~/.claude/skills/actions-warden
curl -fsSL https://raw.githubusercontent.com/chiz0me/actions-warden/main/skills/actions-warden/SKILL.md \
  -o ~/.claude/skills/actions-warden/SKILL.md
```

After installation, prompts like *"audit my workflows"*, *"pin my actions to
SHAs"*, or *"check this workflow for script injection"* will route through the
skill, which runs the CLI via `npx actions-warden` and explains the TOON
output back to you.

Plugin layout (per the Claude Code plugin spec):

```
.claude-plugin/plugin.json      # plugin manifest
skills/actions-warden/SKILL.md  # the skill itself
```

## Programmatic API

Each command is also exported as an async function, so an LLM agent or
larger Node tool can invoke it without spawning a subprocess.

```js
import { audit, pin, upgrade, report } from 'actions-warden';

const result = await audit({ cwd: '/path/to/repo', explain: true });
for (const finding of result.findings) {
  // result.findings[i].id is stable; pass it to pin({ fix: id })
}
```

Available functions: `audit`, `pin`, `upgrade`, `report`, `listRules`,
`parseWorkflowFile`, `renderAudit`, `renderPin`, `renderUpgrade`,
`renderReport`, `format`, `redact`.

## Audit rules

| id | severity | catches |
|---|---|---|
| `unpinned-action` | high | `uses:` refs that aren't 40-char SHAs |
| `excessive-permissions` | medium | `write-all` and broad write scopes |
| `secrets-in-env` | critical | secrets at workflow/job env (leaks to every step) |
| `script-injection` | critical | `github.event.*` interpolated into `run:` |
| `pull-request-target-checkout` | critical | "pwn-request" pattern |

Run `actions-warden rules` for the live list.

## LLM invocation safety

Every command is designed to be safe to invoke from an autonomous agent:

- `pin` and `upgrade` default to `--dry-run=true`. You cannot accidentally
  mutate files without explicitly passing `--write`.
- Output is deterministic and idempotent - re-running on an unchanged repo
  produces identical bytes.
- Every finding and every planned change carries a stable `id`. To apply a
  single fix without scope creep, pass `--fix=<id>`.
- The CLI never prompts interactively. All decisions are flag-driven.
- Secrets that leak into log lines (tokens, AWS keys, PEM blocks) are passed
  through a redactor before output.

## Authentication

```sh
export GITHUB_TOKEN=$(gh auth token)   # or set GH_TOKEN
actions-warden pin
```

The `--token` flag takes precedence. Without a token the GitHub API allows 60
requests/hour, which is enough for small repos but will rate-limit on larger
audits.

## Caching

GitHub API responses are cached in `.actions-warden-cache/` (gitignore it).
TTL defaults to 1 hour. Delete the directory to force a refresh.

## Exit codes

| code | meaning |
|---|---|
| `0` | success, no findings |
| `1` | findings reported, or errors during pin/upgrade |
| `2` | invalid arguments |

## Security

See [SECURITY.md](./SECURITY.md) for the disclosure policy.

## Maintainers

Release process, npm/marketplace setup, and verification commands live in
[RELEASING.md](./RELEASING.md).

## License

MIT
