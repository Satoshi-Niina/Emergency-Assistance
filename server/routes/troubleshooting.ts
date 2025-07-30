
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
const router = express.Router();

// 汎用ロギング関数
function logDebug(message: any, ...args: any[]) {
    if (process.env.NODE_ENV !== 'production') {
        console.debug(message, ...args);
    }
}

function logInfo(message: any, ...args: any[]) {
    console.info(message, ...args);
}

function logWarn(message: any, ...args: any[]) {
    console.warn(message, ...args);
}

function logError(message: any, ...args: any[]) {
    console.error(message, ...args);
}

// 画像URL変換関数
function convertImageUrlsForDeployment(data: any): any {
    if (!data) return data;

    const convertUrl = (url: string): string => {
        if (!url) return url;

        // 既に完全なURLの場合はそのまま返す
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        // ローカルの相対パスをAPI経由のURLに変換
        if (url.startsWith('/api/emergency-flow/image/') || url.startsWith('api/emergency-flow/image/')) {
            return url.startsWith('/') ? url : `/${url}`;
        }

        // その他の相対パスの場合
        return `/api/emergency-flow/image/${url.replace(/^\/+/, '')}`;
    };

    // データのコピーを作成
    const result = JSON.parse(JSON.stringify(data));

    // stepsの画像URLを変換
    if (result.steps && Array.isArray(result.steps)) {
        result.steps.forEach((step: any) => {
            if (step.imageUrl) {
                step.imageUrl = convertUrl(step.imageUrl);
            }
            if (step.images && Array.isArray(result.images)) {
                step.images.forEach((img: any) => {
                    if (img.url) {
                        img.url = convertUrl(img.url);
                    }
                });
            }
        });
    }

    return result;
}

// ===== 修正: すべてのルートでJSONレスポンスヘッダーを強制設定 =====
router.use((req, res, next) => {
    // 修正: すべてのトラブルシューティングAPIでJSONヘッダーを設定
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    logInfo(`🔍 [Troubleshooting API] ${req.method} ${req.path}`);
    next();
});

