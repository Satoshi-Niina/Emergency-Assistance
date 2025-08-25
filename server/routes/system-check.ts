import { Router } from 'express';
import { query } from '../db/db';
import { processOpenAIRequest } from '../lib/openai';

const router = Router();

// PostgreSQL謗･邯夂｢ｺ隱喉PI
router.get('/db-check', async (req, res) => {
  try {
    const result = await query('SELECT NOW() as db_time');
    res.json({
      status: "OK",
      db_time: result[0].db_time
    });
  } catch (error) {
    console.error('DB謗･邯夂｢ｺ隱阪お繝ｩ繝ｼ:', error);
    res.status(500).json({
      status: "ERROR",
      message: error instanceof Error ? error.message : "繝・・繧ｿ繝吶・繧ｹ謗･邯壹お繝ｩ繝ｼ"
    });
  }
});

// GPT謗･邯夂｢ｺ隱喉PI
router.post('/gpt-check', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        status: "ERROR",
        message: "繝｡繝・そ繝ｼ繧ｸ縺梧欠螳壹＆繧後※縺・∪縺帙ｓ"
      });
    }

    const reply = await processOpenAIRequest(message, false);
    
    res.json({
      status: "OK",
      reply: reply
    });
  } catch (error) {
    console.error('GPT謗･邯夂｢ｺ隱阪お繝ｩ繝ｼ:', error);
    res.status(500).json({
      status: "ERROR",
      message: error instanceof Error ? error.message : "GPT謗･邯壹お繝ｩ繝ｼ"
    });
  }
});

export default router; 