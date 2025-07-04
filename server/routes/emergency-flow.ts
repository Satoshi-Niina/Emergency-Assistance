import { Router } from 'express';
import OpenAI from 'openai';
import { z } from 'zod';
import { db } from '../db';
import { emergencyFlows } from '../db/schema';
import { findRelevantImages } from '../utils/image-matcher';
import * as fs from 'fs';
import * as path from 'path';
import { eq } from 'drizzle-orm';
import { validate as validateUUID } from 'uuid';
import { promises as fsPromises } from 'fs';
import { upload } from '../utils/image-uploader';
import { validateFlowData, autoFixFlowData } from '../lib/flow-validator';
import crypto from 'crypto';

const router = Router();

// 開発環境ではOpenAI APIキーがなくても動作するように条件付き初期化
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dev-mock-key') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} else {
  console.log('[DEV] OpenAI client not initialized - API key not available');
}

const generateFlowSchema = z.object({
  keyword: z.string().min(1),
});

// テンプレートスキーマを適用する関数（仮実装）
function applyTemplateSchema(data: any): any {
  // TODO: 実際のスキーマ適用ロジックを実装
  // 例：dataに必要なフィールドが存在しない場合にデフォルト値を追加する
  if (data && data.steps) {
    data.steps = data.steps.map((step: any) => {
      if (step.type === 'decision' && !step.options) {
        step.options = [
          { text: 'はい', nextStepId: '', condition: '', isTerminal: false, conditionType: 'yes' },
          { text: 'いいえ', nextStepId: '', condition: '', isTerminal: false, conditionType: 'no' }
        ];
      }
      return step;
    });
  }
  return data;
}

