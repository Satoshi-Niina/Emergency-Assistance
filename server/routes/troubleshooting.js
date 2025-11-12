"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const url_1 = require("url");
const security_js_1 = require("../middleware/security.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const router = (0, express_1.Router)();
// トラブルシューティングディレクトリのパス
const troubleshootingDir = path_1.default.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
// トラブルシューティングデータを読み込む関数
async function loadTroubleshootingData() {
    try {
        console.log('🔍 トラブルシューティングディレクトリパス:', troubleshootingDir);
        console.log('🔍 現在の作業ディレクトリ:', process.cwd());
        console.log('🔍 絶対パス:', path_1.default.resolve(troubleshootingDir));
        if (!(0, fs_1.existsSync)(troubleshootingDir)) {
            console.warn(`❌ トラブルシューティングディレクトリが見つかりません: ${troubleshootingDir}`);
            console.warn(`🔍 代替パスを試行中...`);
            // 代替パスを試行
            const alternativePaths = [
                path_1.default.join(process.cwd(), 'knowledge-base', 'troubleshooting'),
                path_1.default.join(__dirname, '..', '..', 'knowledge-base', 'troubleshooting'),
                path_1.default.join(__dirname, '..', 'knowledge-base', 'troubleshooting'),
            ];
            for (const altPath of alternativePaths) {
                console.log(`🔍 代替パスをチェック中: ${altPath}`);
                if ((0, fs_1.existsSync)(altPath)) {
                    console.log(`✅ 代替パスが見つかりました: ${altPath}`);
                    const files = (0, fs_1.readdirSync)(altPath);
                    console.log(`📁 ディレクトリ内のファイル:`, files);
                    return await loadFromDirectory(altPath);
                }
            }
            console.error(`❌ どのパスでもディレクトリが見つかりませんでした`);
            return [];
        }
        return await loadFromDirectory(troubleshootingDir);
    }
    catch (error) {
        console.error('❌ トラブルシューティングデータの読み込みエラー:', error);
        return [];
    }
}
// 指定されたディレクトリからファイルを読み込む関数
async function loadFromDirectory(dirPath) {
    try {
        console.log(`📁 ディレクトリから読み込み中: ${dirPath}`);
        const files = (0, fs_1.readdirSync)(dirPath);
        console.log('📁 ディレクトリ内のファイル:', files);
        const jsonFiles = files.filter(file => {
            const isJson = file.endsWith('.json');
            const isNotBackup = !file.includes('.backup');
            const isNotTmp = !file.includes('.tmp');
            console.log(`📄 ファイル ${file}: JSON=${isJson}, バックアップ=${!isNotBackup}, 一時=${!isNotTmp}`);
            return isJson && isNotBackup && isNotTmp;
        });
        console.log('📄 処理対象のJSONファイル:', jsonFiles);
        const fileList = await Promise.all(jsonFiles.map(async (file) => {
            try {
                const filePath = path_1.default.join(dirPath, file);
                console.log(`🔍 ファイル読み込み中: ${filePath}`);
                const content = await promises_1.default.readFile(filePath, 'utf8');
                console.log(`📄 ファイル ${file} のサイズ: ${content.length} 文字`);
                const data = JSON.parse(content);
                console.log(`✅ ファイル ${file} のJSON解析成功:`, {
                    id: data.id,
                    title: data.title,
                    hasDescription: !!data.description,
                    hasSteps: !!(data.steps && data.steps.length > 0),
                });
                let description = data.description || '';
                if (!description && data.steps && data.steps.length > 0) {
                    const firstStep = data.steps[0];
                    description = firstStep.description || firstStep.message || '';
                }
                const result = {
                    id: data.id || file.replace('.json', ''),
                    title: data.title || file.replace('.json', '') || 'タイトルなし',
                    description: description,
                    fileName: file,
                    filePath: `knowledge-base/troubleshooting/${file}`,
                    createdAt: data.createdAt ||
                        data.savedAt ||
                        data.updatedAt ||
                        new Date().toISOString(),
                    category: data.category || '',
                    triggerKeywords: data.triggerKeywords || [],
                    steps: data.steps || [],
                };
                console.log(`✅ ファイル ${file} の処理完了:`, result);
                return result;
            }
            catch (error) {
                console.error(`❌ ファイル ${file} の解析中にエラーが発生しました:`, error);
                console.error(`🔍 エラーの詳細:`, {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                });
                return null;
            }
        }));
        const validFiles = fileList.filter(Boolean);
        console.log(`📋 有効なファイル数: ${validFiles.length}/${jsonFiles.length}`);
        return validFiles;
    }
    catch (error) {
        console.error(`❌ ディレクトリ ${dirPath} からの読み込みエラー:`, error);
        return [];
    }
}
// トラブルシューティング一覧取得
router.get('/list', security_js_1.requireAuth, async (req, res) => {
    console.log('📋 トラブルシューティング一覧リクエスト受信');
    try {
        const data = await loadTroubleshootingData();
        console.log(`✅ トラブルシューティング一覧取得完了: ${data.length}件`);
        // キャッシュ制御ヘッダーを設定
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.json({
            success: true,
            data: data,
            total: data.length,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ トラブルシューティング一覧取得エラー:', error);
        res.status(500).json({
            success: false,
            error: 'データの取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
        });
    }
});
// 特定のトラブルシューティング取得
router.get('/:id', security_js_1.requireAuth, async (req, res) => {
    console.log('📋 特定のトラブルシューティング取得開始:', req.params.id);
    try {
        const { id } = req.params;
        // キャッシュ制御ヘッダーを設定
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2);
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            Pragma: 'no-cache',
            Expires: 'Thu, 01 Jan 1970 00:00:00 GMT',
            'Last-Modified': new Date().toUTCString(),
            ETag: `"${timestamp}-${randomId}"`,
            'X-Accel-Expires': '0',
            'X-Requested-With': 'XMLHttpRequest',
        });
        console.log('🔍 トラブルシューティングディレクトリ確認:', troubleshootingDir);
        // トラブルシューティングディレクトリから該当するJSONファイルを検索
        if (!(0, fs_1.existsSync)(troubleshootingDir)) {
            console.error('❌ トラブルシューティングディレクトリが見つかりません:', troubleshootingDir);
            return res.status(404).json({
                success: false,
                error: 'トラブルシューティングディレクトリが見つかりません',
                id,
                timestamp: new Date().toISOString(),
            });
        }
        const files = (0, fs_1.readdirSync)(troubleshootingDir);
        console.log('📁 ディレクトリ内のファイル:', files);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        console.log('📄 JSONファイル:', jsonFiles);
        let flowData = null;
        let fileName = null;
        // IDに一致するファイルを検索
        for (const file of jsonFiles) {
            try {
                console.log(`🔍 ファイル ${file} をチェック中...`);
                const filePath = path_1.default.join(troubleshootingDir, file);
                const fileContent = await promises_1.default.readFile(filePath, 'utf8');
                const data = JSON.parse(fileContent);
                console.log(`📋 ファイル ${file} の内容:`, {
                    fileId: data.id,
                    requestId: id,
                    idsMatch: data.id === id,
                    fileNameMatch: file.replace('.json', '') === id,
                });
                if (data.id === id || file.replace('.json', '') === id) {
                    flowData = data;
                    fileName = file;
                    console.log(`✅ マッチするファイルを発見: ${file}`);
                    break;
                }
            }
            catch (error) {
                console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
            }
        }
        if (!flowData) {
            console.error('❌ マッチするファイルが見つかりません:', id);
            return res.status(404).json({
                success: false,
                error: 'アイテムが見つかりません',
                id,
                timestamp: new Date().toISOString(),
            });
        }
        console.log(`✅ トラブルシューティング取得完了:`, {
            id: flowData.id,
            title: flowData.title,
            stepsCount: flowData.steps?.length || 0,
            fileName: fileName,
            hasSteps: !!flowData.steps,
            stepsType: typeof flowData.steps,
            stepsIsArray: Array.isArray(flowData.steps),
            flowDataKeys: Object.keys(flowData),
        });
        // データ構造の詳細ログ
        if (flowData.steps && Array.isArray(flowData.steps)) {
            console.log('📋 ステップデータ詳細:', {
                totalSteps: flowData.steps.length,
                stepIds: flowData.steps.map((step, index) => ({
                    index,
                    id: step.id,
                    title: step.title,
                    hasImages: !!step.images,
                    imagesCount: step.images?.length || 0,
                })),
            });
        }
        else {
            console.warn('⚠️ ステップデータが存在しないか、配列ではありません:', {
                steps: flowData.steps,
                stepsType: typeof flowData.steps,
            });
        }
        res.setHeader('Content-Type', 'application/json');
        const responseData = {
            success: true,
            data: flowData,
            timestamp: new Date().toISOString(),
        };
        console.log('📤 レスポンス送信:', {
            success: responseData.success,
            dataId: responseData.data.id,
            dataStepsCount: responseData.data.steps?.length || 0,
        });
        res.json(responseData);
    }
    catch (error) {
        console.error('❌ トラブルシューティング取得エラー:', error);
        res.status(500).json({
            success: false,
            error: 'データの取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
        });
    }
});
// トラブルシューティング更新
router.put('/:id', security_js_1.requireAuth, async (req, res) => {
    console.log('📝 トラブルシューティング更新:', req.params.id);
    try {
        const { id } = req.params;
        const flowData = req.body;
        // 必須フィールドの検証
        if (!flowData.title) {
            return res.status(400).json({
                success: false,
                error: 'タイトルは必須です',
            });
        }
        // ファイルパスを構築
        const troubleshootingDir = path_1.default.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
        const filePath = path_1.default.join(troubleshootingDir, `${id}.json`);
        // 既存ファイルの読み込み
        let originalData = null;
        if (promises_1.default.existsSync(filePath)) {
            try {
                const fileContent = promises_1.default.readFileSync(filePath, 'utf-8');
                originalData = JSON.parse(fileContent);
                console.log('📖 既存データ読み込み成功:', {
                    id: originalData.id,
                    title: originalData.title,
                    stepsCount: originalData.steps?.length || 0,
                    hasImages: originalData.steps?.some((step) => step.images && step.images.length > 0) || false
                });
            }
            catch (error) {
                console.error('❌ 既存ファイル読み込みエラー:', error);
                originalData = null;
            }
        }
        // 差分を適用して更新（深いマージ）
        const mergeData = (original, updates) => {
            const result = { ...original };
            for (const [key, value] of Object.entries(updates)) {
                if (value !== null &&
                    typeof value === 'object' &&
                    !Array.isArray(value)) {
                    // オブジェクトの場合は再帰的にマージ
                    result[key] = mergeData(result[key] || {}, value);
                }
                else {
                    // プリミティブ値や配列は直接代入
                    result[key] = value;
                }
            }
            return result;
        };
        // 画像情報の詳細ログ
        if (flowData.steps) {
            flowData.steps.forEach((step, index) => {
                if (step.images && step.images.length > 0) {
                    console.log(`🖼️ ステップ[${index}]の画像情報:`, {
                        stepId: step.id,
                        stepTitle: step.title,
                        imagesCount: step.images.length,
                        images: step.images.map((img) => ({
                            fileName: img.fileName,
                            url: img.url?.substring(0, 100) + '...',
                            hasFile: !!img.file
                        }))
                    });
                }
            });
        }
        const updatedFlowData = mergeData(originalData || {}, {
            ...flowData,
            id: id, // IDを確実に設定
            updatedAt: new Date().toISOString(),
            // 更新履歴を追加
            updateHistory: [
                ...(originalData?.updateHistory || []),
                {
                    timestamp: new Date().toISOString(),
                    updatedFields: Object.keys(flowData),
                    updatedBy: 'user', // 必要に応じて認証情報から取得
                },
            ],
        });
        // 画像情報の最終確認とログ
        if (updatedFlowData.steps) {
            updatedFlowData.steps.forEach((step, index) => {
                if (step.images && step.images.length > 0) {
                    console.log(`🖼️ 最終保存データ - ステップ[${index}]の画像情報:`, {
                        stepId: step.id,
                        stepTitle: step.title,
                        imagesCount: step.images.length,
                        images: step.images.map((img) => ({
                            fileName: img.fileName,
                            url: img.url?.substring(0, 100) + '...',
                            hasFile: !!img.file
                        }))
                    });
                }
            });
        }
        // ファイルに保存
        (0, fs_1.writeFileSync)(filePath, JSON.stringify(updatedFlowData, null, 2), 'utf8');
        console.log('✅ トラブルシューティング更新成功:', {
            id: updatedFlowData.id,
            title: updatedFlowData.title,
            stepsCount: updatedFlowData.steps?.length || 0,
            stepsWithImages: updatedFlowData.steps?.filter((step) => step.images && step.images.length > 0).length || 0,
            allStepsImages: updatedFlowData.steps?.map((step) => ({
                stepId: step.id,
                stepTitle: step.title,
                imagesCount: step.images?.length || 0,
                images: step.images?.map((img) => ({
                    fileName: img.fileName,
                    url: img.url?.substring(0, 100) + '...'
                })) || []
            })) || []
        });
        res.json({
            success: true,
            data: updatedFlowData,
            message: 'トラブルシューティングが正常に更新されました',
        });
    }
    catch (error) {
        console.error('❌ トラブルシューティング更新エラー:', error);
        res.status(500).json({
            success: false,
            error: 'データの更新に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
        });
    }
});
// トラブルシューティング削除
router.delete('/:id', security_js_1.requireAuth, async (req, res) => {
    console.log('🗑️ トラブルシューティング削除:', req.params.id);
    try {
        const { id } = req.params;
        // ファイルパスを構築
        const troubleshootingDir = path_1.default.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
        const filePath = path_1.default.join(troubleshootingDir, `${id}.json`);
        // ファイルの存在確認
        if (!(0, fs_1.existsSync)(filePath)) {
            return res.status(404).json({
                success: false,
                error: '指定されたトラブルシューティングが見つかりません',
                id,
            });
        }
        // ファイルを削除
        (0, fs_1.unlinkSync)(filePath);
        console.log('✅ トラブルシューティング削除成功:', id);
        res.json({
            success: true,
            message: 'トラブルシューティングが正常に削除されました',
            id,
        });
    }
    catch (error) {
        console.error('❌ トラブルシューティング削除エラー:', error);
        res.status(500).json({
            success: false,
            error: 'データの削除に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
        });
    }
});
// エラーハンドリングミドルウェア
router.use((err, _req, res, _next) => {
    console.error('トラブルシューティングエラー:', err);
    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
        success: false,
        error: 'トラブルシューティングの処理中にエラーが発生しました',
        details: err.message || 'Unknown error',
        timestamp: new Date().toISOString(),
    });
});
// OPTIONSリクエスト用のハンドラー（プリフライトリクエスト対応）
router.options('/image/:fileName', (req, res) => {
    // helmetの設定を無効にしてCORSを許可
    res.removeHeader('Cross-Origin-Resource-Policy');
    res.removeHeader('Cross-Origin-Opener-Policy');
    res.removeHeader('Origin-Agent-Cluster');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Accept, Pragma, Expires');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(200).end();
});
// 画像配信エンドポイント（knowledge-baseから直接配信）- 認証不要
router.get('/image/:fileName', async (_req, res) => {
    try {
        // helmetの設定を無効にしてCORSを許可
        res.removeHeader('Cross-Origin-Resource-Policy');
        res.removeHeader('Cross-Origin-Opener-Policy');
        res.removeHeader('Origin-Agent-Cluster');
        res.removeHeader('Content-Security-Policy');
        const { fileName } = req.params;
        // まず emergency-flows ディレクトリを確認
        let uploadDir = path_1.default.join(process.cwd(), '..', 'knowledge-base', 'images', 'emergency-flows');
        let filePath = path_1.default.join(uploadDir, fileName);
        // emergency-flows にファイルがない場合は chat-exports を確認
        if (!(0, fs_1.existsSync)(filePath)) {
            uploadDir = path_1.default.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports');
            filePath = path_1.default.join(uploadDir, fileName);
            console.log('🔄 emergency-flows にファイルが見つからないため、chat-exports を確認:', {
                fileName,
                chatExportsDir: uploadDir,
                chatExportsPath: filePath,
                exists: (0, fs_1.existsSync)(filePath),
            });
        }
        // デバッグログ強化
        console.log('🖼️ 画像リクエスト:', {
            fileName,
            uploadDir,
            filePath,
            exists: (0, fs_1.existsSync)(filePath),
            filesInDir: (0, fs_1.existsSync)(uploadDir) ? (0, fs_1.readdirSync)(uploadDir) : [],
        });
        if (!(0, fs_1.existsSync)(filePath)) {
            const emergencyFlowsPath = path_1.default.join(process.cwd(), '..', 'knowledge-base', 'images', 'emergency-flows', fileName);
            const chatExportsPath = path_1.default.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports', fileName);
            const emergencyFlowsDir = path_1.default.join(process.cwd(), '..', 'knowledge-base', 'images', 'emergency-flows');
            const chatExportsDir = path_1.default.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports');
            return res.status(404).json({
                error: 'ファイルが存在しません',
                fileName,
                emergencyFlowsPath,
                chatExportsPath,
                emergencyFlowsDir: (0, fs_1.existsSync)(emergencyFlowsDir)
                    ? (0, fs_1.readdirSync)(emergencyFlowsDir)
                    : [],
                chatExportsDir: (0, fs_1.existsSync)(chatExportsDir)
                    ? (0, fs_1.readdirSync)(chatExportsDir)
                    : [],
            });
        }
        // ファイルのMIMEタイプを判定
        const ext = path_1.default.extname(fileName).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        // ファイルを読み込んでレスポンス
        const fileBuffer = (0, fs_1.readFileSync)(filePath);
        // CORSヘッダーを設定
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Accept, Pragma, Expires');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年間キャッシュ
        res.send(fileBuffer);
        console.log('✅ 画像配信成功:', {
            fileName,
            contentType,
            fileSize: fileBuffer.length,
            filePath,
            sourceDir: uploadDir.includes('emergency-flows')
                ? 'emergency-flows'
                : 'chat-exports',
        });
    }
    catch (error) {
        console.error('❌ 画像配信エラー:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            fileName: req.params.fileName,
        });
        res.status(500).json({
            success: false,
            error: '画像の配信に失敗しました',
        });
    }
});
// 404ハンドリング
router.use('*', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(404).json({
        success: false,
        error: 'トラブルシューティングのエンドポイントが見つかりません',
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
