import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import path from 'node:path';
import fs from 'node:fs';
import {
  loadGuardianConfig,
  runLinter,
  checkLineLimit,
  checkModuleBoundaries,
  decomposeFile,
  GuardianConfig,
} from '@archon/core';
import {
  generateProjectSkeleton,
  generateContextMapMarkdown,
  checkContractDrift,
  ProjectSkeleton,
  ModuleSkeleton,
} from '@archon/skeleton';

export interface ArchonMcpServerOptions {
  cwd?: string;
  name?: string;
  version?: string;
}

export function createArchonMcpServer(options: ArchonMcpServerOptions = {}): McpServer {
  const cwd = options.cwd || process.cwd();
  const name = options.name || 'archon-mcp';
  const version = options.version || '0.1.0';

  const server = new McpServer({
    name,
    version,
  });

  // Cached project skeleton to keep queries blazing fast
  let cachedSkeleton: ProjectSkeleton | null = null;
  let lastSkeletonTime = 0;

  async function getOrUpdateSkeleton(force = false): Promise<ProjectSkeleton> {
    const now = Date.now();
    if (!cachedSkeleton || force || now - lastSkeletonTime > 5000) {
      cachedSkeleton = await generateProjectSkeleton({ cwd });
      lastSkeletonTime = now;
    }
    return cachedSkeleton;
  }

  // ==========================================
  // TOOL 1: archon_query_context
  // ==========================================
  server.tool(
    'archon_query_context',
    'Search existing modules, exported functions, UI components, types, and API routes in the Archon architectural skeleton. ALWAYS call this tool BEFORE writing new functions or utilities to avoid code duplication and token bloat.',
    {
      query: z
        .string()
        .describe("Search term or function name/purpose (e.g. 'auth', 'order', 'formatVND', 'login')"),
      side: z
        .enum(['client', 'server', 'all'])
        .optional()
        .default('all')
        .describe("Filter by 'client', 'server', or 'all'"),
      kind: z
        .enum(['function', 'component', 'interface', 'type', 'variable', 'reexport', 'all'])
        .optional()
        .default('all')
        .describe('Filter by symbol kind (function, component, type, etc.)'),
    },
    async ({ query, side, kind }) => {
      const skeleton = await getOrUpdateSkeleton();
      const q = query.trim().toLowerCase();

      interface MatchItem {
        module: string;
        side: string;
        gateway: string;
        symbol: {
          name: string;
          kind: string;
          signature?: string;
          description?: string;
        };
      }

      const matches: MatchItem[] = [];

      for (const mod of skeleton.modules) {
        if (side !== 'all' && mod.side !== side) continue;

        for (const exp of mod.exports) {
          if (kind !== 'all' && exp.kind !== kind) continue;

          const nameMatch = exp.name.toLowerCase().includes(q);
          const descMatch = exp.description?.toLowerCase().includes(q);
          const sigMatch = exp.signature?.toLowerCase().includes(q);
          const modMatch = mod.moduleName.toLowerCase().includes(q);

          if (nameMatch || descMatch || sigMatch || modMatch) {
            matches.push({
              module: mod.moduleName,
              side: mod.side,
              gateway: mod.gatewayPath,
              symbol: exp,
            });
          }
        }
      }

      if (matches.length === 0) {
        const availableModules = skeleton.modules
          .map((m) => `- \`@/modules/${m.moduleName}\` (${m.side}, ${m.exports.length} exports)`)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `ℹ️ No existing symbols found matching "${query}".\n\nAvailable modules in codebase:\n${
                availableModules || 'No modules indexed yet.'
              }\n\nTip: You can implement a new function, but ensure you export it from the module's public gateway (\`index.ts\`) with JSDoc comments.`,
            },
          ],
        };
      }

      const outputLines: string[] = [
        `### 🎯 Archon Context Search: Found ${matches.length} match(es) for "${query}"\n`,
        '> 💡 **MANDATE:** Reuse existing functions below. Import across modules ONLY via `@/modules/[moduleName]`.\n',
      ];

      for (const m of matches) {
        outputLines.push(`#### 📦 \`@/modules/${m.module}\` (${m.side})`);
        outputLines.push(`- **Symbol:** \`${m.symbol.name}\` (${m.symbol.kind})`);
        if (m.symbol.signature) {
          outputLines.push(`- **Signature:** \`${m.symbol.name}${m.symbol.signature}\``);
        }
        if (m.symbol.description) {
          outputLines.push(`- **Description:** *${m.symbol.description}*`);
        }
        outputLines.push(`- **Import Statement:** \`import { ${m.symbol.name} } from '@/modules/${m.module}';\``);
        outputLines.push('');
      }

      return {
        content: [
          {
            type: 'text',
            text: outputLines.join('\n'),
          },
        ],
      };
    }
  );

  // ==========================================
  // TOOL 2: archon_validate_proposal
  // ==========================================
  server.tool(
    'archon_validate_proposal',
    'Pre-flight validation of proposed code BEFORE writing to disk. Checks line limits (e.g. 200 LOC max), module boundary rules (bans deep imports across modules), and dependency whitelist.',
    {
      filePath: z
        .string()
        .describe("Target relative file path (e.g. 'client/src/modules/order/ui/order-page.tsx')"),
      content: z
        .string()
        .describe('The complete proposed source code content to validate'),
    },
    async ({ filePath, content }) => {
      const config = loadGuardianConfig(cwd);
      const normalizedPath = filePath.replace(/\\/g, '/');
      const lines = content.split('\n');
      const lineCount = lines.length;

      const violations: any[] = [];

      // 1. Line Limit Check
      const lineViolation = checkLineLimit(normalizedPath, content, config);
      if (lineViolation) {
        violations.push(lineViolation);
      }

      // 2. Boundary Check
      const boundaryViolations = checkModuleBoundaries(normalizedPath, content, config);
      violations.push(...boundaryViolations);

      const isValid = violations.length === 0;

      if (isValid) {
        return {
          content: [
            {
              type: 'text',
              text: `✅ [PASS] Architectural Proposal Validated Successfully!\n` +
                `- File: \`${normalizedPath}\`\n` +
                `- Line Count: ${lineCount} / ${config.rules.maxFileLines} max LOC\n` +
                `- Boundaries: Compliant with Modular Monolith rules.\n` +
                `- Status: You may proceed to write this file to disk safely.`,
            },
          ],
        };
      }

      const patches = violations
        .filter((v) => v.patch)
        .map((v) => ({
          rule: v.rule,
          line: v.line,
          ...v.patch,
        }));

      const reportLines = [
        `❌ [REJECTED] Architectural Violations Found (${violations.length} issue(s)):\n`,
        `- File: \`${normalizedPath}\` (${lineCount} lines, max allowed: ${config.rules.maxFileLines})\n`,
      ];

      for (const v of violations) {
        reportLines.push(`### [${v.rule.toUpperCase()}] ${v.message}`);
        if (v.line) reportLines.push(`- **Location:** Line ${v.line}`);
        reportLines.push(`- **Remediation:** 🛠️ ${v.remediation}`);
        if (v.patch) {
          reportLines.push(`- **Machine Patch Action:** \`${v.patch.action}\``);
          if (v.patch.suggestedText) {
            reportLines.push(`- **Suggested Replacement:** \`${v.patch.suggestedText}\``);
          }
        }
        reportLines.push('');
      }

      if (patches.length > 0) {
        reportLines.push('```json archon-machine-patches');
        reportLines.push(
          JSON.stringify(
            {
              status: 'REJECTED',
              targetFile: normalizedPath,
              violationsCount: violations.length,
              patches,
            },
            null,
            2
          )
        );
        reportLines.push('```\n');
      }

      reportLines.push('⚠️ **ACTION REQUIRED:** Please apply the machine-readable patches or refactor the code according to the remediations above BEFORE saving.');

      return {
        content: [
          {
            type: 'text',
            text: reportLines.join('\n'),
          },
        ],
      };
    }
  );

  // ==========================================
  // TOOL 3: archon_get_module_contract
  // ==========================================
  server.tool(
    'archon_get_module_contract',
    'Get the complete public API contract, exported functions, UI components, types, and internal file list for a specific module.',
    {
      moduleName: z
        .string()
        .describe("The name of the module (e.g. 'auth', 'product', 'order')"),
      side: z
        .enum(['client', 'server', 'both'])
        .optional()
        .default('both')
        .describe("Module side: 'client', 'server', or 'both'"),
    },
    async ({ moduleName, side }) => {
      const skeleton = await getOrUpdateSkeleton();
      const targetName = moduleName.toLowerCase();

      const matchingModules = skeleton.modules.filter((m) => {
        const nameMatches = m.moduleName.toLowerCase() === targetName;
        if (!nameMatches) return false;
        if (side === 'both') return true;
        return m.side === side;
      });

      if (matchingModules.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Module "${moduleName}" not found in current architecture map.`,
            },
          ],
        };
      }

      const outputLines: string[] = [];

      for (const mod of matchingModules) {
        outputLines.push(`## 📦 Module Contract: \`@/modules/${mod.moduleName}\` (${mod.side.toUpperCase()})`);
        outputLines.push(`- **Public Gateway:** \`${mod.gatewayPath}\``);
        outputLines.push(`- **Public Exports (${mod.exports.length}):**`);

        if (mod.exports.length === 0) {
          outputLines.push('  *(No public exports yet in index.ts)*');
        } else {
          for (const exp of mod.exports) {
            outputLines.push(`  - \`${exp.kind}\` **${exp.name}**\`${exp.signature || ''}\``);
            if (exp.description) {
              outputLines.push(`    > *${exp.description}*`);
            }
          }
        }

        if (mod.internalFiles.length > 0) {
          outputLines.push(`\n- **Internal Private Files (${mod.internalFiles.length}):**`);
          for (const file of mod.internalFiles) {
            outputLines.push(`  - \`${file}\``);
          }
        }
        outputLines.push('\n---\n');
      }

      return {
        content: [
          {
            type: 'text',
            text: outputLines.join('\n'),
          },
        ],
      };
    }
  );

  // ==========================================
  // TOOL 4: archon_lint_project
  // ==========================================
  server.tool(
    'archon_lint_project',
    'Run the full Archon architectural linter across all project files to detect file bloat (>200 LOC), illegal deep imports, or unapproved dependencies.',
    {},
    async () => {
      const config = loadGuardianConfig(cwd);
      const report = await runLinter({ cwd, config });

      if (!report.hasErrors && report.violations.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `🛡️ [ARCHON LINT PASSED]\n- Scanned ${report.filesScanned} files.\n- Violations: 0\nCodebase architecture is in pristine state!`,
            },
          ],
        };
      }

      const lines = [
        `🛡️ [ARCHON LINT REPORT] - ${report.violations.length} violation(s) found in ${report.filesScanned} scanned files:\n`,
      ];

      for (const v of report.violations) {
        lines.push(`- [${v.severity.toUpperCase()}] **${v.rule}** in \`${v.file}\`${v.line ? `:${v.line}` : ''}`);
        lines.push(`  Message: ${v.message}`);
        lines.push(`  Remediation: ${v.remediation}\n`);
      }

      return {
        content: [
          {
            type: 'text',
            text: lines.join('\n'),
          },
        ],
      };
    }
  );

  // ==========================================
  // TOOL 5: archon_get_architecture_map
  // ==========================================
  server.tool(
    'archon_get_architecture_map',
    'Get high-level summary overview of the entire project architecture: module distribution, public gateways, and indexed symbol statistics.',
    {},
    async () => {
      const skeleton = await getOrUpdateSkeleton();
      const mapMarkdown = generateContextMapMarkdown(skeleton);

      return {
        content: [
          {
            type: 'text',
            text: mapMarkdown,
          },
        ],
      };
    }
  );

  // ==========================================
  // TOOL 6: archon_auto_decompose
  // ==========================================
  server.tool(
    'archon_auto_decompose',
    'Automatically decompose an oversized React component (>120 LOC) or file (>200 LOC) by extracting internal sub-components into components/ and custom hooks into hooks/. Keeps functionality intact and writes modular files.',
    {
      filePath: z
        .string()
        .describe("Target relative file path (e.g. 'client/src/modules/order/ui/order-page.tsx')"),
    },
    async ({ filePath }) => {
      const fullPath = path.resolve(cwd, filePath);
      const res = decomposeFile(fullPath);

      if (!res.success) {
        return {
          content: [
            {
              type: 'text',
              text: `⚠️ [AUTO-DECOMPOSE SKIPPED]: ${res.message}`,
            },
          ],
        };
      }

      const reportLines = [
        `🎉 [AUTO-DECOMPOSE SUCCESS]!`,
        `- Target File: \`${filePath}\``,
        `- Line Reduction: ${res.originalLines} LOC ➔ ${res.newLines} LOC`,
        `\nExtracted Modular Files:`,
      ];

      for (const ext of res.extractedFiles) {
        reportLines.push(`- 📦 [${ext.kind.toUpperCase()}] \`${ext.filePath}\` (${ext.lines} lines)`);
      }

      return {
        content: [
          {
            type: 'text',
            text: reportLines.join('\n'),
          },
        ],
      };
    }
  );

  // ==========================================
  // TOOL 7: archon_check_contract_drift
  // ==========================================
  server.tool(
    'archon_check_contract_drift',
    'Detect contract drift between Frontend API calls (fetch/axios) and Backend Express route endpoints. Flags unknown endpoints, mismatched HTTP methods, and orphaned server routes.',
    {
      clientDir: z
        .string()
        .optional()
        .default('client/src')
        .describe("Relative path to client source files (defaults to 'client/src')"),
      serverDir: z
        .string()
        .optional()
        .default('server/src')
        .describe("Relative path to server source files (defaults to 'server/src')"),
    },
    async ({ clientDir, serverDir }) => {
      const report = await checkContractDrift({
        cwd,
        clientDir,
        serverDir,
      });

      if (!report.hasErrors) {
        return {
          content: [
            {
              type: 'text',
              text: `✅ [PASS] Fullstack API Contracts Synchronized!\n` +
                `- Total Client API Calls Scanned: ${report.totalClientCalls}\n` +
                `- Total Server Routes Registered: ${report.totalServerRoutes}\n` +
                `- Orphan Routes (uncalled by client): ${report.orphanRoutes.length}\n` +
                `- Status: 100% Contract Compliance. Zero drift detected.`,
            },
          ],
        };
      }

      const reportLines = [
        `❌ [CONTRACT DRIFT DETECTED] Found ${report.issues.length} API Mismatch Issue(s):\n`,
        `- Client Directory: \`${clientDir}\`\n`,
        `- Server Directory: \`${serverDir}\`\n`,
      ];

      for (const issue of report.issues) {
        reportLines.push(`### [${issue.type}] ${issue.message}`);
        reportLines.push(`- **Location:** \`${issue.file}:${issue.line}\``);
        reportLines.push(`- **Remediation:** 🛠️ ${issue.remediation}\n`);
      }

      return {
        content: [
          {
            type: 'text',
            text: reportLines.join('\n'),
          },
        ],
      };
    }
  );

  // ==========================================
  // MCP RESOURCES
  // ==========================================
  server.resource(
    'archon-map',
    'archon://context/map',
    async (uri) => {
      const skeleton = await getOrUpdateSkeleton();
      const text = generateContextMapMarkdown(skeleton);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text,
          },
        ],
      };
    }
  );

  server.resource(
    'archon-config',
    'archon://config',
    async (uri) => {
      const config = loadGuardianConfig(cwd);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }
  );

  // ==========================================
  // MCP PROMPT: archon_coding_mandate
  // ==========================================
  server.prompt(
    'archon_coding_mandate',
    'Prompt template instructing AI how to code strictly according to Archon Modular Monolith guardrails.',
    {},
    () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are pair programming within an ARCHON-governed Modular Monolith repository.
MANDATORY RULES:
1. File Limit: No file may exceed 200 lines (or 120 lines for main UI components). Always decompose large files into subcomponents or hooks.
2. Gateway Boundary: Import across modules ONLY via public gateways: \`@/modules/[moduleName]\`. NEVER deep import private files (e.g. \`@/modules/auth/ui/internal\`).
3. Reuse First: Query existing symbols using the \`archon_query_context\` MCP tool before creating new utilities.
4. Validation: Pre-flight check your code proposal with \`archon_validate_proposal\` before saving files.`,
          },
        },
      ],
    })
  );

  return server;
}
