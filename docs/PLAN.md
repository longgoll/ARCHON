# KẾ HOẠCH TRIỂN KHAI ARCHON (IMPLEMENTATION ROADMAP)

Kế hoạch này vạch ra các giai đoạn thực thi để xây dựng bộ công cụ **Archon**, từ PoC ban đầu đến hệ thống Architectural Guardian & MCP hoàn chỉnh.

---

## 🗺️ TỔNG QUAN CÁC GIAI ĐOẠN

```
Phase 1: Workspace Setup (Monorepo Architecture)                    [COMPLETED]
    │
    ▼
Phase 2: Core Guardian Engine (@archon/core)                        [COMPLETED]
    ├─ Line Limit Checker (150/200/300 LOC)
    ├─ Module Boundary Enforcer (Chặn Deep Imports)
    ├─ Circular Dependency Checker (DFS Graph Cycle Detection)
    ├─ Auto-Decomposer Engine (archon fix)
    ├─ Archon Studio Cockpit (archon studio - Web Dashboard)
    └─ Actionable Remediation Reporter
    │
    ▼
Phase 3: Context Skeleton & Contract Linker (@archon/skeleton)      [COMPLETED]
    ├─ AST Public Export Extractor
    ├─ Express Route & Zod Schema Extractor
    ├─ Generator: .context/architecture.json, skeleton.d.ts & contracts.d.ts
    └─ Live Auto-Sync Watcher (archon watch)
    │
    ▼
Phase 4: Model Context Protocol Server (@archon/mcp)               [COMPLETED]
    ├─ Stdio Transport Server for Cursor, Windsurf, Claude Code
    ├─ Tool: archon_query_context (<50 tokens context lookup)
    ├─ Tool: archon_validate_proposal (Pre-flight code checking)
    ├─ Tool: archon_auto_decompose (AI-triggered file decomposition)
    ├─ Tool: archon_get_module_contract, archon_lint_project, archon_get_architecture_map
    └─ Resources: archon://context/map, archon://config
    │
    ▼
Phase 5: Interactive Scaffolder (@archon/create-archon)            [COMPLETED]
    ├─ @clack/prompts Interactive Menu
    ├─ Brownfield Setup (archon-init)
    ├─ Auto-generate .cursor/mcp.json, AGENTS.md, guardian.config.json
    └─ Template Generator (Vite + Express: TS & JS)
    │
    ▼
Phase 6: End-to-End Testing & Verification                          [COMPLETED]
    ├─ 16 Unit & Integration Tests across all 3 packages
    ├─ E2E Scaffolding & Boundary Violation Automation Test
    └─ 100% Green Test Suite
```

---

## 📌 CHI TIẾT TỪNG GIAI ĐOẠN

### Phase 1: Thiết lập cấu trúc Monorepo (Hoàn thành)
- `packages/core`: Linter Engine, Boundary Checker, Circular Prevention, Auto-Decomposer, Archon Studio.
- `packages/skeleton`: Trích xuất AST chữ ký hàm và liên kết Route Contract Express.
- `packages/mcp`: Native Model Context Protocol Server cho AI Agents.
- `packages/cli`: Công cụ scaffolding `create-archon` và `archon-init`.
- `templates/vite-express-ts`: Dự án mẫu React Vite + Express (TypeScript).

### Phase 2: Core Guardian Engine (`@archon/core`) (Hoàn thành)
- `archon check`: Kiểm tra số dòng, ranh giới module, chu trình phụ thuộc vòng, dependency whitelist.
- `archon fix`: Tự động tách sub-components & hooks ra các file chuẩn.
- `archon studio`: Khởi chạy web dashboard đo Architectural Health Score & Token Savings.

### Phase 3: Context Skeleton & Contract Linker (`@archon/skeleton`) (Hoàn thành)
- `archon skeleton` / `archon map`: Sinh `.context/MAP.md`, `architecture.json`, `skeleton.d.ts`.
- Fullstack Contract Linker: Bóc tách Express routes & Zod schemas sinh `.context/contracts.d.ts`.
- `archon watch`: Tự động đồng bộ hóa thời gian thực khi code thay đổi.

### Phase 4: Model Context Protocol Server (`@archon/mcp`) (Hoàn thành)
- Hỗ trợ Stdio Transport chuẩn MCP.
- Cung cấp 6 tools cho AI: `archon_query_context`, `archon_validate_proposal`, `archon_auto_decompose`, `archon_get_module_contract`, `archon_lint_project`, `archon_get_architecture_map`.
- Cung cấp Resources `archon://context/map` và Prompt `archon_coding_mandate`.

### Phase 5: Scaffolding CLI (`create-archon` / `archon-init`) (Hoàn thành)
- Tích hợp `@clack/prompts` tương tác mượt mà.
- Tự động sinh hiến pháp `AGENTS.md`, `.cursorrules` và file cấu hình `.cursor/mcp.json`.

### Phase 6: Automated Testing & Quality Assurance (Hoàn thành)
- Kiểm thử tích hợp MCP Client qua `InMemoryTransport`.
- Kiểm thử bóc tách Express routes và phát hiện vòng lặp `A -> B -> A`.
- Kiểm thử E2E Scaffolding tự động hóa (`scripts/test-e2e.mjs`).
