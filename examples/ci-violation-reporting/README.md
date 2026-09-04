# CI violation reporting

This example adds an enforcing GitHub Actions check without giving the scan
write access or repository secrets. It reports high and critical workflow
violations as native annotations, saves the complete JSON report as a workflow
artifact, and then fails the job after the artifact step has had a chance to
run.

## Files

| file | copy to | purpose |
|---|---|---|
| [`github-actions.yml`](./github-actions.yml) | `.github/workflows/actions-warden.yml` | Run the audit, upload its report, and enforce the result |
| [`policy.yml`](./policy.yml) | `.actions-warden.yml` | Example reviewable repository policy |
| [`violating-workflow.yml`](./violating-workflow.yml) | Do not deploy; optionally scan it locally | Intentionally unsafe input for testing the reporting path |

## Install the example

1. Copy `github-actions.yml` to
   `.github/workflows/actions-warden.yml` in the repository to protect.
2. Optionally copy `policy.yml` to `.actions-warden.yml` and adjust it through
   normal code review.
3. Keep the workflow's third-party Actions pinned to reviewed full commit SHAs.
4. Make the `Report GitHub Actions violations` job a required status check in
   the protected branch rules if violations must block merging.

No token input or secret is required for `command: audit`; it reads only the
checked-out repository. The workflow grants `contents: read` and uses
`pull_request`, not the privileged `pull_request_target` event.

## What happens on a violation

1. actions-warden scans workflows and composite actions with
   `fail-on-findings: 'false'`. Findings still produce native annotations, a
   structured job summary, and `status: FAIL`. The summary shows severity and
   rule totals plus bounded top finding/remediation details; the JSON artifact
   remains the complete report.
2. `actions/upload-artifact` runs with `if: always()` and retains
   `actions-warden-report.json`, even when the scan found violations.
3. The final gate reads the Action's `status` output and exits nonzero when it
   is `FAIL`, so branch protection can block the change.

`fail-on-findings: 'false'` does not hide or suppress findings. It only defers
the policy failure until after report upload. Invalid YAML, unsafe paths, and
other operational scanner errors still fail the scan step directly.

Later workflow steps can also read numeric outputs such as `findings`,
`critical`, `high`, `suppressed`, and `errors`. They are always emitted as
decimal strings, so a repository can add a more specific gate without parsing
the complete JSON report.

To make the check advisory, remove the final `Enforce Actions Warden result`
step. To report every severity, change `severity: high` to `severity: low`.

Reports can contain workflow paths and security evidence. Restrict workflow-log
and artifact access appropriately, and choose a retention period that matches
the repository's security policy.

## Exercise the reporting path locally

The included sample workflow is intentionally unsafe. From this repository,
scan it with the example policy:

```sh
node src/cli.js audit \
  --workflow=examples/ci-violation-reporting/violating-workflow.yml \
  --config=examples/ci-violation-reporting/policy.yml \
  --severity=high \
  --format=text \
  --explain
```

The command should emit findings and exit `1`, which means the audit completed
and found policy violations. Exit `2` instead means the invocation or input was
invalid and should be fixed rather than treated as a clean result.

## Related examples

- [Baseline adoption](../baseline-adoption/README.md) accepts reviewed legacy
  findings while blocking new ones.
- [SARIF Code Scanning](../sarif-code-scanning/README.md) publishes findings on
  trusted branch and scheduled runs.
