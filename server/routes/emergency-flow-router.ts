import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { log } from '../vite';
import fsPromises from 'fs/promises';

const router = express.Router();

// トラブルシューティングデータを更新（新しいエンドポイント）
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const flowData = req.body;

    console.log(`💾 フロー保存: ID=${id}, タイトル="${flowData?.title}"`);

    if (!flowData || !flowData.title) {
      return res.status(400).json({ success: false, error: '無効なフローデータです' });
    }

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    // 保存データを準備
    const saveData = {
      ...flowData,
      id: id,
      updatedAt: new Date().toISOString()
    };

    // ファイルに書き込み
    fs.writeFileSync(filePath, JSON.stringify(saveData, null, 2));

    console.log(`✅ 保存完了: ${filePath}`);

    return res.status(200).json({
      success: true,
      id: id,
      message: 'フローが正常に更新されました',
      data: saveData
    });
  } catch (error) {
    console.error('❌ フロー更新エラー:', error);
    return res.status(500).json({
      success: false,
      error: 'フローの更新中にエラーが発生しました'
    });
  }
});

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

    let targetFilePath;

    if (filePath) {
      // 🎯 指定されたパスに保存（相対パスを絶対パスに変換）
      targetFilePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(process.cwd(), filePath);
      
      console.log(`🎯 指定されたパスに保存: ${targetFilePath}`);
    } else {
      // フォールバック: troubleshootingディレクトリに保存
      const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
      if (!fs.existsSync(troubleshootingDir)) {
        fs.mkdirSync(troubleshootingDir, { recursive: true });
      }
      targetFilePath = path.join(troubleshootingDir, `${flowData.id}.json`);
      
      console.log(`📁 デフォルトパスに保存: ${targetFilePath}`);
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

    console.log(`✅ 保存完了: ${targetFilePath}`);

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

// フロー一覧取得
router.get('/list', async (req, res) => {
  try {
    console.log('📋 フロー一覧取得リクエスト受信');

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');

    // ディレクトリが存在するか確認
    if (!fs.existsSync(troubleshootingDir)) {
      console.log('⚠️ troubleshootingディレクトリが存在しません');
      return res.json([]);
    }

    const flows = [];

    // troubleshootingディレクトリから直接JSONファイルを取得
    const troubleshootingFiles = fs.readdirSync(troubleshootingDir);
    const troubleshootingFlowFiles = troubleshootingFiles.filter(file => 
      file.endsWith('.json') && !file.includes('.backup')
    );
    console.log(`📁 troubleshootingDirから${troubleshootingFlowFiles.length}個のJSONファイルを検出:`, troubleshootingFlowFiles);

    // troubleshootingディレクトリのファイルを処理
    for (const file of troubleshootingFlowFiles) {
      try {
        const filePath = path.join(troubleshootingDir, file);

        // ファイルの存在確認
        if (!fs.existsSync(filePath)) {
          console.log(`⚠️ ファイルが存在しません: ${filePath}`);
          continue;
        }

        // ファイル統計情報を取得
        const stats = fs.statSync(filePath);

        const content = fs.readFileSync(filePath, 'utf8');
        const flowData = JSON.parse(content);

        const flowItem = {
          id: flowData.id || path.basename(file, '.json'),
          title: flowData.title || 'タイトルなし',
          description: flowData.description || '',
          fileName: file,
          trigger: flowData.triggerKeywords || [],
          slides: flowData.steps || [],
          createdAt: flowData.updatedAt || stats.mtime.toISOString(),
          fileSize: stats.size,
          lastModified: stats.mtime.toISOString()
        };

        flows.push(flowItem);
        console.log(`✅ フロー追加: ${flowItem.id} (${flowItem.title})`);
      } catch (error) {
        console.error(`❌ ファイル ${file} の処理エラー:`, error);
      }
    }

    console.log(`✅ 合計${flows.length}個のフローを返却します`);

    // キャッシュ回避のためのヘッダーを設定
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json(flows);

  } catch (error) {
    console.error('❌ フロー一覧取得エラー:', error);
    res.status(500).json({ 
      error: 'フロー一覧の取得に失敗しました',
      details: error.message 
    });
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
    let targetFilePath = null;
    let targetFlowData = null;

    // 🎯 ファイル名が指定されている場合は優先して使用
    if (fileName && typeof fileName === 'string') {
      const specifiedPath = path.join(troubleshootingDir, fileName);
      if (fs.existsSync(specifiedPath)) {
        try {
          const content = fs.readFileSync(specifiedPath, 'utf-8');
          const data = JSON.parse(content);
          targetFilePath = specifiedPath;
          targetFlowData = data;
          console.log(`✅ 指定ファイルで発見: ${fileName} (ID: ${data.id})`);
        } catch (error) {
          console.warn(`⚠️ 指定ファイル ${fileName} の読み込みエラー:`, error);
        }
      }
    }

    // ファイル名指定で見つからない場合は全ファイル検索
    if (!targetFlowData && fs.existsSync(troubleshootingDir)) {
      const files = fs.readdirSync(troubleshootingDir).filter(f => f.endsWith('.json'));
      console.log(`📁 利用可能なファイル: ${files.join(', ')}`);

      for (const file of files) {
        try {
          const filePath = path.join(troubleshootingDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          // IDが一致するファイルを探す
          if (data.id === id) {
            targetFilePath = filePath;
            targetFlowData = data;
            console.log(`✅ ID一致ファイル発見: ${file} (ID: ${data.id})`);
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
      if (fs.existsSync(directPath)) {
        try {
          const content = fs.readFileSync(directPath, 'utf-8');
          const data = JSON.parse(content);
          targetFlowData = data;
          targetFilePath = directPath;
          console.log(`✅ 直接パスで発見: ${id}.json`);
        } catch (error) {
          console.warn(`⚠️ 直接パス読み込みエラー:`, error);
        }
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

// フローの削除
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