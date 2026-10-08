import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { GuardianConfig } from './config/schema.js';
import { LintReport, Violation } from './reporter/types.js';
import { checkLineLimit } from './rules/line-limit.js';
import { checkModuleBoundaries } from './rules/boundary.js';
import { checkDependencyFreeze } from './rules/dependency.js';
import { checkCircularDependencies } from './rules/circular.js';

export interface RunLinterOptions {
  cwd?: string;
  config: GuardianConfig;
}

export async function runLinter(options: RunLinterOptions): Promise<LintReport> {
  const cwd = options.cwd || process.cwd();
  const config = options.config;
  const violations: Violation[] = [];
  const scannedFiles: { filePath: string; content: string }[] = [];

  // 1. Scan source code files
  const filePatterns = [
    'client/src/**/*.{ts,tsx,js,jsx}',
    'server/src/**/*.{ts,js}',
    'src/**/*.{ts,tsx,js,jsx}',
  ];

  const files = await fg(filePatterns, {
    cwd,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.context/**', '**/*.d.ts'],
    absolute: false,
  });

  for (const relFile of files) {
    const absPath = path.resolve(cwd, relFile);
    try {
      const content = fs.readFileSync(absPath, 'utf-8');
      scannedFiles.push({ filePath: relFile, content });

      // Check Line limits
      const lineViolation = checkLineLimit(relFile, content, config);
      if (lineViolation) {
        violations.push(lineViolation);
      }

      // Check Module boundaries
      const boundaryViolations = checkModuleBoundaries(relFile, content, config);
      violations.push(...boundaryViolations);
    } catch {
      // Continue on file read error
    }
  }

  // 2. Check Circular Dependencies between Modules
  const circularViolations = checkCircularDependencies(scannedFiles, config);
  violations.push(...circularViolations);

  // 3. Check Package manifests if dependency freeze is enabled
  if (config.rules.dependencyFreeze.enabled) {
    const pkgPaths = ['package.json', 'client/package.json', 'server/package.json'];
    for (const pkgRel of pkgPaths) {
      const absPkg = path.resolve(cwd, pkgRel);
      if (fs.existsSync(absPkg)) {
        const depViolations = checkDependencyFreeze(pkgRel, config);
        violations.push(...depViolations);
      }
    }
  }

  const hasErrors = violations.some((v) => v.severity === 'error');

  return {
    timestamp: new Date().toISOString(),
    filesScanned: files.length,
    violations,
    hasErrors,
  };
}