// POST /api/emergency-flow/update-step-title
router.post('/update-step-title', async (req, res) => {
  try {
    const { flowId, stepId, title } = req.body;

    if (!flowId || !stepId || !title) {
      return res.status(400).json({ error: 'flowId, stepId, title are required' });
    }

    // knowledge-base/troubleshooting/ ディレクトリから該当ファイルを読み込み
    const filePath = path.join(process.cwd(), 'knowledge-base', 'troubleshooting', `${flowId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'フローファイルが見つかりません' });
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const flowData = JSON.parse(fileContent);

    // 指定されたステップのタイトルを更新
    const stepIndex = flowData.steps.findIndex((step: any) => step.id === stepId);
    if (stepIndex === -1) {
      return res.status(404).json({ error: 'ステップが見つかりません' });
    }

    flowData.steps[stepIndex].title = title;
    flowData.updatedAt = new Date().toISOString();

    // ファイルに書き込み
    fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf8');

    res.json({ success: true, message: 'タイトルが更新されました' });
  } catch (error) {
    console.error('タイトル更新エラー:', error);
    res.status(500).json({ error: 'タイトル更新に失敗しました' });
  }
});

// フローデータのスキーマ定義
const flowDataSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  steps: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    message: z.string(),
    type: z.enum(['start', 'step', 'decision', 'condition', 'end']),
    imageUrl: z.string().optional(),
    options: z.array(z.object({
      text: z.string(),
      nextStepId: z.string(),
      isTerminal: z.boolean(),
      conditionType: z.enum(['yes', 'no', 'other']),
      condition: z.string().optional()
    })).optional()
  })),
  triggerKeywords: z.array(z.string())
});

// フロー保存エンドポイント（新規作成・更新）
router.post('/', async (req, res) => {
  try {
    const flowData = req.body;
    console.log('🔄 フロー保存開始:', { id: flowData.id, title: flowData.title });

    // 必須フィールドの検証
    if (!flowData.title) {
      return res.status(400).json({
        success: false,
        error: 'タイトルは必須です'
      });
    }

    // IDが指定されていない場合は生成
    if (!flowData.id) {
      flowData.id = `flow_${Date.now()}`;
    }

    // タイムスタンプを設定
    flowData.createdAt = flowData.createdAt || new Date().toISOString();
    flowData.updatedAt = new Date().toISOString();

    // ファイルパスを設定
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    if (!fs.existsSync(troubleshootingDir)) {
      fs.mkdirSync(troubleshootingDir, { recursive: true });
    }

    const filePath = path.join(troubleshootingDir, `${flowData.id}.json`);

    // ファイルに保存
    fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf8');

    console.log('✅ フロー保存成功:', {
      id: flowData.id,
      title: flowData.title,
      filePath: filePath,
      stepsCount: flowData.steps?.length || 0
    });

    res.json({
      success: true,
      data: flowData,
      message: 'フローが正常に保存されました'
    });

  } catch (error) {
    console.error('❌ フロー保存エラー:', error);
    res.status(500).json({
      success: false,
      error: 'フローの保存に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// フロー更新エンドポイント
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const flowData = req.body;
    console.log('🔄 フロー更新開始:', { id, title: flowData.title });

    // IDの一致確認
    if (id !== flowData.id) {
      return res.status(400).json({
        success: false,
        error: 'URLのIDとデータのIDが一致しません'
      });
    }

    // 必須フィールドの検証
    if (!flowData.title) {
      return res.status(400).json({
        success: false,
        error: 'タイトルは必須です'
      });
    }

    // タイムスタンプを更新
    flowData.updatedAt = new Date().toISOString();

    // ファイルパスを設定
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    // 既存ファイルの確認
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '更新対象のフローファイルが見つかりません'
      });
    }

    // ファイルに保存
    fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf8');

    console.log('✅ フロー更新成功:', {
      id: flowData.id,
      title: flowData.title,
      filePath: filePath,
      stepsCount: flowData.steps?.length || 0
    });

    res.json({
      success: true,
      data: flowData,
      message: 'フローが正常に更新されました'
    });

  } catch (error) {
    console.error('❌ フロー更新エラー:', error);
    res.status(500).json({
      success: false,
      error: 'フローの更新に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// フロー一覧取得エンドポイント
router.get('/list', (req, res) => {
  try {
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingDir)) {
      console.log('📁 troubleshootingディレクトリが存在しません。');
      return res.json([]);
    }

    const files = fs.readdirSync(troubleshootingDir);
    const jsonFiles = files.filter(file => file.endsWith('.json') && !file.includes('.backup') && !file.includes('.tmp'));

    const fileList = jsonFiles.map(file => {
      try {
        const filePath = path.join(troubleshootingDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
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
      details: (error as Error).message
    });
  }
});

// フロー詳細取得エンドポイント
router.get('/detail/:id', async (req, res) => {
  try {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    
    // キャッシュ制御ヘッダーを設定
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${timestamp}-${randomId}"`,
      'X-Accel-Expires': '0',
      'X-Requested-With': 'XMLHttpRequest'
    });

    const { id } = req.params;
    console.log(`🔄 [${timestamp}] フロー詳細取得開始: ID=${id}`);

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    console.log(`📁 ファイルパス: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ ファイルが存在しません: ${filePath}`);
      return res.status(404).json({ error: 'フローファイルが見つかりません' });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);

    console.log(`📊 ファイル情報:`, {
      size: stats.size,
      modified: stats.mtime,
      exists: true
    });

    console.log(`📄 ファイル内容のサイズ: ${content.length}文字`);

    let data = JSON.parse(content);
    console.log(`✅ ファイル詳細読み込み成功: ${id}.json`, {
      id: data.id,
      title: data.title,
      hasSteps: !!data.steps,
      stepsCount: data.steps?.length || 0,
      hasNodes: !!data.nodes,
      nodesCount: data.nodes?.length || 0,
      updatedAt: data.updatedAt,
      createdAt: data.createdAt
    });

    // 条件分岐ステップの確認
    const decisionSteps = data.steps?.filter((step: any) => step.type === 'decision') || [];
    const conditionSteps = data.steps?.filter((step: any) => step.type === 'condition') || [];

    console.log(`🔀 条件分岐ステップの確認:`, {
      totalSteps: data.steps?.length || 0,
      decisionSteps: decisionSteps.length,
      conditionSteps: conditionSteps.length,
      decisionStepsDetail: decisionSteps.map((step: any) => ({
        id: step.id,
        title: step.title,
        optionsCount: step.options?.length || 0
      })),
      conditionStepsDetail: conditionSteps.map((step: any) => ({
        id: step.id,
        title: step.title,
        conditionsCount: step.conditions?.length || 0
      }))
    });

    res.json({
      success: true,
      data: data,
      metadata: {
        filePath: filePath,
        fileSize: stats.size,
        lastModified: stats.mtime,
        requestId: `${timestamp}-${randomId}`,
        processedAt: new Date().toISOString()
      }
    });

    console.log(`✅ 完全データ解析成功:`, {
      id: data.id,
      title: data.title,
      stepsCount: data.steps?.length || 0,
      decisionStepsCount: decisionSteps.length,
      conditionStepsCount: conditionSteps.length,
      responseSize: JSON.stringify(data).length
    });

  } catch (error) {
    console.error('❌ フロー詳細取得エラー:', error);
    res.status(500).json({ error: 'フロー詳細の取得に失敗しました' });
  }
});

