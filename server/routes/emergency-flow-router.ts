import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { log } from '../vite';
import fsPromises from 'fs/promises';

const router = express.Router();

const TROUBLESHOOTING_DIR = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');


// トラブルシューティングデータを更新
router.put('/update-troubleshooting/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'IDが指定されていません'
      });
    }

    // IDがts_から始まる場合、prefixを削除
    const fileId = id.startsWith('ts_') ? id.replace('ts_', '') : id;

    // トラブルシューティングディレクトリのパス
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    if (!fs.existsSync(troubleshootingDir)) {
      fs.mkdirSync(troubleshootingDir, { recursive: true });
    }

    // ファイルパス
    const filePath = path.join(troubleshootingDir, `${fileId}.json`);

    // リクエストボディからデータを取得
    const troubleshootingData = req.body;

    // バックアップを作成（既存ファイルがある場合）
    if (fs.existsSync(filePath)) {
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.copyFileSync(filePath, backupPath);
      log(`バックアップ作成: ${backupPath}`);
    }

    // 更新日時を設定
    troubleshootingData.updatedAt = new Date().toISOString();
    troubleshootingData.savedTimestamp = Date.now();

    // ファイルに書き込み
    fs.writeFileSync(filePath, JSON.stringify(troubleshootingData, null, 2));

    // 書き込み確認
    const verifyContent = fs.readFileSync(filePath, 'utf-8');
    const parsedContent = JSON.parse(verifyContent);

    log(`トラブルシューティングデータを更新しました: ${fileId}.json`);
    log(`保存されたデータ確認: ID=${parsedContent.id}, ステップ数=${parsedContent.steps?.length || 0}`);

    return res.status(200).json({
      success: true,
      message: 'トラブルシューティングデータが更新されました',
      savedData: {
        id: parsedContent.id,
        title: parsedContent.title,
        stepCount: parsedContent.steps?.length || 0,
        savedTimestamp: parsedContent.savedTimestamp
      }
    });
  } catch (error) {
    console.error('トラブルシューティング更新エラー:', error);
    return res.status(500).json({
      success: false,
      error: 'トラブルシューティングデータの更新中にエラーが発生しました'
    });
  }
});

// 応急処置フローの保存（指定されたパスに上書き保存）
router.post('/save-flow', async (req: Request, res: Response) => {
  try {
    const { filePath, ...flowData } = req.body;

    console.log(`💾 ファイルパス指定保存: ${filePath}`);
    console.log(`📊 フローデータ: ID=${flowData.id}, タイトル="${flowData.title}"`);

    if (!flowData || !flowData.id || !flowData.title) {
      return res.status(400).json({
        success: false,
        error: '無効なフローデータです'
      });
    }

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'ファイルパスが指定されていません'
      });
    }

    // 🎯 指定されたパスに確実に保存
    const targetFilePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(process.cwd(), filePath);

    console.log(`🎯 保存先: ${targetFilePath}`);
    console.log(`🔍 既存ファイル: ${fs.existsSync(targetFilePath)}`);

    // 元のファイル情報を取得（編集前のステップ数を記録）
    let originalStepsCount = 0;
    if (fs.existsSync(targetFilePath)) {
      try {
        const originalContent = fs.readFileSync(targetFilePath, 'utf-8');
        const originalData = JSON.parse(originalContent);
        originalStepsCount = originalData.steps?.length || 0;
        console.log(`📊 編集前のステップ数: ${originalStepsCount}`);
      } catch (error) {
        console.warn(`⚠️ 元ファイル読み込みエラー:`, error);
      }
    }

    // ディレクトリが存在することを確認
    const targetDir = path.dirname(targetFilePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`📁 ディレクトリ作成: ${targetDir}`);
    }

    // 保存データを準備
    const saveData = {
      ...flowData,
      updatedAt: new Date().toISOString(),
      savedTimestamp: Date.now()
    };

    // 🎯 指定されたパスに直接上書き保存
    fs.writeFileSync(targetFilePath, JSON.stringify(saveData, null, 2));

    // 💡 保存後の確実な検証
    if (fs.existsSync(targetFilePath)) {
      const savedContent = fs.readFileSync(targetFilePath, 'utf-8');
      const savedData = JSON.parse(savedContent);
      const newStepsCount = savedData.steps?.length || 0;

      console.log(`✅ 保存完了: ${targetFilePath}`);
      console.log(`🔍 保存内容検証:`, {
        savedId: savedData.id,
        savedTitle: savedData.title,
        originalStepsCount: originalStepsCount,
        newStepsCount: newStepsCount,
        stepsChanged: originalStepsCount !== newStepsCount,
        savedUpdatedAt: savedData.updatedAt,
        fileSize: savedContent.length
      });

      // ファイル一覧の強制更新イベントを発生
      console.log(`🔄 ファイル更新完了 - 一覧更新イベント発生予定`);
    } else {
      throw new Error('ファイルの保存に失敗しました');
    }

    return res.status(200).json({
      success: true,
      id: flowData.id,
      message: 'フローデータが正常に保存されました',
      filePath: targetFilePath,
      data: saveData
    });
  } catch (error) {
    console.error('❌ フロー保存エラー:', error);
    return res.status(500).json({
      success: false,
      error: 'フローデータの保存中にエラーが発生しました'
    });
  }
});

