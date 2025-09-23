import { Router } from 'express';
import { query } from '../db/db';
import { processOpenAIRequest } from '../lib/openai';

const router = Router();

// PostgreSQL接続確認API
router.get('/db-check', async (_req, res) => {
  try {
    const result = await query('SELECT NOW() as db_time');
    res.json({
      status: 'OK',
      db_time: result[0].db_time,
    });
  } catch (error) {
    console.error('DB接続確認エラー:', error);
    res.status(500).json({
      status: 'ERROR',
      message:
        error instanceof Error ? error.message : 'データベース接続エラー',
    });
  }
});

// GPT接続確認API
router.post('/gpt-check', async (_req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'メッセージが指定されていません',
      });
    }

    const reply = await processOpenAIRequest(message, false);

    res.json({
      status: 'OK',
      reply: reply,
    });
  } catch (error) {
    console.error('GPT接続確認エラー:', error);
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'GPT接続エラー',
    });
  }
});

export default router;
