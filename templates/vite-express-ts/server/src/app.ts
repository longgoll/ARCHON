import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/index.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Mount feature modules via their public gateways
  app.use('/api/auth', authRouter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  return app;
}
