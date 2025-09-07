// server/health.ts
import type { Express, Request, Response } from 'express';

export function registerHealthRoutes(app: Express) {
  // 最優先: I/Oなし・即200
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      mode: process.env.HELLO_ONLY === 'true' ? 'hello' : 'normal',
      time: new Date().toISOString(),
    });
  });

  // 任意: liveness/readiness を分けたい場合（I/Oしない）
  app.get('/live', (_req, res) => res.status(200).send('live'));
  app.get('/ready', (_req, res) => res.status(200).send('ready'));
}
