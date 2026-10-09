import type { Rule } from 'eslint';

export const noDeepModuleImportsRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow deep imports across modular monolith boundaries. Modules must only be imported via their public gateway (index.ts)',
      category: 'Architecture',
      recommended: true,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          clientModulesDir: { type: 'string', default: 'client/src/modules' },
          serverModulesDir: { type: 'string', default: 'server/src/modules' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      deepImportForbidden:
        "Archon Boundary Violation: Deep import into module '{{targetModule}}' is forbidden ('{{importPath}}'). Import via public gateway: '@/modules/{{targetModule}}'.",
    },
  },
  create(context) {
    const filename = (context.filename || context.getFilename?.() || '').replace(/\\/g, '/');

    // Extract current module name from current file path
    const moduleMatch = filename.match(/(?:client\/src\/modules|server\/src\/modules|src\/modules)\/([^/]+)\//);
    const currentModule = moduleMatch ? moduleMatch[1] : null;

    return {
      ImportDeclaration(node) {
        if (!node.source || typeof node.source.value !== 'string') return;
        const importPath = node.source.value;

        // 1. Check alias deep imports: '@/modules/<targetModule>/<deepPath>'
        const aliasMatch = importPath.match(/^(?:@\/modules|@modules|~\/modules)\/([^/]+)(\/.*)?$/);
        if (aliasMatch) {
          const targetModule = aliasMatch[1];
          const deepPath = aliasMatch[2];

          if (
            targetModule !== currentModule &&
            deepPath &&
            deepPath !== '/' &&
            deepPath !== '/index'
          ) {
            context.report({
              node,
              messageId: 'deepImportForbidden',
              data: {
                targetModule,
                importPath,
              },
              fix(fixer) {
                return fixer.replaceText(node.source, `'@/modules/${targetModule}'`);
              },
            });
          }
          return;
        }

        // 2. Check relative deep imports: '../../modules/<targetModule>/<deepPath>'
        const relativeMatch = importPath.match(/\.\.\/(?:\.\.\/)?modules\/([^/]+)(\/.*)?$/);
        if (relativeMatch) {
          const targetModule = relativeMatch[1];
          const deepPath = relativeMatch[2];

          if (
            targetModule !== currentModule &&
            deepPath &&
            deepPath !== '/' &&
            deepPath !== '/index'
          ) {
            context.report({
              node,
              messageId: 'deepImportForbidden',
              data: {
                targetModule,
                importPath,
              },
              fix(fixer) {
                return fixer.replaceText(node.source, `'@/modules/${targetModule}'`);
              },
            });
          }
        }
      },
    };
  },
};
