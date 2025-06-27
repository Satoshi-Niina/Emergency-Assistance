import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import memorystore from 'memorystore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const createApp = async () => {
  console.log('[INFO] Creating Express application...');
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  const corsOptions = {
    origin: isProduction
      ? [process.env.FRONTEND_URL || 'http://localhost:5000']
      : ['http://localhost:5000', 'http://localhost:5173', 'https://*.replit.dev'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  };
  app.use(cors(corsOptions));

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  const MemoryStoreSession = memorystore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'emergency-recovery-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({ checkPeriod: 86400000 }),
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 86400000,
      sameSite: isProduction ? 'strict' : 'lax'
    }
  }));

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      processId: process.pid,
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  if (isProduction) {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
      }
    });
  }

  try {
    app.use('/images', express.static(path.join(process.cwd(), 'public', 'images')));
    app.use('/knowledge-base/images', express.static(path.join(process.cwd(), 'knowledge-base', 'images')));
    app.use('/knowledge-base/data', express.static(path.join(process.cwd(), 'knowledge-base', 'data')));
    console.log('✅ 静的ファイル設定完了');
  } catch (err) {
    console.error('❌ 静的ファイル設定エラー:', err);
  }

  app.use((err, _req, res, _next) => {
    console.error('Server error:', err);
    res.status(500).json({
      message: isProduction ? 'Internal Server Error' : err.message,
      ...(isProduction ? {} : { stack: err.stack })
    });
  });

  return app;
};

// ✅ 起動処理
const port = process.env.PORT || 3000;
createApp().then(app => {
  app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
  });
}).catch(err => {
  console.error('❌ Failed to start server:', err);
});
