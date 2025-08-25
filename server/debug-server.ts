import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import session from 'express-session';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './db/schema.js';
import { eq } from 'drizzle-orm';

console.log('噫 繝・ヰ繝・げ繧ｵ繝ｼ繝舌・襍ｷ蜍暮幕蟋・);

const app = express();
const PORT = 3001;

console.log('統 Express繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ菴懈・螳御ｺ・);

// 繝溘ラ繝ｫ繧ｦ繧ｧ繧｢
app.use(cors({
  origin: ['http://localhost:5002', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

console.log('統 CORS縺ｨJSON繝溘ラ繝ｫ繧ｦ繧ｧ繧｢險ｭ螳壼ｮ御ｺ・);

// 繧ｻ繝・す繝ｧ繝ｳ險ｭ螳・
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 髢狗匱迺ｰ蠅・〒縺ｯfalse
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24譎る俣
  }
}));

console.log('統 繧ｻ繝・す繝ｧ繝ｳ險ｭ螳壼ｮ御ｺ・);

// 繝・・繧ｿ繝吶・繧ｹ謗･邯・
console.log('剥 繝・・繧ｿ繝吶・繧ｹ謗･邯夐幕蟋・);
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('笶・DATABASE_URL縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ');
  process.exit(1);
}

console.log('統 DATABASE_URL遒ｺ隱榊ｮ御ｺ・);

const client = postgres(connectionString);
const db = drizzle(client);

console.log('統 繝・・繧ｿ繝吶・繧ｹ謗･邯壼ｮ御ｺ・);

// 繝倥Ν繧ｹ繝√ぉ繝・け
app.get('/api/health', (req, res) => {
  console.log('剥 繝倥Ν繧ｹ繝√ぉ繝・け繝ｪ繧ｯ繧ｨ繧ｹ繝亥女菫｡');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

console.log('統 繝倥Ν繧ｹ繝√ぉ繝・け繧ｨ繝ｳ繝峨・繧､繝ｳ繝郁ｨｭ螳壼ｮ御ｺ・);

// 繝ｭ繧ｰ繧､繝ｳ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('柏 繝ｭ繧ｰ繧､繝ｳ繝ｪ繧ｯ繧ｨ繧ｹ繝亥女菫｡:', req.body);
    
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('笶・繝ｦ繝ｼ繧ｶ繝ｼ蜷阪∪縺溘・繝代せ繝ｯ繝ｼ繝峨′荳崎ｶｳ');
      return res.status(400).json({
        success: false,
        error: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪→繝代せ繝ｯ繝ｼ繝峨ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞'
      });
    }

    console.log('剥 繝・・繧ｿ繝吶・繧ｹ縺九ｉ繝ｦ繝ｼ繧ｶ繝ｼ讀懃ｴ｢髢句ｧ・', username);
    
    // 繝・・繧ｿ繝吶・繧ｹ縺九ｉ繝ｦ繝ｼ繧ｶ繝ｼ繧呈､懃ｴ｢
    const user = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (user.length === 0) {
      console.log('笶・繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ:', username);
      return res.status(401).json({
        success: false,
        error: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪∪縺溘・繝代せ繝ｯ繝ｼ繝峨′驕輔＞縺ｾ縺・
      });
    }

    const foundUser = user[0];
    console.log('笨・繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺励◆:', { id: foundUser.id, username: foundUser.username });
    
    // 繝代せ繝ｯ繝ｼ繝峨メ繧ｧ繝・け
    console.log('柏 繝代せ繝ｯ繝ｼ繝画､懆ｨｼ髢句ｧ・);
    let isValidPassword = false;
    
    try {
      isValidPassword = await bcrypt.compare(password, foundUser.password);
      console.log('柏 bcrypt讀懆ｨｼ邨先棡:', isValidPassword);
    } catch (error) {
      console.log('笶・bcrypt豈碑ｼ・お繝ｩ繝ｼ:', error);
    }
    
    if (!isValidPassword) {
      console.log('笶・繝代せ繝ｯ繝ｼ繝峨′辟｡蜉ｹ縺ｧ縺・);
      return res.status(401).json({
        success: false,
        error: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪∪縺溘・繝代せ繝ｯ繝ｼ繝峨′驕輔＞縺ｾ縺・
      });
    }

    console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥:', username);

    // 繧ｻ繝・す繝ｧ繝ｳ縺ｫ繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ繧剃ｿ晏ｭ・
    req.session.userId = foundUser.id;
    req.session.userRole = foundUser.role;
    
    console.log('沈 繧ｻ繝・す繝ｧ繝ｳ菫晏ｭ倬幕蟋・);
    
    // 繧ｻ繝・す繝ｧ繝ｳ繧呈・遉ｺ逧・↓菫晏ｭ・
    req.session.save((err) => {
      if (err) {
        console.error('笶・繧ｻ繝・す繝ｧ繝ｳ菫晏ｭ倥お繝ｩ繝ｼ:', err);
        return res.status(500).json({
          success: false,
          error: '繧ｻ繝・す繝ｧ繝ｳ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆'
        });
      }
      
      console.log('沈 繧ｻ繝・す繝ｧ繝ｳ菫晏ｭ俶・蜉・', {
        userId: req.session.userId,
        userRole: req.session.userRole,
        sessionId: req.session.id
      });

      // 謌仙粥繝ｬ繧ｹ繝昴Φ繧ｹ
      res.json({
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
    console.error('笶・繝ｭ繧ｰ繧､繝ｳ繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
    });
  }
});

console.log('統 繝ｭ繧ｰ繧､繝ｳ繧ｨ繝ｳ繝峨・繧､繝ｳ繝郁ｨｭ螳壼ｮ御ｺ・);

// 隱崎ｨｼ遒ｺ隱阪お繝ｳ繝峨・繧､繝ｳ繝・
app.get('/api/auth/me', async (req, res) => {
  try {
    console.log('剥 隱崎ｨｼ遒ｺ隱阪Μ繧ｯ繧ｨ繧ｹ繝亥女菫｡:', {
      sessionId: req.session?.id,
      userId: req.session?.userId,
      userRole: req.session?.userRole
    });

    if (!req.session || !req.session.userId) {
      console.log('笶・繧ｻ繝・す繝ｧ繝ｳ縺悟ｭ伜惠縺励∪縺帙ｓ');
      return res.status(401).json({
        success: false,
        error: '譛ｪ隱崎ｨｼ'
      });
    }

    // 繝・・繧ｿ繝吶・繧ｹ縺九ｉ繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ繧貞叙蠕・
    const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
    
    if (user.length === 0) {
      console.log('笶・繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ:', req.session.userId);
      return res.status(401).json({
        success: false,
        error: '繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }

    const foundUser = user[0];
    console.log('笨・隱崎ｨｼ貂医∩繝ｦ繝ｼ繧ｶ繝ｼ:', foundUser.username);

    res.json({
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
    console.error('笶・隱崎ｨｼ遒ｺ隱阪お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
    });
  }
});

console.log('統 隱崎ｨｼ遒ｺ隱阪お繝ｳ繝峨・繧､繝ｳ繝郁ｨｭ螳壼ｮ御ｺ・);

// 繝ｭ繧ｰ繧｢繧ｦ繝医お繝ｳ繝峨・繧､繝ｳ繝・
app.post('/api/auth/logout', (req, res) => {
  try {
    console.log('柏 繝ｭ繧ｰ繧｢繧ｦ繝医Μ繧ｯ繧ｨ繧ｹ繝亥女菫｡');
    
    req.session.destroy((err) => {
      if (err) {
        console.error('笶・繧ｻ繝・す繝ｧ繝ｳ蜑企勁繧ｨ繝ｩ繝ｼ:', err);
        return res.status(500).json({
          success: false,
          error: '繝ｭ繧ｰ繧｢繧ｦ繝医↓螟ｱ謨励＠縺ｾ縺励◆'
        });
      }
      
      console.log('笨・繝ｭ繧ｰ繧｢繧ｦ繝域・蜉・);
      res.json({
        success: true,
        message: '繝ｭ繧ｰ繧｢繧ｦ繝医↓謌仙粥縺励∪縺励◆'
      });
    });
  } catch (error) {
    console.error('笶・繝ｭ繧ｰ繧｢繧ｦ繝医お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
    });
  }
});

console.log('統 繝ｭ繧ｰ繧｢繧ｦ繝医お繝ｳ繝峨・繧､繝ｳ繝郁ｨｭ螳壼ｮ御ｺ・);

// 繧ｵ繝ｼ繝舌・襍ｷ蜍・
console.log('噫 繧ｵ繝ｼ繝舌・襍ｷ蜍暮幕蟋・- 繝昴・繝・', PORT);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`笨・繝・ヰ繝・げ繧ｵ繝ｼ繝舌・縺瑚ｵｷ蜍輔＠縺ｾ縺励◆: http://localhost:${PORT}`);
  console.log(`柏 繝ｭ繧ｰ繧､繝ｳ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・ http://localhost:${PORT}/api/auth/login`);
  console.log(`側 繝・せ繝医Θ繝ｼ繧ｶ繝ｼ: niina / 0077`);
  console.log(`剥 繝倥Ν繧ｹ繝√ぉ繝・け: http://localhost:${PORT}/api/health`);
});

console.log('統 繧ｵ繝ｼ繝舌・襍ｷ蜍募・逅・ｮ御ｺ・);

// 繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ
process.on('uncaughtException', (error) => {
  console.error('笶・譛ｪ謐墓拷萓句､・', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('笶・譛ｪ蜃ｦ逅・・Promise諡貞凄:', reason);
});

// 繧ｰ繝ｬ繝ｼ繧ｹ繝輔Ν繧ｷ繝｣繝・ヨ繝繧ｦ繝ｳ
process.on('SIGTERM', () => {
  console.log('尅 繧ｵ繝ｼ繝舌・繧貞●豁｢荳ｭ...');
  client.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('尅 繧ｵ繝ｼ繝舌・繧貞●豁｢荳ｭ...');
  client.end();
  process.exit(0);
});

console.log('・ｽ・ｽ 繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ險ｭ螳壼ｮ御ｺ・); 