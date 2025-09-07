// server/routes/ready.ts
import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { getStorageDriver } from '../blob-storage.js';

export const readyRouter = Router();

// Readiness probe - DB + Blob Storage接続確認
readyRouter.get('/', async (_req: Request, res: Response) => {
  const checks: { [key: string]: any } = {
    db: { status: 'unknown', error: null },
    blob: { status: 'unknown', error: null },
    overall: 'unknown'
  };

  // Deep check が無効なら簡易チェック
  if (process.env.READINESS_DEEP_CHECK !== 'true') {
    checks.overall = 'ok';
    checks.db.status = 'skipped';
    checks.blob.status = 'skipped';
    return res.status(200).json(checks);
  }

  // DB接続チェック（2秒タイムアウト）
  try {
    const dbTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('DB timeout')), 2000)
    );
    const dbCheck = db.execute('SELECT 1 as test');
    
    await Promise.race([dbCheck, dbTimeout]);
    checks.db.status = 'ok';
  } catch (error) {
    checks.db.status = 'error';
    checks.db.error = error instanceof Error ? error.message : String(error);
  }

  // Blob Storage接続チェック（2秒タイムアウト）
  try {
    const storage = getStorageDriver();
    const blobTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Blob timeout')), 2000)
    );
    const blobCheck = storage.list?.('') || Promise.resolve([]);
    
    await Promise.race([blobCheck, blobTimeout]);
    checks.blob.status = 'ok';
  } catch (error) {
    checks.blob.status = 'error';
    checks.blob.error = error instanceof Error ? error.message : String(error);
  }

  // 全体ステータス判定
  checks.overall = (checks.db.status === 'ok' && checks.blob.status === 'ok') ? 'ok' : 'error';

  const httpStatus = checks.overall === 'ok' ? 200 : 503;
  res.status(httpStatus).json(checks);
});

export default readyRouter;
