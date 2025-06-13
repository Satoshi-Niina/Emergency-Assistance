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

    // ファイル統計情報を先に取得
    const stats = fs.statSync(filePath);
    console.log(`📊 ファイル情報: size=${stats.size}, modified=${stats.mtime.toISOString()}`);

    if (stats.size === 0) {
      console.log(`❌ ファイルが空です: ${filePath}`);
      return res.status(404).json({ 
        error: 'ファイルが空です',
        id,
        filePath
      });
    }

    console.log(`📁 ファイル発見: ${filePath}`);

    // ⭐ 強化されたファイル読み込み処理
    let content: string;
    let data: any;

    try {
      // ファイル内容を複数回読み込んで検証
      content = fs.readFileSync(filePath, 'utf8');
      console.log(`📄 ファイル読み込み完了: ${content.length}文字`);

      // JSON解析前にファイル内容の一部を確認
      const contentPreview = content.substring(0, 200) + (content.length > 200 ? '...' : '');
      console.log(`📝 ファイル内容プレビュー: ${contentPreview}`);

      // 厳密なJSON検証
      data = JSON.parse(content);
      console.log(`✅ JSON解析成功`);

    } catch (parseError) {
      console.error(`❌ JSON解析エラー:`, parseError);
      return res.status(500).json({ 
        error: 'ファイルのJSON解析に失敗しました',
        parseError: parseError instanceof Error ? parseError.message : String(parseError)
      });
    }

    // データの完全性チェックと修復
    if (!data) {
      console.log(`❌ データが空です: ${id}`);
      return res.status(404).json({ error: 'データが見つかりません' });
    }

    if (!data.steps) {
      console.log(`⚠️ stepsプロパティが存在しません。空配列で初期化します。`);
      data.steps = [];
    }

    if (!data.triggerKeywords) {
      console.log(`⚠️ triggerKeywordsプロパティが存在しません。空配列で初期化します。`);
      data.triggerKeywords = [];
    }

    // ⭐ ステップデータの詳細検証
    const stepsCount = data.steps.length;
    const allStepIds = data.steps.map(s => s.id);
    const stepTypes = data.steps.map(s => ({ id: s.id, type: s.type, title: s.title }));

    console.log(`🔍 詳細データ検証:`, {
      originalFileSize: stats.size,
      readContentLength: content.length,
      parsedStepsCount: stepsCount,
      expectedMinSteps: 10,
      dataIntegrityCheck: stepsCount >= 9,
      allStepIds,
      stepTypes,
      hasRequiredFields: !!(data.id && data.title),
      dataStructure: {
        id: data.id,
        title: data.title,
        description: data.description?.substring(0, 50) + '...'
      }
    });

    // ⚠️ 重要：ステップ数が期待値より少ない場合の警告
    if (stepsCount < 10) {
      console.warn(`⚠️ ステップ数が期待値より少ない: 実際=${stepsCount}, 期待値=10以上`);
      console.warn(`🔍 missing steps検証のため、ファイル内容再確認...`);

      // ファイル内容に不足しているステップIDを探索
      const expectedStepIds = ['start', 'step1', 'decision1', 'step2a', 'step2b', 'step3a', 'step3b', 'step3c', 'step3d', 'step3e', 'step3f', 'step3g', 'decision2', 'step_success', 'step_failure'];
      const missingSteps = expectedStepIds.filter(expectedId => !allStepIds.includes(expectedId));

      console.warn(`❌ 不足しているステップID:`, missingSteps);
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

// フロー削除エンドポイント
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ フロー削除: ID=${id}`);

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ 削除対象ファイルが存在しません: ${filePath}`);
      return res.status(404).json({ error: 'ファイルが見つかりません' });
    }

    // ファイルを削除
    fs.unlinkSync(filePath);
    console.log(`✅ ファイル削除完了: ${filePath}`);

    res.json({ 
      success: true, 
      message: 'ファイルが削除されました',
      deletedFile: `${id}.json`
    });
  } catch (error) {
    console.error('❌ ファイル削除エラー:', error);
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