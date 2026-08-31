# Developer guide

This guide is for contributors changing actions-warden itself. For public CLI
usage, start with the [CLI reference](./CLI.md).

## Prerequisites

- Node.js 20 or newer;
- npm with the lockfile committed by the repository;
- optional: `prek` or Python `pre-commit` for local hooks.

Install exactly the locked dependency graph:

```sh
npm ci
```

The repository's `.npmrc` pins dependencies exactly and disables package
lifecycle scripts during installation.

Install hooks with either runner:

```sh
prek install --hook-type pre-commit --hook-type pre-push
```

or:

```sh
pre-commit install --hook-type pre-commit
pre-commit install --hook-type pre-push
```

## Validation commands

| command | purpose |
|---|---|
| `npm test` | Run the complete Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run lint` | Lint source, scripts, and tests |
| `npm run check:yaml` | Parse repository YAML files |
| `npm run check:docs` | Validate local documentation links |
| `npm run check:package` | Inspect the exact npm tarball manifest, required files, executable mode, and size bounds |
| `npm run verify-deps` | Require exact runtime and development versions |
| `npm run verify-version-sync` | Keep package, lockfile, bundled runtime, plugin, and public invocations aligned |
| `npm run build:action` | Rebuild the committed Action bundle |
| `npm run check:action-bundle` | Compare a clean rebuild with working and staged bundles |
| `npm run audit` | Run the configured npm vulnerability threshold |
| `npm run release:prepare -- X.Y.Z` | Update all local stable-version sources without committing or publishing |
| `npm run release:check` | Gate a staged release candidate against npm state and every release validation |

Before opening a pull request, run:

```sh
npm run verify-version-sync
npm run verify-deps
npm run check:yaml
npm run check:docs
npm run check:package
npm run lint
npm test
npm run audit
```

If code reachable from `src/action.js` changed, also run:

```sh
npm run build:action
npm run check:action-bundle
```

## Repository map

```text
src/
  cli.js                    CLI parsing, exit codes, and output routing
  action.js                 GitHub Action input/output adapter
  index.js                  public JavaScript exports
  version.js                runtime version embedded in the Action bundle
  commands/                 audit, pin, verify, upgrade, report, org-scan
  lib/
    parser.js               YAML-to-normalized-workflow model
    targets.js, paths.js    repository target discovery
    path-equality.js        real-path destination/control comparisons
    config.js, baseline.js  policy and accepted-finding controls
    resolver.js, cache.js   GitHub API, caching, ref and ownership checks
    github-org.js           read-only organization/tree/blob access
    agent-mode.js           explicit bounded AI-agent CLI defaults
    org-checkpoint.js       validated atomic organization resume state
    org-progress.js         human rendering of structured scan progress
    identity.js             stable IDs and semantic fingerprints
    patcher.js, writer.js   source-range rewrites and guarded atomic writes
    formatter.js, redact.js structured output and credential redaction
    annotations.js          GitHub workflow annotations
    concurrency.js          bounded async work
  rules/                    one module per audit rule

test/                       Vitest suites and hostile/edge-case fixtures
scripts/                    repository validation and release helpers
docs/                       user, integration, AI, and developer guides
examples/                   copyable GitHub workflow examples
skills/actions-warden/      Claude Code skill
dist/                       generated, committed GitHub Action bundle
action.yml                  public Action inputs, outputs, and runtime
```

## Data flow

A local audit follows this path:

```text
targets → source read → YAML parser → normalized workflow model
        → ignore directives → rules → stable identities
        → severity/baseline filtering → renderer
```

Pin and upgrade add:

```text
normalized action refs → GitHub resolution and ownership verification
                       → source-range patch plan → reparse
                       → guarded atomic writer only when dryRun=false
```

An organization scan follows:

```text
repository listing → default-branch Git tree → bounded YAML blob reads
                   → in-memory auditSources → repository aggregation

optional checkpoint → identity validation → fresh tree SHA comparison
                    → reuse unchanged error-free result or rescan
