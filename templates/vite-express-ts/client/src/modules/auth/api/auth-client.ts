import { AuthSession, LoginInput } from '../schemas/auth.schema.js';
import { archonFetch } from '../../../shared/api/client.js';

/**
 * Gửi yêu cầu đăng nhập lên API server và nhận session phiên làm việc
 */
export async function loginApi(input: LoginInput): Promise<AuthSession> {
  return archonFetch<AuthSession, LoginInput>('/api/auth/login', {
    method: 'POST',
    body: input,
  });
}
