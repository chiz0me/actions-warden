# actions-warden

[![npm](https://img.shields.io/npm/v/actions-warden?color=cb3837&logo=npm)](https://www.npmjs.com/package/actions-warden)
[![provenance](https://img.shields.io/badge/npm-provenance-5b21b6?logo=npm)](https://www.npmjs.com/package/actions-warden?activeTab=code)
[![ci](https://github.com/chiz0me/actions-warden/actions/workflows/ci.yml/badge.svg)](https://github.com/chiz0me/actions-warden/actions/workflows/ci.yml)
[![CodeQL](https://img.shields.io/badge/CodeQL-active-2188ff?logo=github)](https://github.com/chiz0me/actions-warden/security/code-scanning)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/chiz0me/actions-warden/badge)](https://securityscorecards.dev/viewer/?uri=github.com/chiz0me/actions-warden)
[![node](https://img.shields.io/node/v/actions-warden)](https://www.npmjs.com/package/actions-warden)
[![license: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

Audit GitHub Actions in a single repository or across an entire organization, then
pin, verify, and safely upgrade workflow dependencies.

`actions-warden` is available as a CLI, a bundled GitHub Action, and a
JavaScript API. It finds supply-chain risks, excessive permissions, script
injections, cross-run artifact executions, secret leaks, unpinned container
images, and privileged container settings without ever executing the
workflows it inspects.

### Why do you need this?

In GitHub Actions, most workflows reference third-party actions using version tags,
such as `uses: actions/checkout@v4`.

However, Git tags are mutable—anyone with write access to an action's repository
can change what `@v4` points to at any time. If an action maintainer's account is
compromised, an attacker can secretly push malicious code under the existing `@v4`
tag, and your next build or deployment pipeline will execute it automatically.

At the same time, common workflow mistakes like granting `permissions: write-all`
or directly interpolating untrusted input (such as pull request titles or comments)
into `run:` scripts can expose your production secrets or give attackers shell access.

`actions-warden` protects your pipelines with a clean, safety-first approach:
- **Catches risks early**: Audits your workflow YAML for vulnerabilities and gives plain-English remediation advice.
- **Locks dependencies permanently**: Pins external actions to immutable 40-character commit SHAs while preserving the original version in a helpful comment (e.g. `uses: actions/checkout@08c6903... # actions-warden-ref: v4.0.0`).
- **Safe by default**: Operates as a dry-run preview; it never modifies your workflow files unless you explicitly add `--write` to `pin` or `upgrade` (reports, baselines, and organization checkpoints are written only when their options or automatic artifacts are enabled).
- **Zero remote code execution**: Inspects workflow files in memory; it never clones repositories or runs untrusted scripts.

---

## Start here

| I want to… | Start with |
|---|---|
| Check this repository for security issues | `actions-warden audit --explain` |
| See every proposed security and dependency change | `actions-warden report` |
| Scan an entire GitHub organization | `actions-warden org-scan ORG` |
| Pin mutable action refs to immutable commit SHAs | `actions-warden pin`, review, then add `--write` |
| Verify that existing commit SHAs belong to the repo | `actions-warden verify` |
| Upgrade pinned actions with cooldown protection | `actions-warden upgrade`, review, then add `--write` |
| Run security checks in GitHub Actions CI | [GitHub Action guide](./docs/GITHUB-ACTION.md) |
| Integrate from Node.js or scripts | [JavaScript API](./docs/JAVASCRIPT-API.md) |
| Use it with AI coding agents (Claude, Copilot, etc.) | [AI and agent guide](./docs/AI-AGENTS.md) |
| Contribute to actions-warden | [Contributing guide](./CONTRIBUTING.md) |

---

## Quick start

Node.js 20 or newer is required.

### 1. Install actions-warden

You can install it globally, or run it directly without installing using `npx`:

```sh
npm install --global actions-warden

# Or use npx for a quick one-off run without installing:
npx --yes actions-warden@0.5.0 audit --explain
```

### 2. Follow the 3-step security workflow

```sh
# Step 1: Audit your workflows (completely local and read-only)
actions-warden audit --explain

# Step 2: Preview how mutable tags will be pinned (safe preview; no files are modified)
actions-warden pin

# Step 3: Review the plan, then apply the changes to your workflow files
actions-warden pin --write

# Bonus: Confirm that all pinned commit SHAs truly belong to their GitHub repositories
actions-warden verify
```

> [!NOTE]
> **Understanding exit codes:**
> When `audit` detects security issues, it completes with exit code `1`. This is completely normal and means findings were reported—just like a linter or compiler flagging issues in CI. Exit code `0` means no unsuppressed findings were detected at or above the configured severity threshold (accounting for baselines and ignored paths). Exit code `2` indicates an invocation error (such as an invalid argument or conflicting flags). See [outputs and exit behavior](./docs/OUTPUTS.md).

---

## Scan a GitHub organization

Set a token that can see the repositories you intend to scan, then run:

```sh
export GITHUB_TOKEN="$(gh auth token)"

actions-warden org-scan my-org \
  --severity=high
```

Organization scans default to a guarded, scope-keyed JSON report and
checkpoint under the working directory. Stdout contains only a compact JSON
receipt with their paths and summary. Running the same command again safely
resumes compatible repository results. Use `--fresh` to rescan everything or
`--no-auto-checkpoint` when resumable state is not wanted.

The scanner:

- paginates every repository visible to the token;
- excludes archived, disabled, and forked repositories by default;
- reads workflow and composite-action YAML from each default branch;
- applies the same rules, policy, and baseline model as a local audit;
- returns per-repository findings, source links, coverage counts, and errors;
- checkpoints each completed repository by default and can safely resume;
- shows live repository and retry progress on stderr without corrupting reports;
- never clones, checks out, or executes repository code.

Resume an interrupted scan by repeating the same command:

```sh
actions-warden org-scan my-org \
  --severity=high
```

For caller-managed state, `--checkpoint=path` also creates or automatically
resumes that path. `--resume=path` is the strict form for a restored checkpoint
that must already exist.

Resume still performs fresh organization discovery and checks every selected
default-branch tree SHA. Only unchanged, error-free repository results are
reused; changed and previously failed repositories are scanned again. Progress
defaults to interactive terminals; use `--progress=plain` for redirected logs,
`--progress=json` for JSON Lines events, or `--progress=none` to disable it.
The older `always` and `never` spellings remain aliases.

Compatible package upgrades reuse the same checkpoint. The producing package
version is recorded as metadata, while an explicit analysis generation plus
the rule catalog controls compatibility. A parser, discovery, or rule behavior
change advances that generation and requires a fresh scan. Compatible older
checkpoints are rewritten atomically on their first successful resume.

Compare a fresh scan with a compatible previous JSON report:

```sh
actions-warden org-scan my-org \
  --severity=high \
  --previous-report=actions-warden-org.previous.json \
  --format=json \
  --output-path=actions-warden-org.current.json
```

The comparison reports new, resolved, unchanged, and unknown findings.
Resolution fails closed: a finding is `unknown`, not `resolved`, when its
repository disappeared or the current scan could not cover it successfully.

For large retained JSON evidence, split the report into a compact aggregate,
complete per-repository files, and an integrity manifest:

```sh
actions-warden org-scan my-org \
  --report-dir=reports/actions-warden-org
```

This layout keeps downstream inspection and artifact uploads bounded. The
manifest is the authoritative current file set; the scanner still builds the
result in memory before writing the directory.

When a coding agent initiates the scan, use the explicit bounded mode:

```sh
actions-warden org-scan my-org --agent-mode
```

The regular safe report/checkpoint defaults still apply. Agent mode disables
implicit progress and uses an agent-specific receipt kind, unless explicit CLI
options override it. It deliberately shares the normal
`.actions-warden-org-scan.*` paths, so switching execution context does not
discard compatible resume state. `ACTIONS_WARDEN_CONTEXT=agent` is the
preferred integration-wide equivalent.

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

For a self-contained human review artifact, select HTML:

```sh
actions-warden org-scan my-org \
  --format=html \
  --output-path=actions-warden-org.html
```

The offline report includes coverage warnings, summary metrics, rule and
repository breakdowns, filters, source links, findings, and operational errors.

## Safe by default

The write boundary is deliberately explicit:

```text
audit/report/pin/upgrade plan → review IDs and diffs → --fix=<id> --write → verify
```

- `audit`, `report`, `verify`, and `org-scan` do not modify workflows.
- `pin` and `upgrade` are dry-runs unless `--write` is present.
- `--write --dry-run` is rejected instead of guessing intent.
- `--fix=<id>` limits a pin or upgrade to one exact source occurrence.
- Numeric limits and change IDs are parsed strictly; partial, fractional, and
  imprecise values fail before network or write work begins.
- Rewrites preserve surrounding YAML and are reparsed before an atomic write.
- `--output-path` implies file output. Repository commands still require a path
  for file output; `org-scan` generates a safe path when one is omitted.
- Paths, output files, and symlinks are constrained to the selected repository,
  and report/baseline/checkpoint destinations cannot replace workflows or
  policy controls.
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
| `csv` | Spreadsheet, data-warehouse, and compliance exports |
| `sarif` | Code scanning and SARIF-compatible systems |
| `html` | Self-contained, searchable human review artifact |

TOON output is one labeled record per line:

```text
SCAN: file=.github/workflows/release.yml
FINDING: id=18b82e86d7c14fe2 type=unpinned-action sev=high action=actions/checkout@v5 line=15
SUMMARY: files=1 findings=1 totalFindings=1 suppressed=0 critical=0 high=1 medium=0 low=0
STATUS: FAIL
```

Findings and proposed changes have stable, clone-independent IDs. JSON payloads
carry `schemaVersion: "1.0"`; CSV is deterministic and spreadsheet-safe; SARIF
is 2.1.0. HTML is deterministic, offline, credential-redacted, and capped at
32 MiB. See
[output contracts](./docs/OUTPUTS.md) for schemas, record labels, redaction,
status, and shell/CI handling.

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
consumer-side dependencies. Findings become native annotations and a bounded
structured job summary with severity, rule, remediation, error, and
organization-coverage and comparison views. Stable numeric outputs expose
finding, coverage, and comparison counts to later workflow steps, while an
optional saved JSON, CSV, SARIF, or HTML report retains evidence in the format
appropriate to its consumer.
The copyable
[CI violation-reporting example](./examples/ci-violation-reporting/README.md)
shows how to retain a JSON artifact before a separate policy gate fails the
job. CSV export, bounded webhook/ProjectDiscovery Notify delivery,
baseline-adoption, SARIF, HTML organization, organization-scan, and remediation
variants are listed in the [examples index](./examples/README.md). See the
[Action inputs, outputs, permissions, and examples](./docs/GITHUB-ACTION.md).

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
scan, use `actions-warden org-scan ORG --agent-mode`. Organization scans already
write a scope-keyed report and checkpoint, resume compatible state, and return
a compact receipt; agent mode additionally disables implicit progress while
retaining the same artifact identity. The agent then reads bounded summaries and relevant finding batches
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
result shapes, renderers, lower-level exports, error handling, and the
`auditSources` ownership boundary for broader organization scanners.

## Frequently asked questions (FAQ)

#### 1. Why should I pin actions to commit SHAs instead of using tags like `@v4`?
Git tags like `@v4` or `@main` can be modified or re-pointed by anyone who has write access to that action's repository. If an attacker compromises an action maintainer's account, they can push malicious code under the existing tag without anyone noticing. A 40-character commit SHA (such as `08c6903...`) is permanent and immutable—it can never be altered.

#### 2. Will `actions-warden pin` break my YAML comments or indentation?
No. `actions-warden` uses precise scalar range replacement instead of re-serializing the entire document. Your existing indentation, spacing, and comments are preserved. It also appends an inline comment (e.g. `# actions-warden-ref: v4.0.0`) so you and your team always know which version you are running.

#### 3. Do I need a GitHub Token for local audits?
No. The `audit` command runs completely offline on your computer without any network calls or tokens. Similarly, `report --offline` generates reports locally without network access. You only need a GitHub token for commands that query the GitHub API (`pin`, `verify`, `upgrade`, `org-scan`, and the default network-backed `report`).

#### 4. Why did `audit` return exit code 1? Did the command fail?
No, the command did not crash or fail unexpectedly. Exit code `1` means the scan completed successfully and detected unsuppressed findings at or above your configured severity threshold. This allows you to use `actions-warden` as a quality gate in your CI/CD pipelines to fail the job when actionable security issues are found. Exit code `0` means the scan completed with no unsuppressed findings at or above the threshold. Exit code `2` indicates CLI usage errors, invalid options, or syntax issues with command arguments.

#### 5. How does automatic resume work in organization scans?
During an organization scan, `actions-warden` saves a guarded checkpoint containing the scan state for every inspected repository. When you resume the scan by running the exact same command, `actions-warden` performs fresh repository discovery and checks the live default-branch tree SHA. Only completed, error-free repositories without parse errors whose tree SHA has not changed are reused; repositories that previously failed or encountered parse errors are never reused and are always rescanned. This saves significant time and API rate limits while ensuring any failing repository is retried.

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
