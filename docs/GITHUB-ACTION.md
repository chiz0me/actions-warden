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
| `format` | `auto` | all | `auto` uses JSON for `org-scan` and TOON otherwise; explicit formats are also accepted |
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
| `checkpoint-path` | generated | `org-scan` | Create or automatically resume this atomic checkpoint |
| `resume-from` | none | `org-scan` | Resume from and update an existing checkpoint |
| `fresh` | `false` | `org-scan` | Ignore reusable results and replace the selected checkpoint |
| `auto-checkpoint` | `true` | `org-scan` | Generate a scope-keyed checkpoint when no path is supplied |
| `previous-report` | none | `org-scan` | Compare with a compatible previous organization JSON report |
| `progress` | `true` | `org-scan` | Show discovery, repository, retry, and completion updates in the step log |
| `output-path` | generated for `org-scan` | all | Save inside the working directory; CSV/HTML require it for other commands |
| `token` | none | network commands | GitHub API token; normally `${{ github.token }}` or a secret |
| `working-directory` | `$GITHUB_WORKSPACE` | all | Scan and path-safety root |
| `node-version` | ignored | all | Deprecated compatibility input; the bundled runtime is managed by GitHub |

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
| `findings` | Unsuppressed findings after severity filtering |
| `total-findings` | Findings before baseline suppression and after severity filtering |
| `critical` | Unsuppressed critical findings |
| `high` | Unsuppressed high findings |
| `medium` | Unsuppressed medium findings |
| `low` | Unsuppressed low findings |
| `suppressed` | Findings accepted by the active baseline |
| `errors` | Operational errors, including workflow parse failures |
| `repositories-discovered` | Repositories visible during `org-scan` discovery |
| `repositories-selected` | Repositories selected by `org-scan` scope and limits |
| `repositories-scanned` | Selected repositories whose scan completed, including failed results |
| `repositories-resumed` | Completed repositories reused from a revision-verified checkpoint |
| `repositories-failed` | Repositories with API, tree, or blob coverage errors |
| `coverage-complete` | `true` when every eligible repository was covered, `false` for caps/gaps, empty outside `org-scan` |
| `new-findings` | Findings added since `previous-report` |
| `resolved-findings` | Findings safely resolved since `previous-report` |
| `unchanged-findings` | Findings unchanged since `previous-report` |
| `unknown-findings` | Prior findings whose resolution is unknown because coverage was incomplete |
| `report-path` | Absolute saved path; always populated for `org-scan` |
| `checkpoint-path` | Absolute active `org-scan` checkpoint path, or empty when disabled |
| `annotations` | Number of annotations emitted |
| `annotations-skipped` | Number omitted by the per-level cap |

All numeric outputs are decimal strings and are always set. Finding and
repository outputs are `0` for commands where they do not apply. For
`audit`, `report`, and `org-scan`, `total-findings` equals `findings` plus
`suppressed`, and the four severity outputs sum to `findings`.
Use expression index syntax for hyphenated names, for example
`${{ steps.warden.outputs['total-findings'] }}`.
`coverage-complete` is the one non-numeric coverage output and can be `false`
for an otherwise `OK` scan intentionally capped by `max-repos`.

Comparison outputs are also always set and remain `0` unless an organization
scan uses `previous-report`. Never treat `resolved-findings` as complete unless
`unknown-findings`, `repositories-failed`, and `errors` are all `0` and the
saved comparison reports `summary.complete: true`.

`errors` follows the Action's operational-failure policy: it counts YAML parse
failures plus resolution, verification, write, and organization coverage
errors as applicable. An invocation-level failure that occurs before a normal
result sets `status: FAIL`, `errors: 1`, and all finding and repository counts
to `0`.

Give the step an `id` to read outputs:

```yaml
- name: Audit workflows
  id: warden
  uses: chiz0me/actions-warden@<FULL_COMMIT_SHA>
  with:
    command: audit
    fail-on-findings: 'false'

- name: Show result
  shell: bash
  env:
    WARDEN_STATUS: ${{ steps.warden.outputs.status }}
    WARDEN_FINDINGS: ${{ steps.warden.outputs.findings }}
    WARDEN_CRITICAL: ${{ steps.warden.outputs.critical }}
    WARDEN_HIGH: ${{ steps.warden.outputs.high }}
    WARDEN_ERRORS: ${{ steps.warden.outputs.errors }}
  run: |
    printf 'status=%s findings=%s critical=%s high=%s errors=%s\n' \
      "$WARDEN_STATUS" "$WARDEN_FINDINGS" "$WARDEN_CRITICAL" \
      "$WARDEN_HIGH" "$WARDEN_ERRORS"
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

## Job summary

The Action writes a structured, bounded Markdown summary instead of copying
the raw selected output format into the page. Depending on the command, it
includes:

- result, finding, suppression, annotation, and operational-error counts;
- severity and rule breakdowns plus the highest-severity finding details;
- organization repository coverage, exact checkpoint reuse, and
  previous-report change counts;
- planned or applied dependency changes and cooldown skips;
- verification warnings and operational error details;
- the repository-relative saved-report path when a report is written;
- the checkpoint path, whether it was loaded, and how many repository results
  were actually reused.

Detail sections show at most 10 ordered records. Organization reports are
always file-only so large or private cross-repository evidence is not copied
into the step log. CSV and HTML are also file-only for repository commands;
other repository-command formats remain in stdout and in a saved report when
configured.
Dynamic values are
credential-redacted, Markdown-escaped, control-character-normalized, and
length-bounded before GitHub renders them. Invocation-level failures receive a
summary with the redacted error even when no normal report could be produced.

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

`output-path` saves the selected format. For repository commands, TOON, JSON,
text, and SARIF also remain on stdout while CSV and HTML are file-only.
Organization scans always save the complete report and put only progress,
annotations, and a short saved-path message in the step log:

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
    path: ${{ steps.warden.outputs['report-path'] }}
    if-no-files-found: error
```