// インデックスファイルを更新
function updateIndexFile(metadata: any) {
  try {
    const indexPath = path.join(process.cwd(), 'knowledge-base', 'index.json');
    let indexData: any = { lastUpdated: new Date().toISOString(), guides: [], fileCount: 0 };

    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      indexData = JSON.parse(indexContent);
    }

    // 既存のガイドリストを更新
    const existingIndex = indexData.guides.findIndex((g: any) => g.id === metadata.id);
    if (existingIndex >= 0) {
      indexData.guides[existingIndex] = metadata;
    } else {
      indexData.guides.push(metadata);
    }

    // ファイル数を更新
    indexData.fileCount = indexData.guides.length;
    indexData.lastUpdated = new Date().toISOString();

    // インデックスファイルを書き込み
    fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
    log(`インデックスファイルを更新しました: ${indexData.fileCount}件のガイド`);
  } catch (error) {
    console.error('インデックスファイル更新エラー:', error);
  }
}

// 削除: POST /saveエンドポイントは不要（PUTに統一）

// フロー一覧を取得するエンドポイント（knowledge-base/troubleshootingからのみ）
router.get('/list', (req, res) => {
  try {
    console.log('🔍 緊急フロー一覧取得を開始 (troubleshootingディレクトリのみ)');

    // knowledge-base/troubleshootingディレクトリのみを対象とする
    if (!fs.existsSync(TROUBLESHOOTING_DIR)) {
      console.log(`❗ troubleshootingディレクトリが存在しません: ${TROUBLESHOOTING_DIR}`);
      return res.json([]);
    }

    // JSONファイルのみを取得（古いファイルを除外）
    const files = fs.readdirSync(TROUBLESHOOTING_DIR)
      .filter(file => {
        // JSONファイルのみ
        if (!file.endsWith('.json')) return false;

        // 古いファイルを明示的に除外
        const excludeFiles = [
          'engine_restart_issue.json',
          'parking_brake_release_issue.json'
        ];

        if (excludeFiles.includes(file)) {
          console.log(`🚫 古いファイルを除外: ${file}`);
          return false;
        }

        return true;
      })
      .sort();

    console.log(`📁 発見されたファイル数: ${files.length}`, files);

    const flows = files.map(fileName => {
      try {
        const filePath = path.join(TROUBLESHOOTING_DIR, fileName);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);

        // 基本的なフロー情報を返す
        return {
          id: data.id || path.basename(fileName, '.json'),
          title: data.title || fileName,
          description: data.description || '',
          fileName: fileName,
          createdAt: data.createdAt || new Date().toISOString(),
          trigger: data.triggerKeywords || data.trigger || [],
          slides: data.steps || data.slides || []
        };
      } catch (parseError) {
        console.error(`❌ ファイル解析エラー: ${fileName}`, parseError);
        return null;
      }
    }).filter(flow => flow !== null);

    console.log(`✅ 処理済みフロー数: ${flows.length} (troubleshootingディレクトリのみ)`);

    // キャッシュ無効化ヘッダーを設定
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json(flows);
  } catch (error) {
    console.error('❌ フロー一覧取得エラー:', error);
    res.status(500).json({ error: 'フロー一覧の取得に失敗しました' });
  }
});

