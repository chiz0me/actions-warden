# Publish findings to GitHub Code Scanning

This example generates SARIF 2.1.0, preserves it as a workflow artifact, and
uploads it to GitHub Code Scanning before enforcing the result. Use it when
security findings should remain queryable in the repository's Security view in
addition to normal actions-warden annotations and job summaries.

## Install the example

Copy [`github-actions.yml`](./github-actions.yml) to
`.github/workflows/actions-warden-sarif.yml` in the repository to protect.
The repository must permit SARIF uploads to Code Scanning.

The workflow deliberately runs only for trusted default-branch pushes,
scheduled scans, and manual dispatches. Its job needs `security-events: write`
to publish results; pull-request enforcement should use the separate
[least-privilege CI example](../ci-violation-reporting/README.md), which needs
only `contents: read` and still provides annotations plus a downloadable JSON
report.

## What the workflow does

1. Audit local workflows without a token input or code execution.
2. Write high and critical findings to `actions-warden.sarif` while keeping
   native annotations enabled.
3. Upload the SARIF file as a retained workflow artifact.
4. Upload the same file to Code Scanning under the `actions-warden` category.
5. Fail the final gate when actions-warden reported `status: FAIL`.

The scan uses `fail-on-findings: 'false'` only to defer policy failure until
after both uploads. Operational scanner errors still fail directly. The SARIF
upload is skipped when an operational failure prevented creation of the file.

Change `severity: high` to `severity: low` to publish every finding. If the
repository uses a reviewed baseline, actions-warden omits suppressed findings
from SARIF while retaining suppression counts in JSON reports; use the
[baseline-adoption example](../baseline-adoption/README.md) for that rollout
model.

SARIF contains repository-relative paths, rule evidence, and stable finding
fingerprints. Apply an appropriate artifact retention period and repository
access policy.
