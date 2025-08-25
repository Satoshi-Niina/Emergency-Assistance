
import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db/index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// 繝・ヰ繝・げ逕ｨ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・- 迺ｰ蠅・､画焚縺ｨ繧ｻ繝・す繝ｧ繝ｳ迥ｶ諷九ｒ遒ｺ隱・
router.get('/debug/env', (req, res) => {
  console.log('剥 繝・ヰ繝・げ繧ｨ繝ｳ繝峨・繧､繝ｳ繝亥他縺ｳ蜃ｺ縺・);
  
  const debugInfo = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
      SESSION_SECRET: process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]',
    },
    session: {
      sessionId: req.session?.id,
      userId: req.session?.userId,
      userRole: req.session?.userRole,
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
  
  console.log('投 繝・ヰ繝・げ諠・ｱ:', debugInfo);
  
  res.json({
    success: true,
    debug: debugInfo,
    timestamp: new Date().toISOString()
  });
});

// 繝ｭ繧ｰ繧､繝ｳ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.post('/login', async (req, res) => {
  try {
    console.log('柏 Login attempt:', {
      body: req.body,
      session: req.session,
      sessionId: req.session?.id,
      headers: {
        cookie: req.headers.cookie ? '[SET]' : '[NOT SET]',
        origin: req.headers.origin,
        host: req.headers.host,
        referer: req.headers.referer
      }
    });
    
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('笶・Missing credentials:', { username: !!username, password: !!password });
      return res.status(400).json({
        success: false,
        error: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪→繝代せ繝ｯ繝ｼ繝峨ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞'
      });
    }

    // 繝・・繧ｿ繝吶・繧ｹ縺九ｉ繝ｦ繝ｼ繧ｶ繝ｼ繧呈､懃ｴ｢
    console.log('剥 Searching user in database:', username);
    const user = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (user.length === 0) {
      console.log('笶・User not found:', username);
      return res.status(401).json({
        success: false,
        error: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪∪縺溘・繝代せ繝ｯ繝ｼ繝峨′驕輔＞縺ｾ縺・
      });
    }

    const foundUser = user[0];
    console.log('笨・User found:', { id: foundUser.id, username: foundUser.username, role: foundUser.role });
    
    // 繝代せ繝ｯ繝ｼ繝峨メ繧ｧ繝・け・・crypt縺ｧ繝上ャ繧ｷ繝･蛹悶＆繧後◆繝代せ繝ｯ繝ｼ繝峨∪縺溘・蟷ｳ譁・ヱ繧ｹ繝ｯ繝ｼ繝会ｼ・
    let isValidPassword = false;
    
    console.log('柏 Password check details:', {
      inputPassword: password,
      storedPassword: foundUser.password,
      passwordLength: foundUser.password.length
    });
    
    // 縺ｾ縺喘crypt縺ｧ繝上ャ繧ｷ繝･蛹悶＆繧後◆繝代せ繝ｯ繝ｼ繝峨ｒ繝√ぉ繝・け
    try {
      isValidPassword = await bcrypt.compare(password, foundUser.password);
      console.log('柏 bcrypt password check:', isValidPassword);
    } catch (error) {
      console.log('bcrypt豈碑ｼ・お繝ｩ繝ｼ縲∝ｹｳ譁・ヱ繧ｹ繝ｯ繝ｼ繝峨ｒ繝√ぉ繝・け:', error);
    }
    
    // bcrypt縺ｧ螟ｱ謨励＠縺溷ｴ蜷医∝ｹｳ譁・ヱ繧ｹ繝ｯ繝ｼ繝峨ｒ繝√ぉ繝・け・磯幕逋ｺ迺ｰ蠅・畑・・
    if (!isValidPassword) {
      const plainTextMatch = (foundUser.password === password);
      console.log('柏 Plain text password check:', plainTextMatch);
      isValidPassword = plainTextMatch;
      if (isValidPassword) {
        console.log('笨・蟷ｳ譁・ヱ繧ｹ繝ｯ繝ｼ繝峨〒隱崎ｨｼ謌仙粥・磯幕逋ｺ迺ｰ蠅・ｼ・);
      }
    }
    
    if (!isValidPassword) {
      console.log('笶・Invalid password for:', username);
      console.log('笶・Password validation failed:', {
        username: username,
        inputPassword: password,
        storedPassword: foundUser.password,
        bcryptFailed: true,
        plainTextFailed: true
      });
      return res.status(401).json({
        success: false,
        error: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪∪縺溘・繝代せ繝ｯ繝ｼ繝峨′驕輔＞縺ｾ縺・
      });
    }

    console.log('笨・Login successful for:', username);

    // 繧ｻ繝・す繝ｧ繝ｳ縺ｫ繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ繧剃ｿ晏ｭ・
    req.session.userId = foundUser.id;
    req.session.userRole = foundUser.role;
    
    console.log('沈 Session data before save:', {
      userId: req.session.userId,
      userRole: req.session.userRole,
      sessionId: req.session.id,
      sessionData: req.session
    });
    
    // 繧ｻ繝・す繝ｧ繝ｳ繧呈・遉ｺ逧・↓菫晏ｭ・
    req.session.save((err) => {
      if (err) {
        console.error('笶・Session save error:', err);
        return res.status(500).json({
          success: false,
          error: '繧ｻ繝・す繝ｧ繝ｳ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆'
        });
      }
      
      console.log('沈 Session saved successfully:', {
        userId: req.session.userId,
        userRole: req.session.userRole,
        sessionId: req.session.id,
        sessionData: req.session
      });

      // 謌仙粥繝ｬ繧ｹ繝昴Φ繧ｹ・・eact縺ｮ隱崎ｨｼ繧ｳ繝ｳ繝・く繧ｹ繝医↓蜷医ｏ縺帙ｋ・・
      return res.json({
        success: true,
        message: '繝ｭ繧ｰ繧､繝ｳ縺ｫ謌仙粥縺励∪縺励◆',
        user: {
          id: foundUser.id,
          username: foundUser.username,
          displayName: foundUser.displayName || foundUser.username,
          role: foundUser.role,
          department: foundUser.department || 'General'
        }
      });
    });

  } catch (error) {
    console.error('笶・Login error:', error);
    return res.status(500).json({
      success: false,
      error: '繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
    });
  }
});

