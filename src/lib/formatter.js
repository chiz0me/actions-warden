/**
 * Output formatter supporting TOON (Token-Oriented Object Notation), JSON,
 * plain text, CSV, SARIF, and self-contained HTML.
 *
 * TOON output rules:
 *   - One record per line: `LABEL: key=value key=value`
 *   - Values containing spaces or `=` are quoted: `msg="hello world"`
 *   - Empty/null values are omitted
 *   - Trailing `STATUS: OK` or `STATUS: FAIL` signal for machine consumers
 */

import { redact, redactDeep } from './redact.js';

const MAX_HTML_REPORT_BYTES = 32 * 1024 * 1024;
const CSV_PREFERRED_COLUMNS = Object.freeze([
  'status',
  'organization',
  'repo',
  'repository',
  'file',
  'line',
  'id',
  'type',
  'ruleId',
  'sev',
  'severity',
  'action',
  'image',
  'from',
  'to',
  'sha',
  'version',
  'level',
  'change',
  'msg',
  'explain',
  'url',
]);

/**
 * Severity ordering, lowest-to-highest.
 */
export const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'];

/**
 * @param {string} value
 * @returns {string}
 */
function quoteIfNeeded(value) {
  if (value === '') return '""';
  if (/[\s="\\]/.test(value) || [...value].some(char => char.charCodeAt(0) < 32)) {
    return JSON.stringify(value);
  }
  return value;
}

/**
 * Serialize a record to a single TOON line.
 *
 * @param {string} label
 * @param {Record<string, unknown>} fields
 * @returns {string}
 */
export function toonLine(label, fields) {
  const parts = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined || v === '') continue;
    const value = typeof v === 'string' ? v : String(v);
    const key = redact(String(k)).replace(/[^a-zA-Z0-9_.-]/g, '_');
    parts.push(`${key}=${quoteIfNeeded(redact(value))}`);
  }
  return parts.length === 0 ? `${label}:` : `${label}: ${parts.join(' ')}`;
}

/**
 * Render a TOON document.
 *
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: 'OK'|'FAIL'}} [options]
 * @returns {string}
 */
export function renderToon(records, options = {}) {
  const lines = records.map(r => toonLine(r.label, r.fields));
  if (options.status) lines.push(`STATUS: ${options.status}`);
  return lines.join('\n') + '\n';
}

/**
 * Render recursively redacted JSON with 2-space indentation. Object key order
 * follows the caller-provided value.
 *
 * @param {unknown} payload
 * @returns {string}
 */
export function renderJson(payload) {
  return JSON.stringify(redactDeep(payload), null, 2) + '\n';
}

/**
 * Render records as deterministic RFC 4180-compatible CSV. The first column
 * identifies the record type and a final STATUS record preserves semantic
 * status. Control characters are escaped to keep one physical line per record,
 * and formula-like cells are prefixed with an apostrophe for spreadsheet safety.
 *
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: 'OK'|'FAIL'}} [options]
 * @returns {string}
 */
export function renderCsv(records, options = {}) {
  const normalized = normalizeCsvRecords(records);
  if (options.status) {
    normalized.push({
      label: 'STATUS',
      fields: new Map([['status', redact(String(options.status))]]),
    });
  }

  const discovered = new Set(normalized.flatMap(record => [...record.fields.keys()]));
  discovered.delete('record_type');
  const preferred = CSV_PREFERRED_COLUMNS.filter(column => discovered.delete(column));
  const columns = ['record_type', ...preferred, ...[...discovered].sort()];
  const rows = [columns.map(csvCell).join(',')];
  for (const record of normalized) {
    rows.push(columns.map(column => csvCell(
      column === 'record_type' ? record.label : record.fields.get(column),
    )).join(','));
  }
  return `${rows.join('\r\n')}\r\n`;
}

/**
 * Render plain text (human-readable summary).
 *
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: 'OK'|'FAIL'}} [options]
 * @returns {string}
 */
