# CSV reporting

This example produces a spreadsheet-friendly audit report, retains it as a
workflow artifact, and applies the policy gate only after the artifact step.

Copy [`github-actions.yml`](./github-actions.yml) to
`.github/workflows/actions-warden-csv.yml`, then replace `<FULL_COMMIT_SHA>`
with a reviewed actions-warden release commit that supports CSV.

CSV is useful for spreadsheet review, data warehouses, and simple compliance
imports. Its contract is intentionally flat:

- `record_type` is always the first column;
- the remaining columns are the deterministic union of fields used by the
  command;
- each scanner record becomes one row;
- a final `STATUS` row preserves the semantic `OK` or `FAIL` result;
- nested values are encoded as compact JSON cells;
- control characters are escaped so one scanner record remains one physical
  CSV row;
- cells beginning like spreadsheet formulas are prefixed with an apostrophe.

The file uses UTF-8 and CRLF row endings. It is RFC 4180-compatible, but it is
not the lossless actions-warden data model. Retain JSON instead when another
program needs nested repository metadata, a future organization comparison, or
the complete versioned schema.

CSV reports can expose repository paths and security findings. Restrict
artifact access and choose a retention period that matches the repository's
security policy.

For a local export:

```sh
actions-warden audit \
  --format=csv \
  --output-path=actions-warden.csv
```

For organization reporting, the same format includes `REPOSITORY`, `FINDING`,
`ERROR`, `COVERAGE`, comparison, `SUMMARY`, and `STATUS` rows:

```sh
actions-warden org-scan my-org \
  --previous-report=actions-warden.previous.json \
  --format=csv \
  --output-path=actions-warden.current.csv
```

The previous report must still be a compatible JSON organization report.
