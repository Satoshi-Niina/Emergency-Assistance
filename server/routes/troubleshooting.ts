import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// Troubleshooting flow routes
router.get('/', (req, res) => {
  try {
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    console.log('トラブルシューティングディレクトリ:', troubleshootingDir);

    if (!fs.existsSync(troubleshootingDir)) {
      console.log('トラブルシューティングディレクトリが存在しません');
      return res.json([]);
    }

    const files = fs.readdirSync(troubleshootingDir);
    console.log('見つかったファイル:', files);

    const troubleshootingFlows = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        try {
          const filePath = path.join(troubleshootingDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          console.log(`ファイル ${file} を読み込み:`, data);

          // データ構造を統一化
          return {
            id: data.id || file.replace('.json', ''),
            title: data.title || data.name || 'タイトルなし',
            description: data.description || data.summary || '',
            trigger: data.trigger || data.keywords || [],
            slides: data.slides || [],
            createdAt: data.createdAt || new Date().toISOString(),
            fileName: file
          };
        } catch (error) {
          console.error(`ファイル ${file} の読み込みエラー:`, error);
          return null;
        }
      })
      .filter(data => data !== null);

    console.log('返すデータ:', troubleshootingFlows);
    res.json(troubleshootingFlows);
  } catch (error) {
    console.error('トラブルシューティングフロー取得エラー:', error);
    res.status(500).json({ error: 'Failed to fetch troubleshooting flows' });
  }
});

// 特定のトラブルシューティングデータ取得
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const timestamp = Date.now();

    console.log(`🔄 [${timestamp}] トラブルシューティングデータ取得: ID=${id}`);

    // 複数のディレクトリから検索
    const searchPaths = [
      path.join(process.cwd(), 'knowledge-base', 'troubleshooting', `${id}.json`),
      path.join(process.cwd(), 'knowledge-base', 'json', `${id}.json`)
    ];

    let data = null;
    let foundPath = null;

    for (const filePath of searchPaths) {
      if (fs.existsSync(filePath)) {
        console.log(`📁 ファイル発見: ${filePath}`);
        foundPath = filePath;

        // ファイル統計情報
        const stats = fs.statSync(filePath);
        console.log(`📊 ファイル情報: size=${stats.size}, modified=${stats.mtime.toISOString()}`);

        // ファイル読み込み
        const content = fs.readFileSync(filePath, 'utf8');
        data = JSON.parse(content);

        // データの完全性チェック
        if (!data.steps) data.steps = [];
        if (!data.triggerKeywords) data.triggerKeywords = [];

        console.log(`✅ データ読み込み成功:`, {
          id: data.id,
          title: data.title,
          stepsCount: data.steps.length
        });
        break;
      }
    }

    if (!data) {
      console.log(`❌ ファイルが見つかりません: ${id}`);
      return res.status(404).json({ error: 'データが見つかりません' });
    }

    // 最強のキャッシュ無効化ヘッダー
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
      'Pragma': 'no-cache',
      'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${timestamp}-${Math.random().toString(36)}"`,
      'X-Accel-Expires': '0',
      'Vary': '*'
    });

    // レスポンスデータに追加情報を付与
    const responseData = {
      ...data,
      loadedAt: new Date().toISOString(),
      requestTimestamp: timestamp,
      filePath: foundPath
    };

    console.log(`📤 レスポンス送信: ${JSON.stringify(responseData).length}文字`);
    res.json(responseData);
  } catch (error) {
    console.error('❌ トラブルシューティングデータ取得エラー:', error);
    res.status(500).json({ error: 'データの取得に失敗しました' });
  }
});

// チャット画面からのフロー検索
router.post('/search', (req, res) => {
  try {
    const { query } = req.body;
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');

    if (!fs.existsSync(troubleshootingDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(troubleshootingDir);
    const searchTerm = query.toLowerCase();

    const matchingFlows = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        try {
          const filePath = path.join(troubleshootingDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);

          // 検索条件との一致をチェック
          const titleMatch = (data.title || '').toLowerCase().includes(searchTerm);
          const descriptionMatch = (data.description || '').toLowerCase().includes(searchTerm);
          const triggerMatch = (data.trigger || []).some((t: string) => t.toLowerCase().includes(searchTerm));

          if (titleMatch || descriptionMatch || triggerMatch) {
            return {
              id: data.id || file.replace('.json', ''),
              title: data.title || 'タイトルなし',
              description: data.description || '',
              trigger: data.trigger || [],
              fileName: file
            };
          }
          return null;
        } catch (error) {
          console.error(`ファイル ${file} の検索エラー:`, error);
          return null;
        }
      })
      .filter(data => data !== null);

    res.json(matchingFlows);
  } catch (error) {
    console.error('トラブルシューティング検索エラー:', error);
    res.status(500).json({ error: 'フロー検索に失敗しました' });
  }
});

export default router;