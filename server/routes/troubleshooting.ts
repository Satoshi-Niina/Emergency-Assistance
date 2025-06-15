import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// Get individual troubleshooting flow by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Troubleshooting flow not found' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching troubleshooting flow:', error);
    res.status(500).json({ error: 'Failed to fetch troubleshooting flow' });
  }
});

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

    const jsonFiles = files.filter(file => file.endsWith('.json') && !file.includes('.backup') && !file.includes('.tmp'));
    console.log('📋 処理対象JSONファイル:', jsonFiles);

    const troubleshootingFlows = jsonFiles
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
            triggerKeywords: data.triggerKeywords || data.trigger || [],
            trigger: data.triggerKeywords || data.trigger || [], // 互換性のため
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
    res.status(500).json({ 
      error: 'トラブルシューティングフローの取得に失敗しました',
      details: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
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

    const jsonFiles = files.filter(file => file.endsWith('.json') && !file.includes('.backup') && !file.includes('.tmp'));
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
    console.error('❌ ファイル一覧取得エラー:', error);
    res.status(500).json({ 
      error: 'ファイル一覧の取得に失敗しました',
      details: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
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
    console.error('❌ データ取得エラー:', error);
    res.status(500).json({ 
      error: 'データの取得に失敗しました', 
      details: error.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      id: req.params.id
    });
  }
});

// ステップタイトル更新専用API
router.post('/update-step-title/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { stepId, title } = req.body;

    if (!stepId || !title) {
      return res.status(400).json({ error: 'stepIdとtitleが必要です' });
    }

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'ファイルが見つかりません' });
    }

    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // ステップを更新
    const updatedSteps = existingData.steps.map((step: any) => 
      step.id === stepId ? { ...step, title } : step
    );

    const updatedData = {
      ...existingData,
      steps: updatedSteps,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
    
    res.json({ success: true, message: 'タイトルが更新されました' });
  } catch (error) {
    console.error('タイトル更新エラー:', error);
    res.status(500).json({ error: 'タイトルの更新に失敗しました' });
  }
});

