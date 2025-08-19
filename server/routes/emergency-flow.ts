import * as express from 'express';
import OpenAI from 'openai';
import { z } from 'zod';
// import { db } from '../db/index';
// import { emergencyFlows } from '../db/schema';
import { findRelevantImages } from '../utils/image-matcher';
import * as fs from 'fs';
import * as path from 'path';
// import { eq } from 'drizzle-orm';
import { validate as validateUUID } from 'uuid';
import { promises as fsPromises } from 'fs';
import { upload } from '../utils/image-uploader';
import { validateFlowData, autoFixFlowData } from '../lib/flow-validator';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

// ESM用__dirname定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

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

    // トラブルシューティングディレクトリから該当するJSONファイルを検索
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingDir)) {
      return res.status(404).json({ error: 'トラブルシューティングディレクトリが見つかりません' });
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
        
        if (data.id === flowId || file.replace('.json', '') === flowId) {
          flowData = data;
          fileName = file;
          break;
        }
      } catch (error) {
        console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
      }
    }
    
    if (!flowData) {
      return res.status(404).json({ error: 'フローが見つかりません' });
    }

    const steps = flowData.steps || [];

    // 指定されたステップのタイトルを更新
    const stepIndex = steps.findIndex((step) => step.id === stepId);
    if (stepIndex === -1) {
      return res.status(404).json({ error: 'ステップが見つかりません' });
    }

    steps[stepIndex].title = title;
    flowData.steps = steps;
    flowData.updatedAt = new Date().toISOString();

    // JSONファイルを更新
    const filePath = path.join(troubleshootingDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf-8');

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

    // トラブルシューティングディレクトリに保存
    try {
      const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
      
      if (!fs.existsSync(troubleshootingDir)) {
        fs.mkdirSync(troubleshootingDir, { recursive: true });
      }
      
      const fileName = `${flowData.id}.json`;
      const filePath = path.join(troubleshootingDir, fileName);
      
      // 既存ファイルの確認
      const isExisting = fs.existsSync(filePath);
      
      // タイムスタンプを更新
      flowData.updatedAt = new Date().toISOString();
      if (!flowData.createdAt) {
        flowData.createdAt = new Date().toISOString();
      }
      
      // JSONファイルに保存
      fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf-8');
      
      if (isExisting) {
        console.log('✅ 既存フロー更新成功:', {
          id: flowData.id,
          title: flowData.title,
          filePath: filePath
        });
      } else {
        console.log('✅ 新規フロー作成成功:', {
          id: flowData.id,
          title: flowData.title,
          filePath: filePath
        });
      }
    } catch (fileError) {
      console.error('❌ ファイル保存エラー:', fileError);
      return res.status(500).json({
        success: false,
        error: 'ファイルへの保存に失敗しました',
        details: fileError instanceof Error ? fileError.message : 'Unknown file error'
      });
    }

    console.log('✅ フロー保存成功:', {
      id: flowData.id,
      title: flowData.title,
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

    // トラブルシューティングディレクトリから該当するJSONファイルを検索
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingDir)) {
      return res.status(404).json({
        success: false,
        error: 'トラブルシューティングディレクトリが見つかりません'
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
        error: '更新対象のフローが見つかりません'
      });
    }

    // JSONファイルを更新
    const filePath = path.join(troubleshootingDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf-8');
    
    console.log('✅ フロー更新成功:', {
      id: flowData.id,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0,
      filePath: filePath
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

// フロー一覧取得エンドポイント（ルートパス）
router.get('/', async (req, res) => {
  try {
    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');
    
    console.log('🔍 トラブルシューティングディレクトリからフロー一覧を取得中...');
    
    // トラブルシューティングディレクトリからJSONファイルを読み込み
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    console.log('🔍 トラブルシューティングディレクトリパス:', troubleshootingDir);
    console.log('🔍 現在の作業ディレクトリ:', process.cwd());
    console.log('🔍 絶対パス:', path.resolve(troubleshootingDir));
    
    if (!fs.existsSync(troubleshootingDir)) {
      console.log('❌ トラブルシューティングディレクトリが存在しません');
      console.log('🔍 代替パスを試行中...');
      
      // 代替パスを試行
      const alternativePaths = [
        path.join(process.cwd(), 'knowledge-base', 'troubleshooting'),
        path.join(__dirname, '..', '..', 'knowledge-base', 'troubleshooting'),
        path.join(__dirname, '..', 'knowledge-base', 'troubleshooting')
      ];
      
      for (const altPath of alternativePaths) {
        console.log(`🔍 代替パスをチェック中: ${altPath}`);
        if (fs.existsSync(altPath)) {
          console.log(`✅ 代替パスが見つかりました: ${altPath}`);
          const fileList = await loadFromDirectory(altPath);
          return res.json({
            success: true,
            data: fileList,
            total: fileList.length,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      console.error('❌ どのパスでもディレクトリが見つかりませんでした');
      return res.json({
        success: true,
        data: [],
        total: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    const fileList = await loadFromDirectory(troubleshootingDir);
    
    // 作成日時でソート
    fileList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    console.log('📋 最終的なフロー一覧:', fileList);
    res.json({
      success: true,
      data: fileList,
      total: fileList.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ フロー一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'フロー一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 指定されたディレクトリからファイルを読み込む関数
async function loadFromDirectory(dirPath: string) {
  try {
    console.log(`📁 ディレクトリから読み込み中: ${dirPath}`);
    const files = fs.readdirSync(dirPath);
    console.log('📁 ディレクトリ内のファイル:', files);
    
    const jsonFiles = files.filter(file => {
      const isJson = file.endsWith('.json');
      const isNotBackup = !file.includes('.backup');
      const isNotTmp = !file.includes('.tmp');
      console.log(`📄 ファイル ${file}: JSON=${isJson}, バックアップ=${!isNotBackup}, 一時=${!isNotTmp}`);
      return isJson && isNotBackup && isNotTmp;
    });
    
    console.log('📄 処理対象のJSONファイル:', jsonFiles);
    
    const fileList = [];
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(dirPath, file);
        console.log(`🔍 ファイル読み込み中: ${filePath}`);
        
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        console.log(`📄 ファイル ${file} のサイズ: ${fileContent.length} 文字`);
        
        const flowData = JSON.parse(fileContent);
        console.log(`✅ ファイル ${file} のJSON解析成功:`, {
          id: flowData.id,
          title: flowData.title,
          hasDescription: !!flowData.description,
          hasSteps: !!(flowData.steps && flowData.steps.length > 0)
        });
        
        let description = flowData.description || '';
        if (!description && flowData.steps && flowData.steps.length > 0) {
          const firstStep = flowData.steps[0];
          description = firstStep.description || firstStep.message || '';
        }

        const result = {
          id: flowData.id || file.replace('.json', ''),
          title: flowData.title || 'タイトルなし',
          description: description,
          fileName: file,
          filePath: `knowledge-base/troubleshooting/${file}`,
          createdAt: flowData.createdAt || new Date().toISOString(),
          updatedAt: flowData.updatedAt || new Date().toISOString(),
          triggerKeywords: flowData.triggerKeywords || flowData.trigger || [],
          category: flowData.category || '',
          dataSource: 'file'
        };
        
        fileList.push(result);
        console.log(`✅ フロー ${result.id} 処理完了:`, result);
      } catch (error) {
        console.error(`❌ ファイル ${file} の解析中にエラーが発生しました:`, error);
        console.error(`🔍 エラーの詳細:`, {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }
    
    console.log(`📋 有効なファイル数: ${fileList.length}/${jsonFiles.length}`);
    return fileList;
  } catch (error) {
    console.error(`❌ ディレクトリ ${dirPath} からの読み込みエラー:`, error);
    return [];
  }
}

// フロー一覧取得エンドポイント（互換性のため残す）
router.get('/list', async (req, res) => {
  try {
    console.log('🔍 トラブルシューティングディレクトリからフロー一覧を取得中（/list）...');
    
    // トラブルシューティングディレクトリからJSONファイルを読み込み
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    console.log('🔍 トラブルシューティングディレクトリパス:', troubleshootingDir);
    console.log('🔍 現在の作業ディレクトリ:', process.cwd());
    console.log('🔍 絶対パス:', path.resolve(troubleshootingDir));
    
    if (!fs.existsSync(troubleshootingDir)) {
      console.log('❌ トラブルシューティングディレクトリが存在しません');
      console.log('🔍 代替パスを試行中...');
      
      // 代替パスを試行
      const alternativePaths = [
        path.join(process.cwd(), 'knowledge-base', 'troubleshooting'),
        path.join(__dirname, '..', '..', 'knowledge-base', 'troubleshooting'),
        path.join(__dirname, '..', 'knowledge-base', 'troubleshooting')
      ];
      
      for (const altPath of alternativePaths) {
        console.log(`🔍 代替パスをチェック中: ${altPath}`);
        if (fs.existsSync(altPath)) {
          console.log(`✅ 代替パスが見つかりました: ${altPath}`);
          const fileList = await loadFromDirectory(altPath);
          return res.json({
            success: true,
            data: fileList,
            total: fileList.length,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      console.error('❌ どのパスでもディレクトリが見つかりませんでした');
      return res.json({
        success: true,
        data: [],
        total: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    const fileList = await loadFromDirectory(troubleshootingDir);
    
    // 作成日時でソート
    fileList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    console.log('📋 最終的なフロー一覧:', fileList);
    res.json({
      success: true,
      data: fileList,
      total: fileList.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ フロー一覧取得エラー:', error);
    res.status(500).json({ 
      success: false,
      error: 'フロー一覧の取得に失敗しました',
      details: (error as Error).message,
      timestamp: new Date().toISOString()
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

    // トラブルシューティングディレクトリから該当するJSONファイルを検索
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingDir)) {
      console.log(`❌ トラブルシューティングディレクトリが見つかりません`);
      return res.status(404).json({ error: 'トラブルシューティングディレクトリが見つかりません' });
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
      console.log(`❌ フローが見つかりません: ${id}`);
      return res.status(404).json({ error: 'フローが見つかりません' });
    }

    console.log(`✅ フロー詳細読み込み成功: ${id}`, {
      id: flowData.id,
      title: flowData.title,
      hasSteps: !!flowData.steps,
      stepsCount: flowData.steps?.length || 0,
      fileName: fileName
    });

    // 条件分岐ステップの確認
    const decisionSteps = flowData.steps?.filter((step: any) => (step as any).type === 'decision') || [];
    const conditionSteps = flowData.steps?.filter((step: any) => (step as any).type === 'condition') || [];

    console.log(`🔀 条件分岐ステップの確認:`, {
      totalSteps: flowData.steps?.length || 0, 
      decisionSteps: decisionSteps.length, 
      conditionSteps: conditionSteps.length, 
      decisionStepsDetail: decisionSteps.map((step) => ({
        id: step.id,
        title: step.title,
        optionsCount: step.options?.length || 0
      })),
      conditionStepsDetail: conditionSteps.map((step) => ({
        id: step.id,
          title: step.title,
          conditionsCount: step.conditions?.length || 0
        }))
      });

      // フローデータを整形
      const data = {
        id: flowData.id,
        title: flowData.title,
        description: flowData.description,
        steps: flowData.steps || [],
        triggerKeywords: flowData.triggerKeywords || flowData.trigger || [],
        category: flowData.category,
        createdAt: flowData.createdAt,
        updatedAt: flowData.updatedAt
      };

      res.json({
        success: true,
        data: data,
        metadata: {
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
    console.log(`🗑️ フロー削除開始: ID=${id}`);

    // トラブルシューティングディレクトリから該当するJSONファイルを検索
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingDir)) {
      return res.status(404).json({
        success: false,
        error: 'トラブルシューティングディレクトリが見つかりません'
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
        error: '削除対象のフローが見つかりません'
      });
    }

    // JSONファイルを削除
    const filePath = path.join(troubleshootingDir, fileName);
    fs.unlinkSync(filePath);
    
    console.log(`🗑️ フロー削除完了: ${id}, ファイル: ${fileName}`);
    res.json({ 
      success: true, 
      message: 'フローが削除されました',
      deletedId: id,
      deletedFile: fileName
    });
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

    // トラブルシューティングディレクトリから該当するJSONファイルを検索
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingDir)) {
      console.log(`❌ トラブルシューティングディレクトリが見つかりません`);
      return res.status(404).json({ error: 'トラブルシューティングディレクトリが見つかりません' });
    }
    
    const files = fs.readdirSync(troubleshootingDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    let flowData = null;
    
    // IDに一致するファイルを検索
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(troubleshootingDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        
        if (data.id === id || file.replace('.json', '') === id) {
          flowData = data;
          break;
        }
      } catch (error) {
        console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
      }
    }
    
    if (!flowData) {
      console.log(`❌ フローが見つかりません: ${id}`);
      return res.status(404).json({ error: 'フローが見つかりません' });
    }

    console.log(`📊 フロー情報:`, {
      id: flowData.id,
      title: flowData.title,
      hasSteps: !!flowData.steps,
      stepsCount: flowData.steps?.length || 0
    });

    // フローデータを整形
    const data = {
      id: flowData.id,
      title: flowData.title,
      description: flowData.description,
      steps: flowData.steps || [],
      triggerKeywords: flowData.triggerKeywords || flowData.trigger || [],
      category: flowData.category,
      createdAt: flowData.createdAt,
      updatedAt: flowData.updatedAt
    };

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

// GPTレスポンスから手順を抽出するフォールバック関数
function extractStepsFromResponse(response: string, keyword: string) {
  const steps = [];
  const lines = response.split('\n').filter(line => line.trim());
  
  // 段落ごとに手順として抽出
  let currentStep = null;
  let stepCount = 0;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 新しい段落の開始を検出
    if (trimmedLine && 
        !trimmedLine.startsWith('**') && 
        !trimmedLine.startsWith('例:') && 
        !trimmedLine.startsWith('タイトル：') &&
        !trimmedLine.startsWith('手順：') &&
        !trimmedLine.match(/^手順\d+：/) &&
        !trimmedLine.match(/^\d+\./)) {
      
      if (currentStep) {
        steps.push(currentStep);
      }
      
      stepCount++;
      currentStep = {
        id: `step_${stepCount}`,
        title: trimmedLine.substring(0, 50) + (trimmedLine.length > 50 ? '...' : ''),
        description: trimmedLine,
        message: trimmedLine,
        type: 'step',
        imageUrl: '',
        options: []
      };
    } else if (currentStep && trimmedLine) {
      // 既存の手順に詳細を追加
      currentStep.description += '\n' + trimmedLine;
      currentStep.message += '\n' + trimmedLine;
    }
  }
  
  if (currentStep) {
    steps.push(currentStep);
  }
  
  // 手順が抽出できない場合は、キーワードベースでデフォルト手順を生成
  if (steps.length === 0) {
    steps.push({
      id: 'step_1',
      title: `${keyword}の安全確認`,
      description: `${keyword}の状況を安全に確認してください。作業現場の安全を確保し、必要に応じて緊急停止を行ってください。`,
      message: `${keyword}の状況を安全に確認してください。作業現場の安全を確保し、必要に応じて緊急停止を行ってください。`,
      type: 'step',
      imageUrl: '',
      options: []
    });
    
    steps.push({
      id: 'step_2',
      title: `${keyword}の詳細点検`,
      description: `${keyword}の故障状況を詳細に点検し、問題の程度と範囲を確認してください。`,
      message: `${keyword}の故障状況を詳細に点検し、問題の程度と範囲を確認してください。`,
      type: 'step',
      imageUrl: '',
      options: []
    });
    
    steps.push({
      id: 'step_3',
      title: '専門技術者への連絡',
      description: '安全で確実な対応のため、専門技術者に連絡して指示を仰いでください。',
      message: '安全で確実な対応のため、専門技術者に連絡して指示を仰いでください。',
      type: 'step',
      imageUrl: '',
      options: []
    });
  }
  
  return steps;
}

// フロー生成エンドポイント
router.post('/generate', async (req, res) => {
  try {
    const { keyword } = generateFlowSchema.parse(req.body);
    console.log(`🔄 フロー生成開始: キーワード=${keyword}`);

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
          content: `あなたは建設機械の故障診断と応急処置の専門家です。
以下の形式で具体的で実用的な応急処置フローを生成してください：

**必須フォーマット:**
1. タイトル：[具体的な問題名]
2. 手順：
   - 手順1：[具体的な作業内容と手順]
   - 手順2：[具体的な作業内容と手順]
   - 手順3：[具体的な作業内容と手順]
   （必要に応じて4-6手順まで）

**重要な要求事項:**
- 各手順は具体的な作業内容を含む（「確認する」「点検する」だけではなく、何をどう確認・点検するかを明記）
- 安全上の注意事項を含める
- 必要な工具や部品があれば明記
- 専門技術者への連絡が必要な場合は明記
- 技術者でも素人でも実行可能なレベルで説明

**例:**
手順1：エンジンルームの安全確認（エンジン停止、ブレーキ掛け、作業現場の安全確保）
手順2：バッテリー端子の点検（端子の緩み、腐食、接続状態を目視確認）
手順3：バッテリー電圧測定（テスターで12.6V以上あるか確認）`
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
    console.log('🔍 GPTレスポンスの解析開始:', {
      contentLength: generatedContent.length,
      lineCount: generatedContent.split('\n').length
    });
    
    const lines = generatedContent.split('\n').filter(line => line.trim());
    const title = lines.find(line => line.includes('タイトル：'))?.replace('タイトル：', '').trim() || keyword;
    
    console.log('📝 抽出されたタイトル:', title);
    
    const steps = [];
    let currentStep = null;
    
    for (const line of lines) {
      // 手順の開始を検出（手順：、手順1：、1. などのパターン）
      if (line.includes('手順：') || line.match(/^手順\d+：/) || line.match(/^\d+\./)) {
        if (currentStep) {
          steps.push(currentStep);
          console.log('✅ 手順を追加:', currentStep.title);
        }
        
        // 手順番号とタイトルを抽出
        const stepMatch = line.match(/^(?:手順)?(?:(\d+)：)?\s*(.+)/);
        if (stepMatch) {
          const stepNumber = stepMatch[1] || (steps.length + 1);
          const stepTitle = stepMatch[2].trim();
          
          currentStep = {
            id: `step_${stepNumber}`,
            title: stepTitle,
            description: stepTitle,
            message: stepTitle,
            type: 'step',
            imageUrl: '',
            options: []
          };
          
          console.log('🆕 新しい手順を作成:', { id: currentStep.id, title: stepTitle });
        }
      } else if (currentStep && line.trim()) {
        // 手順の詳細説明を追加
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('**') && !trimmedLine.startsWith('例:')) {
          currentStep.description += '\n' + trimmedLine;
          currentStep.message += '\n' + trimmedLine;
        }
      }
    }
    
    if (currentStep) {
      steps.push(currentStep);
      console.log('✅ 最後の手順を追加:', currentStep.title);
    }
    
    console.log('📊 手順抽出結果:', {
      totalSteps: steps.length,
      stepTitles: steps.map(s => s.title)
    });
    
    // 手順が生成されていない場合のフォールバック処理
    if (steps.length === 0) {
      console.log('⚠️ 手順が生成されていないため、フォールバック処理を実行');
      
      // GPTの生のレスポンスから手順を抽出
      const fallbackSteps = extractStepsFromResponse(generatedContent, keyword);
      steps.push(...fallbackSteps);
      
      console.log('🔄 フォールバック手順生成完了:', {
        fallbackStepsCount: fallbackSteps.length,
        totalStepsAfterFallback: steps.length
      });
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

    // knowledge-base/troubleshootingフォルダに保存
    try {
      const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
      const filePath = path.join(troubleshootingDir, `${flowData.id}.json`);
      
      // ディレクトリが存在しない場合は作成
      if (!fs.existsSync(troubleshootingDir)) {
        fs.mkdirSync(troubleshootingDir, { recursive: true });
      }
      
      // ファイルに保存
      fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf8');
      
      console.log('✅ 生成フロー保存成功:', {
        id: flowData.id,
        title: flowData.title,
        stepsCount: flowData.steps.length,
        filePath: filePath
      });
    } catch (fileError) {
      console.error('❌ ファイル保存エラー:', fileError);
      return res.status(500).json({
        success: false,
        error: 'ファイルへの保存に失敗しました',
        details: fileError instanceof Error ? fileError.message : 'Unknown file error'
      });
    }

    // 生成されたフローの詳細情報を含むレスポンス
    const responseData = {
      success: true,
      data: flowData,
      message: 'フローが正常に生成されました',
      generatedContent: generatedContent, // GPTの生のレスポンス
      extractedSteps: steps.map(step => ({
        id: step.id,
        title: step.title,
        description: step.description
      })),
      summary: {
        totalSteps: steps.length,
        hasSpecificActions: steps.some(step => 
          step.description.includes('確認') || 
          step.description.includes('点検') || 
          step.description.includes('測定') ||
          step.description.includes('調整')
        ),
        safetyNotes: steps.some(step => 
          step.description.includes('安全') || 
          step.description.includes('危険') ||
          step.description.includes('停止')
        )
      }
    };

    res.json(responseData);

  } catch (error) {
    console.error('❌ フロー生成エラー:', error);
    res.status(500).json({
      success: false,
      error: 'フローの生成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// フロー生成のテスト用エンドポイント（開発環境のみ）
if (process.env.NODE_ENV === 'development') {
  router.post('/test-generate', async (req, res) => {
    try {
      const { keyword, testPrompt } = req.body;
      console.log(`🧪 テストフロー生成: キーワード=${keyword}`);

      if (!openai) {
        return res.status(503).json({
          success: false,
          error: 'OpenAI APIが利用できません'
        });
      }

      // テスト用のカスタムプロンプト
      const customPrompt = testPrompt || `以下の故障状況に対する応急処置フローを生成してください：${keyword}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `あなたは建設機械の故障診断と応急処置の専門家です。
以下の形式で具体的で実用的な応急処置フローを生成してください：

**必須フォーマット:**
1. タイトル：[具体的な問題名]
2. 手順：
   - 手順1：[具体的な作業内容と手順]
   - 手順2：[具体的な作業内容と手順]
   - 手順3：[具体的な作業内容と手順]
   （必要に応じて4-6手順まで）

**重要な要求事項:**
- 各手順は具体的な作業内容を含む（「確認する」「点検する」だけではなく、何をどう確認・点検するかを明記）
- 安全上の注意事項を含める
- 必要な工具や部品があれば明記
- 専門技術者への連絡が必要な場合は明記
- 技術者でも素人でも実行可能なレベルで説明

**例:**
手順1：エンジンルームの安全確認（エンジン停止、ブレーキ掛け、作業現場の安全確保）
手順2：バッテリー端子の点検（端子の緩み、腐食、接続状態を目視確認）
手順3：バッテリー電圧測定（テスターで12.6V以上あるか確認）`
          },
          {
            role: "user",
            content: customPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const generatedContent = completion.choices[0]?.message?.content;
      if (!generatedContent) {
        throw new Error('テストフロー生成に失敗しました');
      }

      res.json({
        success: true,
        data: {
          keyword,
          generatedContent,
          testPrompt: customPrompt,
          timestamp: new Date().toISOString()
        },
        message: 'テストフロー生成が完了しました'
      });

    } catch (error) {
      console.error('❌ テストフロー生成エラー:', error);
      res.status(500).json({
        success: false,
        error: 'テストフローの生成に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

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
    const uploadDir = path.join(__dirname, '../../knowledge-base/images/emergency-flows');
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
    
    // まず emergency-flows ディレクトリを確認
    let uploadDir = path.join(__dirname, '../../knowledge-base/images/emergency-flows');
    let filePath = path.join(uploadDir, fileName);
    
    // emergency-flows にファイルがない場合は chat-exports を確認
    if (!fs.existsSync(filePath)) {
      uploadDir = path.join(__dirname, '../../knowledge-base/images/chat-exports');
      filePath = path.join(uploadDir, fileName);
      
      console.log('🔄 emergency-flows にファイルが見つからないため、chat-exports を確認:', {
        fileName,
        chatExportsDir: uploadDir,
        chatExportsPath: filePath,
        exists: fs.existsSync(filePath)
      });
    }

    // デバッグログ強化
    console.log('🖼️ 画像リクエスト:', {
      fileName,
      uploadDir,
      filePath,
      exists: fs.existsSync(filePath),
      filesInDir: fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : []
    });

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'ファイルが存在しません',
        fileName,
        emergencyFlowsPath: path.join(__dirname, '../../knowledge-base/images/emergency-flows', fileName),
        chatExportsPath: path.join(__dirname, '../../knowledge-base/images/chat-exports', fileName),
        emergencyFlowsDir: fs.existsSync(path.join(__dirname, '../../knowledge-base/images/emergency-flows')) ? fs.readdirSync(path.join(__dirname, '../../knowledge-base/images/emergency-flows')) : [],
        chatExportsDir: fs.existsSync(path.join(__dirname, '../../knowledge-base/images/chat-exports')) ? fs.readdirSync(path.join(__dirname, '../../knowledge-base/images/chat-exports')) : []
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

    const troubleshootingDir = path.join(__dirname, '../../knowledge-base/troubleshooting');
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

// エラーハンドリングミドルウェア
router.use((err: any, req: any, res: any, next: any) => {
  console.error('応急処置フローエラー:', err);
  
  // Content-Typeを明示的に設定
  res.setHeader('Content-Type', 'application/json');
  
  res.status(500).json({
    success: false,
    error: '応急処置フローの処理中にエラーが発生しました',
    details: err.message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
});

// 404ハンドリング
router.use('*', (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: '応急処置フローのエンドポイントが見つかりません',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

export default router;