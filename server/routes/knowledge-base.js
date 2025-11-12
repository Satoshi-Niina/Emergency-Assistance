"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerKnowledgeBaseRoutes = registerKnowledgeBaseRoutes;
const express_1 = __importDefault(require("express"));
const multer_config_js_1 = require("../lib/multer-config.js");
const knowledge_base_js_1 = require("../lib/knowledge-base.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
/**
 * GET /api/knowledge-base/stats
 * ナレッジベースの統計情報を返す
 */
router.get('/stats', async (_req, res) => {
    try {
        // 既存のlistKnowledgeDataで全データ取得
        const result = (0, knowledge_base_js_1.listKnowledgeData)();
        const total = result.data.length;
        // カテゴリごとの件数集計
        const categoryCount = {};
        result.data.forEach((item) => {
            const cat = item.category || 'uncategorized';
            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
        // タイプごとの件数集計
        const typeStats = {};
        result.data.forEach((item) => {
            const type = item.type || 'unknown';
            typeStats[type] = (typeStats[type] || 0) + 1;
        });
        // 総容量の計算
        let totalSize = 0;
        const knowledgeBaseDir = path_1.default.join(process.cwd(), 'knowledge-base');
        const alternativeDir = path_1.default.join(process.cwd(), '..', 'knowledge-base');
        let targetDir = knowledgeBaseDir;
        if (!fs_1.default.existsSync(knowledgeBaseDir)) {
            if (fs_1.default.existsSync(alternativeDir)) {
                targetDir = alternativeDir;
            }
        }
        // documentsフォルダのサイズを計算
        const calculateDirSize = (dirPath) => {
            let size = 0;
            try {
                if (fs_1.default.existsSync(dirPath)) {
                    const items = fs_1.default.readdirSync(dirPath, { withFileTypes: true });
                    for (const item of items) {
                        const itemPath = path_1.default.join(dirPath, item.name);
                        if (item.isDirectory()) {
                            size += calculateDirSize(itemPath);
                        }
                        else if (item.isFile()) {
                            try {
                                const stats = fs_1.default.statSync(itemPath);
                                size += stats.size;
                            }
                            catch (err) {
                                // ファイルサイズ取得エラーは無視
                            }
                        }
                    }
                }
            }
            catch (err) {
                // ディレクトリ読み込みエラーは無視
            }
            return size;
        };
        // 各ディレクトリのサイズを合計
        const directoriesToCheck = ['documents', 'data', 'text', 'qa', 'troubleshooting'];
        for (const dirName of directoriesToCheck) {
            const dirPath = path_1.default.join(targetDir, dirName);
            totalSize += calculateDirSize(dirPath);
        }
        res.json({
            success: true,
            data: {
                total,
                totalSize,
                categoryCount,
                typeStats,
                lastMaintenance: undefined,
                oldData: 0,
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'ナレッジベース統計情報の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/knowledge-base
 * ナレッジデータ一覧を取得
 */
router.get('/', async (req, res) => {
    try {
        const { type } = req.query;
        const knowledgeType = type ? type : undefined;
        console.log('📚 ナレッジデータ一覧取得リクエスト:', {
            type: knowledgeType,
        });
        const result = (0, knowledge_base_js_1.listKnowledgeData)(knowledgeType);
        res.json({
            success: result.success,
            data: result.data,
            message: result.message,
            total: result.data.length,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ ナレッジデータ一覧取得エラー:', error);
        res.status(500).json({
            success: false,
            error: 'ナレッジデータ一覧の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/knowledge-base/:id
 * 特定のナレッジデータを取得
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('📚 ナレッジデータ取得リクエスト:', { id });
        const result = (0, knowledge_base_js_1.getKnowledgeData)(id);
        if (!result.success) {
            return res.status(404).json({
                success: false,
                error: result.message || 'ナレッジデータが見つかりません',
            });
        }
        res.json({
            success: true,
            data: result.data,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ ナレッジデータ取得エラー:', error);
        res.status(500).json({
            success: false,
            error: 'ナレッジデータの取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * POST /api/knowledge-base/upload
 * ナレッジデータをアップロード
 */
router.post('/upload', multer_config_js_1.upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'ファイルがアップロードされていません',
            });
        }
        const { title, category, tags, description } = req.body;
        const filePath = req.file.path;
        const filename = req.file.originalname;
        console.log('📚 ナレッジデータアップロードリクエスト:', {
            filename,
            title,
            category,
            tags: tags ? tags.split(',') : undefined,
        });
        // ファイル内容を読み込み
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        // メタデータを準備
        const metadata = {
            title: title || filename,
            category: category || 'general',
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            description: description || `アップロードされた${filename}`,
        };
        // ナレッジデータとして保存
        const result = (0, knowledge_base_js_1.saveKnowledgeData)(filename, content, metadata);
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.message || 'ナレッジデータの保存に失敗しました',
            });
        }
        // アップロードされた一時ファイルを削除
        try {
            fs_1.default.unlinkSync(filePath);
        }
        catch (deleteError) {
            console.warn('一時ファイル削除警告:', deleteError);
        }
        res.json({
            success: true,
            data: result.metadata,
            message: result.message,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ ナレッジデータアップロードエラー:', error);
        res.status(500).json({
            success: false,
            error: 'ナレッジデータのアップロードに失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * DELETE /api/knowledge-base/:id
 * ナレッジデータを削除
 */
router.delete('/:id', async (_req, res) => {
    try {
        const { id } = req.params;
        console.log('📚 ナレッジデータ削除リクエスト:', { id });
        const result = (0, knowledge_base_js_1.deleteKnowledgeData)(id);
        if (!result.success) {
            return res.status(404).json({
                success: false,
                error: result.message || 'ナレッジデータの削除に失敗しました',
            });
        }
        res.json({
            success: true,
            message: result.message,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ ナレッジデータ削除エラー:', error);
        res.status(500).json({
            success: false,
            error: 'ナレッジデータの削除に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/knowledge-base/types
 * ナレッジデータの種類一覧を取得
 */
router.get('/types/list', async (_req, res) => {
    try {
        console.log('📚 ナレッジデータ種類一覧取得リクエスト');
        const types = Object.values(knowledge_base_js_1.KnowledgeType).map(type => ({
            value: type,
            label: getTypeLabel(type),
        }));
        res.json({
            success: true,
            data: types,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ ナレッジデータ種類一覧取得エラー:', error);
        res.status(500).json({
            success: false,
            error: 'ナレッジデータ種類一覧の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/knowledge-base/search
 * ナレッジベースから検索を実行
 */
router.get('/search', async (_req, res) => {
    try {
        const { query } = req.query;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                error: '検索クエリが必要です',
            });
        }
        console.log(`🔍 ナレッジベース検索: "${query}"`);
        // デバッグ: 検索前の状態を確認
        console.log('🔍 検索前デバッグ情報:');
        console.log('- 検索クエリ:', query);
        // 改善された検索機能を使用
        const results = await (0, knowledge_base_js_1.searchKnowledgeBase)(query);
        console.log(`✅ 検索完了: ${results.length}件の結果`);
        console.log('🔍 検索結果詳細:', results.map(r => ({
            source: r.metadata.source,
            similarity: r.similarity,
            textLength: r.text.length,
        })));
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'ナレッジデータが見つかりません',
                debug: {
                    query: query,
                    searchFunction: 'searchKnowledgeBase',
                    timestamp: new Date().toISOString(),
                },
            });
        }
        res.json({
            success: true,
            results: results.map(chunk => ({
                text: chunk.text,
                title: chunk.metadata.source,
                content: chunk.text,
                metadata: chunk.metadata,
                similarity: chunk.similarity,
            })),
            total: results.length,
            query: query,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ ナレッジベース検索エラー:', error);
        res.status(500).json({
            success: false,
            error: 'ナレッジベース検索に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * POST /api/knowledge-base/process
 * ナレッジデータのベクトル化処理を実行
 */
router.post('/process', async (_req, res) => {
    try {
        console.log('📚 ナレッジデータベクトル化処理開始');
        // ナレッジベースのインデックスを読み込み
        const index = (0, knowledge_base_js_1.loadKnowledgeBaseIndex)();
        if (!index.knowledge || index.knowledge.length === 0) {
            return res.status(404).json({
                success: false,
                error: '処理対象のナレッジデータが見つかりません',
            });
        }
        let processedCount = 0;
        const errors = [];
        // 各ナレッジデータをベクトル化処理
        for (const knowledgeItem of index.knowledge) {
            try {
                // ファイルが存在するかチェック
                if (!fs_1.default.existsSync(knowledgeItem.path)) {
                    errors.push(`ファイルが見つかりません: ${knowledgeItem.path}`);
                    continue;
                }
                // ファイル内容を読み込み
                const content = fs_1.default.readFileSync(knowledgeItem.path, 'utf-8');
                // ベクトル化処理（OpenAI Embeddings APIを使用）
                if (process.env.OPENAI_API_KEY) {
                    try {
                        const { openai } = await import('../lib/openai.js');
                        if (openai) {
                            const response = await openai.embeddings.create({
                                model: 'text-embedding-3-small',
                                input: content,
                            });
                            const embedding = response.data[0].embedding;
                            // ベクトルデータを保存
                            const embeddingPath = knowledgeItem.path.replace('.txt', '_embedding.json');
                            fs_1.default.writeFileSync(embeddingPath, JSON.stringify({
                                embedding,
                                timestamp: new Date().toISOString(),
                                model: 'text-embedding-3-small',
                            }));
                            // インデックスを更新
                            knowledgeItem.embeddingPath = embeddingPath;
                            knowledgeItem.processedAt = new Date().toISOString();
                            processedCount++;
                            console.log(`✅ ベクトル化完了: ${knowledgeItem.title}`);
                        }
                    }
                    catch (embeddingError) {
                        console.error(`ベクトル化エラー (${knowledgeItem.title}):`, embeddingError);
                        errors.push(`ベクトル化に失敗: ${knowledgeItem.title}`);
                    }
                }
                else {
                    errors.push('OpenAI APIキーが設定されていません');
                    break;
                }
            }
            catch (error) {
                console.error(`処理エラー (${knowledgeItem.title}):`, error);
                errors.push(`処理に失敗: ${knowledgeItem.title}`);
            }
        }
        // 更新されたインデックスを保存
        fs_1.default.writeFileSync(knowledge_base_js_1.INDEX_FILE, JSON.stringify(index, null, 2));
        res.json({
            success: true,
            message: `${processedCount}件のナレッジデータをベクトル化しました`,
            processedCount,
            totalCount: index.knowledge.length,
            errors: errors.length > 0 ? errors : undefined,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ ナレッジデータベクトル化処理エラー:', error);
        res.status(500).json({
            success: false,
            error: 'ナレッジデータのベクトル化処理に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * ナレッジデータの種類ラベルを取得
 */
function getTypeLabel(type) {
    const labels = {
        [knowledge_base_js_1.KnowledgeType.TROUBLESHOOTING]: 'トラブルシューティング',
        [knowledge_base_js_1.KnowledgeType.DOCUMENT]: 'ドキュメント',
        [knowledge_base_js_1.KnowledgeType.QA]: 'Q&A',
        [knowledge_base_js_1.KnowledgeType.JSON]: 'JSONデータ',
        [knowledge_base_js_1.KnowledgeType.PPT]: 'プレゼンテーション',
        [knowledge_base_js_1.KnowledgeType.TEXT]: 'テキスト',
    };
    return labels[type] || type;
}
exports.default = router;
/**
 * ナレッジベースルートを登録する関数
 * @param app Expressアプリケーション
 */
function registerKnowledgeBaseRoutes(app) {
    app.use('/api/knowledge-base', router);
}
