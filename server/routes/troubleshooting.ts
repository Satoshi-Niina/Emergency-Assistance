
import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { upload } from '../utils/image-uploader.js';
import multer, { FileFilterCallback } from 'multer';
import { createKBStorage } from '../storage/kbStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ストレージアダプタ（ローカル or Azure Blob）
const storage = createKBStorage();

// トラブルシューティングデータを読み込む関数
async function loadTroubleshootingData() {
  try {
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    console.log('🔍 トラブルシューティングディレクトリパス:', troubleshootingDir);
    console.log('🔍 現在の作業ディレクトリ:', process.cwd());
    console.log('🔍 絶対パス:', path.resolve(troubleshootingDir));
    
  if (!existsSync(troubleshootingDir) && storage.mode === 'local') {
      console.warn(`❌ トラブルシューティングディレクトリが見つかりません: ${troubleshootingDir}`);
      console.warn(`🔍 代替パスを試行中...`);
      
      // 代替パスを試行
      const alternativePaths = [
        path.join(process.cwd(), 'knowledge-base', 'troubleshooting'),
        path.join(__dirname, '..', '..', 'knowledge-base', 'troubleshooting'),
        path.join(__dirname, '..', 'knowledge-base', 'troubleshooting')
      ];
      
      for (const altPath of alternativePaths) {
        console.log(`🔍 代替パスをチェック中: ${altPath}`);
        if (existsSync(altPath)) {
          console.log(`✅ 代替パスが見つかりました: ${altPath}`);
          const files = readdirSync(altPath);
          console.log(`📁 ディレクトリ内のファイル:`, files);
          return await loadFromDirectory(altPath);
        }
      }
      
      console.error(`❌ どのパスでもディレクトリが見つかりませんでした`);
      return [];
    }

    if (storage.mode === 'local') {
      return await loadFromDirectory(troubleshootingDir);
    }
    // blob の場合はアダプタから一覧を取得
    return await storage.listFlows();
  } catch (error) {
    console.error('❌ トラブルシューティングデータの読み込みエラー:', error);
    return [];
  }
}

// 指定IDのフローを読み込むヘルパ
async function getFlowDataById(id: string): Promise<{ data: Record<string, unknown>; fileName: string } | null> {
  const data = await storage.getFlowById(id);
  if (!data) return null;
  return { data, fileName: `${id}.json` };
}

