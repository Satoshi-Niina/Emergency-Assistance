// UTF-8繧ｨ繝ｳ繧ｳ繝ｼ繝・ぅ繝ｳ繧ｰ險ｭ螳・
process.env.LANG = 'ja_JP.UTF-8';
process.env.LC_ALL = 'ja_JP.UTF-8';

import express, { Request, Response } from 'express';
import session from 'express-session';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';
import authRouter from './routes/auth.js';
import { techSupportRouter } from './routes/tech-support.js';
import { registerChatRoutes } from './routes/chat.js';
import troubleshootingRouter from './routes/troubleshooting.js';
import { registerRoutes } from './routes.js';
import { baseDataRouter } from './routes/base-data.js';
import { flowsRouter } from './routes/flows.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { historyRouter } from './routes/history.js';
import emergencyGuideRouter from './routes/emergency-guide.js';
import { usersRouter } from './routes/users.js';
import machinesRouter from './routes/machines.js';
import { registerDataProcessorRoutes } from './routes/data-processor.js';
import { usersDebugRouter } from './routes/users-debug.js';
import { debugRouter } from './routes/debug.js';
import systemCheckRouter from './routes/system-check.js';
import troubleshootingQARouter from './routes/troubleshooting-qa.js';
import configRouter from './routes/config.js';
import ingestRouter from './routes/ingest.js';
import searchRouter from './routes/search.js';
import { 
  getStorageConfig, 
  initializeStorageDirectories, 
  createStorageService, 
  StorageSyncManager,
  validateStorageConfig 
} from './lib/storage-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 笘・繧ｹ繝医Ξ繝ｼ繧ｸ險ｭ螳壹・蛻晄悄蛹・
console.log('噫 Initializing Enhanced Storage Configuration...');

const storageValidation = validateStorageConfig();
if (!storageValidation.isValid) {
  console.error('笶・Storage configuration validation failed:', storageValidation.errors);
  // Continue with warnings but not errors
}
if (storageValidation.warnings.length > 0) {
  console.warn('笞・・Storage configuration warnings:', storageValidation.warnings);
}

const { paths: storageConfig, azure: azureConfig, isProduction: isProductionEnv, isAzureEnabled } = getStorageConfig();
console.log('肌 Storage Configuration:', {
  isProduction: isProductionEnv,
  isAzureEnabled,
  knowledgeBasePath: storageConfig.knowledgeBasePath,
  autoSyncEnabled: storageConfig.enableAutoSync,
  azureContainer: azureConfig.containerName,
});

// Initialize storage directories
try {
  await initializeStorageDirectories(storageConfig);
  console.log('笨・Storage directories initialized successfully');
} catch (error: any) {
  console.error('笶・Failed to initialize storage directories:', error.message);
  // Don't exit the process, continue with degraded functionality
}

// Initialize Azure Storage service (if configured)
const azureStorageService = createStorageService();
let syncManager: StorageSyncManager | null = null;

if (azureStorageService) {
  try {
    const healthCheck = await azureStorageService.healthCheck();
    console.log('剥 Azure Storage Health Check:', healthCheck);
    
    if (healthCheck.status === 'healthy') {
      syncManager = new StorageSyncManager(azureStorageService, storageConfig);
      syncManager.start();
      console.log('笨・Azure Storage sync manager started');
    } else {
      console.warn('笞・・Azure Storage health check failed, sync disabled');
    }
  } catch (error: any) {
    console.error('笶・Azure Storage health check failed:', error.message);
  }
} else {
  console.log('邃ｹ・・Azure Storage not configured, using local storage only');
}

// 繧ｵ繝ｼ繝舌・襍ｷ蜍墓凾縺ｫ驥崎ｦ√↑繝代せ繝ｻ蟄伜惠譛臥┌繧偵Ο繧ｰ蜃ｺ蜉・
function logPathStatus(label: string, relPath: string) {
  const absPath = path.resolve(__dirname, relPath);
  const exists = fs.existsSync(absPath);
  console.log(`博 [襍ｷ蜍墓凾繝代せ遒ｺ隱江 ${label}: ${absPath} (exists: ${exists})`);
  return { absPath, exists };
}

