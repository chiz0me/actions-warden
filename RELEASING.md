# Releasing actions-warden

This is the authoritative maintainer and coding-agent runbook. `actions-warden`
has no long-running service to deploy. In this repository, a release or deploy
means publishing one coordinated version through four distribution channels:

- the `actions-warden` npm package;
- an immutable GitHub tag and release named `vX.Y.Z`;
- the floating GitHub Action tag `vX`;
- the `chiz0me/claude-plugins` marketplace entry.

The tag-triggered
[release workflow](https://github.com/chiz0me/actions-warden/blob/main/.github/workflows/release.yml)
is the only normal publication path. Do not run `npm publish` from a workstation
except for an explicitly approved bootstrap or incident-recovery operation.

## Agent authorization contract

Repository-aware agents must map release requests as follows. A direct request
is enough authorization for the matching row; the maintainer does not need to
repeat the commands in this guide.

| Maintainer request | Authorized work | Remote publication |
|---|---|---|
| “check/review release readiness” | Read-only local, GitHub, and npm checks | none |
| “prepare release `X.Y.Z`” or “bump to `X.Y.Z`” | Update local version sources, rebuild `dist/`, inspect the package, and validate | none |
| “release/publish/deploy actions-warden `X.Y.Z`” | Preflight, prepare, commit intended release changes, push `main`, wait for CI, create and push the immutable tag, monitor, and verify | yes |
| “release/publish/deploy actions-warden” | The same full workflow, with the version selected by the policy below | yes |
| “retry release `vX.Y.Z`” | Classify existing state and rerun the existing workflow when recovery is idempotent | only missing stages |

“Prepare,” “bump,” “check,” and “review” do not authorize a commit, push, tag,
GitHub release, npm publish, or marketplace write. A full release request does
not authorize force-moving or deleting an immutable version tag, publishing
unreviewed files, weakening validation, changing repository protections, npm
unpublishing, or npm deprecation. Those require separate explicit direction.

Before any full release, the agent must state the chosen version and the
preflight result in a short progress update. It should continue without asking
the maintainer to restate this runbook when every check passes.

### Hard stops

Stop before creating a remote commit or tag when any of these is true:

- the worktree contains changes whose ownership or release intent is unknown;
- the current branch is not `main`, or local `main` is behind or diverged from
  `origin/main` after a fresh fetch;
- the intended release commit is not contained in `origin/main`;
- the candidate is not a stable `X.Y.Z`, is not newer than npm `latest`, or an
  immutable tag/release already exists outside an intentional retry;
- another release run is queued or in progress;
- GitHub authentication, trusted publishing, the marketplace secret, branch
  access, or tag access is unavailable;
- tests, lint, audit, documentation, package inspection, or bundle
  reproducibility fails.

A clean checkout that is only behind may be updated with a fast-forward pull.
Never reset, overwrite, stash, or merge a dirty/diverged checkout to get around
a blocker. Report the exact evidence and the smallest required correction.

## Choose the version

Use the version the maintainer supplies when it is a valid, unpublished stable
SemVer greater than npm `latest`. If no version is supplied, compare the latest
immutable release with the intended diff and choose the highest applicable
bump:

| Change | Version bump |
|---|---|
| Compatible fix, documentation, internal refactor, or dependency maintenance | patch |
| New public command, option, rule, output capability, or other compatible feature | minor |
| Incompatible public behavior while the package is `0.x` | minor |
| Incompatible public behavior after `1.0.0` | major |

Stable releases only are currently supported. Do not create prerelease tags or
invent a lower version from the checkout: npm and GitHub are the live source of
truth. If compatibility cannot be determined safely, stop and ask only for the
version decision.

## Full release procedure

### 1. Inspect live state

Start without mutating project files:

```sh
git status --short --branch
git fetch --prune origin main
git branch --show-current
git rev-list --left-right --count HEAD...origin/main
npm view actions-warden version dist-tags --json
gh auth status
gh run list --workflow=release.yml --limit=20 \
  --json databaseId,status,conclusion,headSha,displayTitle,url
gh secret list --repo chiz0me/actions-warden
gh api repos/chiz0me/actions-warden/rulesets \
  --jq 'map({name,target,enforcement})'
gh api repos/chiz0me/actions-warden/branches/main/protection \
  --jq '{required_status_checks,required_pull_request_reviews,enforce_admins}'
gh api repos/chiz0me/actions-warden/environments \
  --jq '[.environments[].name]'
```

The branch must be `main`; before preparation, `HEAD...origin/main` must be
`0 0`. The status output must contain only understood, intended changes. The
secret list must include `MARKETPLACE_SYNC_TOKEN`; never request or print its
value. No release workflow may be `queued`, `pending`, `waiting`, or
`in_progress`. Observe the live branch, tag, and environment rules and follow
them without bypass; an empty result means those optional protections are not
configured. HTTP 404 from the legacy branch-protection query means no legacy
rule is configured; evaluate repository rulesets separately. Neither result
authorizes an agent to invent repository settings during a release.

Set the selected version locally for the remaining examples and verify that no
immutable object already owns it:

```sh
release_version=X.Y.Z
git tag --list "v${release_version}"
git ls-remote --tags --refs origin "refs/tags/v${release_version}"
gh release view "v${release_version}"
```

The first two commands must print nothing and `gh release view` must report no
release. Existing state is acceptable only for the retry procedure.

### 2. Prepare and inspect the candidate

Install the committed graph, update every version-bearing source, and rebuild
the GitHub Action bundle:

```sh
npm ci
npm run release:prepare -- "$release_version"
npm run build:action
git diff --check
git status --short
git diff
```

`release:prepare` updates `package.json`, both lockfile version fields,
`.claude-plugin/plugin.json`, `src/version.js`, and exact public
`actions-warden@X.Y.Z` invocations. It never commits, tags, pushes, or
publishes.

Review every changed file. Stage exact intended paths—do not use a broad add in
a dirty worktree—then run the release gate:

```sh
git add <reviewed-paths>
npm run release:check
git diff --cached --check
git diff --cached
```

`release:check` verifies registry version monotonicity, version synchronization,
exact dependencies, YAML, documentation links, lint, tests, dependency audit,
the exact npm tarball manifest, and the staged/working Action bundle against a
clean rebuild. On a workflow retry, the registry guard also requires the local
tarball integrity to equal the already-published immutable artifact. The gate
intentionally fails if `dist/index.js` or
`dist/package.json` is not staged.

### 3. Commit and pass main CI

```sh
git commit -m "release: v${release_version}"
release_sha="$(git rev-parse HEAD)"
git push origin HEAD:main
gh run list --workflow=ci.yml --commit "$release_sha" --limit=1 \
  --json databaseId,status,conclusion,url
gh run watch <CI_RUN_ID> --exit-status
```

The direct push is the current repository path. If branch policy later requires
a pull request, push a dedicated release branch, open the release PR, and wait
for its required review and CI instead of bypassing protection. After the
approved merge, set `release_sha` to the resulting `origin/main` commit. A full
release request authorizes that normal release PR flow, but not a protection
bypass.

Wait for the CI run belonging to `release_sha`; do not substitute an older
green run. After it succeeds, fetch again and require a clean worktree plus an
exact remote match:

```sh
git fetch --prune origin main
git status --short --branch
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
```

### 4. Create the immutable trigger

The remote version tag is the irreversible publication trigger:

```sh
git tag -a "v${release_version}" -m "v${release_version}" "$release_sha"
git push origin "refs/tags/v${release_version}"
```

Never use `--force` for `vX.Y.Z`. If the push races with an existing tag, stop
and compare its commit before doing anything else.

### 5. Monitor publication

Find the release run for the exact commit and watch it to completion:

```sh
gh run list --workflow=release.yml --commit "$release_sha" --limit=1 \
  --json databaseId,status,conclusion,url
gh run watch <RELEASE_RUN_ID> --exit-status
```

The workflow is serialized with a
[queued concurrency group](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency?apiVersion=2022-11-28).
Its publication chain is:

```text
validate -> release-draft -> publish-npm -> release
                                             |-> floating-major-tag
                                             `-> sync-marketplace
```

| Job | Responsibility |
|---|---|
| `validate` | Stable tag, package match, `main` ancestry, npm monotonicity/retry integrity, tests, lint, YAML/docs, exact dependencies, version sync, audit, tarball inspection, and bundle reproduction |
| `release-draft` | Create or reuse a draft GitHub release for the immutable tag |
| `publish-npm` | Publish with npm OIDC and provenance, or safely skip an already-published retry |
| `release` | Make the GitHub release final only after npm succeeds |
| `floating-major-tag` | Move the intentionally mutable `vN` Action tag to the release commit |
| `sync-marketplace` | Update and commit the external Claude plugin marketplace version |

The draft-first order prevents a final GitHub release from advertising an npm
publication that failed. Timeouts bound every job, and queued concurrency
prevents overlapping releases from racing the npm dist-tag or floating Action
tag.

### 6. Verify every channel

```sh
npm view actions-warden version dist-tags --json
npm view "actions-warden@${release_version}" version dist.integrity --json
gh release view "v${release_version}" \
  --json tagName,isDraft,isPrerelease,targetCommitish,url
git ls-remote --tags origin \
  "refs/tags/v${release_version}" \
  "refs/tags/v${release_version}^{}" \
  "refs/tags/v${release_version%%.*}"
gh api repos/chiz0me/claude-plugins/contents/.claude-plugin/marketplace.json \
  --jq '.content' | base64 -d \
  | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{const d=JSON.parse(s);console.log(d.plugins.find(p=>p.name==='actions-warden').version)})"
