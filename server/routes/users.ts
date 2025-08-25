import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Multer險ｭ螳夲ｼ医お繧ｯ繧ｻ繝ｫ繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝臥畑・・
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req: any, file: any, cb: any) => {
    // 繧ｨ繧ｯ繧ｻ繝ｫ繝輔ぃ繧､繝ｫ縺ｮ縺ｿ險ｱ蜿ｯ
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('繧ｨ繧ｯ繧ｻ繝ｫ繝輔ぃ繧､繝ｫ・・xlsx, .xls・峨・縺ｿ繧｢繝・・繝ｭ繝ｼ繝牙庄閭ｽ縺ｧ縺・));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB蛻ｶ髯・
  }
});

// 隱崎ｨｼ繝溘ラ繝ｫ繧ｦ繧ｧ繧｢・井ｸ譎ら噪縺ｫ辟｡蜉ｹ蛹厄ｼ・
const requireAuth = async (req: any, res: any, next: any) => {
  console.log('[DEBUG] 隱崎ｨｼ繝√ぉ繝・け荳譎ら噪縺ｫ辟｡蜉ｹ蛹・- 縺吶∋縺ｦ縺ｮ繝ｦ繝ｼ繧ｶ繝ｼ繧定ｨｱ蜿ｯ');
  // 荳譎ら噪縺ｫ隱崎ｨｼ繧偵せ繧ｭ繝・・
  next();
};

// 邂｡逅・・ｨｩ髯舌Α繝峨Ν繧ｦ繧ｧ繧｢・井ｸ譎ら噪縺ｫ辟｡蜉ｹ蛹厄ｼ・
const requireAdmin = async (req: any, res: any, next: any) => {
  console.log('[DEBUG] 邂｡逅・・ｨｩ髯舌メ繧ｧ繝・け荳譎ら噪縺ｫ辟｡蜉ｹ蛹・- 縺吶∋縺ｦ縺ｮ繝ｦ繝ｼ繧ｶ繝ｼ繧定ｨｱ蜿ｯ');
  // 荳譎ら噪縺ｫ邂｡逅・・ｨｩ髯舌メ繧ｧ繝・け繧偵せ繧ｭ繝・・
  next();
};

