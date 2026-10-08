import { AuthSession, LoginInput } from '../schemas/auth.schema.js';

/**
 * Gửi yêu cầu đăng nhập lên API server và nhận session phiên làm việc
 */
export async function loginApi(input: LoginInput): Promise<AuthSession> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Login failed');
  }

  return response.json();
}