// フロー詳細の取得
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fileName } = req.query;

    if (!id) {
      return res.status(400).json({ success: false, error: 'フローIDが指定されていません' });
    }

    console.log(`🔍 フロー詳細取得: 要求ID=${id}, ファイル名=${fileName}`);

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    console.log(`📁 troubleshootingディレクトリ: ${troubleshootingDir}`);
    let targetFilePath = null;
    let targetFlowData = null;

    // 🎯 ファイル名が指定されている場合は優先して使用
    if (fileName && typeof fileName === 'string') {
      const specifiedPath = path.join(troubleshootingDir, fileName);
      console.log(`🎯 指定ファイル優先読み込み: ${fileName} -> ${specifiedPath}`);
      console.log(`🔍 ファイル存在確認: ${fs.existsSync(specifiedPath)}`);

      if (fs.existsSync(specifiedPath)) {
        try {
          const content = fs.readFileSync(specifiedPath, 'utf-8');
          const data = JSON.parse(content);
          targetFilePath = specifiedPath;
          targetFlowData = data;
          console.log(`✅ 指定ファイルで発見: ${fileName} (ID: ${data.id}, ステップ数: ${data.steps?.length || 0})`);

          // 強制的にリターンして他の検索をスキップ
          console.log(`🎯 指定ファイル読み込み完了 - 他の検索をスキップ`);
        } catch (error) {
          console.warn(`⚠️ 指定ファイル ${fileName} の読み込みエラー:`, error);
        }
      } else {
        console.warn(`⚠️ 指定ファイルが存在しません: ${specifiedPath}`);
      }
    }

    // 🚀 指定ファイルで見つかった場合は早期リターン
    if (targetFlowData && fileName) {
      console.log(`🎯 指定ファイル処理完了 - 早期リターン`);

      // データの整合性チェック
      if (targetFlowData.id !== id) {
        console.warn(`⚠️ ID不一致を修正: 要求=${id}, 実際=${targetFlowData.id}`);
        targetFlowData.id = id;
      }

      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Fresh-Load': 'true',
        'X-Timestamp': Date.now().toString(),
        'X-Request-ID': id,
        'X-Found-ID': targetFlowData.id,
        'X-Target-File': path.basename(targetFilePath),
        'X-File-Path': targetFilePath,
        'X-Steps-Count': (targetFlowData.steps?.length || 0).toString()
      });

      return res.status(200).json(targetFlowData);
    }

    // ファイル名指定で見つからない場合は全ファイル検索（バックアップファイルを除外）
    if (!targetFlowData && fs.existsSync(troubleshootingDir)) {
      const files = fs.readdirSync(troubleshootingDir)
        .filter(f => f.endsWith('.json') && !f.includes('.backup'));
      console.log(`📁 利用可能なファイル: ${files.join(', ')}`);

      for (const file of files) {
        try {
          const filePath = path.join(troubleshootingDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);

          console.log(`🔍 ファイル確認: ${file} (ID: ${data.id})`);

          // IDが一致するファイルを探す
          if (data.id === id) {
            targetFilePath = filePath;
            targetFlowData = data;
            console.log(`✅ ID一致ファイル発見: ${file} (ID: ${data.id}, ステップ数: ${data.steps?.length || 0})`);
            break;
          }
        } catch (error) {
          console.warn(`⚠️ ファイル ${file} の読み込みエラー:`, error);
        }
      }
    }

    // 直接ファイル名でも試す（フォールバック）
    if (!targetFlowData) {
      const directPath = path.join(troubleshootingDir, `${id}.json`);
      console.log(`🔍 直接パス確認: ${directPath}`);

      if (fs.existsSync(directPath)) {
        try {
          const content = fs.readFileSync(directPath, 'utf-8');
          const data = JSON.parse(content);
          targetFlowData = data;
          targetFilePath = directPath;
          console.log(`✅ 直接パスで発見: ${id}.json (ステップ数: ${data.steps?.length || 0})`);
        } catch (error) {
          console.warn(`⚠️ 直接パス読み込みエラー:`, error);
        }
      } else {
        console.warn(`⚠️ 直接パスファイルが存在しません: ${directPath}`);
      }
    }

    if (!targetFlowData) {
      console.log(`❌ フローが見つかりません: ID=${id}, ファイル名=${fileName}`);
      return res.status(404).json({ success: false, error: 'フローが見つかりません' });
    }

    console.log(`✅ フロー読み込み完了:`, {
      requestedId: id,
      requestedFileName: fileName,
      foundId: targetFlowData.id,
      title: targetFlowData.title,
      filePath: targetFilePath,
      stepsCount: targetFlowData.steps?.length || 0,
      fileName: path.basename(targetFilePath)
    });

    // データの整合性チェック
    if (targetFlowData.id !== id) {
      console.warn(`⚠️ ID不一致: 要求=${id}, 実際=${targetFlowData.id}`);
      // IDを要求されたものに修正
      targetFlowData.id = id;
    }

    // 強力なキャッシュ無効化ヘッダー
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Fresh-Load': 'true',
      'X-Timestamp': Date.now().toString(),
      'X-Request-ID': id,
      'X-Found-ID': targetFlowData.id,
      'X-Target-File': path.basename(targetFilePath),
      'X-File-Path': targetFilePath
    });

    return res.status(200).json(targetFlowData);
  } catch (error) {
    console.error('❌ フロー詳細取得エラー:', error);
    return res.status(500).json({
      success: false,
      error: 'フロー詳細の取得中にエラーが発生しました'
    });
  }
});

