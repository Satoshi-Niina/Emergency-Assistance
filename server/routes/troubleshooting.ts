
import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { existsSync, readdirSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// トラブルシューティングディレクトリのパス
const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');

// トラブルシューティングデータを読み込む関数
async function loadTroubleshootingData() {
  try {
    console.log('🔍 トラブルシューティングディレクトリパス:', troubleshootingDir);
    console.log('🔍 現在の作業ディレクトリ:', process.cwd());
    
    if (!existsSync(troubleshootingDir)) {
      console.warn(`トラブルシューティングディレクトリが見つかりません: ${troubleshootingDir}`);
      return [];
    }

    const files = readdirSync(troubleshootingDir);
    console.log('📁 ディレクトリ内のファイル:', files);
    const jsonFiles = files.filter(file => file.endsWith('.json') && !file.includes('.backup') && !file.includes('.tmp'));
    console.log('📄 JSONファイル:', jsonFiles);

    const fileList = await Promise.all(jsonFiles.map(async (file) => {
      try {
        const filePath = path.join(troubleshootingDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        
        let description = data.description || '';
        if (!description && data.steps && data.steps.length > 0) {
          description = data.steps[0].description || data.steps[0].message || '';
        }

        return {
          id: data.id || file.replace('.json', ''),
          title: data.title || 'タイトルなし',
          description: description,
          fileName: file,
          filePath: `knowledge-base/troubleshooting/${file}`,
          createdAt: data.createdAt || data.savedAt || data.updatedAt || new Date().toISOString(),
          category: data.category || '',
          triggerKeywords: data.triggerKeywords || [],
          steps: data.steps || []
        };
      } catch (error) {
        console.error(`ファイル ${file} の解析中にエラーが発生しました:`, error);
        return null;
      }
    }));

    return fileList.filter(Boolean);
  } catch (error) {
    console.error('トラブルシューティングデータの読み込みエラー:', error);
    return [];
  }
}

// トラブルシューティング一覧取得
router.get('/list', async (req, res) => {
  console.log('📋 トラブルシューティング一覧リクエスト受信');
  try {
    const data = await loadTroubleshootingData();
    console.log(`✅ トラブルシューティング一覧取得完了: ${data.length}件`);
    
    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      data: data,
      total: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ トラブルシューティング一覧取得エラー:', error);
    res.status(500).json({ 
      success: false,
      error: 'データの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 特定のトラブルシューティング取得
router.get('/:id', async (req, res) => {
  console.log('📋 特定のトラブルシューティング取得開始:', req.params.id);
  try {
    const { id } = req.params;
    
    // キャッシュ制御ヘッダーを設定
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${timestamp}-${randomId}"`,
      'X-Accel-Expires': '0',
      'X-Requested-With': 'XMLHttpRequest'
    });
    
    console.log('🔍 トラブルシューティングディレクトリ確認:', troubleshootingDir);
    
    // トラブルシューティングディレクトリから該当するJSONファイルを検索
    if (!existsSync(troubleshootingDir)) {
      console.error('❌ トラブルシューティングディレクトリが見つかりません:', troubleshootingDir);
      return res.status(404).json({ 
        success: false,
        error: 'トラブルシューティングディレクトリが見つかりません',
        id,
        timestamp: new Date().toISOString()
      });
    }
    
    const files = readdirSync(troubleshootingDir);
    console.log('📁 ディレクトリ内のファイル:', files);
    
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    console.log('📄 JSONファイル:', jsonFiles);
    
    let flowData = null;
    let fileName = null;
    
    // IDに一致するファイルを検索
    for (const file of jsonFiles) {
      try {
        console.log(`🔍 ファイル ${file} をチェック中...`);
        const filePath = path.join(troubleshootingDir, file);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        console.log(`📋 ファイル ${file} の内容:`, {
          fileId: data.id,
          requestId: id,
          idsMatch: data.id === id,
          fileNameMatch: file.replace('.json', '') === id
        });
        
        if (data.id === id || file.replace('.json', '') === id) {
          flowData = data;
          fileName = file;
          console.log(`✅ マッチするファイルを発見: ${file}`);
          break;
        }
      } catch (error) {
        console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
      }
    }
    
    if (!flowData) {
      console.error('❌ マッチするファイルが見つかりません:', id);
      return res.status(404).json({ 
        success: false,
        error: 'アイテムが見つかりません',
        id,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ トラブルシューティング取得完了:`, {
      id: flowData.id,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0,
      fileName: fileName,
      hasSteps: !!flowData.steps,
      stepsType: typeof flowData.steps,
      stepsIsArray: Array.isArray(flowData.steps),
      flowDataKeys: Object.keys(flowData)
    });
    
    // データ構造の詳細ログ
    if (flowData.steps && Array.isArray(flowData.steps)) {
      console.log('📋 ステップデータ詳細:', {
        totalSteps: flowData.steps.length,
        stepIds: flowData.steps.map((step: any, index: number) => ({
          index,
          id: step.id,
          title: step.title,
          hasImages: !!step.images,
          imagesCount: step.images?.length || 0
        }))
      });
    } else {
      console.warn('⚠️ ステップデータが存在しないか、配列ではありません:', {
        steps: flowData.steps,
        stepsType: typeof flowData.steps
      });
    }
    
    res.setHeader('Content-Type', 'application/json');
    const responseData = {
      success: true,
      data: flowData,
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 レスポンス送信:', {
      success: responseData.success,
      dataId: responseData.data.id,
      dataStepsCount: responseData.data.steps?.length || 0
    });
    
    res.json(responseData);
  } catch (error) {
    console.error('❌ トラブルシューティング取得エラー:', error);
    res.status(500).json({ 
      success: false,
      error: 'データの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// トラブルシューティング更新
router.put('/:id', async (req, res) => {
  console.log('📝 トラブルシューティング更新:', req.params.id);
  try {
    const { id } = req.params;
    const flowData = req.body;
    
    // 必須フィールドの検証
    if (!flowData.title) {
      return res.status(400).json({
        success: false,
        error: 'タイトルは必須です'
      });
    }

    // タイムスタンプを更新
    flowData.updatedAt = new Date().toISOString();
    flowData.id = id; // IDを確実に設定

    // ファイルパスを構築
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    // ファイルに保存
    writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf8');
    
    console.log('✅ トラブルシューティング更新成功:', {
      id: flowData.id,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0
    });

    res.json({
      success: true,
      data: flowData,
      message: 'トラブルシューティングが正常に更新されました'
    });
  } catch (error) {
    console.error('❌ トラブルシューティング更新エラー:', error);
    res.status(500).json({ 
      success: false,
      error: 'データの更新に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// トラブルシューティング削除
router.delete('/:id', async (req, res) => {
  console.log('🗑️ トラブルシューティング削除:', req.params.id);
  try {
    const { id } = req.params;
    
    // ファイルパスを構築
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    // ファイルの存在確認
    if (!existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '指定されたトラブルシューティングが見つかりません',
        id
      });
    }

    // ファイルを削除
    unlinkSync(filePath);
    
    console.log('✅ トラブルシューティング削除成功:', id);

    res.json({
      success: true,
      message: 'トラブルシューティングが正常に削除されました',
      id
    });
  } catch (error) {
    console.error('❌ トラブルシューティング削除エラー:', error);
    res.status(500).json({ 
      success: false,
      error: 'データの削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// エラーハンドリングミドルウェア
router.use((err: any, req: any, res: any, next: any) => {
  console.error('トラブルシューティングエラー:', err);
  
  // Content-Typeを明示的に設定
  res.setHeader('Content-Type', 'application/json');
  
  res.status(500).json({
    success: false,
    error: 'トラブルシューティングの処理中にエラーが発生しました',
    details: err.message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
});

// 画像配信エンドポイント（knowledge-baseから直接配信）
router.get('/image/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    // まず emergency-flows ディレクトリを確認
    let uploadDir = path.join(process.cwd(), '..', 'knowledge-base', 'images', 'emergency-flows');
    let filePath = path.join(uploadDir, fileName);
    
    // emergency-flows にファイルがない場合は chat-exports を確認
    if (!existsSync(filePath)) {
      uploadDir = path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports');
      filePath = path.join(uploadDir, fileName);
      
      console.log('🔄 emergency-flows にファイルが見つからないため、chat-exports を確認:', {
        fileName,
        chatExportsDir: uploadDir,
        chatExportsPath: filePath,
        exists: existsSync(filePath)
      });
    }

    // デバッグログ強化
    console.log('🖼️ 画像リクエスト:', {
      fileName,
      uploadDir,
      filePath,
      exists: existsSync(filePath),
      filesInDir: existsSync(uploadDir) ? readdirSync(uploadDir) : []
    });

    if (!existsSync(filePath)) {
      return res.status(404).json({
        error: 'ファイルが存在しません',
        fileName,
        emergencyFlowsPath: path.join(process.cwd(), '..', 'knowledge-base', 'images', 'emergency-flows', fileName),
        chatExportsPath: path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports', fileName),
        emergencyFlowsDir: existsSync(path.join(process.cwd(), '..', 'knowledge-base', 'images', 'emergency-flows')) ? readdirSync(path.join(process.cwd(), '..', 'knowledge-base', 'images', 'emergency-flows')) : [],
        chatExportsDir: existsSync(path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports')) ? readdirSync(path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports')) : []
      });
    }

    // ファイルのMIMEタイプを判定
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // ファイルを読み込んでレスポンス
    const fileBuffer = readFileSync(filePath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年間キャッシュ
    res.send(fileBuffer);

    console.log('✅ 画像配信成功:', {
      fileName,
      contentType,
      fileSize: fileBuffer.length,
      filePath,
      sourceDir: uploadDir.includes('emergency-flows') ? 'emergency-flows' : 'chat-exports'
    });

  } catch (error) {
    console.error('❌ 画像配信エラー:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fileName: req.params.fileName
    });
    res.status(500).json({
      success: false,
      error: '画像の配信に失敗しました'
    });
  }
});

// 404ハンドリング
router.use('*', (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: 'トラブルシューティングのエンドポイントが見つかりません',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

export default router;