export function renderText(records, options = {}) {
  const lines = records.map(r => {
    const kv = Object.entries(r.fields)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${escapeText(redact(String(v)))}`)
      .join(' ');
    return `[${r.label}] ${kv}`;
  });
  if (options.status) lines.push(`==> ${options.status}`);
  return lines.join('\n') + '\n';
}

function escapeText(value) {
  return JSON.stringify(value).slice(1, -1);
}

/**
 * Format records into the requested output mode.
 *
 * @param {'toon'|'json'|'text'|'csv'|'sarif'|'html'} format
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: 'OK'|'FAIL', json?: unknown, title?: string,
 *   metadata?: Record<string, unknown>}} [options]
 * @returns {string}
 */
export function format(format_, records, options = {}) {
  switch (format_) {
    case 'json':
      return renderJson(options.json ?? recordsToJson(records, options));
    case 'text':
      return renderText(records, options);
    case 'csv':
      return renderCsv(records, options);
    case 'sarif':
      return renderSarif(records, options);
    case 'html':
      return renderHtml(records, options);
    case 'toon':
    default:
      return renderToon(records, options);
  }
}

function normalizeCsvRecords(records) {
  if (!Array.isArray(records)) return [];
  return records.map(record => {
    const source = record?.fields;
    const entries = source && typeof source === 'object' && !Array.isArray(source)
      ? Object.entries(source)
      : [];
    return {
      label: redact(String(record?.label ?? 'RECORD')),
      fields: new Map(entries.map(([key, value]) => [
        redact(String(key)),
        redactDeep(value),
      ])),
    };
  });
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const formulaSensitive = typeof value === 'string';
  let serialized;
  if (typeof value === 'string') {
    serialized = redact(value);
  } else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    serialized = String(value);
  } else {
    serialized = JSON.stringify(redactDeep(value));
    if (serialized === undefined) serialized = String(value);
  }
  serialized = escapeCsvControls(redact(serialized));
  if (formulaSensitive && /^\s*[=+\-@]/u.test(serialized)) serialized = `'${serialized}`;
  return /[",\r\n]/.test(serialized)
    ? `"${serialized.replaceAll('"', '""')}"`
    : serialized;
}

function escapeCsvControls(value) {
  let escaped = '';
  for (const character of value) {
    if (character === '\r') escaped += '\\r';
    else if (character === '\n') escaped += '\\n';
    else if (character === '\t') escaped += '\\t';
    else {
      const code = character.charCodeAt(0);
      if (code <= 31 || code === 127) {
        escaped += `\\u${code.toString(16).padStart(4, '0')}`;
      } else {
        escaped += character;
      }
    }
  }
  return escaped;
}

/**
 * Render a deterministic, self-contained HTML report with client-side search
 * and filters. Dynamic values are redacted and escaped before entering markup;
 * no report data is interpolated into executable JavaScript.
 *
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: 'OK'|'FAIL', title?: string,
 *   metadata?: Record<string, unknown>}} [options]
 * @returns {string}
 */
export function renderHtml(records, options = {}) {
  const normalized = normalizeHtmlRecords(redactDeep(records));
  const status = redact(String(options.status ?? 'UNKNOWN'));
  const title = redact(String(options.title ?? 'actions-warden report'));
  const metadata = normalizeFields(redactDeep(options.metadata ?? {}));
  const summary = [...normalized].reverse().find(record => record.label === 'SUMMARY');
  const detailRecords = normalized.filter(record => record.label !== 'SUMMARY');
  const groups = groupRecords(detailRecords);
  const findings = normalized.filter(record => record.label === 'FINDING');
  const ruleCounts = summarizeHtmlRules(findings);
  const labels = [...new Set(detailRecords.map(record => record.label))].sort();
  const severities = [...new Set(detailRecords
    .map(record => record.fields.sev ?? record.fields.severity)
    .filter(Boolean)
    .map(String))].sort(severitySort);
  const repositories = [...new Set(detailRecords
    .map(recordRepository)
    .filter(Boolean))].sort((left, right) => left.localeCompare(right));
  const incomplete = Number(summary?.fields.errors ?? 0) > 0
    || Number(summary?.fields.repositoriesFailed ?? 0) > 0
    || detailRecords.some(record => record.label === 'ERROR')
    || detailRecords.some(record => (
      record.label === 'UNKNOWN_FINDING'
      || (record.label === 'COMPARISON' && record.fields.complete === 'false')
      || (record.label === 'COVERAGE' && record.fields.complete === 'false')
    ))
    || findings.some(record => (
      record.fields.type === 'parse-error' || record.fields.ruleId === 'parse-error'
    ));

  const document = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; --bg: #f6f8fa; --panel: #fff; --text: #1f2328; --muted: #59636e; --border: #d0d7de; --accent: #0969da; --ok: #1a7f37; --fail: #cf222e; --critical: #82071e; --high: #cf222e; --medium: #9a6700; --low: #0969da; }
    @media (prefers-color-scheme: dark) { :root { --bg: #0d1117; --panel: #161b22; --text: #e6edf3; --muted: #8d96a0; --border: #30363d; --accent: #58a6ff; --ok: #3fb950; --fail: #f85149; --critical: #ff7b72; --high: #f85149; --medium: #d29922; --low: #58a6ff; } }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { width: min(1600px, 100%); margin: 0 auto; padding: 24px; }
    h1, h2, h3 { line-height: 1.25; }
    h1 { margin: 0; font-size: clamp(24px, 4vw, 36px); }
    h2 { margin: 0 0 16px; font-size: 20px; }
    h3 { margin: 0 0 12px; font-size: 16px; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
    .eyebrow, .muted { color: var(--muted); }
    .eyebrow { margin: 0 0 4px; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .panel { margin: 16px 0; padding: 18px; overflow: hidden; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 1px 0 rgb(31 35 40 / 4%); }
    .status, .badge { display: inline-flex; align-items: center; border-radius: 999px; font-weight: 700; white-space: nowrap; }
    .status { padding: 7px 12px; font-size: 13px; }
    .badge { padding: 2px 8px; font-size: 12px; background: color-mix(in srgb, var(--muted) 14%, transparent); }
    .status-ok, .badge-ok, .badge-resolved { color: var(--ok); background: color-mix(in srgb, var(--ok) 14%, transparent); }
    .status-fail, .badge-fail, .badge-new, .badge-unknown { color: var(--fail); background: color-mix(in srgb, var(--fail) 14%, transparent); }
    .badge-critical { color: var(--critical); background: color-mix(in srgb, var(--critical) 14%, transparent); }
    .badge-high { color: var(--high); background: color-mix(in srgb, var(--high) 14%, transparent); }
    .badge-medium { color: var(--medium); background: color-mix(in srgb, var(--medium) 14%, transparent); }
    .badge-low, .badge-unchanged { color: var(--low); background: color-mix(in srgb, var(--low) 14%, transparent); }
    .callout { border-left: 4px solid var(--fail); }
    .callout strong { display: block; margin-bottom: 4px; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 10px; }
    .metric { min-width: 0; padding: 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; }
    .metric-name { display: block; overflow-wrap: anywhere; color: var(--muted); font-size: 12px; }
    .metric-value { display: block; margin-top: 3px; overflow-wrap: anywhere; font-size: 20px; font-weight: 700; }
    .filters { display: grid; grid-template-columns: minmax(220px, 2fr) repeat(3, minmax(140px, 1fr)); gap: 10px; }
    label { display: grid; gap: 4px; color: var(--muted); font-size: 12px; font-weight: 600; }
    input, select { width: 100%; min-height: 38px; padding: 7px 9px; color: var(--text); background: var(--panel); border: 1px solid var(--border); border-radius: 6px; font: inherit; }
    input:focus, select:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
    .filter-count { margin: 10px 0 0; color: var(--muted); }
    .table-wrap { overflow: auto; border: 1px solid var(--border); border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 9px 11px; vertical-align: top; text-align: left; border-bottom: 1px solid var(--border); overflow-wrap: anywhere; }
    th { position: sticky; top: 0; z-index: 1; color: var(--muted); background: var(--panel); font-size: 11px; letter-spacing: .04em; text-transform: uppercase; }
    tbody tr:last-child td { border-bottom: 0; }
    tbody tr:hover { background: color-mix(in srgb, var(--accent) 6%, transparent); }
    code { font: 12px/1.45 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; white-space: pre-wrap; }
    a { color: var(--accent); text-decoration-thickness: .08em; text-underline-offset: .15em; }
    [hidden] { display: none !important; }
    footer { margin: 24px 0 8px; color: var(--muted); font-size: 12px; text-align: center; }
    @media (max-width: 800px) { main { padding: 14px; } .header { align-items: stretch; flex-direction: column; } .filters { grid-template-columns: 1fr; } }
    @media print { :root { color-scheme: light; } body { background: #fff; color: #000; } main { width: 100%; padding: 0; } .filters-panel { display: none; } .panel { break-inside: avoid; box-shadow: none; } th { position: static; } }
  </style>
</head>
<body>
  <main>
    <header class="header">
      <div><p class="eyebrow">actions-warden report</p><h1>${escapeHtml(title)}</h1></div>
      <span class="status ${statusClass(status)}">${escapeHtml(status)}</span>
    </header>
    ${incomplete ? `<section class="panel callout"><strong>Coverage is incomplete</strong><span>One or more repositories or files could not be fully inspected. Review operational errors before treating absent findings as clean.</span></section>` : ''}
    ${renderHtmlMetadata(metadata)}
    ${renderHtmlSummary(summary?.fields)}
    ${renderHtmlRuleBreakdown(ruleCounts)}
    ${detailRecords.length > 0 ? renderHtmlFilters({ labels, severities, repositories, total: detailRecords.length }) : ''}
    ${[...groups.entries()].map(([label, values]) => renderHtmlGroup(label, values)).join('\n    ')}
    <footer>Generated deterministically by actions-warden. The saved report may contain sensitive repository names, paths, and findings.</footer>
  </main>
  <script>
    (() => {
      const rows = [...document.querySelectorAll('[data-record]')];
      const search = document.querySelector('#filter-search');
      const label = document.querySelector('#filter-label');
      const severity = document.querySelector('#filter-severity');
      const repository = document.querySelector('#filter-repository');
      const count = document.querySelector('#filter-count');
      if (!search || !label || !severity || !repository || !count) return;
      const apply = () => {
        const query = search.value.trim().toLocaleLowerCase();
        let visible = 0;
        for (const row of rows) {
          const matches = (!query || row.dataset.search.includes(query))
            && (!label.value || row.dataset.label === label.value)
            && (!severity.value || row.dataset.severity === severity.value)
            && (!repository.value || row.dataset.repository === repository.value);
          row.hidden = !matches;
          if (matches) visible += 1;
        }
        for (const section of document.querySelectorAll('[data-record-section]')) {
          section.hidden = !section.querySelector('[data-record]:not([hidden])');
        }
        count.textContent = String(visible) + ' of ' + String(rows.length) + ' records shown';
      };
      for (const control of [search, label, severity, repository]) {
        control.addEventListener(control === search ? 'input' : 'change', apply);
      }
      apply();
    })();
  </script>
</body>
</html>
`;
  const bytes = Buffer.byteLength(document);
  if (bytes > MAX_HTML_REPORT_BYTES) {
    throw new Error(
      `HTML report exceeds ${MAX_HTML_REPORT_BYTES} bytes; use JSON, SARIF, or a narrower scope`,
    );
  }
  return document;
}

function normalizeHtmlRecords(records) {
  if (!Array.isArray(records)) return [];
  return records.map(record => ({
    label: redact(String(record?.label ?? 'RECORD')),
    fields: normalizeFields(record?.fields),
  }));
}

function normalizeFields(fields) {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {};
  return Object.fromEntries(Object.entries(fields)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => [redact(String(key)), htmlValue(value)]));
}

function htmlValue(value) {
  if (typeof value === 'string') return redact(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return redact(JSON.stringify(value));
}

function groupRecords(records) {
  const groups = new Map();
  for (const record of records) {
    if (!groups.has(record.label)) groups.set(record.label, []);
    groups.get(record.label).push(record);
  }
  return groups;
}

function summarizeHtmlRules(findings) {
  const counts = new Map();
  for (const finding of findings) {
    const rule = String(finding.fields.type ?? finding.fields.ruleId ?? 'unknown');
    const severity = String(finding.fields.sev ?? finding.fields.severity ?? 'unknown');
    const key = `${severity}\0${rule}`;
    const current = counts.get(key) ?? { rule, severity, count: 0 };
    current.count += 1;
    counts.set(key, current);
  }
  return [...counts.values()].sort((left, right) => (
    severitySort(left.severity, right.severity)
    || right.count - left.count
    || left.rule.localeCompare(right.rule)
  ));
}

function renderHtmlMetadata(metadata) {
  const entries = Object.entries(metadata);
  if (entries.length === 0) return '';
  return `<section class="panel"><h2>Report scope</h2><div class="metrics">${entries.map(([name, value]) => (
    `<div class="metric"><span class="metric-name">${escapeHtml(humanize(name))}</span><span class="metric-value"><code>${escapeHtml(value)}</code></span></div>`
  )).join('')}</div></section>`;
}

function renderHtmlSummary(fields) {
  if (!fields || Object.keys(fields).length === 0) return '';
  return `<section class="panel"><h2>Summary</h2><div class="metrics">${Object.entries(fields)
    .map(([name, value]) => (
      `<div class="metric"><span class="metric-name">${escapeHtml(humanize(name))}</span><span class="metric-value">${escapeHtml(value)}</span></div>`
    )).join('')}</div></section>`;
}

function renderHtmlRuleBreakdown(rows) {
  if (rows.length === 0) return '';
  return `<section class="panel"><h2>Rule breakdown</h2><div class="table-wrap"><table><thead><tr><th>Severity</th><th>Rule</th><th>Findings</th></tr></thead><tbody>${rows.map(row => (
    `<tr><td>${renderBadge(row.severity)}</td><td><code>${escapeHtml(row.rule)}</code></td><td>${row.count}</td></tr>`
  )).join('')}</tbody></table></div></section>`;
}

function renderHtmlFilters({ labels, severities, repositories, total }) {
  return `<section class="panel filters-panel"><h2>Filter records</h2><div class="filters"><label>Search<input id="filter-search" type="search" placeholder="Repository, rule, file, action, or message"></label><label>Record type<select id="filter-label"><option value="">All types</option>${optionMarkup(labels)}</select></label><label>Severity<select id="filter-severity"><option value="">All severities</option>${optionMarkup(severities)}</select></label><label>Repository<select id="filter-repository"><option value="">All repositories</option>${optionMarkup(repositories)}</select></label></div><p class="filter-count" id="filter-count">${total} of ${total} records shown</p></section>`;
}

function optionMarkup(values) {
  return values.map(value => (
    `<option value="${escapeHtml(String(value).toLocaleLowerCase())}">${escapeHtml(value)}</option>`
  )).join('');
}

function renderHtmlGroup(label, records) {
  const columns = [...new Set(records.flatMap(record => Object.keys(record.fields)))];
  const rows = records.map(record => {
    const severity = String(record.fields.sev ?? record.fields.severity ?? '').toLocaleLowerCase();
    const repository = recordRepository(record).toLocaleLowerCase();
    const search = `${record.label} ${Object.values(record.fields).join(' ')}`.toLocaleLowerCase();
    return `<tr data-record data-label="${escapeHtml(record.label.toLocaleLowerCase())}" data-severity="${escapeHtml(severity)}" data-repository="${escapeHtml(repository)}" data-search="${escapeHtml(search)}">${columns.map(column => (
      `<td>${renderHtmlCell(column, record.fields[column])}</td>`
    )).join('')}</tr>`;
  }).join('');
  const heading = `${recordGroupTitle(label)} (${records.length})`;
  return `<section class="panel" data-record-section><h2>${escapeHtml(heading)}</h2><div class="table-wrap"><table><thead><tr>${columns.map(column => `<th>${escapeHtml(humanize(column))}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function recordGroupTitle(label) {
  const names = new Map([
    ['REPOSITORY', 'Repository breakdown'],
    ['FINDING', 'Findings'],
    ['ERROR', 'Operational errors'],
    ['WARNING', 'Warnings'],
    ['COMPARISON', 'Comparison summary'],
    ['NEW_FINDING', 'New findings'],
    ['RESOLVED_FINDING', 'Resolved findings'],
    ['UNCHANGED_FINDING', 'Unchanged findings'],
    ['UNKNOWN_FINDING', 'Unknown-resolution findings'],
  ]);
  return names.get(label) ?? humanize(label);
}

function renderHtmlCell(key, value) {
  if (value === undefined) return '';
  if (['severity', 'sev', 'status', 'change'].includes(key)) return renderBadge(value);
  if (key === 'url' && safeHttpsUrl(value)) {
    return `<a href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer">${escapeHtml(value)}</a>`;
  }
  return `<code>${escapeHtml(value)}</code>`;
}

function renderBadge(value) {
  const text = String(value);
  const normalized = text.toLocaleLowerCase();
  const known = new Set([
    'critical', 'high', 'medium', 'low', 'ok', 'fail',
    'new', 'resolved', 'unchanged', 'unknown',
  ]);
  const className = known.has(normalized) ? ` badge-${normalized}` : '';
  return `<span class="badge${className}">${escapeHtml(text)}</span>`;
}

function recordRepository(record) {
  const explicit = record.fields.repo ?? record.fields.repository;
  return explicit ? String(explicit) : '';
}

function safeHttpsUrl(value) {
  try {
    return new URL(String(value)).protocol === 'https:';
  } catch {
    return false;
  }
}

function statusClass(status) {
  if (status.toLocaleLowerCase() === 'ok') return 'status-ok';
  if (status.toLocaleLowerCase() === 'fail') return 'status-fail';
  return '';
}

function severitySort(left, right) {
  const order = new Map([
    ['critical', 0],
    ['high', 1],
    ['medium', 2],
    ['low', 3],
  ]);
  return (order.get(String(left).toLocaleLowerCase()) ?? 4)
    - (order.get(String(right).toLocaleLowerCase()) ?? 4);
}

function humanize(value) {
  const source = String(value);
  return (/^[A-Z0-9_-]+$/.test(source) ? source.toLocaleLowerCase() : source)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/^./, first => first.toLocaleUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Render records as SARIF 2.1.0 for GitHub code scanning.
 *
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: string}} [options]
 */
export function renderSarif(records, options = {}) {
  const ruleRecords = records.filter(record => record.label === 'RULE');
  const resultRecords = records.filter(record => (
    record.label === 'FINDING'
    || record.label === 'ERROR'
    || record.label === 'WARNING'
    || record.label === 'PIN'
    || record.label === 'UPGRADE'
  ));
  const rules = new Map();
  for (const record of ruleRecords) {
    const id = String(record.fields.id ?? 'actions-warden');
    rules.set(id, {
      id,
      shortDescription: {
        text: String(record.fields.description ?? id),
      },
      defaultConfiguration: {
        level: sarifLevel(String(record.fields.severity ?? 'low')),
      },
    });
  }

  const results = resultRecords.map(record => {
    const fields = record.fields;
    const ruleId = String(fields.type ?? `actions-warden/${record.label.toLowerCase()}`);
    if (!rules.has(ruleId)) {
      rules.set(ruleId, {
        id: ruleId,
        shortDescription: { text: ruleId },
        defaultConfiguration: {
          level: record.label === 'ERROR'
            ? 'error'
            : sarifLevel(String(fields.sev ?? 'low')),
        },
      });
    }
    const file = fields.file ? String(fields.file) : null;
    const line = Number(fields.line);
    return {
      ruleId,
      level: record.label === 'ERROR'
        ? 'error'
        : record.label === 'WARNING'
          ? 'warning'
          : sarifLevel(String(fields.sev ?? (record.label === 'FINDING' ? 'warning' : 'low'))),
      message: {
        text: String(fields.explain ?? fields.msg ?? summarizeFields(record.label, fields)),
      },
      ...(file ? {
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: file.replace(/\\/g, '/') },
            ...(Number.isInteger(line) && line > 0
              ? { region: { startLine: line } }
              : {}),
          },
        }],
      } : {}),
      ...(fields.id ? {
        partialFingerprints: {
          // GitHub code scanning recognizes this key and uses the suffix to
          // distinguish multiple results with the same semantic fingerprint.
          primaryLocationLineHash: `${fields.fingerprint ?? fields.id}:1`,
          'actions-warden/id': String(fields.id),
          ...(fields.fingerprint
            ? { 'actions-warden/semantic': String(fields.fingerprint) }
            : {}),
        },
      } : {}),
    };
  });

  return renderJson({
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'actions-warden',
          informationUri: 'https://github.com/chiz0me/actions-warden',
          rules: [...rules.values()],
        },
      },
      invocations: [{
        executionSuccessful: options.status !== 'ERROR',
      }],
      results,
    }],
  });
}

function sarifLevel(severity) {
  if (severity === 'critical' || severity === 'high' || severity === 'error') return 'error';
  if (severity === 'medium' || severity === 'warning') return 'warning';
  return 'note';
}

function summarizeFields(label, fields) {
  const details = Object.entries(fields)
    .filter(([key, value]) => !['id', 'file', 'line'].includes(key) && value != null && value !== '')
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ');
  return `${label}: ${details}`;
}

/**
 * Convert records to a generic JSON payload when no custom JSON is supplied.
 *
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: string}} options
 * @returns {object}
 */
function recordsToJson(records, options) {
  return {
    schemaVersion: '1.0',
    records: records.map(r => ({ label: r.label, ...r.fields })),
    status: options.status ?? null,
  };
}

/**
 * Aggregate findings into a summary record.
 *
 * @param {Array<{severity: string}>} findings
 * @returns {Record<string, number>}
 */
export function summarize(findings) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    if (counts[f.severity] !== undefined) counts[f.severity] += 1;
  }
  return counts;
}
