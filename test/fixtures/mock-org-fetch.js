globalThis.fetch = async function mockOrganizationFetch(url) {
  const value = String(url);
  if (value.includes('/orgs/octo-org/repos?')) {
    return jsonResponse([{
      name: 'app',
      full_name: 'octo-org/app',
      owner: { login: 'octo-org' },
      default_branch: 'main',
      visibility: 'public',
      private: false,
      fork: false,
      archived: false,
      disabled: false,
      html_url: 'https://github.com/octo-org/app',
    }]);
  }
  if (value.includes('/repos/octo-org/app/git/trees/')) {
    return jsonResponse({
      sha: 'a'.repeat(40),
      truncated: false,
      tree: [],
    });
  }
  return jsonResponse({}, 404);
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status });
}
