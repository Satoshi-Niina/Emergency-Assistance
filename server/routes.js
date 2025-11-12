"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const storage_js_1 = require("./storage.js");
const schema_js_1 = require("./db/schema.js");
const express_session_1 = __importDefault(require("express-session"));
const memorystore_1 = __importDefault(require("memorystore"));
const openai_js_1 = require("./lib/openai.js");
const perplexity_js_1 = require("./lib/perplexity.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_js_1 = require("./db/index.js");
const multer_config_js_1 = require("./lib/multer-config.js");
const knowledge_base_js_1 = require("./lib/knowledge-base.js");
const tech_support_js_1 = require("./routes/tech-support.js");
const data_processor_js_1 = require("./routes/data-processor.js");
const emergency_guide_js_1 = __importDefault(require("./routes/emergency-guide.js"));
const emergency_flow_js_1 = __importDefault(require("./routes/emergency-flow.js"));
const flow_generator_js_1 = __importDefault(require("./routes/flow-generator.js"));
const sync_routes_js_1 = require("./routes/sync-routes.js");
const users_js_1 = require("./routes/users.js");
const maintenance_js_1 = __importDefault(require("./routes/maintenance.js"));
const express_1 = __importDefault(require("express"));
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const url_1 = require("url");
const drizzle_orm_1 = require("drizzle-orm");
const machines_js_1 = __importDefault(require("./routes/machines.js"));
const history_js_1 = require("./routes/history.js");
const base_data_js_1 = require("./routes/base-data.js");
const files_js_1 = __importDefault(require("./routes/files.js"));
const knowledge_base_js_2 = __importDefault(require("./routes/knowledge-base.js"));
const qa_learning_js_1 = __importDefault(require("./routes/qa-learning.js"));
const knowledge_base_js_3 = require("./routes/knowledge-base.js");
const settings_js_1 = __importDefault(require("./routes/settings.js"));
// ESM用__dirname定義
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const MemoryStoreSession = (0, memorystore_1.default)(express_session_1.default);
// Session will now use Postgres via storage.sessionStore
function registerRoutes(app) {
    // 静的ファイル配信の設定（最優先で登録）
    app.use('/images', express_1.default.static(path_1.default.join(__dirname, '../../public/images')));
    app.use('/public', express_1.default.static(path_1.default.join(__dirname, '../../public')));
    // Register tech support router
    app.use('/api/tech-support', tech_support_js_1.techSupportRouter);
    // Register data processor routes
    (0, data_processor_js_1.registerDataProcessorRoutes)(app);
    // Register emergency guide routes
    app.use('/api/emergency-guide', emergency_guide_js_1.default);
    // Register emergency flow routes
    app.use('/api/emergency-flow', emergency_flow_js_1.default);
    // Register flow generator routes
    app.use('/api/flow-generator', flow_generator_js_1.default);
    // Register sync routes for offline capabilities
    (0, sync_routes_js_1.registerSyncRoutes)(app);
    // Register API routers
    app.use('/api/users', users_js_1.usersRouter);
    app.use('/api/machines', machines_js_1.default);
    app.use('/api/history', history_js_1.historyRouter);
    app.use('/api/base-data', base_data_js_1.baseDataRouter);
    app.use('/api/files', files_js_1.default);
    app.use('/api/knowledge-base', knowledge_base_js_2.default);
    app.use('/api/qa-learning', qa_learning_js_1.default);
    app.use('/api/maintenance', maintenance_js_1.default);
    app.use('/api/settings', settings_js_1.default);
    // Health check endpoints
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
        });
    });
    app.get('/api/healthz', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
        });
    });
    app.get('/ping', (req, res) => {
        res.json({
            ping: 'pong',
            timestamp: new Date().toISOString(),
        });
    });
    // データベース接続確認エンドポイント
    app.get('/api/debug/database', async (req, res) => {
        try {
            // データベース接続テスト
            const testQuery = await index_js_1.db.select().from(schema_js_1.users).limit(1);
            res.json({
                status: 'connected',
                database: 'PostgreSQL',
                connectionTest: 'success',
                userCount: testQuery.length,
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
            });
        }
        catch (error) {
            console.error('データベース接続エラー:', error);
            res.status(500).json({
                status: 'error',
                database: 'PostgreSQL',
                connectionTest: 'failed',
                error: error instanceof Error ? error.message : 'Unknown database error',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                recommendations: [
                    'DATABASE_URL環境変数を確認してください',
                    'PostgreSQLサーバーが起動しているか確認してください',
                    'データベースの接続情報を確認してください',
                ],
            });
        }
    });
    // OpenAI APIキーの設定状況を確認するエンドポイント
    app.get('/api/debug/openai', (req, res) => {
        const apiKey = process.env.OPENAI_API_KEY;
        const hasApiKey = !!apiKey && apiKey !== 'dev-mock-key';
        res.json({
            openaiApiKey: hasApiKey ? 'SET' : 'NOT SET',
            apiKeyPrefix: hasApiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString(),
            recommendations: hasApiKey
                ? []
                : [
                    'OPENAI_API_KEY環境変数を設定してください',
                    'env.exampleファイルを参考に.envファイルを作成してください',
                    "開発環境では'dev-mock-key'を使用できます",
                ],
        });
    });
    // Add a public OpenAI test endpoint (for testing only)
    app.post('/api/chatgpt-test', async (req, res) => {
        try {
            const { text } = req.body;
            if (!text) {
                return res.status(400).json({ message: 'Text is required' });
            }
            const response = await (0, openai_js_1.processOpenAIRequest)(text, true);
            return res.json({ response });
        }
        catch (error) {
            console.error('Error in /api/chatgpt-test:', error);
            return res
                .status(500)
                .json({ message: 'Error processing request', error: String(error) });
        }
    });
    // Perplexity API endpoint
    app.post('/api/perplexity', async (req, res) => {
        try {
            const { query, systemPrompt, useKnowledgeBaseOnly = true } = req.body;
            if (!query) {
                return res.status(400).json({ message: 'Query is required' });
            }
            console.log(`Perplexity API request: query=${query}, useKnowledgeBaseOnly=${useKnowledgeBaseOnly}`);
            const { content, citations } = await (0, perplexity_js_1.processPerplexityRequest)(query);
            return res.json({ content, citations });
        }
        catch (error) {
            console.error('Error in /api/perplexity:', error);
            return res.status(500).json({
                message: 'Error processing Perplexity request',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
            });
        }
    });
    // Setup session middleware
    const sessionSecret = process.env.SESSION_SECRET || 'emergency-recovery-secret';
    app.use((0, express_session_1.default)({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
            httpOnly: true,
            maxAge: 86400000, // 24 hours
            sameSite: 'lax',
        },
        store: new MemoryStoreSession({
            checkPeriod: 86400000, // prune expired entries every 24h
        }),
    }));
    // Auth middleware
    const requireAuth = async (req, res, next) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'ログインが必要です',
                });
            }
            // データベースからユーザー情報を確認
            const user = await index_js_1.db
                .select()
                .from(schema_js_1.users)
                .where((0, drizzle_orm_1.eq)(schema_js_1.users.id, req.session.userId))
                .limit(1);
            if (user.length === 0) {
                return res.status(401).json({
                    error: 'User not found',
                    message: 'ユーザーが見つかりません',
                });
            }
            // ユーザー情報をリクエストに追加
            req.user = user[0];
            next();
        }
        catch (error) {
            console.error('Auth middleware error:', error);
            return res.status(500).json({
                error: 'Authentication error',
                message: '認証エラーが発生しました',
            });
        }
    };
    // Admin middleware
    const requireAdmin = async (req, res, next) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'ログインが必要です',
                });
            }
            // データベースからユーザー情報を確認
            const user = await index_js_1.db
                .select()
                .from(schema_js_1.users)
                .where((0, drizzle_orm_1.eq)(schema_js_1.users.id, req.session.userId))
                .limit(1);
            if (user.length === 0) {
                return res.status(401).json({
                    error: 'User not found',
                    message: 'ユーザーが見つかりません',
                });
            }
            // 管理者権限チェック
            if (user[0].role !== 'admin') {
                return res.status(403).json({
                    error: 'Admin access required',
                    message: '管理者権限が必要です',
                });
            }
            // ユーザー情報をリクエストに追加
            req.user = user[0];
            next();
        }
        catch (error) {
            console.error('Admin middleware error:', error);
            return res.status(500).json({
                error: 'Authentication error',
                message: '認証エラーが発生しました',
            });
        }
    };
    // Auth routes - JSON Content-Typeを設定
    app.use('/api/auth', (req, res, next) => {
        res.setHeader('Content-Type', 'application/json');
        next();
    }, auth_js_1.default);
    // デバッグ用エンドポイント
    app.get('/api/debug', (req, res) => {
        console.log('🔍 デバッグリクエスト受信');
        res.status(200).json({
            success: true,
            message: 'Debug endpoint working',
            headers: req.headers,
            session: req.session,
            environment: process.env.NODE_ENV,
        });
    });
    // Document routes (admin only)
    app.get('/api/documents', requireAuth, async (req, res) => {
        // const documents = await storage.getDocumentsForUser(req.session.userId!);
        return res.json([]);
    });
    app.post('/api/documents', requireAuth, async (req, res) => {
        // const document = await storage.createDocument(documentData);
        return res.json([]);
    });
    app.put('/api/documents/:id', requireAuth, async (req, res) => {
        // const document = await storage.getDocument(parseInt(req.params.id));
        // const updatedDocument = await storage.updateDocument(document.id, req.body);
        return res.json([]);
    });
    // Search routes
    app.get('/api/search', requireAuth, async (req, res) => {
        try {
            const keyword = req.query.q;
            if (!keyword) {
                return res.status(400).json({ message: 'Search query is required' });
            }
            const documents = await storage_js_1.storage.searchDocumentsByKeyword(keyword);
            return res.json(documents);
        }
        catch (error) {
            return res.status(500).json({ message: 'Internal server error' });
        }
    });
    // Knowledge Base API routes
    // ドキュメントアップロード
    app.post('/api/knowledge/upload', requireAuth, requireAdmin, multer_config_js_1.upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'ファイルがありません' });
            }
            const filePath = req.file.path;
            try {
                const docId = await (0, knowledge_base_js_1.addDocumentToKnowledgeBase)({
                    originalname: path_1.default.basename(filePath),
                    path: filePath,
                    mimetype: 'text/plain',
                }, fs_1.default.readFileSync(filePath, 'utf-8'));
                return res.status(201).json({
                    success: true,
                    docId,
                    message: 'ドキュメントが正常に追加されました',
                });
            }
            catch (err) {
                // エラー発生時にアップロードファイルを削除
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
                throw err;
            }
        }
        catch (error) {
            console.error('Error uploading document:', error);
            const errorMessage = error instanceof Error ? error.message : '不明なエラー';
            res
                .status(500)
                .json({ error: '知識ベースへの追加に失敗しました: ' + errorMessage });
        }
    });
    // ドキュメント削除
    app.delete('/api/knowledge/:docId', requireAuth, requireAdmin, (req, res) => {
        try {
            const docId = req.params.docId;
            console.log(`Document deletion request: ID=${docId}`);
            // ドキュメントとその関連ファイルを削除
            const success = (0, knowledge_base_js_1.removeDocumentFromKnowledgeBase)(docId);
            if (success) {
                // 画像検索データを再初期化
                const techSupportApiUrl = process.env.TECH_SUPPORT_API_URL || 'http://localhost:5000';
                fetch(`${techSupportApiUrl}/api/tech-support/init-image-search-data`, {
                    method: 'POST',
                })
                    .then(response => {
                    if (response.ok) {
                        console.log('Image search data reinitialized');
                    }
                    else {
                        console.warn('Failed to reinitialize image search data');
                    }
                })
                    .catch(err => {
                    console.error('Image search data reinitialization error:', err);
                });
                res.json({
                    success: true,
                    message: 'Document and related files deleted successfully',
                    docId: docId,
                });
            }
            else {
                res.status(404).json({ error: 'Document not found' });
            }
        }
        catch (error) {
            console.error('Error removing document:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res
                .status(500)
                .json({ error: 'Failed to delete document: ' + errorMessage });
        }
    });
    // ドキュメント再処理
    app.post('/api/knowledge/:docId/process', requireAuth, requireAdmin, async (req, res) => {
        try {
            const docId = req.params.docId;
            // ナレッジベースからドキュメント情報を取得
            const documents = (0, knowledge_base_js_1.listKnowledgeBaseDocuments)();
            if (documents.success && documents.documents) {
                const document = documents.documents.find(doc => doc.id === docId);
                if (!document) {
                    return res.status(404).json({ error: 'Document not found' });
                }
                // ドキュメントのパスを取得
                const docPath = path_1.default.join(__dirname, '../../knowledge-base', document.title);
                if (!fs_1.default.existsSync(docPath)) {
                    return res
                        .status(404)
                        .json({ error: 'Document file not found: ' + docPath });
                }
                console.log(`Starting document reprocessing: ${docPath}`);
                // 再処理を実行
                const newDocId = await (0, knowledge_base_js_1.addDocumentToKnowledgeBase)({
                    originalname: path_1.default.basename(docPath),
                    path: docPath,
                    mimetype: 'text/plain',
                }, fs_1.default.readFileSync(docPath, 'utf-8'));
                res.json({
                    success: true,
                    docId: newDocId,
                    message: 'Document reprocessed successfully',
                });
            }
            else {
                res.status(500).json({ error: 'Failed to list documents' });
            }
        }
        catch (error) {
            console.error('Error processing document:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res
                .status(500)
                .json({ error: 'Failed to reprocess document: ' + errorMessage });
        }
    });
    // OpenAI API routes
    app.post('/api/chatgpt', requireAuth, async (req, res) => {
        try {
            const { text, useOnlyKnowledgeBase = true } = req.body;
            if (!text) {
                return res.status(400).json({ message: 'Text is required' });
            }
            console.log(`ChatGPT API呼び出し: ナレッジベースのみを使用=${useOnlyKnowledgeBase}`);
            const response = await (0, openai_js_1.processOpenAIRequest)(text, useOnlyKnowledgeBase);
            // Check for specific error messages returned from OpenAI
            if (response.includes('OpenAI APIキーが無効')) {
                return res.status(401).json({ message: response });
            }
            if (response.includes('OpenAI APIのリクエスト制限')) {
                return res.status(429).json({ message: response });
            }
            return res.json({ response });
        }
        catch (error) {
            console.error('Error in /api/chatgpt:', error);
            return res.status(500).json({
                message: 'Error processing request',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
            });
        }
    });
    // Knowledge base routes
    (0, knowledge_base_js_3.registerKnowledgeBaseRoutes)(app);
}
