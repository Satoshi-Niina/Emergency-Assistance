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
      .filter(file => file === 'engine_stop_no_start.json') // 明示的にこのファイルのみ
      .map(file => {
        try {
          const filePath = path.join(troubleshootingDir, file);

          if (!fs.existsSync(filePath)) {
            console.error(`❌ ファイルが存在しません: ${filePath}`);
            return null;
          }

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

// トラブルシューティングファイル一覧取得
router.get('/list', (req, res) => {
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

    const fileList = jsonFiles.map(file => {
      try {
        const filePath = path.join(troubleshootingDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);

        return {
          id: data.id || file.replace('.json', ''),
          title: data.title || 'タイトルなし',
          description: data.description || '',
          fileName: file,
          createdAt: data.createdAt || data.savedAt || data.updatedAt || new Date().toISOString()
        };
      } catch (error) {
        console.error(`ファイル ${file} の解析中にエラーが発生しました:`, error);
        return null;
      }
    }).filter(Boolean);

    res.json(fileList);
  } catch (error) {
    console.error('ファイル一覧取得エラー:', error);
    res.status(500).json({ error: 'ファイル一覧の取得に失敗しました' });
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

    if (!fs.existsSync(filePath)) {
      console.log(`❌ ファイルが見つかりません: ${filePath}`);
      return res.status(404).json({ 
        error: 'ファイルが見つかりません',
        id,
        filePath
      });
    }

    // ファイル統計情報を取得
    const stats = fs.statSync(filePath);
    console.log(`📊 ファイル情報: サイズ=${stats.size} bytes, 更新=${stats.mtime}`);

    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    console.log(`📖 読み込みデータ: ID=${data.id}, Title=${data.title}, Steps=${data.steps?.length || 0}`);

    // 強力なキャッシュ無効化ヘッダーを設定
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
      'Last-Modified': stats.mtime.toUTCString(),
      'ETag': `"${stats.mtime.getTime()}-${stats.size}"`
    });

    res.json(data);
  } catch (error) {
    console.error('データ取得エラー:', error);
    res.status(500).json({ error: 'データの取得に失敗しました', details: error.message });
  }
});

// トラブルシューティングデータ保存
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
      console.log(`📁 ディレクトリ作成: ${troubleshootingDir}`);
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
      id: id, // IDを確実に設定
      updatedAt: new Date().toISOString(),
      savedTimestamp: Date.now(),
      lastModified: Date.now()
    };

    console.log(`💾 最終保存データ:`, {
      id: finalSaveData.id,
      title: finalSaveData.title,
      updatedAt: finalSaveData.updatedAt,
      stepsCount: finalSaveData.steps?.length || 0
    });

    // 原子的書き込み（一時ファイル経由）
    const tempFilePath = `${filePath}.tmp.${Date.now()}`;
    const saveDataString = JSON.stringify(finalSaveData, null, 2);

    // 一時ファイルに書き込み
    fs.writeFileSync(tempFilePath, saveDataString, 'utf8');
    console.log(`📝 一時ファイル作成: ${tempFilePath}`);

    // ファイルサイズ確認
    const tempStats = fs.statSync(tempFilePath);
    console.log(`📊 一時ファイルサイズ: ${tempStats.size} bytes`);

    // 一時ファイルが正常に書き込まれた場合のみ、元ファイルを置き換え
    if (fs.existsSync(tempFilePath) && tempStats.size > 0) {
      // Windows互換のため、既存ファイルを削除してからリネーム
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      fs.renameSync(tempFilePath, filePath);
      
      // 保存確認
      const finalStats = fs.statSync(filePath);
      console.log(`✅ 最終ファイル保存完了: ${filePath} (${finalStats.size} bytes)`);
      
      // ファイル内容を検証
      const savedContent = fs.readFileSync(filePath, 'utf8');
      const savedData = JSON.parse(savedContent);
      console.log(`🔍 保存検証: ID=${savedData.id}, Title=${savedData.title}`);
    } else {
      throw new Error('一時ファイルの作成に失敗しました');
    }

    // 強力なキャッシュ無効化ヘッダーを設定
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${Date.now()}"`
    });

    res.json({ 
      success: true, 
      message: 'データを保存しました',
      savedAt: finalSaveData.updatedAt,
      fileSize: fs.statSync(filePath).size
    });
  } catch (error) {
    console.error('保存エラー:', error);
    res.status(500).json({ error: 'データの保存に失敗しました', details: error.message });
  }
});

// トラブルシューティングデータ削除
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'ファイルが見つかりません' });
    }

    // 削除前にバックアップを作成
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`📋 バックアップ作成: ${backupPath}`);

    // ファイルを削除
    fs.unlinkSync(filePath);
    console.log(`🗑️ ファイル削除完了: ${filePath}`);

    res.json({ success: true, message: 'ファイルを削除しました' });
  } catch (error) {
    console.error('削除エラー:', error);
    res.status(500).json({ error: 'ファイルの削除に失敗しました' });
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