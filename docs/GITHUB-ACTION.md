# GitHub Action guide

The bundled JavaScript Action runs the same commands as the CLI on GitHub's
managed Node 24 runtime. Consumer workflows do not run `npm install`.

## Repository audit

Pin every third-party Action, including actions-warden itself, to a reviewed
full commit SHA:

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

      - name: Audit workflows
        uses: chiz0me/actions-warden@<FULL_COMMIT_SHA>
        with:
          command: audit
          severity: high
          explain: 'true'
```

Findings are written to the log, job summary, and native annotations. Audit
findings fail the step by default.

## Inputs

GitHub passes Action inputs as strings. Boolean values should be quoted in YAML
for clarity.

| input | default | applies to | behavior |
|---|---|---|---|
| `command` | `audit` | all | `audit`, `pin`, `upgrade`, `verify`, `report`, `org-scan`, or `rules` |
| `workflow` | discovery | repository commands | One path/glob per line or a JSON string array |
| `severity` | all levels | `audit`, `report`, `org-scan` | Minimum `low`, `medium`, `high`, or `critical` |
| `format` | `toon` | all | `toon`, `json`, `text`, or `sarif` |
| `mode` | `minor` | `upgrade`, `report` | `major`, `minor`, or `patch` |
| `min-age` | `7` | `upgrade`, `report` | Non-negative cooldown in days |
| `write` | `false` | `pin`, `upgrade` | Apply changes in the checked-out workspace |
| `fix` | none | `pin`, `upgrade` | Limit work to one exact planned ID |
| `explain` | `false` | `audit`, `report`, `org-scan` | Include remediation hints |
| `offline` | `false` | `report` | Skip pin and upgrade network work |
| `fail-on-findings` | `true` | `audit`, `report`, `org-scan` | Allow findings to be advisory when `false` |
| `annotations` | `true` | all | Emit native workflow-command annotations |
| `config` | auto | `audit`, `report`, `org-scan` | Policy path inside the working directory |
| `ignore-config` | `false` | `audit`, `report`, `org-scan` | Ignore repository policy |
| `baseline` | policy/default | `audit`, `report`, `org-scan` | Accepted-finding baseline |
| `organization` | none | `org-scan` | Required organization login |
| `repository` | all eligible | `org-scan` | One repository glob per line or a JSON string array |
| `visibility` | `all` | `org-scan` | `all`, `public`, `private`, or `internal` |
| `include-archived` | `false` | `org-scan` | Include archived repositories |
| `include-disabled` | `false` | `org-scan` | Include disabled repositories |
| `include-forks` | `false` | `org-scan` | Include forked repositories |
| `max-repos` | none | `org-scan` | Positive repository limit |
| `concurrency` | `4` | `org-scan` | Concurrent repository scans from 1 through 16 |
| `checkpoint-path` | none | `org-scan` | Create or replace an atomic resumable checkpoint |
| `resume-from` | none | `org-scan` | Resume from and update an existing checkpoint |
| `progress` | `true` | `org-scan` | Show discovery, repository, retry, and completion updates in the step log |
| `output-path` | none | all | Save the selected format inside the working directory |
| `token` | none | network commands | GitHub API token; normally `${{ github.token }}` or a secret |
| `working-directory` | `$GITHUB_WORKSPACE` | all | Scan and path-safety root |

`node-version` is a deprecated compatibility input. It is accepted but ignored
because the Action runtime is declared by the bundle.

Multivalue inputs can be line-separated:

```yaml
with:
  workflow: |
    .github/workflows/release.yml
    .github/actions
```

or JSON:

```yaml
with:
  repository: '["service-*", "platform-*"]'
```

## Outputs and failure policy

| output | description |
|---|---|
| `status` | Semantic `OK` or `FAIL` |
| `findings` | Finding count for `audit`, `report`, and `org-scan` |
| `report-path` | Absolute saved path when `output-path` is supplied |
| `annotations` | Number of annotations emitted |
| `annotations-skipped` | Number omitted by the per-level cap |

Give the step an `id` to read outputs:

```yaml
- name: Audit workflows
  id: warden
  uses: chiz0me/actions-warden@<FULL_COMMIT_SHA>
  with:
    command: audit
    fail-on-findings: 'false'

- name: Show result
  run: echo "status=${{ steps.warden.outputs.status }} findings=${{ steps.warden.outputs.findings }}"
