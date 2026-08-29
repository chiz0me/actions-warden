# actions-warden

[![npm](https://img.shields.io/npm/v/actions-warden?color=cb3837&logo=npm)](https://www.npmjs.com/package/actions-warden)
[![provenance](https://img.shields.io/badge/npm-provenance-5b21b6?logo=npm)](https://www.npmjs.com/package/actions-warden?activeTab=code)
[![ci](https://github.com/chiz0me/actions-warden/actions/workflows/ci.yml/badge.svg)](https://github.com/chiz0me/actions-warden/actions/workflows/ci.yml)
[![CodeQL](https://img.shields.io/badge/CodeQL-active-2188ff?logo=github)](https://github.com/chiz0me/actions-warden/security/code-scanning)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/chiz0me/actions-warden/badge)](https://securityscorecards.dev/viewer/?uri=github.com/chiz0me/actions-warden)
[![node](https://img.shields.io/node/v/actions-warden)](https://www.npmjs.com/package/actions-warden)
[![license: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

Audit GitHub Actions in one repository or across an entire organization, then
pin, verify, and safely upgrade workflow dependencies.

`actions-warden` is available as a CLI, a bundled GitHub Action, and a
JavaScript API. It finds supply-chain, permission, injection, artifact, secret,
container, reusable-workflow, and runner risks without executing the workflows
it inspects.

## Start here

| I want to… | Start with |
|---|---|
| Check this repository | `actions-warden audit --explain` |
| See every proposed security and dependency change | `actions-warden report` |
| Scan a GitHub organization | `actions-warden org-scan ORG --format=json` |
| Pin mutable action refs | `actions-warden pin`, review, then add `--write` |
| Verify existing SHA pins | `actions-warden verify` |
| Upgrade pinned actions | `actions-warden upgrade`, review, then add `--write` |
| Run in GitHub Actions | [GitHub Action guide](./docs/GITHUB-ACTION.md) |
| Integrate from JavaScript | [JavaScript API](./docs/JAVASCRIPT-API.md) |
| Use it from a coding agent | [AI and agent guide](./docs/AI-AGENTS.md) |
| Contribute | [Contributing guide](./CONTRIBUTING.md) |

## Quick start

Node.js 20 or newer is required.

```sh
npm install --global actions-warden

# Local and read-only
actions-warden audit --explain

# Network-backed, but still read-only
actions-warden report --format=json

# Preview pins; this does not change files
actions-warden pin

# Apply the reviewed pin plan
actions-warden pin --write

# Confirm the pins against GitHub
actions-warden verify
```

For a one-off run without a global install:

```sh
npx --yes actions-warden@0.2.0 audit --explain
```

`audit` returns exit code `1` when it finds issues. That is a completed scan,
not a malformed command; its JSON, TOON, text, or SARIF output remains the
report to inspect. Exit code `2` means the command could not be used as
requested. See [outputs and exit behavior](./docs/OUTPUTS.md).

## Scan a GitHub organization

Set a token that can see the repositories you intend to scan, then write a
versioned JSON report:

```sh
export GITHUB_TOKEN="$(gh auth token)"

actions-warden org-scan my-org \
  --severity=high \
  --checkpoint=.actions-warden-org-checkpoint.json \
  --format=json \
  --output=file \
  --output-path=actions-warden-org.json
```

The scanner:

- paginates every repository visible to the token;
- excludes archived, disabled, and forked repositories by default;
- reads workflow and composite-action YAML from each default branch;
- applies the same rules, policy, and baseline model as a local audit;
- returns per-repository findings, source links, coverage counts, and errors;
- checkpoints each completed repository when requested and can safely resume;
- shows live repository and retry progress on stderr without corrupting reports;
- never clones, checks out, or executes repository code.

Resume an interrupted scan with the same scope and policy:

```sh
actions-warden org-scan my-org \
  --severity=high \
  --resume=.actions-warden-org-checkpoint.json \
  --format=json \
  --output=file \
  --output-path=actions-warden-org.json
```

Resume still performs fresh organization discovery and checks every selected
default-branch tree SHA. Only unchanged, error-free repository results are
reused; changed and previously failed repositories are scanned again. Progress
defaults to interactive terminals; use `--progress=always` for redirected logs
or `--progress=never` to disable it.

When a coding agent initiates the scan, use the explicit bounded mode:

```sh
actions-warden org-scan my-org --agent-mode
```

It writes a scope-keyed JSON report and checkpoint, resumes compatible state,
disables progress, and returns only a compact JSON receipt with the report path
unless explicit CLI options override those defaults.

Limit scope with repository globs and visibility:

```sh
actions-warden org-scan my-org \
  --repository 'service-*' 'my-org/platform-*' \
  --visibility=private \
  --max-repos=100 \
  --concurrency=8 \
  --format=sarif \
  --output=file \
  --output-path=actions-warden-org.sarif
```

Private and internal scans require repository metadata and contents read
access. A truncated tree, inaccessible repository, oversized workflow, or
failed blob read is reported as an error so incomplete coverage cannot appear
clean. See the [organization-scan reference](./docs/CLI.md#org-scan) and the
[scheduled workflow example](./examples/org-scan.yml).

## Safe by default

The write boundary is deliberately explicit:

```text
audit/report/pin/upgrade plan → review IDs and diffs → --fix=<id> --write → verify
```

- `audit`, `report`, `verify`, and `org-scan` do not modify workflows.
- `pin` and `upgrade` are dry-runs unless `--write` is present.
- `--write --dry-run` is rejected instead of guessing intent.
- `--fix=<id>` limits a pin or upgrade to one exact source occurrence.
- Rewrites preserve surrounding YAML and are reparsed before an atomic write.
- Paths, output files, and symlinks are constrained to the selected repository.
- Credential-like values are recursively redacted from every output format.
- Repository policy is strictly validated; unknown keys and rule IDs fail.
- Remote organization source is kept in memory and is not persisted in cache.

See [SECURITY.md](./SECURITY.md) for the threat model and vulnerability
reporting process.

## Commands

| command | network | writes by default | purpose |
|---|---:|---:|---|
| `audit` | no | no | Scan workflows and composite actions for security findings |
| `report` | yes | no | Combine audit results with dry-run pin and upgrade plans |
| `pin` | yes | no | Resolve mutable action refs to immutable commit SHAs |
| `verify` | yes | no | Verify SHA ownership and human-readable version metadata |
| `upgrade` | yes | no | Plan or apply cooldown-aware dependency upgrades |
| `org-scan` | yes | no | Audit eligible repositories across a GitHub organization |
| `rules` | no | no | Print the live audit-rule catalog |

Run `actions-warden <command> --help` for live option help, or use the complete
[CLI reference](./docs/CLI.md).

By default, local commands discover:

```text
.github/workflows/*.yml
.github/workflows/*.yaml
action.yml
action.yaml
**/action.yml
**/action.yaml
```

Select exact files, directories, or globs with `--workflow`:

```sh
actions-warden audit -w .github/workflows/release.yml --explain
actions-warden audit -w '.github/workflows/*.yml' --severity=high
actions-warden audit -w .github/workflows .github/actions
```

Explicit targets that match nothing are errors.

## Configuration

Add `.actions-warden.yml` to make repository policy reviewable:

```yaml
version: 1
baseline: .actions-warden-baseline.json

ignore-paths:
  - .github/workflows/generated/**

rules:
  excessive-permissions:
    severity: high
  unpinned-container-image:
    enabled: false

runner-policy:
  self-hosted-labels:
    - private-*
  trusted-groups:
    - github-hosted-*
  flag-unknown-groups: true
```

Create a baseline only after reviewing the current findings:

```sh
actions-warden audit \
  --create-baseline=.actions-warden-baseline.json
```

Protect the policy and baseline with `CODEOWNERS` or branch rules; changing
either can intentionally alter what fails CI. The [configuration guide](./docs/CONFIGURATION.md)
covers strict validation, inline ignores, baselines, runner policy, and
organization-wide path matching.

List the current rules instead of relying on a copied table:

```sh
actions-warden rules --format=json
```

## Output built for people and automation

| format | best for |
|---|---|
| `toon` | Compact terminal and LLM context; the default |
| `json` | Versioned programmatic integrations |
| `text` | Human-readable line-oriented logs |
| `sarif` | Code scanning and SARIF-compatible systems |

TOON output is one labeled record per line:

```text
SCAN: file=.github/workflows/release.yml
FINDING: id=18b82e86d7c14fe2 type=unpinned-action sev=high action=actions/checkout@v5 line=15
SUMMARY: files=1 findings=1 totalFindings=1 suppressed=0 critical=0 high=1 medium=0 low=0
STATUS: FAIL
```

Findings and proposed changes have stable, clone-independent IDs. JSON payloads
carry `schemaVersion: "1.0"`; SARIF is 2.1.0. See [output contracts](./docs/OUTPUTS.md)
for schemas, record labels, redaction, status, and shell/CI handling.

## GitHub Action

Pin the Action itself to a reviewed full commit SHA:

```yaml
name: actions-warden

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # actions-warden-ref: v5.0.0
        with:
          persist-credentials: false

      - uses: chiz0me/actions-warden@<FULL_COMMIT_SHA>
        with:
          command: audit
          severity: high
          explain: 'true'
```

The committed bundle runs on GitHub's managed Node 24 runtime and installs no
consumer-side dependencies. Findings become native annotations and a job
summary. See the [Action inputs, outputs, permissions, and examples](./docs/GITHUB-ACTION.md).

## AI-assisted use

The CLI is non-interactive and flag-driven. For a safe agent loop:

```sh
actions-warden audit --format=json --explain
actions-warden pin --format=json
# After the user approves one planned ID:
actions-warden pin --fix=<ID> --write --format=json
actions-warden verify --format=json
actions-warden audit --format=json
```

Use JSON when the caller has a parser and TOON when context size matters.
Agents should treat policy changes, baselines, `--write`, and organization
tokens as security-sensitive boundaries. For an agent-initiated organization
scan, use `actions-warden org-scan ORG --agent-mode`. It automatically writes a
scope-keyed report and checkpoint, resumes compatible state, disables progress,
and returns only a compact JSON receipt unless explicit flags override those
defaults. The agent then reads bounded summaries and relevant finding batches
instead of placing the full report in model context. This preserves requested
coverage while controlling LLM token use. The
[AI and agent guide](./docs/AI-AGENTS.md#default-for-an-ai-initiated-scan)
defines the exact command, inspection sequence, decision loop, and parsing
contract.
Repository-local guidance is also available in [AGENTS.md](./AGENTS.md), and a
Claude Code skill ships in [`skills/actions-warden`](./skills/actions-warden/SKILL.md).

## JavaScript API

Every command is available without spawning a subprocess:

```js
import { audit, scanOrganization } from 'actions-warden';

const local = await audit({
  cwd: '/path/to/repository',
  severity: 'high',
  explain: true,
});

const organization = await scanOrganization({
  organization: 'my-org',
  token: process.env.GITHUB_TOKEN,
  severity: 'high',
});
```

See the [JavaScript API guide](./docs/JAVASCRIPT-API.md) for command options,
result shapes, renderers, lower-level exports, and error handling.

## Documentation

- [Documentation index](./docs/README.md)
- [CLI reference](./docs/CLI.md)
- [Configuration and baselines](./docs/CONFIGURATION.md)
- [Output contracts](./docs/OUTPUTS.md)
- [GitHub Action guide](./docs/GITHUB-ACTION.md)
- [JavaScript API](./docs/JAVASCRIPT-API.md)
- [AI and coding-agent guide](./docs/AI-AGENTS.md)
- [Developer guide](./docs/DEVELOPMENT.md)
- [Contributing](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)
- [Maintainer and agent release runbook](./RELEASING.md)

## License

[MIT](./LICENSE)
