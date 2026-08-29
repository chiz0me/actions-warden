/**
 * Human-readable rendering for structured organization-scan progress events.
 * Progress is a separate channel from final report serialization.
 */

import { redact } from './redact.js';

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
    case 'discovery-completed':
      return line(
        `selected ${event.selected} of ${event.discovered} discovered repositories`
        + ` (${event.eligible} eligible)`,
      );
    case 'repository-started':
      return line(`[${event.position}/${event.total}] scanning ${event.repository}`);
    case 'request-retry':
      return line(
        `${event.repository ? `${event.repository}: ` : ''}`
        + `GitHub request retry ${event.attempt}/${event.maxRetries}`
        + ` after ${event.reason} (${event.delayMs}ms)`,
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
