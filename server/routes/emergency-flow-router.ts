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

// 応急処置フローの保存
router.post('/save-flow', async (req: Request, res: Response) => {
  try {
    const flowData = req.body;

    if (!flowData || !flowData.id || !flowData.title) {
      return res.status(400).json({
        success: false,
        error: '無効なフローデータです'
      });
    }

    // ディレクトリ存在確認
    const jsonDir = path.join(process.cwd(), 'knowledge-base', 'json');
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }

    // フローIDとタイムスタンプでファイル名を生成
    const timestamp = Date.now();
    const fileName = `flow_${timestamp}.json`;
    const filePath = path.join(jsonDir, fileName);

    // メタデータファイル名
    const metadataFileName = `flow_${timestamp}_metadata.json`;
    const metadataFilePath = path.join(jsonDir, metadataFileName);

    // フローデータをJSON形式で保存
    fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2));

    // メタデータを作成
    const metadata = {
      id: `flow_${timestamp}`,
      filePath: filePath,
      fileName: fileName,
      title: flowData.title,
      description: flowData.description || '',
      createdAt: new Date().toISOString(),
      type: 'flow',
      nodeCount: flowData.nodes ? flowData.nodes.length : 0,
      edgeCount: flowData.edges ? flowData.edges.length : 0
    };

    // メタデータをJSON形式で保存
    fs.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));

    // インデックスファイルを更新
    updateIndexFile(metadata);

    log(`フローデータを保存しました: ${fileName}`);

    return res.status(200).json({
      success: true,
      id: metadata.id,
      message: 'フローデータが保存されました'
    });
  } catch (error) {
    console.error('フロー保存エラー:', error);
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

    if (!id) {
      return res.status(400).json({ success: false, error: 'フローIDが指定されていません' });
    }

    console.log(`🔍 フロー詳細取得: ID=${id}`);

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    console.log(`📁 ファイルパス: ${filePath}`);
    console.log(`📄 ファイル存在: ${fs.existsSync(filePath)}`);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ ファイルが見つかりません: ${filePath}`);
      return res.status(404).json({ success: false, error: 'フローが見つかりません' });
    }

    // ファイルを毎回新しく読み込み（キャッシュ無し）
    const content = fs.readFileSync(filePath, 'utf-8');
    const flowData = JSON.parse(content);

    console.log(`✅ フロー読み込み完了: ID=${flowData.id}, タイトル=${flowData.title}`);

    // 強力なキャッシュ無効化ヘッダー
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Fresh-Load': 'true',
      'X-Timestamp': Date.now().toString()
    });

    return res.status(200).json(flowData);
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