// 繝ｭ繧ｰ繧｢繧ｦ繝医お繝ｳ繝峨・繧､繝ｳ繝・
router.post('/logout', (req, res) => {
  try {
    console.log('坎 Logout request');
    
    // 繧ｻ繝・す繝ｧ繝ｳ繧堤ｴ譽・
    req.session.destroy((err) => {
      if (err) {
        console.error('笶・Session destroy error:', err);
        return res.status(500).json({
          error: 'Logout failed'
        });
      }
      
      return res.json({
        success: true,
        message: 'Logout successful'
      });
    });
  } catch (error) {
    console.error('笶・Logout error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// 迴ｾ蝨ｨ縺ｮ繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ蜿門ｾ・
router.get('/me', async (req, res) => {
  try {
    console.log('剥 /me endpoint called:', {
      session: req.session,
      sessionId: req.session?.id,
      userId: req.session?.userId,
      userRole: req.session?.userRole,
      headers: {
        cookie: req.headers.cookie ? '[SET]' : '[NOT SET]',
        origin: req.headers.origin,
        host: req.headers.host,
        referer: req.headers.referer
      }
    });
    
    // 繧ｻ繝・す繝ｧ繝ｳ縺九ｉ繝ｦ繝ｼ繧ｶ繝ｼID繧貞叙蠕・
    const userId = req.session?.userId;
    
    if (!userId) {
      console.log('笶・No user ID in session');
      return res.status(401).json({
        success: false,
        error: '隱崎ｨｼ縺輔ｌ縺ｦ縺・∪縺帙ｓ'
      });
    }

    console.log('剥 Searching user by ID:', userId);
    // 繝・・繧ｿ繝吶・繧ｹ縺九ｉ繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ繧貞叙蠕・
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (user.length === 0) {
      console.log('笶・User not found in database:', userId);
      return res.status(401).json({
        success: false,
        error: '繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }

    const foundUser = user[0];
    console.log('笨・User found:', { id: foundUser.id, username: foundUser.username, role: foundUser.role });
    
    return res.json({
      success: true,
      user: {
        id: foundUser.id,
        username: foundUser.username,
        displayName: foundUser.displayName || foundUser.username,
        role: foundUser.role,
        department: foundUser.department || 'General'
      }
    });
  } catch (error) {
    console.error('笶・Get user error:', error);
    return res.status(500).json({
      success: false,
      error: '繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
    });
  }
});

export default router;
