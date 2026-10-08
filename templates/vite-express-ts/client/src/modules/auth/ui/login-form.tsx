import React, { useState } from 'react';
import { loginApi } from '../api/auth-client.js';
import { Button } from '../../../shared/ui/button.js';

export interface LoginFormProps {
  onSuccess?: (token: string) => void;
}

/**
 * Giao diện Form đăng nhập người dùng có xử lý gọi API và callback onSuccess
 */
export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await loginApi({ email, password });
      onSuccess?.(res.token);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px' }}>
      <h3>Đăng nhập</h3>
      {error && <div style={{ color: 'red', fontSize: '14px' }}>{error}</div>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
      />
      <input
        type="password"
        placeholder="Mật khẩu"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
      />
      <Button type="submit">Đăng nhập</Button>
    </form>
  );
}
