# ARCHON: AI Architectural Guardian 🛡️

> **Deterministic Architectural Guardrails & Context Skeleton for AI-Assisted Engineering**

Archon là một **Harness Engine / Meta-Framework** bao bọc bên ngoài codebase nhằm ngăn chặn sự suy thoái kiến trúc ("Vibe Hangover") khi làm việc với các AI Coding Agents (Cursor, Windsurf, Claude Code, GitHub Copilot, Antigravity, Cline).

---

## 🎯 6 Trụ Cột Đỉnh Cao

1. **Deterministic Guardian Linter (`archon check`)**: Kiểm soát giới hạn 200 dòng (120 dòng cho main UI), cấm deep import qua module boundary, và cấm chu trình vòng lặp (**Circular Dependencies** `A -> B -> A`). Báo lỗi tất định `exit 1` kèm hướng dẫn khắc phục cụ thể.
2. **Context Map & Contract Linker (`archon skeleton` / `archon watch`)**: Tự động trích xuất chữ ký hàm, JSDoc, Express route endpoints và Zod schemas thành `.context/MAP.md` và `.context/contracts.d.ts` (giảm 86% lượng token nạp vào context của AI).
3. **Native Model Context Protocol Server (`@archon/mcp`)**: Tích hợp trực tiếp giao thức MCP chuẩn với Cursor, Windsurf, Claude Code. Cho phép AI tra cứu hàm (<50 tokens) và pre-flight check trước khi ghi file.
4. **AST Auto-Decomposer Engine (`archon fix`)**: Tự động bóc tách file quá kích thước (>200 dòng hoặc component >120 dòng) thành các sub-components (`components/`) và custom hooks (`hooks/`) hoàn toàn tự động với zero-breaking changes.
5. **Archon Studio Cockpit (`archon studio`)**: Web Dashboard trực quan hóa toàn bộ hệ thống module, hiển thị điểm số **Architectural Health Score** và lượng token tiết kiệm cho AI.
6. **Agent Constitution (`AGENTS.md` / `.cursorrules`)**: Hiến pháp ràng buộc AI bắt buộc phải tuân thủ kiến trúc Modular Monolith và kiểm tra contract trước khi sinh mã.

---

## 🚀 Cài Đặt & Bắt Đầu Nhanh

### 1. Khởi tạo dự án mới với Archon (Greenfield)
```bash
npx create-archon my-awesome-app
# hoặc
pnpm dlx create-archon my-awesome-app
```

### 2. Tích hợp Archon vào dự án đã có (Brownfield)
```bash
npx archon-init
```

---

## 💻 CLI Commands Reference

| Lệnh | Mô tả |
| :--- | :--- |
| `archon check` (hoặc `archon lint`) | Quét toàn bộ codebase kiểm tra vi phạm số dòng, deep import và circular dependency. |
| `archon fix [--target <file>]` | Tự động phân tách file >200 lines hoặc component >120 lines bằng AST Auto-Decomposer. |
| `archon skeleton` (hoặc `archon map`) | Sinh `.context/MAP.md`, `architecture.json`, `skeleton.d.ts` và `contracts.d.ts`. |
| `archon watch` | Lắng nghe thay đổi mã nguồn trong mili-giây, tự động đồng bộ `.context/MAP.md` tức thì. |
| `archon studio` (hoặc `archon visual`) | Khởi chạy Archon Studio Web Cockpit tại `http://localhost:4321`. |

---

## 🔌 Tích hợp MCP Server (Cursor / Windsurf / Claude Code)

Khi tạo dự án bằng `create-archon` hoặc `archon-init`, tệp **`.cursor/mcp.json`** sẽ được tự động tạo sẵn:

```json
{
  "mcpServers": {
    "archon": {
      "command": "npx",
      "args": ["-y", "@archon/mcp"]
    }
  }
}
```

### 6 MCP Tools Cho AI Coding Agents:
- **`archon_query_context`**: Tìm kiếm hàm, component, endpoint đã có trong vài chục tokens thay vì đọc cả repo.
- **`archon_validate_proposal`**: Pre-flight validation code của AI trước khi ghi đè file (kiểm tra dòng và import gateway).
- **`archon_auto_decompose`**: Cho phép AI tự gọi lệnh bóc tách nhỏ file khi thấy code vượt ngưỡng.
- **`archon_get_module_contract`**: Lấy toàn bộ public contract của module (`index.ts`).
- **`archon_lint_project`**: Chạy toàn bộ Linter và trả về danh sách vi phạm.
- **`archon_get_architecture_map`**: Lấy bản đồ tóm tắt kiến trúc toàn dự án.

---

## ⚙️ Cấu Hình Trung Tâm (`guardian.config.json`)

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

---

## 📂 Tài Liệu Kiến Trúc Chi Tiết

- [docs/SPEC.md](file:///f:/Dev/product/archon/docs/SPEC.md): Đặc tả kỹ thuật đầy đủ, triết lý thiết kế và 6 trụ cột công nghệ.
- [docs/PLAN.md](file:///f:/Dev/product/archon/docs/PLAN.md): Lộ trình triển khai và báo cáo các giai đoạn hoàn thành.
- [docs/VITE_EXPRESS_TEMPLATE.md](file:///f:/Dev/product/archon/docs/VITE_EXPRESS_TEMPLATE.md): Cấu trúc thư mục chuẩn cho template React Vite + Node.js Express.
