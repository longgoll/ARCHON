import type { Rule } from 'eslint';

export const maxLinesRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce Archon file line limits (200 LOC general, 120 LOC main UI components) to prevent AI God-Files',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxFileLines: { type: 'number', default: 200 },
          maxComponentLines: { type: 'number', default: 120 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      fileLineExceeded:
        'Archon Guardian: File exceeds {{max}} lines (current: {{actual}}). Decompose this file by extracting helpers or modular sub-services.',
      componentLineExceeded:
        'Archon Guardian: Main UI component exceeds {{max}} lines (current: {{actual}}). Extract sub-views/child components into components/ folder or run archon fix.',
    },
  },
  create(context) {
    const options = context.options[0] || {};
    const maxFileLines = options.maxFileLines ?? 200;
    const maxComponentLines = options.maxComponentLines ?? 120;
    const filename = (context.filename || context.getFilename?.() || '').replace(/\\/g, '/');

    return {
      Program(node) {
        const sourceCode = context.sourceCode || context.getSourceCode();
        const lines = sourceCode.lines;
        const totalLines = lines.length;

        const isUIFile =
          (filename.endsWith('.tsx') || filename.endsWith('.jsx')) &&
          filename.includes('/ui/') &&
          !filename.includes('/ui/components/');

        if (isUIFile && totalLines > maxComponentLines) {
          context.report({
            node,
            messageId: 'componentLineExceeded',
            data: {
              max: String(maxComponentLines),
              actual: String(totalLines),
            },
          });
          return;
        }

        if (totalLines > maxFileLines) {
          context.report({
            node,
            messageId: 'fileLineExceeded',
            data: {
              max: String(maxFileLines),
              actual: String(totalLines),
            },
          });
        }
      },
    };
  },
};
