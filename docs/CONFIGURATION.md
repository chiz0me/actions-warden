# Configuration, ignores, and baselines

actions-warden can run with built-in defaults, or load a versioned policy from
the repository being scanned.

## Policy discovery

The default filenames are:

```text
.actions-warden.yml
.actions-warden.yaml
```

If both exist, `.actions-warden.yml` wins. Select another file with `--config`,
or skip repository policy with `--ignore-config`:

```sh
actions-warden audit --config=security/actions-warden.yml
actions-warden audit --ignore-config
```

The policy path must resolve inside `--cwd`, including after symlink
resolution. `--config` and `--ignore-config` are mutually exclusive.

Configuration is strict by design. Unknown top-level keys, unknown rule IDs,
unknown nested keys, invalid severities, and values of the wrong type stop the
scan. This prevents a typo from silently weakening policy.

## Complete policy shape

```yaml
version: 1
baseline: .actions-warden-baseline.json

ignore-paths:
  - .github/workflows/generated/**
  - .github/actions/vendor/**

rules:
  excessive-permissions:
    enabled: true
    severity: high
  unpinned-container-image:
    enabled: false

runner-policy:
  self-hosted-labels:
    - private-*
    - arc-*
  trusted-groups:
    - github-hosted-*
  flag-unknown-groups: true
```

| key | type | default | meaning |
|---|---|---|---|
| `version` | integer | `1` | Policy schema; if present, must be `1` |
| `baseline` | non-empty string | none | Baseline path relative to `--cwd` |
| `ignore-paths` | string array | `[]` | Picomatch globs excluded before parsing |
| `rules` | mapping | `{}` | Per-rule enablement and severity overrides |
| `runner-policy` | mapping | built-in defaults | Additional self-hosted runner selectors and group trust |

Rule policies accept only:

| key | type | default |
|---|---|---|
| `enabled` | boolean | `true` |
| `severity` | `low`, `medium`, `high`, or `critical` | rule default |

A CLI `--baseline` overrides the policy's `baseline`. A CLI `--severity`
filters after any configured severity override.

## Rule IDs

Use the installed version as the source of truth:

```sh
actions-warden rules --format=json
```

The current built-in rules are:

| ID | default severity | detects |
|---|---|---|
| `unpinned-action` | high | External actions and reusable workflows without a full commit SHA |
| `unpinned-docker-action` | high | Mutable `docker://` action images |
| `unpinned-container-image` | high | Mutable job, service, or Docker action images |
| `excessive-permissions` | medium | Broadly writable workflow or job `GITHUB_TOKEN` permissions |
| `secrets-in-env` | medium | Named job secrets exposed broadly; workflow-wide or dynamic all-secret exposure is high |
| `script-injection` | critical | Untrusted GitHub context, including tainted `env`, interpolated into a shell or script action |
| `pull-request-target-checkout` | critical | Privileged pull-request code retrieval without an active checkout guard |
| `reusable-workflow-secrets-inherit` | high | External reusable workflows receiving every caller secret |
| `untrusted-self-hosted-runner` | high | Untrusted pull-request code reaching self-hosted infrastructure |
| `workflow-run-artifact-execution` | critical | Privileged `workflow_run` jobs executing cross-run artifacts |
| `workflow-structure` | medium | Structurally invalid workflow or composite-action syntax |

Rule findings may adjust severity based on the recognized pattern. A configured
severity override is applied to every finding produced by that rule.

## Rule accuracy and analysis boundaries

The audit is static and offline. It parses YAML and follows a small amount of
local data flow, but it does not evaluate expressions, call referenced actions,
inspect organization settings, or execute workflow code. Findings therefore
describe a recognized risk pattern and its evidence, not a proof that every
runtime path is exploitable.

The current rule boundaries are deliberate:

- `unpinned-action` requires a full 40-character commit SHA for external
  actions and reusable workflows. Workspace-relative `./` references and
  GitHub's `$/` self-repository references are not external dependencies. A
  `$/` reference follows the exact workflow commit and requires runner 2.336.0
  or newer, cannot include an `@ref` suffix, and is not available on GitHub
  Enterprise Server; see GitHub's [self-repository syntax announcement](https://github.blog/changelog/2026-07-30-reference-same-repository-actions-with-self-repository-syntax/).
