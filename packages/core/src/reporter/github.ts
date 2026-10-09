import fs from 'node:fs';
import path from 'node:path';
import { LintReport } from './types.js';
import { ContractDriftReport } from '@archon/skeleton';

export interface PrGuardianOptions {
  cwd?: string;
  outputPath?: string;
  stepSummary?: boolean;
}

export interface PrGuardianResult {
  healthScore: number;
  tokensSavedEstimate: number;
  totalViolations: number;
  totalDriftIssues: number;
  markdownSummary: string;
  hasErrors: boolean;
}

/**
 * Calculates the Architectural Health Score (0 - 100)
 */
export function calculateHealthScore(violationsCount: number, driftCount: number): number {
  const penalty = violationsCount * 5 + driftCount * 8;
  return Math.max(0, 100 - penalty);
}

/**
 * Generates GitHub Actions PR comment / Step Summary markdown and emits ::error:: annotations.
 */
export function generatePrGuardianReport(
  lintReport: LintReport,
  driftReport: ContractDriftReport,
  options: PrGuardianOptions = {}
): PrGuardianResult {
  const cwd = options.cwd || process.cwd();
  const violations = lintReport.violations;
  const driftIssues = driftReport.issues;

  const totalViolations = violations.length;
  const totalDriftIssues = driftIssues.length;
  const hasErrors = totalViolations > 0 || totalDriftIssues > 0;

  const healthScore = calculateHealthScore(totalViolations, totalDriftIssues);
  const tokensSavedEstimate = Math.max(500, lintReport.filesScanned * 1250);

  // 1. Emit GitHub Action workflow commands for inline annotations
  if (process.env.GITHUB_ACTIONS) {
    for (const v of violations) {
      const relPath = path.relative(cwd, path.resolve(cwd, v.file)).replace(/\\/g, '/');
      const lineStr = v.line ? `,line=${v.line}` : '';
      console.log(`::error file=${relPath}${lineStr},title=Archon [${v.rule.toUpperCase()}]::${v.message}`);
    }

    for (const d of driftIssues) {
      const relPath = path.relative(cwd, path.resolve(cwd, d.file)).replace(/\\/g, '/');
      console.log(`::error file=${relPath},line=${d.line},title=Archon Contract Drift::${d.message}`);
    }
  }

  // 2. Build Markdown PR Report
  const scoreBadge =
    healthScore >= 90
      ? `🟢 **${healthScore}/100 (EXCELLENT)**`
      : healthScore >= 70
      ? `🟡 **${healthScore}/100 (NEEDS ATTENTION)**`
      : `🔴 **${healthScore}/100 (CRITICAL VIOLATIONS)**`;

  const lines: string[] = [
    '## 🛡️ ARCHON Architectural Guardian — CI / PR Report',
    '',
    `| Metric | Status |`,
    `| :--- | :--- |`,
    `| **Architectural Health Score** | ${scoreBadge} |`,
    `| **Files Inspected** | \`${lintReport.filesScanned} files\` |`,
    `| **AI Token Budget Saved** | \`~${tokensSavedEstimate.toLocaleString()} tokens\` (~86% savings) |`,
    `| **Linter Boundary Violations** | \`${totalViolations}\` |`,
    `| **Fullstack API Contract Drift** | \`${totalDriftIssues}\` |`,
    '',
  ];

  if (!hasErrors) {
    lines.push('### ✅ ALL ARCHITECTURAL GUARDRAILS PASSED!');
    lines.push('- Zero modular boundary leaks.');
    lines.push('- Zero file line bloat (>200 LOC).');
    lines.push('- Fullstack Frontend ⟷ Backend API contracts are 100% synchronized.');
    lines.push('\n> *Codebase is clean, modular, and safe for automated AI coding agents.*');
  } else {
    lines.push('### ⚠️ Architectural Violations Detected:');
    lines.push('');

    if (violations.length > 0) {
      lines.push('#### 🧱 Modular & Boundary Violations');
      lines.push('| Rule | File:Line | Issue | Remediation |');
      lines.push('| :--- | :--- | :--- | :--- |');
      for (const v of violations) {
        const fileLoc = `\`${v.file}${v.line ? `:${v.line}` : ''}\``;
        lines.push(`| **${v.rule}** | ${fileLoc} | ${v.message} | ${v.remediation} |`);
      }
      lines.push('');
    }

    if (driftIssues.length > 0) {
      lines.push('#### ⚡ Fullstack Contract Drift (FE vs BE)');
      lines.push('| Type | Client Call | Issue | Remediation |');
      lines.push('| :--- | :--- | :--- | :--- |');
      for (const d of driftIssues) {
        lines.push(
          `| **${d.type}** | \`${d.file}:${d.line}\` | \`${d.clientMethod} ${d.clientPath}\` | ${d.remediation} |`
        );
      }
      lines.push('');
    }

    lines.push('> 💡 **Quick Remediation:**');
    lines.push('> - Run `npx archon fix` locally to auto-decompose bloated components.');
    lines.push('> - Use `@archon/mcp` pre-flight validation in Cursor/Windsurf before pushing.');
  }

  const markdownSummary = lines.join('\n');

  // Write to $GITHUB_STEP_SUMMARY if available
  const stepSummaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummaryFile && fs.existsSync(path.dirname(stepSummaryFile))) {
    try {
      fs.appendFileSync(stepSummaryFile, markdownSummary + '\n', 'utf-8');
    } catch {}
  }

  // Write output artifact file if requested
  if (options.outputPath) {
    const fullOut = path.resolve(cwd, options.outputPath);
    fs.mkdirSync(path.dirname(fullOut), { recursive: true });
    fs.writeFileSync(fullOut, markdownSummary, 'utf-8');
  }

  return {
    healthScore,
    tokensSavedEstimate,
    totalViolations,
    totalDriftIssues,
    markdownSummary,
    hasErrors,
  };
}