// トラブルシューティングデータ保存
router.post('/save/:id', async (req, res) => {
  const lockKey = `save_${req.params.id}`;

  // 簡単な保存ロック機能（同時保存防止）
  if (global.saveLocks && global.saveLocks[lockKey]) {
    return res.status(429).json({ 
      error: '別の保存処理が進行中です。しばらく待ってから再試行してください。' 
    });
  }

  try {
    // 保存ロックを設定
    if (!global.saveLocks) global.saveLocks = {};
    global.saveLocks[lockKey] = true;

    const { id } = req.params;
    const saveData = req.body;

    // タイトル更新の場合の特別処理
    if (saveData.action === 'updateStepTitle') {
      const { stepId, title } = saveData;

      const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
      const filePath = path.join(troubleshootingDir, `${id}.json`);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'ファイルが見つかりません' });
      }

      const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const updatedSteps = existingData.steps.map((step: any) => 
        step.id === stepId ? { ...step, title } : step
      );

      const updatedData = {
        ...existingData,
        steps: updatedSteps,
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
      
      // ロックを解除
      delete global.saveLocks[lockKey];
      
      return res.json({ success: true, message: 'タイトルが更新されました' });
    }

    const isCompleteReplace = req.headers['x-complete-replace'] === 'true';

    console.log(`💾 トラブルシューティングデータ${isCompleteReplace ? '完全置換' : '保存'}開始: ID=${id}`, {
      title: saveData.title,
      stepsCount: saveData.steps?.length || 0,
      triggerCount: saveData.triggerKeywords?.length || 0,
      isCompleteReplace
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

    // 完全置換の場合、受信したデータをそのまま保存（マージせずに置換）
    const finalSaveData = isCompleteReplace ? {
      ...saveData,
      updatedAt: new Date().toISOString()
    } : {
      id: id,
      title: saveData.title || '',
      description: saveData.description || '',
      triggerKeywords: saveData.triggerKeywords || saveData.trigger || [],
      steps: (saveData.steps || []).map(step => ({
        id: step.id,
        title: step.title || '',
        description: step.description || step.message || '',
        imageUrl: step.imageUrl || step.image || '',
        type: step.type || 'step',
        options: (step.options || []).map(option => ({
          text: option.text || option.label,
          nextStepId: option.nextStepId || option.next,
          isTerminal: Boolean(option.isTerminal),
          conditionType: option.conditionType || 'other'
        })),
        message: step.message || step.description || ''
      })),
      updatedAt: new Date().toISOString()
    };

    console.log(`💾 最終保存データ:`, {
      id: finalSaveData.id,
      title: finalSaveData.title,
      triggerCount: finalSaveData.triggerKeywords?.length || 0,
      stepsCount: finalSaveData.steps?.length || 0,
      updatedAt: finalSaveData.updatedAt,
      mode: isCompleteReplace ? '完全置換' : '通常保存'
    });

    // 原子的書き込み（一時ファイル経由）
    const tempFilePath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`;
    const saveDataString = JSON.stringify(finalSaveData, null, 2);

    // 一時ファイルに書き込み
    fs.writeFileSync(tempFilePath, saveDataString, 'utf8');
    console.log(`📝 一時ファイル作成: ${tempFilePath}`);

    // ファイルサイズと内容の確認
    const tempStats = fs.statSync(tempFilePath);
    console.log(`📊 一時ファイルサイズ: ${tempStats.size} bytes`);

    // 一時ファイルの内容を検証
    const tempContent = fs.readFileSync(tempFilePath, 'utf8');
    const tempData = JSON.parse(tempContent);
    console.log(`🔍 一時ファイル検証: ID=${tempData.id}, Title=${tempData.title}, Steps=${tempData.steps?.length || 0}`);

    // 一時ファイルが正常に書き込まれた場合のみ、元ファイルを置き換え
    if (fs.existsSync(tempFilePath) && tempStats.size > 0 && tempData.id === id) {
      // 既存ファイルを削除してからリネーム（完全置換）
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ 既存ファイル削除: ${filePath}`);

        // ファイルが完全に削除されるまで少し待つ
        let attempts = 0;
        while (fs.existsSync(filePath) && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 10));
          attempts++;
        }
      }

      fs.renameSync(tempFilePath, filePath);

      // ファイルが正常に作成されるまで待つ
      let createAttempts = 0;
      while (!fs.existsSync(filePath) && createAttempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 10));
        createAttempts++;
      }

      // 最終保存確認
      const finalStats = fs.statSync(filePath);
      console.log(`✅ ファイル完全置換完了: ${filePath} (${finalStats.size} bytes)`);

      // 最終的に保存されたファイル内容を検証
      const savedContent = fs.readFileSync(filePath, 'utf8');
      const savedData = JSON.parse(savedContent);
      console.log(`🔍 最終保存検証:`, {
        id: savedData.id,
        title: savedData.title,
        steps: savedData.steps?.length || 0,
        triggers: savedData.triggerKeywords?.length || 0,
        updatedAt: savedData.updatedAt
      });

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
        message: isCompleteReplace ? 'ファイルを完全に置き換えました' : 'データを保存しました',
        data: savedData,
        savedAt: savedData.updatedAt,
        fileSize: finalStats.size,
        mode: isCompleteReplace ? 'complete_replace' : 'normal_save',
        verification: {
          saved: true,
          id: savedData.id,
          title: savedData.title,
          stepsCount: savedData.steps?.length || 0,
          triggerCount: savedData.triggerKeywords?.length || 0
        }
      });
    } else {
      throw new Error('一時ファイルの作成または検証に失敗しました');
    }

  } catch (error) {
    console.error('保存エラー:', error);
    res.status(500).json({ 
      error: 'データの保存に失敗しました', 
      details: error.message,
      id: req.params.id
    });
  } finally {
    // 保存ロックを解除
    if (global.saveLocks) {
      delete global.saveLocks[lockKey];
    }

    // 一時ファイルのクリーンアップ
    try {
      const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
      const tempFiles = fs.readdirSync(troubleshootingDir)
        .filter(file => file.includes('.tmp.') || file.includes('.backup.'))
        .filter(file => {
          const filePath = path.join(troubleshootingDir, file);
          const stats = fs.statSync(filePath);
          // 1時間以上古い一時ファイルを削除
          return Date.now() - stats.mtime.getTime() > 3600000;
        });
      
      tempFiles.forEach(file => {
        try {
          fs.unlinkSync(path.join(troubleshootingDir, file));
          console.log(`🧹 古い一時ファイルを削除: ${file}`);
        } catch (cleanupError) {
          console.warn(`⚠️ 一時ファイル削除失敗: ${file}`, cleanupError);
        }
      });
    } catch (cleanupError) {
      console.warn('⚠️ 一時ファイルクリーンアップ中にエラー:', cleanupError);
    }
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