// 特定フローデータ取得エンドポイント
router.get('/get/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const timestamp = Date.now();

    console.log(`🔄 [${timestamp}] フローデータ取得: ID=${id}`);

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    console.log(`📁 ファイルパス確認: ${filePath}`);
    console.log(`📁 ファイル存在確認: ${fs.existsSync(filePath)}`);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ ファイルが見つかりません: ${filePath}`);
      return res.status(404).json({ 
        error: 'ファイルが見つかりません',
        id,
        filePath,
        availableFiles: fs.existsSync(troubleshootingDir) ? fs.readdirSync(troubleshootingDir) : []
      });
    }

    const stats = fs.statSync(filePath);
    console.log(`📊 ファイル情報: size=${stats.size}, modified=${stats.mtime.toISOString()}`);

    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    console.log(`✅ データ読み込み完了:`, {
      id: data.id,
      title: data.title,
      stepsCount: data.steps?.length || 0
    });

    // 最強のキャッシュ無効化ヘッダー
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${timestamp}-${Math.random().toString(36)}"`,
    });

    res.json({
      ...data,
      loadedAt: new Date().toISOString(),
      requestTimestamp: timestamp,
      filePath: filePath
    });
  } catch (error) {
    console.error('❌ フローデータ取得エラー:', error);
    res.status(500).json({ error: 'データの取得に失敗しました' });
  }
});

