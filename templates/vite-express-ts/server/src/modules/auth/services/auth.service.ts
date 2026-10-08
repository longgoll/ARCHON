import { LoginRequest } from '../schemas/auth.schema.js';

export interface UserSession {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

/**
 * Xác thực thông tin đăng nhập và sinh phiên làm việc UserSession kèm JWT token
 */
export async function loginService(data: LoginRequest): Promise<UserSession> {
  // Business logic & DB query mock
  if (data.password === '123456') {
    return {
      token: 'jwt_mock_token_' + Date.now(),
      user: {
        id: 'usr_1',
        email: data.email,
      },
    };
  }

  throw new Error('Sai email hoặc mật khẩu');
}