```

Confirm that npm `latest`, the npm package, the final GitHub release, the
immutable tag, the floating major tag, and the marketplace entry all identify
the new version/commit. Also confirm the npm package page shows provenance.
For the annotated immutable tag, its peeled `^{}` row and the floating `vN` row
must equal `release_sha`. Record the release and workflow URLs in the handoff.

Do not use a local floating `vN` tag as evidence. It is expected to become stale
when a release workflow moves the remote tag, and a blanket `git fetch --tags`
may reject that update as a clobber. The explicit `git ls-remote` result above
is authoritative; immutable `vX.Y.Z` tags are never moved.

## Retry and recovery

Classify the failure before acting. Reruns are designed to be idempotent, but
version tags and npm versions are immutable.

| Observed state | Safe action |
|---|---|
| Validation or transient infrastructure failed; nothing published | Rerun the same workflow only if the tagged commit needs no code change. If code must change, fix `main` and release a new version. |
| Draft release exists; npm is absent | Correct the external/OIDC problem and rerun the same workflow. The draft is reused. |
| npm version exists; GitHub release is still a draft | Rerun. Registry checks and publish are safe no-ops, then the draft is finalized. |
| Final GitHub release exists; floating tag or marketplace sync failed | Rerun the failed jobs or whole workflow. Do not republish or create a replacement tag. |
| Marketplace authentication or push failed | Restore `MARKETPLACE_SYNC_TOKEN` access or resolve the marketplace branch conflict, then rerun. |
| Published package is defective | Fix forward with a newer version. Deprecate only on explicit maintainer instruction; never unpublish automatically. |
| Remote tag exists but no workflow run exists | Verify the tag commit and that the workflow existed there. Do not force-push the tag; use a new version unless the maintainer explicitly directs recovery. |

Use GitHub's **Re-run all jobs** or `gh run rerun <RUN_ID>` for an unchanged
tagged commit. Do not delete a draft, release, package, or remote tag as an
automatic cleanup step.

## One-time repository setup

### npm Trusted Publisher

The package is configured with
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and this
publisher identity:

- Organization or user: `chiz0me`
- Repository: `actions-warden`
- Workflow filename: `release.yml`
- Environment: blank

The workflow grants only the publish job `id-token: write`, uses a GitHub-hosted
runner, disables package-manager caching, and pins Node `24.18.0` plus npm
`12.0.2`. That Node version satisfies npm `12.0.2`'s engine range. npm trusted
publishing currently requires npm 11.5.1 or newer and Node 22.14.0 or newer.
Update both pins deliberately when requirements or security fixes change;
never replace them with mutable `latest` installs in the release job. The
publish command ignores package lifecycle scripts after the tagged source has
passed validation and requests an npm
[provenance statement](https://docs.npmjs.com/generating-provenance-statements/).

After OIDC publication is verified, configure npm package access to require 2FA
and disallow token-based publishing where the account policy permits it. If a
GitHub environment is added to the publish job later, the npm trusted publisher
environment must be updated to the exact same name.

### `MARKETPLACE_SYNC_TOKEN`

Cross-repository writes require a fine-grained personal access token because
the source repository's default `GITHUB_TOKEN` cannot write to
`chiz0me/claude-plugins`.

1. Limit repository access to `chiz0me/claude-plugins`.
2. Grant only **Contents: Read and write**.
3. Store it in `chiz0me/actions-warden` as the Actions secret
   `MARKETPLACE_SYNC_TOKEN`.
4. Rotate or replace it without placing its value in logs, issues, prompts, or
   this repository.

### Repository protections

For stronger remote enforcement, protect `main` with required CI and review
rules appropriate to the project. Add a tag ruleset that prevents update and
deletion of immutable `v*.*.*` tags while still allowing maintainers to create
new versions and the release workflow to move only floating `vN` tags. Do not
apply an immutable-tag rule broadly enough to block `vN`.

A protected publish environment is optional. Adding one requires the exact
environment name in both `publish-npm.environment` and npm's trusted publisher
settings, so make those changes together and test them before relying on the
next release. GitHub Action Marketplace enrollment is a one-time manual action
from a successfully published release; `action.yml` already contains the
required branding metadata.
