# HTML organization report

This example creates a self-contained organization security dashboard, uploads
it as a retained workflow artifact, and enforces findings only after the
artifact is available for review.

Copy [`github-actions.yml`](./github-actions.yml) to a trusted workflow such as
`.github/workflows/actions-warden-html.yml`, then replace
`<FULL_COMMIT_SHA>` with a reviewed actions-warden release commit.

Configure `ACTIONS_WARDEN_ORG_TOKEN` as a GitHub App installation token or
fine-grained token with metadata and contents read access to the repositories
that should be scanned. The workflow's normal `GITHUB_TOKEN` usually cannot
read every repository in an organization.

The generated HTML:

- works offline and loads no external assets;
- shows scan scope, repository coverage, severity and rule summaries;
- supports search and record, severity, and repository filters;
- includes source links, findings, remediation, and operational errors;
- redacts credentials, escapes untrusted values, and uses a restrictive
  content security policy;
- is capped at 32 MiB.

The report may expose private repository names, paths, and security posture.
Use an appropriate artifact retention period and restrict workflow access.

This one-shot dashboard disables automatic checkpointing because the example
does not restore state across workflow runs. Remove `auto-checkpoint: 'false'`
and persist `${{ steps.warden.outputs['checkpoint-path'] }}` in protected storage
when repeat runs should resume compatible repository results.

HTML is a human-review view, not a future `previous-report` input. Retain a JSON
organization report when a later scan needs new/resolved/unchanged comparison.
