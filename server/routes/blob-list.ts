import express from 'express';
import { azureStorage } from '../azure-storage';

const router = express.Router();

/**
 * GET /api/blob/list?container=knowledge
 * Azure BLOBストレージのファイル一覧を取得
 */
router.get('/list', async (req, res) => {
  try {
    const container = req.query.container || 'knowledge';
    if (!azureStorage) {
      return res.status(500).json({ success: false, error: 'Azure Storage未設定' });
    }
    // prefix指定も可能
    let prefix: string | undefined = undefined;
    if (typeof req.query.prefix === 'string') {
      prefix = req.query.prefix;
    }
    const files = await azureStorage.listFiles(prefix);
    res.json({ success: true, data: files, total: files.length });
  } catch (error) {
    console.error('❌ BLOBファイル一覧取得エラー:', error);
    res.status(500).json({ success: false, error: 'BLOBファイル一覧取得失敗', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
