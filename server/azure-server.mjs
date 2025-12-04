// Azure App Service      
// Windows/Linux                  
// Version: 2025-11-30T10:05:00+09:00 (Deployment version tracking)
// Build: ${new Date().toISOString()}

//              
import { fileURLToPath } from 'url';
import { createRequire } from 'module'; // CommonJS require for .js files
import path from 'path';
import fs from 'fs'; //            

// __dirname     ESM     
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CommonJS require (for src/api/*.js files)
const require = createRequire(import.meta.url);

// Dynamic import for dotenv (ESM compatibility)
let dotenv;
try {
  dotenv = await import('dotenv');
} catch (err) {
  console.error('Failed to load dotenv:', err);
}

// Azure App Service environment setup
if (!process.env.WEBSITE_SITE_NAME && dotenv) {
  // Azure App Service             .env     
  // NODE_ENV       .env         
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';
  const envPath = path.join(__dirname, envFile);

  //      env            
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`  Environment file loaded: ${envFile} (${nodeEnv} mode)`);
    console.log(`  Path: ${envPath}`);
  } else {
    //        : .env       
    const fallbackPath = path.join(__dirname, '.env');
    if (fs.existsSync(fallbackPath)) {
      dotenv.config({ path: fallbackPath });
      console.log(`   Fallback to .env file (${envFile} not found)`);
    } else {
      console.warn(`   No environment file found. Using system environment variables only.`);
    }
  }
}
// Azure App Service environment setup
console.log('  Azure Server Starting (ES Module)...');
console.log('  Working directory:', process.cwd());
console.log('   __filename equivalent:', import.meta.url);
console.log('  Environment:', process.env.NODE_ENV || 'production');
console.log('  Port:', process.env.PORT || 'not set');

// Azure App Service specific environment variables
console.log('  Azure Environment Variables:');
console.log('   WEBSITE_SITE_NAME:', process.env.WEBSITE_SITE_NAME || 'not set');
console.log('   WEBSITE_RESOURCE_GROUP:', process.env.WEBSITE_RESOURCE_GROUP || 'not set');
console.log('   WEBSITE_OWNER_NAME:', process.env.WEBSITE_OWNER_NAME || 'not set');
console.log('   SCM_COMMIT_ID:', process.env.SCM_COMMIT_ID || 'not set');
console.log('   WEBSITE_HOSTNAME:', process.env.WEBSITE_HOSTNAME || 'not set');

import express from 'express';
import { join } from 'path';
import helmet from 'helmet';
import session from 'express-session';
import compression from 'compression';
import morgan from 'morgan';
import cors from 'cors';

// Azure BLOB Storage
import { BlobServiceClient } from '@azure/storage-blob';

// PostgreSQL
import pkg from 'pg';
const { Pool } = pkg;

// Password hashing
import bcrypt from 'bcryptjs';

// OpenAI
import OpenAI from 'openai';
import multer from 'multer';

// ====                =====
// Azure Static Web Apps       URL
const DEFAULT_STATIC_WEB_APP_URL = 'https://witty-river-012f39e00.1.azurestaticapps.net';

//                     
const cleanEnvValue = (value) => {
  if (!value) return null;
  return value.trim().replace(/^["']|["']$/g, '').trim();
};

const FRONTEND_URL = cleanEnvValue(
  process.env.FRONTEND_URL ||
  process.env.STATIC_WEB_APP_URL ||
  (process.env.NODE_ENV === 'production'
    ? DEFAULT_STATIC_WEB_APP_URL
    : 'http://localhost:5173')
) || 'http://localhost:5173';

const STATIC_WEB_APP_URL = cleanEnvValue(
  process.env.STATIC_WEB_APP_URL ||
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === 'production' ? DEFAULT_STATIC_WEB_APP_URL : 'http://localhost:5173')
) || 'http://localhost:5173';
const HEALTH_TOKEN = process.env.HEALTH_TOKEN || ''; //         /ready   x-health-token    
const PORT = process.env.PORT || 3000;

// ==== BLOB Storage Configuration ====
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';

// ==== OpenAI Configuration ====
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const isOpenAIAvailable = !!OPENAI_API_KEY;

// ==== Version Information ====
const VERSION = '2025-12-03T21:20:00+09:00';

// ==== Multer (file upload) configuration ====
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

//     BLOB       
console.log('  BLOB Storage Configuration:');
console.log('   AZURE_STORAGE_CONNECTION_STRING:', connectionString ? `[SET] (length: ${connectionString.length})` : '[NOT SET]');
console.log('   AZURE_STORAGE_CONTAINER_NAME:', containerName);
console.log('   AZURE_STORAGE_ACCOUNT_NAME:', process.env.AZURE_STORAGE_ACCOUNT_NAME || 'not set');
console.log('  OpenAI Configuration:');
console.log('   OPENAI_API_KEY:', isOpenAIAvailable ? '[SET]' : '[NOT SET]');

// ====        =====
// __dirname is already defined at the top
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', true);

// Azure App Service      Easy Auth       
// X-MS-CLIENT-PRINCIPAL            Easy Auth                 
app.use((req, res, next) => {
  //              Easy Auth    
  if (req.headers['x-ms-client-principal']) {
    console.error('=' .repeat(100));
    console.error('    CRITICAL: AZURE APP SERVICE EASY AUTH DETECTED    ');
    console.error('  Path:', req.path);
    console.error('  Method:', req.method);
    console.error('  X-MS-CLIENT-PRINCIPAL header is present');
    console.error('  Easy Auth            API        403 Forbidden     ');
    console.error(' ');
    console.error('      :');
    console.error('    1. Azure Portal > App Service >    >         ');
    console.error('    2.     Azure Portal > App Service >    >          /api/*    ');
    console.error(' ');
    console.error('    : AZURE_403_ERROR_FIX.md          ');
    console.error('    EASY AUTH MUST BE DISABLED OR CONFIGURED    ');
    console.error('=' .repeat(100));
  }
  
  // API                
  if (req.path.startsWith('/api/') && req.headers['x-ms-client-principal']) {
    console.error('  API       ', req.path, ' Easy Auth              ');
  }
  
  next();
});

//          
const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const storageUrl = storageAccountName
  ? `https://${storageAccountName}.blob.core.windows.net`
  : "https://*.blob.core.windows.net";

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "img-src": [
          "'self'",
          "data:",
          "blob:",
          storageUrl
        ],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "connect-src": ["'self'", storageUrl],
      },
    },
  })
);
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));

// CORS設定 - preflightリクエスト対応強化
const allowedOrigins = [
  FRONTEND_URL,
  STATIC_WEB_APP_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5002',
  'http://localhost:3000',
  'http://localhost:8080',
  'https://happy-bush-083160b00.3.azurestaticapps.net',
  'https://witty-river-012f39e00.1.azurestaticapps.net'
];

const corsOptions = {
  origin: function (origin, callback) {
    console.log('🔍 CORS Check:', {
      requestOrigin: origin,
      allowedOrigins: allowedOrigins,
      willAllow: !origin || allowedOrigins.includes(origin)
    });

    // originなし（同一オリジン）または許可リストに含まれる場合は許可
    if (!origin) {
      // 同一オリジンまたはサーバー間リクエスト
      console.log('✅ Allowing request without origin (same-origin or server-to-server)');
      callback(null, true);
    } else if (allowedOrigins.includes(origin)) {
      // 明示的に許可されたオリジン
      console.log('✅ Allowing explicitly allowed origin:', origin);
      callback(null, true);
    } else if (process.env.NODE_ENV === 'production' && origin && origin.includes('azurestaticapps.net')) {
      // 本番環境: すべての azurestaticapps.net ドメインを許可
      console.log('✅ Allowing azurestaticapps.net origin:', origin);
      callback(null, true);
    } else {
      console.warn('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma',
    'Expires',
    'If-Modified-Since',
    'X-Health-Token'
  ],
  exposedHeaders: ['Set-Cookie', 'Cache-Control', 'Content-Type'],
  maxAge: 86400, // 24時間
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// CORSミドルウェアを最初に適用（OPTIONSリクエスト処理より前）
app.use(cors(corsOptions));

// 全てのOPTIONSリクエストを処理
app.options('*', cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// BLOB                               
const getBlobServiceClient = () => {
  console.log('  getBlobServiceClient called');

  if (!connectionString || !connectionString.trim()) {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    if (accountName && accountName.trim()) {
      console.log('   AZURE_STORAGE_CONNECTION_STRING is not configured, trying Managed Identity...');
      try {
        const { DefaultAzureCredential } = require('@azure/identity');
        const credential = new DefaultAzureCredential();
        const client = new BlobServiceClient(
          `https://${accountName.trim()}.blob.core.windows.net`,
          credential
        );
        console.log('  BLOB service client initialized with Managed Identity');
        return client;
      } catch (error) {
        console.error('  Failed to initialize BLOB service client with Managed Identity:', error);
        return null;
      }
    } else {
      console.warn('   AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_ACCOUNT_NAME are not set');
      return null;
    }
  }

  try {
    const client = BlobServiceClient.fromConnectionString(connectionString.trim());
    console.log('  BLOB service client initialized successfully');
    return client;
  } catch (error) {
    console.error('  BLOB service client initialization failed:', error);
    return null;
  }
};

//          
//       BLOB                      
const BASE = (process.env.AZURE_KNOWLEDGE_BASE_PATH ?? 'knowledge-base')
  .replace(/^[\\/]+|[\\/]+$/g, '');

//     BASE       
console.log('  BLOB Base Path Configuration:');
console.log('   AZURE_KNOWLEDGE_BASE_PATH:', process.env.AZURE_KNOWLEDGE_BASE_PATH || 'not set (using default)');
console.log('   Resolved BASE:', BASE);
console.log('   Container Name:', containerName);

const KNOWLEDGE_DATA_PREFIX = BASE
  ? `${BASE}/data/`
  : 'data/';

const toPosixPath = (value) => String(value ?? '').replace(/\\/g, '/');

const sanitizeKnowledgeRelativePath = (raw) => {
  const normalized = toPosixPath(raw).trim();
  if (!normalized) {
    throw new Error('               ');
  }
  if (normalized.includes('..')) {
    throw new Error('           ');
  }
  return normalized.replace(/^\/+/, '');
};

const buildKnowledgeBlobPath = (file) =>
  toPosixPath(`${KNOWLEDGE_DATA_PREFIX}${sanitizeKnowledgeRelativePath(file)}`);

// norm  : BASE          
//  : norm('images/test.jpg') => 'knowledge-base/images/test.jpg'
const norm = (p) =>
  [BASE, String(p || '')]
    .filter(Boolean)
    .join('/')
    .replace(/\\+/g, '/')
    .replace(/\/+/g, '/');

//            
let dbPool = null; // PostgreSQL

//             PostgreSQL   
function initializeDatabase() {
  // PostgreSQL       
  const databaseUrl = process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.AZURE_POSTGRESQL_CONNECTIONSTRING;

  if (!databaseUrl) {
    console.error('  Database URL not found in any environment variable:');
    console.error('   - DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.error('   - POSTGRES_URL:', process.env.POSTGRES_URL ? 'Set' : 'Not set');
    console.error('   - AZURE_POSTGRESQL_CONNECTIONSTRING:', process.env.AZURE_POSTGRESQL_CONNECTIONSTRING ? 'Set' : 'Not set');
    console.warn('   Running without database connection');
    return false;
  }

  try {
    console.log('  Initializing database connection...');
    console.log('  Database URL source:', databaseUrl === process.env.DATABASE_URL ? 'DATABASE_URL' :
      databaseUrl === process.env.POSTGRES_URL ? 'POSTGRES_URL' : 'AZURE_POSTGRESQL_CONNECTIONSTRING');
    console.log('  Database URL length:', databaseUrl ? databaseUrl.length : 0);
    //                      
    if (databaseUrl) {
      const urlParts = databaseUrl.split('@');
      if (urlParts.length > 1) {
        console.log('  Database host:', urlParts[urlParts.length - 1].split('/')[0]);
      } else {
        console.log('  Database URL preview:', databaseUrl.substring(0, 30) + '...');
      }
    }
    console.log('  PG_SSL:', process.env.PG_SSL || 'not set');

    const sslConfig = process.env.PG_SSL === 'require'
      ? { rejectUnauthorized: false }
      : process.env.PG_SSL === 'disable'
        ? false
        : { rejectUnauthorized: false };

    dbPool = new Pool({
      connectionString: databaseUrl,
      ssl: sslConfig,
      max: 10, //        
      min: 2, //         
      idleTimeoutMillis: 30000, //           30 
      connectionTimeoutMillis: 10000, //         10 
      query_timeout: 30000, //          30 
      statement_timeout: 30000, //              30 
      keepAlive: true, // Keep-alive    
      keepAliveInitialDelayMillis: 10000, // Keep-alive    10 
      allowExitOnIdle: false, //          
    });

    console.log('  Database pool initialized for Azure production');

    //                         
    console.log('  Warming up database connection pool...');
    const warmupPromises = [];
    for (let i = 0; i < 2; i++) {
      warmupPromises.push(
        dbPool.connect()
          .then(client => {
            console.log(`  Warmup connection ${i + 1} established`);
            client.release();
          })
          .catch(err => {
            console.error(`  Warmup connection ${i + 1} failed:`, err.message);
          })
      );
    }

    Promise.all(warmupPromises)
      .then(() => console.log('  Connection pool warmup completed'))
      .catch(() => console.warn('   Some warmup connections failed'));

    //            
    dbPool.connect()
      .then(client => {
        console.log('  Database connection test successful');
        return client.query('SELECT version()');
      })
      .then(result => {
        console.log('  PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
        //         
        return dbPool.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name IN ('users', 'machines', 'machine_types', 'chat_history')
          ORDER BY table_name
        `);
      })
      .then(result => {
        const existingTables = result.rows.map(row => row.table_name);
        console.log('  Existing tables:', existingTables.join(', ') || 'None found');
        if (!existingTables.includes('users')) {
          console.warn('   users table missing - user management will fail');
        }
        if (!existingTables.includes('machines')) {
          console.warn('   machines table missing - machine management will fail');
        }
      })
      .catch(err => {
        console.error('  Database connection or table check failed:', err.message);
      });

    //                           
    setTimeout(async () => {
      try {
        const client = await dbPool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as version');
        console.log('  Database connection test successful:', result.rows[0]);

        // PostgreSQL       
        console.log('  Creating PostgreSQL tables if not exist...');
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            display_name TEXT,
            role TEXT DEFAULT 'user',
            department TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS machine_types (
            id SERIAL PRIMARY KEY,
            machine_type_name TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS machines (
            id SERIAL PRIMARY KEY,
            machine_number TEXT NOT NULL,
            machine_type_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (machine_type_id) REFERENCES machine_types(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS chat_history (
            id SERIAL PRIMARY KEY,
            title TEXT,
            machine_type TEXT,
            machine_number TEXT,
            content TEXT,
            conversation_history TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER
          );

          CREATE INDEX IF NOT EXISTS idx_chat_history_machine_type ON chat_history(machine_type);
          CREATE INDEX IF NOT EXISTS idx_chat_history_machine_number ON chat_history(machine_number);
          CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);
        `);
        console.log('  PostgreSQL tables created/verified');

        //                
        const adminCheck = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
        if (adminCheck.rows.length === 0) {
          const hashedPassword = bcrypt.hashSync('admin', 10);
          await client.query(
            'INSERT INTO users (username, password, display_name, role, department) VALUES ($1, $2, $3, $4, $5)',
            ['admin', hashedPassword, '   ', 'admin', '      ']
          );
          console.log('  Default admin user created (username: admin, password: admin)');
        }

        await client.release();
      } catch (err) {
        console.warn('   Database connection test failed:', err.message);
        console.warn('   Server will continue running without database features');
        // DB               
      }
    }, 1000);

    return true;
  } catch (error) {
    console.error('  Database initialization failed:', error);
    return false;
  }
}

// PostgreSQL             
async function dbQuery(sql, params = [], retries = 3) {
  if (dbPool) {
    // PostgreSQL:                   
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      let client;
      try {
        //              
        const connectPromise = dbPool.connect();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        );

        client = await Promise.race([connectPromise, timeoutPromise]);

        //      
        const result = await client.query(sql, params);
        return result;
      } catch (error) {
        lastError = error;
        console.error(`  Database query attempt ${attempt}/${retries} failed:`, error.message);

        //              
        if (attempt < retries && (error.message.includes('timeout') || error.message.includes('connect'))) {
          console.log(`  Retrying in ${attempt * 500}ms...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
          continue;
        }
        throw error;
      } finally {
        if (client) {
          try {
            client.release();
          } catch (releaseError) {
            console.error('  Error releasing client:', releaseError.message);
          }
        }
      }
    }
    throw lastError;
  } else {
    throw new Error('No database connection available');
  }
}

//             
// initializeDatabase(); // startupSequence内で呼び出すように変更

//                     
async function startupSequence() {
  try {
    console.log('  Starting Azure application startup sequence...');

    // データベース初期化をここで実行し、エラーをキャッチできるようにする
    console.log('  Initializing database...');
    try {
      const dbInitResult = initializeDatabase();
      if (dbInitResult === false) {
        console.warn('  Database initialization returned false - may not be configured');
      } else {
        console.log('  Database initialization started (background)');
      }
    } catch (dbError) {
      console.error('  CRITICAL: Database initialization failed:', dbError);
      console.error('  Error stack:', dbError.stack);
      // DBエラーでもサーバーは起動を継続する
    }

    // BLOB           (タイムアウト付き)
    const blobClient = getBlobServiceClient();
    if (blobClient) {
      console.log('  Verifying BLOB container accessibility...');
      try {
        const containerClient = blobClient.getContainerClient(containerName);
        
        // タイムアウト付きでBLOBチェック
        const blobCheckPromise = containerClient.exists();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('BLOB check timeout')), 5000)
        );
        
        const exists = await Promise.race([blobCheckPromise, timeoutPromise]);

        if (!exists) {
          console.log(`   Container '${containerName}' does not exist. Creating...`);
          await containerClient.create({
            access: 'blob'
          });
          console.log(`  Container '${containerName}' created successfully`);
        } else {
          console.log(`  Container '${containerName}' exists`);
        }

        //        (タイムアウトなし - オプショナル)
        try {
          const properties = await containerClient.getProperties();
          console.log(`  Container properties:`, {
            lastModified: properties.lastModified,
            publicAccess: properties.blobPublicAccess || 'none'
          });
        } catch (propError) {
          console.warn('  Could not get container properties:', propError.message);
        }

      } catch (blobError) {
        console.error('  BLOB container verification failed:', blobError.message);
        console.warn('  Continuing without BLOB storage verification');
        // BLOB                               
        //            
      }
    } else {
      console.warn('  BLOB client not initialized - skipping verification');
    }

    // FIXME: Temporarily disable migrations to isolate EISDIR
    //                  
    //                      
    console.log('  Skipping database migrations (EISDIR debug)...');
    try {
      // await runMigrations();
      console.log('  Database migrations skipped (EISDIR debug)');

      //                 (タイムアウト付き)
      if (dbPool) {
        try {
          const connectPromise = dbPool.connect();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database connect timeout')), 5000)
          );
          
          const client = await Promise.race([connectPromise, timeoutPromise]);
          const tablesResult = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('users', 'machine_types', 'machines')
            ORDER BY table_name
          `);
          await client.release();

          console.log('  Database tables after migration:', tablesResult.rows.map(r => r.table_name));

          if (tablesResult.rows.length === 0) {
            console.warn('   No required tables found after migration');
            console.warn('   Manual database setup may be required');
          }
        } catch (dbCheckError) {
          console.warn('  Database table check failed:', dbCheckError.message);
          console.warn('  Continuing without database verification');
        }
      }
    } catch (migrationError) {
      console.warn('   Database migration failed:', migrationError.message);
      console.warn('   Manual execution of EMERGENCY_DATABASE_SETUP.sql may be required');
    }

    console.log('  Azure startup sequence completed successfully');
    console.log('  Production server is ready for operation');
  } catch (error) {
    console.error('  Azure startup sequence failed:', error);
    console.warn('   Server will continue running, but some features may not work properly');
    console.warn('   Please check database and BLOB storage connections');
    //            
  }
}

//                    
// startupSequence()はapp.listen()の後に実行する(サーバー起動をブロックしないため)
// → app.listen()のコールバック内で呼び出す

//            CORS      
const isAzureHosted = !!process.env.WEBSITE_SITE_NAME;
const isProductionEnv = (process.env.NODE_ENV || '').toLowerCase() === 'production';
const sessionCookieSecure = process.env.SESSION_COOKIE_SECURE
  ? process.env.SESSION_COOKIE_SECURE.toLowerCase() === 'true'
  : (isAzureHosted || isProductionEnv);
const sessionCookieSameSite = process.env.SESSION_COOKIE_SAMESITE
  ? process.env.SESSION_COOKIE_SAMESITE.toLowerCase()
  : (sessionCookieSecure ? 'none' : 'lax');
const sessionCookieHttpOnly = process.env.SESSION_COOKIE_HTTPONLY
  ? process.env.SESSION_COOKIE_HTTPONLY.toLowerCase() === 'true'
  : false;
const sessionCookieDomain = cleanEnvValue(process.env.SESSION_COOKIE_DOMAIN) || undefined;

console.log('  Session cookie settings:', {
  secure: sessionCookieSecure,
  sameSite: sessionCookieSameSite,
  httpOnly: sessionCookieHttpOnly,
  domain: sessionCookieDomain || 'auto'
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'azure-production-session-secret-32-chars-fixed',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: sessionCookieSecure,
    httpOnly: sessionCookieHttpOnly,
    maxAge: 24 * 60 * 60 * 1000, // 24  
    sameSite: sessionCookieSameSite,
    domain: sessionCookieDomain,
    path: '/' //          
  },
  name: 'emergency.session', //          
  proxy: true, // Azure App Service            
  rolling: false //            
}));

//                                    
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log('[Session Debug]', {
      path: req.path,
      method: req.method,
      sessionID: req.sessionID,
      hasSession: !!req.session,
      hasUser: !!req.session?.user,
      userId: req.session?.user?.id,
      userRole: req.session?.user?.role,
      cookies: req.headers.cookie ? 'present' : 'missing',
      cookieHeader: req.headers.cookie?.substring(0, 100) + '...',
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
  }
  next();
});

// =====            =====
// BLOB          API
const ok = (_req, res) => res.status(200).send('ok');

// liveness      200
app.get('/live', ok);

// readiness                       
app.get('/ready', (req, res) => {
  if (HEALTH_TOKEN && req.headers['x-health-token'] !== HEALTH_TOKEN) {
    return res.status(401).json({ status: 'unauthorized' });
  }
  const essentials = ['NODE_ENV']; //   ENV     
  const missing = essentials.filter(k => !process.env[k]);
  const ready = missing.length === 0;
  res.status(200).json({
    status: ready ? 'ok' : 'degraded',
    missing,
    timestamp: new Date().toISOString()
  });
});

//            200 
app.get('/ping', ok);
app.get('/api/ping', ok);
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok' }));

//                               
// Health check endpoint with timeout protection (   )
app.get('/api/health/detailed', (req, res) => {
  // Set response timeout to prevent hanging
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({
        status: 'timeout',
        message: 'Health check timed out',
        timestamp: new Date().toISOString()
      });
    }
  }, 10000); // 10 second timeout

  res.on('finish', () => clearTimeout(timeout));

  // Immediate health response for Azure App Service
  const healthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    version: VERSION,
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    },
    node_version: process.version,
    platform: process.platform,
    pid: process.pid
  };

  // Quick database status check (non-blocking)
  if (dbPool) {
    healthResponse.database_status = 'pool_available';
  } else {
    healthResponse.database_status = 'not_initialized';
  }

  // Database environment variables check (for debugging)
  healthResponse.database_env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    AZURE_POSTGRESQL_CONNECTIONSTRING: !!process.env.AZURE_POSTGRESQL_CONNECTIONSTRING,
    PG_SSL: process.env.PG_SSL || 'not_set'
  };

  // Quick blob storage status
  if (connectionString) {
    healthResponse.blob_storage_status = 'configured';
  } else {
    healthResponse.blob_storage_status = 'not_configured';
  }

  res.status(200).json(healthResponse);
});

//                            
app.get('/api/version', (req, res) => {
  // deployment-info.jsonを読み込んで正確なデプロイ情報を返す
  let deploymentInfo = {};
  try {
    const fs = require('fs');
    const path = require('path');
    const deployInfoPath = path.join(__dirname, 'deployment-info.json');
    if (fs.existsSync(deployInfoPath)) {
      deploymentInfo = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));
    }
  } catch (error) {
    console.warn('Could not read deployment-info.json:', error.message);
  }

  const buildInfo = {
    version: VERSION,
    currentTime: new Date().toISOString(),
    deployment: {
      commit_sha: deploymentInfo.commit_sha || process.env.SCM_COMMIT_ID || 'unknown',
      commit_time: deploymentInfo.commit_time || 'unknown',
      build_time: deploymentInfo.build_time || 'unknown',
      workflow_run: deploymentInfo.workflow_run || 'unknown',
      deployed_by: deploymentInfo.deployed_by || 'unknown'
    },
    azure: {
      instanceId: process.env.WEBSITE_INSTANCE_ID || 'unknown',
      hostname: process.env.WEBSITE_HOSTNAME || 'unknown',
      siteName: process.env.WEBSITE_SITE_NAME || 'unknown'
    },
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime()
    },
    environment: process.env.NODE_ENV || 'production',
    features: {
      blobStorage: !!connectionString,
      database: !!dbPool,
      openai: !!OPENAI_API_KEY
    }
  };

  res.json(buildInfo);
});

// Serve deployment-info.json for verification
app.get('/deployment-info.json', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const deployInfoPath = path.join(__dirname, 'deployment-info.json');
  
  if (fs.existsSync(deployInfoPath)) {
    res.sendFile(deployInfoPath);
  } else {
    res.status(404).json({
      error: 'Deployment info not available',
      message: 'This file is created during CI/CD deployment'
    });
  }
});

// Full database testing health check (        )
app.get('/api/health/full', async (req, res) => {
  let dbStatus = 'not_initialized';
  let dbTestResult = null;

  if (dbPool) {
    try {
      const client = await dbPool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      await client.release();
      dbStatus = 'connected';
      dbTestResult = result.rows[0];
    } catch (error) {
      dbStatus = 'error';
      dbTestResult = error.message;
    }
  }

  let blobStatus = 'not_configured';
  let blobTestResult = null;

  if (connectionString) {
    try {
      const blobServiceClient = getBlobServiceClient();
      if (blobServiceClient) {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const exists = await containerClient.exists();
        blobStatus = exists ? 'connected' : 'container_not_found';
        blobTestResult = { containerExists: exists };
      }
    } catch (error) {
      blobStatus = 'error';
      blobTestResult = error.message;
    }
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'azure-production',
    version: VERSION,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database_status: {
      status: dbStatus,
      pool_initialized: !!dbPool,
      test_result: dbTestResult
    },
    blob_storage_status: {
      status: blobStatus,
      connectionString: connectionString ? 'Configured' : 'Not configured',
      containerName: containerName,
      test_result: blobTestResult
    },
    openai_status: {
      apiKey: OPENAI_API_KEY ? 'Configured' : 'Not configured',
      isAvailable: isOpenAIAvailable
    },
    session_status: {
      secret: process.env.SESSION_SECRET ? 'Configured' : 'Using fallback',
      cookie_secure: false,
      cookie_sameSite: 'lax'
    }
  });
});

// BLOB                 
app.get('/api/_diag/blob-test', async (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    connectionString: {
      configured: !!connectionString,
      length: connectionString ? connectionString.length : 0,
      valid: false
    },
    containerName: containerName,
    client: {
      initialized: false,
      error: null
    },
    container: {
      exists: false,
      canCreate: false,
      error: null
    },
    permissions: {
      canRead: false,
      canWrite: false,
      error: null
    }
  };

  try {
    // 1. BLOB             
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      diagnostics.client.error = 'BLOB service client is null';
      return res.status(503).json({
        success: false,
        message: 'BLOB                      ',
        diagnostics
      });
    }

    diagnostics.client.initialized = true;
    diagnostics.connectionString.valid = true;

    // 2.         
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const containerExists = await containerClient.exists();
    diagnostics.container.exists = containerExists;

    // 3.                   
    if (!containerExists) {
      try {
        await containerClient.create({ access: 'blob' });
        diagnostics.container.canCreate = true;
        diagnostics.container.exists = true;
        console.log(`  Diagnostic: Container '${containerName}' created`);
      } catch (createError) {
        diagnostics.container.error = createError.message;
        diagnostics.container.canCreate = false;
      }
    } else {
      diagnostics.container.canCreate = true; //       
    }

    // 4.        
    if (diagnostics.container.exists) {
      try {
        const testBlobName = `_diagnostic/test-${Date.now()}.txt`;
        const testContent = 'BLOB storage write test';
        const blockBlobClient = containerClient.getBlockBlobClient(testBlobName);

        await blockBlobClient.upload(testContent, testContent.length, {
          blobHTTPHeaders: { blobContentType: 'text/plain' }
        });

        diagnostics.permissions.canWrite = true;
        console.log(`  Diagnostic: Write test successful`);

        // 5.        
        try {
          const downloadResponse = await blockBlobClient.download();
          const chunks = [];
          for await (const chunk of downloadResponse.readableStreamBody) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const downloadedContent = Buffer.concat(chunks).toString('utf-8');

          if (downloadedContent === testContent) {
            diagnostics.permissions.canRead = true;
            console.log(`  Diagnostic: Read test successful`);
          }

          //           
          await blockBlobClient.delete();
          console.log(`  Diagnostic: Test file deleted`);
        } catch (readError) {
          diagnostics.permissions.error = `Read failed: ${readError.message}`;
        }
      } catch (writeError) {
        diagnostics.permissions.error = `Write failed: ${writeError.message}`;
      }
    }

    //        
    const allTestsPassed =
      diagnostics.client.initialized &&
      diagnostics.container.exists &&
      diagnostics.permissions.canRead &&
      diagnostics.permissions.canWrite;

    res.status(allTestsPassed ? 200 : 500).json({
      success: allTestsPassed,
      message: allTestsPassed
        ? 'BLOB                '
        : 'BLOB             ',
      diagnostics
    });

  } catch (error) {
    diagnostics.client.error = error.message;
    res.status(500).json({
      success: false,
      message: 'BLOB              ',
      error: error.message,
      diagnostics
    });
  }
});


//          
app.get('/api/_diag/env', (req, res) => {
  res.json({
    success: true,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    environment: 'azure-production',
    env: {
      NODE_ENV: process.env.NODE_ENV || 'not_set',
      PORT: process.env.PORT || 'not_set',
      DATABASE_URL: process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set',
      PG_SSL: process.env.PG_SSL || 'not_set',
      JWT_SECRET: process.env.JWT_SECRET ? 'Set (hidden)' : 'Not set',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'Set (hidden)' : 'Not set',
      FRONTEND_URL: process.env.FRONTEND_URL || 'not_set',
      AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'Set (hidden)' : 'Not set',
      AZURE_STORAGE_CONTAINER_NAME: process.env.AZURE_STORAGE_CONTAINER_NAME || 'not_set',
      BYPASS_DB_FOR_LOGIN: process.env.BYPASS_DB_FOR_LOGIN || 'not_set',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set (hidden)' : 'Not set',
      SAFE_MODE: process.env.SAFE_MODE || 'not_set',
      WEBSITE_SITE_NAME: process.env.WEBSITE_SITE_NAME || 'unknown',
      WEBSITE_RESOURCE_GROUP: process.env.WEBSITE_RESOURCE_GROUP || 'unknown'
    },
    database_pool_status: {
      initialized: !!dbPool,
      totalCount: dbPool ? dbPool.totalCount : 0,
      idleCount: dbPool ? dbPool.idleCount : 0,
      waitingCount: dbPool ? dbPool.waitingCount : 0
    },
    message: '            ',
    timestamp: new Date().toISOString()
  });
});

//                      
const normalizeUserRole = (rawRole) => {
  if (!rawRole) return 'employee';
  const normalized = String(rawRole).trim().toLowerCase();
  if (normalized === 'admin') return 'admin';
  if (normalized === 'employee') return 'employee';
  if (normalized === 'user') return 'employee';
  return 'employee';
};

//                   - Direct implementation (no external handler)
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('[auth/login] Login attempt:', { username: req.body?.username });

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'ユーザー名とパスワードが必要です'
      });
    }

    // データベースからユーザーを検索
    if (!dbPool) {
      return res.status(500).json({
        success: false,
        error: 'データベースが初期化されていません'
      });
    }

    const result = await dbPool.query(
      'SELECT id, username, display_name, password, role, department FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      console.log('[auth/login] User not found:', username);
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが間違っています'
      });
    }

    const user = result.rows[0];

    // パスワード検証
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('[auth/login] Password validation failed:', username);
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが間違っています'
      });
    }

    console.log('[auth/login] Password validation passed:', username);

    // セッションにユーザー情報を保存
    req.session.user = {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: normalizeUserRole(user.role),
      department: user.department
    };

    console.log('[auth/login] Session updated:', {
      sessionId: req.sessionID,
      userId: req.session.user.id,
      username: req.session.user.username,
      role: req.session.user.role
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: normalizeUserRole(user.role),
        department: user.department
      },
      message: 'ログインに成功しました',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[auth/login] Error:', error);
    res.status(500).json({
      success: false,
      error: 'ログイン処理に失敗しました',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// =====  29  API               =====

// 1.                 
app.get('/api/auth/handshake', (req, res) => {
  res.json({
    ok: true,
    mode: 'session',
    env: 'azure-production',
    timestamp: new Date().toISOString(),
    sessionId: req.sessionID
  });
});

// 2.                   
//                        
app.get('/api/auth/me', (req, res) => {
  console.log('[api/auth/me]        :', {
    sessionId: req.sessionID,
    hasSession: !!req.session,
    hasUser: !!req.session.user,
    userRole: req.session.user?.role,
    cookies: req.headers.cookie ? 'present' : 'missing',
    cookieHeader: req.headers.cookie?.substring(0, 100),
    origin: req.headers.origin,
    referer: req.headers.referer,
    timestamp: new Date().toISOString()
  });

  //     Cookie            
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').map(c => c.trim());
    console.log('[api/auth/me] Received cookies:', cookies);
    console.log('[api/auth/me] Session cookie name:', 'emergency.session');
    const sessionCookie = cookies.find(c => c.startsWith('emergency.session='));
    console.log('[api/auth/me] Session cookie found:', !!sessionCookie);
  } else {
    console.warn('[api/auth/me] No cookies received in request');
  }

  if (req.session.user) {
    const normalizedRole = normalizeUserRole(req.session.user.role);
    const normalizedUser = {
      ...req.session.user,
      role: normalizedRole
    };
    req.session.user = normalizedUser;
    req.session.userRole = normalizedRole;

    console.log('[api/auth/me] User authenticated:', {
      userId: normalizedUser.id,
      username: normalizedUser.username,
      role: normalizedRole
    });

    res.json({
      success: true,
      user: normalizedUser,
      message: '                    ',
      debug: {
        sessionId: req.sessionID,
        userRole: normalizedRole,
        timestamp: new Date().toISOString()
      }
    });
  } else {
    console.warn('[api/auth/me] No user in session:', {
      sessionId: req.sessionID,
      hasSession: !!req.session,
      sessionKeys: req.session ? Object.keys(req.session) : []
    });

    res.status(401).json({
      success: false,
      message: '          ',
      debug: {
        sessionId: req.sessionID,
        hasSession: !!req.session,
        hasCookie: !!req.headers.cookie,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 3.                 
app.get('/api/auth/check-admin', (req, res) => {
  if (req.session.user && normalizeUserRole(req.session.user.role) === 'admin') {
    res.json({
      success: true,
      message: '             ',
      user: req.session.user
    });
  } else {
    res.status(403).json({
      success: false,
      message: '           '
    });
  }
});

// 4.                    
app.get('/api/auth/check-employee', (req, res) => {
  if (req.session.user && normalizeUserRole(req.session.user.role) === 'employee') {
    res.json({
      success: true,
      message: '             ',
      user: req.session.user
    });
  } else {
    res.status(403).json({
      success: false,
      message: '           '
    });
  }
});

// 5.             
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({
        success: false,
        message: '            '
      });
    }
    res.json({
      success: true,
      message: '         '
    });
  });
});

// 6. Ping endpoint     -    /api/ping         
app.get('/api/ping/detailed', (req, res) => {
  res.json({
    ping: 'pong',
    timestamp: new Date().toISOString(),
    service: 'Emergency Assistance Backend (Azure)'
  });
});

// 7. Storage endpoints
//     API      API             

// 14.            API BLOB          
app.get('/api/troubleshooting/list', async (req, res) => {
  try {
    console.log('[api/troubleshooting/list]                     ');

    if (!connectionString) {
      return res.json({
        success: true,
        data: [],
        message: 'Azure Storage not configured',
        timestamp: new Date().toISOString()
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.json({
        success: true,
        data: [],
        message: 'Blob service client unavailable',
        timestamp: new Date().toISOString()
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const listOptions = {
      prefix: norm('troubleshooting/')
    };

    const troubleshootingList = [];
    for await (const blob of containerClient.listBlobsFlat(listOptions)) {
      if (blob.name.endsWith('.json')) {
        try {
          const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
          const downloadResponse = await blockBlobClient.download();

          if (downloadResponse.readableStreamBody) {
            const chunks = [];
            for await (const chunk of downloadResponse.readableStreamBody) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const content = Buffer.concat(chunks).toString('utf-8');
            const cleanContent = content.replace(/^\uFEFF/, '');
            const jsonData = JSON.parse(cleanContent);

            troubleshootingList.push({
              id: jsonData.id || blob.name.split('/').pop().replace('.json', ''),
              title: jsonData.title || '',
              description: jsonData.description || '',
              blobName: blob.name
            });
          }
        } catch (error) {
          console.error(`[api/troubleshooting/list]            : ${blob.name}`, error);
        }
      }
    }

    console.log(`[api/troubleshooting/list]     : ${troubleshootingList.length} `);
    res.json({
      success: true,
      data: troubleshootingList,
      message: `                    : ${troubleshootingList.length} `,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/troubleshooting/list]    :', error);
    res.status(500).json({
      success: false,
      data: [],
      message: '                       ',
      error: error.message
    });
  }
});

// 15.                    API BLOB          
app.get('/api/troubleshooting/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[api/troubleshooting/:id]              : ${id}`);

    if (!connectionString) {
      return res.status(404).json({
        success: false,
        message: 'Azure Storage not configured'
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(404).json({
        success: false,
        message: 'Blob service client unavailable'
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`troubleshooting/${id}.json`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const exists = await blockBlobClient.exists();
    if (!exists) {
      console.warn(`[api/troubleshooting/:id]             : ${blobName}`);
      return res.status(404).json({
        success: false,
        message: `                       : ${id}`
      });
    }

    const downloadResponse = await blockBlobClient.download();
    if (downloadResponse.readableStreamBody) {
      const chunks = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const content = Buffer.concat(chunks).toString('utf-8');
      const cleanContent = content.replace(/^\uFEFF/, '');
      const jsonData = JSON.parse(cleanContent);

      console.log(`[api/troubleshooting/:id]     : ${id}`);
      res.json({
        success: true,
        data: jsonData,
        message: `                      : ${id}`
      });
    } else {
      throw new Error('                   ');
    }
  } catch (error) {
    console.error(`[api/troubleshooting/:id]    :`, error);
    res.status(500).json({
      success: false,
      message: '                         ',
      error: error.message
    });
  }
});

// 16.              API BLOB         
app.post('/api/troubleshooting', async (req, res) => {
  try {
    const flowData = req.body;
    console.log('[api/troubleshooting POST]                   :', flowData.id || 'new');

    if (!connectionString) {
      return res.status(503).json({
        success: false,
        message: 'Azure Storage not configured - cannot save to BLOB'
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        message: 'Blob service client unavailable'
      });
    }

    // ID        
    if (!flowData.id) {
      flowData.id = `flow_${Date.now()}`;
    }

    //          
    if (!flowData.createdAt) {
      flowData.createdAt = new Date().toISOString();
    }
    flowData.updatedAt = new Date().toISOString();

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`troubleshooting/${flowData.id}.json`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // JSON      
    const jsonContent = JSON.stringify(flowData, null, 2);
    const buffer = Buffer.from(jsonContent, 'utf-8');

    // BLOB       
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: 'application/json'
      }
    });

    console.log(`[api/troubleshooting POST]     : ${flowData.id}`);
    res.json({
      success: true,
      data: flowData,
      message: `                  : ${flowData.id}`
    });
  } catch (error) {
    console.error('[api/troubleshooting POST]    :', error);
    res.status(500).json({
      success: false,
      message: '                     ',
      error: error.message
    });
  }
});

// 17.              API BLOB         
app.put('/api/troubleshooting/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const flowData = req.body;
    console.log(`[api/troubleshooting PUT]                   : ${id}`);

    if (!connectionString) {
      return res.status(503).json({
        success: false,
        message: 'Azure Storage not configured - cannot save to BLOB'
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        message: 'Blob service client unavailable'
      });
    }

    // ID   
    flowData.id = id;
    flowData.updatedAt = new Date().toISOString();

    //        
    if (!flowData.updateHistory) {
      flowData.updateHistory = [];
    }
    flowData.updateHistory.push({
      timestamp: new Date().toISOString(),
      updatedFields: Object.keys(flowData),
      updatedBy: 'user'
    });

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`troubleshooting/${id}.json`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // JSON      
    const jsonContent = JSON.stringify(flowData, null, 2);
    const buffer = Buffer.from(jsonContent, 'utf-8');

    // BLOB            
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: 'application/json'
      }
    });

    console.log(`[api/troubleshooting PUT]     : ${id}`);
    res.json({
      success: true,
      data: flowData,
      message: `                  : ${id}`
    });
  } catch (error) {
    console.error(`[api/troubleshooting PUT]    :`, error);
    res.status(500).json({
      success: false,
      message: '                     ',
      error: error.message
    });
  }
});

// 18.              API BLOB          
app.delete('/api/troubleshooting/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[api/troubleshooting DELETE]                   : ${id}`);

    if (!connectionString) {
      return res.status(503).json({
        success: false,
        message: 'Azure Storage not configured'
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        message: 'Blob service client unavailable'
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`troubleshooting/${id}.json`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    //     
    const exists = await blockBlobClient.exists();
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: `                   : ${id}`
      });
    }

    //     
    await blockBlobClient.delete();

    console.log(`[api/troubleshooting DELETE]     : ${id}`);
    res.json({
      success: true,
      message: `                  : ${id}`
    });
  } catch (error) {
    console.error(`[api/troubleshooting DELETE]    :`, error);
    res.status(500).json({
      success: false,
      message: '                     ',
      error: error.message
    });
  }
});

// ==== /api/history/*            /:id      ====

// 16.   API            
app.get('/api/history/machine-data', async (req, res) => {
  try {
    console.log('[api/history]                  ');

    if (!dbPool) {
      return res.json({
        success: true,
        machineTypes: [],
        machines: [],
        message: '                  ',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(`
      SELECT
        mt.id as machine_type_id,
        mt.machine_type_name,
        m.id as machine_id,
        m.machine_number
      FROM machine_types mt
      LEFT JOIN machines m ON mt.id = m.machine_type_id
      ORDER BY mt.machine_type_name, m.machine_number
    `);
    await client.release();

    //       
    const machineTypes = [];
    const machines = [];
    const typeMap = new Map();

    result.rows.forEach(row => {
      if (!typeMap.has(row.machine_type_id)) {
        const typeData = {
          id: row.machine_type_id,
          machineTypeName: row.machine_type_name
        };
        machineTypes.push(typeData);
        typeMap.set(row.machine_type_id, typeData);
      }

      if (row.machine_id) {
        machines.push({
          id: row.machine_id,
          machineTypeId: row.machine_type_id,
          machineNumber: row.machine_number
        });
      }
    });

    res.json({
      success: true,
      data: {
        machineTypes,
        machines
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/history]                :', error);
    res.status(500).json({
      success: false,
      error: '                    ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//             API - Azure Functions        
let historyHandler = null;
try {
  historyHandler = require('./src/api/history/index.js');
  console.log('  historyHandler loaded successfully');
} catch (error) {
  console.error('  Failed to load historyHandler:', error.message);
  console.error('  Stack:', error.stack);
}

app.get('/api/history/export-files', async (req, res) => {
  if (!historyHandler) {
    return res.status(503).json({
      success: false,
      error: 'History handler not available',
      message: 'The history module could not be loaded'
    });
  }
  
  try {
    const context = {
      log: (...args) => console.log('[api/history]', ...args),
      error: (...args) => console.error('[api/history ERROR]', ...args)
    };

    const request = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      params: { action: 'export-files' },
      query: req.query
    };

    const result = await historyHandler(context, request);
    
    res.status(result.status);
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }
    
    if (result.body) {
      const bodyData = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
      res.json(bodyData);
    } else {
      res.end();
    }
  } catch (error) {
    console.error('[api/history/export-files] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// ====       API /:id -        ====
//       API BLOB        -        
app.get('/api/history/:id', async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`               : ${id}`);

    // BLOB                    
    const blobServiceClient = getBlobServiceClient();
    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const prefix = norm('exports/');

        console.log(`  BLOB         : prefix=${prefix}, id=${id}`);

        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
          if (!blob.name.endsWith('.json') || blob.name.includes('.backup.')) continue;

          const fileName = blob.name.split('/').pop();
          const fileNameWithoutExt = fileName.replace('.json', '');
          const uuidMatch = fileNameWithoutExt.match(/_([a-f0-9-]{36})_/);
          const fileId = uuidMatch ? uuidMatch[1] : fileNameWithoutExt;

          if (fileId === id || fileNameWithoutExt === id || fileName.includes(id)) {
            console.log(`  BLOB        : ${blob.name}`);

            const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
            const downloadResponse = await blockBlobClient.download();

            const chunks = [];
            for await (const chunk of downloadResponse.readableStreamBody) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const content = Buffer.concat(chunks).toString('utf-8').replace(/^\uFEFF/, '');
            const foundData = JSON.parse(content);
            const foundFile = fileName;

            //         
            const savedImages = foundData.savedImages || foundData.images || [];
            console.log('            :', {
              id,
              fileName: foundFile,
              savedImagesLength: savedImages.length
            });

            const convertedItem = {
              id: id,
              type: 'fault_history',
              fileName: foundFile,
              chatId: foundData.chatId || id,
              userId: foundData.userId || '',
              exportType: foundData.exportType || 'blob_stored',
              exportTimestamp: foundData.createdAt || new Date().toISOString(),
              messageCount: foundData.metadata?.total_messages || 0,
              machineType: foundData.machineType || '',
              machineNumber: foundData.machineNumber || '',
              machineInfo: {
                selectedMachineType: '',
                selectedMachineNumber: '',
                machineTypeName: foundData.machineType || '',
                machineNumber: foundData.machineNumber || '',
              },
              title: foundData.title || '',
              incidentTitle: foundData.title || '',
              problemDescription: foundData.problemDescription || foundData.description || '',
              extractedComponents: foundData.extractedComponents || [],
              extractedSymptoms: foundData.extractedSymptoms || [],
              possibleModels: foundData.possibleModels || [],
              conversationHistory: foundData.conversationHistory || foundData.conversation_history || [],
              metadata: foundData.metadata || {},
              savedImages: savedImages,
              images: savedImages,
              fileSize: Buffer.byteLength(content),
              lastModified: foundData.lastModified || foundData.updateHistory?.[0]?.timestamp || foundData.createdAt,
              createdAt: foundData.createdAt,
              jsonData: {
                ...foundData,
                savedImages: savedImages,
              },
              source: 'blob_storage'
            };

            console.log(`            (BLOB): ${id}`);
            return res.json(convertedItem);
          }
        }

        console.log(`  BLOB           : ${id}`);
      } catch (blobError) {
        console.error('  BLOB        :', blobError);
      }
    }

    //           
    console.log(`                   : ${id}`);
    res.status(404).json({
      success: false,
      error: '                  ',
    });
  } catch (error) {
    console.error('           :', error);
    res.status(500).json({
      success: false,
      error: '            ',
      details: error.message
    });
  }
});

// NOTE: /api/history/machine-data  1178             

//       API - Azure Functions        
let usersHandler = null;
try {
  usersHandler = require('./src/api/users/index.js');
  console.log('  usersHandler loaded successfully');
} catch (error) {
  console.error('  Failed to load usersHandler:', error.message);
  console.error('  Stack:', error.stack);
}

app.get('/api/users', async (req, res) => {
  if (!usersHandler) {
    return res.status(503).json({
      success: false,
      error: 'Users handler not available',
      message: 'The users module could not be loaded'
    });
  }
  
  try {
    const context = {
      log: (...args) => console.log('[api/users]', ...args),
      error: (...args) => console.error('[api/users ERROR]', ...args),
      res: {}
    };

    const request = {
      method: req.method,
      url: req.url,
      headers: req.headers
    };

    await usersHandler(context, request);
    
    const result = context.res;
    res.status(result.status || 200);
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }
    
    if (result.body) {
      const bodyData = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
      res.json(bodyData);
    } else {
      res.end();
    }
  } catch (error) {
    console.error('[api/users] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

//       API
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, display_name, role = 'employee', department } = req.body;
    console.log('[api/users]            :', { username, display_name, role, department });

    if (!username || !password || !display_name) {
      return res.status(400).json({
        success: false,
        error: '                    ',
        timestamp: new Date().toISOString()
      });
    }

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: '                  ',
        timestamp: new Date().toISOString()
      });
    }

    //                bcrypt       
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const client = await dbPool.connect();
    const result = await client.query(
      'INSERT INTO users (username, password, display_name, role, department) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, display_name, role, department, created_at',
      [username, hashedPassword, display_name, role, department]
    );
    await client.release();

    console.log('[api/users]         :', result.rows[0]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '               ',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/users]          :', error);
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: '                  ',
        timestamp: new Date().toISOString()
      });
    }
    res.status(500).json({
      success: false,
      error: '              ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//       API
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, display_name, role, department } = req.body;
    console.log('[api/users]            :', { id, username, display_name, role, department });

    if (!username || !display_name) {
      return res.status(400).json({
        success: false,
        error: '              ',
        timestamp: new Date().toISOString()
      });
    }

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: '                  ',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(
      'UPDATE users SET username = $1, display_name = $2, role = $3, department = $4 WHERE id = $5 RETURNING id, username, display_name, role, department, created_at',
      [username, display_name, role, department, id]
    );
    await client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '                 ',
        id,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[api/users]         :', result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0],
      message: '               ',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/users]          :', error);
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: '                  ',
        timestamp: new Date().toISOString()
      });
    }
    res.status(500).json({
      success: false,
      error: '              ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//       API
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[api/users]            :', { id });

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: '                  ',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, username, display_name',
      [id]
    );
    await client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '                 ',
        id,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[api/users]         :', result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0],
      message: '           ',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/users]          :', error);
    res.status(500).json({
      success: false,
      error: '              ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//     API
app.get('/api/machines/machine-types', async (req, res) => {
  try {
    console.log('[api/machines]            ');

    if (!dbPool) {
      return res.json({
        success: true,
        data: [],
        message: '                  ',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(`
      SELECT id, machine_type_name
      FROM machine_types
      ORDER BY machine_type_name
    `);
    await client.release();

    console.log('[api/machines]         :', result.rows.length + ' ');

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines]          :', error);
    res.status(500).json({
      success: false,
      error: '              ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//     API
app.post('/api/machines/machine-types', async (req, res) => {
  try {
    const { machine_type_name } = req.body;
    console.log('[api/machines]          :', { machine_type_name });

    if (!machine_type_name) {
      return res.status(400).json({
        success: false,
        error: '        ',
        timestamp: new Date().toISOString()
      });
    }

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: '                  ',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(
      'INSERT INTO machine_types (machine_type_name) VALUES ($1) RETURNING *',
      [machine_type_name]
    );
    await client.release();

    console.log('[api/machines]       :', result.rows[0]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '             ',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines]        :', error);
    res.status(500).json({
      success: false,
      error: '            ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//     API
app.put('/api/machines/machine-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { machine_type_name } = req.body;
    console.log('[api/machines]          :', { id, machine_type_name });

    if (!machine_type_name) {
      return res.status(400).json({
        success: false,
        error: '        ',
        timestamp: new Date().toISOString()
      });
    }

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: '                  ',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(
      'UPDATE machine_types SET machine_type_name = $1 WHERE id = $2 RETURNING *',
      [machine_type_name, id]
    );
    await client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '               ',
        id,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[api/machines]       :', result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0],
      message: '             ',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines]        :', error);
    res.status(500).json({
      success: false,
      error: '            ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//     API
app.delete('/api/machines/machine-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[api/machines]          :', { id });

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: '                  ',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(
      'DELETE FROM machine_types WHERE id = $1 RETURNING *',
      [id]
    );
    await client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '               ',
        id,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[api/machines]       :', result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0],
      message: '         ',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines]        :', error);

    //             
    const isForeignKeyError = error.code === '23503' ||
      error.message.includes('foreign key') ||
      error.message.includes('violates foreign key constraint');

    if (isForeignKeyError) {
      return res.status(409).json({
        success: false,
        error: '                          ',
        details: '                     ',
        errorCode: 'FOREIGN_KEY_CONSTRAINT',
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: '            ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//        API            -          
app.get('/api/machines', async (req, res) => {
  try {
    console.log('[api/machines]                         ');
    console.log('  Request details:', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
      timestamp: new Date().toISOString()
    });

    if (!dbPool) {
      console.warn('   No database connection available for machines API');
      return res.json({
        success: true,
        machineTypes: [],
        machines: [],
        message: '                  ',
        timestamp: new Date().toISOString()
      });
    }

    //        
    const typesResult = await dbQuery(`
      SELECT id, machine_type_name
      FROM machine_types
      ORDER BY machine_type_name
    `);

    //          
    const machinesResult = await dbQuery(`
      SELECT m.id, m.machine_number, m.machine_type_id, mt.machine_type_name
      FROM machines m
      LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
      ORDER BY mt.machine_type_name, m.machine_number
    `);

    console.log('[api/machines]          :', {
      machineTypes: typesResult.rows.length,
      machines: machinesResult.rows.length
    });

    res.json({
      success: true,
      machineTypes: typesResult.rows,
      machines: machinesResult.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines]           :', error);
    res.status(500).json({
      success: false,
      error: '               ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//       API   ID   
app.get('/api/machines/machines', async (req, res) => {
  try {
    const { type_id } = req.query;
    console.log('[api/machines]              :', { type_id });

    if (!dbPool) {
      return res.json({
        success: true,
        data: [],
        message: '                  ',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    let query = 'SELECT id, machine_number FROM machines';
    const params = [];

    if (type_id) {
      query += ' WHERE machine_type_id = $1';
      params.push(type_id);
    }

    query += ' ORDER BY machine_number';

    const result = await client.query(query, params);
    await client.release();

    console.log('[api/machines]           :', result.rows.length + ' ');

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines]            :', error);
    res.status(500).json({
      success: false,
      error: '                ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//       API
app.post('/api/machines', async (req, res) => {
  try {
    const { machine_number, machine_type_id } = req.body;
    console.log('[api/machines]            :', { machine_number, machine_type_id });

    if (!machine_number || !machine_type_id) {
      return res.status(400).json({
        success: false,
        error: '       ID     ',
        timestamp: new Date().toISOString()
      });
    }

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: '                  ',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(
      'INSERT INTO machines (machine_number, machine_type_id) VALUES ($1, $2) RETURNING *',
      [machine_number, machine_type_id]
    );
    await client.release();

    console.log('[api/machines]         :', result.rows[0]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '               ',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines]          :', error);
    res.status(500).json({
      success: false,
      error: '              ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//       API
app.put('/api/machines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { machine_number, machine_type_id } = req.body;
    console.log('[api/machines]            :', { id, machine_number, machine_type_id });

    if (!machine_number || !machine_type_id) {
      return res.status(400).json({
        success: false,
        error: '       ID     ',
        timestamp: new Date().toISOString()
      });
    }

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: '                  ',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(
      'UPDATE machines SET machine_number = $1, machine_type_id = $2 WHERE id = $3 RETURNING *',
      [machine_number, machine_type_id, id]
    );
    await client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '                 ',
        id,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[api/machines]         :', result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0],
      message: '               ',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines]          :', error);
    res.status(500).json({
      success: false,
      error: '              ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//       API
app.delete('/api/machines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[api/machines]            :', { id });

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: '                  ',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(
      'DELETE FROM machines WHERE id = $1 RETURNING *',
      [id]
    );
    await client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '                 ',
        id,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[api/machines]         :', result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0],
      message: '           ',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines]          :', error);

    //             
    const isForeignKeyError = error.code === '23503' ||
      error.message.includes('foreign key') ||
      error.message.includes('violates foreign key constraint');

    if (isForeignKeyError) {
      return res.status(409).json({
        success: false,
        error: '                           ',
        details: '                ',
        errorCode: 'FOREIGN_KEY_CONSTRAINT',
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: '              ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// BLOB       API

//         API
app.get('/api/storage/list', async (req, res) => {
  try {
    const prefix = req.query.prefix;
    if (!prefix) {
      return res.status(400).json({
        error: 'prefix parameter is required'
      });
    }

    console.log('  Storage list request:', { prefix });

    if (!connectionString) {
      console.warn('   Azure Storage not configured, returning empty list');
      return res.json([]);
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      console.warn('   Blob service client unavailable, returning empty list');
      return res.json([]);
    }
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const listOptions = {
      prefix: norm(prefix)
    };

    const blobs = [];
    for await (const blob of containerClient.listBlobsFlat(listOptions)) {
      blobs.push({
        name: blob.name,
        size: blob.properties.contentLength,
        lastModified: blob.properties.lastModified,
        contentType: blob.properties.contentType
      });
    }

    console.log(`  Found ${blobs.length} blobs with prefix: ${prefix}`);
    res.json(blobs);
  } catch (error) {
    console.error('  Storage list error:', error);
    res.status(500).json({
      error: 'storage_list_error',
      message: error.message
    });
  }
});

//         API
app.get('/api/storage/get', async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) {
      return res.status(400).json({
        error: 'name parameter is required'
      });
    }

    console.log('  Storage get request:', { name });

    if (!connectionString) {
      return res.status(500).json({
        error: 'Azure Storage not configured'
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(500).json({
        error: 'Blob service client unavailable'
      });
    }
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(norm(name));

    const downloadResponse = await blockBlobClient.download();

    if (downloadResponse.readableStreamBody) {
      const chunks = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const content = Buffer.concat(chunks).toString('utf-8');

      // BOM  
      const cleanContent = content.replace(/^\uFEFF/, '');

      res.json({
        success: true,
        content: cleanContent,
        name: name,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        error: 'File not found or empty'
      });
    }
  } catch (error) {
    console.error('  Storage get error:', error);
    res.status(500).json({
      error: 'storage_get_error',
      message: error.message
    });
  }
});

//       API
app.post('/api/storage/save', async (req, res) => {
  try {
    const { name, content } = req.body;
    if (!name || !content) {
      return res.status(400).json({
        error: 'name and content parameters are required'
      });
    }

    console.log('  Storage save request:', { name, contentLength: content.length });

    if (!connectionString) {
      return res.status(500).json({
        error: 'Azure Storage not configured'
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(500).json({
        error: 'Blob service client unavailable'
      });
    }
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(norm(name));

    await blockBlobClient.upload(content, content.length, {
      blobHTTPHeaders: {
        blobContentType: 'application/json'
      }
    });

    console.log(`  File saved: ${name}`);
    res.json({
      success: true,
      message: 'File saved successfully',
      name: name,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('  Storage save error:', error);
    res.status(500).json({
      error: 'storage_save_error',
      message: error.message
    });
  }
});

//       API
app.delete('/api/storage/delete', async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) {
      return res.status(400).json({
        error: 'name parameter is required'
      });
    }

    console.log('   Storage delete request:', { name });

    if (!connectionString) {
      return res.status(500).json({
        error: 'Azure Storage not configured'
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(500).json({
        error: 'Blob service client unavailable'
      });
    }
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(norm(name));

    await blockBlobClient.delete();

    console.log(`  File deleted: ${name}`);
    res.json({
      success: true,
      message: 'File deleted successfully',
      name: name,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('  Storage delete error:', error);
    res.status(500).json({
      error: 'storage_delete_error',
      message: error.message
    });
  }
});

//        API -     
app.get('/api/knowledge', async (_req, res) => {
  try {
    console.log('[api/knowledge]               ');

    if (connectionString) {
      try {
        const blobServiceClient = getBlobServiceClient();
        if (!blobServiceClient) {
          return res.status(503).json({
            success: false,
            error: 'BLOB             ',
            details: 'Blob service client unavailable'
          });
        }

        const containerClient = blobServiceClient.getContainerClient(containerName);
        const containerExists = await containerClient.exists();
        if (!containerExists) {
          console.warn('[api/knowledge] Azure           :', containerName);
          return res.json({
            success: true,
            data: [],
            total: 0,
            message: 'Azure Storage container not found',
            timestamp: new Date().toISOString()
          });
        }

        const items = [];
        const prefix = KNOWLEDGE_DATA_PREFIX;
        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
          if (!blob.name.toLowerCase().endsWith('.json')) {
            continue;
          }

          const relative = blob.name.startsWith(prefix)
            ? blob.name.substring(prefix.length)
            : blob.name;

          if (!relative) {
            continue;
          }

          const parsed = path.posix.parse(relative);
          const basePath = BASE || 'knowledge-base';
          const publicPath = `/${toPosixPath(path.posix.join(basePath, 'data', relative))}`;

          items.push({
            filename: relative,
            name: parsed.name || relative,
            size: blob.properties.contentLength || 0,
            modifiedAt:
              blob.properties.lastModified?.toISOString() || new Date().toISOString(),
            path: publicPath
          });
        }

        console.log(`  [api/knowledge] Azure     : ${items.length} `);
        return res.json({
          success: true,
          data: items,
          total: items.length,
          timestamp: new Date().toISOString()
        });
      } catch (azureError) {
        console.error('[api/knowledge] Azure     :', azureError);
        return res.status(500).json({
          success: false,
          error: '                    ',
          details: azureError instanceof Error ? azureError.message : 'Unknown error'
        });
      }
    }

    // BLOB                      
    console.log('[api/knowledge] BLOB             ');
    res.json({
      success: true,
      data: [],
      total: 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/knowledge]             :', error);
    res.status(500).json({
      success: false,
      error: '                    ',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

//        API -     
app.get('/api/knowledge/:filename(*)', async (req, res) => {
  try {
    const { filename } = req.params;
    console.log(`[api/knowledge]           : ${filename}`);

    if (!filename) {
      return res.status(400).json({
        success: false,
        error: '               '
      });
    }

    if (connectionString) {
      try {
        const blobServiceClient = getBlobServiceClient();
        if (!blobServiceClient) {
          return res.status(503).json({
            success: false,
            error: 'BLOB             ',
            details: 'Blob service client unavailable'
          });
        }

        const relativePath = sanitizeKnowledgeRelativePath(filename);
        const blobPath = buildKnowledgeBlobPath(relativePath);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

        const exists = await blockBlobClient.exists();
        if (!exists) {
          return res.status(404).json({
            success: false,
            error: '            '
          });
        }

        const downloadResponse = await blockBlobClient.download();
        const stream = downloadResponse.readableStreamBody;
        const buffer = stream ? await streamToBuffer(stream) : Buffer.alloc(0);
        const content = buffer.toString('utf-8').replace(/^[\uFEFF]+/, '');
        const jsonData = JSON.parse(content);
        const properties = await blockBlobClient.getProperties();

        console.log('[api/knowledge] Azure        ');
        return res.json({
          success: true,
          data: jsonData,
          filename: relativePath,
          size: properties.contentLength || Buffer.byteLength(content, 'utf-8'),
          modifiedAt: properties.lastModified?.toISOString()
        });
      } catch (azureError) {
        console.error('[api/knowledge] Azure         :', azureError);
        return res.status(500).json({
          success: false,
          error: '                     ',
          details: azureError instanceof Error ? azureError.message : 'Unknown error'
        });
      }
    }

    if (!filename.toLowerCase().endsWith('.json')) {
      return res.status(400).json({
        success: false,
        error: 'JSON            '
      });
    }

    // BLOB               404   
    console.log('[api/knowledge] BLOB             ');
    return res.status(404).json({
      success: false,
      error: 'BLOB             '
    });
  } catch (error) {
    console.error('[api/knowledge]              :', error);
    res.status(500).json({
      success: false,
      error: '                     ',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 17.        API
app.get('/api/knowledge-base', async (req, res) => {
  try {
    console.log('[api/knowledge-base]               ');

    if (!connectionString) {
      console.warn('[api/knowledge-base] Azure Storage connection string not configured');
      return res.json({
        success: true,
        data: [],
        message: 'Azure Storage not configured',
        timestamp: new Date().toISOString()
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      console.warn('[api/knowledge-base] Blob service client unavailable');
      return res.json({
        success: true,
        data: [],
        message: 'Blob service client unavailable',
        timestamp: new Date().toISOString()
      });
    }

    let containerClient;
    try {
      containerClient = blobServiceClient.getContainerClient(containerName);
    } catch (containerError) {
      console.error('[api/knowledge-base] Container client creation failed:', containerError);
      return res.status(503).json({
        success: false,
        error: 'BLOB                    ',
        details: containerError instanceof Error ? containerError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }

    const listOptions = {
      prefix: norm('documents/')
    };

    const documents = [];
    try {
      for await (const blob of containerClient.listBlobsFlat(listOptions)) {
        if (blob.name.endsWith('.json')) {
          try {
            const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
            const downloadResponse = await blockBlobClient.download();

            if (downloadResponse.readableStreamBody) {
              const chunks = [];
              for await (const chunk of downloadResponse.readableStreamBody) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
              }
              const content = Buffer.concat(chunks).toString('utf-8');
              const cleanContent = content.replace(/^\uFEFF/, '');
              const jsonData = JSON.parse(cleanContent);

              documents.push({
                id: blob.name,
                name: jsonData.title || jsonData.name || blob.name.split('/').pop(),
                content: jsonData.content || jsonData.text || '',
                type: jsonData.type || 'document',
                createdAt: blob.properties.lastModified,
                size: blob.properties.contentLength
              });
            }
          } catch (error) {
            console.warn(`   Failed to parse document ${blob.name}:`, error.message);
          }
        }
      }
    } catch (blobListError) {
      console.error('[api/knowledge-base] BLOB       :', blobListError);
      const isDnsError = blobListError.message && blobListError.message.includes('ENOTFOUND');
      return res.status(503).json({
        success: false,
        error: 'BLOB                ',
        details: isDnsError
          ? '                                     Azure Portal                      '
          : blobListError.message,
        errorType: isDnsError ? 'DNS_ERROR' : 'BLOB_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    console.log('[api/knowledge-base]            :', documents.length + ' ');

    res.json({
      success: true,
      data: documents,
      total: documents.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/knowledge-base]             :', error);
    const isDnsError = error.message && error.message.includes('ENOTFOUND');
    const isBlobError = error.message && (error.message.includes('BLOB') || error.message.includes('blob'));
    res.status(500).json({
      success: false,
      error: '                 ',
      details: isDnsError
        ? '                                     Azure Portal                      '
        : error.message,
      errorType: isDnsError ? 'DNS_ERROR' : isBlobError ? 'BLOB_ERROR' : 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

//         API -     
app.get('/api/documents', async (req, res) => {
  try {
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOB             ',
        timestamp: new Date().toISOString()
      });
    }

    const containerClient = blobServiceClient.getContainerClient('documents');
    const documents = [];

    for await (const blob of containerClient.listBlobsFlat({ prefix: '' })) {
      documents.push({
        id: blob.name,
        name: blob.name.split('/').pop(),
        path: blob.name,
        size: blob.properties.contentLength,
        contentType: blob.properties.contentType,
        createdAt: blob.properties.createdOn,
        lastModified: blob.properties.lastModified
      });
    }

    res.json({
      success: true,
      data: documents,
      total: documents.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/documents]    :', error);
    res.status(500).json({
      success: false,
      error: '                  ',
      timestamp: new Date().toISOString()
    });
  }
});

//         API -       
app.post('/api/documents', async (req, res) => {
  try {
    const { filename, content, contentType } = req.body;

    if (!filename || !content) {
      return res.status(400).json({
        success: false,
        error: '                ',
        timestamp: new Date().toISOString()
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOB             ',
        timestamp: new Date().toISOString()
      });
    }

    const containerClient = blobServiceClient.getContainerClient('documents');
    const blockBlobClient = containerClient.getBlockBlobClient(filename);

    await blockBlobClient.upload(content, content.length, {
      blobHTTPHeaders: {
        blobContentType: contentType || 'application/octet-stream'
      }
    });

    res.json({
      success: true,
      message: '                 ',
      data: { filename },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/documents]          :', error);
    res.status(500).json({
      success: false,
      error: '                    ',
      timestamp: new Date().toISOString()
    });
  }
});

// 18.        API
app.get('/api/emergency-flows', async (req, res) => {
  try {
    console.log('[api/emergency-flows]               ');

    if (!connectionString) {
      return res.json({
        success: true,
        data: [],
        message: 'Azure Storage not configured',
        timestamp: new Date().toISOString()
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.json({
        success: true,
        data: [],
        message: 'Blob service client unavailable',
        timestamp: new Date().toISOString()
      });
    }
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const listOptions = {
      prefix: norm('flows/')
    };

    const flows = [];
    for await (const blob of containerClient.listBlobsFlat(listOptions)) {
      if (blob.name.endsWith('.json')) {
        try {
          const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
          const downloadResponse = await blockBlobClient.download();

          if (downloadResponse.readableStreamBody) {
            const chunks = [];
            for await (const chunk of downloadResponse.readableStreamBody) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const content = Buffer.concat(chunks).toString('utf-8');
            const cleanContent = content.replace(/^\uFEFF/, '');
            const jsonData = JSON.parse(cleanContent);

            flows.push({
              id: blob.name,
              name: jsonData.name || jsonData.title || blob.name.split('/').pop(),
              description: jsonData.description || '',
              steps: jsonData.steps || [],
              createdAt: blob.properties.lastModified,
              updatedAt: blob.properties.lastModified
            });
          }
        } catch (error) {
          console.warn(`   Failed to parse flow ${blob.name}:`, error.message);
        }
      }
    }

    console.log('[api/emergency-flows]            :', flows.length + ' ');

    res.json({
      success: true,
      data: flows,
      total: flows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/emergency-flows]             :', error);
    res.status(500).json({
      success: false,
      error: '                 ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 19.        API     -              
// 20. RAG  API
app.get('/api/settings/rag', (req, res) => {
  try {
    console.log('[api/settings/rag]        ');
    res.json({
      success: true,
      data: {
        enabled: false,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
        message: 'RAG             '
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/settings/rag]    :', error);
    res.status(500).json({
      success: false,
      error: 'RAG            ',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// AI    API
app.get('/api/ai-assist/settings', (req, res) => {
  try {
    console.log('[api/ai-assist/settings]        ');
    res.json({
      success: true,
      data: {
        enabled: true,
        autoSuggestions: true,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/ai-assist/settings]    :', error);
    res.status(500).json({
      success: false,
      error: 'AI              ',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/ai-assist/settings', (req, res) => {
  res.json({
    success: true,
    message: 'AI           ',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

// RAG  API(        )
app.get('/api/config/rag', (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: false,
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      message: 'RAG             '
    },
    timestamp: new Date().toISOString()
  });
});

//          API
app.get('/api/knowledge-base/stats', async (req, res) => {
  try {
    console.log('[api/knowledge-base/stats]        ');
    res.json({
      success: true,
      data: {
        totalDocuments: 0,
        totalSize: 0,
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/knowledge-base/stats]    :', error);
    res.status(500).json({
      success: false,
      error: '                   ',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

//            API
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    console.log('[api/admin/dashboard]        ');
    res.json({
      success: true,
      data: {
        totalUsers: 0,
        totalChats: 0,
        totalMachines: 0,
        recentActivity: []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/admin/dashboard]    :', error);
    res.status(500).json({
      success: false,
      error: '                    ',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// NOTE: /api/history/export-files  1249             

//           API
app.get('/api/history/exports/filter-data', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        machineTypes: [],
        machineNumbers: [],
        userNames: []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '                  ',
      timestamp: new Date().toISOString()
    });
  }
});

// 21.         API
app.get('/api/chat-history', async (req, res) => {
  try {
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOB             ',
        timestamp: new Date().toISOString()
      });
    }

    const containerClient = blobServiceClient.getContainerClient('exports');
    const histories = [];

    for await (const blob of containerClient.listBlobsFlat({ prefix: '' })) {
      if (blob.name.endsWith('.json')) {
        histories.push({
          id: blob.name,
          name: blob.name,
          size: blob.properties.contentLength,
          createdAt: blob.properties.createdOn,
          lastModified: blob.properties.lastModified
        });
      }
    }

    res.json({
      success: true,
      data: histories,
      total: histories.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/chat-history]    :', error);
    res.status(500).json({
      success: false,
      error: '                ',
      timestamp: new Date().toISOString()
    });
  }
});

//         API
app.post('/api/chat-history', (req, res) => {
  const { messages, chatId, machineType, machineNumber } = req.body;
  res.json({
    success: true,
    message: '                         ',
    data: {
      chatId: chatId || 'mock-chat-id',
      machineType: machineType || 'unknown',
      machineNumber: machineNumber || 'unknown',
      messageCount: messages ? messages.length : 0
    },
    timestamp: new Date().toISOString()
  });
});

//           API BLOB         
app.post('/api/chat/export', async (req, res) => {
  try {
    const exportData = req.body;
    console.log('[api/chat/export]            :', {
      chatId: exportData.chatId,
      title: exportData.title,
      hasImages: !!exportData.savedImages
    });

    //         
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const chatId = exportData.chatId || `chat-${Date.now()}`;
    const titleSlug = (exportData.title || 'untitled').replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '_').substring(0, 50);
    const filename = `${titleSlug}_${chatId}_${timestamp}.json`;

    //   URL BLOB           
    let normalizedImages = [];
    if (exportData.savedImages && Array.isArray(exportData.savedImages)) {
      normalizedImages = exportData.savedImages.map(image => {
        //         
        let fileName = '';
        if (image.fileName) {
          fileName = image.fileName.includes('/')
            ? image.fileName.split('/').pop()
            : image.fileName.includes('\\')
              ? image.fileName.split('\\').pop()
              : image.fileName;
        } else if (image.path) {
          const pathParts = image.path.split(/[/\\]/);
          fileName = pathParts[pathParts.length - 1];
        } else if (image.url) {
          // URL          
          const urlParts = image.url.split('/');
          fileName = urlParts[urlParts.length - 1];
        } else if (image.originalFileName) {
          fileName = image.originalFileName;
        }

        // BLOB      API     
        return {
          ...image,
          fileName: fileName,
          url: `/api/images/chat-exports/${fileName}`,
          blobPath: `images/chat-exports/${fileName}`,
          originalFileName: image.originalFileName || fileName
        };
      });
    }

    //         
    const dataToSave = {
      ...exportData,
      savedImages: normalizedImages,
      images: normalizedImages, //       
      exportTimestamp: new Date().toISOString(),
      exportType: 'blob_stored',
      version: '1.0'
    };

    // BLOB        
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOB             ',
        timestamp: new Date().toISOString()
      });
    }

    try {
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobName = norm(`exports/${filename}`);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const jsonContent = JSON.stringify(dataToSave, null, 2);
      await blockBlobClient.upload(
        jsonContent,
        Buffer.byteLength(jsonContent),
        {
          blobHTTPHeaders: {
            blobContentType: 'application/json; charset=utf-8'
          },
          metadata: {
            chatId: chatId,
            title: exportData.title || 'untitled',
            exportDate: new Date().toISOString()
          }
        }
      );

      console.log(`  BLOB        : ${blobName}`);

      res.json({
        success: true,
        filename: filename,
        blobName: blobName,
        storage: 'blob_storage',
        chatId: chatId,
        url: blockBlobClient.url,
        timestamp: new Date().toISOString()
      });
    } catch (blobError) {
      console.error('[api/chat/export] BLOB        :', blobError);
      throw blobError;
    }
  } catch (error) {
    console.error('[api/chat/export]          :', error);
    res.status(500).json({
      success: false,
      error: '                  ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//        API
app.get('/api/history', async (req, res) => {
  try {
    console.log('[api/history]             ');

    const { limit = 50, offset = 0, machineType, machineNumber } = req.query;

    if (!dbPool) {
      return res.json({
        success: true,
        data: [],
        message: '                  ',
        timestamp: new Date().toISOString()
      });
    }

    // PostgreSQL SQLite               
    const isPostgres = !!dbPool;
    let paramIndex = 1;

    //          (support_history        )
    let query = `
      SELECT
        h.id,
        h.machine_type,
        h.machine_number,
        h.created_at,
        h.json_data,
        h.image_path
      FROM support_history h
      WHERE 1=1
    `;
    let params = [];

    if (machineType) {
      query += ` AND h.machine_type = ${isPostgres ? `$${paramIndex++}` : '?'}`;
      params.push(machineType);
    }

    if (machineNumber) {
      query += ` AND h.machine_number = ${isPostgres ? `$${paramIndex++}` : '?'}`;
      params.push(machineNumber);
    }

    query += ` ORDER BY h.created_at DESC LIMIT ${isPostgres ? `$${paramIndex++}` : '?'} OFFSET ${isPostgres ? `$${paramIndex++}` : '?'}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await dbQuery(query, params);

    console.log('[api/history]          :', result.rows.length + ' ');

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/history]           :', error);
    res.status(500).json({
      success: false,
      error: '               ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//           API BLOB        
app.get('/api/history/export-list', async (req, res) => {
  try {
    console.log('[api/history/export-list]                ');

    const items = [];

    // BLOB                 
    const blobServiceClient = getBlobServiceClient();
    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const prefix = norm('exports/');

        console.log(`  BLOB           : prefix=${prefix}`);

        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
          if (!blob.name.endsWith('.json') || blob.name.includes('.backup.')) continue;

          const fileName = blob.name.split('/').pop();
          const fileNameWithoutExt = fileName.replace('.json', '');
          const uuidMatch = fileNameWithoutExt.match(/_([a-f0-9-]{36})_/);
          const fileId = uuidMatch ? uuidMatch[1] : fileNameWithoutExt;

          items.push({
            id: fileId,
            fileName: fileName,
            blobName: blob.name,
            lastModified: blob.properties.lastModified,
            size: blob.properties.contentLength,
            source: 'blob_storage'
          });
        }

        console.log(`  BLOB   ${items.length}    `);
      } catch (blobError) {
        console.error('  BLOB        :', blobError);
      }
    }

    res.json({
      success: true,
      data: items,
      total: items.length,
      source: items.length > 0 ? 'blob_storage' : 'none',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/history/export-list]    :', error);
    res.status(500).json({
      success: false,
      error: '                  ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//             API    - BLOB          
app.get('/api/history/local-files', async (req, res) => {
  console.log('[api/history/local-files]              - BLOB              ');
  res.status(410).json({
    success: false,
    error: '                  /api/history/export-list          ',
    timestamp: new Date().toISOString()
  });
});

//             API    - BLOB          
app.get('/api/history/local-files/:filename', async (req, res) => {
  console.log('[api/history/local-files/:filename]              - BLOB              ');
  res.status(410).json({
    success: false,
    error: '                  /api/history/:id          ',
    timestamp: new Date().toISOString()
  });
});

//      API
app.get('/api/flows', async (req, res) => {
  try {
    console.log('[api/flows]             ');

    if (!dbPool) {
      return res.json({
        success: true,
        data: [],
        message: '                  ',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(`
      SELECT id, name, description, steps, created_at, updated_at
      FROM emergency_flows
      ORDER BY created_at DESC
    `);
    await client.release();

    console.log('[api/flows]          :', result.rows.length + ' ');

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/flows]           :', error);
    res.status(500).json({
      success: false,
      error: '               ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 23.             API
app.get('/api/db-check', async (req, res) => {
  try {
    console.log('[api/db-check]                  ');

    if (!dbPool) {
      return res.json({
        success: true,
        connected: false,
        message: '                      ',
        details: {
          environment: 'azure-production',
          database: 'not_initialized',
          ssl: process.env.PG_SSL || 'not_set',
          database_url_set: !!process.env.DATABASE_URL
        },
        timestamp: new Date().toISOString()
      });
    }

    //            
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timeout')), 30000);
    });

    const queryPromise = dbPool.query('SELECT NOW() as current_time, version() as version');

    const result = await Promise.race([queryPromise, timeoutPromise]);

    res.json({
      success: true,
      connected: true,
      message: '              ',
      details: {
        environment: 'azure-production',
        database: 'connected',
        ssl: process.env.PG_SSL || 'prefer',
        current_time: result.rows[0].current_time,
        version: result.rows[0].version,
        pool_stats: {
          totalCount: dbPool.totalCount,
          idleCount: dbPool.idleCount,
          waitingCount: dbPool.waitingCount
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/db-check]    :', error);
    res.status(500).json({
      success: false,
      connected: false,
      message: '              ',
      details: {
        environment: 'azure-production',
        database: 'connection_failed',
        error: error.message,
        error_type: error.constructor.name,
        database_url_set: !!process.env.DATABASE_URL,
        ssl_setting: process.env.PG_SSL || 'not_set'
      },
      timestamp: new Date().toISOString()
    });
  }
});

//                   /api/system-check/db-check 
app.get('/api/system-check/db-check', async (req, res) => {
  try {
    console.log('[api/system-check/db-check]                  ');

    if (!dbPool) {
      return res.json({
        success: false,
        status: 'ERROR',
        connected: false,
        message: '                      ',
        details: {
          environment: 'azure-production',
          database: 'not_initialized',
          ssl: process.env.PG_SSL || 'not_set',
          database_url_set: !!process.env.DATABASE_URL
        },
        timestamp: new Date().toISOString()
      });
    }

    //            
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timeout')), 30000);
    });

    const queryPromise = dbPool.query('SELECT NOW() as current_time, version() as version');

    const result = await Promise.race([queryPromise, timeoutPromise]);

    res.json({
      success: true,
      status: 'OK',
      connected: true,
      message: '              ',
      db_time: result.rows[0].current_time,
      version: result.rows[0].version,
      details: {
        environment: 'azure-production',
        database: 'connected',
        ssl: process.env.PG_SSL || 'prefer',
        current_time: result.rows[0].current_time,
        version: result.rows[0].version,
        pool_stats: {
          totalCount: dbPool.totalCount,
          idleCount: dbPool.idleCount,
          waitingCount: dbPool.waitingCount
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/system-check/db-check]    :', error);
    res.json({
      success: false,
      status: 'ERROR',
      connected: false,
      message: error.message || '              ',
      error: error.message,
      details: {
        environment: 'azure-production',
        database: 'connection_failed',
        error: error.message,
        error_type: error.constructor.name,
        database_url_set: !!process.env.DATABASE_URL,
        ssl_setting: process.env.PG_SSL || 'not_set'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// 24. GPT      API
app.post('/api/gpt-check', (req, res) => {
  res.json({
    success: true,
    connected: false,
    message: 'GPT                  ',
    details: {
      environment: 'azure-production',
      apiKey: 'not_configured',
      model: 'not_available'
    },
    timestamp: new Date().toISOString()
  });
});

//           GPT              /api/system-check/gpt-check 
app.post('/api/system-check/gpt-check', (req, res) => {
  console.log('[api/system-check/gpt-check] GPT           ');

  // OpenAI API        
  if (!isOpenAIAvailable) {
    return res.json({
      success: false,
      status: 'ERROR',
      connected: false,
      message: 'OpenAI API            ',
      error: 'API             ',
      details: {
        environment: 'azure-production',
        apiKey: 'not_configured',
        model: 'not_available'
      },
      timestamp: new Date().toISOString()
    });
  }

  // API            
  res.json({
    success: true,
    status: 'OK',
    connected: true,
    message: 'OpenAI API           ',
    details: {
      environment: 'azure-production',
      apiKey: 'configured',
      model: 'available'
    },
    timestamp: new Date().toISOString()
  });
});

// 25. GPT API                 
app.post('/api/chatgpt', async (req, res) => {
  try {
    const { text, useOnlyKnowledgeBase = false } = req.body;

    console.log('[api/chatgpt] GPT request:', {
      text: text?.substring(0, 100) + '...',
      useOnlyKnowledgeBase,
      openaiAvailable: isOpenAIAvailable
    });

    if (!isOpenAIAvailable) {
      return res.json({
        success: false,
        response: 'OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.',
        message: 'GPT         OpenAI API          ',
        details: {
          environment: 'azure-production',
          apiKeyConfigured: false,
          fallbackMode: true
        },
        timestamp: new Date().toISOString()
      });
    }

    // OpenAI API          
    try {
      if (!openaiClient) {
        throw new Error('OpenAI client not initialized');
      }

      console.log('[api/chatgpt] Sending request to OpenAI...');

      //             
      const systemPrompt = `                   AI         
                                  
                                 `;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ];

      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content || '              ';

      console.log('[api/chatgpt] OpenAI response received:', {
        responseLength: response.length,
        tokensUsed: completion.usage?.total_tokens
      });

      res.json({
        success: true,
        response: response,
        message: 'GPT         ',
        details: {
          inputText: text?.substring(0, 100) + '...',
          useOnlyKnowledgeBase: useOnlyKnowledgeBase,
          environment: 'azure-production',
          model: 'gpt-3.5-turbo',
          tokensUsed: completion.usage?.total_tokens || 0
        },
        timestamp: new Date().toISOString()
      });
    } catch (apiError) {
      console.error('[api/chatgpt] OpenAI API error:', apiError);

      //            
      if (apiError.response) {
        console.error('API Error Response:', apiError.response.status, apiError.response.data);
      }

      res.json({
        success: false,
        response: 'AI                                    ',
        message: 'OpenAI API       ',
        details: {
          environment: 'azure-production',
          error: apiError.message,
          errorType: apiError.type || 'unknown'
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('[api/chatgpt] Error:', error);
    res.status(500).json({
      success: false,
      response: 'GPT              ',
      message: error.message,
      details: {
        environment: 'azure-production',
        error: error.name
      },
      timestamp: new Date().toISOString()
    });
  }
});

//       API      -      
app.post('/api/chats/:id/send-test', async (req, res) => {
  try {
    const { id } = req.params;
    const { chatData, exportType } = req.body;

    console.log('  /chats/:id/send-test                ');
    console.log('                   :', {
      method: req.method,
      url: req.url,
      originalUrl: req.originalUrl,
      path: req.path,
      baseUrl: req.baseUrl,
      chatId: id,
      exportType,
      messageCount: chatData?.messages?.length || 0,
      machineInfo: chatData?.machineInfo,
    });

    //           
    if (!chatData || !chatData.messages || !Array.isArray(chatData.messages)) {
      return res.status(400).json({
        error: 'Invalid chat data format',
        details: 'chatData.messages must be an array',
      });
    }

    //               ESM  
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectRoot = path.resolve(__dirname, '..');
    const exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');
    console.log(`                 : ${exportsDir}`);

    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
      console.log('  exports            :', exportsDir);
    }

    //         JSON         
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    //                             
    const userMessages = chatData.messages.filter((m) => !m.isAiResponse);
    console.log('       -          :', userMessages);

    const textMessages = userMessages
      .map((m) => m.content)
      .filter((content) => content && !content.trim().startsWith('data:image/'))
      .join('\n')
      .trim();
    console.log('       -          :', textMessages);

    let incidentTitle = '    ';
    if (textMessages) {
      incidentTitle = textMessages.split('\n')[0].trim();
      console.log('       -          :', incidentTitle);
    } else {
      incidentTitle = '         ';
      console.log('       -            :', incidentTitle);
    }

    //                  
    const sanitizedTitle = incidentTitle
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    const fileName = `${sanitizedTitle}_${id}_${timestamp}.json`;
    const filePath = path.join(exportsDir, fileName);

    //               
    const imagesDir = path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
    console.log(`             : ${imagesDir}`);

    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
      console.log('             :', imagesDir);
    }

    //                            
    const savedImages = [];
    const cleanedChatData = JSON.parse(JSON.stringify(chatData));

    for (const message of cleanedChatData.messages) {
      if (message.content && message.content.startsWith('data:image/')) {
        try {
          const base64Data = message.content.replace(/^data:image\/[a-z]+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');

          const imageTimestamp = Date.now();
          const imageFileName = `chat_image_${id}_${imageTimestamp}.jpg`;
          const imagePath = path.join(imagesDir, imageFileName);

          //    120px         
          const sharp = (await import('sharp')).default;
          const resizedBuffer = await sharp(buffer)
            .resize(120, 120, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 85 })
            .toBuffer();

          const storageMode = process.env.STORAGE_MODE || 'local';
          let imageSavedPath = '';
          let imageBlobName = '';

          if (storageMode === 'hybrid' || storageMode === 'blob' || storageMode === 'azure') {
            const blobServiceClient = getBlobServiceClient();
            if (blobServiceClient) {
              const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';
              const containerClient = blobServiceClient.getContainerClient(containerName);
              imageBlobName = `images/chat-exports/${imageFileName}`;
              const blockBlobClient = containerClient.getBlockBlobClient(imageBlobName);

              await blockBlobClient.upload(resizedBuffer, resizedBuffer.length, {
                blobHTTPHeaders: {
                  blobContentType: 'image/jpeg'
                },
                metadata: {
                  chatId: id,
                  uploadedAt: new Date().toISOString()
                }
              });

              imageSavedPath = imageBlobName;
              console.log(`                (BLOB): ${imageBlobName}`);
            } else {
              console.warn('   BLOB                         ');
              fs.writeFileSync(imagePath, resizedBuffer);
              imageSavedPath = imagePath;
            }
          } else {
            fs.writeFileSync(imagePath, resizedBuffer);
            imageSavedPath = imagePath;
            console.log('                120px      :', imagePath);
          }

          const imageUrl = storageMode === 'hybrid' || storageMode === 'blob' || storageMode === 'azure'
            ? `/api/storage/image-url?name=images/chat-exports/${imageFileName}`
            : `/api/images/chat-exports/${imageFileName}`;

          message.content = imageUrl;

          savedImages.push({
            messageId: message.id,
            fileName: imageFileName,
            path: imageSavedPath,
            url: imageUrl,
            blobPath: `images/chat-exports/${imageFileName}`
          });
        } catch (imageError) {
          console.warn('       :', imageError);
          message.content = '[       ]';
        }
      }
    }

    // JSON      
    const jsonData = {
      chatId: id,
      userId: 'test-user',
      exportType: exportType || 'manual_send',
      exportTimestamp: new Date().toISOString(),
      title: incidentTitle,
      chatData: cleanedChatData,
      savedImages: savedImages,
      images: savedImages,
      lastModified: new Date().toISOString(),
      jsonData: {
        savedImages: savedImages
      }
    };

    // JSON         
    const jsonContent = JSON.stringify(jsonData, null, 2);
    fs.writeFileSync(filePath, jsonContent, { encoding: 'utf8' });
    console.log(`              : ${filePath}`);

    res.json({
      success: true,
      message: '                 ',
      filePath: filePath,
      fileName: fileName,
      savedImages: savedImages.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('           :', error);
    res.status(500).json({
      success: false,
      error: '             ',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 26.            -            
app.get('/api/_diag/routes', (req, res) => {
  // Express app                
  const routes = [];

  function extractRoutes(stack, basePath = '') {
    stack.forEach((middleware) => {
      if (middleware.route) {
        //                
        const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(', ');
        routes.push({
          path: basePath + middleware.route.path,
          methods: methods,
          type: 'route'
        });
      } else if (middleware.name === 'router' && middleware.handle.stack) {
        //                
        const routerPath = middleware.regexp.source
          .replace('\\/?', '')
          .replace('(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace(/\^/g, '')
          .replace(/\$/g, '');
        extractRoutes(middleware.handle.stack, basePath + routerPath);
      }
    });
  }

  extractRoutes(app._router.stack);

  //                 
  const criticalEndpoints = [
    '/api/emergency-flow/list',
    '/api/history/machine-data',
    '/api/history/export-files'
  ];

  const criticalStatus = criticalEndpoints.map(endpoint => ({
    endpoint,
    registered: routes.some(r => r.path === endpoint)
  }));

  res.json({
    success: true,
    totalRoutes: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
    criticalEndpoints: criticalStatus,
    message: `${routes.length}              `,
    timestamp: new Date().toISOString()
  });
});

// 27.            -            
app.get('/api/_diag/all-routes', (req, res) => {
  const routes = [];

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase());
      methods.forEach(method => {
        routes.push(`${method} ${middleware.route.path}`);
      });
    }
  });

  res.json({
    success: true,
    routes: routes.sort(),
    total: routes.length,
    timestamp: new Date().toISOString()
  });
});

// 28.               
app.get('/api/version', (req, res) => {
  res.json({
    version: VERSION,
    builtAt: new Date().toISOString(),
    environment: 'azure-production',
    timestamp: new Date().toISOString()
  });
});

// 29.             
app.get('/api/_diag/status', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    environment: 'azure-production',
    apiEndpoints: 31,
    timestamp: new Date().toISOString(),
    message: ' 31  API                  '
  });
});

// Seed admin user endpoint
app.get('/api/_diag/seed-admin', async (req, res) => {
  try {
    if (!dbPool) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Delete existing admin
    await dbQuery('DELETE FROM users WHERE username = $1', ['admin']);

    // Insert admin user (password: admin)
    const adminHash = '$2a$10$N9qo8uLOickgx2ZMRZoMye6IjF4N/fU6.kcXLX3fLgO.F7o4g7X6m';
    await dbQuery(
      'INSERT INTO users (username, password, display_name, role, department, description) VALUES ($1, $2, $3, $4, $5, $6)',
      ['admin', adminHash, 'Administrator', 'admin', 'System Administration', 'Default admin account']
    );

    const usersResult = await dbQuery('SELECT id, username, role, display_name FROM users ORDER BY id');

    res.json({
      success: true,
      message: 'Admin user seeded successfully',
      users: usersResult.rows
    });
  } catch (error) {
    console.error('Seed admin error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint: Check all users (password hash length only)
app.get('/api/_diag/check-users', async (req, res) => {
  try {
    if (!dbPool) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const usersResult = await dbQuery(
      'SELECT id, username, display_name, role, department, LENGTH(password) as password_length, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      total: usersResult.rows.length,
      users: usersResult.rows,
      message: 'Check password_length - should be 60 chars for bcrypt hash'
    });
  } catch (error) {
    console.error('Check users error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 30.             
app.post('/api/emergency-flow/generate', async (req, res) => {
  try {
    const { keyword } = req.body;

    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({
        success: false,
        error: '          ',
      });
    }

    console.log(`         :      =${keyword}`);

    // OpenAI                
    if (!openaiClient) {
      return res.status(503).json({
        success: false,
        error: 'OpenAI API         ',
        details: 'OpenAI client not available',
      });
    }

    // AI           
    const toneInstruction = '                         ';

    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `                                     
                                 

**        :**
1.      [       ]

2.             :
         1       1              

   **       step :**
     1 [1               ]
      [          ]

   **         decision :**
        [        ]
      [       ]
      1 [   1   ]
      2 [   2   ]
      3 [   3   ]
      4 [   4   ]

**       :**
-             1    =1       1     
-           50-100     
-                             
-                   
${toneInstruction}`,
        },
        {
          role: 'user',
          content: `                                   ${keyword}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const generatedText = completion.choices[0]?.message?.content;
    if (!generatedText) {
      throw new Error('            ');
    }

    console.log('         ');

    res.json({
      success: true,
      data: {
        flowText: generatedText,
        keyword: keyword,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('          :', error);
    res.status(500).json({
      success: false,
      error: '            ',
      details: error.message,
    });
  }
});

// 30.                   
app.post('/api/emergency-flow', async (req, res) => {
  try {
    const flowData = req.body;
    console.log('[api/emergency-flow]           :', {
      id: flowData.id,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0
    });

    //   URL    
    const normalizedSteps = flowData.steps?.map(step => {
      if (step.images && Array.isArray(step.images)) {
        const normalizedImages = step.images.map(image => {
          let fileName = '';
          if (image.fileName) {
            fileName = image.fileName.includes('/')
              ? image.fileName.split('/').pop()
              : image.fileName.includes('\\')
                ? image.fileName.split('\\').pop()
                : image.fileName;
          } else if (image.url) {
            const urlParts = image.url.split('/');
            fileName = urlParts[urlParts.length - 1];
          }

          return {
            ...image,
            fileName: fileName,
            url: `/api/emergency-flow/image/${fileName}`,
            blobPath: `images/emergency-flows/${fileName}`
          };
        });

        return {
          ...step,
          images: normalizedImages
        };
      }
      return step;
    }) || [];

    const dataToSave = {
      ...flowData,
      steps: normalizedSteps,
      updatedAt: new Date().toISOString(),
      version: '1.0'
    };

    //         
    const fileName = flowData.id ? `${flowData.id}.json` : `flow-${Date.now()}.json`;

    // BLOB        
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOB             '
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    if (!(await containerClient.exists())) {
      console.log(`[api/emergency-flow]      '${containerName}'              ...`);
      await containerClient.createIfNotExists();
    }
    const blobName = norm(`troubleshooting/${fileName}`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const jsonContent = JSON.stringify(dataToSave, null, 2);
    await blockBlobClient.upload(
      jsonContent,
      Buffer.byteLength(jsonContent),
      {
        blobHTTPHeaders: {
          blobContentType: 'application/json; charset=utf-8'
        },
        metadata: {
          flowId: flowData.id || fileName.replace('.json', ''),
          title: flowData.title || 'untitled',
          updatedAt: new Date().toISOString()
        }
      }
    );

    console.log(`         : ${blobName}`);

    res.json({
      success: true,
      data: dataToSave,
      fileName: fileName,
      blobName: blobName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/emergency-flow]      :', error);
    console.error('[api/emergency-flow]      :', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      success: false,
      error: '             ',
      details: error.message,
      errorCode: error.code || 'UNKNOWN'
    });
  }
});

//             
app.put('/api/emergency-flow/:flowId', async (req, res) => {
  try {
    const { flowId } = req.params;
    const flowData = req.body;

    console.log('[api/emergency-flow]           :', {
      flowId: flowId,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0
    });

    //   URL    
    const normalizedSteps = flowData.steps?.map(step => {
      if (step.images && Array.isArray(step.images)) {
        const normalizedImages = step.images.map(image => {
          let fileName = '';
          if (image.fileName) {
            fileName = image.fileName.includes('/')
              ? image.fileName.split('/').pop()
              : image.fileName.includes('\\')
                ? image.fileName.split('\\').pop()
                : image.fileName;
          } else if (image.url) {
            const urlParts = image.url.split('/');
            fileName = urlParts[urlParts.length - 1];
          }

          return {
            ...image,
            fileName: fileName,
            url: `/api/emergency-flow/image/${fileName}`,
            blobPath: `images/emergency-flows/${fileName}`
          };
        });

        return {
          ...step,
          images: normalizedImages
        };
      }
      return step;
    }) || [];

    const dataToSave = {
      ...flowData,
      id: flowId,
      steps: normalizedSteps,
      updatedAt: new Date().toISOString(),
      version: '1.0'
    };

    // BLOB        
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOB             '
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    if (!(await containerClient.exists())) {
      console.log(`[api/emergency-flow]      '${containerName}'              ...`);
      await containerClient.createIfNotExists();
    }
    const fileName = `${flowId}.json`;
    const blobName = norm(`troubleshooting/${fileName}`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const jsonContent = JSON.stringify(dataToSave, null, 2);
    await blockBlobClient.upload(
      jsonContent,
      Buffer.byteLength(jsonContent),
      {
        blobHTTPHeaders: {
          blobContentType: 'application/json; charset=utf-8'
        },
        metadata: {
          flowId: flowId,
          title: flowData.title || 'untitled',
          updatedAt: new Date().toISOString()
        }
      }
    );

    console.log(`         : ${blobName}`);

    res.json({
      success: true,
      data: dataToSave,
      fileName: fileName,
      blobName: blobName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/emergency-flow]      :', error);
    console.error('[api/emergency-flow]      :', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      success: false,
      error: '             ',
      details: error.message,
      errorCode: error.code || 'UNKNOWN'
    });
  }
});

// 31.               
app.get('/api/emergency-flow/list', async (req, res) => {
  try {
    console.log('='.repeat(80));
    console.log('[api/emergency-flow/list]                 ');
    console.log('[api/emergency-flow/list]        :', new Date().toISOString());
    console.log('[api/emergency-flow/list] Request method:', req.method);
    console.log('[api/emergency-flow/list] Request URL:', req.url);
    console.log('[api/emergency-flow/list] Request headers:', {
      origin: req.headers.origin,
      referer: req.headers.referer,
      host: req.headers.host,
      cookie: req.headers.cookie ? 'present' : 'missing',
      'user-agent': req.headers['user-agent'],
      'x-ms-client-principal': req.headers['x-ms-client-principal'] ? '**DETECTED**' : 'not present'
    });
    
    // Easy Auth    
    if (req.headers['x-ms-client-principal']) {
      console.error('    AZURE APP SERVICE EASY AUTH IS ACTIVE    ');
      console.error('          Easy Auth                        ');
      console.error('      : Azure Portal Easy Auth        /api/*         ');
      console.error('    EASY AUTH MUST BE DISABLED FOR API ENDPOINTS    ');
    }
    console.log('='.repeat(80));

    const flows = [];

    // BLOB        
    if (!connectionString || !connectionString.trim()) {
      console.warn('[api/emergency-flow/list]    AZURE_STORAGE_CONNECTION_STRING is not configured');
      console.warn('[api/emergency-flow/list]    Connection string length:', connectionString ? connectionString.length : 0);
      console.warn('[api/emergency-flow/list]    Returning empty flow list');
      return res.json({
        success: true,
        data: flows,
        total: flows.length,
        message: 'BLOB               ',
        timestamp: new Date().toISOString()
      });
    }

    const blobServiceClient = getBlobServiceClient();

    if (!blobServiceClient) {
      console.warn('[api/emergency-flow/list]    BLOB                  ');
      console.warn('[api/emergency-flow/list]    AZURE_STORAGE_CONNECTION_STRING:', connectionString ? 'Set' : 'Not set');
      console.warn('[api/emergency-flow/list]    AZURE_STORAGE_ACCOUNT_NAME:', process.env.AZURE_STORAGE_ACCOUNT_NAME || 'Not set');
      console.warn('[api/emergency-flow/list]    AZURE_STORAGE_CONTAINER_NAME:', containerName);
      return res.json({
        success: true,
        data: flows,
        total: flows.length,
        message: 'BLOB                  ',
        timestamp: new Date().toISOString()
      });
    }

    try {
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const prefix = norm('troubleshooting/');

      console.log(`  BLOB            : prefix=${prefix}, container=${containerName}`);

      //          
      const containerExists = await containerClient.exists();
      if (!containerExists) {
        console.error(`             : ${containerName}`);
        return res.json({
          success: true,
          data: flows,
          total: flows.length,
          message: `     "${containerName}"        `,
          timestamp: new Date().toISOString()
        });
      }

      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        if (blob.name.endsWith('.json')) {
          const fileName = blob.name.split('/').pop();
          flows.push({
            id: path.basename(fileName, '.json'),
            name: fileName,
            blobName: blob.name,
            lastModified: blob.properties.lastModified,
            size: blob.properties.contentLength,
          });
        }
      }
      console.log(`  BLOB   ${flows.length}        `);
    } catch (blobError) {
      console.error('  BLOB       :', blobError);
      console.error('       :', blobError instanceof Error ? blobError.stack : blobError);
      console.error('          :', blobError instanceof Error ? blobError.message : 'Unknown error');

      //                
      if (blobError instanceof Error) {
        if (blobError.message.includes('ENOTFOUND')) {
          console.error('  DNS     :                          ');
        } else if (blobError.message.includes('403') || blobError.message.includes('Forbidden')) {
          console.error('       :                                   ');
        } else if (blobError.message.includes('404') || blobError.message.includes('Not Found')) {
          console.error('              :                             ');
        }
      }

      // BLOB                    
      return res.json({
        success: true,
        data: flows,
        total: flows.length,
        message: 'BLOB                   ',
        error: blobError instanceof Error ? blobError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: flows,
      total: flows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('            :', error);
    console.error('       :', error instanceof Error ? error.stack : error);
    console.error('          :', error instanceof Error ? error.message : 'Unknown error');

    // 403               
    if (error instanceof Error && (error.message.includes('403') || error.message.includes('Forbidden'))) {
      console.error('  403 Forbidden           ');
      console.error('         :');
      console.error('   1. Azure App Service      Easy Auth          ');
      console.error('   2.                      ');
      console.error('   3. CORS     ');
      console.error('   4. BLOB                ');
    }

    res.status(500).json({
      success: false,
      error: '               ',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

//           API
app.post('/api/chats/:chatId/export', async (req, res) => {
  try {
    const { chatId } = req.params;
    console.log('[api/chats/export]            :', chatId);

    //                       
    const exportData = req.body;

    //                 
    const formattedData = {
      chatId: chatId,
      title: exportData.title || `       ${new Date().toISOString().split('T')[0]}`,
      machineType: exportData.machineType || '',
      machineNumber: exportData.machineNumber || '',
      messages: exportData.messages || [],
      savedImages: exportData.savedImages || [],
      exportTimestamp: new Date().toISOString(),
      exportType: 'chat_export',
      version: '1.0'
    };

    //   URL    
    if (formattedData.savedImages && Array.isArray(formattedData.savedImages)) {
      formattedData.savedImages = formattedData.savedImages.map(image => {
        let fileName = '';
        if (image.fileName) {
          fileName = image.fileName.includes('/')
            ? image.fileName.split('/').pop()
            : image.fileName.includes('\\')
              ? image.fileName.split('\\').pop()
              : image.fileName;
        } else if (image.url) {
          const urlParts = image.url.split('/');
          fileName = urlParts[urlParts.length - 1];
        }

        return {
          ...image,
          fileName: fileName,
          url: `/api/images/chat-exports/${fileName}`,
          blobPath: `images/chat-exports/${fileName}`
        };
      });
    }

    //         
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const titleSlug = (formattedData.title || 'chat').replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '_').substring(0, 50);
    const filename = `${titleSlug}_${chatId}_${timestamp}.json`;

    // BLOB        
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOB             '
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`exports/${filename}`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const jsonContent = JSON.stringify(formattedData, null, 2);
    await blockBlobClient.upload(
      jsonContent,
      Buffer.byteLength(jsonContent),
      {
        blobHTTPHeaders: {
          blobContentType: 'application/json; charset=utf-8'
        },
        metadata: {
          chatId: chatId,
          title: formattedData.title,
          exportDate: new Date().toISOString()
        }
      }
    );

    console.log(`              : ${blobName}`);

    res.json({
      success: true,
      filename: filename,
      blobName: blobName,
      chatId: chatId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/chats/export]    :', error);
    res.status(500).json({
      success: false,
      error: '                  ',
      details: error.message
    });
  }
});

//         API          
app.post('/api/emergency-flow/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '              '
      });
    }

    const { stepId } = req.body;
    console.log('[api/emergency-flow/upload-image]         :', {
      fileName: req.file.originalname,
      size: req.file.size,
      stepId: stepId
    });

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOB             '
      });
    }

    //                    
    const timestamp = Date.now();
    const ext = path.extname(req.file.originalname);
    const baseName = path.basename(req.file.originalname, ext);
    const fileName = `${baseName}_${timestamp}${ext}`;

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`images/emergency-flows/${fileName}`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    //    BLOB       
    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: {
        blobContentType: req.file.mimetype
      },
      metadata: {
        originalName: req.file.originalname,
        stepId: stepId || '',
        uploadedAt: new Date().toISOString()
      }
    });

    console.log(`            : ${blobName}`);

    const imageUrl = `/api/emergency-flow/image/${fileName}`;

    res.json({
      success: true,
      imageUrl: imageUrl,
      fileName: fileName,
      imageFileName: fileName,
      blobName: blobName,
      size: req.file.size,
      isDuplicate: false
    });
  } catch (error) {
    console.error('[api/emergency-flow/upload-image]    :', error);
    res.status(500).json({
      success: false,
      error: '                ',
      details: error.message
    });
  }
});

//            API BLOB               
app.get('/api/emergency-flow/image/:fileName', async (req, res) => {
  const { fileName } = req.params;
  console.log('[api/emergency-flow/image]        :', { fileName });

  const setImageHeaders = (contentType) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  };

  const extension = path.extname(fileName || '').toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  const contentType = mimeTypes[extension] || 'application/octet-stream';

  try {
    // 1. BLOB         
    const blobServiceClient = getBlobServiceClient();
    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobName = norm(`images/emergency-flows/${fileName}`);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        if (await blockBlobClient.exists()) {
          console.log('[api/emergency-flow/image] BLOB   :', { blobName });
          const downloadResponse = await blockBlobClient.download();
          const chunks = [];
          if (downloadResponse.readableStreamBody) {
            for await (const chunk of downloadResponse.readableStreamBody) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const buffer = Buffer.concat(chunks);
            setImageHeaders(contentType);
            return res.status(200).send(buffer);
          }
          console.warn('[api/emergency-flow/image] readableStreamBody      ');
        } else {
          console.log('[api/emergency-flow/image] BLOB                  :', { blobName });
        }
      } catch (blobError) {
        console.error('[api/emergency-flow/image] BLOB                :', blobError);
      }
    } else {
      console.warn('[api/emergency-flow/image] BLOB                       ');
    }

    // BLOB          404   
    console.warn('[api/emergency-flow/image]              :', { fileName });
    return res.status(404).json({
      success: false,
      error: '           BLOB          ',
      fileName
    });
  } catch (error) {
    console.error('[api/emergency-flow/image]      :', error);
    return res.status(500).json({
      success: false,
      error: '            ',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

//         API
app.get('/api/images/chat-exports/:fileName', async (req, res) => {
  const { fileName } = req.params;
  console.log('[api/images/chat-exports]        :', { fileName });

  const setImageHeaders = (contentType) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  };

  const extension = path.extname(fileName || '').toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  const contentType = mimeTypes[extension] || 'application/octet-stream';

  try {
    // 1. BLOB         
    const blobServiceClient = getBlobServiceClient();
    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobName = norm(`images/chat-exports/${fileName}`);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        if (await blockBlobClient.exists()) {
          console.log('[api/images/chat-exports] BLOB   :', { blobName });
          const downloadResponse = await blockBlobClient.download();
          const chunks = [];
          if (downloadResponse.readableStreamBody) {
            for await (const chunk of downloadResponse.readableStreamBody) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const buffer = Buffer.concat(chunks);
            setImageHeaders(contentType);
            return res.status(200).send(buffer);
          }
          console.warn('[api/images/chat-exports] readableStreamBody      ');
        } else {
          console.log('[api/images/chat-exports] BLOB   :', { blobName });
        }
      } catch (blobError) {
        console.error('[api/images/chat-exports] BLOB     :', blobError);
      }
    } else {
      console.warn('[api/images/chat-exports] BLOB          ');
    }

    // BLOB          404   
    console.log('[api/images/chat-exports]              :', { fileName });
    return res.status(404).json({
      success: false,
      error: '           BLOB          ',
      fileName: fileName
    });
  } catch (error) {
    console.error('[api/images/chat-exports]      :', error);
    return res.status(500).json({
      success: false,
      error: '            ',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

//             API            
app.post('/api/history/upload-image', upload.single('image'), async (req, res) => {
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: '              '
        });
      }

      console.log(`[api/history/upload-image]            ${attempt}/${maxRetries}:`, {
        fileName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        console.error('[api/history/upload-image] BLOB service client is not available');
        return res.status(503).json({
          success: false,
          error: 'BLOB             ',
          details: 'BLOB                             '
        });
      }

      //                    
      const timestamp = Date.now();
      const ext = path.extname(req.file.originalname);
      const baseName = path.basename(req.file.originalname, ext);
      const fileName = `chat_image_${timestamp}${ext}`;

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobName = norm(`images/chat-exports/${fileName}`);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      //                    
      const containerExists = await containerClient.exists();
      if (!containerExists) {
        console.log(`[api/history/upload-image]      '${containerName}'              ...`);
        await containerClient.createIfNotExists();
        console.log(`[api/history/upload-image]      '${containerName}'        `);
      }

      //    BLOB                 
      const uploadPromise = blockBlobClient.uploadData(req.file.buffer, {
        blobHTTPHeaders: {
          blobContentType: req.file.mimetype
        },
        metadata: {
          originalName: req.file.originalname,
          uploadedAt: new Date().toISOString()
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('BLOB upload timeout (30s)')), 30000);
      });

      await Promise.race([uploadPromise, timeoutPromise]);

      console.log(`                : ${blobName}`);

      // API          URL    Blob  URL     
      const imageUrl = `/api/images/chat-exports/${fileName}`;

      return res.json({
        success: true,
        imageUrl: imageUrl,
        fileName: fileName,
        blobName: blobName,
        size: req.file.size
      });
    } catch (error) {
      lastError = error;
      console.error(`[api/history/upload-image]    ${attempt}/${maxRetries}    :`, error.message);

      // DNS                
      if (error.message && error.message.includes('ENOTFOUND')) {
        console.error('[api/history/upload-image] DNS     :', {
          message: error.message,
          connectionString: connectionString ? `Set (length: ${connectionString.length})` : 'Not set',
          accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || 'Not set',
          containerName: containerName
        });
      }

      //                
      if (attempt < maxRetries) {
        const retryDelay = attempt * 1000; // 1  2  3 ...
        console.log(`[api/history/upload-image] ${retryDelay}ms         ...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
    }
  }

  //                
  console.error('[api/history/upload-image]                :', lastError);
  const errorMessage = lastError?.message || 'Unknown error';
  const isDnsError = errorMessage.includes('ENOTFOUND');

  return res.status(500).json({
    success: false,
    error: '                ',
    details: isDnsError
      ? 'BLOB                                      '
      : errorMessage,
    retries: maxRetries,
    errorType: isDnsError ? 'DNS_ERROR' : 'BLOB_ERROR'
  });
});

//       API     -      
app.post('/api/chats/:chatId/send', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { chatData, exportType } = req.body;

    console.log('  /api/chats/:chatId/send           ');
    console.log('             :', {
      method: req.method,
      url: req.url,
      chatId: chatId,
      exportType: exportType,
      messageCount: chatData?.messages?.length || 0,
      machineInfo: chatData?.machineInfo
    });

    //           
    if (!chatData || !chatData.messages || !Array.isArray(chatData.messages)) {
      return res.status(400).json({
        error: 'Invalid chat data format',
        details: 'chatData.messages must be an array'
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOB             '
      });
    }

    //           
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    //                             
    const userMessages = chatData.messages.filter((m) => !m.isAiResponse);
    const textMessages = userMessages
      .map((m) => m.content)
      .filter((content) => content && !content.trim().startsWith('data:image/'))
      .join('\n')
      .trim();

    let incidentTitle = '    ';
    if (textMessages) {
      incidentTitle = textMessages.split('\n')[0].trim();
    } else {
      incidentTitle = '         ';
    }

    //                  
    const sanitizedTitle = incidentTitle
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    const fileName = `${sanitizedTitle}_${chatId}_${timestamp}.json`;

    //                   BLOB   
    const savedImages = [];
    const cleanedChatData = JSON.parse(JSON.stringify(chatData));

    for (const message of cleanedChatData.messages) {
      if (message.content && message.content.startsWith('data:image/')) {
        try {
          const base64Data = message.content.replace(/^data:image\/[a-z]+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');

          const imageTimestamp = Date.now();
          const imageFileName = `chat_image_${chatId}_${imageTimestamp}.jpg`;

          const containerClient = blobServiceClient.getContainerClient(containerName);
          const blobName = norm(`images/chat-exports/${imageFileName}`);
          const blockBlobClient = containerClient.getBlockBlobClient(blobName);

          await blockBlobClient.uploadData(buffer, {
            blobHTTPHeaders: {
              blobContentType: 'image/jpeg'
            },
            metadata: {
              chatId: chatId,
              uploadedAt: new Date().toISOString()
            }
          });

          // API          URL    Blob  URL     
          const imageUrl = `/api/images/chat-exports/${imageFileName}`;
          savedImages.push({
            fileName: imageFileName,
            blobName: blobName,
            url: imageUrl,
            timestamp: imageTimestamp
          });

          //                  
          message.content = `[  : ${imageFileName}]`;
          message.imageUrl = imageUrl;
        } catch (error) {
          console.error('       :', error);
        }
      }
    }

    //         JSON     
    const exportData = {
      chatId: chatId,
      title: `${incidentTitle} (${chatId})`,
      machineType: chatData.machineInfo?.type || '',
      machineNumber: chatData.machineInfo?.number || '',
      messages: cleanedChatData.messages,
      savedImages: savedImages,
      exportTimestamp: new Date().toISOString(),
      exportType: exportType || 'chat_export',
      version: '1.0'
    };

    // BLOB        
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`exports/${fileName}`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.upload(
      JSON.stringify(exportData, null, 2),
      JSON.stringify(exportData, null, 2).length,
      {
        blobHTTPHeaders: {
          blobContentType: 'application/json'
        },
        metadata: {
          chatId: chatId,
          exportType: exportType || 'chat_export',
          exportedAt: new Date().toISOString()
        }
      }
    );

    console.log(`             : ${blobName}`);
    console.log(`          : ${savedImages.length}`);

    res.json({
      success: true,
      message: '           ',
      chatId: chatId,
      fileName: fileName,
      blobName: blobName,
      savedImagesCount: savedImages.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/chats/send]    :', error);
    res.status(500).json({
      success: false,
      error: '              ',
      details: error.message
    });
  }
});

//            API
app.get('/api/emergency-flow/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[api/emergency-flow/detail]        : ${id}`);

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      console.error(`  BLOB                  : ${id}`);
      return res.status(503).json({
        success: false,
        error: 'BLOB             '
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`troubleshooting/${id}.json`);
    console.log(`  BLOB    : ${blobName}, container=${containerName}`);
    const blobClient = containerClient.getBlobClient(blobName);

    try {
      const downloadResponse = await blobClient.download();
      const downloaded = await streamToBuffer(downloadResponse.readableStreamBody);
      const flowData = JSON.parse(downloaded.toString('utf-8'));

      console.log(`           : ${id}`);

      res.json({
        success: true,
        data: flowData
      });
    } catch (blobError) {
      console.error(`  BLOB     : ${blobName}`, blobError);
      console.error(`       :`, blobError instanceof Error ? blobError.stack : blobError);
      res.status(404).json({
        success: false,
        error: '             ',
        details: blobError instanceof Error ? blobError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('[api/emergency-flow/detail]    :', error);
    console.error('[api/emergency-flow/detail]      :', error instanceof Error ? error.stack : error);
    res.status(500).json({
      success: false,
      error: '               ',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

//       : Stream        
async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}

//         JSON      API
app.get('/api/history/exports/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    console.log(`[api/history/exports]       : ${fileName}`);

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOB             ',
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`exports/${fileName}`);
    const blobClient = containerClient.getBlobClient(blobName);

    const downloadResponse = await blobClient.download();
    const contentType = downloadResponse.contentType || 'application/json';

    res.setHeader('Content-Type', contentType);
    downloadResponse.readableStreamBody.pipe(res);
  } catch (error) {
    console.error('           :', error);
    res.status(404).json({
      success: false,
      error: '            ',
      details: error.message,
    });
  }
});

//     API         BLOB        
app.delete('/api/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`            : ${id}`);

    const projectRoot = path.resolve(__dirname, '..');
    const exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');
    const imageDir = path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');

    let foundFile = null;
    let jsonData = null;
    let deletedFromBlob = false;
    let deletedFromLocal = false;

    // BLOB                 
    const blobServiceClient = getBlobServiceClient();
    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const prefix = norm('exports/');

        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
          if (!blob.name.endsWith('.json') || blob.name.includes('.backup.')) continue;

          const fileName = blob.name.split('/').pop();
          const fileNameWithoutExt = fileName.replace('.json', '');
          const uuidMatch = fileNameWithoutExt.match(/_([a-f0-9-]{36})_/);
          const fileId = uuidMatch ? uuidMatch[1] : fileNameWithoutExt;

          if (fileId === id || fileNameWithoutExt === id) {
            foundFile = fileName;
            console.log(`  BLOB                  : ${foundFile}`);

            // JSON                 
            const blobClient = containerClient.getBlobClient(blob.name);
            try {
              const downloadResponse = await blobClient.download();
              let content = '';
              if (downloadResponse.readableStreamBody) {
                for await (const chunk of downloadResponse.readableStreamBody) {
                  content += chunk.toString();
                }
              }
              jsonData = JSON.parse(content);
              console.log(`  BLOB  JSON          : ${foundFile}`);
            } catch (readError) {
              console.warn(`   BLOB  JSON           : ${foundFile}`, readError.message);
            }

            // BLOB         
            await blobClient.delete();
            deletedFromBlob = true;
            console.log(`   BLOB         : ${blob.name}`);
            break;
          }
        }
      } catch (blobError) {
        console.error('  BLOB          :', blobError);
      }
    }

    //                    BLOB        

    if (!foundFile) {
      console.log(`                         ID: ${id}`);
      return res.status(404).json({
        success: false,
        error: '          ',
        searchId: id,
        timestamp: new Date().toISOString()
      });
    }

    //          
    const imagesToDelete = [];
    if (jsonData && jsonData.savedImages && Array.isArray(jsonData.savedImages)) {
      jsonData.savedImages.forEach((img) => {
        if (typeof img === 'object' && img.fileName) {
          imagesToDelete.push(img.fileName);
        } else if (typeof img === 'string' && img.includes('/')) {
          const fileName = img.split('/').pop();
          if (fileName) {
            imagesToDelete.push(fileName);
          }
        }
      });
      console.log(`  JSON         : ${imagesToDelete.length}`);
    }

    let deletedImagesCount = 0;

    // BLOB            
    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const imagePrefix = norm('images/chat-exports/');

        for await (const blob of containerClient.listBlobsFlat({ prefix: imagePrefix })) {
          const imageFileName = blob.name.split('/').pop();
          if (imagesToDelete.includes(imageFileName) ||
            (imageFileName.includes(id) && (imageFileName.endsWith('.jpg') || imageFileName.endsWith('.jpeg') || imageFileName.endsWith('.png')))) {
            try {
              const blobClient = containerClient.getBlobClient(blob.name);
              await blobClient.delete();
              deletedImagesCount++;
              console.log(`   BLOB           : ${imageFileName}`);
            } catch (error) {
              console.warn(`   BLOB              : ${imageFileName}`, error.message);
            }
          }
        }
      } catch (blobError) {
        console.error('  BLOB            :', blobError);
      }
    }

    //                    BLOB        

    console.log(`        : ${foundFile},   ${deletedImagesCount}   `);

    res.json({
      success: true,
      message: '         ',
      id: id,
      fileName: foundFile,
      deletedFromBlob: deletedFromBlob,
      deletedFromLocal: deletedFromLocal,
      deletedImages: deletedImagesCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('         :', error);
    res.status(500).json({
      success: false,
      error: '            ',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

//      JSON      API
app.get('/api/emergency-flow/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    console.log(`[api/emergency-flow]       : ${fileName}`);

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      console.error(`  BLOB                  : ${fileName}`);
      return res.status(503).json({
        success: false,
        error: 'BLOB             ',
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`troubleshooting/${fileName}`);
    console.log(`  BLOB    : ${blobName}, container=${containerName}`);
    const blobClient = containerClient.getBlobClient(blobName);

    const downloadResponse = await blobClient.download();
    const contentType = downloadResponse.contentType || 'application/json';

    res.setHeader('Content-Type', contentType);
    downloadResponse.readableStreamBody.pipe(res);
  } catch (error) {
    console.error('           :', error);
    console.error('       :', error instanceof Error ? error.stack : error);
    res.status(404).json({
      success: false,
      error: '            ',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

//         API    
app.get('/api/images/:category/:fileName', async (req, res) => {
  try {
    const { category, fileName } = req.params;
    console.log(`[api/images]     : ${category}/${fileName}`);

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOB             ',
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`images/${category}/${fileName}`);
    const blobClient = containerClient.getBlobClient(blobName);

    const downloadResponse = await blobClient.download();
    const contentType = downloadResponse.contentType || 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1      
    downloadResponse.readableStreamBody.pipe(res);
  } catch (error) {
    console.error('         :', error);
    res.status(404).json({
      success: false,
      error: '          ',
      details: error.message,
    });
  }
});

// =====      Vite    & SPA =====
// Azure App Service             
const clientDistPaths = [
  join(__dirname, 'client/dist'),      // Azure       
  join(__dirname, '../client/dist'),   //        
  join(process.cwd(), 'client/dist')   //           
];

let clientDistPath = null;
for (const testPath of clientDistPaths) {
  const indexPath = join(testPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    clientDistPath = testPath;
    console.log('  Client files found at:', clientDistPath);
    break;
  } else {
    console.log('  Client files not found at:', testPath);
  }
}

if (!clientDistPath) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('   Client dist directory not found - Running in API-only mode');
    console.warn('  Expected to use Vite dev server at http://localhost:5173');
    console.warn('  To build client files, run: npm run build:client');
  } else {
    console.warn('   WARNING: Client dist directory not found in any expected location');
    console.warn('  Checked paths:', clientDistPaths);
    console.warn('  Current working directory:', process.cwd());
    console.warn('  __dirname:', __dirname);
    console.warn('   Server will continue in API-ONLY mode (Frontend should be hosted separately)');
    // process.exit(1); //     : API                   
  }
} else {
  app.use(express.static(clientDistPath, {
    maxAge: '7d', etag: true, lastModified: true, immutable: true
  }));

  // API    index.html   API           
  app.get(/^(?!\/api).*/, (_req, res) => {
    const indexPath = join(clientDistPath, 'index.html');
    res.sendFile(indexPath);
  });
}

