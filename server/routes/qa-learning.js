"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const openai_js_1 = require("../lib/openai.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
// Q&Aセッションから学習データを生成
router.post('/generate-learning-data', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const { question, answer, solution, success, category = 'troubleshooting', machineType, machineNumber, timestamp, } = req.body;
        if (!question || !answer || !solution) {
            return res.status(400).json({
                success: false,
                error: '必須パラメータが不足しています',
            });
        }
        // 学習データ生成のプロンプト
        const learningPrompt = `
以下のQ&Aセッションから学習データを生成してください：

**質問**: ${question}
**回答**: ${answer}
**解決策**: ${solution}
**成功**: ${success}
**機種**: ${machineType || '不明'}
**機械番号**: ${machineNumber || '不明'}
**カテゴリ**: ${category}

この情報をナレッジベースに追加するための構造化データを生成してください。
以下のJSON形式で返してください：

{
  "category": "カテゴリ名",
  "keywords": ["キーワード1", "キーワード2", "キーワード3"],
  "summary": "問題と解決策の要約（100文字以内）",
  "problem": "発生した問題の詳細",
  "solution": "具体的な解決手順",
  "prevention": "再発防止策",
  "difficulty": "難易度（初級/中級/上級）",
  "estimatedTime": "推定解決時間（分）",
  "requiredTools": ["必要な工具1", "必要な工具2"],
  "safetyNotes": "安全上の注意事項",
  "relatedKnowledge": ["関連する知識1", "関連する知識2"]
}
`;
        const response = await (0, openai_js_1.processOpenAIRequest)(learningPrompt, false);
        let learningData;
        try {
            learningData = JSON.parse(response);
        }
        catch (parseError) {
            console.error('学習データのJSON解析エラー:', parseError);
            return res.status(500).json({
                success: false,
                error: '学習データの生成に失敗しました',
            });
        }
        // 学習データを保存（実際の実装ではデータベースに保存）
        const savedData = {
            id: `learning_${Date.now()}`,
            ...learningData,
            originalQuestion: question,
            originalAnswer: answer,
            originalSolution: solution,
            success: success,
            machineType,
            machineNumber,
            category,
            timestamp: timestamp || new Date().toISOString(),
            createdAt: new Date().toISOString(),
        };
        // ナレッジベースに追加
        await addToKnowledgeBase(savedData);
        res.json({
            success: true,
            data: savedData,
            message: '学習データが正常に生成・保存されました',
        });
    }
    catch (error) {
        console.error('学習データ生成エラー:', error);
        res.status(500).json({
            success: false,
            error: '学習データの生成中にエラーが発生しました',
        });
    }
});
// ナレッジベースに学習データを追加
async function addToKnowledgeBase(learningData) {
    try {
        // 学習データをナレッジベースの形式に変換
        const knowledgeContent = `
# ${learningData.category} - ${learningData.summary}

## 問題
${learningData.problem}

## 解決策
${learningData.solution}

## 再発防止策
${learningData.prevention}

## 詳細情報
- **難易度**: ${learningData.difficulty}
- **推定時間**: ${learningData.estimatedTime}分
- **必要な工具**: ${learningData.requiredTools.join(', ')}
- **安全上の注意**: ${learningData.safetyNotes}
- **関連知識**: ${learningData.relatedKnowledge.join(', ')}

## 元のQ&A
**質問**: ${learningData.originalQuestion}
**回答**: ${learningData.originalAnswer}
**解決策**: ${learningData.originalSolution}
**成功**: ${learningData.success}
**機種**: ${learningData.machineType || '不明'}
**機械番号**: ${learningData.machineNumber || '不明'}

---
生成日時: ${learningData.createdAt}
`;
        // ファイルとして保存
        const knowledgeDir = path_1.default.join(process.cwd(), 'knowledge-base', 'learning');
        if (!fs_1.default.existsSync(knowledgeDir)) {
            fs_1.default.mkdirSync(knowledgeDir, { recursive: true });
        }
        const fileName = `learning_${Date.now()}.json`;
        const filePath = path_1.default.join(knowledgeDir, fileName);
        fs_1.default.writeFileSync(filePath, JSON.stringify({
            content: knowledgeContent,
            metadata: learningData,
            keywords: learningData.keywords,
            category: learningData.category,
        }, null, 2));
        console.log(`学習データを保存しました: ${filePath}`);
    }
    catch (error) {
        console.error('ナレッジベースへの追加エラー:', error);
        throw error;
    }
}
// 学習データの一覧取得
router.get('/learning-data', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const knowledgeDir = path_1.default.join(process.cwd(), 'knowledge-base', 'learning');
        if (!fs_1.default.existsSync(knowledgeDir)) {
            return res.json({
                success: true,
                data: [],
            });
        }
        const files = fs_1.default
            .readdirSync(knowledgeDir)
            .filter((file) => file.endsWith('.json'))
            .sort((a, b) => {
            const aTime = fs_1.default.statSync(path_1.default.join(knowledgeDir, a)).mtime.getTime();
            const bTime = fs_1.default.statSync(path_1.default.join(knowledgeDir, b)).mtime.getTime();
            return bTime - aTime;
        });
        const learningData = files
            .map((file) => {
            try {
                const filePath = path_1.default.join(knowledgeDir, file);
                const content = fs_1.default.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(content);
                return {
                    id: file.replace('.json', ''),
                    ...data.metadata,
                    content: data.content,
                };
            }
            catch (error) {
                console.error(`ファイル読み込みエラー: ${file}`, error);
                return null;
            }
        })
            .filter(Boolean);
        res.json({
            success: true,
            data: learningData,
        });
    }
    catch (error) {
        console.error('学習データ取得エラー:', error);
        res.status(500).json({
            success: false,
            error: '学習データの取得中にエラーが発生しました',
        });
    }
});
// 学習データの削除
router.delete('/learning-data/:id', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const knowledgeDir = path_1.default.join(process.cwd(), 'knowledge-base', 'learning');
        const filePath = path_1.default.join(knowledgeDir, `${id}.json`);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            res.json({
                success: true,
                message: '学習データが削除されました',
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: '指定された学習データが見つかりません',
            });
        }
    }
    catch (error) {
        console.error('学習データ削除エラー:', error);
        res.status(500).json({
            success: false,
            error: '学習データの削除中にエラーが発生しました',
        });
    }
});
exports.default = router;
