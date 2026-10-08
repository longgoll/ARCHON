import pc from 'picocolors';
import { LintReport, Violation } from './types.js';

export function formatViolation(violation: Violation): string {
  const fileLoc = violation.line ? `${violation.file}:${violation.line}` : violation.file;
  const tag = violation.severity === 'error'
    ? pc.bold(pc.red('[VIOLATION]'))
    : pc.bold(pc.yellow('[WARNING]'));

  const remediationTag = pc.bold(pc.cyan('[REMEDIATION]'));

  return [
    `  ${tag} ${pc.bold(fileLoc)} (${violation.rule})`,
    `    ${violation.message}`,
    `  ${remediationTag} ${pc.italic(violation.remediation)}`,
  ].join('\n');
}

export function printLintReport(report: LintReport): void {
  console.log('');
  console.log(pc.bold(pc.blue('🛡️  ARCHON GUARDIAN REPORT')));
  console.log(pc.dim('─'.repeat(50)));

  if (report.violations.length === 0) {
    console.log(pc.green(`✔ All ${report.filesScanned} files comply with architectural boundaries.`));
    console.log('');
    return;
  }

  for (const v of report.violations) {
    console.log(formatViolation(v));
    console.log('');
  }

  const errors = report.violations.filter((v) => v.severity === 'error').length;
  const warnings = report.violations.filter((v) => v.severity === 'warning').length;

  console.log(pc.dim('─'.repeat(50)));
  if (errors > 0) {
    console.log(
      pc.bold(pc.red(`✖ Failed: Found ${errors} error(s) and ${warnings} warning(s) across ${report.filesScanned} files scanned.`))
    );
    console.log(pc.yellow('  AI Agent / Developer must apply the [REMEDIATION] steps above before proceeding.'));
  } else {
    console.log(
      pc.bold(pc.yellow(`⚠ Passed with warnings: ${warnings} warning(s) across ${report.filesScanned} files scanned.`))
    );
  }
  console.log('');
}
