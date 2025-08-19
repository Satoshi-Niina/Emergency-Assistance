import express from 'express';
import { db } from '../db/index';

const router = express.Router();

// データベース接続テスト
router.get('/database-test', async (req: any, res: any) => {
    try {
        console.log('[DEBUG] データベース接続テスト開始');
        
        // データベース接続テスト
        const result = await db.execute('SELECT NOW() as current_time');
        
        // テーブル一覧取得
        const tables = await db.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        // usersテーブルの構造を確認
        const userColumns = await db.execute(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        const dbInfo = {
            connected: true,
            currentTime: result[0].current_time,
            tables: tables.map((t: any) => t.table_name),
            userColumns: userColumns.map((c: any) => ({
                name: c.column_name,
                type: c.data_type,
                nullable: c.is_nullable
            }))
        };
        
        console.log('[DEBUG] データベース接続テスト成功:', dbInfo);
        
        res.json({
            success: true,
            database: dbInfo,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[DEBUG] データベース接続エラー:', error);
        res.status(500).json({
            success: false,
            error: 'データベース接続に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// セッション情報確認
router.get('/session', (req: any, res: any) => {
    console.log('[DEBUG] セッション情報確認');
    
    const sessionInfo = {
        hasSession: !!req.session,
        sessionId: req.session?.id,
        userId: req.session?.userId,
        userRole: req.session?.userRole,
        username: req.session?.username,
        cookies: req.headers.cookie ? '[SET]' : '[NOT SET]',
        headers: {
            'user-agent': req.headers['user-agent'],
            origin: req.headers.origin,
        }
    };
    
    console.log('[DEBUG] セッション情報:', sessionInfo);
    
    res.json({
        success: true,
        session: sessionInfo,
        timestamp: new Date().toISOString()
    });
});

// API接続テスト
router.get('/api-test', (req: any, res: any) => {
    console.log('[DEBUG] API接続テスト');
    
    const apiInfo = {
        method: req.method,
        url: req.url,
        headers: {
            'user-agent': req.headers['user-agent'],
            origin: req.headers.origin,
            'content-type': req.headers['content-type'],
        },
        timestamp: new Date().toISOString()
    };
    
    console.log('[DEBUG] API接続テスト成功:', apiInfo);
    
    res.json({
        success: true,
        api: apiInfo,
        message: 'API接続が正常です'
    });
});

export { router as debugRouter }; 