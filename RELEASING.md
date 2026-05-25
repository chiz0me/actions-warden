# Releasing actions-warden

Maintainer notes. End users don't need this.

## Cutting a release

1. Bump `version` in `package.json` **and** `.claude-plugin/plugin.json`.
2. Commit and push to `main`.
3. Tag and push:

   ```sh
   git tag v0.X.Y
   git push origin v0.X.Y
   ```

`.github/workflows/release.yml` runs five jobs, all gated on `validate`:

| job | what it does |
|---|---|
| `validate` | npm ci, tag↔package.json version match, full test suite, verify-deps |
| `release` | `gh release create vX.Y.Z --generate-notes --verify-tag` |
| `floating-major-tag` | force-moves `vN` to the new commit (skips pre-release suffixes) |
| `publish-npm` | OIDC + provenance publish to npm; no-op if the version already exists |
| `sync-marketplace` | bumps `actions-warden` in `chiz0me/claude-plugins/.claude-plugin/marketplace.json` |

Consumers then get the new version through whichever channel they use:

- `npm install -g actions-warden` (latest dist-tag updates automatically)
- `uses: chiz0me/actions-warden@v0` (floating major tag updates automatically)
- `/plugin install actions-warden@chiz0me` (marketplace.json updates automatically)
- `uses: chiz0me/actions-warden@<full-sha>` (recommended; produced by
  `actions-warden pin` on the consumer side)

## One-time setup

### npm Trusted Publisher

npm does not support pre-publish trusted-publisher configuration. The first
version of a package must be published with credentials so the package exists
on the registry; only then does the Trusted Publishing panel appear under
package settings.

For `actions-warden` v0.1.0 this was already done via a manual
`npm publish --access public` from a local terminal, followed by:

**npmjs.com → Packages → actions-warden → Settings → Trusted publishing**

with:

- Organization or user: `chiz0me`
- Repository: `actions-warden`
- Workflow filename: `release.yml`
- Environment: *(blank)*

Trusted publishing requires npm ≥ 11.5.1 and Node ≥ 24, so the `publish-npm`
job pins Node 24 and runs `npm install -g npm@latest` before publishing.

### `MARKETPLACE_SYNC_TOKEN`

Cross-repo writes (from `actions-warden` to `claude-plugins`) require a token
the default `GITHUB_TOKEN` cannot provide.

1. Create a **fine-grained personal access token** at
   <https://github.com/settings/personal-access-tokens/new>:
   - Repository access: **Only select repositories → `chiz0me/claude-plugins`**
   - Permissions: **Contents: Read and write**
2. In `chiz0me/actions-warden` repo settings, save it as an Actions secret
   named `MARKETPLACE_SYNC_TOKEN`.

### GitHub Marketplace listing

`action.yml` declares `branding`, so the action is Marketplace-eligible.
After the first release tag is pushed, open the release on github.com and
tick "Publish this Action to the GitHub Marketplace" to list it. One-time
manual step.

## Verifying after a release

```sh
npm view actions-warden version dist-tags        # should match the new tag
gh release list --limit=3                        # latest release lands at top
git ls-remote --tags origin | grep -E 'v0(\.|$)' # v0 should track the new SHA
gh api repos/chiz0me/claude-plugins/contents/.claude-plugin/marketplace.json \
  --jq '.content' | base64 -d \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['plugins'][0]['version'])"
```

If the `publish-npm` job logs `is already published; skipping publish`, that
just means the npm `version` and `package.json` version were in sync and the
package was already on the registry - usually fine if you bootstrapped a
version manually.
