/**
 * Conservative indicators that a step may execute or interpret files from the
 * current workspace. Avoid treating harmless shell commands such as `echo` as
 * code execution while covering common build/test/package entry points.
 */

const WORKSPACE_COMMAND = /(?:^|[;&|])\s*(?:sudo\s+)?(?:(?:\.{0,2}[\\/]|[A-Za-z]:[\\/]|[A-Za-z0-9_.-]+[\\/])[^\s;&|]+|source\s+[^\s;&|]+|make(?:\s|$)|npm\s+(?:ci|install|test|run|exec)\b|npx\b|pnpm\s+(?:install|test|run|exec)\b|yarn\s+(?:install|test|run|exec)\b|bun\s+(?:install|test|run|x)\b|deno\s+(?:run|test|task)\b|(?:pip3?|uv\s+pip|poetry)\s+(?:install|run)\b|uv\s+run\b|tox\b|nox\b|composer\s+(?:install|run|exec)\b|swift\s+(?:build|test)\b|sbt\b|cmake\s+--build\b|(?:bash|sh|zsh|python3?|ruby|node|perl|php)\s+[^\s;&|]+|(?:pwsh|powershell)(?:\.exe)?\s+(?:-File\s+)?[^\s;&|]+|cmd(?:\.exe)?\s+\/c\s+[^\s;&|]+|java\s+-jar\s+[^\s;&|]+|cargo\s+(?:build|test|run|check|clippy)\b|go\s+(?:build|test|run)\b|mvn\b|gradle\b|\.\/gradlew\b|dotnet\s+(?:build|test|run|publish)\b|bundle\s+exec\b|rake\b|pytest\b|docker(?:\s+compose)?\s+(?:build|run)\b)/im;
const WORKSPACE_ACTION = /(?:^|[-_/])(build|builder|compile|exec|package|publish|runner|test|deploy)(?:[-_/]|$)/i;

/**
 * @param {import('./parser.js').StepNode} step
 */
export function executesWorkspace(step, { sourcePaths = ['.'] } = {}) {
  let executes = false;
  if (step.uses?.kind === 'local') executes = true;
  if (typeof step.run === 'string' && WORKSPACE_COMMAND.test(step.run)) executes = true;
  if (step.uses?.kind === 'external') {
    const identity = [
      step.uses.owner,
      step.uses.repo,
      step.uses.subpath,
    ].filter(Boolean).join('/');
    if (WORKSPACE_ACTION.test(identity)) executes = true;
    if (Object.values(step.with_ ?? {}).some(
      value => typeof value === 'string' && WORKSPACE_COMMAND.test(value),
    )) executes = true;
  }
  if (!executes) return false;

  const normalized = sourcePaths.map(normalizePath);
  if (normalized.includes('.')) return true;
  const candidates = [
    step.run,
    step.workingDirectory,
    step.uses?.raw,
    ...Object.values(step.with_ ?? {}),
  ].filter(value => typeof value === 'string');
  return normalized.some(sourcePath => (
    candidates.some(candidate => referencesPath(candidate, sourcePath))
  ));
}

/**
 * Normalize a configured source path, conservatively treating dynamic
 * expressions and empty values as the workspace root.
 */
export function normalizeSourcePath(value) {
  if (typeof value !== 'string' || !value.trim()) return '.';
  const expanded = normalizeTrustedRoots(value);
  if (expanded.includes('${{')) return '.';
  return normalizePath(expanded);
}

function normalizePath(value) {
  const normalized = normalizeTrustedRoots(String(value))
    .trim()
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '');
  return normalized.replace(/\/+$/, '') || '.';
}

function normalizeTrustedRoots(value) {
  return String(value)
    .replace(/\$\{\{\s*runner\.temp\s*\}\}/gi, '__runner_temp__')
    .replace(/\$(?:\{RUNNER_TEMP\}|RUNNER_TEMP\b)|%RUNNER_TEMP%/g, '__runner_temp__')
    .replace(/\$\{\{\s*github\.workspace\s*\}\}/gi, '.')
    .replace(/\$(?:\{GITHUB_WORKSPACE\}|GITHUB_WORKSPACE\b)|%GITHUB_WORKSPACE%/g, '.');
}

function referencesPath(value, path) {
  const normalizedValue = normalizePath(value);
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[\\s"'=:/])${escaped}(?:$|[\\s"'/:;&|])`, 'i')
    .test(normalizedValue);
}
