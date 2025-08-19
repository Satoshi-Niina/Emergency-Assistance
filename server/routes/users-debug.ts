import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db/index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// デバッグ用 - 認証なしでユーザー一覧を取得
router.get('/debug/list', async (req: any, res: any) => {
    try {
        console.log('[DEBUG] ユーザー一覧取得（認証なし）');
        
        // Content-Typeを明示的に設定
        res.setHeader('Content-Type', 'application/json');
        
        // データベースから全ユーザーを取得
        const allUsers = await db.select({
            id: users.id,
            username: users.username,
            display_name: users.displayName,
            role: users.role,
            department: users.department,
            description: users.description,
            created_at: users.created_at
        }).from(users);
        
        console.log('[DEBUG] ユーザー一覧取得完了:', {
            count: allUsers.length,
            users: allUsers.map(u => ({ id: u.id, username: u.username, role: u.role }))
        });
        
        res.json({
            success: true,
            data: allUsers,
            total: allUsers.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[DEBUG] ユーザー一覧取得エラー:', error);
        res.status(500).json({ 
            success: false,
            error: 'ユーザー一覧の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// デバッグ用 - セッション情報を確認
router.get('/debug/session', (req: any, res: any) => {
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

// デバッグ用 - データベース接続確認
router.get('/debug/database', async (req: any, res: any) => {
    try {
        console.log('[DEBUG] データベース接続確認');
        
        // テーブル一覧を取得
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
        
        // ユーザー数を確認
        const userCount = await db.select().from(users);
        
        const dbInfo = {
            tables: tables.map((t: any) => t.table_name),
            userColumns: userColumns.map((c: any) => ({
                name: c.column_name,
                type: c.data_type,
                nullable: c.is_nullable
            })),
            userCount: userCount.length,
            sampleUsers: userCount.slice(0, 3).map(u => ({
                id: u.id,
                username: u.username,
                role: u.role
            }))
        };
        
        console.log('[DEBUG] データベース情報:', dbInfo);
        
        res.json({
            success: true,
            database: dbInfo,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[DEBUG] データベース確認エラー:', error);
        res.status(500).json({ 
            success: false,
            error: 'データベース確認に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

export { router as usersDebugRouter }; 