// 蠢・ｦ√↑繝・ぅ繝ｬ繧ｯ繝医Μ繧定・蜍穂ｽ懈・
function ensureDirectoryExists(dirPath: string, label: string) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`笨・繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｽ懈・縺励∪縺励◆: ${label} (${dirPath})`);
    } catch (error) {
      console.error(`笶・繝・ぅ繝ｬ繧ｯ繝医Μ菴懈・繧ｨ繝ｩ繝ｼ: ${label}`, error);
    }
  } else {
    console.log(`笨・繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励∪縺・ ${label} (${dirPath})`);
  }
}

// 蠢・ｦ√↑繝・ぅ繝ｬ繧ｯ繝医Μ繧堤｢ｺ隱阪・菴懈・
const knowledgeBasePath = path.resolve(__dirname, '../../knowledge-base');
const imagesPath = path.join(knowledgeBasePath, 'images');
const dataPath = path.join(knowledgeBasePath, 'data');
const troubleshootingPath = path.join(knowledgeBasePath, 'troubleshooting');
const tempPath = path.join(knowledgeBasePath, 'temp');
const qaPath = path.join(knowledgeBasePath, 'qa');
const jsonPath = path.join(knowledgeBasePath, 'json');
const backupsPath = path.join(knowledgeBasePath, 'backups');

ensureDirectoryExists(knowledgeBasePath, 'knowledge-base');
ensureDirectoryExists(imagesPath, 'knowledge-base/images');
ensureDirectoryExists(dataPath, 'knowledge-base/data');
ensureDirectoryExists(troubleshootingPath, 'knowledge-base/troubleshooting');
ensureDirectoryExists(tempPath, 'knowledge-base/temp');
ensureDirectoryExists(qaPath, 'knowledge-base/qa');
ensureDirectoryExists(jsonPath, 'knowledge-base/json');
ensureDirectoryExists(backupsPath, 'knowledge-base/backups');

logPathStatus('.env', '../../.env');
logPathStatus('OpenAI API KEY', process.env.OPENAI_API_KEY ? '[SET]' : '[NOT SET]');
logPathStatus('DATABASE_URL', process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');

// 迺ｰ蠅・､画焚縺ｮ遒ｺ隱・
console.log('肌 app.ts: 迺ｰ蠅・､画焚遒ｺ隱・', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
  SESSION_SECRET: process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]',
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ? '[SET]' : '[NOT SET]',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5002'
});

const app = express();

// CORS險ｭ螳・- 繧ｻ繝・す繝ｧ繝ｳ邯ｭ謖√・縺溘ａ謾ｹ蝟・
const isProduction = process.env.NODE_ENV === 'production';
const isReplitEnvironment = process.env.REPLIT_ENVIRONMENT === 'true' || process.env.REPLIT_ID;
const isAzureEnvironment = process.env.WEBSITE_SITE_NAME || process.env.AZURE_ENVIRONMENT;

// 繝輔Ο繝ｳ繝医お繝ｳ繝蔚RL縺ｮ蜿門ｾ暦ｼ育腸蠅・､画焚縺九ｉ蜆ｪ蜈医√ョ繝輔か繝ｫ繝医・localhost:5002・・
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5002';

