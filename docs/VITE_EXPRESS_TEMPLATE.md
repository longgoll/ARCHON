# CẤU TRÚC CHUẨN VITE + EXPRESS (MODULAR MONOLITH)

Tài liệu này mô tả chi tiết kiến trúc dự án mẫu được Archon hỗ trợ đầu tiên: **React (Vite) + Node.js (Express)**.

---

## 1. CÂY THƯ MỤC TỔNG QUAN

```text
my-saas-app/
├── client/                              # FRONTEND: React + Vite
│   ├── src/
│   │   ├── modules/                     # Feature Modules
│   │   │   ├── auth/
│   │   │   │   ├── ui/                  # Component giao diện (chỉ dùng nội bộ auth)
│   │   │   │   │   ├── login-form.tsx
│   │   │   │   │   └── components/      # Sub-components nếu file > 120 dòng
│   │   │   │   ├── api/                 # Gọi API sang backend (/api/auth)
│   │   │   │   │   └── auth-client.ts
│   │   │   │   ├── schemas/             # Client validation schemas (Zod)
│   │   │   │   │   └── auth.schema.ts
│   │   │   │   └── index.ts             # 🔒 PUBLIC GATEWAY DUY NHẤT CỦA MODULE
│   │   │   └── user/
│   │   │       ├── ui/
│   │   │       ├── api/
│   │   │       └── index.ts
│   │   ├── shared/                      # Thành phần dùng chung toàn frontend
│   │   │   ├── ui/                      # Base UI (Button, Input, Modal, ...)
│   │   │   ├── hooks/                   # Custom React hooks
│   │   │   └── utils/                   # Helpers tiện ích
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── server/                              # BACKEND: Node.js + Express
│   ├── src/
│   │   ├── modules/                     # Feature Modules
│   │   │   ├── auth/
│   │   │   │   ├── routes/              # Express Router definitions
│   │   │   │   │   └── auth.router.ts
│   │   │   │   ├── services/            # Business Logic & DB queries
│   │   │   │   │   └── auth.service.ts
│   │   │   │   ├── schemas/             # Request/Response Zod validation
│   │   │   │   │   └── auth.schema.ts
│   │   │   │   └── index.ts             # 🔒 PUBLIC GATEWAY CỦA SERVER MODULE
│   │   │   └── user/
│   │   │       ├── routes/
│   │   │       ├── services/
│   │   │       └── index.ts
│   │   ├── shared/                      # Server Shared Resources
│   │   │   ├── middleware/              # Auth guard, error handler, logger
│   │   │   ├── db/                      # Database client (Prisma/Drizzle/Kysely)
│   │   │   └── utils/
│   │   ├── app.ts                       # Khởi tạo Express app & gắn module routes
│   │   └── server.ts                    # Listen port & graceful shutdown
│   └── package.json
│
├── .context/                            # AI CONTEXT SKELETON (Auto-generated)
│   ├── architecture.json                # Rút trích Type & Endpoints
│   └── skeleton.d.ts                    # Type signature file nhẹ cho AI nạp vào prompt
│
├── guardian.config.json                 # Cấu hình luật Guardian
├── AGENTS.md                            # Chỉ thị cho AI Coding Agent
├── .cursorrules                         # Symlink hoặc cấu hình cho Cursor
└── package.json                         # Root monorepo / workspace scripts
```

---

## 2. QUY TẮC RANH GIỚI (BOUNDARY ENFORCEMENT RULES)

### Quy tắc 1: Public Gateway (`index.ts` / `index.js`)
- Chỉ các thành phần được export tại `src/modules/[module]/index.ts` mới được các module khác sử dụng.
- **Hợp lệ:**
  ```typescript
  // Trong client/src/modules/dashboard/ui/dashboard-page.tsx
  import { useAuth } from '@/modules/auth';
  ```
- **Vi phạm (Linter sẽ chặn ngay):**
  ```typescript
  // CẤM: Import sâu vào ruột của module khác
  import { LoginForm } from '@/modules/auth/ui/login-form';
  import { authClient } from '@/modules/auth/api/auth-client';
  ```

### Quy tắc 2: Tách Client - Server Rạch Ròi
- Tuyệt đối cấm code trong `client/` import bất kỳ file nào từ `server/` (trừ types/schemas nếu dùng chung monorepo package).
- Server code không được import code từ `client/`.

### Quy tắc 3: Ngưỡng giới hạn dòng code (LOC Limit)
- File UI Component chính: **Tối đa 120 dòng**. Nếu dài hơn, bắt buộc tách các khối con vào thư mục `components/`.
- File Service/Router/Helper nói chung: **Tối đa 200 dòng** (với mức `strict`).

---

## 3. PHIÊN BẢN JAVASCRIPT THUẦN (VANILLA JS + JSDOC)

Khi người dùng chọn JavaScript thuần thay vì TypeScript:
- Các file có đuôi `.jsx` / `.js`.
- Khuyến nghị sử dụng **JSDoc** cho các hàm và Zod cho schema runtime:
  ```javascript
  /**
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ token: string, user: object }>}
   */
  export async function login(email, password) {
    // ...
  }
  ```
- Context Skeleton Builder sẽ bóc tách các comment JSDoc này để đưa vào `.context/architecture.json`, giúp AI vẫn nắm được type signatures mà không cần compile TypeScript.

---

## 4. TIÊU CHUẨN HIỆN ĐẠI (REACT 19 + EXPRESS 5 + ZERO DRIFT)

Template `vite-express-ts` được thiết kế theo tiêu chuẩn công nghệ 2026:

### React 19 Form Actions & `useActionState`
- UI form sử dụng `useActionState` thay vì duy trì hàng loạt `useState` rải rác:
  ```tsx
  const [state, formAction, isPending] = useActionState(
    async (_prev, formData) => {
      return await loginApi(formData);
    },
    { error: null }
  );
  ```

### Express 5 Native Async Error Propagation
- Route handlers hỗ trợ bất đồng bộ gốc. Mọi exception (hoặc Zod validation fail) tự động lọt vào Centralized Error Middleware trong `app.ts`, không cần `try/catch` thủ công:
  ```typescript
  authRouter.post('/login', async (req, res) => {
    const validated = LoginRequestSchema.parse(req.body);
    const session = await loginService(validated);
    res.json(session);
  });
  ```

### Type-Safe API Fetcher (`archonFetch`)
- Frontend sử dụng helper `archonFetch` tại `shared/api/client.ts` để gọi API. Bộ phân tích `archon drift` tự động nhận diện và so khớp với Server Express routes trong thời gian thực.

### JSDoc Trích Xuất Ngữ Nghĩa Cho AI
- Viết JSDoc phía trên route Express để Archon tự động đưa mô tả vào `.context/MAP.md`:
  ```typescript
  /**
   * Xác thực thông tin đăng nhập và cấp phát phiên làm việc (AuthSession) kèm JWT
   */
  authRouter.post('/login', async (req, res) => { ... });
  ```