// フロー削除エンドポイント
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'フローファイルが見つかりません' });
    }

    fs.unlinkSync(filePath);
    console.log(`🗑️ フローファイルを削除しました: ${filePath}`);

    res.json({ success: true, message: 'フローが削除されました' });
  } catch (error) {
    console.error('❌ フロー削除エラー:', error);
    res.status(500).json({ error: 'フローの削除に失敗しました' });
  }
});

// フロー直接取得エンドポイント（キャッシュ制御付き）
router.get('/get/:id', async (req, res) => {
  try {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    
    // キャッシュ制御ヘッダーを設定
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${timestamp}-${randomId}"`,
      'X-Accel-Expires': '0',
      'X-Requested-With': 'XMLHttpRequest'
    });

    const { id } = req.params;
    console.log(`🔄 [${timestamp}] フロー直接取得: ID=${id}`);

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    console.log(`📁 ファイルパス: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ ファイルが存在しません: ${filePath}`);
      return res.status(404).json({ error: 'フローファイルが見つかりません' });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);

    console.log(`📊 ファイル情報:`, {
      size: stats.size,
      modified: stats.mtime,
      exists: true,
      contentLength: content.length
    });

    let data = JSON.parse(content);

    // 条件分岐ステップの確認
    const decisionSteps = data.steps?.filter((step: any) => step.type === 'decision') || [];
    const conditionSteps = data.steps?.filter((step: any) => step.type === 'condition') || [];

    console.log(`🔀 条件分岐ステップの確認:`, {
      totalSteps: data.steps?.length || 0,
      decisionSteps: decisionSteps.length,
      conditionSteps: conditionSteps.length
    });

    res.json({
      ...data,
      metadata: {
        filePath: filePath,
        fileSize: stats.size,
        lastModified: stats.mtime,
        requestId: `${timestamp}-${randomId}`,
        processedAt: new Date().toISOString()
      }
    });

    console.log(`✅ 直接データ取得成功:`, {
      id: data.id,
      title: data.title,
      stepsCount: data.steps?.length || 0,
      decisionStepsCount: decisionSteps.length,
      conditionStepsCount: conditionSteps.length
    });

  } catch (error) {
    console.error('❌ フロー直接取得エラー:', error);
    res.status(500).json({ error: 'フロー直接取得に失敗しました' });
  }
});