- `excessive-permissions` treats a missing top-level declaration as a low
  advisory because token defaults are configurable. It reports `write-all` and
  maps with at least three writable scopes, but does not guess that one
  purpose-specific write scope is unnecessary. Invalid permission values are
  reported by `workflow-structure` instead.
- `secrets-in-env` reports a named secret at job scope as medium, and raises
  workflow-wide scope, dynamic indexing, and `toJSON(secrets)` to high. GitHub
  may need to expose every available secret to resolve a dynamic reference.
  Job scope can be necessary for a secret-dependent `if` condition; in that
  case every job step should be trusted and the secret should carry minimal
  privilege. A named step-scoped secret is outside this rule, but dynamic or
  all-secret access is reported even at step scope.
- `script-injection` follows known attacker-controlled GitHub fields directly
  into `run` and `actions/github-script`, and through workflow, job, or step
  `env` when the script re-interpolates `${{ env.NAME }}`. The safe boundary is
  native shell syntax such as `"$NAME"` or JavaScript `process.env.NAME`, as in
  GitHub's [CodeQL recommendation](https://codeql.github.com/codeql-query-help/actions/actions-code-injection-critical/).
- `pull-request-target-checkout` understands GitHub's June 2026 checkout
  protection and its July 20 backport for floating `actions/checkout` v2-v7
  tags, protected release
  versions (`v2.8.0`, `v3.7.0`, `v4.4.0`, `v5.1.0`, `v6.1.0`, and v7+), and the
  exact known release SHAs. It still reports an explicit or expression-driven
  `allow-unsafe-pr-checkout`, older versions, direct `git`/`gh` fetches, and
  unknown pinned SHAs. Version comments are not trusted as security evidence.
  A protected floating major can therefore avoid this finding while still
  producing `unpinned-action`; the two rules cover different risks. See
  GitHub's [checkout protection announcement](https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/).
- `workflow-run-artifact-execution` treats the official
  `actions/download-artifact` action as cross-run only when `run-id` selects
  another run. A same-run download is not enough to trigger the rule. Artifact
  paths under `${{ runner.temp }}` remain isolated from unrelated workspace
  commands, but execution or loading from that exact path is still reported.
- `untrusted-self-hosted-runner` reports ordinary `pull_request` jobs on
  recognized self-hosted selectors. For `pull_request_target`, it requires a
  recognized unsafe PR checkout or direct fetch instead of assuming that a
  trusted labeling job executes fork code. Literal matrix dimensions and
  `include` entries are followed when `runs-on` selects a matrix key. Matrices
  generated by expressions still require manual review. Use `runner-policy`
  for organization-specific labels and groups.
- `workflow-structure` checks required trigger/job/step shapes, reusable-job
  conflicts, permission values, and composite run-step shells. It recognizes
  GitHub's current `background`, `wait`, `wait-all`, `cancel`, and `parallel`
  step syntax, validates the documented control shapes, and recursively scans
  actions and scripts inside `parallel` groups. Background and parallel steps
  authored inside composite actions are reported because GitHub does not
  support them there. See GitHub's [current concurrent-step
  syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepsbackground).
  This rule is not a full replacement for GitHub's server-side workflow
  validator.

Execution recognition is intentionally conservative but finite: it covers
common shell scripts, package managers, build/test commands, local actions, and
build-like third-party actions. A custom action or unusual interpreter can
consume untrusted files without being recognized. Review privileged
`pull_request_target` and `workflow_run` jobs manually, and use GitHub Actions
CodeQL alongside this audit when complete interprocedural analysis is needed.

## Runner policy

The self-hosted runner rule always recognizes the literal `self-hosted` label.
Policy can add organization-specific labels and group handling:

```yaml
runner-policy:
  self-hosted-labels:
    - linux-prod-*
    - arc-runner-*
  trusted-groups:
    - github-hosted-*
  flag-unknown-groups: true
```

`self-hosted-labels` and `trusted-groups` use Picomatch glob syntax.

GitHub runner groups are not assumed unsafe by default because a group may
select GitHub-hosted infrastructure. When `flag-unknown-groups` is `true`, a
pull-request job using a group is reported unless the group matches
`trusted-groups`.

## Path exclusions

`ignore-paths` is applied before a workflow is parsed:

```yaml
ignore-paths:
  - .github/workflows/generated/**
  - .github/actions/third-party/**
```

For a local audit, paths are relative to `--cwd`. For `org-scan`, the local
organization policy applies to every repository and paths begin with
`owner/repository/`:

