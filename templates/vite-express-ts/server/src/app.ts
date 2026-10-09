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

  // Centralized Error Handling Middleware (Express 5 native async error propagation)
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const statusCode = err.status || err.statusCode || 400;
    res.status(statusCode).json({
      message: err.message || 'Internal server error',
    });
  });

  return app;
}