// Generic Files API for Blob Storage (Missing in original migration)
app.get('/api/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    console.log(`[api/files] Request for: ${filename}`);

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({ error: 'Blob storage not available' });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Try different possible paths
    // 1. Direct match (if filename contains path)
    // 2. documents/ folder
    // 3. uploads/ folder
    // 4. images/ folder
    const possiblePaths = [
      norm(filename),
      norm(`documents/${filename}`),
      norm(`uploads/${filename}`),
      norm(`images/${filename}`)
    ];

    for (const blobPath of possiblePaths) {
      try {
        const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
        if (await blockBlobClient.exists()) {
          console.log(`[api/files] Found at: ${blobPath}`);
          const downloadResponse = await blockBlobClient.download();
          
          if (downloadResponse.contentType) {
            res.setHeader('Content-Type', downloadResponse.contentType);
          }
          res.setHeader('Cache-Control', 'public, max-age=86400');
          
          downloadResponse.readableStreamBody.pipe(res);
          return;
        }
      } catch (e) {
        // Ignore error and try next path
      }
    }

    console.log(`[api/files] Not found: ${filename}`);
    res.status(404).json({ error: 'File not found' });

  } catch (error) {
    console.error('[api/files] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Also add /api/uploads for compatibility
app.get('/api/uploads/:filename', async (req, res) => {
  // Redirect to /api/files logic
  req.url = `/api/files/${req.params.filename}`;
  app.handle(req, res);
});

// ===== 404                          =====
app.use((req, res, next) => {
  console.warn('   404 Not Found:', {
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      'user-agent': req.headers['user-agent'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-original-url': req.headers['x-original-url']
    },
    timestamp: new Date().toISOString()
  });

  // 404            
  if (req.path.startsWith('/api/')) {
    console.error('  API endpoint not found:', req.path);
    console.error('  This could indicate:');
    console.error('   1. Route not registered in azure-server.mjs');
    console.error('   2. IIS/iisnode routing issue');
    console.error('   3. Request not reaching Express app');

    //          
    const allRoutes = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        allRoutes.push(middleware.route.path);
      }
    });

    const similarRoutes = allRoutes.filter(route =>
      route.includes(req.path.split('/').pop()) ||
      req.path.includes(route.split('/').pop())
    );

    if (similarRoutes.length > 0) {
      console.warn('  Similar routes found:', similarRoutes);
    }
  }

  res.status(404).json({
    error: 'not_found',
    message: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// =====             =====
app.use((err, req, res, _next) => {
  console.error('  Unhandled Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Application Insights                
  if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    console.log('  Error logged to Application Insights');
  }

  res.status(500).json({
    error: 'internal_error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// =====          =====
//                         

//                       
let server;

const shutdown = (sig) => () => {
  console.log(`    Received ${sig}, shutting down gracefully...`);
  if (server) {
    server.close(() => {
      if (dbPool) {
        dbPool.end(() => {
          console.log('Database pool closed');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
    setTimeout(() => process.exit(1), 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));

//                          
process.on('uncaughtException', (err) => {
  console.error('   Uncaught Exception (continuing):', err);
  console.error('Stack trace:', err.stack);
  //             -       
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('   Unhandled Promise Rejection (continuing):', reason);
  console.error('Promise:', promise);
  //             -       
});

//               
server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('');
  console.log('  ================================================');
  console.log('  Azure Production Server Started Successfully!');
  console.log('  ================================================');
  console.log('');
  console.log(`  Server listening on: http://0.0.0.0:${PORT}`);
  console.log(`  Public URL: https://${process.env.WEBSITE_HOSTNAME || 'localhost'}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`  Node Version: ${process.version}`);
  console.log(`  Started at: ${new Date().toISOString()}`);
  console.log('');

  //                           
  console.log('  Running startup sequence (background)...');
  startupSequence().catch(err => {
    console.error('  Startup sequence error (non-fatal):', err.message);
  });

  // BLOB           
  console.log('  Testing BLOB connection...');

  //        AccountName         
  if (connectionString) {
    try {
      const accountNameMatch = connectionString.match(/AccountName=([^;]+)/);
      if (accountNameMatch) {
        const accountName = accountNameMatch[1];
        console.log(`  Storage Account Name from connection string: ${accountName}`);
        console.log(`  Expected BLOB URL: https://${accountName}.blob.core.windows.net`);
      } else {
        console.warn('   Could not extract AccountName from connection string');
      }
    } catch (parseError) {
      console.warn('   Error parsing connection string:', parseError.message);
    }
  }

  // BLOB                            
  (async () => {
    try {
      console.log('  Starting BLOB connection test...');
      const blobServiceClient = getBlobServiceClient();
      if (blobServiceClient) {
        try {
          const containerClient = blobServiceClient.getContainerClient(containerName);
          console.log(`  Attempting to check container: ${containerName}`);
          const exists = await containerClient.exists();
          if (exists) {
            console.log(`  BLOB Storage: Connected (container: ${containerName})`);
          } else {
            console.warn(`   BLOB Storage: Connected but container '${containerName}' does not exist`);
            console.warn('   Attempting to create container...');
            try {
              await containerClient.createIfNotExists();
              console.log(`  BLOB Storage: Container '${containerName}' created successfully`);
            } catch (createError) {
              console.error(`  BLOB Storage: Failed to create container: ${createError.message}`);
              console.error(`  Error details:`, createError instanceof Error ? createError.stack : createError);
            }
          }
        } catch (testError) {
          console.error(`  BLOB Storage: Connection test failed: ${testError.message}`);
          console.error(`  Error type: ${testError.constructor.name}`);
          console.error(`  Error details:`, testError instanceof Error ? testError.stack : testError);

          // DNS             AccountName   
          if (testError.message && testError.message.includes('ENOTFOUND')) {
            console.error('  DNS resolution failed - this usually means:');
            console.error('   1. The storage account name in the connection string is incorrect');
            console.error('   2. The storage account does not exist');
            console.error('   3. Network connectivity issues');
            if (connectionString) {
              const accountNameMatch = connectionString.match(/AccountName=([^;]+)/);
              if (accountNameMatch) {
                console.error(`   Current AccountName in connection string: ${accountNameMatch[1]}`);
                console.error(`   Please verify this matches your actual Azure Storage account name`);
              }
            }
            // AZURE_STORAGE_ACCOUNT_NAME       
            if (process.env.AZURE_STORAGE_ACCOUNT_NAME) {
              console.error(`   AZURE_STORAGE_ACCOUNT_NAME env var: ${process.env.AZURE_STORAGE_ACCOUNT_NAME}`);
            } else {
              console.error('   AZURE_STORAGE_ACCOUNT_NAME env var: not set');
            }
          }
        }
      } else {
        console.warn('   BLOB Storage: Not configured or connection failed');
        console.warn('   getBlobServiceClient() returned null');
        console.warn('   Connection string:', connectionString ? `Set (length: ${connectionString.length})` : 'Not set');
      }
    } catch (error) {
      console.error('  BLOB connection test error:', error);
    }
  })();
  console.log('');

  console.log('  Available Endpoints:');
  console.log('   GET  /health -        ');
  console.log('   GET  /api/ping - Ping');
  console.log('   POST /api/auth/login -     ');
  console.log('   GET  /api/auth/me -        ');
  console.log('   GET  /api/users -       ');
  console.log('   POST /api/users -       ');
  console.log('   PUT  /api/users/:id -       ');
  console.log('   DELETE /api/users/:id -       ');
  console.log('   GET  /api/machines -      ');
  console.log('   POST /api/machines -     ');
  console.log('   PUT  /api/machines/:id -     ');
  console.log('   DELETE /api/machines/:id -     ');
  console.log('   GET  /ready -        ');
  console.log('');
  console.log('  Server is ready to accept connections!');
  console.log('  ================================================');
});

//          
server.on('error', (error) => {
  console.error('  Server error:', error);
  console.error('  Error code:', error.code);
  console.error('  Error message:', error.message);
  console.error('  Error stack:', error.stack);

  if (error.code === 'EADDRINUSE') {
    console.error(`  Port ${PORT} is already in use`);
    process.exit(1);
  } else if (error.code === 'EACCES') {
    console.error(`  Permission denied to bind to port ${PORT}`);
    process.exit(1);
  } else {
    console.error('  Unexpected server error, but continuing...');
  }
});

//                 
process.on('uncaughtException', (error) => {
  console.error('  Uncaught Exception:', error);
  console.error('  Stack:', error.stack);
  // Azure App Service              Azure    
  console.log('   Server continuing after uncaught exception...');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('  Unhandled Rejection at:', promise);
  console.error('  Reason:', reason);
  // Azure App Service         
  console.log('   Server continuing after unhandled rejection...');
});

console.log('  Global error handlers registered');

export default app;