// 險ｱ蜿ｯ縺吶ｋ繧ｪ繝ｪ繧ｸ繝ｳ縺ｮ繝ｪ繧ｹ繝茨ｼ育腸蠅・挨・・
const getAllowedOrigins = () => {
  const baseOrigins = [
    FRONTEND_URL, // 迺ｰ蠅・､画焚縺九ｉ蜿門ｾ励＠縺溘ヵ繝ｭ繝ｳ繝医お繝ｳ繝蔚RL繧貞━蜈・
    'https://witty-river-012f39e00.1.azurestaticapps.net', // 譛ｬ逡ｪ迺ｰ蠅・・Static Web App URL
    'http://localhost:5002', 
    'http://127.0.0.1:5002',
    'http://localhost:5003',
    'http://127.0.0.1:5003',
    'http://localhost:5004',
    'http://127.0.0.1:5004',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173', // Vite髢狗匱繧ｵ繝ｼ繝舌・
    'http://127.0.0.1:5173',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ];

  // Replit迺ｰ蠅・・蝣ｴ蜷・
  if (isReplitEnvironment) {
    baseOrigins.push(
      'https://*.replit.app',
      'https://*.replit.dev'
    );
  }

  // Azure迺ｰ蠅・・蝣ｴ蜷・
  if (isAzureEnvironment) {
    baseOrigins.push(
      'https://*.azurewebsites.net',
      'https://*.azure.com',
      'https://*.azurestaticapps.net' // Azure Static Web Apps縺ｮ繧ｵ繝昴・繝郁ｿｽ蜉
    );
  }

  return baseOrigins;
};

app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // origin縺系ull縺ｮ蝣ｴ蜷茨ｼ亥酔荳繧ｪ繝ｪ繧ｸ繝ｳ繝ｪ繧ｯ繧ｨ繧ｹ繝茨ｼ峨ｂ險ｱ蜿ｯ
    if (!origin) {
      callback(null, true);
      return;
    }

    // 繝ｯ繧､繝ｫ繝峨き繝ｼ繝峨ラ繝｡繧､繝ｳ縺ｮ繝√ぉ繝・け
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace('*', '.*');
        return new RegExp(pattern).test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('圻 CORS blocked origin:', origin);
      console.log('剥 Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // 蠢・郁ｨｭ螳・- 繧ｻ繝・す繝ｧ繝ｳ邯ｭ謖√・縺溘ａ
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Origin', 
    'Accept', 
    'Cookie',
    'credentials',
    'cache-control',
    'Cache-Control',
    'pragma',
    'Pragma'
  ],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// OPTIONS繝ｪ繧ｯ繧ｨ繧ｹ繝医・譏守､ｺ逧・・逅・
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  
  // 繝ｯ繧､繝ｫ繝峨き繝ｼ繝峨ラ繝｡繧､繝ｳ縺ｮ繝√ぉ繝・け
  const isAllowed = !origin || allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace('*', '.*');
      return new RegExp(pattern).test(origin);
    }
    return allowedOrigin === origin;
  });
  
  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept, Cookie, credentials, cache-control, Cache-Control, pragma, Pragma');
  res.header('Access-Control-Allow-Credentials', 'true'); // 蠢・郁ｨｭ螳・- 繧ｻ繝・す繝ｧ繝ｳ邯ｭ謖√・縺溘ａ
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  res.status(204).end();
});

// Cookie繝代・繧ｵ繝ｼ繧定ｿｽ蜉
app.use(cookieParser());

// JSON繝代・繧ｹ - UTF-8繧ｨ繝ｳ繧ｳ繝ｼ繝・ぅ繝ｳ繧ｰ險ｭ螳・
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// UTF-8繧ｨ繝ｳ繧ｳ繝ｼ繝・ぅ繝ｳ繧ｰ縺ｮ繝ｬ繧ｹ繝昴Φ繧ｹ繝倥ャ繝繝ｼ險ｭ螳・
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// CORS繝倥ャ繝繝ｼ繧堤｢ｺ螳溘↓險ｭ螳壹☆繧九Α繝峨Ν繧ｦ繧ｧ繧｢
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  
  // 繝ｯ繧､繝ｫ繝峨き繝ｼ繝峨ラ繝｡繧､繝ｳ縺ｮ繝√ぉ繝・け
  const isAllowed = !origin || allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace('*', '.*');
      return new RegExp(pattern).test(origin);
    }
    return allowedOrigin === origin;
  });
  
  if (isAllowed && origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept, Cookie, credentials, cache-control, Cache-Control, pragma, Pragma');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  
  next();
});

