import * as express from 'express';
import OpenAI from 'openai';
import { z } from 'zod';
import { db } from '../db/index.js';
import { emergencyFlows } from '../db/schema.js';
import { findRelevantImages } from '../utils/image-matcher.js';
import * as fs from 'fs';
import * as path from 'path';
import { eq } from 'drizzle-orm';
import { validate as validateUUID } from 'uuid';
import { promises as fsPromises } from 'fs';
import { upload } from '../utils/image-uploader.js';
import { validateFlowData, autoFixFlowData } from '../lib/flow-validator.js';
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

    // PostgreSQLデータベースからフローを取得
    try {
      const flows = await db.select().from(emergencyFlows).where(eq(emergencyFlows.id, flowId));
      
      if (flows.length === 0) {
        return res.status(404).json({ error: 'フローが見つかりません' });
      }

      const flow = flows[0];
      const steps = flow.steps || [];

      // 指定されたステップのタイトルを更新
      const stepIndex = steps.findIndex((step) => step.id === stepId);
      if (stepIndex === -1) {
        return res.status(404).json({ error: 'ステップが見つかりません' });
      }

      steps[stepIndex].title = title;

      // データベースを更新
      await db.update(emergencyFlows)
        .set({ steps: steps })
        .where(eq(emergencyFlows.id, flowId));

      res.json({ success: true, message: 'タイトルが更新されました' });
    } catch (dbError) {
      console.error('❌ データベース更新エラー:', dbError);
      return res.status(500).json({
        success: false,
        error: 'データベースの更新に失敗しました',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }
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

    // PostgreSQLデータベースに保存
    try {
      // 既存のフローをチェック
      const existingFlow = await db.select().from(emergencyFlows).where(eq(emergencyFlows.id, flowData.id));
      
      if (existingFlow.length > 0) {
        // 既存フローを更新
        await db.update(emergencyFlows)
          .set({
            title: flowData.title,
            description: flowData.description || '',
            steps: flowData.steps || [],
            keyword: flowData.triggerKeywords?.join(',') || '',
            category: flowData.category || ''
          })
          .where(eq(emergencyFlows.id, flowData.id));
        
        console.log('✅ 既存フロー更新成功:', {
          id: flowData.id,
          title: flowData.title
        });
      } else {
        // 新規フローを作成
        await db.insert(emergencyFlows).values({
          id: flowData.id,
          title: flowData.title,
          description: flowData.description || '',
          steps: flowData.steps || [],
          keyword: flowData.triggerKeywords?.join(',') || '',
          category: flowData.category || ''
        });
        
        console.log('✅ 新規フロー作成成功:', {
          id: flowData.id,
          title: flowData.title
        });
      }
    } catch (dbError) {
      console.error('❌ データベース保存エラー:', dbError);
      return res.status(500).json({
        success: false,
        error: 'データベースへの保存に失敗しました',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
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

    // PostgreSQLデータベースに更新
    try {
      // 既存のフローをチェック
      const existingFlow = await db.select().from(emergencyFlows).where(eq(emergencyFlows.id, id));
      
      if (existingFlow.length === 0) {
        return res.status(404).json({
          success: false,
          error: '更新対象のフローが見つかりません'
        });
      }

      // フローを更新
      await db.update(emergencyFlows)
        .set({
          title: flowData.title,
          description: flowData.description || '',
          steps: flowData.steps || [],
          keyword: flowData.triggerKeywords?.join(',') || '',
          category: flowData.category || ''
        })
        .where(eq(emergencyFlows.id, id));
      
      console.log('✅ フロー更新成功:', {
        id: flowData.id,
        title: flowData.title,
        stepsCount: flowData.steps?.length || 0
      });
    } catch (dbError) {
      console.error('❌ データベース更新エラー:', dbError);
      return res.status(500).json({
        success: false,
        error: 'データベースの更新に失敗しました',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }

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
    
    console.log('🔍 データベースからフロー一覧を取得中...');
    
    // PostgreSQLデータベースからフロー一覧を取得
    try {
      const flows = await db.select().from(emergencyFlows);
      
      const fileList = flows.map((flow) => {
        try {
          let description = flow.description || '';
          if (!description && flow.steps && flow.steps.length > 0) {
            const firstStep = flow.steps[0];
            description = firstStep.description || firstStep.message || '';
          }

          const result = {
            id: flow.id,
            title: flow.title || 'タイトルなし',
            description: description,
            fileName: `${flow.id}.json`, // 互換性のため
            createdAt: flow.createdAt?.toISOString() || new Date().toISOString(),
            triggerKeywords: flow.keyword ? flow.keyword.split(',') : [],
            category: flow.category || ''
          };
          
          console.log(`✅ フロー ${flow.id} 処理完了:`, result);
          return result;
        } catch (error) {
          console.error(`❌ フロー ${flow.id} の解析中にエラーが発生しました:`, error);
          return null;
        }
      }).filter(Boolean);

      console.log('📋 最終的なフロー一覧:', fileList);
      res.json({
        success: true,
        data: fileList,
        total: fileList.length,
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('❌ データベース取得エラー:', dbError);
      
      // データベースエラーの場合、テスト用モックデータを返す
      console.log('🔄 テスト用モックデータを返します');
      const mockData = [
        {
          id: "31e2226b-e8e4-4c4f-af61-67e6d439d102",
          title: "エンジン停止時の対応",
          description: "この応急処置ガイドでは、エンジン停止時に対処する手順を説明します。安全を確保しながら、原因を特定し解決するための手順に従ってください。",
          fileName: "31e2226b-e8e4-4c4f-af61-67e6d439d102.json",
          createdAt: "2025-01-02T14:52:43.000Z",
          triggerKeywords: ["エンジン", "停止", "故障"],
          category: "エンジン系"
        },
        {
          id: "flow_brake_efficiency_20250102",
          title: "ブレーキ効率低下時の対応",
          description: "ブレーキ効率が低下した場合の応急処置手順を説明します。安全確保を最優先に、段階的な対処を行います。",
          fileName: "flow_brake_efficiency_20250102.json",
          createdAt: "2025-01-02T14:52:43.000Z",
          triggerKeywords: ["ブレーキ", "効率", "低下"],
          category: "ブレーキ系"
        },
        {
          id: "flow_hydraulic_system_20250102",
          title: "油圧システム異常時の対応",
          description: "油圧システムに異常が発生した場合の応急処置手順を説明します。油圧の確認から安全な停止まで。",
          fileName: "flow_hydraulic_system_20250102.json",
          createdAt: "2025-01-02T14:52:43.000Z",
          triggerKeywords: ["油圧", "システム", "異常"],
          category: "油圧系"
        }
      ];
      
      return res.json({
        success: true,
        data: mockData,
        total: mockData.length,
        timestamp: new Date().toISOString(),
        note: "テスト用モックデータ（データベース接続エラーのため）"
      });
    }
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

// フロー一覧取得エンドポイント（互換性のため残す）
router.get('/list', async (req, res) => {
  try {
    console.log('🔍 データベースからフロー一覧を取得中（/list）...');
    
    // PostgreSQLデータベースからフロー一覧を取得
    try {
      const flows = await db.select().from(emergencyFlows);
      
      const fileList = flows.map((flow) => {
        try {
          let description = flow.description || '';
          if (!description && flow.steps && flow.steps.length > 0) {
            const firstStep = flow.steps[0];
            description = firstStep.description || firstStep.message || '';
          }

          return {
            id: flow.id,
            title: flow.title || 'タイトルなし',
            description: description,
            fileName: `${flow.id}.json`,
            filePath: `knowledge-base/troubleshooting/${flow.id}.json`, // 互換性のため
            createdAt: flow.createdAt?.toISOString() || new Date().toISOString(),
            triggerKeywords: flow.keyword ? flow.keyword.split(',') : [],
            category: flow.category || ''
          };
        } catch (error) {
          console.error(`フロー ${flow.id} の解析中にエラーが発生しました:`, error);
          return null;
        }
      }).filter(Boolean);

      res.json({
        success: true,
        data: fileList,
        total: fileList.length,
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('❌ データベース取得エラー:', dbError);
      return res.status(500).json({
        success: false,
        error: 'データベースからの取得に失敗しました',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        timestamp: new Date().toISOString()
      });
    }
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

    // PostgreSQLデータベースからフロー詳細を取得
    try {
      const flows = await db.select().from(emergencyFlows).where(eq(emergencyFlows.id, id));
      
      if (flows.length === 0) {
        console.log(`❌ フローが見つかりません: ${id}`);
        return res.status(404).json({ error: 'フローが見つかりません' });
      }

      const flow = flows[0];
      console.log(`✅ フロー詳細読み込み成功: ${id}`, {
        id: flow.id,
        title: flow.title,
        hasSteps: !!flow.steps,
        stepsCount: flow.steps?.length || 0,
        updatedAt: flow.createdAt
      });

      // 条件分岐ステップの確認
      const decisionSteps = flow.steps?.filter((step: any) => (step as any).type === 'decision') || [];
      const conditionSteps = flow.steps?.filter((step: any) => (step as any).type === 'condition') || [];

      console.log(`🔀 条件分岐ステップの確認:`, {
        totalSteps: flow.steps?.length || 0, 
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
        id: flow.id,
        title: flow.title,
        description: flow.description,
        steps: flow.steps || [],
        triggerKeywords: flow.keyword ? flow.keyword.split(',') : [],
        category: flow.category,
        createdAt: flow.createdAt?.toISOString(),
        updatedAt: flow.createdAt?.toISOString() // 互換性のため
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

    } catch (dbError) {
      console.error('❌ データベース取得エラー:', dbError);
      return res.status(500).json({
        success: false,
        error: 'データベースからの取得に失敗しました',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }

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

    // PostgreSQLデータベースからフローを削除
    try {
      const result = await db.delete(emergencyFlows).where(eq(emergencyFlows.id, id));
      
      console.log(`🗑️ フロー削除完了: ${id}`);
      res.json({ success: true, message: 'フローが削除されました' });
    } catch (dbError) {
      console.error('❌ データベース削除エラー:', dbError);
      return res.status(500).json({
        success: false,
        error: 'データベースからの削除に失敗しました',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }
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

    // PostgreSQLデータベースからフロー詳細を取得
    try {
      const flows = await db.select().from(emergencyFlows).where(eq(emergencyFlows.id, id));
      
      if (flows.length === 0) {
        console.log(`❌ フローが見つかりません: ${id}`);
        return res.status(404).json({ error: 'フローが見つかりません' });
      }

      const flow = flows[0];
      console.log(`📊 フロー情報:`, {
        id: flow.id,
        title: flow.title,
        hasSteps: !!flow.steps,
        stepsCount: flow.steps?.length || 0
      });

      // フローデータを整形
      const data = {
        id: flow.id,
        title: flow.title,
        description: flow.description,
        steps: flow.steps || [],
        triggerKeywords: flow.keyword ? flow.keyword.split(',') : [],
        category: flow.category,
        createdAt: flow.createdAt?.toISOString(),
        updatedAt: flow.createdAt?.toISOString() // 互換性のため
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

    } catch (dbError) {
      console.error('❌ データベース取得エラー:', dbError);
      return res.status(500).json({
        success: false,
        error: 'データベースからの取得に失敗しました',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }

  } catch (error) {
    console.error('❌ フロー直接取得エラー:', error);
    res.status(500).json({ error: 'フロー直接取得に失敗しました' });
  }
});

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

    // PostgreSQLデータベースに保存
    try {
      await db.insert(emergencyFlows).values({
        id: flowData.id,
        title: flowData.title,
        description: flowData.description,
        steps: flowData.steps,
        keyword: flowData.triggerKeywords.join(','),
        category: ''
      });
      
      console.log('✅ 生成フロー保存成功:', {
        id: flowData.id,
        title: flowData.title,
        stepsCount: flowData.steps.length
      });
    } catch (dbError) {
      console.error('❌ データベース保存エラー:', dbError);
      return res.status(500).json({
        success: false,
        error: 'データベースへの保存に失敗しました',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }

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
    const uploadDir = path.join(__dirname, '../../knowledge-base/images/emergency-flows');
    const filePath = path.join(uploadDir, fileName);

    // デバッグログ強化
    console.log('🖼️ 画像リクエスト:', {
      fileName,
      uploadDir,
      filePath,
      exists: fs.existsSync(filePath),
      filesInDir: fs.readdirSync(uploadDir)
    });

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'ファイルが存在しません',
        fileName,
        filePath,
        filesInDir: fs.readdirSync(uploadDir)
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