The output path must remain inside `working-directory`, its parent directory
must already exist, and an existing destination must be a regular file rather
than a directory or symlink.

With `format: csv` or `format: html`, `output-path` is required for commands
other than `org-scan`; organization scans generate a path when it is omitted.
The complete report is written there and is not copied into the step log. The bounded
Markdown job summary and native annotations remain available. CSV is
deterministic, control-character escaped, formula-safe, and flat. HTML is
self-contained, redacted, escaped, protected by a restrictive content security
policy, and capped at 32 MiB.

For a complete enforcing workflow that uploads the report before failing its
policy gate, copy the
[CI violation-reporting example](../examples/ci-violation-reporting/README.md).
For gradual rollout in an existing repository, use the
[baseline-adoption example](../examples/baseline-adoption/README.md). To publish
findings into GitHub Code Scanning on trusted runs, use the
[SARIF example](../examples/sarif-code-scanning/README.md).
For an offline organization dashboard, use the
[HTML organization report example](../examples/html-organization-report/README.md).
For spreadsheet or warehouse ingestion, use the
[CSV reporting example](../examples/csv-reporting/README.md).

## Webhooks and ProjectDiscovery Notify

The Action does not own a webhook destination or send outbound notifications.
Keep delivery in a separate workflow step so provider credentials, payload
mapping, retries, timeouts, and delivery failure policy remain explicit in the
calling repository. Send bounded Action outputs and a workflow-run link by
default; retain the complete report as a protected artifact instead of posting
private evidence to a chat provider.

The [notification example](../examples/notifications/README.md) includes a
generic HTTPS workflow and an optional ProjectDiscovery Notify adapter. The
generic path validates HTTPS, avoids redirects, applies bounded retries and
timeouts, and never places the webhook URL in a command-line argument or
report. ProjectDiscovery provider configuration belongs in a masked secret and
is materialized only for the delivery step.

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
          fail-on-findings: 'false'

      - name: Upload organization report
        if: always()
        uses: actions/upload-artifact@330a01c490aca151604b8cf639adc76d48f6c5d4 # actions-warden-ref: v5.0.0
        with:
          name: actions-warden-org-report
          path: |
            ${{ steps.warden.outputs['report-path'] }}
            ${{ steps.warden.outputs['checkpoint-path'] }}
          include-hidden-files: true
          if-no-files-found: error
```

Keep the token in Actions secrets, avoid printing it, and grant only metadata
and contents read access for selected repositories. The complete copyable file
is [examples/org-scan.yml](../examples/org-scan.yml). Generated organization
paths are dotfiles, so artifact upload steps must opt in to hidden files or use
explicit non-hidden `output-path` and `checkpoint-path` values.

The Action writes live progress to the step log separately from the selected
report format. Set `progress: 'false'` to disable it.

CLI `--agent-mode` is not an Action input. The Action already keeps the complete
organization report in a generated file, creates or resumes a generated
checkpoint, exposes both paths as outputs, and uses bounded progress,
annotation, and summary channels.

`checkpoint-path` creates the file when absent and automatically resumes it
when present, so a repeated step configuration does not need to switch inputs.
Use `resume-from` when a restored checkpoint must already exist, `fresh: 'true'`
to replace selected state without reuse, or `auto-checkpoint: 'false'` for a
stateless scan. `fresh` and `resume-from` are mutually exclusive. The Action
does not itself retain files between ephemeral runners; restore a protected
artifact or other caller-managed file to the same path before the step when
cross-run resume is required. Scope, policy, baseline, analysis generation,
and rule identity must match; a compatible package-version change is allowed
and atomically refreshes checkpoint metadata on the first successful resume.
Fresh repository discovery and tree checks still occur, and changed or previously
failed repositories are rescanned. Checkpoints hold redacted report evidence
about repositories and findings, so protect them like the organization report.
`checkpoint-path` and `resume-from` are mutually exclusive and cannot equal
the resolved report path.

To calculate change, restore a previous JSON report into the working directory
and set `previous-report` to that path. It must match the current scope, policy,
baseline, rules, and analysis generation, and it cannot equal `output-path`,
`checkpoint-path`, or `resume-from`. New, resolved, unchanged, and unknown
counts appear in Action outputs and the job summary. Missing or failed current
repositories make prior findings unknown rather than resolved. SARIF cannot be
combined with `previous-report`; use JSON, TOON, text, CSV, or HTML.

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
