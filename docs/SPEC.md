# MASTER ARCHITECTURE SPECIFICATION: ARCHON

**Tên dự án:** ARCHON (AI Architectural Guardian)  
**Phân loại:** Meta-Framework / Architectural Harness / Deterministic Guardrail / Model Context Protocol (MCP) Server  
**Môi trường đích:** Cursor, Windsurf, Claude Code, GitHub Copilot, Cline, Antigravity  
**Trọng tâm công nghệ ban đầu:** React + Node.js (Vite + Express), hỗ trợ TypeScript & JavaScript thuần  

---

## 1. VẤN ĐỀ CỐT LÕI (THE PROBLEM STATEMENT)

Khi phát triển ứng dụng bằng AI Agent ("Vibe Coding") vượt qua ngưỡng 10.000 dòng code hoặc >20 màn hình, hệ thống sẽ gặp các vấn đề nghiêm trọng ("Vibe Hangover"):

1. **Context Degradation (AI ngáo / suy thoái ngữ cảnh):** Context window bị quá tải khiến Agent không nắm trọn repo, sửa chức năng A vô tình làm vỡ chức năng B.
2. **Spaghetti & Monolithic Bloat:** AI có khuynh hướng viết code dồn hết UI, logic gọi API, state management và business logic vào chung 1 file duy nhất (>500 dòng).
3. **Phá vỡ ranh giới Module (Boundary Leak):** AI tự do import các file nội bộ của module khác (`@/modules/auth/server/db/internal-query`) thay vì đi qua Public Gateway (`index.ts`).
4. **Circular Dependencies (Chu trình vòng lặp):** AI kết nối chéo các module (`A -> B -> A`), gây sập bundler và lỗi khởi tạo runtime.
5. **Contract Drift (Lệch pha Client - Server):** AI tự bịa endpoint API hoặc sai lệch payload giữa Express Server và React Client.
6. **Dependency Incontinence:** AI tự ý cài đặt vô tội vạ các thư viện mới mỗi khi cần giải quyết một tiện ích nhỏ.
7. **Giới hạn của Prompting thuần túy:** Prompt tự nhiên (`.cursorrules`) có xác suất cao bị AI phớt lờ khi context phình to. Giải pháp bắt buộc là **Ràng buộc tất định (Deterministic Enforcement - Exit code 1)** kết hợp **Giao thức MCP (Model Context Protocol)**.

---

## 2. KIẾN TRÚC TỔNG THỂ ARCHON (THE ARCHON HARNESS)

```
                       ┌────────────────────────────────────────────────────────┐
                       │                     CONSTITUTION                       │
                       │               AGENTS.md / .cursorrules                 │
                       │         (Hiến pháp hướng dẫn hành vi cho AI)           │
                       └───────────────────────────┬────────────────────────────┘
                                                   │
                  ┌────────────────────────────────┼────────────────────────────────┐
                  ▼                                ▼                                ▼
   ┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
   │    DETERMINISTIC ENFORCER   │  │    CONTEXT SKELETON & API   │  │      NATIVE MCP SERVER      │
   │  Linter & Boundary & Cycle  │  │   .context/MAP.md & DTS     │  │   @archon/mcp (Tool Calls)  │
   │    (Exit 1 & Remediation)   │  │   (Giảm 86% Token Nạp AI)   │  │  (Pre-flight Check & Query) │
   └──────────────┬──────────────┘  └──────────────┬──────────────┘  └──────────────┬──────────────┘
                  │                                │                                │
                  └────────────────────────────────┼────────────────────────────────┘
                                                   ▼
                       ┌────────────────────────────────────────────────────────┐
                       │               SELF-HEALING & STUDIO                    │
                       │    archon fix (Auto-Decomposer) & archon studio        │
                       └────────────────────────────────────────────────────────┘
```

1. **Constitution (Hiến pháp):** Khai báo luật lệ kiến trúc trong `AGENTS.md` & `.cursorrules`.
2. **Deterministic Enforcer (Tòa án thực thi):** Linter quét AST, kiểm soát số dòng (200 LOC), ranh giới module (cấm deep import), cấm import vòng (`circular-dependency`), chặn lỗi tại Git Hook (`exit 1`) kèm chỉ dẫn tự khắc phục.
3. **Context Skeleton & Contract Linker:** Trích xuất chữ ký hàm, Zod schemas, Express routes vào `.context/MAP.md`, `architecture.json`, `skeleton.d.ts` và `contracts.d.ts`.
4. **Native MCP Server (`@archon/mcp`):** Tích hợp chuẩn Model Context Protocol cho phép Cursor / Windsurf / Claude Code gọi tool trực tiếp để tra cứu ngữ cảnh (<50 tokens) và pre-flight check trước khi ghi đè file.
5. **Self-Healing Decomposer (`archon fix`):** Tự động bóc tách file >200 lines hoặc component >120 lines thành các sub-components & custom hooks chuẩn chỉ.
6. **Archon Studio Cockpit (`archon studio`):** Web Dashboard trực quan đo lường Architectural Health Score và số token tiết kiệm.

