import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// 繝・ヰ繝・げ逕ｨ - 隱崎ｨｼ縺ｪ縺励〒繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ繧貞叙蠕・
router.get('/debug/list', async (req: any, res: any) => {
    try {
        console.log('[DEBUG] 繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ蜿門ｾ暦ｼ郁ｪ崎ｨｼ縺ｪ縺暦ｼ・);
        
        // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
        res.setHeader('Content-Type', 'application/json');
        
        // 繝・・繧ｿ繝吶・繧ｹ縺九ｉ蜈ｨ繝ｦ繝ｼ繧ｶ繝ｼ繧貞叙蠕・
        const allUsers = await db.select({
            id: users.id,
            username: users.username,
            display_name: users.displayName,
            role: users.role,
            department: users.department,
            description: users.description,
            created_at: users.created_at
        }).from(users);
        
        console.log('[DEBUG] 繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ蜿門ｾ怜ｮ御ｺ・', {
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
        console.error('[DEBUG] 繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
        res.status(500).json({ 
            success: false,
            error: '繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// 繝・ヰ繝・げ逕ｨ - 繧ｻ繝・す繝ｧ繝ｳ諠・ｱ繧堤｢ｺ隱・
router.get('/debug/session', (req: any, res: any) => {
    console.log('[DEBUG] 繧ｻ繝・す繝ｧ繝ｳ諠・ｱ遒ｺ隱・);
    
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
    
    console.log('[DEBUG] 繧ｻ繝・す繝ｧ繝ｳ諠・ｱ:', sessionInfo);
    
    res.json({
        success: true,
        session: sessionInfo,
        timestamp: new Date().toISOString()
    });
});

// 繝・ヰ繝・げ逕ｨ - 繝・・繧ｿ繝吶・繧ｹ謗･邯夂｢ｺ隱・
router.get('/debug/database', async (req: any, res: any) => {
    try {
        console.log('[DEBUG] 繝・・繧ｿ繝吶・繧ｹ謗･邯夂｢ｺ隱・);
        
        // 繝・・繝悶Ν荳隕ｧ繧貞叙蠕・
        const tables = await db.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        // users繝・・繝悶Ν縺ｮ讒矩繧堤｢ｺ隱・
        const userColumns = await db.execute(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        // 繝ｦ繝ｼ繧ｶ繝ｼ謨ｰ繧堤｢ｺ隱・
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
        
        console.log('[DEBUG] 繝・・繧ｿ繝吶・繧ｹ諠・ｱ:', dbInfo);
        
        res.json({
            success: true,
            database: dbInfo,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[DEBUG] 繝・・繧ｿ繝吶・繧ｹ遒ｺ隱阪お繝ｩ繝ｼ:', error);
        res.status(500).json({ 
            success: false,
            error: '繝・・繧ｿ繝吶・繧ｹ遒ｺ隱阪↓螟ｱ謨励＠縺ｾ縺励◆',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

export { router as usersDebugRouter }; 