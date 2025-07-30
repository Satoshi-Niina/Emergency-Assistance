
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

const router = express.Router();

// データモード判定関数
function isDbMode(): boolean {
    return process.env.DATA_MODE === 'db';
}

// DB操作用のプレースホルダー関数（将来実装予定）
async function dbGetTroubleshootingList(): Promise<any[]> {
    // ここにDB処理を追加予定
    // const result = await db.select().from(troubleshooting);
    // return result;
    throw new Error('Database mode not implemented yet');
}

async function dbGetTroubleshootingById(id: string): Promise<any | null> {
    // ここにDB処理を追加予定
    // const result = await db.select().from(troubleshooting).where(eq(troubleshooting.id, id));
    // return result[0] || null;
    throw new Error('Database mode not implemented yet');
}

async function dbCreateTroubleshooting(data: any): Promise<string> {
    // ここにDB処理を追加予定
    // const result = await db.insert(troubleshooting).values(data).returning();
    // return result[0].id;
    throw new Error('Database mode not implemented yet');
}

async function dbUpdateTroubleshooting(id: string, data: any): Promise<void> {
    // ここにDB処理を追加予定
    // await db.update(troubleshooting).set(data).where(eq(troubleshooting.id, id));
    throw new Error('Database mode not implemented yet');
}

async function dbDeleteTroubleshooting(id: string): Promise<void> {
    // ここにDB処理を追加予定
    // await db.delete(troubleshooting).where(eq(troubleshooting.id, id));
    throw new Error('Database mode not implemented yet');
}

async function dbSearchTroubleshooting(query: string): Promise<any[]> {
    // ここにDB処理を追加予定
    // const result = await db.select().from(troubleshooting)
    //   .where(or(
    //     like(troubleshooting.title, `%${query}%`),
    //     like(troubleshooting.description, `%${query}%`),
    //     like(troubleshooting.keyword, `%${query}%`)
    //   ));
    // return result;
    throw new Error('Database mode not implemented yet');
}

