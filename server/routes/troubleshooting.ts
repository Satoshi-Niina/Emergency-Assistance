import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// ESM用__dirname定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// データディレクトリパス
const dataDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');

// ディレクトリ確保
async function ensureDataDir() {
  if (!existsSync(dataDir)) {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// 全データ取得
router.get('/list', async (req, res) => {
  try {
    await ensureDataDir();
    res.setHeader('Content-Type', 'application/json');

    const files = await fs.readdir(dataDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    const troubleshootingList = [];
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(dataDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        troubleshootingList.push(data);
      } catch (error) {
        console.error(`Error reading file ${file}:`, error);
      }
    }

    res.json(troubleshootingList);
  } catch (error: any) {
    console.error('読み込みエラー:', error.message);
    res.status(500).json({ error: 'Failed to read troubleshooting data' });
  }
});

// データ追加
router.post('/add', async (req, res) => {
  try {
    await ensureDataDir();
    const newItem = req.body;
    const id = newItem.id || `ts_${Date.now()}`;
    const filePath = path.join(dataDir, `${id}.json`);

    newItem.id = id;
    await fs.writeFile(filePath, JSON.stringify(newItem, null, 2), 'utf8');

    res.setHeader('Content-Type', 'application/json');
    res.json({ message: 'Added successfully', data: newItem });
  } catch (error: any) {
    console.error('書き込みエラー:', error.message);
    res.status(500).json({ error: 'Failed to add troubleshooting item' });
  }
});

export default router;