import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  DiagnosisState,
  updateDiagnosisState,
  generateInteractiveResponse,
  InteractiveResponse,
} from '../lib/interactive-diagnosis.js';
import { processOpenAIRequest } from '../lib/openai.js';

const router = Router();

// リクエストスキーマ
const InteractiveDiagnosisRequestSchema = z.object({
  userResponse: z.string().min(1),
  currentState: z
    .object({
      phase: z.enum([
        'initial',
        'investigation',
        'diagnosis',
        'action',
        'verification',
        'completed',
      ]),
      collectedInfo: z.object({
        symptoms: z.array(z.string()),
        vehicleType: z.string().nullable(),
        safetyStatus: z.string().nullable(),
        timing: z.string().nullable(),
        tools: z.string().nullable(),
        environment: z.string().nullable(),
        urgency: z.enum(['low', 'medium', 'high', 'critical']),
      }),
      suspectedCauses: z.array(z.string()),
      currentFocus: z.string().nullable(),
      nextActions: z.array(z.string()),
      confidence: z.number(),
      phraseHistory: z.array(z.string()).optional(),
      lastQuestion: z.string().optional(),
    })
    .optional(),
});

type InteractiveDiagnosisRequest = z.infer<
  typeof InteractiveDiagnosisRequestSchema
>;