```

Remote repositories are never cloned, checked out, imported, or executed.

## Safety invariants

Changes must preserve these boundaries:

- `pin` and `upgrade` default to dry-run at the command and API layers.
- CLI and Action mutation require an explicit write option.
- CLI integers and 16-hex change IDs use strict whole-value parsing. Commander
  usage failures and application-level invocation failures both exit `2`.
- A resolver failure must not fall back to a guessed tag or SHA.
- Commits must be verified as belonging to the referenced repository.
- Workflow rewrites operate on parsed scalar ranges and reparse before write.
- Writes and configured paths remain inside the real repository root.
- Symlink escapes and explicit targets that match nothing fail.
- CLI report, baseline, and checkpoint destinations are preflighted before
  network or workflow mutation, cannot replace selected/default-discovery
  workflows or reserved policy paths, and are checked against active controls
  again before output is written.
- Credentials are redacted in JSON, TOON, text, SARIF, annotations, and
  top-level errors.
- Finding and change IDs exclude absolute checkout paths.
- Parser errors remain findings and cannot be baselined away.
- Organization coverage failures remain visible and make status fail.
- Organization source reads remain count- and size-bounded and bypass disk
  cache.
- Organization resume never trusts a stale result without fresh discovery and
  a matching repository identity, default branch, and tree SHA. Failed results
  are never reused.
- Organization result compatibility is controlled by
  `ORGANIZATION_ANALYSIS_GENERATION`, not by the package version. Producer
  versions remain checkpoint metadata and compatible checkpoints migrate
  through the guarded atomic writer.
- Checkpoints use guarded atomic writes, remain inside the working directory,
  omit tokens and raw YAML, and cannot replace active policy or baseline files.
- Progress stays outside deterministic report serialization; CLI progress is
  stderr-only and Action progress cannot form workflow commands.
- Agent mode is an explicit opt-in, never a TTY, parent-process, CI, or
  vendor-environment heuristic. Explicit CLI output and progress options win.
  Its automatic artifact key uses the validated checkpoint compatibility
  identity, and its stdout receipt never includes findings or repository result
  arrays.
- Attacker-controlled values cannot forge TOON lines or GitHub annotations.

Tests should demonstrate the fail-closed behavior for any change touching these
boundaries.

## Adding or changing a rule

A rule module exports:

```js
export const id = 'example-rule';
export const severity = 'high';
export const description = 'Short sentence describing the risk.';

export function check(workflow, context = {}) {
  return [{
    id,
    severity,
    line: 1,
    fields: {
      type: id,
      sev: severity,
      evidence: 'structured-value',
    },
    explain: 'one concise remediation',
  }];
}
```

Then:

1. register the module in `src/rules/index.js`;
2. add focused tests for safe and unsafe cases;
3. test trigger, expression, quoting, and malformed-input boundaries relevant
   to the rule;
4. when behavior depends on a moving GitHub or first-party action contract,
   verify it against a primary source, record the date/version boundary in code,
   and test the last unsafe plus first safe version;
5. test at least one legitimate pattern that must remain clean so remediation
   guidance does not become a false-positive generator;
6. update the rule table and accuracy boundaries in `docs/CONFIGURATION.md`,
   plus the Claude skill;
7. run `actions-warden rules --format=json` and ensure the ID is not redacted;
8. rebuild the Action bundle.

Keep `fields` structured and concise. They become JSON evidence, TOON fields,
SARIF messages, and Action annotations. Never place raw secret values in them.
Suggestions must name a safe end state, preserve legitimate use cases, and
avoid claiming that one mitigation closes risks outside the rule's evidence.

## Adding or changing a command

A command normally needs changes in:

1. `src/commands/<name>.js` for the API result and renderer;
2. `src/cli.js` for public CLI flags and exit semantics;
3. `src/index.js` and `package.json` exports;
4. `src/action.js` and `action.yml` if the Action exposes it;
5. command, CLI, Action, annotation, and output-format tests;
6. `docs/CLI.md`, `docs/OUTPUTS.md`, API docs, and relevant examples;
7. the Claude skill and version-sync checker when its command surface changes;
8. the committed Action bundle.

Return operational problems as structured `errors` when useful work can
continue. Throw when top-level input or discovery makes the requested scope
undefined or unsafe.

Every non-JSON renderer must expose enough information to explain a `FAIL`
status. Every JSON renderer must include `schemaVersion`, command data, and
top-level `status`.

## Parser and patcher changes

The parser retains both a normalized model for rules and source locations for
precise rewrites. When changing it:

- cover workflow files and composite `action.yml` metadata;
- preserve and recursively inspect steps inside `parallel` groups, while
  retaining background/control-step declarations for structure checks;
- include quoted, unquoted, inline, multiline, and malformed YAML cases;
- avoid evaluating expressions;
- preserve source offsets for patchable `uses` values;
- test Windows and POSIX path normalization where relevant.

The patcher should make the smallest source-range replacement. Do not reserialize
the entire YAML document: that would destroy comments, formatting, anchors, and
reviewable diffs.

Property tests in `test/patcher-properties.test.js` exercise rewrite stability.

## GitHub API changes

All runtime requests belong in the resolver or organization GitHub layer and
must remain pinned to `https://api.github.com`.

