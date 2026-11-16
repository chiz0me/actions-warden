/** Commit SHA the helper reports for every default branch. */
export const MOCK_COMMIT_SHA = 'd'.repeat(40);

/**
 * Wrap a mock GitHub `fetch` so `GET /repos/{owner}/{repo}/commits/heads/{branch}`
 * is answered from the mock's own tree route. A non-200 tree answer (empty
 * repository, denied access, and so on) passes through unchanged; a 200 answer
 * becomes a commit whose tree is that tree.
 *
 * @param {(url: string | URL, init?: object) => Promise<Response>} handler
 * @param {string} [commitSha]
 * @returns {(url: string | URL, init?: object) => Promise<Response>}
 */
export function withCommitResolution(handler, commitSha = MOCK_COMMIT_SHA) {
  return async function commitAwareFetch(url, init) {
    const match = /^(.*\/repos\/[^/]+\/[^/]+)\/commits\/heads\/([^?]+)$/.exec(String(url));
    if (!match) return handler(url, init);
    const treeResponse = await handler(`${match[1]}/git/trees/${match[2]}?recursive=1`, init);
    if (treeResponse.status !== 200) return treeResponse;
    const tree = await treeResponse.json();
    return new Response(
      JSON.stringify({ sha: commitSha, commit: { tree: { sha: tree.sha } } }),
      { status: 200 },
    );
  };
}
