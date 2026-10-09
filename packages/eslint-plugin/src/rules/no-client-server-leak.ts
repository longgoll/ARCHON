import type { Rule } from 'eslint';

export const noClientServerLeakRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow frontend client files from directly importing backend server code to prevent bundling server secrets and models',
      category: 'Security',
      recommended: true,
    },
    schema: [],
    messages: {
      clientServerLeak:
        "Archon Boundary Violation: Client file illegally imports server code: '{{importPath}}'. Communicate via HTTP fetch or API contract instead.",
    },
  },
  create(context) {
    const filename = (context.filename || context.getFilename?.() || '').replace(/\\/g, '/');
    const isClientFile = filename.includes('/client/') || filename.startsWith('client/');

    if (!isClientFile) return {};

    return {
      ImportDeclaration(node) {
        if (!node.source || typeof node.source.value !== 'string') return;
        const importPath = node.source.value;

        if (
          importPath.includes('/server/') ||
          importPath.startsWith('@server') ||
          importPath.startsWith('../../../server') ||
          importPath.startsWith('../../server')
        ) {
          context.report({
            node,
            messageId: 'clientServerLeak',
            data: {
              importPath,
            },
          });
        }
      },
    };
  },
};
