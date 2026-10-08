export interface ConstitutionOptions {
  projectName: string;
  strictness: 'relaxed' | 'strict' | 'hardcore';
  language: 'typescript' | 'javascript';
  maxLines: number;
}

export function generateAgentsMarkdown(options: ConstitutionOptions): string {
  return `# ARCHON CONSTITUTION FOR AI AGENTS (AGENTS.md)
<!-- DO NOT DELETE OR MODIFY THIS FILE - ARCHITECTURAL RULES ARE STRICTLY ENFORCED -->

## 🛡️ MISSION & OPERATIONAL CONSTRAINTS
You are operating within an Archon-protected project: **${options.projectName}**.
Every modification you make is deterministically verified by the **Archon Guardian Engine**.
Commits and builds will **FAIL (exit code 1)** if you violate any architectural boundaries.

---

## 📜 CORE CONSTITUTIONAL LAWS

### Law 0: Mandatory Context Map Consultation (\`.context/MAP.md\`)
- **BEFORE writing any new function, endpoint, or component**, you MUST inspect \`.context/MAP.md\`.
- **REUSE existing functions** already cataloged in the map.
- **FORBIDDEN:** Do NOT invent duplicate utility or service functions that already exist in other modules.

### Law 1: File Length Ceiling (${options.maxLines} Lines Hard Limit)
- Under no circumstances may any source file exceed **${options.maxLines} lines**.
- UI component files in \`ui/\` must not exceed **120 lines**.
- If your implementation grows larger, you MUST decompose it into:
  - Sub-components inside \`ui/components/\`
  - Utility helpers or sub-services

### Law 2: Modular Monolith Ranh Giới (Strict Public Gateway)
- All feature logic lives in \`modules/[feature]/\`.
- Every module has a single Public Gateway: **\`index.${options.language === 'typescript' ? 'ts' : 'js'}\`**.
- **RULE:** Module A is ONLY allowed to import from Module B via:
  \`import { ... } from '@/modules/B'\`
- **FORBIDDEN:** Never reach into internal files of another module (e.g. \`@/modules/B/ui/...\` or \`@/modules/B/server/...\`).
- If you need a function or component from module B, **export it from module B's index file first**.

### Law 3: Client / Server Strict Isolation
- Code under \`client/\` must NEVER import anything from \`server/\` directly.
- Communication from Client to Server must ALWAYS go through HTTP endpoints via Client API callers.

### Law 4: Document All Public Exports (JSDoc Mandate)
- Every exported function, type, or component MUST include a concise JSDoc comment:
  \`\`\`ts
  /**
   * Xác thực token người dùng và giải mã payload phiên làm việc
   */
  export function verifySession(token: string): SessionUser { ... }
  \`\`\`
- Archon's live watcher uses these comments to keep \`.context/MAP.md\` accurate.

### Law 5: Dependency Whitelist
- Do NOT install or import random third-party packages. Use existing project dependencies.

---

## 🔌 ARCHON MCP SERVER (MODEL CONTEXT PROTOCOL)
If your AI runtime supports MCP (Cursor, Windsurf, Claude Code, Antigravity, Cline):
- **ALWAYS** call \`archon_query_context({ query: "..." })\` BEFORE writing any new function to retrieve existing signatures in <50 tokens.
- **ALWAYS** call \`archon_validate_proposal({ filePath: "...", content: "..." })\` to pre-flight check your code proposal before saving to disk.
- Call \`archon_get_module_contract({ moduleName: "..." })\` to retrieve complete public contracts and private file layouts.
- Call \`archon_lint_project()\` to verify repository architectural integrity.

## 🦴 ARCHON CONTEXT SKELETON
Before asking questions or reading entire code files, refer to:
- \`.context/MAP.md\` (Complete human & AI readable directory of all modules, functions, schemas)
- \`.context/architecture.json\` (Machine-readable AST metadata)
- \`.context/skeleton.d.ts\` (Ambient TypeScript definitions)
`;
}

export function generateMcpConfig(): string {
  return JSON.stringify(
    {
      mcpServers: {
        archon: {
          command: 'npx',
          args: ['-y', '@archon/mcp'],
        },
      },
    },
    null,
    2
  );
}
