import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { processOpenAIRequest } from '../lib/openai';

const router = Router();

// AI診断リクエストのスキーマ
const AiDiagnosisRequestSchema = z.object({
  sessionId: z.string(),
  step: z.number(),
  userMessage: z.string(),
  context: z.array(z.string()),
  machineInfo: z.object({
    selectedMachineType: z.string().optional(),
    selectedMachineNumber: z.string().optional(),
    machineTypeName: z.string().optional(),
    machineNumber: z.string().optional()
  }).optional()
});

type AiDiagnosisRequest = z.infer<typeof AiDiagnosisRequestSchema>;

/**
 * AI故障診断 - GPTを活用した一問一答形式の診断
 * POST /api/ai-diagnosis
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // リクエストの検証
    const validationResult = AiDiagnosisRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.errors
      });
    }

    const { sessionId, step, userMessage, context, machineInfo } = validationResult.data;

    // 機械情報の文字列化
    let machineInfoText = '';
    if (machineInfo && machineInfo.machineTypeName && machineInfo.machineNumber) {
      machineInfoText = `\n対象機械: ${machineInfo.machineTypeName} (機械番号: ${machineInfo.machineNumber})`;
    }

    // コンテキストの構築
    const conversationHistory = context.map((msg, index) => {
      return `${index % 2 === 0 ? 'ユーザー' : 'AI'}: ${msg}`;
    }).join('\n');

    // GPTへのプロンプト作成
    let prompt = '';
    
    if (step === 1) {
      // 初回メッセージの場合
      prompt = `
あなたは鉄道保守用車の専門技術者です。現場作業員とチャット形式で故障診断をサポートしてください。${machineInfoText}

現場作業員からの報告: ${userMessage}

以下の方針でチャット形式で応答してください：
- 親しみやすく、現場作業員が理解しやすい言葉遣い
- 一度に1つだけの質問をする
- 安全が最優先の場合は、安全確認を最初に行う
- 番号付きリストや要約形式は使わない
- 自然な会話形式で応答

最初の応答:`;
    } else if (step <= 5) {
      // 診断段階
      prompt = `
あなたは鉄道保守用車の専門技術者です。現場作業員とチャット形式で故障診断を続けています。${machineInfoText}

これまでの会話:
${conversationHistory}

現場作業員の最新回答: ${userMessage}

以下の方針で応答してください：
- 親しみやすく、現場作業員が理解しやすい言葉遣い
- 原因が特定できた場合は、簡潔に応急処置を提案
- まだ不明な場合は、次に確認すべき1つのことだけを聞く
- 番号付きリストや要約形式は使わない
- 自然な会話形式で応答

応答:`;
    } else {
      // 診断完了段階
      prompt = `
あなたは鉄道保守用車の専門技術者です。故障診断を完了します。${machineInfoText}

これまでの会話:
${conversationHistory}

現場作業員の最終回答: ${userMessage}

以下の方針で最終的な応急処置を提案してください：
- 親しみやすく、現場作業員が理解しやすい言葉遣い
- 原因を簡潔に説明し、具体的な応急処置手順を提示
- 安全上の注意点があれば含める
- 自然な会話形式で応答

最終応答:`;
    }

    // OpenAI APIを呼び出し
    const aiResponse = await processOpenAIRequest(prompt, true);

    if (!aiResponse) {
      throw new Error('AI診断の生成に失敗しました');
    }

    // 次の質問があるかどうかを判定
    let nextQuestion = '';
    let completed = false;

    // 診断完了の判定をより柔軟に
    if (step >= 6 || 
        aiResponse.includes('応急処置') && aiResponse.includes('手順') ||
        aiResponse.includes('対処法') && !aiResponse.includes('?') && !aiResponse.includes('？') ||
        aiResponse.includes('専門家') && aiResponse.includes('連絡') ||
        aiResponse.includes('解決') && !aiResponse.includes('質問') ||
        aiResponse.includes('診断完了') ||
        aiResponse.includes('技術サポート')) {
      completed = true;
    } else if (aiResponse.includes('?') || aiResponse.includes('？')) {
      // 質問が含まれている場合は次の質問として抽出
      const questionMatch = aiResponse.match(/[^。]*[？?][^。]*/);
      if (questionMatch) {
        nextQuestion = questionMatch[0].trim();
      }
    }

    // レスポンス
    const response = {
      sessionId,
      step,
      response: aiResponse,
      nextQuestion,
      completed,
      metadata: {
        timestamp: new Date().toISOString(),
        machineInfo: machineInfo || null
      }
    };

    res.json(response);

  } catch (error) {
    console.error('AI診断エラー:', error);
    res.status(500).json({
      error: 'AI diagnosis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
