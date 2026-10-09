import React, { useActionState } from 'react';
import { loginApi } from '../api/auth-client.js';
import { Button } from '../../../shared/ui/button.js';

export interface LoginFormProps {
  onSuccess?: (token: string) => void;
}

interface FormState {
  error: string | null;
}

/**
 * Giao diện Form đăng nhập người dùng có xử lý gọi API bằng React 19 Action State
 */
export function LoginForm({ onSuccess }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (_prevState, formData) => {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      try {
        const res = await loginApi({ email, password });
        onSuccess?.(res.token);
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Đăng nhập thất bại' };
      }
    },
    { error: null }
  );

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px' }}>
      <h3>Đăng nhập</h3>
      {state.error && <div style={{ color: 'red', fontSize: '14px' }}>{state.error}</div>}
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        disabled={isPending}
        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
      />
      <input
        name="password"
        type="password"
        placeholder="Mật khẩu"
        required
        disabled={isPending}
        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Đang xác thực...' : 'Đăng nhập'}
      </Button>
    </form>
  );
}
