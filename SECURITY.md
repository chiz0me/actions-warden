# Security Policy

## Reporting a vulnerability

Please **do not** open public issues for security-sensitive reports. Send the
details to the maintainers via one of:

- GitHub Security Advisory: open a private advisory on this repository.
- Email: see the maintainer profile linked from `package.json`.

Please include:

- A clear description of the issue.
- A minimal reproduction (workflow YAML, command line, expected vs. actual).
- The version of `actions-warden` (`npx actions-warden --version`).
- Any disclosure constraints on your side.

We aim to acknowledge within **3 business days** and to ship a fix or a
documented mitigation within **30 days** of triage for high-severity issues.

## Scope

In scope:

- Path traversal or arbitrary file write in `pin`, `upgrade`, or `report`.
- Bypasses of the `--dry-run` guard.
- Logging or persisting credentials anywhere (cache, output, stderr).
- Workflow parser crashes on attacker-controlled YAML.
- Network requests sent to hosts other than `api.github.com`.

Out of scope:

- Findings produced by audit rules themselves (those describe vulnerabilities
  in users' workflows, not in `actions-warden`).
- Rate-limit responses from GitHub API.
- Outdated transitive dependencies that do not reach our code paths.

## Supply chain

- All runtime dependencies are pinned to exact versions (`save-exact=true`).
- `ignore-scripts=true` in `.npmrc` to disable arbitrary postinstall scripts.
- CI runs `npm audit --audit-level=high` on every PR.
- Releases are published with `npm publish --provenance`.

## Responsible-disclosure timeline

| event | target |
|---|---|
| Acknowledgement | 3 business days |
| Triage + severity rating | 7 days |
| Fix or mitigation for critical/high | 30 days |
| Public disclosure | by mutual agreement, default 90 days |