// トラブルシューティングリスト取得
router.get('/list', async (req, res) => {
    try {
        const troubleshootingDir: string = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        logInfo(`🔍 troubleshootingディレクトリを確認: ${troubleshootingDir}`);

        // ディレクトリが存在しない場合は作成
        if (!fs.existsSync(troubleshootingDir)) {
            logInfo('📁 troubleshootingディレクトリが存在しないため作成');
            fs.mkdirSync(troubleshootingDir, { recursive: true });
            // 修正: 必ずJSONで応答（空配列）
            return res.json([]);
        }

        const files: string[] = fs.readdirSync(troubleshootingDir).filter(file => file.endsWith('.json'));
        logInfo(`📄 見つかったJSONファイル: ${files.length}件`, files);

        const troubleshootingList = [];
        for (const file of files) {
            try {
                const filePath: string = path.join(troubleshootingDir, file);
                const content: string = fs.readFileSync(filePath, 'utf8');
                const data: any = JSON.parse(content);

                // 画像URLを変換してからリストに追加
                const convertedData = convertImageUrlsForDeployment(data);
                troubleshootingList.push(convertedData);
                logInfo(`✅ ファイル処理完了: ${file}`);
            }
            catch (error) {
                logError(`❌ Error reading file ${file}:`, error);
            }
        }

        logInfo(`📋 最終リスト: ${troubleshootingList.length}件`);
        // 修正: 必ずJSONで応答
        res.json(troubleshootingList);
    }
    catch (error) {
        logError('トラブルシューティングリスト取得エラー:', error);
        // 修正: エラー時も必ずJSONで応答
        res.status(500).json({
            success: false,
            error: 'トラブルシューティングリストの取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// トラブルシューティング詳細取得
router.get('/detail/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const troubleshootingDir: string = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        const filePath: string = path.join(troubleshootingDir, `${id}.json`);
        
        if (!fs.existsSync(filePath)) {
            // 修正: エラー時も必ずJSONで応答
            return res.status(404).json({ 
                success: false,
                error: 'Troubleshooting flow not found' 
            });
        }
        
        const content: string = fs.readFileSync(filePath, 'utf8');
        const data: any = JSON.parse(content);

        // 画像URLを変換してから返す
        const convertedData = convertImageUrlsForDeployment(data);
        // 修正: 必ずJSONで応答
        res.json(convertedData);
    }
    catch (error) {
        logError('Error in troubleshooting detail:', error);
        // 修正: エラー時も必ずJSONで応答
        res.status(500).json({ 
            success: false,
            error: 'Failed to load troubleshooting detail' 
        });
    }
});

// 保存用に画像URLを正規化する関数
function normalizeImageUrlsForStorage(data: any): any {
    if (!data) return data;

    const normalizeUrl = (url: string): string => {
        if (!url) return url;

        // API経由のURLを相対パスに変換
        if (url.includes('/api/emergency-flow/image/')) {
            return url.replace(/.*\/api\/emergency-flow\/image\//, '');
        }

        return url;
    };

    // データのコピーを作成
    const result = JSON.parse(JSON.stringify(data));

    // stepsの画像URLを正規化
    if (result.steps && Array.isArray(result.steps)) {
        result.steps.forEach((step: any) => {
            if (step.imageUrl) {
                step.imageUrl = normalizeUrl(step.imageUrl);
            }
            if (step.images && Array.isArray(step.images)) {
                step.images.forEach((img: any) => {
                    if (img.url) {
                        img.url = normalizeUrl(img.url);
                    }
                });
            }
        });
    }

    return result;
}

// トラブルシューティング作成
router.post('/', async (req, res) => {
    try {
        const troubleshootingData: any = req.body;
        const troubleshootingDir: string = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        
        if (!fs.existsSync(troubleshootingDir)) {
            fs.mkdirSync(troubleshootingDir, { recursive: true });
        }
        
        const id: string = troubleshootingData.id || `ts_${Date.now()}`;
        const filePath: string = path.join(troubleshootingDir, `${id}.json`);

        // 保存前に画像URLを正規化
        const normalizedData = normalizeImageUrlsForStorage(troubleshootingData);
        normalizedData.id = id; // IDを確実に設定

        // ファイルが既に存在する場合は上書き
        fs.writeFileSync(filePath, JSON.stringify(normalizedData, null, 2));
        // 修正: 必ずJSONで応答
        res.status(201).json({
            success: true,
            id: id,
            message: 'Troubleshooting flow created successfully'
        });
    }
    catch (error) {
        logError('Error in troubleshooting create:', error);
        // 修正: エラー時も必ずJSONで応答
        res.status(500).json({ 
            success: false,
            error: 'Failed to create troubleshooting flow' 
        });
    }
});

// トラブルシューティング更新
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const troubleshootingData: any = req.body;
        const troubleshootingDir: string = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        const filePath: string = path.join(troubleshootingDir, `${id}.json`);
        
        if (!fs.existsSync(filePath)) {
            // 修正: エラー時も必ずJSONで応答
            return res.status(404).json({ 
                success: false,
                error: 'Troubleshooting flow not found' 
            });
        }

        // 更新前に画像URLを正規化
        const normalizedData = normalizeImageUrlsForStorage(troubleshootingData);
        normalizedData.id = id; // IDを確実に設定

        fs.writeFileSync(filePath, JSON.stringify(normalizedData, null, 2));
        // 修正: 必ずJSONで応答
        res.json({
            success: true,
            message: 'Troubleshooting flow updated successfully'
        });
    }
    catch (error) {
        logError('Error in troubleshooting update:', error);
        // 修正: エラー時も必ずJSONで応答
        res.status(500).json({ 
            success: false,
            error: 'Failed to update troubleshooting flow' 
        });
    }
});

// トラブルシューティング削除
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const troubleshootingDir: string = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        const filePath: string = path.join(troubleshootingDir, `${id}.json`);
        
        if (!fs.existsSync(filePath)) {
            // 修正: エラー時も必ずJSONで応答
            return res.status(404).json({ 
                success: false,
                error: 'Troubleshooting flow not found' 
            });
        }
        
        fs.unlinkSync(filePath);
        // 修正: 必ずJSONで応答
        res.json({
            success: true,
            message: 'Troubleshooting flow deleted successfully'
        });
    }
    catch (error) {
        logError('Error in troubleshooting delete:', error);
        // 修正: エラー時も必ずJSONで応答
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete troubleshooting flow' 
        });
    }
});

// トラブルシューティング検索
router.post('/search', async (req, res) => {
    try {
        const { query } = req.body;
        const troubleshootingDir: string = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        
        if (!fs.existsSync(troubleshootingDir)) {
            // 修正: 必ずJSONで応答（空配列）
            return res.json([]);
        }
        
        const files: string[] = fs.readdirSync(troubleshootingDir).filter(file => file.endsWith('.json'));
        const searchResults = [];
        
        for (const file of files) {
            try {
                const filePath: string = path.join(troubleshootingDir, file);
                const content: string = fs.readFileSync(filePath, 'utf8');
                const data: any = JSON.parse(content);
                
                // タイトル、説明、キーワードで検索
                const searchText = `${data.title || ''} ${data.description || ''} ${data.keyword || ''}`.toLowerCase();
                if (searchText.includes(query.toLowerCase())) {
                    searchResults.push(data);
                }
            }
            catch (error) {
                logError(`Error reading file ${file}:`, error);
            }
        }
        // 修正: 必ずJSONで応答
        res.json(searchResults);
    }
    catch (error) {
        logError('Error in troubleshooting search:', error);
        // 修正: エラー時も必ずJSONで応答
        res.status(500).json({ 
            success: false,
            error: 'Failed to search troubleshooting flows' 
        });
    }
});

export const troubleshootingRouter: any = router;
