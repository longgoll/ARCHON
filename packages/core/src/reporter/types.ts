export type ViolationRule = 'line-limit' | 'component-limit' | 'module-boundary' | 'dependency-freeze' | 'circular-dependency';

export interface PatchSuggestion {
  type: 'replace-import' | 'remove-import' | 'decompose' | 'contract-fix' | 'other';
  line?: number;
  originalText?: string;
  suggestedText?: string;
  action: string;
  details?: Record<string, any>;
}

export interface Violation {
  rule: ViolationRule;
  file: string;
  line?: number;
  message: string;
  remediation: string;
  severity: 'error' | 'warning';
  patch?: PatchSuggestion;
}

export interface LintReport {
  timestamp: string;
  filesScanned: number;
  violations: Violation[];
  hasErrors: boolean;
}

