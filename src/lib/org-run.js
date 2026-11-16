/**
 * Organization scan runner shared by the CLI and the GitHub Action.
 *
 * The runner owns everything between parsed adapter options and a finished
 * scan: automatic artifact names, checkpoint selection, every destination and
 * control-file check (all before the first network request), previous-report
 * loading, the scan, reused-repository counting, and comparison. Adapters keep
 * input parsing and output.
 */

import { isAbsolute, relative, resolve, sep } from 'node:path';
import {
  DEFAULT_CONFIG_PATHS,
  assertDestinationsDoNotReplaceControls,
  assertDestinationsUseSafeNames,
  validateWriteDestination,
} from './destination.js';
import { createOrganizationScanArtifacts } from './org-artifacts.js';
import { buildOrganizationReport } from './org-report.js';
import { compareOrganizationReports, loadOrganizationReport } from './org-report-comparison.js';
import { validateOrganizationReportDirectory } from './org-report-directory.js';
import { pathExists } from './paths.js';
import { sameFilePath } from './path-equality.js';

/**
 * @typedef {object} OrganizationRunOptions
 * @property {object} scan Options for `scanOrganization` except `checkpointPath`,
 *   `resume`, and `onProgress`, which the runner supplies. Must include
 *   `organization`, `cwd`, and `visibility`.
 * @property {(options: object) => Promise<object>} scanOrganization The scan
 *   implementation. Callers inject it so this library module does not depend on
 *   `src/commands/`.
 * @property {'toon'|'json'|'text'|'csv'|'sarif'|'html'} format Report format.
 * @property {'file'|'stdout'} output Whether the report is saved or printed.
 * @property {string} [outputPath] Explicit report path; defaults to the automatic one.
 * @property {string} [reportDirectory] Dedicated report directory, instead of one file.
 * @property {string} [checkpointPath] Explicit checkpoint to create or resume.
 * @property {string} [resumePath] Explicit checkpoint that must be resumed.
 * @property {boolean} [fresh] Replace rather than resume the selected checkpoint.
 * @property {boolean} [autoCheckpoint] Use the scope-keyed automatic checkpoint (default true).
 * @property {string} [previousReportPath] Prior organization JSON report to compare against.
 * @property {{output: string, checkpoint: string, resume: string}} labels Option names
 *   used in destination error messages, such as `--checkpoint` or `checkpoint-path`.
 * @property {() => {emit: Function, failScan: Function}} openProgress Called once, after
 *   preflight and before the scan, to obtain the progress reporter.
 */

/**
 * Run a guarded organization scan: resolve artifacts, validate every
 * destination, load any previous report, scan, and attach the comparison.
 *
 * @param {OrganizationRunOptions} options
 * @returns {Promise<{result: object, reportPath: string|undefined,
 *   checkpointPath: string|null, resumed: boolean, repositoriesReused: number,
 *   outputDestination: object|null, checkpointDestination: object|null,
 *   reportDirectory: string|null}>}
 */
export async function runOrganizationScan(options) {
  const { scan, format } = options;
  const artifacts = await createOrganizationScanArtifacts({ ...scan, reportFormat: format });
  const report = await selectReportDestination(options, artifacts);
  const checkpoint = await selectCheckpoint(options, artifacts);
  const previousPath = options.previousReportPath
    ? resolve(scan.cwd, options.previousReportPath)
    : null;
  await assertNoDestinationCollisions({ artifacts, report, checkpoint, previousPath, scan });
  const previousReport = options.previousReportPath
    ? await loadOrganizationReport({ path: options.previousReportPath, cwd: scan.cwd })
    : null;

  const progress = options.openProgress();
  const { result, repositoriesReused } = await scanWithProgress(options, checkpoint, progress);
  await assertDestinationsDoNotReplaceControls(
    report.destination ? [report.destination] : [],
    [
      { label: 'active config', path: result.configPath },
      { label: 'active baseline', path: result.baseline.path },
      { label: 'previous report', path: previousPath },
    ],
  );
  if (previousReport) {
    result.comparison = compareOrganizationReports({
      previous: previousReport,
      current: buildOrganizationReport(result, { cwd: scan.cwd }),
    });
  }
  return {
    result,
    reportPath: report.outputPath,
    checkpointPath: checkpoint.path ?? null,
    resumed: checkpoint.resume,
    repositoriesReused,
    outputDestination: report.destination,
    checkpointDestination: checkpoint.destination,
    reportDirectory: report.directory,
  };
}