// 指定されたディレクトリからファイルを読み込む関数
async function loadFromDirectory(dirPath: string) {
  try {
    console.log(`📁 ディレクトリから読み込み中: ${dirPath}`);
    const files = readdirSync(dirPath);
    console.log('📁 ディレクトリ内のファイル:', files);
    
    const jsonFiles = files.filter(file => {
      const isJson = file.endsWith('.json');
      const isNotBackup = !file.includes('.backup');
      const isNotTmp = !file.includes('.tmp');
      console.log(`📄 ファイル ${file}: JSON=${isJson}, バックアップ=${!isNotBackup}, 一時=${!isNotTmp}`);
      return isJson && isNotBackup && isNotTmp;
    });
    
    console.log('📄 処理対象のJSONファイル:', jsonFiles);

    const fileList = await Promise.all(jsonFiles.map(async (file) => {
      try {
        const filePath = path.join(dirPath, file);
        console.log(`🔍 ファイル読み込み中: ${filePath}`);
        
        const content = await fs.readFile(filePath, 'utf8');
        console.log(`📄 ファイル ${file} のサイズ: ${content.length} 文字`);
        
        const data = JSON.parse(content);
        console.log(`✅ ファイル ${file} のJSON解析成功:`, {
          id: data.id,
          title: data.title,
          hasDescription: !!data.description,
          hasSteps: !!(data.steps && data.steps.length > 0)
        });
        
        let description = data.description || '';
        if (!description && data.steps && data.steps.length > 0) {
          const firstStep = data.steps[0];
          description = firstStep.description || firstStep.message || '';
        }

        const result = {
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
        
        console.log(`✅ ファイル ${file} の処理完了:`, result);
        return result;
      } catch (error) {
        console.error(`❌ ファイル ${file} の解析中にエラーが発生しました:`, error);
        console.error(`🔍 エラーの詳細:`, {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        return null;
      }
    }));

    const validFiles = fileList.filter(Boolean);
    console.log(`📋 有効なファイル数: ${validFiles.length}/${jsonFiles.length}`);
    
    return validFiles;
  } catch (error) {
    console.error(`❌ ディレクトリ ${dirPath} からの読み込みエラー:`, error);
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
    
  const found = await storage.getFlowById(id);
  if (!found) {
      console.error('❌ マッチするファイルが見つかりません:', id);
      return res.status(404).json({ 
        success: false,
        error: 'アイテムが見つかりません',
        id,
        timestamp: new Date().toISOString()
      });
    }
    const flowData = found as Record<string, unknown>;
    const getProp = <T>(o: Record<string, unknown>, key: string): T | undefined => (o[key] as T | undefined);
    const steps = getProp<unknown[]>(flowData, 'steps');
    const stepsCount = Array.isArray(steps) ? steps.length : 0;
    const idProp = getProp<string>(flowData, 'id');
    const titleProp = getProp<string>(flowData, 'title');
    console.log(`✅ トラブルシューティング取得完了:`, {
      id: idProp,
      title: titleProp,
      stepsCount,
      hasSteps: Array.isArray(steps),
      stepsType: Array.isArray(steps) ? 'array' : typeof steps,
      stepsIsArray: Array.isArray(steps),
      flowDataKeys: Object.keys(flowData)
    });
    
    // データ構造の詳細ログ
    if ((flowData as Record<string, unknown>).steps && Array.isArray((flowData as Record<string, unknown>).steps)) {
      console.log('📋 ステップデータ詳細:', {
        totalSteps: (flowData as Record<string, unknown> & { steps: unknown[] }).steps.length,
        stepIds: ((flowData as Record<string, unknown> & { steps: unknown[] }).steps).map((step: Record<string, unknown>, index: number) => ({
          index,
          id: (step as Record<string, unknown>).id,
          title: (step as Record<string, unknown>).title,
          hasImages: !!(step as Record<string, unknown>).images,
          imagesCount: Array.isArray((step as Record<string, unknown>).images) ? ((step as Record<string, unknown>).images as unknown[]).length : 0
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
      dataId: idProp,
      dataStepsCount: stepsCount
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

// 互換エイリアス: /detail/:id -> /:id と同じ応答を返す
router.get('/detail/:id', async (req, res, next) => {
  try {
    // 既存ハンドラーへ委譲（パラメータは同一）
    const found = await getFlowDataById(req.params.id);
    if (!found) {
      return res.status(404).json({ 
        success: false,
        error: 'アイテムが見つかりません',
        id: req.params.id,
        timestamp: new Date().toISOString()
      });
    }
    return res.json({ success: true, data: found.data, timestamp: new Date().toISOString() });
  } catch (e) {
    next(e);
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

  // ストレージへ保存
  await storage.saveFlowJson(flowData);
    
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
    
  const ok = await storage.deleteFlow(id);
  if (!ok) {
      return res.status(404).json({
        success: false,
        error: '指定されたトラブルシューティングが見つかりません',
        id
      });
    }

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
router.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('トラブルシューティングエラー:', message);
  
  // Content-Typeを明示的に設定
  res.setHeader('Content-Type', 'application/json');
  
  res.status(500).json({
    success: false,
    error: 'トラブルシューティングの処理中にエラーが発生しました',
  details: message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
});

// 画像配信エンドポイント（knowledge-baseから直接配信）
router.get('/image/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;

    const img = await storage.getImage(fileName);
    if (!img) {
      return res.status(404).json({ success: false, error: 'ファイルが存在しません', fileName });
    }

    res.setHeader('Content-Type', img.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(img.buffer);

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

// 画像アップロード（トラブルシューティング用）
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '画像ファイルが提供されていません' });
    }

    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, error: '対応していないファイル形式です' });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'ファイルサイズは5MB以下にしてください' });
    }

  const { fileName, isDuplicate } = await storage.saveImage(req.file.buffer, req.file.originalname || 'image.jpg');
  const imageUrl = `/api/troubleshooting/image/${fileName}`;
  return res.json({ success: true, imageUrl, fileName, isDuplicate });
  } catch (error) {
    console.error('❌ troubleshooting 画像アップロードエラー:', error);
    res.status(500).json({ success: false, error: '画像のアップロードに失敗しました' });
  }
});

// 画像削除（emergency-flows 優先）
router.delete('/image/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
  const deleted = await storage.deleteImage(fileName);
  if (deleted) return res.json({ success: true, message: '画像を削除しました', fileName });
  const inChat = await storage.existsInChatExports(fileName);
  if (inChat) return res.status(403).json({ success: false, error: '参照専用の画像は削除できません', fileName });
  return res.status(404).json({ success: false, error: '画像ファイルが見つかりません', fileName });
  } catch (error) {
    console.error('❌ troubleshooting 画像削除エラー:', error);
    res.status(500).json({ success: false, error: '画像の削除に失敗しました' });
  }
});

// JSONフローファイルのアップロード（FormData: file）
const jsonUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb: FileFilterCallback) => {
    const ok = file.mimetype === 'application/json' || file.originalname.toLowerCase().endsWith('.json');
    // サイレントに拒否（エラーは返さない）
    cb(null, ok);
  },
  limits: { fileSize: 2 * 1024 * 1024 }
});

router.post('/upload', jsonUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'JSONファイルが提供されていません' });
    }

    const jsonText = req.file.buffer.toString('utf8');
  let data: unknown;
    try {
      data = JSON.parse(jsonText);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'JSONの解析に失敗しました' });
    }

    // id を決定（ファイル名ベース or JSONの id）
  const originalName = req.file.originalname || `flow_${Date.now()}.json`;
  const maybeObj = (typeof data === 'object' && data !== null) ? (data as Record<string, unknown>) : {};
  const baseId = (maybeObj.id ? String(maybeObj.id) : originalName.replace(/\.json$/i, ''))
      .replace(/[^a-zA-Z0-9_-]/g, '_');
  const saved: Record<string, unknown> = { ...(maybeObj as Record<string, unknown>) };
  saved.id = baseId;
  const now = new Date().toISOString();
  saved.updatedAt = now;
  if (!saved.createdAt) saved.createdAt = now;

  const savedMeta = await storage.saveFlowJson(saved);
  return res.json({ success: true, id: savedMeta.id, fileName: savedMeta.fileName });
  } catch (error) {
    console.error('❌ troubleshooting JSONアップロードエラー:', error);
    res.status(500).json({ success: false, error: 'フローファイルのアップロードに失敗しました' });
  }
});

// 404ハンドリング
router.use('*', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: 'トラブルシューティングのエンドポイントが見つかりません',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

export default router;