For new endpoints:

- validate status and response shape;
- paginate boundedly;
- validate identities, SHAs, sizes, encodings, and UTF-8 as applicable;
- set timeouts and bounded retries through the shared fetch layer;
- preserve authentication-isolated cache keys;
- decide explicitly whether private content may be cached;
- accumulate scoped errors when continued reporting is safe;
- add tests with mocked responses for truncation and malformed data.

Never execute content to determine what it contains.

When changing organization resume behavior, cover interrupted writes,
checkpoint schema and identity mismatches, hostile fields, changed tree SHAs,
previous repository errors, output equivalence, and concurrent completions.
Persist each completed result before emitting its completion event so an
observer failure or process interruption loses at most in-flight work.

`ORGANIZATION_ANALYSIS_GENERATION` in `src/lib/org-checkpoint.js` is the manual
semantic compatibility switch. Increment it whenever organization workflow
selection, parsing, finding identity, rule evaluation, suppression, summaries,
or other persisted repository-result semantics can change. Keep it unchanged
for documentation, release metadata, progress rendering, authentication,
concurrency, or internal refactors that preserve those results. The rule
catalog hash independently invalidates catalog changes. A generation change
must add tests proving the old checkpoint fails closed and agent mode selects a
new artifact key; a compatible format migration must prove the old checkpoint
is validated, rewritten atomically, and still subject to fresh tree checks.

## Output compatibility

JSON is the public machine interface. Raw command results and serialized JSON
are deliberately different: renderers add repository-relative paths,
redaction, and `schemaVersion`.

When changing output:

- retain top-level `status`;
- treat new fields as additive where possible;
- update `docs/OUTPUTS.md`;
- test all four formats;
- prevent embedded control characters from forging records;
- ensure error details are visible in every format;
- verify stable IDs remain stable unless their semantic input changed.

## GitHub Action bundle

Never edit `dist/index.js` or `dist/package.json` by hand. They are generated:

```sh
npm run build:action
```

Commit source and its rebuilt bundle together when the Action runtime changes.
`npm run check:action-bundle` performs a clean build in a temporary directory
and compares both working-tree and staged bundle files.

A docs-only, test-only, or CLI-only change that is unreachable from
`src/action.js` does not require a bundle rebuild.

## Tests and fixtures

Tests use Vitest and should be deterministic and network-independent. Mock
GitHub responses rather than relying on live repositories. Use temporary
directories for writes and assert both file content and failure behavior.

Useful focused runs:

```sh
npx vitest --run test/audit.test.js
npx vitest --run test/org-scan.test.js
npx vitest --run -t "stable id"
```

Keep hostile input in fixtures or inline strings when it clarifies the threat
being tested. Tests should not contain real credentials.

## Documentation maintenance

README is the landing page, not the full manual. Put durable detail in the
focused guide that owns it, then link from README.

When CLI, Action, config, output, or API behavior changes:

1. update the owning reference document;
2. update examples and AI guidance that depend on it;
3. run `npm run check:docs`;
4. run live `--help` and at least one documented example against
   `node src/cli.js`.

Keep examples copyable, use exact package versions for `npx`, and use full
commit placeholders for the Action itself.

## Releases

The authoritative [release runbook](../RELEASING.md) defines maintainer and
agent authorization, SemVer selection, live-state preflight, preparation,
trusted publication, monitoring, verification, and partial-failure recovery.
Do not bump versions as part of an unrelated contribution. `release:prepare`
is local-only; `release:check` is intended for a reviewed, staged candidate and
will fail a stale or already-published version.
