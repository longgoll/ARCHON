import fs from 'node:fs';
import path from 'node:path';
import { GuardianConfig } from '../config/schema.js';
import { Violation } from '../reporter/types.js';

export function checkDependencyFreeze(
  packageJsonPath: string,
  config: GuardianConfig
): Violation[] {
  const violations: Violation[] = [];
  if (!config.rules.dependencyFreeze.enabled) {
    return violations;
  }

  if (!fs.existsSync(packageJsonPath)) {
    return violations;
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const dependencies = Object.keys(pkg.dependencies || {});
    const allowed = new Set(config.rules.dependencyFreeze.allowedLibraries);

    for (const dep of dependencies) {
      if (!allowed.has(dep)) {
        violations.push({
          rule: 'dependency-freeze',
          file: packageJsonPath,
          message: `Package '${dep}' is installed but not included in allowedLibraries whitelist.`,
          remediation: `Add '${dep}' to guardian.config.json rules.dependencyFreeze.allowedLibraries or remove the package if unintended.`,
          severity: config.strictness === 'relaxed' ? 'warning' : 'error',
        });
      }
    }
  } catch {
    // Ignore JSON parse errors for non-standard package.json
  }

  return violations;
}
