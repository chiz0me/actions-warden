/**
 * Organization-scan progress rendering and stderr reporters.
 *
 * Progress is a separate, best-effort channel from final report
 * serialization. Public library callbacks remain strict; this adapter catches
 * failures from its own output stream so a closed log pipe cannot invalidate
 * otherwise durable scan evidence.
 */

import { redact, redactDeep } from './redact.js';

const ORGANIZATION_PROGRESS_CONTEXTS = new Set(['agent', 'auto', 'ci', 'interactive']);

/** Public organization progress modes accepted by the CLI. */
export const ORGANIZATION_PROGRESS_MODES = Object.freeze([
  'auto',
  'plain',
  'json',
  'none',
  'always',
  'never',
]);

/** Normalize compatibility aliases to the canonical progress modes. */
export function normalizeOrganizationProgressMode(mode = 'auto') {
  if (!ORGANIZATION_PROGRESS_MODES.includes(mode)) {
    throw new Error('progress must be auto, plain, json, none, always, or never');
  }
  if (mode === 'always') return 'plain';
  if (mode === 'never') return 'none';
  return mode;
}

/**
 * Resolve an implicit progress mode for an explicit execution context.
 * Context changes presentation only; it never changes scan scope or evidence.
 */
export function resolveOrganizationProgressMode({
  mode = 'auto',
  context = 'auto',
  isTTY = false,
} = {}) {
  const normalized = normalizeOrganizationProgressMode(mode);
  if (!ORGANIZATION_PROGRESS_CONTEXTS.has(context)) {
    throw new Error('progress context must be agent, auto, ci, or interactive');
  }
  if (normalized !== 'auto') return normalized;
  if (context === 'agent') return 'none';
  if (context === 'ci') return 'plain';
  if (context === 'interactive') return 'plain';
  return isTTY ? 'plain' : 'none';
}

/**
 * Create a best-effort progress reporter for human lines or JSON Lines.
 * Every JSON event receives stable envelope metadata and is written to the
 * supplied stream one event per line.
 */
export function createOrganizationProgressReporter({
  mode = 'auto',
  context = 'auto',
  stream = process.stderr,
  isTTY = stream.isTTY === true,
  now = Date.now,
} = {}) {
  const resolvedMode = resolveOrganizationProgressMode({ mode, context, isTTY });
  const startedAt = now();
  let disabled = resolvedMode === 'none';
  let closed = false;
  let pendingWrites = 0;
  let listenerAttached = false;
  let cleanupScheduled = false;

  const onError = () => {
    disabled = true;
  };
  if (typeof stream?.on === 'function') {
    stream.on('error', onError);
    listenerAttached = true;
  }

  function cleanupListener() {
    if (!listenerAttached) return;
    listenerAttached = false;
    if (typeof stream?.removeListener === 'function') {
      stream.removeListener('error', onError);
    } else if (typeof stream?.off === 'function') {
      stream.off('error', onError);
    }
  }

  function scheduleCleanup() {
    if (!closed || pendingWrites !== 0 || !listenerAttached || cleanupScheduled) return;
    cleanupScheduled = true;
    // Writable streams invoke a failed write's callback before emitting the
    // corresponding error event. Keep the listener through that event turn.
    setImmediate(() => {
      cleanupScheduled = false;
      if (closed && pendingWrites === 0) cleanupListener();
    });
  }

  function write(value) {
    if (disabled || closed) return false;
    try {
      pendingWrites += 1;
      return stream.write(value, error => {
        pendingWrites = Math.max(0, pendingWrites - 1);
        if (error) disabled = true;
        scheduleCleanup();
      });
    } catch {
      pendingWrites = Math.max(0, pendingWrites - 1);
      disabled = true;
      scheduleCleanup();
      return false;
    }
  }

  function emit(rawEvent) {
    if (disabled || closed) return null;
    const current = now();
    const { type, ...fields } = rawEvent;
    const event = Object.freeze({
      ...redactDeep(fields),
      schemaVersion: '1.0',
      kind: 'actions-warden-org-scan-progress',
      event: redact(type),
      timestamp: new Date(current).toISOString(),
      elapsedMs: Math.max(0, current - startedAt),
    });
    if (resolvedMode === 'json') {
      return write(`${JSON.stringify(event)}\n`) ? event : null;
    }
    const message = formatOrganizationProgress(rawEvent);
    return !message || write(message) ? event : null;
  }

  function close() {
    closed = true;
    scheduleCleanup();
  }

  return {
    emit,
    close,
    mode: resolvedMode,
    requestedMode: mode,
  };
}

/** Render one redacted progress line, or an empty string for an unknown event. */
export function formatOrganizationProgress(event) {
  switch (event.type) {
    case 'scan-started':
      return line(`starting organization scan for ${event.organization}`);
    case 'checkpoint-loaded':
      return line(`loaded checkpoint with ${event.repositories} completed repositories`);
    case 'checkpoint-created':
      return line('created organization scan checkpoint');
    case 'discovery-started':
      return line(`discovering repositories in ${event.organization}`);
    case 'discovery-page':
      return line(
        `repository discovery page ${event.page}: ${event.repositoriesDiscovered} visible`
        + (Number.isSafeInteger(event.rateLimitRemaining)
          ? `, GitHub API remaining ${event.rateLimitRemaining}`
          : ''),
      );
    case 'discovery-completed':
      return line(
        `selected ${event.selected} of ${event.discovered} discovered repositories`
        + ` (${event.eligible} eligible)`,
      );
    case 'repository-started':
      return line(
        `[${event.position}/${event.total}] scanning ${event.repository}`
        + (Number.isSafeInteger(event.active)
          ? ` (${event.active}/${event.concurrency} active)`
          : ''),
      );
    case 'repository-phase':
      return line(`[${event.position}/${event.total}] ${event.repository}: ${event.phase}`);
    case 'request-retry':
      return line(
        `${event.repository ? `${event.repository}: ` : ''}`
        + `GitHub request retry ${event.attempt}/${event.maxRetries}`
        + ` after ${event.reason} (${event.delayMs}ms)`,
      );
    case 'checkpoint-written':
      return line(
        `${event.repository}: checkpoint durable`
        + ` (${event.repositories}/${event.total} repositories)`,
      );
    case 'repository-completed':
      return line(
        `[${event.completed}/${event.total}] ${event.reused ? 'resumed' : 'completed'} `
        + `${event.repository}: ${event.status}, ${count(event.files, 'file')}, `
        + `${count(event.findings, 'finding')}, ${count(event.errors, 'error')}`,
      );
    case 'scan-completed':
      return line(
        `finished ${event.organization}: ${event.status}, ${event.completed}/${event.total} `
        + `repositories, ${event.reused} resumed, ${event.findings} findings, `
        + `${event.errors} errors in ${event.elapsedMs}ms`,
      );
    case 'scan-failed':
      return line(`organization scan failed for ${event.organization}: ${event.error}`);
    case 'command-failed':
      return line(`organization scan command failed for ${event.organization}: ${event.error}`);
    default:
      return '';
  }
}

function line(value) {
  const safe = [...redact(String(value))]
    .map(char => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127 ? ' ' : char;
    })
    .join('');
  return `[actions-warden] ${safe}\n`;
}

function count(value, noun) {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}
