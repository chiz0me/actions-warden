import { hasTrigger } from '../lib/triggers.js';
import { executesWorkspace, normalizeSourcePath } from '../lib/execution.js';

export const id = 'workflow-run-artifact-execution';
export const severity = 'critical';
export const description = 'Privileged workflow_run job executes files from a cross-run artifact.';

function downloadsArtifact(step) {
  const officialDownload = step.uses?.owner?.toLowerCase() === 'actions'
    && step.uses?.repo?.toLowerCase() === 'download-artifact';
  const thirdPartyDownload = step.uses?.kind === 'external'
    && step.uses?.repo?.toLowerCase().includes('download-artifact') === true
    && !officialDownload;
  if (officialDownload) {
    const runId = step.with_?.['run-id'];
    if (!selectsAnotherRun(runId, step.with_?.repository)) return null;
    return {
      line: step.uses.line,
      path: normalizeSourcePath(step.with_?.path),
      retrieval: 'actions/download-artifact-cross-run',
    };
  }
  if (thirdPartyDownload) {
    return {
      line: step.uses.line,
      path: normalizeSourcePath(step.with_?.path),
      retrieval: 'third-party-download-action',
    };
  }
  if (typeof step.run !== 'string') return null;
  const command = step.run;
  const ghDownload = command.match(
    /\bgh\s+run\s+download\s+(?:"([^"]+)"|'([^']+)'|(\$\{\{[\s\S]*?\}\})|([^\s;&|]+))/i,
  );
  const ghRunId = ghDownload?.[1] ?? ghDownload?.[2] ?? ghDownload?.[3] ?? ghDownload?.[4];
  const repository = shellOption(command, /(?:--repo|-R)/i);
  if (ghRunId && !ghRunId.startsWith('-') && selectsAnotherRun(ghRunId, repository)) {
    const directory = command.match(/(?:^|\s)(?:--dir|-D)(?:=|\s+)(?:"([^"]+)"|'([^']+)'|(\S+))/i);
    return {
      line: step.runLine || step.line,
      path: normalizeSourcePath(directory?.[1] ?? directory?.[2] ?? directory?.[3]),
      retrieval: 'gh-run-download-cross-run',
    };
  }
  if (
    /\b(?:gh\s+api|curl|wget)\b[\s\S]*\/actions\/artifacts\/[^/\s"']+\/(?:zip|tar)\b/i
      .test(command)
    || /\b(?:curl|wget)\b[\s\S]*archive_download_url\b/i.test(command)
  ) {
    return {
      line: step.runLine || step.line,
      path: '.',
      retrieval: 'actions-api-artifact-archive',
    };
  }
  return null;
}

function selectsAnotherRun(value, repository) {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'number') return true;
  if (typeof value !== 'string') return true;
  const normalized = value.trim();
  if (!normalized) return false;
  if (
    /^\$\{\{\s*github\.run_id\s*\}\}$/i.test(normalized)
    && isCurrentRepository(repository)
  ) return false;
  return true;
}

function isCurrentRepository(value) {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  return /^\$\{\{\s*(?:github\.repository|github\.event\.workflow_run\.repository\.full_name)\s*\}\}$/i
    .test(value.trim());
}

function shellOption(command, option) {
  const match = command.match(
    new RegExp(`(?:^|\\s)${option.source}(?:=|\\s+)(?:"([^"]+)"|'([^']+)'|(\\S+))`, 'i'),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
export function check(workflow) {
  if (!hasTrigger(workflow.on, 'workflow_run')) return [];
  const findings = [];
  for (const job of workflow.jobs) {
    const artifactSources = [];
    for (const step of job.steps) {
      const artifact = downloadsArtifact(step);
      if (artifact) {
        artifactSources.push(artifact);
        continue;
      }
      const artifactSource = artifactSources.find(source => (
        executesWorkspace(step, { sourcePaths: [source.path] })
      ));
      if (artifactSource) {
        findings.push({
          id,
          severity,
          line: step.runLine || step.line,
          fields: {
            type: id,
            sev: severity,
            job: job.name,
            source_line: artifactSource.line,
            retrieval: artifactSource.retrieval,
          },
          explain: 'download cross-run artifacts into a dedicated temporary directory, validate the expected producer, integrity, and data schema, then consume them only as inert data; never execute, source, or import artifact-controlled files in this privileged job',
        });
        break;
      }
    }
  }
  return findings;
}
