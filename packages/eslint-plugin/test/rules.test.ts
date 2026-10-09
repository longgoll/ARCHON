import { describe, it } from 'node:test';
import { RuleTester } from 'eslint';
import { maxLinesRule } from '../src/rules/max-lines.js';
import { noDeepModuleImportsRule } from '../src/rules/no-deep-module-imports.js';
import { noClientServerLeakRule } from '../src/rules/no-client-server-leak.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('eslint-plugin-archon Rules', () => {
  it('max-lines rule should reject files exceeding max allowed lines', () => {
    ruleTester.run('max-lines', maxLinesRule, {
      valid: [
        {
          code: 'const a = 1;\nconst b = 2;\n',
          options: [{ maxFileLines: 5 }],
          filename: 'client/src/modules/billing/util.ts',
        },
      ],
      invalid: [
        {
          code: 'const a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\n',
          options: [{ maxFileLines: 3 }],
          filename: 'client/src/modules/billing/util.ts',
          errors: [{ messageId: 'fileLineExceeded' }],
        },
      ],
    });
  });

  it('no-deep-module-imports rule should disallow deep imports across modules and offer auto-fix', () => {
    ruleTester.run('no-deep-module-imports', noDeepModuleImportsRule, {
      valid: [
        {
          code: "import { verifySession } from '@/modules/auth';",
          filename: 'client/src/modules/billing/ui/billing-page.tsx',
        },
        {
          // Internal import within the same module is allowed
          code: "import { billingHelper } from '@/modules/billing/internal/helper';",
          filename: 'client/src/modules/billing/ui/billing-page.tsx',
        },
      ],
      invalid: [
        {
          code: "import { secretHelper } from '@/modules/auth/internal/secret';",
          filename: 'client/src/modules/billing/ui/billing-page.tsx',
          output: "import { secretHelper } from '@/modules/auth';",
          errors: [{ messageId: 'deepImportForbidden' }],
        },
      ],
    });
  });

  it('no-client-server-leak rule should reject client files importing server code', () => {
    ruleTester.run('no-client-server-leak', noClientServerLeakRule, {
      valid: [
        {
          code: "import { verifySession } from '@/modules/auth';",
          filename: 'client/src/modules/billing/ui/billing-page.tsx',
        },
        {
          // Server file importing server code is allowed
          code: "import { db } from '../../../server/db';",
          filename: 'server/src/modules/billing/billing.service.ts',
        },
      ],
      invalid: [
        {
          code: "import { db } from '../../../server/db';",
          filename: 'client/src/modules/billing/ui/billing-page.tsx',
          errors: [{ messageId: 'clientServerLeak' }],
        },
      ],
    });
  });
});
