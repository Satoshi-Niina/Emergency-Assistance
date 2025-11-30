import express from 'express';
import fs from 'fs';
import fsSync from 'fs';
import path from 'path';

const router = express.Router();

// バリデーションスキーマ
const createFlowSchema = {
  title: (value: string) =>
    value && value.length > 0 ? null : 'タイトルは必須です',
  jsonData: (value: any) => null, // オプショナル
};

/**
 * GET /api/flows
 * 応急処置フロー一覧を取得
 */
router.get('/', async (_req, res) => {
  try {
    console.log('🔄 応急処置フロー取得リクエスト');

    // トラブルシューティングディレクトリからJSONファイルを読み込み
    const troubleshootingDir = path.join(
      process.cwd(),
      '..',
      'knowledge-base',
      'troubleshooting'
    );
    console.log('🔍 トラブルシューティングディレクトリ:', troubleshootingDir);

    if (!fs.existsSync(troubleshootingDir)) {
      console.log('❌ トラブルシューティングディレクトリが存在しません');
      return res.json({
        success: true,
        flows: [],
        total: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const files = fs.readdirSync(troubleshootingDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    console.log('📄 JSONファイル:', jsonFiles);

    const flows = [];

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(troubleshootingDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const flowData = JSON.parse(fileContent);

        // フローデータを整形
        const flow = {
          id: flowData.id || file.replace('.json', ''),
          title: flowData.title || 'タイトルなし',
          description: flowData.description || '',
          fileName: file,
          filePath: `knowledge-base/troubleshooting/${file}`,
          createdAt: flowData.createdAt || new Date().toISOString(),
          updatedAt: flowData.updatedAt || new Date().toISOString(),
          triggerKeywords: flowData.triggerKeywords || flowData.trigger || [],
          category: flowData.category || '',
          steps: flowData.steps || [],
          dataSource: 'file',
        };

        flows.push(flow);
      } catch (error) {
        console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
      }
    }

    // 作成日時でソート
    flows.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    console.log(`✅ 応急処置フロー取得完了: ${flows.length}件`);

    res.json({
      success: true,
      flows: flows,
      total: flows.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ 応急処置フロー取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フローの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/flows
 * 新規応急処置フローを作成
 */
router.post('/', async (_req, res) => {
  try {
    console.log('🔄 新規応急処置フロー作成リクエスト');

    // トラブルシューティングディレクトリのパスを取得
    const troubleshootingDir = path.join(
      process.cwd(),
      '..',
      'knowledge-base',
      'troubleshooting'
    );

    if (!fs.existsSync(troubleshootingDir)) {
      fs.mkdirSync(troubleshootingDir, { recursive: true });
    }

    // 新しいIDを生成
    const newId = `flow_${Date.now()}`;
    const fileName = `${newId}.json`;
    const filePath = path.join(troubleshootingDir, fileName);

    // 新規フローデータを作成
    const newFlowData = {
      id: newId,
      title: req.body.title || '新規フロー',
      description: req.body.description || '',
      steps: req.body.steps || [],
      triggerKeywords: req.body.triggerKeywords || [],
      category: req.body.category || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dataSource: 'file',
      ...req.body,
    };

    // JSONファイルを保存
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && process.env.AZURE_STORAGE_CONNECTION_STRING) {
      // 本番環境: Azure BLOBに保存
      try {
        const { azureStorage } = await import('../azure-storage.js');
        const tempPath = path.join(require('os').tmpdir(), path.basename(filePath));
        fs.writeFileSync(tempPath, JSON.stringify(newFlowData, null, 2), 'utf-8');
        const blobName = `troubleshooting/${path.basename(filePath)}`;
        await azureStorage.uploadFile(tempPath, blobName);
        fs.unlinkSync(tempPath);
        console.log('✅ Azure BLOBにアップロード:', blobName);
      } catch (uploadError) {
        console.error('⚠️ Azure BLOBアップロードエラー:', uploadError);
        throw uploadError;
      }
    } else {
      // 開発環境: ローカルファイルに保存
      fs.writeFileSync(filePath, JSON.stringify(newFlowData, null, 2), 'utf-8');
      console.log('✅ ローカルファイルに保存（開発環境）:', filePath);
    }

    console.log('✅ 新規応急処置フロー作成完了:', newId);

    res.status(201).json({
      success: true,
      data: newFlowData,
      message: '応急処置フローが正常に作成されました',
    });
  } catch (error) {
    console.error('❌ 新規応急処置フロー作成エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フローの作成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/flows/:id
 * 特定の応急処置フローを取得
 */
router.get('/:id', async (_req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 応急処置フロー詳細取得: ${id}`);

    // トラブルシューティングディレクトリから該当するJSONファイルを検索
    const troubleshootingDir = path.join(
      process.cwd(),
      '..',
      'knowledge-base',
      'troubleshooting'
    );

    if (!fs.existsSync(troubleshootingDir)) {
      return res.status(404).json({
        success: false,
        error: 'トラブルシューティングディレクトリが見つかりません',
      });
    }

    const files = fs.readdirSync(troubleshootingDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    let flowData = null;
    let fileName = null;

    // IDに一致するファイルを検索
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(troubleshootingDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        if (data.id === id || file.replace('.json', '') === id) {
          flowData = data;
          fileName = file;
          break;
        }
      } catch (error) {
        console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
      }
    }

    if (!flowData) {
      return res.status(404).json({
        success: false,
        error: '応急処置フローが見つかりません',
      });
    }

    console.log('✅ 応急処置フロー詳細取得完了');

    res.json({
      success: true,
      data: {
        id: flowData.id,
        title: flowData.title || 'タイトルなし',
        description: flowData.description || '',
        fileName: fileName,
        filePath: `knowledge-base/troubleshooting/${fileName}`,
        createdAt: flowData.createdAt || new Date().toISOString(),
        updatedAt: flowData.updatedAt || new Date().toISOString(),
        triggerKeywords: flowData.triggerKeywords || flowData.trigger || [],
        category: flowData.category || '',
        steps: flowData.steps || [],
        dataSource: 'file',
        ...flowData, // 元のデータも含める
      },
    });
  } catch (error) {
    console.error('❌ 応急処置フロー詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フローの詳細取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/flows/:id
 * 応急処置フローを更新
 */
router.put('/:id', async (_req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 応急処置フロー更新: ${id}`);

    // トラブルシューティングディレクトリから該当するJSONファイルを検索
    const troubleshootingDir = path.join(
      process.cwd(),
      '..',
      'knowledge-base',
      'troubleshooting'
    );

    if (!fs.existsSync(troubleshootingDir)) {
      return res.status(404).json({
        success: false,
        error: 'トラブルシューティングディレクトリが見つかりません',
      });
    }

    const files = fs.readdirSync(troubleshootingDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    let flowData = null;
    let fileName = null;

    // IDに一致するファイルを検索
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(troubleshootingDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        if (data.id === id || file.replace('.json', '') === id) {
          flowData = data;
          fileName = file;
          break;
        }
      } catch (error) {
        console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
      }
    }

    if (!flowData) {
      return res.status(404).json({
        success: false,
        error: '応急処置フローが見つかりません',
      });
    }

    // 更新データを準備
    const updatedData = {
      ...flowData,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    // JSONファイルを更新
    const filePath = path.join(troubleshootingDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf-8');

    console.log('✅ 応急処置フロー更新完了');

    res.json({
      success: true,
      data: updatedData,
      message: '応急処置フローが正常に更新されました',
    });
  } catch (error) {
    console.error('❌ 応急処置フロー更新エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フローの更新に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/flows/:id
 * 応急処置フローを削除
 */
router.delete('/:id', async (_req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 応急処置フロー削除: ${id}`);

    // トラブルシューティングディレクトリから該当するJSONファイルを検索
    const troubleshootingDir = path.join(
      process.cwd(),
      '..',
      'knowledge-base',
      'troubleshooting'
    );

    if (!fs.existsSync(troubleshootingDir)) {
      return res.status(404).json({
        success: false,
        error: 'トラブルシューティングディレクトリが見つかりません',
      });
    }

    const files = fs.readdirSync(troubleshootingDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    let fileName = null;

    // IDに一致するファイルを検索
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(troubleshootingDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        if (data.id === id || file.replace('.json', '') === id) {
          fileName = file;
          break;
        }
      } catch (error) {
        console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
      }
    }

    if (!fileName) {
      return res.status(404).json({
        success: false,
        error: '応急処置フローが見つかりません',
      });
    }

    // JSONファイルを削除
    const filePath = path.join(troubleshootingDir, fileName);
    fs.unlinkSync(filePath);

    console.log('✅ 応急処置フロー削除完了');

    res.json({
      success: true,
      message: '応急処置フローが正常に削除されました',
      deletedId: id,
      deletedFile: fileName,
    });
  } catch (error) {
    console.error('❌ 応急処置フロー削除エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フローの削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as flowsRouter };
