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

    console.log(`🔧 保存リクエスト受信: ID=${id}`);
    console.log(`📄 受信データ: タイトル="${flowData?.title}", ステップ数=${flowData?.steps?.length || 0}`);

    if (!flowData || !flowData.title) {
      return res.status(400).json({
        success: false,
        error: '無効なフローデータです'
      });
    }

    // トラブルシューティングディレクトリから検索
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const fileName = `${id}.json`;
    const filePath = path.join(troubleshootingDir, fileName);

    console.log(`📁 保存先パス: ${filePath}`);
    console.log(`📂 ディレクトリ存在確認: ${fs.existsSync(troubleshootingDir)}`);
    console.log(`📄 ファイル存在確認: ${fs.existsSync(filePath)}`);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ ファイルが見つかりません: ${filePath}`);
      return res.status(404).json({
        success: false,
        error: '指定されたフローが見つかりません'
      });
    }

    // 保存前のファイル状態を確認
    const beforeStats = fs.statSync(filePath);
    const beforeContent = fs.readFileSync(filePath, 'utf-8');
    const beforeData = JSON.parse(beforeContent);
    
    console.log(`📊 保存前の状態:`);
    console.log(`  - ファイルサイズ: ${beforeStats.size} bytes`);
    console.log(`  - 最終更新: ${beforeStats.mtime.toISOString()}`);
    console.log(`  - ステップ数: ${beforeData.steps?.length || 0}`);
    console.log(`  - タイトル: "${beforeData.title}"`);

    // 保存データを準備
    const saveData = {
      ...flowData,
      id: id,
      updatedAt: new Date().toISOString(),
      savedTimestamp: Date.now()
    };

    console.log(`💾 保存データ準備完了:`);
    console.log(`  - ID: ${saveData.id}`);
    console.log(`  - タイトル: "${saveData.title}"`);
    console.log(`  - ステップ数: ${saveData.steps?.length || 0}`);
    console.log(`  - 保存タイムスタンプ: ${saveData.savedTimestamp}`);

    // バックアップを作成
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`📦 バックアップ作成: ${backupPath}`);

    // ファイルを更新
    const saveContent = JSON.stringify(saveData, null, 2);
    console.log(`📝 保存するJSONサイズ: ${saveContent.length} characters`);
    
    fs.writeFileSync(filePath, saveContent);
    console.log(`✅ ファイル書き込み完了`);

    // 保存後のファイル状態を確認
    const afterStats = fs.statSync(filePath);
    const afterContent = fs.readFileSync(filePath, 'utf-8');
    const afterData = JSON.parse(afterContent);
    
    console.log(`📊 保存後の状態:`);
    console.log(`  - ファイルサイズ: ${afterStats.size} bytes (変更: ${afterStats.size - beforeStats.size})`);
    console.log(`  - 最終更新: ${afterStats.mtime.toISOString()}`);
    console.log(`  - ステップ数: ${afterData.steps?.length || 0}`);
    console.log(`  - タイトル: "${afterData.title}"`);
    console.log(`  - 保存タイムスタンプ: ${afterData.savedTimestamp}`);

    // 内容が実際に変更されたか確認
    const contentChanged = beforeContent !== afterContent;
    const fileTimeChanged = afterStats.mtime.getTime() !== beforeStats.mtime.getTime();
    
    console.log(`🔍 変更確認:`);
    console.log(`  - 内容変更: ${contentChanged}`);
    console.log(`  - ファイル時刻変更: ${fileTimeChanged}`);

    if (!contentChanged) {
      console.log(`⚠️ 警告: ファイル内容が変更されていません！`);
    }

    if (!fileTimeChanged) {
      console.log(`⚠️ 警告: ファイルのタイムスタンプが変更されていません！`);
    }

    // ディレクトリ内の全ファイルを確認
    const dirFiles = fs.readdirSync(troubleshootingDir);
    console.log(`📂 ディレクトリ内のファイル一覧:`, dirFiles);

    log(`フローを更新しました: ${fileName}`);
    log(`保存されたデータ確認: ID=${afterData.id}, ステップ数=${afterData.steps?.length || 0}`);

    // キャッシュを無効化するヘッダーを設定
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': afterStats.mtime.toUTCString(),
      'ETag': `"${afterStats.mtime.getTime()}-${afterStats.size}"`
    });

    return res.status(200).json({
      success: true,
      id: id,
      message: 'フローが正常に更新されました',
      debug: {
        filePath,
        beforeSize: beforeStats.size,
        afterSize: afterStats.size,
        beforeSteps: beforeData.steps?.length || 0,
        afterSteps: afterData.steps?.length || 0,
        contentChanged,
        fileTimeChanged,
        savedTimestamp: afterData.savedTimestamp
      },
      savedData: {
        id: afterData.id,
        title: afterData.title,
        stepCount: afterData.steps?.length || 0,
        savedTimestamp: afterData.savedTimestamp
      },
      updatedData: afterData // 完全なデータも返す
    });
  } catch (error) {
    console.error('❌ フロー更新エラー:', error);
    return res.status(500).json({
      success: false,
      error: 'フローの更新中にエラーが発生しました',
      errorDetails: error.message
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

// フロー保存エンドポイント
router.post('/save', async (req: Request, res: Response) => {
  try {
    const flowData = req.body;

    if (!flowData || !flowData.id || !flowData.title) {
      return res.status(400).json({
        success: false,
        error: '無効なフローデータです'
      });
    }

    // トラブルシューティングディレクトリを使用
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    if (!fs.existsSync(troubleshootingDir)) {
      fs.mkdirSync(troubleshootingDir, { recursive: true });
    }

    // ファイル名を生成
    const fileName = `${flowData.id}.json`;
    const filePath = path.join(troubleshootingDir, fileName);

    // 保存データを準備
    const saveData = {
      ...flowData,
      updatedAt: new Date().toISOString(),
      savedTimestamp: Date.now()
    };

    // ファイルに保存
    fs.writeFileSync(filePath, JSON.stringify(saveData, null, 2));

    log(`新しいフローを保存しました: ${fileName}`);

    return res.status(200).json({
      success: true,
      id: flowData.id,
      message: 'フローが正常に保存されました',
      filePath: filePath
    });
  } catch (error) {
    console.error('フロー保存エラー:', error);
    return res.status(500).json({
      success: false,
      error: 'フローの保存中にエラーが発生しました'
    });
  }
});

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
      return res.status(400).json({
        success: false,
        error: 'フローIDが指定されていません'
      });
    }

    // 強制的なキャッシュ無効化ヘッダーを先に設定
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toISOString(),
      'ETag': `"${Date.now()}-${Math.random()}"`,
      'X-Content-Type-Options': 'nosniff'
    });

    // まずトラブルシューティングディレクトリから直接IDで検索
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const directFilePath = path.join(troubleshootingDir, `${id}.json`);

    if (fs.existsSync(directFilePath)) {
      console.log(`🎯 直接ファイル発見: ${directFilePath}`);

      // ファイルシステムのキャッシュをクリア
      delete require.cache[directFilePath];

      const stats = fs.statSync(directFilePath);
      
      // ファイルを強制的に再読み込み
      let content;
      try {
        // 複数回読み込みを試行（ファイルシステムの遅延対策）
        content = fs.readFileSync(directFilePath, 'utf-8');
        
        // 空ファイルまたは不正なJSONの場合は再試行
        if (!content.trim() || content.trim().length < 10) {
          console.log('⚠️ ファイル内容が空またはが疑われます - 再試行...');
          await new Promise(resolve => setTimeout(resolve, 100));
          content = fs.readFileSync(directFilePath, 'utf-8');
        }
      } catch (readError) {
        console.error('❌ ファイル読み込みエラー:', readError);
        throw readError;
      }

      let flowData;
      try {
        flowData = JSON.parse(content);
      } catch (parseError) {
        console.error('❌ JSON解析エラー:', parseError);
        console.error('📄 ファイル内容の先頭100文字:', content.substring(0, 100));
        throw new Error('ファイルのJSON形式が不正です');
      }

      console.log(`📄 ファイル詳細情報:`);
      console.log(`  - パス: ${directFilePath}`);
      console.log(`  - サイズ: ${stats.size} bytes`);
      console.log(`  - 最終更新: ${stats.mtime.toISOString()}`);
      console.log(`  - アクセス時刻: ${stats.atime.toISOString()}`);
      console.log(`📊 読み込んだデータ詳細:`);
      console.log(`  - ID: ${flowData.id}`);
      console.log(`  - タイトル: "${flowData.title}"`);
      console.log(`  - ステップ数: ${flowData.steps?.length || 0}`);
      console.log(`  - updatedAt: ${flowData.updatedAt}`);
      console.log(`  - savedTimestamp: ${flowData.savedTimestamp}`);

      // レスポンスヘッダーでキャッシュ無効化を強化
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
        'Last-Modified': stats.mtime.toUTCString(),
        'ETag': `"${stats.mtime.getTime()}-${stats.size}-${Date.now()}"`,
        'X-Content-Type-Options': 'nosniff',
        'X-File-Modified': stats.mtime.toISOString(),
        'X-File-Size': stats.size.toString(),
        'X-Read-Timestamp': new Date().toISOString()
      });

      return res.status(200).json({
        id: id,
        data: flowData,
        timestamp: Date.now(),
        fileModified: stats.mtime.toISOString(),
        fileSize: stats.size,
        contentLength: content.length,
        source: 'direct',
        debug: {
          filePath: directFilePath,
          readTimestamp: new Date().toISOString(),
          fileStats: {
            size: stats.size,
            mtime: stats.mtime.toISOString(),
            atime: stats.atime.toISOString()
          }
        }
      });
    }

    // トラブルシューティングのIDか通常フローのIDかを判断
    if (id.startsWith('ts_')) {
      // トラブルシューティングファイルの場合
      const filename = id.replace('ts_', '') + '.json';
      const filePath = path.join(troubleshootingDir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: '指定されたトラブルシューティングファイルが見つかりません'
        });
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const flowData = JSON.parse(content);

      return res.status(200).json({
        id: id,
        data: flowData,
        timestamp: Date.now(),
        source: 'ts_prefix'
      });
    } else if (id === 'example_flow') {
      // サンプルフローの場合
      const jsonDir = path.join(process.cwd(), 'knowledge-base', 'json');
      const flowPath = path.join(jsonDir, 'example_flow.json');

      if (!fs.existsSync(flowPath)) {
        return res.status(404).json({
          success: false,
          error: 'サンプルフローファイルが見つかりません'
        });
      }

      const flowContent = fs.readFileSync(flowPath, 'utf-8');
      const flowData = JSON.parse(flowContent);

      return res.status(200).json({
        id: 'example_flow',
        data: flowData
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

      const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);

      const flowPath = path.join(jsonDir, metadata.fileName);

      if (!fs.existsSync(flowPath)) {
        return res.status(404).json({
          success: false,
          error: 'フローデータファイルが見つかりません'
        });
      }

      const flowContent = fs.readFileSync(flowPath, 'utf-8');
      const flowData = JSON.parse(flowContent);

      return res.status(200).json({
        id: metadata.id,
        data: flowData
      });
    }
  } catch (error) {
    console.error('フロー詳細取得エラー:', error);
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