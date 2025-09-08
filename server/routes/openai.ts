import { Router } from 'express';

// GPT接続チェック用の軽量ルート（外部ネットワーク呼び出しは行わない）
const router = Router();

router.get('/health', async (_req, res) => {
  const hasKey = !!process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const baseUrl = process.env.OPENAI_API_BASE || null;

  // 外部コールはせず、設定状況のみを返す
  res.json({
    success: true,
    hasKey,
    model,
    baseUrl,
    nodeEnv: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

export default router;