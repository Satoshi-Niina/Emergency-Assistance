import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
const router = Router();
// ES module用の__dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// RAG設定の保存・読み込み用のファイルパス
const RAG_SETTINGS_FILE = path.join(__dirname, '../data/rag-settings.json');
// デフォルトのRAG設定
const DEFAULT_RAG_SETTINGS = {
    chunkSize: 1000,
    chunkOverlap: 200,
    similarityThreshold: 0.7,
    maxResults: 10,
    useSemanticSearch: true,
    useKeywordSearch: true,
    removeDuplicates: true,
    preprocessingOptions: {
        removeStopWords: true,
        lowercaseText: true,
        removeSpecialChars: false,
    },
    customPrompt: '',
    temperature: 0.7,
    maxTokens: 2000,
};
// RAG設定を保存するディレクトリを確保
async function ensureDataDirectory() {
    const dataDir = path.dirname(RAG_SETTINGS_FILE);
    try {
        await fs.access(dataDir);
    }
    catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}
// RAG設定を取得
router.get('/rag', async (req, res) => {
    try {
        console.log('🔍 RAG設定取得リクエスト');
        await ensureDataDirectory();
        try {
            const data = await fs.readFile(RAG_SETTINGS_FILE, 'utf-8');
            const settings = JSON.parse(data);
            console.log('✅ RAG設定読み込み成功:', settings);
            res.json(settings);
        }
        catch (error) {
            // ファイルが存在しない場合はデフォルト設定を返す
            console.log('📝 RAG設定ファイルが存在しないため、デフォルト設定を返します');
            res.json(DEFAULT_RAG_SETTINGS);
        }
    }
    catch (error) {
        console.error('❌ RAG設定取得エラー:', error);
        res.status(500).json({
            error: 'RAG設定の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// RAG設定を保存
router.post('/rag', authenticateToken, async (req, res) => {
    try {
        console.log('💾 RAG設定保存リクエスト:', req.body);
        await ensureDataDirectory();
        // 設定をバリデーション
        const settings = {
            ...DEFAULT_RAG_SETTINGS,
            ...req.body,
        };
        // 数値型のバリデーション
        if (typeof settings.chunkSize !== 'number' ||
            settings.chunkSize < 100 ||
            settings.chunkSize > 2000) {
            return res
                .status(400)
                .json({ error: 'チャンクサイズは100-2000の範囲で設定してください' });
        }
        if (typeof settings.chunkOverlap !== 'number' ||
            settings.chunkOverlap < 0 ||
            settings.chunkOverlap >= settings.chunkSize) {
            return res
                .status(400)
                .json({
                error: 'チャンクオーバーラップはチャンクサイズ未満で設定してください',
            });
        }
        if (typeof settings.similarityThreshold !== 'number' ||
            settings.similarityThreshold < 0.1 ||
            settings.similarityThreshold > 1.0) {
            return res
                .status(400)
                .json({ error: '類似度閾値は0.1-1.0の範囲で設定してください' });
        }
        if (typeof settings.maxResults !== 'number' ||
            settings.maxResults < 1 ||
            settings.maxResults > 20) {
            return res
                .status(400)
                .json({ error: '最大結果数は1-20の範囲で設定してください' });
        }
        // ファイルに保存
        await fs.writeFile(RAG_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
        console.log('✅ RAG設定保存成功:', settings);
        res.json({ success: true, settings });
    }
    catch (error) {
        console.error('❌ RAG設定保存エラー:', error);
        res.status(500).json({
            error: 'RAG設定の保存に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// OpenAI APIキーを保存
router.post('/openai-api-key', authenticateToken, async (req, res) => {
    try {
        console.log('🔑 OpenAI APIキー保存リクエスト');
        const { apiKey } = req.body;
        if (!apiKey || typeof apiKey !== 'string') {
            return res.status(400).json({
                error: 'APIキーが提供されていません',
            });
        }
        if (!apiKey.startsWith('sk-')) {
            return res.status(400).json({
                error: 'OpenAI APIキーは「sk-」で始まる必要があります',
            });
        }
        // 環境変数として設定（実際の本番環境では環境変数ファイルに保存することを推奨）
        process.env.OPENAI_API_KEY = apiKey;
        console.log('✅ OpenAI APIキー保存成功');
        res.json({
            success: true,
            message: 'OpenAI APIキーを保存しました',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ OpenAI APIキー保存エラー:', error);
        res.status(500).json({
            error: 'OpenAI APIキーの保存に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// OpenAI APIキーを取得
router.get('/openai-api-key', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 OpenAI APIキー取得リクエスト');
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return res.json({
                success: true,
                hasApiKey: false,
                message: 'OpenAI APIキーが設定されていません',
            });
        }
        // セキュリティのため、APIキーの一部のみを返す
        const maskedApiKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
        res.json({
            success: true,
            hasApiKey: true,
            maskedApiKey,
            message: 'OpenAI APIキーが設定されています',
        });
    }
    catch (error) {
        console.error('❌ OpenAI APIキー取得エラー:', error);
        res.status(500).json({
            error: 'OpenAI APIキーの取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// AI支援設定ファイルのパス
const AI_ASSIST_SETTINGS_FILE = path.join(__dirname, '../data/ai-assist-settings.json');
// デフォルトのAI支援設定
const DEFAULT_AI_ASSIST_SETTINGS = {
    initialPrompt: '何か問題がありましたか？お困りの事象を教えてください！',
    conversationStyle: 'frank', // 'frank', 'business', 'technical'
    questionFlow: {
        step1: '具体的な症状を教えてください',
        step2: 'いつ頃から発生していますか？',
        step3: '作業環境や状況を教えてください',
        step4: '他に気になることはありますか？',
        step5: '緊急度を教えてください'
    },
    branchingConditions: {
        timeCheck: true,
        detailsCheck: true,
        toolsCheck: true,
        safetyCheck: true
    },
    responsePattern: 'step_by_step', // 'step_by_step', 'comprehensive', 'minimal'
    escalationTime: 20, // 分
    customInstructions: '',
    enableEmergencyContact: true
};
// AI支援設定を取得
router.get('/ai-assist', async (req, res) => {
    try {
        console.log('🔍 AI支援設定取得リクエスト:', req.path, req.originalUrl);
        await ensureDataDirectory();
        try {
            const data = await fs.readFile(AI_ASSIST_SETTINGS_FILE, 'utf-8');
            const settings = JSON.parse(data);
            console.log('✅ AI支援設定読み込み成功:', settings);
            res.json({
                success: true,
                data: settings,
            });
        }
        catch (error) {
            // ファイルが存在しない場合はデフォルト設定を返す
            console.log('📝 AI支援設定ファイルが存在しないため、デフォルト設定を返します');
            res.json({
                success: true,
                data: DEFAULT_AI_ASSIST_SETTINGS,
            });
        }
    }
    catch (error) {
        console.error('❌ AI支援設定取得エラー:', error);
        res.status(500).json({
            error: 'AI支援設定の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// AI支援設定を保存
router.post('/ai-assist', authenticateToken, async (req, res) => {
    try {
        console.log('💾 AI支援設定保存リクエスト:', req.path, req.originalUrl, req.body);
        await ensureDataDirectory();
        // 設定をバリデーション
        const settings = {
            ...DEFAULT_AI_ASSIST_SETTINGS,
            ...req.body,
        };
        // ファイルに保存
        await fs.writeFile(AI_ASSIST_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
        console.log('✅ AI支援設定保存成功:', settings);
        res.json({
            success: true,
            data: settings,
            message: 'AI支援設定が保存されました',
        });
    }
    catch (error) {
        console.error('❌ AI支援設定保存エラー:', error);
        res.status(500).json({
            error: 'AI支援設定の保存に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// デバッグ用: ルーターが正しく登録されているか確認
router.get('/test', async (req, res) => {
    res.json({
        success: true,
        message: 'Settings router is working',
        path: req.path,
        originalUrl: req.originalUrl,
    });
});
export default router;
