# Webhook and notification delivery

actions-warden deliberately does not send webhooks itself. This example keeps
outbound credentials and provider behavior in a separate CI step while the
scanner remains responsible for deterministic evidence and policy status.

Copy [`github-actions.yml`](./github-actions.yml) to
`.github/workflows/actions-warden-notify.yml`, replace `<FULL_COMMIT_SHA>` with
a reviewed actions-warden release commit, and create the repository or
organization secret `ACTIONS_WARDEN_WEBHOOK_URL` containing an HTTPS endpoint.

The workflow:

1. saves the complete JSON report as an artifact;
2. constructs a bounded notification containing only status, counts, repository
   identity, and the workflow-run URL;
3. reads the secret from the environment, validates HTTPS, rejects embedded
   credentials, and posts without following redirects;
4. caps the notification at 16 KiB and applies request timeouts plus bounded
   retries;
5. enforces the actions-warden result after delivery has been attempted.

It does not send the complete report to the webhook. Reports may contain
private repository names, paths, and security evidence, and provider payload
limits are often much smaller than an organization report. Adapt the bounded
JSON object to the receiving service's schema if necessary.

## ProjectDiscovery Notify

[ProjectDiscovery Notify](https://docs.projectdiscovery.io/opensource/notify/running)
can read a file or stdin and route it to configured Slack, Discord, Microsoft
Teams, Telegram, and other providers. That makes it a good optional adapter for
the bounded payload rather than a runtime dependency of actions-warden.

Install a reviewed, pinned Notify release through your normal tool bootstrap,
store its provider configuration as a masked secret, and replace the generic
webhook step with:

```yaml
- name: Send through ProjectDiscovery Notify
  if: always() && steps.notification.outcome == 'success'
  shell: bash
  env:
    NOTIFY_PROVIDER_CONFIG: ${{ secrets.NOTIFY_PROVIDER_CONFIG }}
  run: |
    umask 077
    provider_config="${RUNNER_TEMP}/actions-warden-notify-providers.yml"
    trap 'rm -f "$provider_config"' EXIT
    printf '%s' "$NOTIFY_PROVIDER_CONFIG" > "$provider_config"

    node -e '
      const fs = require("node:fs");
      const report = JSON.parse(fs.readFileSync("actions-warden-notification.json", "utf8"));
      const message = `actions-warden ${report.status}: ${report.summary.findings} finding(s), ${report.summary.errors} error(s) — ${report.runUrl}`;
      fs.writeFileSync("actions-warden-notification.txt", `${message}\n`, { mode: 0o600 });
    '

    notify \
      -data actions-warden-notification.txt \
      -bulk \
      -disable-update-check \
      -silent \
      -provider-config "$provider_config"
```

Do not enable self-update in a reproducible CI job. Rotate provider secrets and
restrict the provider configuration to the intended destinations.
