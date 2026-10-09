import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLineLimit } from '../src/rules/line-limit.js';
import { checkModuleBoundaries } from '../src/rules/boundary.js';
import { checkCircularDependencies } from '../src/rules/circular.js';
import { decomposeFile } from '../src/decomposer/index.js';
import { DEFAULT_CONFIG } from '../src/config/loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Guardian Core Linter Rules', () => {
  it('should detect file exceeding maxFileLines limit', () => {
    const longContent = Array(250).fill('const x = 1;').join('\n');
    const violation = checkLineLimit('client/src/modules/order/services/order.service.ts', longContent, DEFAULT_CONFIG);

    assert.notStrictEqual(violation, null);
    assert.strictEqual(violation?.rule, 'line-limit');
    assert.strictEqual(violation?.severity, 'error');
    assert.match(violation?.remediation || '', /Decompose/);
  });

  it('should detect main UI component exceeding maxComponentLines limit', () => {
    const componentContent = Array(135).fill('export function OrderPage() { return <div>Order</div>; }').join('\n');
    const violation = checkLineLimit('client/src/modules/order/ui/order-page.tsx', componentContent, DEFAULT_CONFIG);

    assert.notStrictEqual(violation, null);
    assert.strictEqual(violation?.rule, 'component-limit');
    assert.match(violation?.remediation || '', /Extract sub-views\/child components/);
  });

  it('should detect cross-module deep import violation', () => {
    const deepImportCode = `
      import React from 'react';
      import { LoginForm } from '@/modules/auth/ui/login-form';
      export function Dashboard() { return <LoginForm />; }
    `;
    const violations = checkModuleBoundaries(
      'client/src/modules/dashboard/ui/dashboard-page.tsx',
      deepImportCode,
      DEFAULT_CONFIG
    );

    assert.strictEqual(violations.length, 1);
    assert.strictEqual(violations[0].rule, 'module-boundary');
    assert.match(violations[0].message, /Deep import into module 'auth' is forbidden/);
    assert.match(violations[0].remediation, /Export 'login-form' through '@\/modules\/auth\/index\.ts'/);
  });

  it('should allow valid import through module gateway index.ts', () => {
    const validImportCode = `
      import React from 'react';
      import { useAuth } from '@/modules/auth';
      export function Dashboard() { const a = useAuth(); return <div>Dashboard</div>; }
    `;
    const violations = checkModuleBoundaries(
      'client/src/modules/dashboard/ui/dashboard-page.tsx',
      validImportCode,
      DEFAULT_CONFIG
    );

    assert.strictEqual(violations.length, 0);
  });

  it('should detect illegal client -> server direct import leak', () => {
    const leakCode = `
      import { db } from '../../../server/src/shared/db';
      export function UserList() { return <div>Users</div>; }
    `;
    const violations = checkModuleBoundaries(
      'client/src/modules/user/ui/user-list.tsx',
      leakCode,
      DEFAULT_CONFIG
    );

    assert.strictEqual(violations.length, 1);
    assert.strictEqual(violations[0].rule, 'module-boundary');
    assert.match(violations[0].message, /Client file illegally imports from server/);
  });

  it('should detect circular module dependency (Module A -> Module B -> Module A)', () => {
    const orderModuleFile = {
      filePath: 'client/src/modules/order/ui/order-page.tsx',
      content: `import { calculateBilling } from '@/modules/billing';`,
    };
    const billingModuleFile = {
      filePath: 'client/src/modules/billing/services/billing.service.ts',
      content: `import { getOrderSummary } from '@/modules/order';`,
    };

    const violations = checkCircularDependencies(
      [orderModuleFile, billingModuleFile],
      DEFAULT_CONFIG
    );

    assert.strictEqual(violations.length, 1);
    assert.strictEqual(violations[0].rule, 'circular-dependency');
    assert.strictEqual(violations[0].severity, 'error');
    assert.match(violations[0].message, /Circular module dependency detected on client: order ➔ billing ➔ order/);
    assert.match(violations[0].remediation, /Break the cycle by extracting shared contracts\/types/);
  });

  it('should pass when dependencies are acyclic (A -> B, but B does not import A)', () => {
    const orderModuleFile = {
      filePath: 'client/src/modules/order/ui/order-page.tsx',
      content: `import { calculateBilling } from '@/modules/billing';`,
    };
    const billingModuleFile = {
      filePath: 'client/src/modules/billing/services/billing.service.ts',
      content: `import { formatDate } from '@/modules/common';`,
    };

    const violations = checkCircularDependencies(
      [orderModuleFile, billingModuleFile],
      DEFAULT_CONFIG
    );

    assert.strictEqual(violations.length, 0);
  });

  it('should detect circular module dependency with custom configured module directories', () => {
    const customConfig = {
      ...DEFAULT_CONFIG,
      rules: {
        ...DEFAULT_CONFIG.rules,
        moduleBoundary: {
          clientModulesDir: 'src/features',
          serverModulesDir: 'api/features',
          gatewayFile: 'index.ts',
          allowDeepImports: false,
        },
      },
    };

    const cartFile = {
      filePath: 'src/features/cart/ui/cart.tsx',
      content: `import { checkout } from '@/modules/checkout';`,
    };
    const checkoutFile = {
      filePath: 'src/features/checkout/services/checkout.ts',
      content: `import { getCart } from '@/modules/cart';`,
    };

    const violations = checkCircularDependencies(
      [cartFile, checkoutFile],
      customConfig
    );

    assert.strictEqual(violations.length, 1);
    assert.strictEqual(violations[0].rule, 'circular-dependency');
    assert.match(violations[0].message, /cart ➔ checkout ➔ cart/);
  });

  it('should decompose bloated React component by extracting sub-component and hook', () => {
    const tempDir = path.resolve(__dirname, 'temp-decomposer');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const targetFile = path.resolve(tempDir, 'OrderDashboard.tsx');
    const bloatedContent = `
import React, { useState } from 'react';

function useOrderFilter() {
  const [filter, setFilter] = useState('');
  return { filter, setFilter };
}

function OrderSummaryTable() {
  return <table><tbody><tr><td>Total</td></tr></tbody></table>;
}

export function OrderDashboard() {
  const { filter } = useOrderFilter();
  return (
    <div>
      <h1>Dashboard: {filter}</h1>
      <OrderSummaryTable />
    </div>
  );
}
`;

    fs.writeFileSync(targetFile, bloatedContent, 'utf-8');

    try {
      const result = decomposeFile(targetFile);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.extractedFiles.length, 2);

      const tableComp = result.extractedFiles.find((f) => f.symbolName === 'OrderSummaryTable');
      assert.ok(tableComp);
      assert.strictEqual(tableComp.kind, 'component');

      const filterHook = result.extractedFiles.find((f) => f.symbolName === 'useOrderFilter');
      assert.ok(filterHook);
      assert.strictEqual(filterHook.kind, 'hook');

      // Verify original file imports the extracted parts
      const updatedOriginal = fs.readFileSync(targetFile, 'utf-8');
      assert.ok(updatedOriginal.includes("import { OrderSummaryTable } from './components/OrderSummaryTable.js'"));
      assert.ok(updatedOriginal.includes("import { useOrderFilter } from './hooks/useOrderFilter.js'"));
      // Verify declaration is removed from main file
      assert.ok(!updatedOriginal.includes('function OrderSummaryTable()'));
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });
});
