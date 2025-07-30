
import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// データファイルのパス
const troubleshootingDataPath = path.join(__dirname, '../data/troubleshooting.json');

// トラブルシューティングデータを読み込む関数
async function loadTroubleshootingData() {
  try {
    if (!existsSync(troubleshootingDataPath)) {
      console.warn(`トラブルシューティングファイルが見つかりません: ${troubleshootingDataPath}`);
      return [];
    }
    const data = await fs.readFile(troubleshootingDataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('トラブルシューティングデータの読み込みエラー:', error);
    return [];
  }
}

// トラブルシューティング一覧取得
router.get('/list', async (req, res) => {
  console.log('📋 トラブルシューティング一覧リクエスト受信');
  try {
    const data = await loadTroubleshootingData();
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } catch (error) {
    console.error('トラブルシューティング一覧取得エラー:', error);
    res.status(500).json({ error: 'データの取得に失敗しました' });
  }
});

// 特定のトラブルシューティング取得
router.get('/:id', async (req, res) => {
  console.log('📋 特定のトラブルシューティング取得:', req.params.id);
  try {
    const { id } = req.params;
    const data = await loadTroubleshootingData();
    const item = data.find((item: any) => item.id === id);
    
    if (!item) {
      return res.status(404).json({ error: 'アイテムが見つかりません' });
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.json(item);
  } catch (error) {
    console.error('トラブルシューティング取得エラー:', error);
    res.status(500).json({ error: 'データの取得に失敗しました' });
  }
});

export default router;