// 繝・ヰ繝・げ逕ｨ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・- 繧ｻ繝・す繝ｧ繝ｳ迥ｶ諷九ｒ遒ｺ隱・
router.get('/debug', (req: any, res: any) => {
  console.log('[DEBUG] 繝ｦ繝ｼ繧ｶ繝ｼ邂｡逅・ョ繝舌ャ繧ｰ繧ｨ繝ｳ繝峨・繧､繝ｳ繝亥他縺ｳ蜃ｺ縺・);
  
  const debugInfo = {
    session: {
      sessionId: req.session?.id,
      userId: req.session?.userId,
      userRole: req.session?.userRole,
      username: req.session?.username,
      hasSession: !!req.session,
    },
    request: {
      headers: {
        cookie: req.headers.cookie ? '[SET]' : '[NOT SET]',
        'user-agent': req.headers['user-agent'],
        origin: req.headers.origin,
      },
      method: req.method,
      url: req.url,
    }
  };
  
  console.log('[DEBUG] 繝ｦ繝ｼ繧ｶ繝ｼ邂｡逅・ョ繝舌ャ繧ｰ諠・ｱ:', debugInfo);
  
  res.json({
    success: true,
    debug: debugInfo,
    timestamp: new Date().toISOString()
  });
});

// 蜈ｨ繝ｦ繝ｼ繧ｶ繝ｼ蜿門ｾ暦ｼ育ｮ｡逅・・・縺ｿ・・ 荳譎ら噪縺ｫ隱崎ｨｼ繧堤ｷｩ蜥・
router.get('/', async (req: any, res: any) => {
    try {
        // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
        res.setHeader('Content-Type', 'application/json');
        
        console.log('[DEBUG] 繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝亥女菫｡:', {
            session: req.session,
            userId: req.session?.userId,
            userRole: req.session?.userRole,
            cookies: req.headers.cookie,
            method: req.method,
            url: req.url
        });
        
        // Drizzle ORM繧剃ｽｿ逕ｨ縺励※蜈ｨ繝ｦ繝ｼ繧ｶ繝ｼ繧貞叙蠕・
        const allUsers: any = await db.select({
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
        
        // 繝輔Ο繝ｳ繝医お繝ｳ繝峨′譛溷ｾ・☆繧句ｽ｢蠑上〒繝ｬ繧ｹ繝昴Φ繧ｹ
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

// 譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ菴懈・・育ｮ｡逅・・・縺ｿ・・ 荳譎ら噪縺ｫ隱崎ｨｼ繧堤ｷｩ蜥・
router.post('/', async (req: any, res: any) => {
    try {
        // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
        res.setHeader('Content-Type', 'application/json');
        
        console.log('[DEBUG] 繝ｦ繝ｼ繧ｶ繝ｼ菴懈・繝ｪ繧ｯ繧ｨ繧ｹ繝亥女菫｡:', {
            session: req.session,
            userId: req.session?.userId,
            userRole: req.session?.userRole,
            cookies: req.headers.cookie,
            body: req.body
        });
        
        const { username, password, display_name, role, department, description } = req.body;

        console.log('[DEBUG] 譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ菴懈・繝ｪ繧ｯ繧ｨ繧ｹ繝・', {
            username,
            display_name,
            role,
            department,
            hasPassword: !!password,
            body: req.body
        });

        // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
        if (!username || !password || !display_name || !role) {
            console.log('[DEBUG] 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ:', { username, password: !!password, display_name, role });
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields',
                required: ['username', 'password', 'display_name', 'role'],
                received: { username: !!username, password: !!password, display_name: !!display_name, role: !!role },
                timestamp: new Date().toISOString()
            });
        }

        // 繝ｦ繝ｼ繧ｶ繝ｼ蜷阪・蠖｢蠑上メ繧ｧ繝・け
        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Username must be between 3 and 50 characters',
                timestamp: new Date().toISOString()
            });
        }

        // 繝代せ繝ｯ繝ｼ繝峨・蠑ｷ蠎ｦ繝√ぉ繝・け
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters long',
                timestamp: new Date().toISOString()
            });
        }

        // 讓ｩ髯舌・蛟､繝√ぉ繝・け
        if (!['employee', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Role must be either "employee" or "admin"',
                timestamp: new Date().toISOString()
            });
        }

        // 譌｢蟄倥Θ繝ｼ繧ｶ繝ｼ縺ｮ遒ｺ隱・
        const existingUser = await db.select().from(users).where(eq(users.username, username));
        if (existingUser.length > 0) {
            console.log('[DEBUG] 譌｢蟄倥Θ繝ｼ繧ｶ繝ｼ縺悟ｭ伜惠:', username);
            return res.status(409).json({ 
                success: false,
                error: 'Username already exists',
                timestamp: new Date().toISOString()
            });
        }

        // 繝代せ繝ｯ繝ｼ繝峨・繝上ャ繧ｷ繝･蛹・
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('[DEBUG] 繝代せ繝ｯ繝ｼ繝峨ワ繝・す繝･蛹門ｮ御ｺ・);

        // 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ菴懈・
        console.log('[DEBUG] 繝・・繧ｿ繝吶・繧ｹ謖ｿ蜈･髢句ｧ・', {
            username,
            display_name,
            role,
            department,
            description,
            hashedPasswordLength: hashedPassword.length
        });

        const newUser = await db.insert(users).values({
            username,
            password: hashedPassword,
            displayName: display_name,
            role,
            department: department || null,
            description: description || null
        }).returning();

        console.log('[DEBUG] 繝ｦ繝ｼ繧ｶ繝ｼ菴懈・螳御ｺ・', newUser[0].id);

        // 繝代せ繝ｯ繝ｼ繝峨ｒ髯､縺・◆繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ繧定ｿ斐☆
        const userWithoutPassword = {
            id: newUser[0].id,
            username: newUser[0].username,
            display_name: newUser[0].displayName,
            role: newUser[0].role,
            department: newUser[0].department,
            description: newUser[0].description,
            created_at: newUser[0].created_at
        };

        res.status(201).json({
            success: true,
            message: '繝ｦ繝ｼ繧ｶ繝ｼ縺梧ｭ｣蟶ｸ縺ｫ菴懈・縺輔ｌ縺ｾ縺励◆',
            data: userWithoutPassword,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[DEBUG] 繝ｦ繝ｼ繧ｶ繝ｼ菴懈・繧ｨ繝ｩ繝ｼ:', error);
        res.status(500).json({ 
            success: false,
            error: '繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ菴懈・縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// 蛟句挨繝ｦ繝ｼ繧ｶ繝ｼ蜿門ｾ暦ｼ育ｮ｡逅・・・縺ｿ・・
router.get('/:id', requireAuth, requireAdmin, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        
        // 縺ｾ縺壹．rizzle縺ｮ繧ｯ繧ｨ繝ｪ縺ｧ隧ｦ陦・
        let existingUser: any = null;
        try {
            const results = await db.select().from(users).where(eq(users.id, id));
            existingUser = results[0];
        } catch (dbError) {
            console.log('[DEBUG] Drizzle繧ｯ繧ｨ繝ｪ繧ｨ繝ｩ繝ｼ:', dbError);
        }

        // Drizzle繧ｯ繧ｨ繝ｪ縺悟､ｱ謨励＠縺溷ｴ蜷医∵焔蜍輔〒讀懃ｴ｢
        if (!existingUser) {
            console.log('[DEBUG] Drizzle繧ｯ繧ｨ繝ｪ螟ｱ謨励∵焔蜍墓､懃ｴ｢繧貞ｮ溯｡・);
            const allUsers: any = await db.select().from(users);
            console.log(`[DEBUG] 蜈ｨ繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ (${allUsers.length}莉ｶ):`, allUsers.map(u => ({
                id: u.id,
                username: u.username,
                display_name: u.displayName,
                role: u.role,
                department: u.department
            })));

            // 螳悟・荳閾ｴ繧定ｩｦ陦・
            existingUser = allUsers.find(u => u.id === id);
            
            if (!existingUser) {
                console.log(`[DEBUG] 螳悟・荳閾ｴ繝√ぉ繝・け:`, allUsers.map(u => ({
                    id: u.id,
                    idType: typeof u.id,
                    idLength: u.id.length,
                    searchId: id,
                    searchIdType: typeof id,
                    searchIdLength: id.length,
                    exactMatch: u.id === id,
                    includesMatch: u.id.includes(id) || id.includes(u.id),
                    caseInsensitiveMatch: u.id.toLowerCase() === id.toLowerCase()
                })));

                // 驛ｨ蛻・ｸ閾ｴ繧定ｩｦ陦・
                const partialMatches = allUsers.filter(u => 
                    u.id.includes(id) || id.includes(u.id) || u.id.toLowerCase() === id.toLowerCase()
                );

                if (partialMatches.length > 0) {
                    existingUser = partialMatches[0];
                    console.log(`[DEBUG] 驛ｨ蛻・ｸ閾ｴ縺ｧ隕九▽縺九ｊ縺ｾ縺励◆:`, existingUser);
                } else {
                    console.log(`[ERROR] 蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｪID荳隕ｧ:`, allUsers.map(u => `"${u.id}"`));
                    console.log(`[ERROR] 譁・ｭ励さ繝ｼ繝画ｯ碑ｼ・`, allUsers.map(u => ({
                        id: u.id,
                        charCodes: Array.from(u.id as string).map(c => (c as string).charCodeAt(0)),
                        searchId: id,
                        searchCharCodes: Array.from(id as string).map(c => (c as string).charCodeAt(0))
                    })));
                    
                    return res.status(404).json({
                        error: 'User not found',
                        searchId: id,
                        availableIds: allUsers.map(u => u.id),
                        possibleMatches: allUsers.filter(u => u.id.includes(id) || id.includes(u.id) || u.id.toLowerCase() === id.toLowerCase())
                    });
                }
            }
        }

        if (existingUser) {
            // 繝代せ繝ｯ繝ｼ繝峨ｒ髯､螟悶＠縺ｦ繝ｬ繧ｹ繝昴Φ繧ｹ
            const { password, ...userWithoutPassword } = existingUser;
            res.json({
                success: true,
                data: userWithoutPassword,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({ 
                success: false,
                error: 'User not found',
                id,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch user',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// 繝ｦ繝ｼ繧ｶ繝ｼ譖ｴ譁ｰ蜃ｦ逅・・蜈ｱ騾夐未謨ｰ
const updateUserHandler = async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { username, display_name, role, department, description, password } = req.body;

        console.log(`[DEBUG] 繝ｦ繝ｼ繧ｶ繝ｼ譖ｴ譁ｰ繝ｪ繧ｯ繧ｨ繧ｹ繝・ ID="${id}"`, {
            username,
            display_name,
            role,
            department,
            description,
            hasPassword: !!password
        });

        const updateData: any = {
            username,
            displayName: display_name,
            role,
            department,
            description
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const existingUser: any = await db.select().from(users).where(eq(users.id, id));
        
        if (existingUser.length === 0) {
            console.log(`[ERROR] 繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ: ID="${id}"`);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`[DEBUG] 譌｢蟄倥Θ繝ｼ繧ｶ繝ｼ諠・ｱ:`, existingUser[0]);

        await db.update(users).set(updateData).where(eq(users.id, id));
        
        console.log(`[DEBUG] 繝ｦ繝ｼ繧ｶ繝ｼ譖ｴ譁ｰ螳御ｺ・ ID="${id}"`);
        res.json({ 
            success: true,
            message: 'User updated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update user',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
};

// PUT繝｡繧ｽ繝・ラ・域里蟄假ｼ・
router.put('/:id', requireAuth, requireAdmin, updateUserHandler);

// PATCH繝｡繧ｽ繝・ラ・域眠隕剰ｿｽ蜉・・
router.patch('/:id', requireAuth, requireAdmin, updateUserHandler);

// 繝ｦ繝ｼ繧ｶ繝ｼ蜑企勁・育ｮ｡逅・・・縺ｿ・・
router.delete('/:id', requireAuth, requireAdmin, async (req: any, res: any) => {
    try {
        const { id } = req.params;

        console.log(`[DEBUG] 繝ｦ繝ｼ繧ｶ繝ｼ蜑企勁繝ｪ繧ｯ繧ｨ繧ｹ繝・ ID="${id}"`);

        // 譌｢蟄倥Θ繝ｼ繧ｶ繝ｼ縺ｮ遒ｺ隱・
        const existingUser = await db.select().from(users).where(eq(users.id, id));
        
        if (existingUser.length === 0) {
            console.log(`[ERROR] 蜑企勁蟇ｾ雎｡繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ: ID="${id}"`);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`[DEBUG] 蜑企勁蟇ｾ雎｡繝ｦ繝ｼ繧ｶ繝ｼ:`, existingUser[0]);

        // 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ蜑企勁
        await db.delete(users).where(eq(users.id, id));
        
        console.log(`[DEBUG] 繝ｦ繝ｼ繧ｶ繝ｼ蜑企勁螳御ｺ・ ID="${id}"`);
        res.json({ 
            success: true,
            message: 'User deleted successfully',
            id,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete user',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// 繧ｨ繧ｯ繧ｻ繝ｫ繝輔ぃ繧､繝ｫ縺九ｉ繝ｦ繝ｼ繧ｶ繝ｼ荳諡ｬ繧､繝ｳ繝昴・繝茨ｼ育ｮ｡逅・・・縺ｿ・・
router.post('/import-excel', requireAuth, requireAdmin, upload.single('file'), async (req: any, res: any) => {
    try {
        console.log('[DEBUG] 繧ｨ繧ｯ繧ｻ繝ｫ繧､繝ｳ繝昴・繝医Μ繧ｯ繧ｨ繧ｹ繝亥女菫｡');
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: '繧ｨ繧ｯ繧ｻ繝ｫ繝輔ぃ繧､繝ｫ縺後い繝・・繝ｭ繝ｼ繝峨＆繧後※縺・∪縺帙ｓ'
            });
        }

        console.log('[DEBUG] 繧｢繝・・繝ｭ繝ｼ繝峨＆繧後◆繝輔ぃ繧､繝ｫ:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        // 繧ｨ繧ｯ繧ｻ繝ｫ繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ縺ｿ
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // 繧ｷ繝ｼ繝医ｒJSON縺ｫ螟画鋤
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log('[DEBUG] 繧ｨ繧ｯ繧ｻ繝ｫ繝・・繧ｿ隱ｭ縺ｿ霎ｼ縺ｿ螳御ｺ・', {
            sheetName,
            rowCount: jsonData.length
        });

        // 繝倥ャ繝繝ｼ陦後ｒ繧ｹ繧ｭ繝・・縺励※繝・・繧ｿ陦後ｒ蜃ｦ逅・
        const dataRows = jsonData.slice(1);
        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i] as any[];
            const rowNumber = i + 2; // 繝倥ャ繝繝ｼ陦後ｒ髯､縺・※1縺九ｉ髢句ｧ九√＆繧峨↓繝倥ャ繝繝ｼ陦悟・+1

            try {
                // 蠢・医ヵ繧｣繝ｼ繝ｫ繝峨・繝√ぉ繝・け
                if (!row[0] || !row[1] || !row[2] || !row[3]) {
                    results.errors.push(`陦・{rowNumber}: 蠢・医ヵ繧｣繝ｼ繝ｫ繝会ｼ医Θ繝ｼ繧ｶ繝ｼ蜷阪√ヱ繧ｹ繝ｯ繝ｼ繝峨∬｡ｨ遉ｺ蜷阪∵ｨｩ髯撰ｼ峨′荳崎ｶｳ縺励※縺・∪縺兪);
                    results.failed++;
                    continue;
                }

                const username = String(row[0]).trim();
                const password = String(row[1]).trim();
                const displayName = String(row[2]).trim();
                const role = String(row[3]).trim().toLowerCase();
                const department = row[4] ? String(row[4]).trim() : null;
                const description = row[5] ? String(row[5]).trim() : null;

                // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
                if (username.length < 3 || username.length > 50) {
                    results.errors.push(`陦・{rowNumber}: 繝ｦ繝ｼ繧ｶ繝ｼ蜷阪・3譁・ｭ嶺ｻ･荳・0譁・ｭ嶺ｻ･荳九〒蜈･蜉帙＠縺ｦ縺上□縺輔＞`);
                    results.failed++;
                    continue;
                }

                if (password.length < 6) {
                    results.errors.push(`陦・{rowNumber}: 繝代せ繝ｯ繝ｼ繝峨・6譁・ｭ嶺ｻ･荳翫〒蜈･蜉帙＠縺ｦ縺上□縺輔＞`);
                    results.failed++;
                    continue;
                }

                if (!['employee', 'admin'].includes(role)) {
                    results.errors.push(`陦・{rowNumber}: 讓ｩ髯舌・縲憩mployee縲阪∪縺溘・縲径dmin縲阪ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞`);
                    results.failed++;
                    continue;
                }

                // 譌｢蟄倥Θ繝ｼ繧ｶ繝ｼ縺ｮ遒ｺ隱・
                const existingUser = await db.select().from(users).where(eq(users.username, username));
                if (existingUser.length > 0) {
                    results.errors.push(`陦・{rowNumber}: 繝ｦ繝ｼ繧ｶ繝ｼ蜷阪・{username}縲阪・譌｢縺ｫ蟄伜惠縺励∪縺兪);
                    results.failed++;
                    continue;
                }

                // 繝代せ繝ｯ繝ｼ繝峨・繝上ャ繧ｷ繝･蛹・
                const hashedPassword = await bcrypt.hash(password, 10);

                // 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ菴懈・
                await db.insert(users).values({
                    username,
                    password: hashedPassword,
                    displayName,
                    role,
                    department,
                    description
                });

                results.success++;
                console.log(`[DEBUG] 繝ｦ繝ｼ繧ｶ繝ｼ菴懈・謌仙粥: ${username}`);

            } catch (error) {
                console.error(`[ERROR] 陦・{rowNumber}縺ｮ蜃ｦ逅・お繝ｩ繝ｼ:`, error);
                results.errors.push(`陦・{rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                results.failed++;
            }
        }

        console.log('[DEBUG] 繧ｨ繧ｯ繧ｻ繝ｫ繧､繝ｳ繝昴・繝亥ｮ御ｺ・', results);

        res.json({
            success: true,
            message: '繧ｨ繧ｯ繧ｻ繝ｫ繧､繝ｳ繝昴・繝医′螳御ｺ・＠縺ｾ縺励◆',
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[ERROR] 繧ｨ繧ｯ繧ｻ繝ｫ繧､繝ｳ繝昴・繝医お繝ｩ繝ｼ:', error);
        res.status(500).json({
            success: false,
            error: '繧ｨ繧ｯ繧ｻ繝ｫ繧､繝ｳ繝昴・繝井ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// 繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ繝溘ラ繝ｫ繧ｦ繧ｧ繧｢
router.use((err: any, req: any, res: any, next: any) => {
  console.error('繝ｦ繝ｼ繧ｶ繝ｼ邂｡逅・お繝ｩ繝ｼ:', err);
  
  // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
  res.setHeader('Content-Type', 'application/json');
  
  res.status(500).json({
    success: false,
    error: '繝ｦ繝ｼ繧ｶ繝ｼ邂｡逅・・蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
    details: err.message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
});

// 404繝上Φ繝峨Μ繝ｳ繧ｰ
router.use('*', (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: '繝ｦ繝ｼ繧ｶ繝ｼ邂｡逅・・繧ｨ繝ｳ繝峨・繧､繝ｳ繝医′隕九▽縺九ｊ縺ｾ縺帙ｓ',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

export { router as usersRouter }; 