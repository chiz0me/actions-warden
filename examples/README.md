# Examples

These examples are copyable starting points. Keep every third-party Action at a
reviewed full commit SHA, then adapt permissions and retention to the consuming
repository.

| example | use it when |
|---|---|
| [CI violation reporting](./ci-violation-reporting/README.md) | A pull request should receive annotations and a JSON artifact before a policy gate blocks it |
| [Baseline adoption](./baseline-adoption/README.md) | An existing repository needs to accept reviewed legacy findings while blocking new ones |
| [SARIF Code Scanning](./sarif-code-scanning/README.md) | Findings should be uploaded to GitHub Code Scanning on trusted branch or scheduled runs |
| [HTML organization report](./html-organization-report/README.md) | Review organization coverage and findings in a searchable offline dashboard |
| [CSV reporting](./csv-reporting/README.md) | Export flat, spreadsheet-safe rows and retain them before enforcing policy |
| [Webhook and notification delivery](./notifications/README.md) | Send a bounded summary through generic HTTPS or ProjectDiscovery Notify without exposing the complete report |
| [Organization scan](./org-scan.yml) | A scheduled job should report workflow risks across an organization |
| [Upgrade pull request](./upgrade-pr.yml) | A scheduled job should apply eligible dependency upgrades and open a pull request |

The examples do not grant actions-warden permission to execute scanned code.
Repository audits are local and need no token input. Organization and
dependency-resolution commands need only the GitHub read access documented by
their individual guides.