async function selectReportDestination(options, artifacts) {
  const { cwd } = options.scan;
  if (options.reportDirectory) {
    const directory = await validateOrganizationReportDirectory({
      path: options.reportDirectory,
      cwd,
    });
    assertSafeReportDirectoryName(directory, cwd);
    return { directory, outputPath: undefined, destination: null };
  }
  if (options.output !== 'file') {
    return { directory: null, outputPath: undefined, destination: null };
  }
  const outputPath = options.outputPath ?? artifacts.reportPath;
  const destination = await validateWriteDestination({
    label: options.labels.output,
    path: outputPath,
    cwd,
  });
  await assertDestinationsUseSafeNames([destination], cwd);
  return { directory: null, outputPath, destination };
}

async function selectCheckpoint(options, artifacts) {
  const { cwd } = options.scan;
  const selection = await chooseCheckpoint(options, artifacts);
  if (!selection) return { path: undefined, resume: false, destination: null };
  const destination = await validateWriteDestination({
    label: selection.label,
    path: selection.path,
    cwd,
  });
  await assertDestinationsUseSafeNames([destination], cwd);
  return { ...selection, destination };
}

async function chooseCheckpoint(options, artifacts) {
  const { labels, fresh, resumePath, checkpointPath, autoCheckpoint = true } = options;
  if (resumePath) return { path: resumePath, resume: true, label: labels.resume };
  if (checkpointPath) {
    const exists = await pathExists(resolve(options.scan.cwd, checkpointPath));
    return { path: checkpointPath, resume: !fresh && exists, label: labels.checkpoint };
  }
  if (!autoCheckpoint) return null;
  return {
    path: artifacts.checkpointPath,
    resume: !fresh && artifacts.resume,
    label: labels.checkpoint,
  };
}

async function assertNoDestinationCollisions({
  artifacts,
  report,
  checkpoint,
  previousPath,
  scan,
}) {
  const output = report.destination;
  const saved = checkpoint.destination;
  await assertDifferentPaths(
    saved?.path,
    output?.path,
    'checkpoint and report output paths must be different',
  );
  await assertDifferentPaths(
    previousPath,
    saved?.path,
    'checkpoint and previous report paths must be different',
  );
  await assertDifferentPaths(
    previousPath,
    output?.path,
    'output and previous report paths must be different',
  );
  const controls = [
    { label: 'active config', path: artifacts.configPath },
    { label: 'active baseline', path: artifacts.baselinePath },
  ];
  await assertDestinationsDoNotReplaceControls([output, saved].filter(Boolean), controls);
  if (report.directory) {
    assertDirectoryDoesNotOverlapControls(report.directory, [
      { label: 'checkpoint', path: saved?.path },
      ...controls,
      { label: 'previous report', path: previousPath },
      ...DEFAULT_CONFIG_PATHS.map(path => ({
        label: 'reserved config path',
        path: resolve(scan.cwd, path),
      })),
    ]);
  }
}

async function assertDifferentPaths(left, right, message) {
  if (left && right && await sameFilePath(left, right)) throw new Error(message);
}

async function scanWithProgress(options, checkpoint, progress) {
  let repositoriesReused = 0;
  try {
    const result = await options.scanOrganization({
      ...options.scan,
      checkpointPath: checkpoint.path,
      resume: checkpoint.resume,
      onProgress: event => {
        if (event.type === 'repository-completed' && event.reused) repositoriesReused += 1;
        progress.emit(event);
      },
    });
    return { result, repositoriesReused };
  } catch (error) {
    progress.failScan(options.scan.organization, error);
    throw error;
  }
}

function assertSafeReportDirectoryName(path, cwd) {
  const localPath = relative(resolve(cwd), path).split(sep).join('/');
  if (
    localPath === '.github/workflows'
    || localPath.startsWith('.github/workflows/')
    || localPath === '.github/actions'
    || localPath.startsWith('.github/actions/')
    || /(^|\/)action\.ya?ml(?:\/|$)/i.test(localPath)
  ) {
    throw new Error('--report-dir cannot use a workflow discovery path');
  }
}

function assertDirectoryDoesNotOverlapControls(directory, controls) {
  for (const control of controls) {
    if (!control.path) continue;
    const directoryPath = resolve(directory);
    const controlPath = resolve(control.path);
    const controlFromDirectory = relative(directoryPath, controlPath);
    const directoryFromControl = relative(controlPath, directoryPath);
    if (isInsideOrSame(controlFromDirectory) || isInsideOrSame(directoryFromControl)) {
      throw new Error(`--report-dir cannot overlap the ${control.label}`);
    }
  }
}

function isInsideOrSame(path) {
  return path === '' || (!isOutsidePath(path) && !isAbsolute(path));
}

function isOutsidePath(path) {
  return path === '..' || path.startsWith(`..${sep}`);
}