```

`fail-on-findings: 'false'` changes step failure only for security findings in
`audit`, `report`, and `org-scan`. It does not hide findings or change the
`status` output.

Operational failures always fail the step, including:

- invalid or unparseable workflow YAML;
- organization repository or blob read failures;
- ref resolution and ownership-verification failures;
- unsafe paths or writes;
- errors in the pin or upgrade phases of `report`.

`pin`, `upgrade`, and `verify` errors always fail. Warnings from `verify` do
not fail.

## Native annotations

Annotations are independent of `format`:

| result | annotation level |
|---|---|
| critical or high finding | error |
| medium finding | warning |
| low finding | notice |
| verification warning | warning |
| resolver, verification, scan, or write error | error |

Local findings attach to the repository-relative file and source line.
Organization findings belong to other repositories, so they omit a local file
attachment while retaining repository, remote path, source URL, rule, and
stable ID in the message and saved report.

The Action emits at most 10 annotations per level per step, with more severe
records first. All omitted records remain in normal output and saved reports.
Set `annotations: 'false'` to disable annotations without changing status or
failure behavior.

Workflow-command data is escaped and credential-like values are redacted before
emission.

## Save a report artifact

`output-path` writes the selected format in addition to stdout:

```yaml
- name: Generate report
  id: warden
  uses: chiz0me/actions-warden@<FULL_COMMIT_SHA>
  with:
    command: report
    format: json
    output-path: reports/actions-warden.json
    fail-on-findings: 'false'
    token: ${{ github.token }}

- name: Upload report
  if: always()
  uses: actions/upload-artifact@330a01c490aca151604b8cf639adc76d48f6c5d4 # actions-warden-ref: v5.0.0
  with:
    name: actions-warden-report
    path: ${{ steps.warden.outputs.report-path }}
    if-no-files-found: error
```

The output path must remain inside `working-directory`, its parent directory
must already exist, and an existing destination must be a regular file rather
than a directory or symlink.

## Organization report

The default repository `GITHUB_TOKEN` generally sees only the repository where
the workflow runs. Use a GitHub App installation token or a fine-grained token
whose repository access covers the intended organization scope.

```yaml
name: organization Actions report

on:
  workflow_dispatch:
  schedule:
    - cron: '23 7 * * 1'

permissions:
  contents: read

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # actions-warden-ref: v5.0.0
        with:
          persist-credentials: false

      - name: Scan organization
        id: warden
        uses: chiz0me/actions-warden@<FULL_COMMIT_SHA>
        with:
          command: org-scan
          organization: ${{ github.repository_owner }}
          token: ${{ secrets.ACTIONS_WARDEN_ORG_TOKEN }}
          severity: high
          explain: 'true'
          format: json
          output-path: actions-warden-org-report.json
          checkpoint-path: .actions-warden-org-checkpoint.json
          fail-on-findings: 'false'

      - name: Upload organization report
        if: always()
        uses: actions/upload-artifact@330a01c490aca151604b8cf639adc76d48f6c5d4 # actions-warden-ref: v5.0.0
        with:
          name: actions-warden-org-report
          path: |
            actions-warden-org-report.json
            .actions-warden-org-checkpoint.json
          if-no-files-found: error
```

Keep the token in Actions secrets, avoid printing it, and grant only metadata
and contents read access for selected repositories. The complete copyable file
is [examples/org-scan.yml](../examples/org-scan.yml).

The Action writes live progress to the step log separately from the selected
report format. Set `progress: 'false'` to disable it.

CLI `--agent-mode` is not an Action input. The Action already has explicit
`output-path`, checkpoint, progress, summary, and output channels; configure
those inputs directly when an agent generates a workflow.

`checkpoint-path` starts a new checkpoint. To resume, restore that file into
the working directory before the actions-warden step, remove
`checkpoint-path`, and set `resume-from` to the restored path. The Action does
not itself retain files between ephemeral runners; use a protected artifact or
other caller-managed storage. Scope, policy, baseline, analysis generation, and
rule identity must match; a compatible package-version change is allowed and
atomically refreshes checkpoint metadata on the first successful resume. Fresh
repository discovery and tree checks still occur, and changed or previously
failed repositories are rescanned. Checkpoints hold redacted report evidence
about repositories and findings, so protect them like the organization report.
`checkpoint-path` and `resume-from` are mutually exclusive and cannot equal
`output-path`.

## Mutation workflows

With `write: 'true'`, `pin` and `upgrade` modify only the runner's checked-out
working tree. The Action does not commit, push, or open a pull request.

A safe automation flow is:

1. run the command without `write` and retain the report;
2. require review or select one `fix` ID;
3. run with `write: 'true'`;
4. run `verify` and repository tests;
5. create a pull request using a separately reviewed workflow.

See [examples/upgrade-pr.yml](../examples/upgrade-pr.yml) for an opt-in,
cooldown-aware upgrade pull request workflow. It uses explicit contents and
pull-request write permissions only in the mutation job.

## Bundle integrity

The repository commits `dist/index.js` because GitHub Actions executes the
bundle directly. Releases verify that a clean rebuild matches the committed
bundle. Consumers should pin the Action to a full commit SHA, then use
actions-warden's metadata comment to retain the reviewed release name.
