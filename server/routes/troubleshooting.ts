import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// Troubleshooting flow routes
router.get('/', (req, res) => {
  try {
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    console.log('🔍 トラブルシューティングディレクトリ:', troubleshootingDir);

    if (!fs.existsSync(troubleshootingDir)) {
      console.log('⚠️ トラブルシューティングディレクトリが存在しません');
      return res.json([]);
    }

    const files = fs.readdirSync(troubleshootingDir);
    console.log('📁 見つかったファイル:', files);

    const jsonFiles = files.filter(file => file.endsWith('.json') && !file.includes('.backup'));
    console.log('📋 処理対象JSONファイル:', jsonFiles);

    const troubleshootingFlows = jsonFiles
      .map(file => {
        try {
          const filePath = path.join(troubleshootingDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);

          console.log(`✅ ファイル ${file} を読み込み:`, {
            id: data.id,
            title: data.title,
            stepsCount: data.steps?.length || 0
          });

          // データ構造を統一化
          return {
            id: data.id || file.replace('.json', ''),
            title: data.title || 'タイトルなし',
            description: data.description || '',
            trigger: data.triggerKeywords || data.trigger || [],
            steps: data.steps || [],
            createdAt: data.updatedAt || data.createdAt || new Date().toISOString(),
            fileName: file,
            source: 'troubleshooting'
          };
        } catch (error) {
          console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
          return null;
        }
      })
      .filter(data => data !== null);

    console.log(`📤 返すデータ: ${troubleshootingFlows.length}件`);

    // 強力なキャッシュ無効化
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT'
    });

    res.json(troubleshootingFlows);
  } catch (error) {
    console.error('❌ トラブルシューティングフロー取得エラー:', error);
    res.status(500).json({ error: 'Failed to fetch troubleshooting flows' });
  }
});

// 特定のトラブルシューティングデータ取得
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const timestamp = Date.now();

    console.log(`🔄 [${timestamp}] トラブルシューティングデータ取得: ID=${id}`);

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    console.log(`📁 ファイルパス確認: ${filePath}`);
    console.log(`📁 ファイル存在確認: ${fs.existsSync(filePath)}`);

    // ファイル存在確認
    if (!fs.existsSync(filePath)) {
      console.log(`❌ ファイルが見つかりません: ${filePath}`);
      // troubleshootingディレクトリの全ファイルを確認
      console.log(`📁 troubleshootingディレクトリの内容:`, fs.readdirSync(troubleshootingDir));
      return res.status(404).json({ 
        error: 'ファイルが見つかりません',
        id,
        filePath,
        availableFiles: fs.readdirSync(troubleshootingDir)
      });
    }

    // ファイルサイズチェック
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      console.log(`❌ ファイルが空です: ${filePath}`);
      return res.status(404).json({ 
        error: 'ファイルが空です',
        id,
        filePath
      });
    }

    let data = null;

    console.log(`📁 ファイル発見: ${filePath}`);

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
      stepsCount: data.steps.length,
      filePath: filePath
    });

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
      filePath: filePath
    };

    console.log(`📤 レスポンス送信: ${JSON.stringify(responseData).length}文字`);
    res.json(responseData);
  } catch (error) {
    console.error('❌ トラブルシューティングデータ取得エラー:', error);
    res.status(500).json({ error: 'データの取得に失敗しました' });
  }
});

// 特定のトラブルシューティングデータ保存
router.post('/save/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const saveData = req.body;

    console.log(`💾 トラブルシューティングデータ保存開始: ID=${id}`, {
      title: saveData.title,
      stepsCount: saveData.steps?.length || 0,
      timestamp: saveData.savedTimestamp || 'N/A'
    });

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(troubleshootingDir)) {
      fs.mkdirSync(troubleshootingDir, { recursive: true });
    }

    // 既存ファイルのバックアップを作成
    if (fs.existsSync(filePath)) {
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.copyFileSync(filePath, backupPath);
      console.log(`📋 バックアップ作成: ${backupPath}`);
    }

    // 保存データに確実にタイムスタンプを追加
    const finalSaveData = {
      ...saveData,
      updatedAt: new Date().toISOString(),
      savedTimestamp: saveData.savedTimestamp || Date.now()
    };

    // 原子的書き込み（一時ファイル経由）
    const tempFilePath = `${filePath}.tmp.${Date.now()}`;
    const saveDataString = JSON.stringify(finalSaveData, null, 2);

    fs.writeFileSync(tempFilePath, saveDataString, 'utf8');

    // 一時ファイルが正常に書き込まれた場合のみ、元ファイルを置き換え
    if (fs.existsSync(tempFilePath)) {
      fs.renameSync(tempFilePath, filePath);
      console.log(`✅ 原子的ファイル保存完了: ${filePath}`);
    } else {
      throw new Error('一時ファイルの作成に失敗しました');
    }

    // 保存後の検証
    const savedContent = fs.readFileSync(filePath, 'utf8');
    const parsedContent = JSON.parse(savedContent);
    console.log(`🔍 保存後検証:`, {
      id: parsedContent.id,
      title: parsedContent.title,
      stepsCount: parsedContent.steps?.length || 0,
      fileSize: savedContent.length,
      savedTimestamp: parsedContent.savedTimestamp
    });

    // 強力なキャッシュ無効化ヘッダーを設定
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${finalSaveData.savedTimestamp}-${Date.now()}"`,
      'X-Fresh-Data': 'true'
    });

    res.json({ 
      success: true, 
      message: 'データが保存されました',
      savedAt: finalSaveData.updatedAt,
      savedTimestamp: finalSaveData.savedTimestamp,
      verification: {
        stepsCount: parsedContent.steps?.length || 0,
        fileSize: savedContent.length
      }
    });
  } catch (error) {
    console.error('❌ トラブルシューティングデータ保存エラー:', error);
    res.status(500).json({ error: 'データの保存に失敗しました' });
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