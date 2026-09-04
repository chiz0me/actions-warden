# Adopt enforcement with a reviewed baseline

A baseline lets an existing repository record reviewed findings as accepted
debt while making every new matching violation fail CI. It is an adoption
mechanism, not an automatic allowlist: generating or expanding one accepts
security risk and should require the same review as a policy change.

## Files

| file | copy to | purpose |
|---|---|---|
| [`github-actions.yml`](./github-actions.yml) | `.github/workflows/actions-warden.yml` | Report unsuppressed findings, upload JSON, and enforce the result |
| [`policy.yml`](./policy.yml) | `.actions-warden.yml` | Load the reviewed baseline and define repository policy |

The baseline itself is deliberately not included because its IDs and
fingerprints must come from the repository being protected.

## One-time adoption

1. Install a reviewed actions-warden version and audit the current repository
   without a baseline:

   ```sh
   actions-warden audit --format=json --explain
   ```

2. Investigate the findings. Fix what can be fixed immediately. For every
   remaining finding, record the owner, justification, and remediation plan in
   the repository's normal risk-tracking system.
3. Generate the deterministic baseline from the reviewed remaining findings:

   ```sh
   actions-warden audit \
     --create-baseline=.actions-warden-baseline.json \
     --format=json
   ```

4. Review `.actions-warden-baseline.json` before committing it. Copy
   `policy.yml` to `.actions-warden.yml` and `github-actions.yml` to
   `.github/workflows/actions-warden.yml` in the consuming repository.
5. Protect the workflow, policy, and baseline with `CODEOWNERS` and branch
   rules. Make `Report new Actions violations` a required status check when it
   is ready to block merging.

The JSON report exposes both `totalFindings` and `suppressed`; the Action also
provides `total-findings`, `suppressed`, and `findings` outputs for later steps.
The blocking `findings` count contains only unsuppressed violations. Moving an
unchanged finding to another line normally remains matched through its semantic
fingerprint.

## Prove that the ratchet works

Run the audit after the baseline and policy are installed:

```sh
actions-warden audit --format=json --explain
```

Reviewed legacy findings should be counted as suppressed. Introduce a
temporary unsafe reference such as `uses: owner/action@v1` on a throwaway
branch and run it again. The new occurrence should be reported and exit `1`.
Remove the temporary violation after the check.

Never regenerate or expand the baseline automatically in CI. Adding a record
accepts a finding; deleting a record causes a still-present finding to become
active again. Remove obsolete records as their underlying findings are fixed,
and review every baseline diff as a security-control change.

## CI behavior

The workflow runs actions-warden with `fail-on-findings: 'false'` so it can
upload `actions-warden-new-violations.json` before the final gate fails.
It passes `config: .actions-warden.yml` explicitly, so a missing policy or
referenced baseline fails closed instead of reverting to built-in defaults.
Operational errors still fail the audit step directly. To start in advisory
mode, omit the final gate until the baseline and ownership process are ready.

Baseline and report files contain repository paths and security evidence.
Restrict access and retention according to the repository's security policy.
