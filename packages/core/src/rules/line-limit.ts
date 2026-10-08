import path from 'node:path';
import { GuardianConfig } from '../config/schema.js';
import { Violation } from '../reporter/types.js';

export function checkLineLimit(
  filePath: string,
  content: string,
  config: GuardianConfig
): Violation | null {
  const lines = content.split('\n');
  const count = config.rules.ignoreBlankLines
    ? lines.filter((l) => l.trim().length > 0).length
    : lines.length;

  const normalizedPath = filePath.replace(/\\/g, '/');
  const isUIFile = normalizedPath.includes('/ui/') && (filePath.endsWith('.tsx') || filePath.endsWith('.jsx'));
  const severity = config.strictness === 'relaxed' ? 'warning' : 'error';

  // Check specific UI Component limit
  if (isUIFile && !normalizedPath.includes('/ui/components/') && count > config.rules.maxComponentLines) {
    const fileName = path.basename(filePath, path.extname(filePath));
    const suggestedDir = path.dirname(filePath) + '/components';
    return {
      rule: 'component-limit',
      file: filePath,
      message: `Main UI Component file has ${count} lines (threshold: ${config.rules.maxComponentLines}).`,
      remediation: `Extract sub-views/child components into separate files under '${suggestedDir}/${fileName}-section.tsx'.`,
      severity,
    };
  }

  // Check general file limit
  if (count > config.rules.maxFileLines) {
    const fileName = path.basename(filePath);
    return {
      rule: 'line-limit',
      file: filePath,
      message: `File exceeds maximum allowed lines: ${count} lines (threshold: ${config.rules.maxFileLines}).`,
      remediation: `Decompose '${fileName}' by extracting helpers, sub-services, or splitting responsibilities into smaller files under 200 lines.`,
      severity,
    };
  }

  return null;
}
