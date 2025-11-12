"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const troubleshooting_qa_js_1 = require("../lib/troubleshooting-qa.js");
const router = express_1.default.Router();
const troubleshootingQA = new troubleshooting_qa_js_1.TroubleshootingQA();
// トラブルシューティングセッションの開始
router.post('/start', async (_req, res) => {
    try {
        const { problemDescription } = req.body;
        if (!problemDescription) {
            return res.status(400).json({
                success: false,
                error: '問題の説明が必要です',
            });
        }
        console.log('🔍 トラブルシューティング開始:', problemDescription);
        const response = await troubleshootingQA.startTroubleshooting(problemDescription);
        res.json({
            success: true,
            data: response,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ トラブルシューティング開始エラー:', error);
        res.status(500).json({
            success: false,
            error: 'トラブルシューティングの開始に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// 回答の処理と次の質問の生成
router.post('/answer', async (_req, res) => {
    try {
        const { problemDescription, previousAnswers, currentAnswer } = req.body;
        if (!problemDescription || !currentAnswer) {
            return res.status(400).json({
                success: false,
                error: '問題の説明と回答が必要です',
            });
        }
        console.log('🔍 回答処理:', {
            problemDescription,
            currentAnswer,
            previousAnswersCount: previousAnswers?.length || 0,
        });
        const response = await troubleshootingQA.processAnswer(problemDescription, previousAnswers || [], currentAnswer);
        res.json({
            success: true,
            data: response,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ 回答処理エラー:', error);
        res.status(500).json({
            success: false,
            error: '回答の処理に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// 解決策の生成
router.post('/solution', async (_req, res) => {
    try {
        const { problemDescription, answers } = req.body;
        if (!problemDescription || !answers) {
            return res.status(400).json({
                success: false,
                error: '問題の説明と回答履歴が必要です',
            });
        }
        console.log('🔍 解決策生成:', {
            problemDescription,
            answersCount: answers.length,
        });
        const solution = await troubleshootingQA.generateSolution(problemDescription, answers);
        res.json({
            success: true,
            data: {
                solution,
                problemDescription,
                answersCount: answers.length,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        console.error('❌ 解決策生成エラー:', error);
        res.status(500).json({
            success: false,
            error: '解決策の生成に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