// 画像URL変換関数
function convertImageUrlsForDeployment(data: any): any {
    if (!data) return data;

    const convertUrl = (url: string): string => {
        if (!url) return url;
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        if (url.startsWith('/api/emergency-flow/image/') || url.startsWith('api/emergency-flow/image/')) {
            return url.startsWith('/') ? url : `/${url}`;
        }
        return `/api/emergency-flow/image/${url.replace(/^\/+/, '')}`;
    };

    const result = JSON.parse(JSON.stringify(data));

    if (result.steps && Array.isArray(result.steps)) {
        result.steps.forEach((step: any) => {
            if (step.imageUrl) {
                step.imageUrl = convertUrl(step.imageUrl);
            }
            if (step.images && Array.isArray(step.images)) {
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

// 保存用に画像URLを正規化する関数
function normalizeImageUrlsForStorage(data: any): any {
    if (!data) return data;

    const normalizeUrl = (url: string): string => {
        if (!url) return url;
        if (url.includes('/api/emergency-flow/image/')) {
            return url.replace(/.*\/api\/emergency-flow\/image\//, '');
        }
        return url;
    };

    const result = JSON.parse(JSON.stringify(data));

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

// ファイルベースのデータ操作関数
async function ensureTroubleshootingDir(): Promise<string> {
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    if (!existsSync(troubleshootingDir)) {
        await fs.mkdir(troubleshootingDir, { recursive: true });
    }
    return troubleshootingDir;
}

async function fileGetTroubleshootingList(): Promise<any[]> {
    const troubleshootingDir = await ensureTroubleshootingDir();
    const files = await fs.readdir(troubleshootingDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const troubleshootingList = [];
    for (const file of jsonFiles) {
        try {
            const filePath = path.join(troubleshootingDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            const convertedData = convertImageUrlsForDeployment(data);
            troubleshootingList.push(convertedData);
        } catch (error) {
            console.error(`❌ Error reading file ${file}:`, error);
        }
    }
    
    return troubleshootingList;
}

async function fileGetTroubleshootingById(id: string): Promise<any | null> {
    const troubleshootingDir = await ensureTroubleshootingDir();
    const filePath = path.join(troubleshootingDir, `${id}.json`);
    
    if (!existsSync(filePath)) {
        return null;
    }
    
    const content = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    return convertImageUrlsForDeployment(data);
}

async function fileCreateTroubleshooting(data: any): Promise<string> {
    const troubleshootingDir = await ensureTroubleshootingDir();
    const id = data.id || `ts_${Date.now()}`;
    const filePath = path.join(troubleshootingDir, `${id}.json`);
    
    const normalizedData = normalizeImageUrlsForStorage(data);
    normalizedData.id = id;
    
    await fs.writeFile(filePath, JSON.stringify(normalizedData, null, 2), 'utf8');
    return id;
}

async function fileUpdateTroubleshooting(id: string, data: any): Promise<void> {
    const troubleshootingDir = await ensureTroubleshootingDir();
    const filePath = path.join(troubleshootingDir, `${id}.json`);
    
    if (!existsSync(filePath)) {
        throw new Error('Troubleshooting flow not found');
    }
    
    const normalizedData = normalizeImageUrlsForStorage(data);
    normalizedData.id = id;
    
    await fs.writeFile(filePath, JSON.stringify(normalizedData, null, 2), 'utf8');
}

async function fileDeleteTroubleshooting(id: string): Promise<void> {
    const troubleshootingDir = await ensureTroubleshootingDir();
    const filePath = path.join(troubleshootingDir, `${id}.json`);
    
    if (!existsSync(filePath)) {
        throw new Error('Troubleshooting flow not found');
    }
    
    await fs.unlink(filePath);
}

async function fileSearchTroubleshooting(query: string): Promise<any[]> {
    const troubleshootingDir = await ensureTroubleshootingDir();
    const files = await fs.readdir(troubleshootingDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const searchResults = [];
    for (const file of jsonFiles) {
        try {
            const filePath = path.join(troubleshootingDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            
            const searchText = `${data.title || ''} ${data.description || ''} ${data.keyword || ''}`.toLowerCase();
            if (searchText.includes(query.toLowerCase())) {
                searchResults.push(data);
            }
        } catch (error) {
            console.error(`❌ Error reading file ${file}:`, error);
        }
    }
    
    return searchResults;
}

// ===== すべてのルートでJSONレスポンスヘッダーを強制設定 =====
router.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    
    console.log(`🔍 [Troubleshooting API] ${req.method} ${req.path}`);
    next();
});

// トラブルシューティングリスト取得
router.get('/list', async (req, res) => {
    try {
        console.log('🔄 [/list] リクエスト処理開始');
        console.log(`💾 [データモード] ${isDbMode() ? 'DB' : 'FILE'}`);
        
        let troubleshootingList: any[];
        
        if (isDbMode()) {
            troubleshootingList = await dbGetTroubleshootingList();
        } else {
            troubleshootingList = await fileGetTroubleshootingList();
        }

        console.log(`📋 最終リスト: ${troubleshootingList.length}件`);
        console.log('✅ [/list] JSONリストを返却');
        res.json(troubleshootingList);
    } catch (error) {
        console.error('❌ [/list] トラブルシューティングリスト取得エラー:', error);
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
        console.log('🔄 [/detail/:id] リクエスト処理開始');
        const { id } = req.params;
        console.log(`💾 [データモード] ${isDbMode() ? 'DB' : 'FILE'}`);
        
        let data: any | null;
        
        if (isDbMode()) {
            data = await dbGetTroubleshootingById(id);
        } else {
            data = await fileGetTroubleshootingById(id);
        }
        
        if (!data) {
            console.log(`❌ [/detail/:id] データが見つかりません: ${id}`);
            return res.status(404).json({ 
                success: false,
                error: 'Troubleshooting flow not found' 
            });
        }
        
        console.log('✅ [/detail/:id] JSONデータを返却');
        res.json(data);
    } catch (error) {
        console.error('❌ [/detail/:id] Error in troubleshooting detail:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to load troubleshooting detail' 
        });
    }
});

// トラブルシューティング作成
router.post('/', async (req, res) => {
    try {
        console.log('🔄 [POST /] トラブルシューティング作成開始');
        const troubleshootingData = req.body;
        console.log(`💾 [データモード] ${isDbMode() ? 'DB' : 'FILE'}`);
        
        let id: string;
        
        if (isDbMode()) {
            id = await dbCreateTroubleshooting(troubleshootingData);
        } else {
            id = await fileCreateTroubleshooting(troubleshootingData);
        }

        console.log('✅ [POST /] 作成成功JSONレスポンス');
        res.status(201).json({
            success: true,
            id: id,
            message: 'Troubleshooting flow created successfully'
        });
    } catch (error) {
        console.error('❌ [POST /] Error in troubleshooting create:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create troubleshooting flow' 
        });
    }
});

// トラブルシューティング更新
router.put('/:id', async (req, res) => {
    try {
        console.log('🔄 [PUT /:id] トラブルシューティング更新開始');
        const { id } = req.params;
        const troubleshootingData = req.body;
        console.log(`💾 [データモード] ${isDbMode() ? 'DB' : 'FILE'}`);
        
        if (isDbMode()) {
            await dbUpdateTroubleshooting(id, troubleshootingData);
        } else {
            await fileUpdateTroubleshooting(id, troubleshootingData);
        }

        console.log('✅ [PUT /:id] 更新成功JSONレスポンス');
        res.json({
            success: true,
            message: 'Troubleshooting flow updated successfully'
        });
    } catch (error) {
        console.error('❌ [PUT /:id] Error in troubleshooting update:', error);
        
        if (error instanceof Error && error.message === 'Troubleshooting flow not found') {
            res.status(404).json({ 
                success: false,
                error: 'Troubleshooting flow not found' 
            });
        } else {
            res.status(500).json({ 
                success: false,
                error: 'Failed to update troubleshooting flow' 
            });
        }
    }
});

// トラブルシューティング削除
router.delete('/:id', async (req, res) => {
    try {
        console.log('🔄 [DELETE /:id] トラブルシューティング削除開始');
        const { id } = req.params;
        console.log(`💾 [データモード] ${isDbMode() ? 'DB' : 'FILE'}`);
        
        if (isDbMode()) {
            await dbDeleteTroubleshooting(id);
        } else {
            await fileDeleteTroubleshooting(id);
        }
        
        console.log('✅ [DELETE /:id] 削除成功JSONレスポンス');
        res.json({
            success: true,
            message: 'Troubleshooting flow deleted successfully'
        });
    } catch (error) {
        console.error('❌ [DELETE /:id] Error in troubleshooting delete:', error);
        
        if (error instanceof Error && error.message === 'Troubleshooting flow not found') {
            res.status(404).json({ 
                success: false,
                error: 'Troubleshooting flow not found' 
            });
        } else {
            res.status(500).json({ 
                success: false,
                error: 'Failed to delete troubleshooting flow' 
            });
        }
    }
});

// トラブルシューティング検索
router.post('/search', async (req, res) => {
    try {
        console.log('🔄 [POST /search] トラブルシューティング検索開始');
        const { query } = req.body;
        console.log(`💾 [データモード] ${isDbMode() ? 'DB' : 'FILE'}`);
        
        let searchResults: any[];
        
        if (isDbMode()) {
            searchResults = await dbSearchTroubleshooting(query);
        } else {
            searchResults = await fileSearchTroubleshooting(query);
        }
        
        console.log(`✅ [POST /search] 検索結果${searchResults.length}件をJSONで返却`);
        res.json(searchResults);
    } catch (error) {
        console.error('❌ [POST /search] Error in troubleshooting search:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to search troubleshooting flows' 
        });
    }
});

export const troubleshootingRouter: any = router;