// 繧ｻ繝・す繝ｧ繝ｳ險ｭ螳・- 隱崎ｨｼ邯ｭ謖√・縺溘ａ謾ｹ蝟・
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-session-secret-for-development-only',
  resave: true, // 繧ｻ繝・す繝ｧ繝ｳ繧貞ｸｸ縺ｫ菫晏ｭ・
  saveUninitialized: false,
  cookie: {
    secure: (isProduction || isReplitEnvironment || isAzureEnvironment) ? true : false, // 譏守､ｺ逧・↓boolean縺ｫ螟画鋤
    httpOnly: true,
    sameSite: (isProduction || isReplitEnvironment || isAzureEnvironment) ? 'none' as const : 'lax' as const,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7譌･髢・
    path: '/',
    domain: undefined // 譏守､ｺ逧・↓undefined縺ｫ險ｭ螳・
  },
  name: 'emergency-assistance-session', // 繧ｻ繝・す繝ｧ繝ｳ蜷阪ｒ邨ｱ荳
  rolling: true // 繧ｻ繝・す繝ｧ繝ｳ繧呈峩譁ｰ縺吶ｋ縺溘・縺ｫ譛滄剞繧貞ｻｶ髟ｷ
};

console.log('肌 繧ｻ繝・す繝ｧ繝ｳ險ｭ螳・', {
  secure: sessionConfig.cookie.secure,
  sameSite: sessionConfig.cookie.sameSite,
  isProduction,
  isReplitEnvironment,
  isAzureEnvironment
});

app.use(session(sessionConfig));

// 繧ｻ繝・す繝ｧ繝ｳ繝・ヰ繝・げ繝溘ラ繝ｫ繧ｦ繧ｧ繧｢
app.use((req, res, next) => {
  console.log('剥 Session Debug:', {
    sessionId: req.sessionID,
    userId: req.session?.userId,
    userRole: req.session?.userRole,
    cookies: req.headers.cookie,
    path: req.path,
    method: req.method,
    origin: req.headers.origin,
    host: req.headers.host,
    referer: req.headers.referer
  });
  next();
});

// 笘・隱崎ｨｼ繧医ｊ蜑・ CSP險ｭ螳壹→逕ｻ蜒城・菫｡
const KB_BASE = storageConfig.knowledgeBasePath; // 譁ｰ縺励＞險ｭ螳壹ｒ菴ｿ逕ｨ

console.log('肌 Knowledge Base Path:', KB_BASE);

// CSP險ｭ螳夲ｼ・ata:image/...繧定ｨｱ蜿ｯ・・
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline';"
  );
  next();
});

// 逕ｻ蜒上・髱咏噪驟堺ｿ｡・・nowledge-base/images・・
app.use('/api/images', express.static(path.join(KB_BASE, 'images'), {
  fallthrough: true,
  etag: true,
  maxAge: '7d',
}));

// 繧ｨ繧ｯ繧ｹ繝昴・繝・SON縺ｮ隧ｳ邏ｰ蜿門ｾ暦ｼ・nowledge-base/exports・・
app.get('/api/history/file', (req, res) => {
  const name = String(req.query.name || '');
  if (!name) return res.status(400).json({ error: 'name is required' });
  const file = path.join(KB_BASE, 'exports', name);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'not found' });
  try {
    const raw = fs.readFileSync(file, 'utf8');
    res.type('application/json').send(raw);
  } catch {
    res.status(500).json({ error: 'read error' });
  }
});

// 繝倥Ν繧ｹ繝√ぉ繝・け繝ｫ繝ｼ繝・
import { healthRouter } from './routes/health.js';
app.use('/api/health', healthRouter);

