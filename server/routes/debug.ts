import express from 'express';
import { db } from '../db/index.js';

const router = express.Router();

// 繝・・繧ｿ繝吶・繧ｹ謗･邯壹ユ繧ｹ繝・
router.get('/database-test', async (req: any, res: any) => {
    try {
        console.log('[DEBUG] 繝・・繧ｿ繝吶・繧ｹ謗･邯壹ユ繧ｹ繝磯幕蟋・);
        
        // 繝・・繧ｿ繝吶・繧ｹ謗･邯壹ユ繧ｹ繝・
        const result = await db.execute('SELECT NOW() as current_time');
        
        // 繝・・繝悶Ν荳隕ｧ蜿門ｾ・
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
        
        console.log('[DEBUG] 繝・・繧ｿ繝吶・繧ｹ謗･邯壹ユ繧ｹ繝域・蜉・', dbInfo);
        
        res.json({
            success: true,
            database: dbInfo,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[DEBUG] 繝・・繧ｿ繝吶・繧ｹ謗･邯壹お繝ｩ繝ｼ:', error);
        res.status(500).json({
            success: false,
            error: '繝・・繧ｿ繝吶・繧ｹ謗･邯壹↓螟ｱ謨励＠縺ｾ縺励◆',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// 繧ｻ繝・す繝ｧ繝ｳ諠・ｱ遒ｺ隱・
router.get('/session', (req: any, res: any) => {
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

// API謗･邯壹ユ繧ｹ繝・
router.get('/api-test', (req: any, res: any) => {
    console.log('[DEBUG] API謗･邯壹ユ繧ｹ繝・);
    
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
    
    console.log('[DEBUG] API謗･邯壹ユ繧ｹ繝域・蜉・', apiInfo);
    
    res.json({
        success: true,
        api: apiInfo,
        message: 'API謗･邯壹′豁｣蟶ｸ縺ｧ縺・
    });
});

export { router as debugRouter }; 