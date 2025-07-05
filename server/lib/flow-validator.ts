"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
export const validateFlowData: any = validateFlowData;
export const autoFixFlowData: any = autoFixFlowData;
import zod_1 from "zod";
import crypto_1 from "crypto";
// フローデータのスキーマ定義
var flowDataSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    steps: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        message: zod_1.z.string(),
        type: zod_1.z.enum(['start', 'step', 'decision', 'condition', 'end']),
        imageUrl: zod_1.z.string().optional(),
        options: zod_1.z.array(zod_1.z.object({
            text: zod_1.z.string(),
            nextStepId: zod_1.z.string(),
            isTerminal: zod_1.z.boolean(),
            conditionType: zod_1.z.enum(['yes', 'no', 'other']),
            condition: zod_1.z.string().optional()
        })).optional()
    })),
    triggerKeywords: zod_1.z.array(zod_1.z.string())
});
/**
 * フローデータを検証し、エラーがある場合は詳細を返す
 * @param data 検証するフローデータ
 * @returns 検証結果とエラー詳細
 */
function validateFlowData(data) {
    try {
        var validatedData = flowDataSchema.parse(data);
        return {
            isValid: true,
            data: validatedData,
            errors: null
        };
    }
    catch (error) {
        var errorDetails = [];
        if (error instanceof zod_1.z.ZodError) {
            errorDetails = error.errors.map(function (err) { return ({
                path: err.path.join('.'),
                message: err.message,
                code: err.code
            }); });
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
function autoFixFlowData(data) {
    var fixed = __assign({}, data);
    // IDがない場合は生成
    if (!fixed.id || typeof fixed.id !== 'string') {
        fixed.id = crypto_1.default.randomUUID();
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
        fixed.steps = fixed.steps.map(function (step, index) { return ({
            id: step.id || "step_".concat(index + 1),
            title: step.title || "\u30B9\u30C6\u30C3\u30D7 ".concat(index + 1),
            description: step.description || step.message || '',
            message: step.message || step.description || '',
            type: step.type || 'step',
            imageUrl: step.imageUrl || undefined,
            options: Array.isArray(step.options) ? step.options.map(function (opt) { return ({
                text: opt.text || '',
                nextStepId: opt.nextStepId || '',
                isTerminal: Boolean(opt.isTerminal),
                conditionType: opt.conditionType || 'other',
                condition: opt.condition || ''
            }); }) : undefined
        }); });
    }
    else {
        fixed.steps = [];
    }
    // トリガーキーワードの修正
    if (!Array.isArray(fixed.triggerKeywords)) {
        fixed.triggerKeywords = [];
    }
    return fixed;
}
