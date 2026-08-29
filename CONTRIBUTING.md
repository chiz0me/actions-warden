# Contributing to actions-warden

Thanks for helping make GitHub Actions security easier to review and automate.

## Before you start

- Use Node.js 20 or newer.
- Read the [developer guide](./docs/DEVELOPMENT.md) for architecture and safety
  invariants.
- Report suspected vulnerabilities privately through
  [SECURITY.md](./SECURITY.md), not a public issue.
- For a broad behavior or compatibility change, open an issue first so the
  expected contract can be discussed before implementation.

## Set up

```sh
npm ci
npm test
```

Optional local hooks:

```sh
prek install --hook-type pre-commit --hook-type pre-push
```

The same configuration also works with Python `pre-commit`.

## Make a focused change

Keep security behavior fail-closed and make the smallest coherent change.
Tests should cover both the intended success case and the unsafe, malformed, or
partial case that must fail.

Useful references:

- [CLI behavior](./docs/CLI.md)
- [configuration](./docs/CONFIGURATION.md)
- [machine-output contracts](./docs/OUTPUTS.md)
- [JavaScript API](./docs/JAVASCRIPT-API.md)
- [developer architecture](./docs/DEVELOPMENT.md)

Do not edit generated `dist/` files manually. If code reachable from
`src/action.js` changes, run `npm run build:action` and commit the rebuilt
bundle with the source.

Runtime and development dependencies must use exact versions. Do not update the
package version as part of an unrelated contribution.

## Validate

Run the standard checks:

```sh
npm run verify-version-sync
npm run verify-deps
npm run check:yaml
npm run check:docs
npm run lint
npm test
npm run audit
```

For Action runtime changes, also run:

```sh
npm run build:action
npm run check:action-bundle
```

Tests must not depend on live GitHub state or real credentials. Mock network
responses and use temporary directories for filesystem cases.

## Documentation expectations

Behavior changes are incomplete until their user and integration contracts are
updated.

- CLI flags and semantics: `docs/CLI.md`
- policy or rule behavior: `docs/CONFIGURATION.md`
- records, JSON, SARIF, status, or exit codes: `docs/OUTPUTS.md`
- Action inputs and outputs: `docs/GITHUB-ACTION.md` and `action.yml`
- public exports: `docs/JAVASCRIPT-API.md`
- agent workflows: `docs/AI-AGENTS.md` and the Claude skill
- common entry points: `README.md`

Keep README concise and link to the owning reference instead of duplicating a
large table.

## Pull request checklist

Before requesting review, confirm that:

- [ ] the change has a focused purpose and no unrelated formatting churn;
- [ ] new behavior has tests, including failure boundaries;
- [ ] dry-run, path containment, redaction, and remote-code non-execution
      invariants remain intact;
- [ ] public output and documentation agree;
- [ ] examples use exact npm versions or full Action commit-SHA placeholders;
- [ ] all standard checks pass;
- [ ] the Action bundle is rebuilt when required;
- [ ] no credentials, private repository data, caches, or generated reports are
      committed.

Maintainers and explicitly authorized repository agents handle version bumps,
tags, npm publication, and marketplace synchronization through the standing
intent contract in [RELEASING.md](./RELEASING.md). An ordinary contribution or
version edit never implies release authorization.