---

## 3. CÁC TRỤ CỘT KỸ THUẬT

### Trụ cột 1: Cấu trúc Modular Monolith

Ứng dụng chia rõ ranh giới hai phía:
- `client/src/modules/[feature]/` (React + Vite)
- `server/src/modules/[feature]/` (Node.js + Express)

Mỗi module tuân theo quy tắc:
- **`ui/` (Client):** Chứa React components. File giao diện chính không quá 120 dòng; nếu dài hơn phải tách sub-components vào `ui/components/`.
- **`routes/` & `services/` (Server):** Phân tách route endpoints và xử lý logic nghiệp vụ / database queries.
- **`schemas/`:** Chứa Zod schema (request/response validation) và type inference.
- **`index.ts`:** **Strict Public Gateway**. Chỉ những gì được export tại đây mới cho phép bên ngoài import (`@/modules/[mod]`). Cấm triệt để deep import.
- **`shared/`:** Các UI components nền tảng, shared utility functions, database client.

### Trụ cột 2: Active Enforcement (Guardian Linter & Circular Prevention)

1. **Hard Limit số dòng file:**
   - Relaxed: 300 dòng
   - Strict: 200 dòng (component chính: 120 dòng)
   - Hardcore: 150 dòng
2. **Module Boundary Check:**
   - Cấm Deep import: Module `A` chỉ được import Module `B` qua gateway: `import { ... } from '@/modules/B'`.
   - Cấm Client ➔ Server direct import leak.
3. **Circular Dependency Checker:**
   - Dùng thuật toán DFS trên đồ thị import module để chặn đứng các chu trình `A -> B -> A`.
4. **Dependency Freeze:**
   - Kiểm tra `package.json`, chặn các thư viện lạ ngoài whitelist.

### Trụ cột 3: Context Skeleton & Fullstack Contract Linker

1. **Context Map Builder (`archon skeleton` / `archon watch`):**
   - Quét AST của `modules/` và xuất ra:
     - `.context/MAP.md`: Markdown Bible cho AI đọc hiểu tức thì.
     - `.context/architecture.json`: Structured AST schema.
     - `.context/skeleton.d.ts`: Ambient types cho AI autocomplete.
2. **Fullstack Type-Safe Contract Linker:**
   - Quét Express routes (`router.get`, `router.post`) và Zod validator schemas.
   - Xuất ra `.context/contracts.d.ts`:
     ```typescript
     export interface ArchonApiEndpoints {
       "POST /api/auth/login": { body: LoginSchemaInput; response: unknown; };
       "GET /api/auth/me": { body: undefined; response: unknown; };
     }
     ```

### Trụ cột 4: Model Context Protocol (Native MCP Server)

Package `@archon/mcp` cung cấp 6 tools Stdio Transport:
- `archon_query_context`: Tìm kiếm hàm, component theo từ khóa/mục đích mà không cần đọc cả repo (<50 tokens).
- `archon_validate_proposal`: Pre-flight check code đề xuất trước khi ghi file xuống ổ đĩa.
- `archon_auto_decompose`: AI gọi lệnh tự động bẻ nhỏ file khi thấy code quá dài.
- `archon_get_module_contract`: Xem public API contract và internal file layout của module.
- `archon_lint_project`: Quét toàn diện vi phạm kiến trúc.
- `archon_get_architecture_map`: Bản đồ tóm tắt kiến trúc.

### Trụ cột 5: Agentic Auto-Decomposition (`archon fix`)

- Tự động phân tích file bị quá kích thước (>200 lines hoặc component >120 lines).
- Dùng TypeScript AST:
  - Tách sub-components ra `components/[ComponentName].tsx`.
  - Tách custom hooks ra `hooks/[useHookName].ts`.
  - Viết lại câu lệnh `import` ở file gốc, loại bỏ declaration cũ.

### Trụ cột 6: Archon Studio Cockpit (`archon studio`)

- Chạy HTTP server siêu nhẹ (Node.js native `node:http`) tại port 4321.
- Hiển thị trực quan:
  - **Architectural Health Score (0 - 100%)**.
  - **Token Economy Meter (ước tính % tokens tiết kiệm)**.
  - **Module & Public Gateway Explorer**.

---

## 4. CẤU HÌNH TRUNG TÂM (`guardian.config.json`)

```json
{
  "$schema": "https://archon.dev/schema.json",
  "preset": "vite-express-modular",
  "language": "typescript",
  "strictness": "strict",
  "rules": {
    "maxFileLines": 200,
    "maxComponentLines": 120,
    "ignoreBlankLines": false,
    "preventCircularDependencies": true,
    "moduleBoundary": {
      "clientModulesDir": "client/src/modules",
      "serverModulesDir": "server/src/modules",
      "gatewayFile": "index.ts",
      "allowDeepImports": false
    },
    "dependencyFreeze": {
      "enabled": true,
      "allowedLibraries": [
        "react",
        "react-dom",
        "express",
        "zod",
        "cors",
        "lucide-react"
      ]
    }
  }
}
```
