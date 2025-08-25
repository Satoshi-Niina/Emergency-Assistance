
import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
import express, { type Request, Response, NextFunction } from "express";
import cors from 'cors';
import dotenv from 'dotenv';

// Emergency Assistance Development Server
// Version: 1.0.0-dev
// Last Updated: 2024-12-19

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 迺ｰ蠅・､画焚縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ險ｭ螳・
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

console.log('肌 迺ｰ蠅・､画焚隱ｭ縺ｿ霎ｼ縺ｿ髢句ｧ・', {
  NODE_ENV,
  isProduction,
  cwd: process.cwd(),
  __dirname
});

// 迺ｰ蠅・､画焚繝輔ぃ繧､繝ｫ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ・亥━蜈磯・ｽ埼・ｼ・
const envPaths = [
  // 1. 繝ｫ繝ｼ繝医ョ繧｣繝ｬ繧ｯ繝医Μ縺ｮ迺ｰ蠅・挨繝輔ぃ繧､繝ｫ
  path.resolve(process.cwd(), `.env.${NODE_ENV}.local`),
  path.resolve(process.cwd(), `.env.${NODE_ENV}`),
  // 2. 繝ｫ繝ｼ繝医ョ繧｣繝ｬ繧ｯ繝医Μ縺ｮ.env
  path.resolve(process.cwd(), '.env'),
  // 3. 繧ｵ繝ｼ繝舌・繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ迺ｰ蠅・挨繝輔ぃ繧､繝ｫ
  path.resolve(__dirname, `.env.${NODE_ENV}.local`),
  path.resolve(__dirname, `.env.${NODE_ENV}`),
  // 4. 繧ｵ繝ｼ繝舌・繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ.env
  path.resolve(__dirname, '.env'),
];

// 蜷・ヱ繧ｹ縺ｧ.env繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ縺ｿ
let loadedEnvFile = null;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (result.parsed && Object.keys(result.parsed).length > 0) {
      loadedEnvFile = envPath;
      console.log('笨・迺ｰ蠅・､画焚繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ謌仙粥:', envPath);
      console.log('統 隱ｭ縺ｿ霎ｼ縺ｾ繧後◆迺ｰ蠅・､画焚:', Object.keys(result.parsed));
      break;
    }
  } catch (error) {
    console.log('笞・・迺ｰ蠅・､画焚繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', envPath, error);
  }
}

if (!loadedEnvFile) {
  console.log('笞・・迺ｰ蠅・､画焚繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縲ゅョ繝輔か繝ｫ繝亥､繧剃ｽｿ逕ｨ縺励∪縺吶・);
  console.log('剥 隧ｦ陦後＠縺溘ヱ繧ｹ:', envPaths);
}

// 髢狗匱迺ｰ蠅・畑縺ｮ繝・ヵ繧ｩ繝ｫ繝育腸蠅・､画焚險ｭ螳・
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev-secret';
  console.log('[DEV] JWT_SECRET not set, using development default');
}

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'dev-session-secret-for-development-only';
  console.log('[DEV] SESSION_SECRET not set, using development default');
}

if (!process.env.VITE_API_BASE_URL) {
  process.env.VITE_API_BASE_URL = 'http://localhost:3001';
  console.log('[DEV] VITE_API_BASE_URL not set, using development default');
}

if (!process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL = 'http://localhost:5002';
  console.log('[DEV] FRONTEND_URL not set, using development default');
}

// 驥崎ｦ√↑迺ｰ蠅・､画焚縺ｮ遒ｺ隱・
console.log("[DEV] Development environment variables loaded:", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? "SET" : "NOT SET",
  JWT_SECRET: process.env.JWT_SECRET ? "SET" : "NOT SET",
  SESSION_SECRET: process.env.SESSION_SECRET ? "SET" : "NOT SET",
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ? "SET" : "NOT SET",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5002",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "SET" : "NOT SET",
  loadedEnvFile,
  PWD: process.cwd(),
  __dirname: __dirname
});