/**
 * インタラクティブ故障診断 - ユーザーとの対話的な診断プロセス
 * POST /api/interactive-diagnosis
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // リクエストの検証
    const validationResult = InteractiveDiagnosisRequestSchema.safeParse(
      req.body
    );
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.errors,
      });
    }

    const { userResponse, currentState } = validationResult.data;

    // 初期状態の設定
    let diagnosisState: DiagnosisState;

    if (currentState) {
      diagnosisState = {
        phase: currentState.phase,
        collectedInfo: {
          symptoms: currentState.collectedInfo.symptoms,
          vehicleType: currentState.collectedInfo.vehicleType,
          safetyStatus: currentState.collectedInfo.safetyStatus,
          timing: currentState.collectedInfo.timing,
          tools: currentState.collectedInfo.tools,
          environment: currentState.collectedInfo.environment,
          urgency: currentState.collectedInfo.urgency,
        },
        suspectedCauses: currentState.suspectedCauses,
        currentFocus: currentState.currentFocus,
        nextActions: currentState.nextActions,
        confidence: currentState.confidence,
        phraseHistory: currentState.phraseHistory || [],
        lastQuestion: currentState.lastQuestion,
      };
    } else {
      diagnosisState = {
        phase: 'initial',
        collectedInfo: {
          symptoms: [],
          vehicleType: null,
          safetyStatus: null,
          timing: null,
          tools: null,
          environment: null,
          urgency: 'low',
        },
        suspectedCauses: [],
        currentFocus: null,
        nextActions: [],
        confidence: 0.0,
        phraseHistory: [],
        lastQuestion: undefined,
      };
    }

    // 診断状態の更新
    const updatedState = updateDiagnosisState(diagnosisState, userResponse);

    // インタラクティブレスポンスの生成
    let interactiveResponse = generateInteractiveResponse(
      updatedState,
      userResponse
    );

    // 高度な分析が必要な場合はOpenAI APIを使用
    if (updatedState.confidence < 0.6 && updatedState.phase === 'diagnosis') {
      try {
        // 収集した情報をコンテキストとしてまとめる
        const context = `
車両: ${updatedState.collectedInfo.vehicleType || '未特定'}
症状: ${updatedState.collectedInfo.symptoms.join(', ')}
緊急度: ${updatedState.collectedInfo.urgency}
安全状況: ${updatedState.collectedInfo.safetyStatus || '未確認'}
疑われる原因: ${updatedState.suspectedCauses.join(', ')}
最新回答: ${userResponse}
        `.trim();

        const aiPrompt = `
保守用車の故障診断を行っています。以下の情報に基づいて、次に確認すべき重要な質問を1つ提案してください。

${context}

以下の条件で回答してください：
1. 安全確認が最優先
2. 症状の原因を特定するための具体的な質問
3. 現場で確認可能な内容
4. 簡潔で理解しやすい表現

質問のみを回答してください（余計な説明は不要）。
        `;

        const aiResponse = await processOpenAIRequest(aiPrompt, true);

        // AI生成の質問で更新
        if (aiResponse && aiResponse.length > 0) {
          interactiveResponse = {
            ...interactiveResponse,
            message: `🤖 **AI分析結果**\n\n収集した情報を分析しました。より正確な診断のため、以下を確認させてください。`,
            nextQuestion: aiResponse,
            priority: 'diagnosis',
          };
        }
      } catch (error) {
        console.error('AI分析エラー:', error);
        // AIエラーの場合は通常のロジックを使用
      }
    }

    // 応急処置の具体的手順が必要な場合
    if (
      updatedState.phase === 'action' &&
      updatedState.suspectedCauses.length > 0
    ) {
      try {
        const primaryCause = updatedState.suspectedCauses[0];
        const vehicleInfo =
          updatedState.collectedInfo.vehicleType || '保守用車';

        const actionPrompt = `
${vehicleInfo}の${primaryCause}に対する応急処置手順を、現場で実行可能な形で提案してください。

症状: ${updatedState.collectedInfo.symptoms.join(', ')}
緊急度: ${updatedState.collectedInfo.urgency}

以下の形式で回答してください：
1. 安全確認事項
2. 準備するもの
3. 具体的手順（ステップバイステップ）
4. 確認ポイント

現場の技術者が迷わずに実行できる内容にしてください。
        `;

        const actionResponse = await processOpenAIRequest(actionPrompt, true);

        if (actionResponse && actionResponse.length > 0) {
          interactiveResponse = {
            ...interactiveResponse,
            message: `🛠️ **専門的応急処置手順**\n\n${actionResponse}`,
            nextQuestion: '上記の手順を実行しましたか？結果を教えてください。',
            priority: 'action',
          };
        }
      } catch (error) {
        console.error('応急処置生成エラー:', error);
      }
    }

    // 質問重複再表現はロジック層で実施済み（ここでは再処理しない）

    // 次回用に lastQuestion を更新
    (updatedState as any).lastQuestion =
      interactiveResponse.nextQuestion || null;

    // レスポンス
    const response = {
      interactiveResponse,
      updatedState,
      metadata: {
        phase: updatedState.phase,
        confidence: updatedState.confidence,
        urgency: updatedState.collectedInfo.urgency,
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('インタラクティブ診断エラー:', error);
    res.status(500).json({
      error: 'Interactive diagnosis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 新しい診断セッションの開始
 * POST /api/interactive-diagnosis/start
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const initialState: DiagnosisState = {
      phase: 'initial',
      collectedInfo: {
        symptoms: [],
        vehicleType: null,
        safetyStatus: null,
        timing: null,
        tools: null,
        environment: null,
        urgency: 'low',
      },
      suspectedCauses: [],
      currentFocus: null,
      nextActions: [],
      confidence: 0.0,
      phraseHistory: [],
      lastQuestion: undefined,
    };

    const initialResponse = generateInteractiveResponse(initialState);

    res.json({
      interactiveResponse: initialResponse,
      diagnosisState: initialState,
      sessionId: `diag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        phase: 'initial',
        confidence: 0.0,
        urgency: 'low',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('診断セッション開始エラー:', error);
    res.status(500).json({
      error: 'Failed to start diagnosis session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 診断状態の保存
 * POST /api/interactive-diagnosis/save
 */
router.post('/save', async (req: Request, res: Response) => {
  try {
    const { sessionId, diagnosisState, userNotes } = req.body;

    // ここで診断状態をデータベースに保存
    // 実装例：
    // await saveDiagnosisSession(sessionId, diagnosisState, userNotes);

    res.json({
      success: true,
      message: 'Diagnosis session saved successfully',
      sessionId,
    });
  } catch (error) {
    console.error('診断セッション保存エラー:', error);
    res.status(500).json({
      error: 'Failed to save diagnosis session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
