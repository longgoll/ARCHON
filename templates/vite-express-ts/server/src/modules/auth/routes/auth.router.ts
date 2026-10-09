import { Router } from 'express';
import { LoginRequestSchema } from '../schemas/auth.schema.js';
import { loginService } from '../services/auth.service.js';

export const authRouter = Router();

/**
 * Xác thực thông tin đăng nhập và cấp phát phiên làm việc (AuthSession) kèm JWT
 */
authRouter.post('/login', async (req, res) => {
  const validated = LoginRequestSchema.parse(req.body);
  const session = await loginService(validated);
  res.json(session);
});
