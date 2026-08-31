# Security Policy

## Reporting a vulnerability

Please **do not** open public issues for security-sensitive reports. Send the
details to the maintainers via one of:

- GitHub Security Advisory: open a private advisory on this repository.
- Email: see the maintainer profile linked from `package.json`.

Please include:

- A clear description of the issue.
- A minimal reproduction (workflow YAML, command line, expected vs. actual).
- The version of `actions-warden` (`npx --yes actions-warden@0.4.0 --version`).
- Any disclosure constraints on your side.

We aim to acknowledge within **3 business days** and to ship a fix or a
documented mitigation within **30 days** of triage for high-severity issues.

## Scope

In scope:

- Path traversal or arbitrary file write in `pin`, `upgrade`, `report`, or
  organization checkpoint/report output.
- Bypasses of the explicit `--write` authorization boundary.
- Logging or persisting credentials anywhere (cache, output, stderr).
- Workflow parser crashes on attacker-controlled YAML.
- Organization scans that silently omit repositories or workflow files while
  reporting complete coverage.
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
- CI lints the source, runs tests across Linux, macOS, Windows, and supported
  Node.js versions, and verifies the committed Action bundle is reproducible.
- Releases are published with `npm publish --provenance`.
- The bundled Action runs on GitHub's managed Node.js runtime and does not
  install dependencies in consumer workflows.
- Repository policy and baseline files should be protected with CODEOWNERS or
  branch rules; changes to them can intentionally alter which findings fail CI.
- CLI report, baseline, and checkpoint destinations are guarded and preflighted;
  they cannot replace selected/default-discovery workflows or reserved policy
  paths, and active control-file collisions are rejected before output writes.
- Parser failures are operational errors and cannot be suppressed by a finding
  baseline.
- Organization scans read count- and size-bounded Git blobs in memory and never
  clone, check out, or execute code from scanned repositories. Truncated trees,
  exceeded limits, and unreadable blobs are operational errors.
- Organization checkpoints are opt-in, guarded atomic writes. They omit tokens
  and raw workflow YAML, validate analysis-generation/rule/scope/policy
  identity, and reuse an error-free result only after a fresh
  repository/default-branch tree-SHA match. The producing package version is
  metadata rather than a compatibility boundary. They still contain redacted
  repository and finding evidence and should be protected like organization
  reports.
- Explicit CLI agent mode creates scope-keyed report and checkpoint files with
  the same guarded writer and `0600` creation mode. Its stdout receipt contains
  only paths and bounded counts; the artifact files remain sensitive.

## Responsible-disclosure timeline

| event | target |
|---|---|
| Acknowledgement | 3 business days |
| Triage + severity rating | 7 days |
| Fix or mitigation for critical/high | 30 days |
| Public disclosure | by mutual agreement, default 90 days |
