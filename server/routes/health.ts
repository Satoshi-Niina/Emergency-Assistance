// server/routes/health.ts
import { Router } from 'express';
import type { Request, Response } from 'express';

export const healthRouter = Router();

// I/Oなし・即200のヘルスチェック
healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    mode: process.env.HELLO_ONLY === 'true' ? 'hello' : 'normal',
    time: new Date().toISOString(),
  });
});

export default healthRouter;
