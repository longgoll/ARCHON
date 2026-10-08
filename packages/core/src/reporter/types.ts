export type ViolationRule = 'line-limit' | 'component-limit' | 'module-boundary' | 'dependency-freeze' | 'circular-dependency';

export interface Violation {
  rule: ViolationRule;
  file: string;
  line?: number;
  message: string;
  remediation: string;
  severity: 'error' | 'warning';
}

export interface LintReport {
  timestamp: string;
  filesScanned: number;
  violations: Violation[];
  hasErrors: boolean;
}
