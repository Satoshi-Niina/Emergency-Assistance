import { z } from 'zod';
import crypto from 'crypto';

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

export type FlowData = z.infer<typeof flowDataSchema>;

/**
 * フローデータを検証し、エラーがある場合は詳細を返す
 * @param data 検証するフローデータ
 * @returns 検証結果とエラー詳細
 */
export function validateFlowData(data: any) {
  try {
    const validatedData = flowDataSchema.parse(data);
    return {
      isValid: true,
      data: validatedData,
      errors: null
    };
  } catch (error) {
    let errorDetails: Array<{ path: string; message: string; code: string }> = [];
    if (error instanceof z.ZodError) {
      errorDetails = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
    }
    return {
      isValid: false,
      data: null,
      errors: errorDetails
    };
  }
}

/**
 * フローデータの自動修正を試みる
 * @param data 修正するフローデータ
 * @returns 修正されたデータ
 */
export function autoFixFlowData(data: any) {
  const fixed = { ...data };

  // IDがない場合は生成
  if (!fixed.id || typeof fixed.id !== 'string') {
    fixed.id = crypto.randomUUID();
  }

  // タイトルがない場合は仮のタイトルを設定
  if (!fixed.title) {
    fixed.title = '無題のフロー';
  }

  // 説明がない場合は空文字を設定
  if (!fixed.description) {
    fixed.description = '';
  }

  // ステップの修正
  if (Array.isArray(fixed.steps)) {
    fixed.steps = fixed.steps.map((step: any, index: number) => ({
      id: step.id || `step_${index + 1}`,
      title: step.title || `ステップ ${index + 1}`,
      description: step.description || step.message || '',
      message: step.message || step.description || '',
      type: step.type || 'step',
      imageUrl: step.imageUrl || undefined,
      options: Array.isArray(step.options) ? step.options.map((opt: any) => ({
        text: opt.text || '',
        nextStepId: opt.nextStepId || '',
        isTerminal: Boolean(opt.isTerminal),
        conditionType: opt.conditionType || 'other',
        condition: opt.condition || ''
      })) : undefined
    }));
  } else {
    fixed.steps = [];
  }

  // トリガーキーワードの修正
  if (!Array.isArray(fixed.triggerKeywords)) {
    fixed.triggerKeywords = [];
  }

  return fixed;
} 