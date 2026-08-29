/**
 * Decide whether the JavaScript Action step should fail. Findings can be
 * advisory, but parse and resolution errors are always operational failures.
 */
export function shouldFailAction({ command, result, failOnFindings }) {
  if (result.status !== 'FAIL') return false;
  if (!['audit', 'report', 'org-scan'].includes(command)) return true;
  if (hasOperationalFailure(command, result)) return true;
  return failOnFindings;
}

function hasOperationalFailure(command, result) {
  if (command === 'audit') {
    return result.findings.some(finding => finding.ruleId === 'parse-error');
  }
  if (command === 'org-scan') {
    return (
      result.errors.length > 0
      || result.findings.some(finding => finding.ruleId === 'parse-error')
    );
  }
  return (
    result.audit.findings.some(finding => finding.ruleId === 'parse-error')
    || result.pin.errors.length > 0
    || result.upgrade.errors.length > 0
  );
}