// フロー生成エンドポイント
router.post('/generate', async (req, res) => {
  try {
    const { keyword } = generateFlowSchema.parse(req.body);
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const cleanFlowId = ((req.params as any).id || '').startsWith('ts_') ? ((req.params as any).id || '').substring(3) : ((req.params as any).id || '');
    const filePath = path.join(process.cwd(), 'knowledge-base/troubleshooting', `${cleanFlowId}.json`);

    if (!fs.existsSync(troubleshootingDir)) {
      fs.mkdirSync(troubleshootingDir, { recursive: true });
    }

    // OpenAIクライアントが利用可能かチェック
    if (!openai) {
      return res.status(503).json({
        success: false,
        error: 'OpenAI APIが利用できません。開発環境ではAPIキーを設定してください。',
        details: 'OpenAI client not available'
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `あなたは建設機械の故障診断の専門家です。
以下の形式で応急処置フローを生成してください：
1. タイトル：問題の簡潔な説明
2. 手順：具体的な対処方法を順番に説明
各手順は明確で、技術者でも素人でも理解できるように説明してください。`
        },
        {
          role: "user",
          content: `以下の故障状況に対する応急処置フローを生成してください：${keyword}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const generatedContent = completion.choices[0]?.message?.content;
    if (!generatedContent) {
      throw new Error('フロー生成に失敗しました');
    }

    // 生成されたコンテンツをパースしてフロー構造に変換
    const lines = generatedContent.split('\n').filter(line => line.trim());
    const title = lines.find(line => line.includes('タイトル：'))?.replace('タイトル：', '').trim() || keyword;
    
    const steps = [];
    let currentStep = null;
    
    for (const line of lines) {
      if (line.includes('手順：') || line.match(/^\d+\./)) {
        if (currentStep) {
          steps.push(currentStep);
        }
        const stepTitle = line.replace(/^手順：|^\d+\.\s*/, '').trim();
        currentStep = {
          id: `step_${steps.length + 1}`,
          title: stepTitle,
          description: stepTitle,
          message: stepTitle,
          type: 'step',
          imageUrl: '',
          options: []
        };
      } else if (currentStep && line.trim()) {
        currentStep.description += '\n' + line.trim();
        currentStep.message += '\n' + line.trim();
      }
    }
    
    if (currentStep) {
      steps.push(currentStep);
    }

    const flowData = {
      id: `flow_${Date.now()}`,
      title: title,
      description: `自動生成された${keyword}の応急処置フロー`,
      triggerKeywords: [keyword],
      steps: steps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const fileName = `${flowData.id}.json`;
    const flowFilePath = path.join(process.cwd(), 'knowledge-base', 'troubleshooting', `${fileName}.json`);
    
    fs.writeFileSync(flowFilePath, JSON.stringify(flowData, null, 2), 'utf8');

    res.json({
      success: true,
      data: flowData,
      message: 'フローが正常に生成されました'
    });

  } catch (error) {
    console.error('❌ フロー生成エラー:', error);
    res.status(500).json({
      success: false,
      error: 'フローの生成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // ここでデータベースからフローを削除する処理を追加
    // 例: await db.delete(flows).where(eq(flows.id, id));
    
    res.status(200).json({ message: 'フローを削除しました' });
  } catch (error) {
    console.error('フロー削除エラー:', error);
    res.status(500).json({ error: 'フローの削除に失敗しました' });
  }
});

// 画像アップロードエンドポイント
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '画像ファイルが提供されていません'
      });
    }

    // ファイル形式チェック
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: '対応していないファイル形式です'
      });
    }

    // ファイルサイズチェック（5MB）
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'ファイルサイズは5MB以下にしてください'
      });
    }

    // ファイル名を生成（タイムスタンプ + オリジナル名）
    const timestamp = Date.now();
    const originalName = req.file.originalname;
    const extension = originalName.split('.').pop();
    const fileName = `emergency-flow-step${timestamp}.${extension}`;

    // 保存先ディレクトリを作成
    const uploadDir = path.join(process.cwd(), 'knowledge-base', 'images', 'emergency-flows');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // ファイルの重複チェック
    const fileHash = calculateFileHash(req.file.buffer);
    console.log('🔍 ファイルハッシュ計算:', { fileHash });
    
    const existingFile = findExistingImageByHash(uploadDir, fileHash);
    let finalFileName = fileName;
    let isDuplicate = false;

    if (existingFile) {
      console.log('🔄 重複画像を検出、既存ファイルを使用:', existingFile);
      finalFileName = existingFile;
      isDuplicate = true;
    } else {
      // 新しいファイルを保存
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);
    }

    // APIエンドポイントのURLを生成
    const imageUrl = `/api/emergency-flow/image/${finalFileName}`;

    console.log('✅ 画像アップロード成功:', {
      fileName: finalFileName,
      imageUrl,
      fileSize: req.file.size,
      isDuplicate,
      details: {
        originalFileName: fileName,
        finalFileName: finalFileName,
        finalImageUrl: imageUrl
      }
    });

    res.json({
      success: true,
      imageUrl,
      fileName: finalFileName,
      isDuplicate
    });

  } catch (error) {
    console.error('❌ 画像アップロードエラー:', error);
    res.status(500).json({
      success: false,
      error: '画像のアップロードに失敗しました'
    });
  }
});

// URI暗号化関数
/*
function encryptUri(fileName: string): string {
  console.log('🔐 暗号化開始:', { fileName });
  const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key';
  console.log('🔐 暗号化キー:', { secretLength: secret.length, secretPrefix: secret.substring(0, 10) + '...' });
  
  const cipher = crypto.createCipher('aes-256-cbc', secret);
  let encrypted = cipher.update(fileName, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  console.log('🔐 暗号化完了:', { 
    originalFileName: fileName, 
    encryptedFileName: encrypted,
    encryptedLength: encrypted.length 
  });
  
  return encrypted;
}
*/

// URI復号化関数
/*
function decryptUri(encryptedFileName: string): string {
  const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key';
  const decipher = crypto.createDecipher('aes-256-cbc', secret);
  let decrypted = decipher.update(encryptedFileName, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
*/

// 画像配信エンドポイント（knowledge-baseから直接配信）
router.get('/image/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    console.log('🖼️ 画像配信リクエスト:', {
      fileName,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      timestamp: new Date().toISOString()
    });
    
    if (!fileName) {
      console.log('❌ ファイル名が指定されていません');
      return res.status(400).json({
        success: false,
        error: 'ファイル名が必要です'
      });
    }

    // ファイルパスを構築
    const uploadDir = path.join(process.cwd(), 'knowledge-base', 'images', 'emergency-flows');
    const filePath = path.join(uploadDir, fileName);

    console.log('🔍 ファイルパス確認:', {
      fileName,
      uploadDir,
      filePath,
      dirExists: fs.existsSync(uploadDir),
      fileExists: fs.existsSync(filePath),
      dirContents: fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : 'ディレクトリが存在しません'
    });

    // ファイルの存在確認
    if (!fs.existsSync(filePath)) {
      console.error('❌ 画像ファイルが見つかりません:', {
        fileName,
        filePath,
        uploadDir,
        dirContents: fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : 'ディレクトリが存在しません'
      });
      return res.status(404).json({
        success: false,
        error: '画像ファイルが見つかりません'
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
    const fileBuffer = fs.readFileSync(filePath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年間キャッシュ
    res.send(fileBuffer);

    console.log('✅ 画像配信成功:', {
      fileName,
      contentType,
      fileSize: fileBuffer.length,
      filePath
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

// ファイルのハッシュを計算する関数
function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

// 既存の画像ファイルから同じハッシュのファイルを探す関数
function findExistingImageByHash(uploadDir: string, fileHash: string): string | null {
  try {
    const files = fs.readdirSync(uploadDir);
    for (const file of files) {
      if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.gif') || file.endsWith('.webp')) {
        const filePath = path.join(uploadDir, file);
        const fileBuffer = fs.readFileSync(filePath);
        const existingHash = calculateFileHash(fileBuffer);
        
        if (existingHash === fileHash) {
          console.log(`🔄 同じハッシュの画像を発見: ${file}`);
          return file;
        }
      }
    }
  } catch (error) {
    console.error('既存ファイル検索エラー:', error);
  }
  return null;
}

// フロー取得エンドポイント（/:id）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 フロー取得開始: ID=${id}`);

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ ファイルが存在しません: ${filePath}`);
      return res.status(404).json({ error: 'フローファイルが見つかりません' });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    console.log(`✅ フロー取得成功:`, {
      id: data.id,
      title: data.title,
      stepsCount: data.steps?.length || 0
    });

    res.json(data);

  } catch (error) {
    console.error('❌ フロー取得エラー:', error);
    res.status(500).json({ error: 'フローの取得に失敗しました' });
  }
});

export default router;