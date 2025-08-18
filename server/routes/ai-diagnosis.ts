import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { processOpenAIRequest } from '../lib/openai.js';

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
鉄道保守用車の故障診断を行います。${machineInfoText}

症状: ${userMessage}

簡潔に回答してください:
1. 症状の要約（1行）
2. 安全確認（必要な場合のみ）
3. 次の確認事項（1つだけ）

回答:`;
    } else if (step <= 5) {
      // 診断段階
      prompt = `
故障診断継続中（${step}/5）${machineInfoText}

これまでの確認内容:
${conversationHistory}

最新回答: ${userMessage}

簡潔に回答してください:
- 原因が特定できた場合: 応急処置手順（箇条書き）
- まだ不明な場合: 次の確認事項（1つだけ）

回答:`;
    } else {
      // 診断完了段階
      prompt = `
故障診断完了${machineInfoText}

確認した内容:
${conversationHistory}

最終回答: ${userMessage}

以下の形式で端的に回答してください:

**診断結果**
原因: （1行で）

**応急処置**
1. （手順1）
2. （手順2）
3. （手順3）

**注意事項**
・（重要な注意点のみ）

回答:`;
    }

    // OpenAI APIを呼び出し
    const aiResponse = await processOpenAIRequest(prompt, true);

    if (!aiResponse) {
      throw new Error('AI診断の生成に失敗しました');
    }

    // 次の質問があるかどうかを判定
    let nextQuestion = '';
    let completed = false;

    if (step >= 5 || aiResponse.includes('診断結果') || aiResponse.includes('応急処置手順')) {
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
