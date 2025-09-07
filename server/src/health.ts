// server/health.ts
import { Router } from 'express';
import type { Request, Response } from 'express';

export const healthRouter = Router();

// 最優先: I/Oなし・即200
healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    mode: process.env.HELLO_ONLY === 'true' ? 'hello' : 'normal',
    time: new Date().toISOString(),
  });
});

// 任意: liveness/readiness を分けたい場合（I/Oしない）
healthRouter.get('/live', (_req, res) => res.status(200).send('live'));
healthRouter.get('/ready', (_req, res) => res.status(200).send('ready'));