// フロー保存エンドポイント  
router.post('/save/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const saveData = req.body;

    console.log(`💾 フローデータ保存開始: ID=${id}`, {
      title: saveData.title,
      stepsCount: saveData.steps?.length || 0,
      timestamp: saveData.savedTimestamp || 'N/A'
    });

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    if (!fs.existsSync(troubleshootingDir)) {
      fs.mkdirSync(troubleshootingDir, { recursive: true });
    }

    // 既存ファイルのバックアップを作成
    if (fs.existsSync(filePath)) {
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.copyFileSync(filePath, backupPath);
      console.log(`📋 バックアップ作成: ${backupPath}`);
    }

    const finalSaveData = {
      ...saveData,
      updatedAt: new Date().toISOString(),
      savedTimestamp: saveData.savedTimestamp || Date.now()
    };

    // 原子的書き込み
    const tempFilePath = `${filePath}.tmp.${Date.now()}`;
    const saveDataString = JSON.stringify(finalSaveData, null, 2);

    fs.writeFileSync(tempFilePath, saveDataString, 'utf8');

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
      fileSize: savedContent.length
    });

    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
      'Last-Modified': new Date().toUTCString()
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
    console.error('❌ フロー保存エラー:', error);
    res.status(500).json({ error: 'データの保存に失敗しました' });
  }
});

// フロー削除エンドポイント
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'フローIDが指定されていません'
      });
    }

    // トラブルシューティングIDの場合
    if (id.startsWith('ts_')) {
      const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
      const filename = id.replace('ts_', '') + '.json';
      const filePath = path.join(troubleshootingDir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: '指定されたトラブルシューティングファイルが見つかりません'
        });
      }

      // ファイルの削除
      fs.unlinkSync(filePath);

      log(`トラブルシューティングフローを削除しました: ${filename}`);

      return res.status(200).json({
        success: true,
        message: 'トラブルシューティングファイルが削除されました'
      });
    } else {
      // 通常のフローファイルの場合
      const jsonDir = path.join(process.cwd(), 'knowledge-base', 'json');
      const metadataPath = path.join(jsonDir, `${id}_metadata.json`);

      if (!fs.existsSync(metadataPath)) {
        return res.status(404).json({
          success: false,
          error: '指定されたフローが見つかりません'
        });
      }

      // メタデータからファイル名を取得
      const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);
      const flowPath = path.join(jsonDir, metadata.fileName);

      // ファイルの削除
      if (fs.existsSync(flowPath)) {
        fs.unlinkSync(flowPath);
      }

      // メタデータファイルの削除
      fs.unlinkSync(metadataPath);

      // インデックスファイルを更新
      updateIndexFileAfterDelete(id);

      log(`フローを削除しました: ${id}`);

      return res.status(200).json({
        success: true,
        message: 'フローが削除されました'
      });
    }
  } catch (error) {
    console.error('フロー削除エラー:', error);
    return res.status(500).json({
      success: false,
      error: 'フローの削除中にエラーが発生しました'
    });
  }
});

// 削除後にインデックスファイルを更新
function updateIndexFileAfterDelete(id: string) {
  try {
    const indexPath = path.join(process.cwd(), 'knowledge-base', 'index.json');

    if (!fs.existsSync(indexPath)) {
      return;
    }

    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    let indexData = JSON.parse(indexContent);

    // 削除されたガイドを除外
    indexData.guides = indexData.guides.filter((guide: any) => guide.id !== id);

    // ファイル数を更新
    indexData.fileCount = indexData.guides.length;
    indexData.lastUpdated = new Date().toISOString();

    // インデックスファイルを書き込み
    fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
    log(`インデックスファイルを更新しました（削除後）: ${indexData.fileCount}件のガイド`);
  } catch (error) {
    console.error('インデックスファイル更新エラー（削除後）:', error);
  }
}

export const emergencyFlowRouter = router;