---
name: actions-warden
description: Audit, pin, and upgrade GitHub Actions workflows and composite actions. Use when the user asks to scan GitHub Actions for supply-chain or injection vulnerabilities, inspect reusable-workflow calls or composite-action dependencies, replace mutable tag or branch refs with commit SHAs, bump pinned action versions, or generate a CI security report. Triggers include "audit my workflows", "pin my actions", "upgrade actions", "check workflow security", "are my GitHub Actions safe", pull_request_target, unpinned actions, reusable workflows, composite actions, or script injection in CI.
---

# actions-warden

`actions-warden` is a Node.js CLI on npm that audits, pins, and upgrades GitHub
Actions workflows. It is safe-by-default (every mutating command dry-runs unless
`--write` is passed) and emits TOON output — one labeled `KEY: k=v` record per
line, ending with `STATUS: OK` or `STATUS: FAIL` — which is parseable without
a schema.

## When to use this skill

Invoke `actions-warden` when the user:

- asks to **audit, scan, check, or review GitHub Actions workflows** for security
  issues (unpinned actions, broad `permissions`, secrets exposed in env,
  script injection, pull_request_target pwn-request);
- asks to **pin actions to commit SHAs** or replace tag refs (`@v3`) with
  immutable hashes;
- asks to **upgrade or bump** workflow action versions (with optional cooldown);
- wants a **combined security report** on `.github/workflows`;
- references the `pull_request_target` event, `${{ github.event.* }}` interpolation
  in run scripts, or supply-chain risk in CI.

## How to invoke

The package is on npm as `actions-warden`. Run it via `npx`:

```sh
npx actions-warden audit                           # default: scan .github/workflows
npx actions-warden audit --severity=high --explain # high+, with remediation hints
npx actions-warden audit --format=json             # JSON output
npx actions-warden pin                             # plan SHA pins (dry-run)
npx actions-warden pin --write                     # apply pins
npx actions-warden upgrade --mode=minor            # bump within current major
npx actions-warden upgrade --min-age=14 --write    # only accept tags >=14 days old, apply
npx actions-warden report --offline                # audit + dry-run plan, no network
npx actions-warden rules                           # list rule catalog
```

Useful global flags: `--workflow <path-or-glob>` (repeatable), `--cwd <dir>`,
`--format toon|json|text`, `--output stdout|file`, `--output-path <path>`,
`--token <gh-token>` (also reads `GITHUB_TOKEN` / `GH_TOKEN`).

Exit codes: `0` on success/no findings, `1` on findings or errors, `2` on
usage error.

## What to do when invoked

1. **Identify the Actions scope.** If the user named a file or directory,
   pass it via `--workflow`. Otherwise let discovery scan `.github/workflows/`
   plus repository `action.yml` and `action.yaml` files. Default discovery
   excludes `.git` and `node_modules`.

2. **Pick the right command.**
   - "audit / scan / check security / find issues" → `audit`
   - "pin to SHAs / lock down / replace tags" → `pin`
   - "upgrade / update / bump versions" → `upgrade`
   - "give me a full report / what would change" → `report`

3. **Default to dry-run.** Never pass `--write` unless the user has explicitly
   said apply / write / commit / mutate. The CLI exits `0` whether or not it
   would have written anything — examine the output to plan next steps.

4. **Read the output.** Every TOON line is a record:
   - `FINDING: id=<10-char-hex> type=<rule> sev=<critical|high|medium|low> file=<path> line=<n> ...`
   - `PIN: id=<id> file=<path> action=<owner/repo> from=<tag> to=<sha> applied=<bool>`
   - `UPGRADE: id=<id> action=<owner/repo> from=<tag> to=<newer-tag> level=<major|minor|patch>`
   - `SKIP: action=<...> tag=<...> reason=cooldown age_days=<n>`
   - `SUMMARY: files=<n> findings=<n> critical=<n> high=<n> medium=<n> low=<n>`
   - `STATUS: OK` or `STATUS: FAIL` on the last line.

   Every `id` is stable — to apply just one specific change, pass `--fix=<id>`
   (works on `pin` and `upgrade`).

5. **Explain findings clearly.** Reference each finding by file and line. If
   the user wants remediation guidance, re-run with `--explain` to get a
   one-line hint embedded in each `FINDING:` record.

## Audit rules

| id | severity | catches |
|---|---|---|
| `unpinned-action` | high | workflow-step, reusable-workflow job, and composite-action `uses:` refs that aren't 40-char SHAs |
| `excessive-permissions` | medium | `write-all` or broad write scopes |
| `secrets-in-env` | critical | secrets at workflow- or job-level env (leaks to every step) |
| `script-injection` | critical | `${{ github.event.* }}` interpolated into `run:` |
| `pull-request-target-checkout` | critical | "pwn-request" — pull_request_target + PR head checkout |

## Inline ignore directives

If the user has reviewed a finding and wants to silence it without changing
the action ref, they can add a comment:

```yaml
- uses: actions/checkout@v3  # actions-warden-ignore: unpinned-action
```

Other forms: `# actions-warden-ignore-file`, `# actions-warden-ignore-start`/`-end`,
`# actions-warden-ignore-next-line`. Bare directive silences all rules;
`# actions-warden-ignore: a,b,c` silences only the listed rule ids.

## Programmatic API (no subprocess)

When you want to consume results in JS without spawning the CLI:

```js
import { audit, pin, upgrade, report } from 'actions-warden';

const result = await audit({ cwd: '/repo', explain: true });
// result.findings: [{ id, ruleId, severity, file, line, fields, explain }]
// result.summary:  { files, findings, critical, high, medium, low }
// result.status:   'OK' | 'FAIL'
```

Other exports: `listRules`, `discoverWorkflows`, `parseWorkflowFile`,
`parseWorkflowSource`, `collectUses`, `parseActionRef`, `renderAudit`,
`renderPin`, `renderUpgrade`, `renderReport`, `format`, `redact`,
`parseIgnoreDirectives`.

## Notes

- The CLI never prompts interactively — all decisions are flag-driven, so it
  is safe to invoke without a TTY.
- Output is deterministic: running twice on an unchanged repo produces
  identical bytes.
- For GitHub API calls (pin, upgrade), unauthenticated quota is 60 requests/hour.
  Set `GITHUB_TOKEN` to raise it to 5,000/hour.
- Cache lives at `.actions-warden-cache/` (1-hour TTL). Delete the dir to
  force a refresh.

## Source

- npm: https://www.npmjs.com/package/actions-warden
- repo: https://github.com/chiz0me/actions-warden
- GitHub Action: `uses: chiz0me/actions-warden@v0`
