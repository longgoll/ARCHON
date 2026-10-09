import { maxLinesRule } from './rules/max-lines.js';
import { noDeepModuleImportsRule } from './rules/no-deep-module-imports.js';
import { noClientServerLeakRule } from './rules/no-client-server-leak.js';
import { dependencyFreezeRule } from './rules/dependency-freeze.js';

const rules = {
  'max-lines': maxLinesRule,
  'no-deep-module-imports': noDeepModuleImportsRule,
  'no-client-server-leak': noClientServerLeakRule,
  'dependency-freeze': dependencyFreezeRule,
};

const plugin = {
  meta: {
    name: 'eslint-plugin-archon',
    version: '0.1.0',
  },
  rules,
  configs: {
    // Legacy ESLint config (.eslintrc)
    recommended: {
      plugins: ['archon'],
      rules: {
        'archon/max-lines': ['error', { maxFileLines: 200, maxComponentLines: 120 }],
        'archon/no-deep-module-imports': 'error',
        'archon/no-client-server-leak': 'error',
      },
    },
    // ESLint 9 Flat Config (eslint.config.js)
    'flat/recommended': {
      plugins: {
        get archon() {
          return plugin;
        },
      },
      rules: {
        'archon/max-lines': ['error', { maxFileLines: 200, maxComponentLines: 120 }],
        'archon/no-deep-module-imports': 'error',
        'archon/no-client-server-leak': 'error',
      },
    },
  },
};

export default plugin;
export { rules };