// OpenAI API繧ｭ繝ｼ縺ｮ遒ｺ隱・
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
  console.warn('笞・・OpenAI API繧ｭ繝ｼ縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ縲ゅヵ繝ｭ繝ｼ逕滓・讖溯・縺ｯ菴ｿ逕ｨ縺ｧ縺阪∪縺帙ｓ縲・);
  console.warn('肌 隗｣豎ｺ譁ｹ豕・ .env繝輔ぃ繧､繝ｫ縺ｫOPENAI_API_KEY繧定ｨｭ螳壹＠縺ｦ縺上□縺輔＞');
  console.warn('統 萓・ OPENAI_API_KEY=sk-your-actual-api-key-here');
} else {
  console.log('笨・OpenAI API繧ｭ繝ｼ縺瑚ｨｭ螳壹＆繧後※縺・∪縺・);
}

// DATABASE_URL縺瑚ｨｭ螳壹＆繧後※縺・↑縺・ｴ蜷医・繧ｨ繝ｩ繝ｼ縺ｧ蛛懈ｭ｢
if (!process.env.DATABASE_URL) {
  console.error('笶・閾ｴ蜻ｽ逧・お繝ｩ繝ｼ: DATABASE_URL縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ');
  console.error('肌 隗｣豎ｺ譁ｹ豕・ .env繝輔ぃ繧､繝ｫ繧剃ｽ懈・縺励．ATABASE_URL繧定ｨｭ螳壹＠縺ｦ縺上□縺輔＞');
  console.error('統 萓・ DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance');
  process.exit(1);
}

console.log("[DEV] Development server starting...");

// app.ts縺九ｉ險ｭ螳壽ｸ医∩縺ｮExpress繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ繧偵う繝ｳ繝昴・繝・
import app from './app.js';
const PORT = Number(process.env.PORT) || 3001;
const isDevelopment = process.env.NODE_ENV !== 'production';

// CORS險ｭ螳壹・app.ts縺ｧ邂｡逅・☆繧九◆繧√√％縺薙〒縺ｯ險ｭ螳壹＠縺ｪ縺・
console.log('肌 CORS險ｭ螳壹・app.ts縺ｧ邂｡逅・＆繧後∪縺・);

// app.ts縺ｧ險ｭ螳壽ｸ医∩縺ｮ縺溘ａ縲√％縺薙〒縺ｯ霑ｽ蜉險ｭ螳壹・縺ｿ陦後≧
console.log('肌 app.ts縺ｮ險ｭ螳壹ｒ菴ｿ逕ｨ縺励∪縺・);

// 髢狗匱迺ｰ蠅・畑縺ｮ繝ｪ繧ｯ繧ｨ繧ｹ繝医Ο繧ｰ・郁ｿｽ蜉・・
app.use((req, res, next) => {
  console.log('藤 [DEV] Request:', {
    method: req.method,
    url: req.url,
    path: req.path,
    origin: req.headers.origin,
    host: req.headers.host,
    timestamp: new Date().toISOString()
  });
  
  next();
});

// 繝・ヰ繝・げ逕ｨ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
app.get('/api/debug/env', (req, res) => {
  console.log('剥 繝・ヰ繝・げ繧ｨ繝ｳ繝峨・繧､繝ｳ繝亥他縺ｳ蜃ｺ縺・ /api/debug/env');
  res.json({
    success: true,
    data: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
      SESSION_SECRET: process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]',
      JWT_SECRET: process.env.JWT_SECRET ? '[SET]' : '[NOT SET]',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '[SET]' : '[NOT SET]',
      loadedEnvFile,
      timestamp: new Date().toISOString()
    }
  });
});

// 繝倥Ν繧ｹ繝√ぉ繝・け繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
app.get('/api/health', (req, res) => {
  console.log('剥 繝倥Ν繧ｹ繝√ぉ繝・け蜻ｼ縺ｳ蜃ｺ縺・ /api/health');
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'configured' : 'not configured'
  });
});

// 縺昴・莉悶・繝ｫ繝ｼ繝医・隱ｭ縺ｿ霎ｼ縺ｿ
import { registerRoutes } from './routes/index.js';
registerRoutes(app);

// 髢狗匱迺ｰ蠅・畑縺ｮ繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[DEV] Error:', err);
  
  // API繧ｨ繝ｳ繝峨・繧､繝ｳ繝医・蝣ｴ蜷医・JSON繝ｬ繧ｹ繝昴Φ繧ｹ繧定ｿ斐☆
  if (req.path.startsWith('/api/')) {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        stack: isDevelopment ? err.stack : undefined,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  } else {
    // 髱暸PI繧ｨ繝ｳ繝峨・繧､繝ｳ繝医・蝣ｴ蜷医・騾壼ｸｸ縺ｮ繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        stack: isDevelopment ? err.stack : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// 髢狗匱迺ｰ蠅・畑縺ｮ404繝上Φ繝峨Μ繝ｳ繧ｰ・・SON蠖｢蠑擾ｼ・
app.use('/api/*', (req: Request, res: Response) => {
  console.log('[DEV] API 404 Not Found:', req.originalUrl);
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// 髱暸PI繧ｨ繝ｳ繝峨・繧､繝ｳ繝医・404繝上Φ繝峨Μ繝ｳ繧ｰ
app.use('*', (req: Request, res: Response) => {
  if (!req.path.startsWith('/api/')) {
    console.log('[DEV] Non-API 404 Not Found:', req.originalUrl);
    res.status(404).json({
      error: 'Not Found',
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  }
});

// 髢狗匱迺ｰ蠅・畑縺ｮ繧ｰ繝ｬ繝ｼ繧ｹ繝輔Ν繧ｷ繝｣繝・ヨ繝繧ｦ繝ｳ
const gracefulShutdown = () => {
  console.log('[DEV] Shutting down development server...');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 髢狗匱繧ｵ繝ｼ繝舌・縺ｮ襍ｷ蜍・
app.listen(PORT, '0.0.0.0', () => {
  console.log(`噫 [DEV] Development server running on http://0.0.0.0:${PORT}`);
  console.log(`肌 [DEV] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`投 [DEV] Health check: http://localhost:${PORT}/api/health`);
  console.log(`柏 [DEV] Auth endpoint: http://localhost:${PORT}/api/auth/login`);
  console.log(`側 [DEV] Demo login: niina / 0077`);
});