```yaml
ignore-paths:
  - my-org/generated-repo/.github/workflows/**
  - my-org/archive-*/.github/actions/**
```

A path exclusion removes the file from coverage. Use it for generated or
vendored sources whose ownership and review process is understood, and protect
policy changes like code.

## Inline ignore directives

Use an inline directive when a specific finding has been reviewed and the file
should remain in scan coverage.

Ignore one rule on the same line:

```yaml
- uses: owner/action@v1 # actions-warden-ignore: unpinned-action
```

Ignore the next non-empty, non-comment line:

```yaml
# actions-warden-ignore-next-line: excessive-permissions
permissions: write-all
```

Ignore a block:

```yaml
# actions-warden-ignore-start: workflow-structure
permissions:
# actions-warden-ignore-end
```

Ignore a rule for the whole file:

```yaml
# actions-warden-ignore-file: unpinned-action
```

The short `aw-` prefix is also accepted, for example
`# aw-ignore-next-line: script-injection`. Multiple rule IDs may be separated by
commas or whitespace. Omitting rule IDs suppresses every rule in that scope;
prefer naming the narrowest rule so future checks remain active.

Unmatched `ignore-start` directives extend to the end of the file. An
`ignore-end` without an open block has no effect.

## Baselines

A baseline records existing, reviewed findings so that your CI stays green on
day one, while ensuring that any **new** vulnerabilities fail future pull requests.

### How to adopt on an existing codebase (without breaking CI)

When introducing `actions-warden` to an established project, you may encounter
existing warnings. Rather than blocking your team until every single issue is
resolved, follow this recommended baseline adoption workflow:

1. **Record current findings in a baseline file:**
   ```sh
   actions-warden audit \
     --create-baseline=.actions-warden-baseline.json
   ```
2. **Reference the baseline in `.actions-warden.yml`:**
   ```yaml
   version: 1
   baseline: .actions-warden-baseline.json
   ```
3. **Commit both files to your repository.**
4. **Enable `actions-warden` in your CI pipeline.**
   All existing issues are now suppressed so builds remain green. However, if any
   pull request introduces a **new** security finding or unpinned action, CI will
   fail immediately—preventing security debt from growing.
5. **Gradually fix issues over time:**
   As you pin actions or fix permissions, simply re-generate or update your baseline.

The baseline file is saved as a deterministic, human-readable JSON document:

```json
{
  "schemaVersion": "1.0",
  "generatedBy": "actions-warden",
  "findings": [
    {
      "id": "18b82e86d7c14fe2",
      "fingerprint": "a5c4f4a2797d17d9",
      "ruleId": "unpinned-action",
      "severity": "high",
      "file": ".github/workflows/ci.yml",
      "line": 14
    }
  ]
}
```

Load it explicitly:

```sh
actions-warden audit \
  --baseline=.actions-warden-baseline.json
```

or through policy:

```yaml
version: 1
baseline: .actions-warden-baseline.json
```

Each finding has two matching identities:

- `id` identifies the exact repository-relative source occurrence and is stable
  across clones;
- `fingerprint` ignores line movement while retaining semantic fields, file,
  rule, and source-order ordinal for equivalent duplicates.

A baseline match suppresses the finding from `findings`. The summary still
reports `totalFindings` and `suppressed`. Parser failures cannot be baselined.

Review baseline diffs carefully. Deleting a finding from the baseline makes it
active again; adding one accepts that risk without changing the workflow.
Organization report comparison includes normalized policy and baseline
contents in its analysis identity. Changing either intentionally requires a
new comparison starting point instead of presenting policy-driven differences
as resolved workflow findings.
The [baseline-adoption example](../examples/baseline-adoption/README.md) shows
the complete review, artifact, and CI-gating flow.

## Policy ownership

Treat these files as security controls:

```text
.actions-warden.yml
.actions-warden.yaml
.actions-warden-baseline.json
```

Recommended controls include:

- require review from a security or platform owner through `CODEOWNERS`;
- prevent unreviewed direct pushes with branch protection;
- show policy and baseline diffs in dependency-maintenance pull requests;
- avoid granting a scanning pull request permission to rewrite its own policy.

## Related guides

- [CLI reference](./CLI.md)
- [Output contracts](./OUTPUTS.md)
- [GitHub Action](./GITHUB-ACTION.md)
- [Security policy](../SECURITY.md)
