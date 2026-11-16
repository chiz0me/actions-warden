/**
 * Links from organization-scan evidence to the GitHub source that produced it.
 */

/**
 * Link to a repo-relative path on the default branch. Falls back to the
 * repository page when no default branch is known.
 *
 * @param {{htmlUrl: string, defaultBranch: string|null}} repository
 * @param {string} path Repo-relative POSIX path.
 * @param {number} [line]
 * @returns {string}
 */
export function sourceUrl(repository, path, line) {
  if (!repository.defaultBranch) return repository.htmlUrl;
  return blobUrl(repository, encodeURIComponent(repository.defaultBranch), path, line);
}

/**
 * Link to a repo-relative path at an exact commit, so the evidence stays
 * valid after the branch moves. Uses the default-branch link when the commit
 * is unknown.
 *
 * @param {{htmlUrl: string, defaultBranch: string|null}} repository
 * @param {string|null} commitSha Lowercase 40-hex commit ID, or null.
 * @param {string} path Repo-relative POSIX path.
 * @param {number} [line] Adds an `#L<line>` fragment when positive.
 * @returns {string}
 */
export function sourcePermalink(repository, commitSha, path, line) {
  if (!commitSha) return sourceUrl(repository, path, line);
  return blobUrl(repository, commitSha, path, line);
}

function blobUrl(repository, ref, path, line) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const suffix = Number.isInteger(line) && line > 0 ? `#L${line}` : '';
  return `${repository.htmlUrl}/blob/${ref}/${encodedPath}${suffix}`;
}
