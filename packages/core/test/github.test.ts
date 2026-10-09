import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateHealthScore,
  generatePrGuardianReport,
} from '../src/reporter/github.js';
import { LintReport } from '../src/reporter/types.js';
import { ContractDriftReport } from '@archon/skeleton';

describe('Archon PR Guardian & GitHub CI Reporter', () => {
  it('should calculate health score correctly with penalties', () => {
    assert.strictEqual(calculateHealthScore(0, 0), 100);
    // 2 boundary violations (10 pts) + 1 drift issue (8 pts) = 82
    assert.strictEqual(calculateHealthScore(2, 1), 82);
    // Large number of violations caps at 0
    assert.strictEqual(calculateHealthScore(30, 20), 0);
  });

  it('should generate markdown report and mark clean repo as ALL PASSED', () => {
    const mockLintReport: LintReport = {
      timestamp: new Date().toISOString(),
      filesScanned: 25,
      violations: [],
      hasErrors: false,
    };

    const mockDriftReport: ContractDriftReport = {
      timestamp: new Date().toISOString(),
      totalClientCalls: 10,
      totalServerRoutes: 10,
      issues: [],
      orphanRoutes: [],
      hasErrors: false,
    };

    const result = generatePrGuardianReport(mockLintReport, mockDriftReport);
    assert.strictEqual(result.hasErrors, false);
    assert.strictEqual(result.healthScore, 100);
    assert.ok(result.markdownSummary.includes('ALL ARCHITECTURAL GUARDRAILS PASSED'));
    assert.ok(result.markdownSummary.includes('100/100 (EXCELLENT)'));
  });

  it('should format violations table and contract drift in markdown when issues exist', () => {
    const mockLintReport: LintReport = {
      timestamp: new Date().toISOString(),
      filesScanned: 15,
      violations: [
        {
          rule: 'module-boundary',
          file: 'client/src/modules/order/ui/order-page.tsx',
          line: 5,
          message: "Deep import into module 'auth' is forbidden.",
          remediation: "Import from '@/modules/auth' instead.",
          severity: 'error',
        },
      ],
      hasErrors: true,
    };

    const mockDriftReport: ContractDriftReport = {
      timestamp: new Date().toISOString(),
      totalClientCalls: 5,
      totalServerRoutes: 5,
      issues: [
        {
          type: 'ENDPOINT_NOT_FOUND',
          file: 'client/src/modules/order/ui/order-page.tsx',
          line: 12,
          clientMethod: 'POST',
          clientPath: '/api/order/checkout-v2',
          message: "Client calls non-existent server endpoint: 'POST /api/order/checkout-v2'.",
          remediation: "Register '/api/order/checkout-v2' in server router.",
        },
      ],
      orphanRoutes: [],
      hasErrors: true,
    };

    const result = generatePrGuardianReport(mockLintReport, mockDriftReport);
    assert.strictEqual(result.hasErrors, true);
    assert.ok(result.healthScore < 100);
    assert.ok(result.markdownSummary.includes('Modular & Boundary Violations'));
    assert.ok(result.markdownSummary.includes('Fullstack Contract Drift (FE vs BE)'));
    assert.ok(result.markdownSummary.includes('/api/order/checkout-v2'));
  });
});
