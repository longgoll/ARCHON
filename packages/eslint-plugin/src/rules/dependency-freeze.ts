import type { Rule } from 'eslint';

export const dependencyFreezeRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow importing npm packages that are not whitelisted in Archon dependency freeze configuration',
      category: 'Dependencies',
      recommended: false,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedLibraries: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      forbiddenDependency:
        "Archon Dependency Freeze: '{{pkg}}' is not in the allowed dependencies whitelist. AI Agents must not introduce new external libraries without developer approval.",
    },
  },
  create(context) {
    const options = context.options[0] || {};
    const allowed = new Set<string>(options.allowedLibraries || []);

    if (allowed.size === 0) return {};

    return {
      ImportDeclaration(node) {
        if (!node.source || typeof node.source.value !== 'string') return;
        const importPath = node.source.value;

        // Skip relative and alias imports
        if (
          importPath.startsWith('.') ||
          importPath.startsWith('/') ||
          importPath.startsWith('@/') ||
          importPath.startsWith('~/') ||
          importPath.startsWith('node:')
        ) {
          return;
        }

        // Extract package name (handles scoped packages e.g. @modelcontextprotocol/sdk)
        const parts = importPath.split('/');
        const pkgName = importPath.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];

        if (!allowed.has(pkgName)) {
          context.report({
            node,
            messageId: 'forbiddenDependency',
            data: {
              pkg: pkgName,
            },
          });
        }
      },
    };
  },
};