// 蝓ｺ譛ｬ繝倥Ν繧ｹ繝√ぉ繝・け・亥ｾ梧婿莠呈鋤諤ｧ縺ｮ縺溘ａ谿九☆・・
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 隱崎ｨｼ繝ｫ繝ｼ繝・
app.use('/api/auth', authRouter);
app.use('/api/tech-support', techSupportRouter);

// 繝√Ε繝・ヨ繝ｫ繝ｼ繝・
registerChatRoutes(app);

// 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝ｫ繝ｼ繝・
app.use('/api/troubleshooting', troubleshootingRouter);

// 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰQA繝ｫ繝ｼ繝・
app.use('/api/troubleshooting-qa', troubleshootingQARouter);

// 譁ｰ隕就PI繝ｫ繝ｼ繝育匳骭ｲ
app.use('/api/base-data', baseDataRouter);
app.use('/api/flows', flowsRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/history', historyRouter);
app.use('/api/emergency-guide', emergencyGuideRouter);

// 荳崎ｶｳ縺励※縺・◆繝ｫ繝ｼ繝医ｒ霑ｽ蜉
app.use('/api/users', usersRouter);
app.use('/api/machines', machinesRouter);

// 繝・ヰ繝・げ逕ｨ繝ｫ繝ｼ繝医ｒ霑ｽ蜉
app.use('/api/debug/users', usersDebugRouter);
app.use('/api/debug', debugRouter);

// RAG繧ｷ繧ｹ繝・Β逕ｨ繝ｫ繝ｼ繝医ｒ霑ｽ蜉
app.use('/api/config', configRouter);
app.use('/api/ingest', ingestRouter);
app.use('/api/search', searchRouter);

// 笘・譁ｰ縺励＞繧ｹ繝医Ξ繝ｼ繧ｸ髢｢騾｣繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
app.get('/api/storage/status', async (req, res) => {
  try {
    const status = {
      storageConfig: {
        knowledgeBasePath: storageConfig.knowledgeBasePath,
        tempPath: storageConfig.tempPath,
        uploadsPath: storageConfig.uploadsPath,
        autoSyncEnabled: storageConfig.enableAutoSync,
        syncIntervalMs: storageConfig.syncIntervalMs,
      },
      azure: {
        enabled: isAzureEnabled,
        accountName: azureConfig.accountName,
        containerName: azureConfig.containerName,
        useManagedIdentity: azureConfig.useManagedIdentity,
      },
      sync: syncManager ? syncManager.getStatus() : null,
      health: null as any,
    };

    // Azure Storage health check
    if (azureStorageService) {
      try {
        status.health = await azureStorageService.healthCheck();
      } catch (error: any) {
        status.health = {
          status: 'error',
          error: error.message,
        };
      }
    }

    res.json(status);
  } catch (error: any) {
    console.error('Storage status error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/storage/sync', async (req, res) => {
  try {
    if (!syncManager) {
      return res.status(400).json({ error: 'Sync manager not available' });
    }

    const success = await syncManager.syncNow();
    res.json({ 
      success, 
      message: success ? 'Sync completed successfully' : 'Sync failed',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Manual sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/storage/files', async (req, res) => {
  try {
    if (!azureStorageService) {
      return res.status(400).json({ error: 'Azure Storage not available' });
    }

    const prefix = String(req.query.prefix || '');
    const maxResults = parseInt(String(req.query.limit || '100'));

    const result = await azureStorageService.listBlobs(prefix, maxResults);
    res.json(result);
  } catch (error: any) {
    console.error('List files error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 繧､繝ｳ繧ｿ繝ｩ繧ｯ繝・ぅ繝冶ｨｺ譁ｭ繧ｷ繧ｹ繝・Β逕ｨ繝ｫ繝ｼ繝医ｒ霑ｽ蜉
import interactiveDiagnosisRouter from './routes/interactive-diagnosis.js';
app.use('/api/interactive-diagnosis', interactiveDiagnosisRouter);

// 繧ｷ繧ｹ繝・Β繝√ぉ繝・けAPI繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
app.get('/api/db-check', async (req, res) => {
  try {
    const { db } = await import('./db/index.js');
    const { sql } = await import('drizzle-orm');
    
    const result = await db.execute(sql`SELECT NOW() as db_time`);
    
    res.json({
      status: "OK",
      db_time: result[0].db_time
    });
  } catch (error) {
    console.error('DB謗･邯夂｢ｺ隱阪お繝ｩ繝ｼ:', error);
    res.status(500).json({
      status: "ERROR",
      message: error instanceof Error ? error.message : "繝・・繧ｿ繝吶・繧ｹ謗･邯壹お繝ｩ繝ｼ"
    });
  }
});

// DB逍朱夂｢ｺ隱咲畑縺ｮ/db-ping繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
app.get('/db-ping', async (req, res) => {
  try {
    const { db } = await import('./db/index.js');
    const { sql } = await import('drizzle-orm');
    
    const result = await db.execute(sql`SELECT NOW() as current_time, 'Database connection successful' as message`);
    
    res.json({
      status: "healthy",
      message: "Database connection successful",
      current_time: result[0].current_time,
      timestamp: new Date().toISOString(),
      database_url: process.env.DATABASE_URL ? 'configured' : 'not configured'
    });
  } catch (error) {
    console.error('DB ping 繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      status: "error",
      message: error instanceof Error ? error.message : "繝・・繧ｿ繝吶・繧ｹ謗･邯壹お繝ｩ繝ｼ",
      timestamp: new Date().toISOString(),
      database_url: process.env.DATABASE_URL ? 'configured' : 'not configured'
    });
  }
});

app.post('/api/gpt-check', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        status: "ERROR",
        message: "繝｡繝・そ繝ｼ繧ｸ縺梧欠螳壹＆繧後※縺・∪縺帙ｓ"
      });
    }

    const { processOpenAIRequest } = await import('./lib/openai.js');
    const reply = await processOpenAIRequest(message, false);
    
    res.json({
      status: "OK",
      reply: reply
    });
  } catch (error) {
    console.error('GPT謗･邯夂｢ｺ隱阪お繝ｩ繝ｼ:', error);
    res.status(500).json({
      status: "ERROR",
      message: error instanceof Error ? error.message : "GPT謗･邯壹お繝ｩ繝ｼ"
    });
  }
});

// 讖滓｢ｰ邂｡逅・PI縺ｯmachinesRouter縺ｧ蜃ｦ逅・＆繧後ｋ縺溘ａ縲∫峩謗･繝ｫ繝ｼ繝医・蜑企勁

// 繝・・繧ｿ繝励Ο繧ｻ繝・し繝ｼ繝ｫ繝ｼ繝・
registerDataProcessorRoutes(app);

// 繝｡繧､繝ｳ繝ｫ繝ｼ繝育匳骭ｲ・磯㍾隍・ｒ驕ｿ縺代ｋ縺溘ａ縲∝渕譛ｬ逧・↑繝ｫ繝ｼ繝医・縺ｿ・・
try {
  registerRoutes(app);
  console.log('笨・蜈ｨ縺ｦ縺ｮ繝ｫ繝ｼ繝医′豁｣蟶ｸ縺ｫ逋ｻ骭ｲ縺輔ｌ縺ｾ縺励◆');
} catch (error) {
  console.error('笶・繝ｫ繝ｼ繝育匳骭ｲ繧ｨ繝ｩ繝ｼ:', error);
}

// 繧ｵ繝ｼ繝舌・襍ｷ蜍募・逅・・index.ts縺ｧ邂｡逅・☆繧九◆繧√√％縺薙〒縺ｯ險ｭ螳壹・縺ｿ
console.log('笨・Express繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ縺ｮ險ｭ螳壹′螳御ｺ・＠縺ｾ縺励◆');

export default app;