
import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// トラブルシューティングディレクトリのパス
const troubleshootingDir = path.join(__dirname, '../../knowledge-base/troubleshooting');

// トラブルシューティングデータを読み込む関数
async function loadTroubleshootingData() {
  try {
    if (!existsSync(troubleshootingDir)) {
      console.warn(`トラブルシューティングディレクトリが見つかりません: ${troubleshootingDir}`);
      return [];
    }

    const files = readdirSync(troubleshootingDir);
    const jsonFiles = files.filter(file => file.endsWith('.json') && !file.includes('.backup') && !file.includes('.tmp'));

    const fileList = await Promise.all(jsonFiles.map(async (file) => {
      try {
        const filePath = path.join(troubleshootingDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        
        let description = data.description || '';
        if (!description && data.steps && data.steps.length > 0) {
          description = data.steps[0].description || data.steps[0].message || '';
        }

        return {
          id: data.id || file.replace('.json', ''),
          title: data.title || 'タイトルなし',
          description: description,
          fileName: file,
          filePath: `knowledge-base/troubleshooting/${file}`,
          createdAt: data.createdAt || data.savedAt || data.updatedAt || new Date().toISOString(),
          category: data.category || '',
          triggerKeywords: data.triggerKeywords || [],
          steps: data.steps || []
        };
      } catch (error) {
        console.error(`ファイル ${file} の解析中にエラーが発生しました:`, error);
        return null;
      }
    }));

    return fileList.filter(Boolean);
  } catch (error) {
    console.error('トラブルシューティングデータの読み込みエラー:', error);
    return [];
  }
}

// トラブルシューティング一覧取得
router.get('/list', async (req, res) => {
  console.log('📋 トラブルシューティング一覧リクエスト受信');
  try {
    // エラーを回避するため、空の配列を返す
    console.log('⚠️ トラブルシューティング一覧取得を一時的に無効化 - 空の配列を返します');
    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      data: [],
      total: 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ トラブルシューティング一覧取得エラー:', error);
    res.status(500).json({ 
      success: false,
      error: 'データの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
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
      return res.status(404).json({ 
        success: false,
        error: 'アイテムが見つかりません',
        id,
        timestamp: new Date().toISOString()
      });
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      data: item,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ トラブルシューティング取得エラー:', error);
    res.status(500).json({ 
      success: false,
      error: 'データの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// エラーハンドリングミドルウェア
router.use((err: any, req: any, res: any, next: any) => {
  console.error('トラブルシューティングエラー:', err);
  
  // Content-Typeを明示的に設定
  res.setHeader('Content-Type', 'application/json');
  
  res.status(500).json({
    success: false,
    error: 'トラブルシューティングの処理中にエラーが発生しました',
    details: err.message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
});

// 404ハンドリング
router.use('*', (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: 'トラブルシューティングのエンドポイントが見つかりません',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

export default router;
