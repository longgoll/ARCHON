import { Router } from 'express';
import { LoginRequestSchema } from '../schemas/auth.schema.js';
import { loginService } from '../services/auth.service.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  try {
    const validated = LoginRequestSchema.parse(req.body);
    const session = await loginService(validated);
    res.json(session);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});
