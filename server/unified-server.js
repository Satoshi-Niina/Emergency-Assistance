// ...existing code...
// import imageStorageRouter from './routes/routes/image-storage.js'; // CommonJS形式のため一時的にコメントアウト
// ...existing code...

// 統合開発サーバー - フロントエンドとバックエンドを統合
// ホットリロード対応、ビルド不要、元データから直接起動
// UTF-8 (BOMなし) エンコード標準

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import multer from 'multer';

// ESモジュール用の__dirname定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import jwt from 'jsonwebtoken';
import { spawn } from 'child_process';
import { registerChatRoutes } from './routes/chat.js';
import faultHistoryRouter from './routes/fault-history.js';

// UTF-8環境設定
process.env.NODE_OPTIONS = '--max-old-space-size=4096';
process.stdout.setEncoding('utf8');
process.stderr.setEncoding('utf8');

// ...existing code...
// ...existing code...
// ...existing code...
// 画像APIルーターを /api/images にマウント
// apiRouter.use('/images', imageStorageRouter); // 一時的にコメントアウト

const app = express();
const PORT = process.env.PORT || 8080;
const CLIENT_PORT = process.env.CLIENT_PORT || 5173;

// 開発環境の判定
const isDevelopment = process.env.NODE_ENV === 'development';

// データベース接続プール
let dbPool = null;

// データベース初期化
function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL is not set - running without database');
    return;
  }

  try {
    console.log('🔗 Initializing database connection...');
    
    const isLocalhost = process.env.DATABASE_URL.includes('localhost') || 
                       process.env.DATABASE_URL.includes('127.0.0.1');
    
    const sslConfig = isLocalhost 
      ? false
      : process.env.PG_SSL === 'require' 
      ? { rejectUnauthorized: false }
      : process.env.PG_SSL === 'disable' 
      ? false 
      : { rejectUnauthorized: false };
    
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 60000,
    });

    console.log('✅ Database pool initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

// データベース初期化
initializeDatabase();

// knowledge-base / images のパス解決ヘルパー
function getKnowledgeBaseDir() {
  // 環境変数が設定されている場合はそれを優先
  if (process.env.KNOWLEDGE_BASE_PATH) {
    const resolved = path.resolve(process.cwd(), process.env.KNOWLEDGE_BASE_PATH);
    if (fs.existsSync(resolved)) return resolved;
    // 環境変数で指定したパスが存在しない場合はログを出すが、フォールバックを続行する
    console.warn('指定された KNOWLEDGE_BASE_PATH が見つかりません:', resolved);
  }

  const candidate1 = path.join(process.cwd(), 'knowledge-base');
  if (fs.existsSync(candidate1)) return candidate1;

  const candidate2 = path.join(process.cwd(), '..', 'knowledge-base');
  if (fs.existsSync(candidate2)) return candidate2;

  return null;
}

function getImagesRoot() {
  if (process.env.IMAGES_BASE_PATH) {
    const resolved = path.resolve(process.cwd(), process.env.IMAGES_BASE_PATH);
    if (fs.existsSync(resolved)) return resolved;
    console.warn('指定された IMAGES_BASE_PATH が見つかりません:', resolved);
  }

  // __dirname基準でプロジェクトルート直下のknowledge-base/imagesを探す（最優先）
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dirnameBasedRoot = path.resolve(__dirname, '..', 'knowledge-base', 'images');
  if (fs.existsSync(dirnameBasedRoot)) {
    console.log(`✅ getImagesRoot: __dirname基準で発見: ${dirnameBasedRoot}`);
    return dirnameBasedRoot;
  }

  // デフォルト: プロジェクト上位の knowledge-base/images
  const defaultRoot = path.join(process.cwd(), '..', 'knowledge-base', 'images');
  if (fs.existsSync(defaultRoot)) {
    console.log(`✅ getImagesRoot: process.cwd()基準で発見: ${defaultRoot}`);
    return defaultRoot;
  }

  // フォールバック: process.cwd()直下
  const fallback = path.join(process.cwd(), 'knowledge-base', 'images');
  if (fs.existsSync(fallback)) {
    console.log(`✅ getImagesRoot: フォールバックで発見: ${fallback}`);
    return fallback;
  }

  console.warn(`⚠️ getImagesRoot: 画像ディレクトリが見つかりません`);
  return null;
}

// CORS設定
const corsOrigins = process.env.CORS_ALLOW_ORIGINS?.split(',') || ['*'];
app.use(cors({
  origin: corsOrigins.includes('*') ? true : corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires']
}));

// ミドルウェア
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// セッション管理（開発用）
app.use(session({
  secret: process.env.SESSION_SECRET || 'local-dev-session-secret-key-32-chars',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  },
  name: 'sessionId'
}));

// UTF-8レスポンス設定
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Vite開発サーバーへのプロキシ設定
let viteServer = null;

function startViteServer() {
  if (viteServer) {
    console.log('🔄 Restarting Vite server...');
    viteServer.kill();
  }

  console.log('🚀 Starting Vite development server...');
  
  const clientDir = path.join(__dirname, '..', 'client');
  
  // Windows環境でのnpmコマンドの解決
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  
  viteServer = spawn(npmCommand, ['run', 'dev'], {
    cwd: clientDir,
    stdio: 'pipe',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      PORT: CLIENT_PORT,
      VITE_API_BASE_URL: '/api'
    }
  });

  viteServer.stdout.on('data', (data) => {
    const output = data.toString('utf8');
    console.log('Vite:', output.trim());
    if (output.includes('Local:') || output.includes('ready')) {
      console.log('✅ Vite server started');
    }
  });

  viteServer.stderr.on('data', (data) => {
    console.error('Vite error:', data.toString('utf8').trim());
  });

  viteServer.on('error', (error) => {
    console.error('❌ Failed to start Vite server:', error);
  });

  viteServer.on('exit', (code) => {
    console.log(`🛑 Vite server exited with code ${code}`);
    viteServer = null;
  });
}

// Viteサーバー起動
startViteServer();

// Vite開発サーバーへのプロキシ（WebSocket対応）
app.use('/', (req, res, next) => {
  // APIルートは除外
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Viteサーバーが起動していない場合は待機
  if (!viteServer) {
    return res.status(503).send('Vite server is starting, please wait...');
  }
  
  // Viteサーバーへのプロキシ
  const proxyUrl = `http://localhost:${CLIENT_PORT}${req.path}`;
  
  fetch(proxyUrl)
    .then(response => {
      if (response.ok) {
        response.text().then(text => {
          res.set(response.headers);
          res.send(text);
        });
      } else {
        res.status(response.status).send(response.statusText);
      }
    })
    .catch(error => {
      console.error('Proxy error:', error);
      res.status(503).send('Vite server not available');
    });
});

// JWT認証ミドルウェア
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'access_token_required',
      message: 'アクセストークンが必要です' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-32-characters-long', (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        error: 'invalid_token',
        message: '無効なトークンです' 
      });
    }
    req.user = user;
    next();
  });
}

// NOTE: /api/auth/me handler moved below after apiRouter is created

// Multer設定（画像アップロード用）
const upload = multer({ storage: multer.memoryStorage() });

// API router
const apiRouter = express.Router();

// /api/auth/me handler (moved here so apiRouter exists)
apiRouter.get('/auth/me', (req, res) => {
  try {
    console.log('[api/auth/me] セッション確認（unified）:', { hasSession: !!req.session, hasUser: !!req.session?.user });

    // 開発環境で認証をスキップ
    if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
      if (!req.session) {
        req.session = {};
      }
      if (!req.session.userId) {
        req.session.userId = 'dev-user-123';
        req.session.user = { id: 'dev-user-123', username: 'dev-user', role: 'admin' };
      }
      console.log('🔓 開発環境: 認証をスキップしてデモユーザーを返します');
      return res.json({ success: true, user: req.session.user, message: '開発環境: デモユーザー' });
    }

    if (req.session && req.session.user) {
      return res.json({ success: true, user: req.session.user, message: 'セッションからユーザー情報を取得しました' });
    }

    if (process.env.BYPASS_DB_FOR_LOGIN === 'true' || process.env.BYPASS_DB_FOR_LOGIN === '1') {
      const demoUser = { id: 1, username: 'admin', role: 'admin', displayName: 'Local Admin' };
      return res.json({ success: true, user: demoUser, message: 'デモユーザーを返しました（BYPASS_DB_FOR_LOGIN）' });
    }

    return res.status(401).json({ success: false, message: 'ログインしていません' });
  } catch (error) {
    console.error('[api/auth/me] エラー:', error);
    res.status(500).json({ success: false, message: 'サーバーエラー' });
  }
});

// ヘルスチェック
apiRouter.get('/health', async (req, res) => {
  try {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Emergency Assistance API',
      database: dbPool ? 'connected' : 'disconnected',
      vite: viteServer ? 'running' : 'stopped',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 認証API
apiRouter.post('/auth/login', async (req, res) => {
  try {
    console.log('Login attempt received:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ 
        success: false, 
        error: 'bad_request',
        message: 'ユーザー名とパスワードが必要です'
      });
    }

    console.log(`Attempting login for user: ${username}`);
    console.log(`Database pool available: ${!!dbPool}`);

    // データベース認証を試行
    if (dbPool) {
      try {
        console.log('Attempting database authentication...');
        const result = await dbPool.query(
          'SELECT id, username, password, role, display_name, department FROM users WHERE username = $1 LIMIT 1',
          [username]
        );
        
        if (result.rows.length === 0) {
          console.log('User not found in database');
          return res.status(401).json({ 
            success: false, 
            error: 'invalid_credentials',
            message: 'ユーザー名またはパスワードが正しくありません'
          });
        }
        
        const user = result.rows[0];
        console.log('User found in database:', user.username);
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
          console.log('Password validation failed');
          return res.status(401).json({ 
            success: false, 
            error: 'invalid_credentials',
            message: 'ユーザー名またはパスワードが正しくありません'
          });
        }
        
        console.log('Database authentication successful');
        
        // JWTトークンを生成
        const token = jwt.sign(
          { 
            id: user.id, 
            username: user.username, 
            role: user.role 
          },
          process.env.JWT_SECRET || 'dev-secret-key-32-characters-long',
          { expiresIn: '24h' }
        );
        
        // セッションにもユーザー情報を保存
        if (req.session) {
          req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            displayName: user.display_name,
            department: user.department
          };
        }

        res.json({ 
          success: true, 
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            displayName: user.display_name,
            display_name: user.display_name,
            department: user.department
          },
          token: token,
          message: 'ログインに成功しました'
        });
      } catch (dbError) {
        console.error('Database error, falling back to simple auth:', dbError.message);
        return handleSimpleAuth(username, password, res);
      }
    } else {
      return handleSimpleAuth(username, password, res);
    }

    function handleSimpleAuth(username, password, res) {
      console.log('Using simple authentication without database');
      console.log(`Provided credentials: username="${username}", password="${password}"`);
      
      const testUsers = {
        'admin': { password: 'admin', role: 'admin', displayName: 'Administrator', department: 'IT' },
        'niina': { password: 'G&896845', role: 'admin', displayName: 'Satoshi Niina', department: 'IT' }
      };
      
      const user = testUsers[username];
      if (user && password === user.password) {
        console.log('Simple authentication successful');
        
        // JWTトークンを生成
        const token = jwt.sign(
          { 
            id: 1, 
            username: username, 
            role: user.role 
          },
          process.env.JWT_SECRET || 'dev-secret-key-32-characters-long',
          { expiresIn: '24h' }
        );
        
        // セッションに保存
        if (req.session) {
          req.session.user = {
            id: 1,
            username: username,
            role: user.role,
            displayName: user.displayName,
            department: user.department
          };
        }

        return res.json({ 
          success: true, 
          user: { 
            id: 1, 
            username: username, 
            role: user.role,
            displayName: user.displayName,
            display_name: user.displayName,
            department: user.department
          },
          token: token,
          message: 'ログインに成功しました'
        });
      } else {
        console.log('Simple authentication failed - invalid credentials');
        return res.status(401).json({ 
          success: false, 
          error: 'invalid_credentials',
          message: 'ユーザー名またはパスワードが正しくありません'
        });
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'internal_server_error',
      message: 'サーバーエラーが発生しました'
    });
  }
});

apiRouter.post('/auth/logout', (req, res) => {
  res.json({ 
    success: true, 
    message: 'ログアウトしました'
  });
});

// 機種一覧取得API
apiRouter.get('/machines/machine-types', async (req, res) => {
  try {
    console.log('🔍 機種一覧取得リクエスト');
    
    if (dbPool) {
      try {
        const result = await dbPool.query(`
          SELECT id, machine_type_name as machine_type_name 
          FROM machine_types 
          ORDER BY machine_type_name
        `);
        
        return res.json({
          success: true,
          data: result.rows,
          total: result.rows.length,
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
      }
    }
    
    const dummyData = [
      { id: '1', machine_type_name: 'MT-100' },
      { id: '2', machine_type_name: 'MR-400' },
      { id: '3', machine_type_name: 'TC-250' },
      { id: '4', machine_type_name: 'SS-750' }
    ];
    
    res.json({
      success: true,
      data: dummyData,
      total: dummyData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 機種一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機種追加API
apiRouter.post('/machines/machine-types', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 機種追加リクエスト:', req.body);
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: '必須項目が不足しています',
        message: '機種名は必須です'
      });
    }
    
    if (dbPool) {
      try {
        // 重複チェック
        const duplicateCheck = await dbPool.query(`
          SELECT id FROM machine_types 
          WHERE machine_type_name = $1
        `, [name.trim()]);
        
        if (duplicateCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: '機種名が既に存在します',
            message: 'この機種名は既に使用されています'
          });
        }
        
        const result = await dbPool.query(`
          INSERT INTO machine_types (machine_type_name)
          VALUES ($1)
          RETURNING id, machine_type_name
        `, [name.trim()]);
        
        console.log('✅ 機種追加成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: '機種が追加されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        throw dbError;
      }
    }
    
    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: '機種の追加に失敗しました'
    });
  } catch (error) {
    console.error('❌ 機種追加エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種の追加に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機種更新API
apiRouter.put('/machines/machine-types/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    console.log('🔧 機種更新リクエスト:', { id, name });
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: '必須項目が不足しています',
        message: '機種名は必須です'
      });
    }
    
    if (dbPool) {
      try {
        // 重複チェック（自分以外）
        const duplicateCheck = await dbPool.query(`
          SELECT id FROM machine_types 
          WHERE machine_type_name = $1 AND id != $2
        `, [name.trim(), id]);
        
        if (duplicateCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: '機種名が既に存在します',
            message: 'この機種名は既に使用されています'
          });
        }
        
        const result = await dbPool.query(`
          UPDATE machine_types 
          SET machine_type_name = $1
          WHERE id = $2
          RETURNING id, machine_type_name
        `, [name.trim(), id]);
        
        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '機種が見つかりません',
            message: '指定されたIDの機種が存在しません'
          });
        }
        
        console.log('✅ 機種更新成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: '機種が更新されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        throw dbError;
      }
    }
    
    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: '機種の更新に失敗しました'
    });
  } catch (error) {
    console.error('❌ 機種更新エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種の更新に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機種削除API
apiRouter.delete('/machines/machine-types/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ 機種削除リクエスト:', { id });
    
    if (dbPool) {
      try {
        // 関連する機械番号があるかチェック
        const relatedMachines = await dbPool.query(`
          SELECT COUNT(*) as count FROM machines WHERE machine_type_id = $1
        `, [id]);
        
        if (relatedMachines.rows[0].count > 0) {
          return res.status(400).json({
            success: false,
            error: '関連する機械番号が存在します',
            message: 'この機種に関連する機械番号があるため削除できません。まず機械番号を削除してください。'
          });
        }
        
        const result = await dbPool.query(`
          DELETE FROM machine_types 
          WHERE id = $1
          RETURNING id, machine_type_name
        `, [id]);
        
        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '機種が見つかりません',
            message: '指定されたIDの機種が存在しません'
          });
        }
        
        console.log('✅ 機種削除成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: '機種が削除されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        throw dbError;
      }
    }
    
    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: '機種の削除に失敗しました'
    });
  } catch (error) {
    console.error('❌ 機種削除エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種の削除に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機械番号一覧取得API
apiRouter.get('/machines', async (req, res) => {
  try {
    const { type_id } = req.query;
    console.log('🔍 機械番号一覧取得リクエスト:', { type_id });
    
    if (dbPool) {
      try {
        let query, params;
        
        if (type_id) {
          // 特定の機種IDの機械番号のみ取得
          query = `
            SELECT m.id, m.machine_number, m.machine_type_id, mt.machine_type_name
            FROM machines m
            LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
            WHERE m.machine_type_id = $1 
            ORDER BY m.machine_number
          `;
          params = [type_id];
        } else {
          // 全機械番号を取得
          query = `
            SELECT m.id, m.machine_number, m.machine_type_id, mt.machine_type_name
            FROM machines m
            LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
            ORDER BY m.machine_number
          `;
          params = [];
        }
        
        const result = await dbPool.query(query, params);
        
        return res.json({
          success: true,
          data: result.rows,
          total: result.rows.length,
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
      }
    }
    
    const dummyData = [
      { id: '1', machine_number: 'M001', machine_type_id: '1', machine_type_name: 'MT-100' },
      { id: '2', machine_number: 'M002', machine_type_id: '1', machine_type_name: 'MT-100' },
      { id: '3', machine_number: 'M003', machine_type_id: '2', machine_type_name: 'MR-400' }
    ];
    
    res.json({
      success: true,
      data: dummyData,
      total: dummyData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 機械番号一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械番号一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機械番号追加API
apiRouter.post('/machines', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 機械番号追加リクエスト:', req.body);
    const { machine_number, machine_type_id } = req.body;
    
    if (!machine_number || !machine_type_id) {
      return res.status(400).json({
        success: false,
        error: '必須項目が不足しています',
        message: '機械番号と機種IDは必須です'
      });
    }
    
    if (dbPool) {
      try {
        // 重複チェック
        const duplicateCheck = await dbPool.query(`
          SELECT id FROM machines 
          WHERE machine_number = $1 AND machine_type_id = $2
        `, [machine_number, machine_type_id]);
        
        if (duplicateCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: '機械番号が既に存在します',
            message: 'この機種に同じ機械番号は既に登録されています'
          });
        }
        
        const result = await dbPool.query(`
          INSERT INTO machines (machine_number, machine_type_id)
          VALUES ($1, $2)
          RETURNING id, machine_number, machine_type_id
        `, [machine_number, machine_type_id]);
        
        console.log('✅ 機械番号追加成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: '機械番号が追加されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        if (dbError.code === '23503') { // 外部キー制約エラー
          return res.status(400).json({
            success: false,
            error: '無効な機種IDです',
            message: '指定された機種IDが存在しません'
          });
        }
        throw dbError;
      }
    }
    
    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: '機械番号の追加に失敗しました'
    });
  } catch (error) {
    console.error('❌ 機械番号追加エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械番号の追加に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機械番号更新API
apiRouter.put('/machines/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { machine_number, machine_type_id } = req.body;
    
    console.log('🔧 機械番号更新リクエスト:', { id, machine_number, machine_type_id });
    
    if (!machine_number || !machine_type_id) {
      return res.status(400).json({
        success: false,
        error: '必須項目が不足しています',
        message: '機械番号と機種IDは必須です'
      });
    }
    
    if (dbPool) {
      try {
        // 重複チェック（自分以外）
        const duplicateCheck = await dbPool.query(`
          SELECT id FROM machines 
          WHERE machine_number = $1 AND machine_type_id = $2 AND id != $3
        `, [machine_number, machine_type_id, id]);
        
        if (duplicateCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: '機械番号が既に存在します',
            message: 'この機種に同じ機械番号は既に登録されています'
          });
        }
        
        const result = await dbPool.query(`
          UPDATE machines 
          SET machine_number = $1, machine_type_id = $2
          WHERE id = $3
          RETURNING id, machine_number, machine_type_id
        `, [machine_number, machine_type_id, id]);
        
        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '機械番号が見つかりません',
            message: '指定されたIDの機械番号が存在しません'
          });
        }
        
        console.log('✅ 機械番号更新成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: '機械番号が更新されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        if (dbError.code === '23503') { // 外部キー制約エラー
          return res.status(400).json({
            success: false,
            error: '無効な機種IDです',
            message: '指定された機種IDが存在しません'
          });
        }
        throw dbError;
      }
    }
    
    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: '機械番号の更新に失敗しました'
    });
  } catch (error) {
    console.error('❌ 機械番号更新エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械番号の更新に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機械番号削除API
apiRouter.delete('/machines/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ 機械番号削除リクエスト:', { id });
    
    if (dbPool) {
      try {
        const result = await dbPool.query(`
          DELETE FROM machines 
          WHERE id = $1
          RETURNING id, machine_number, machine_type_id
        `, [id]);
        
        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '機械番号が見つかりません',
            message: '指定されたIDの機械番号が存在しません'
          });
        }
        
        console.log('✅ 機械番号削除成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: '機械番号が削除されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        throw dbError;
      }
    }
    
    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: '機械番号の削除に失敗しました'
    });
  } catch (error) {
    console.error('❌ 機械番号削除エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械番号の削除に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ユーザー一覧取得API
apiRouter.get('/users', async (req, res) => {
  try {
    console.log('🔍 ユーザー一覧取得リクエスト');
    
    if (dbPool) {
      try {
        const result = await dbPool.query(`
          SELECT id, username, display_name, role, department, description, created_at
          FROM users
          ORDER BY created_at DESC
        `);
        
        return res.json({
          success: true,
          data: result.rows,
          total: result.rows.length,
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      data: [],
      total: 0,
      message: 'データベース接続がありません',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ユーザー一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザー一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ユーザー作成API（認証を一時的に無効化）
apiRouter.post('/users', async (req, res) => {
  try {
    console.log('👤 ユーザー作成リクエスト:', req.body);
    const { username, password, display_name, role, department, description } = req.body;
    
    if (!username || !password || !display_name) {
      return res.status(400).json({
        success: false,
        error: '必須項目が不足しています',
        message: 'ユーザー名、パスワード、表示名は必須です'
      });
    }
    
    if (dbPool) {
      try {
        // パスワードをハッシュ化
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await dbPool.query(`
          INSERT INTO users (username, password, display_name, role, department, description)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, username, display_name, role, department, description, created_at
        `, [username, hashedPassword, display_name, role || 'employee', department, description]);
        
        console.log('✅ ユーザー作成成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: 'ユーザーが作成されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        if (dbError.code === '23505') { // 重複エラー
          return res.status(409).json({
            success: false,
            error: 'ユーザー名が既に存在します',
            message: 'このユーザー名は既に使用されています'
          });
        }
        throw dbError;
      }
    }
    
    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: 'ユーザー作成に失敗しました'
    });
  } catch (error) {
    console.error('❌ ユーザー作成エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザーの作成に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ユーザー更新API（認証を一時的に無効化）
apiRouter.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, display_name, role, department, description } = req.body;
    
    console.log('👤 ユーザー更新リクエスト:', { id, ...req.body });
    
    if (!id || !username || !display_name) {
      return res.status(400).json({
        success: false,
        error: '必須項目が不足しています',
        message: 'ID、ユーザー名、表示名は必須です'
      });
    }
    
    if (dbPool) {
      try {
        let query, params;
        
        if (password) {
          // パスワードも更新する場合
          const hashedPassword = await bcrypt.hash(password, 10);
          query = `
            UPDATE users 
            SET username = $1, password = $2, display_name = $3, role = $4, department = $5, description = $6
            WHERE id = $7
            RETURNING id, username, display_name, role, department, description, created_at
          `;
          params = [username, hashedPassword, display_name, role, department, description, id];
        } else {
          // パスワードは更新しない場合
          query = `
            UPDATE users 
            SET username = $1, display_name = $2, role = $3, department = $4, description = $5
            WHERE id = $6
            RETURNING id, username, display_name, role, department, description, created_at
          `;
          params = [username, display_name, role, department, description, id];
        }
        
        const result = await dbPool.query(query, params);
        
        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'ユーザーが見つかりません',
            message: '指定されたユーザーが存在しません'
          });
        }
        
        console.log('✅ ユーザー更新成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: 'ユーザーが更新されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        if (dbError.code === '23505') { // 重複エラー
          return res.status(409).json({
            success: false,
            error: 'ユーザー名が既に存在します',
            message: 'このユーザー名は既に使用されています'
          });
        }
        throw dbError;
      }
    }
    
    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: 'ユーザー更新に失敗しました'
    });
  } catch (error) {
    console.error('❌ ユーザー更新エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザーの更新に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ユーザー削除API（認証を一時的に無効化）
apiRouter.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('👤 ユーザー削除リクエスト:', id);
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ユーザーIDが必要です',
        message: '削除するユーザーのIDを指定してください'
      });
    }
    
    if (dbPool) {
      try {
        const result = await dbPool.query(`
          DELETE FROM users 
          WHERE id = $1
          RETURNING id, username, display_name
        `, [id]);
        
        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'ユーザーが見つかりません',
            message: '指定されたユーザーが存在しません'
          });
        }
        
        console.log('✅ ユーザー削除成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: 'ユーザーが削除されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        throw dbError;
      }
    }
    
    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: 'ユーザー削除に失敗しました'
    });
  } catch (error) {
    console.error('❌ ユーザー削除エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザーの削除に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 履歴一覧取得API（ファイルベース）
apiRouter.get('/history', async (req, res) => {
  try {
    console.log('📋 履歴一覧取得リクエスト（ファイルベース）');
    
    const projectRoot = path.resolve(__dirname, '..');
    const exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');
    
    if (!fs.existsSync(exportsDir)) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'エクスポートディレクトリが存在しません',
        timestamp: new Date().toISOString()
      });
    }
    
    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(file => 
      file.endsWith('.json') && 
      !file.includes('index') && 
      !file.includes('railway-maintenance-ai-prompt')
    );
    
    const { limit = 50, offset = 0 } = req.query;
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedFiles = jsonFiles.slice(startIndex, endIndex);
    
    const historyItems = paginatedFiles.map(file => {
      try {
        const filePath = path.join(exportsDir, file);
        const content = fs.readFileSync(filePath, { encoding: 'utf8' });
        const data = JSON.parse(content);
        const fileName = file.replace('.json', '');
        const uuidMatch = fileName.match(/_([a-f0-9-]{36})_/);
        const actualId = uuidMatch ? uuidMatch[1] : fileName;

        // --- 機種・機械番号をchatData.machineInfoから取得 ---
        let machineType = 'Unknown';
        let machineNumber = 'Unknown';
        if (data.chatData && data.chatData.machineInfo) {
          machineType = data.chatData.machineInfo.machineTypeName || data.chatData.machineInfo.selectedMachineType || 'Unknown';
          machineNumber = data.chatData.machineInfo.machineNumber || data.chatData.machineInfo.selectedMachineNumber || 'Unknown';
        } else {
          machineType = data.machineType || 'Unknown';
          machineNumber = data.machineNumber || 'Unknown';
        }

        // --- 画像をchatData.messages[].media[]から抽出 ---
        let images = [];
        if (data.chatData && Array.isArray(data.chatData.messages)) {
          data.chatData.messages.forEach(msg => {
            if (Array.isArray(msg.media)) {
              msg.media.forEach(media => {
                if (media.type === 'image' && media.url) {
                  images.push({
                    fileName: media.fileName || '',
                    url: media.url,
                    path: media.url
                  });
                }
              });
            }
          });
        }
        // 旧来の画像検出も残す（jpg/jpeg/png対応）
        const imageDir = path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
        if (fs.existsSync(imageDir)) {
          const imageFiles = fs.readdirSync(imageDir);
          // actualIdを含む画像を検索
          let matchingImages = imageFiles.filter(imgFile => 
            imgFile.includes(actualId) && (imgFile.endsWith('.jpg') || imgFile.endsWith('.jpeg') || imgFile.endsWith('.png'))
          );
          
          // chatIdも試す（chat_image_${chatId}_*.pngパターンに対応）
          if (matchingImages.length === 0 && data.chatId) {
            const chatId = String(data.chatId).replace(/^.*_/, ''); // タイムスタンプ部分のみ取得
            matchingImages = imageFiles.filter(imgFile => 
              (imgFile.includes(chatId) || imgFile.includes(data.chatId)) && 
              (imgFile.endsWith('.jpg') || imgFile.endsWith('.jpeg') || imgFile.endsWith('.png'))
            );
            if (matchingImages.length > 0) {
              console.log(`🖼️ chatIdで画像を発見: ${data.chatId} -> ${matchingImages[0]}`);
            }
          }
          
          // fileName（タイムスタンプ）も試す
          if (matchingImages.length === 0 && fileName) {
            const timestampPart = fileName.split('_').pop(); // 最後の部分（タイムスタンプ）を取得
            if (timestampPart && timestampPart !== actualId) {
              matchingImages = imageFiles.filter(imgFile => 
                imgFile.includes(timestampPart) && 
                (imgFile.endsWith('.jpg') || imgFile.endsWith('.jpeg') || imgFile.endsWith('.png'))
              );
              if (matchingImages.length > 0) {
                console.log(`🖼️ fileNameのタイムスタンプで画像を発見: ${timestampPart} -> ${matchingImages[0]}`);
              }
            }
          }
          
          if (matchingImages.length > 0) {
            console.log(`✅ 画像を発見 (id: ${actualId}): ${matchingImages.length}個`);
            const imageObjects = matchingImages.map(imgFile => ({
              fileName: imgFile,
              url: `/api/images/chat-exports/${imgFile}`,
              path: imgFile
            }));
            console.log(`✅ 画像オブジェクト:`, JSON.stringify(imageObjects, null, 2));
            images.push(...imageObjects);
          } else {
            console.log(`⚠️ 画像が見つかりません (id: ${actualId}, fileName: ${fileName}, chatId: ${data.chatId || 'N/A'})`);
            console.log(`⚠️ ディレクトリ内の画像ファイル (最初の10個):`, imageFiles.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')).slice(0, 10));
          }
        }
        const hasImages = images.length > 0;
        const imageCount = images.length;

        return {
          id: actualId,
          fileName: file,
          title: data.title || 'タイトルなし',
          machineType: machineType,
          machineNumber: machineNumber,
          description: data.description || data.problemDescription || '',
          createdAt: data.createdAt || new Date().toISOString(),
          lastModified: data.lastModified || data.createdAt || new Date().toISOString(),
          source: 'files',
          imageCount: imageCount,
          images: images,
          hasImages: hasImages,
          status: 'active'
        };
      } catch (error) {
        console.error(`ファイル読み込みエラー: ${file}`, error);
        return null;
      }
    }).filter(item => item !== null);
    
    console.log(`✅ ファイルベース履歴一覧取得成功: ${historyItems.length}件`);
    
    res.json({
      success: true,
      data: historyItems,
      total: jsonFiles.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: endIndex < jsonFiles.length,
      timestamp: new Date().toISOString(),
      source: 'files',
      version: '2.0'
    });
  } catch (error) {
    console.error('❌ 履歴一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 履歴詳細取得API（ファイルベース）
apiRouter.get('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'unified', includeImages = 'true' } = req.query;
    console.log(`📋 履歴詳細取得リクエスト（ファイルベース）: ${id}`);
    
    const projectRoot = path.resolve(__dirname, '..');
    const exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');
    
    if (!fs.existsSync(exportsDir)) {
      return res.status(404).json({
        success: false,
        error: 'エクスポートディレクトリが見つかりません',
        timestamp: new Date().toISOString()
      });
    }
    
    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(file => 
      file.endsWith('.json') && 
      !file.includes('index') && 
      !file.includes('railway-maintenance-ai-prompt')
    );
    
    let foundFile = null;
    let foundData = null;
    
    for (const file of jsonFiles) {
      const fileName = file.replace('.json', '');
      const uuidMatch = fileName.match(/_([a-f0-9-]{36})_/);
      const fileId = uuidMatch ? uuidMatch[1] : fileName;
      
      if (fileId === id || fileName === id) {
        try {
          const filePath = path.join(exportsDir, file);
          const content = fs.readFileSync(filePath, { encoding: 'utf8' });
          const data = JSON.parse(content);
          
          foundFile = file;
          foundData = data;
          break;
        } catch (error) {
          console.error(`ファイル読み込みエラー: ${file}`, error);
        }
      }
    }
    
    if (!foundData) {
      return res.status(404).json({
        success: false,
        error: '履歴が見つかりません',
        timestamp: new Date().toISOString()
      });
    }
    
    const imageDir = path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
    let imageInfo = [];
    
    if (includeImages === 'true' && fs.existsSync(imageDir)) {
      const imageFiles = fs.readdirSync(imageDir);
      const matchingImages = imageFiles.filter(imgFile => 
        imgFile.includes(id) && (imgFile.endsWith('.jpg') || imgFile.endsWith('.jpeg') || imgFile.endsWith('.png'))
      );
      
      imageInfo = matchingImages.map(imgFile => ({
        fileName: imgFile,
        url: `/api/images/chat-exports/${imgFile}`,
        path: imgFile
      }));
    }
    
    const response = {
      success: true,
      id: id,
      fileName: foundFile,
      title: foundData.title || 'タイトルなし',
      machineType: foundData.machineType || 'Unknown',
      machineNumber: foundData.machineNumber || 'Unknown',
      description: foundData.description || foundData.problemDescription || '',
      createdAt: foundData.createdAt || new Date().toISOString(),
      lastModified: foundData.lastModified || foundData.createdAt || new Date().toISOString(),
      source: 'files',
      images: imageInfo,
      imageCount: imageInfo.length,
      hasImages: imageInfo.length > 0,
      status: 'active',
      data: foundData,
      timestamp: new Date().toISOString(),
      version: '2.0'
    };
    
    console.log(`✅ ファイルベース履歴詳細取得成功: ${id}`);
    res.json(response);
  } catch (error) {
    console.error('❌ 履歴詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴詳細の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 履歴更新API（ファイルベース）
apiRouter.put('/history/update-item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { updatedData, updatedBy = 'user' } = req.body;
    
    console.log('📝 履歴アイテム更新リクエスト:', {
      id,
      updatedDataType: typeof updatedData,
      updatedDataKeys: updatedData ? Object.keys(updatedData) : [],
      updatedBy,
    });
    
    // IDを正規化（export_プレフィックス除去など）
    let normalizedId = id;
    if (id.startsWith('export_')) {
      normalizedId = id.replace('export_', '');
      if (normalizedId.endsWith('.json')) {
        normalizedId = normalizedId.replace('.json', '');
      }
      const parts = normalizedId.split('_');
      if (parts.length >= 2 && parts[1].match(/^[a-f0-9-]+$/)) {
        normalizedId = parts[1];
      }
    }
    
    console.log('📝 正規化されたID:', normalizedId, '元のID:', id);
    
    // 元のJSONファイルを検索
    const projectRoot = path.resolve(__dirname, '..');
    let exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');
    
    if (!fs.existsSync(exportsDir)) {
      exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
      if (!fs.existsSync(exportsDir)) {
        exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
      }
    }
    
    if (!fs.existsSync(exportsDir)) {
      return res.status(404).json({
        error: 'エクスポートディレクトリが見つかりません',
        exportsDir: exportsDir,
      });
    }
    
    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(file => 
      file.endsWith('.json') && 
      !file.includes('index') && 
      !file.includes('railway-maintenance-ai-prompt')
    );
    
    console.log('📂 検索対象ファイル数:', jsonFiles.length);
    
    // normalizedIdを含むJSONファイルを検索
    let targetFile = null;
    for (const file of jsonFiles) {
      const fileName = file.replace('.json', '');
      const uuidMatch = fileName.match(/_([a-f0-9-]{36})_/);
      const fileId = uuidMatch ? uuidMatch[1] : fileName;
      
      if (fileId === normalizedId || fileName.includes(normalizedId) || file.includes(normalizedId)) {
        targetFile = file;
        break;
      }
    }
    
    if (!targetFile) {
      return res.status(404).json({
        error: '対象のJSONファイルが見つかりません',
        id: id,
        normalizedId: normalizedId,
        exportsDir: exportsDir,
        availableFiles: jsonFiles.slice(0, 5),
      });
    }
    
    const filePath = path.join(exportsDir, targetFile);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    
    // 差分データで更新（深いマージ）
    const mergeData = (original, updates) => {
      const result = { ...original };
      for (const [key, value] of Object.entries(updates)) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          result[key] = mergeData(result[key] || {}, value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };
    
    const updatedJsonData = mergeData(jsonData, {
      ...updatedData,
      lastModified: new Date().toISOString(),
      updateHistory: [
        ...(jsonData.updateHistory || []),
        {
          timestamp: new Date().toISOString(),
          updatedFields: Object.keys(updatedData || {}),
          updatedBy: updatedBy,
        },
      ],
    });
    
    // ファイルに上書き保存
    fs.writeFileSync(filePath, JSON.stringify(updatedJsonData, null, 2), 'utf8');
    
    console.log('✅ 履歴ファイル更新完了:', targetFile);
    console.log('📊 更新されたフィールド:', Object.keys(updatedData || {}));
    
    res.json({
      success: true,
      message: '履歴ファイルが更新されました',
      updatedFile: targetFile,
      updatedData: updatedJsonData,
    });
  } catch (error) {
    console.error('❌ 履歴アイテム更新エラー:', error);
    res.status(500).json({
      error: '履歴アイテムの更新に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
    });
  }
});

// 履歴削除API（ファイルベース）
apiRouter.delete('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ 履歴削除リクエスト（ファイルベース）: ${id}`);
    
  const exportsDir = path.resolve(__dirname, '../knowledge-base/exports');
  console.log(`[debug] __dirname:`, __dirname);
  console.log(`[debug] exportsDir:`, exportsDir);
    
    if (!fs.existsSync(exportsDir)) {
      return res.status(404).json({
        success: false,
        error: 'エクスポートディレクトリが見つかりません',
        timestamp: new Date().toISOString()
      });
    }
    
    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    let foundFile = null;
    
    for (const file of jsonFiles) {
      const fileName = file.replace('.json', '');
      const uuidMatch = fileName.match(/_([a-f0-9-]{36})_/);
      const fileId = uuidMatch ? uuidMatch[1] : fileName;
      
      if (fileId === id || fileName === id) {
        foundFile = file;
        break;
      }
    }
    
    if (!foundFile) {
      return res.status(404).json({
        success: false,
        error: '履歴が見つかりません',
        timestamp: new Date().toISOString()
      });
    }
    
    const filePath = path.join(exportsDir, foundFile);
    fs.unlinkSync(filePath);
    
    const imageDir = path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports');
    if (fs.existsSync(imageDir)) {
      const imageFiles = fs.readdirSync(imageDir);
      const matchingImages = imageFiles.filter(imgFile => 
        imgFile.includes(id) && (imgFile.endsWith('.jpg') || imgFile.endsWith('.jpeg'))
      );
      
      matchingImages.forEach(imgFile => {
        const imgPath = path.join(imageDir, imgFile);
        try {
          fs.unlinkSync(imgPath);
          console.log(`🗑️ 画像ファイル削除: ${imgFile}`);
        } catch (error) {
          console.warn(`画像ファイル削除エラー: ${imgFile}`, error.message);
        }
      });
    }
    
    console.log(`✅ ファイルベース履歴削除完了: ${foundFile}`);
    
    res.json({
      success: true,
      message: '履歴を削除しました',
      id: id,
      fileName: foundFile,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 履歴削除エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴の削除に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 応急処置フロー削除API
apiRouter.delete('/emergency-flow/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ 応急処置フロー削除リクエスト: ${id}`);

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const alternativeDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');

    let targetDir = troubleshootingDir;
    if (!fs.existsSync(troubleshootingDir)) {
      if (fs.existsSync(alternativeDir)) {
        targetDir = alternativeDir;
      } else {
        return res.status(404).json({
          success: false,
          error: 'トラブルシューティングディレクトリが見つかりません',
          timestamp: new Date().toISOString()
        });
      }
    }

    // idに対応するファイル名を特定
    const files = fs.readdirSync(targetDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    let targetFile = null;
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(targetDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        if (data.id === id || file.replace('.json', '') === id) {
          targetFile = file;
          break;
        }
      } catch (error) {
        // 読み込みエラーは無視
      }
    }

    if (!targetFile) {
      return res.status(404).json({
        success: false,
        error: `ID: ${id} のフローデータが見つかりませんでした`,
        timestamp: new Date().toISOString()
      });
    }

    // ファイル削除
    const deletePath = path.join(targetDir, targetFile);
    fs.unlinkSync(deletePath);
    console.log(`✅ フロー削除完了: ${deletePath}`);
    res.json({
      success: true,
      message: `フロー(ID: ${id})を削除しました`,
      deletedFile: targetFile,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 応急処置フロー削除エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フローの削除に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 応急処置フロー一覧取得API
apiRouter.get('/emergency-flow/list', async (req, res) => {
  try {
    console.log('🔍 応急処置フロー一覧取得リクエスト');
    
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const alternativeDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    
    let targetDir = troubleshootingDir;
    if (!fs.existsSync(troubleshootingDir)) {
      if (fs.existsSync(alternativeDir)) {
        targetDir = alternativeDir;
      } else {
        return res.json({
          success: false,
          error: 'トラブルシューティングディレクトリが見つかりません',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    const files = fs.readdirSync(targetDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const flows = jsonFiles.map(file => {
      try {
        const filePath = path.join(targetDir, file);
        const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
        const jsonData = JSON.parse(fileContent);
        
        return {
          id: jsonData.id || file.replace('.json', ''),
          title: jsonData.title || 'タイトルなし',
          description: jsonData.description || '',
          fileName: file,
          filePath: `knowledge-base/troubleshooting/${file}`,
          createdAt: jsonData.createdAt || new Date().toISOString(),
          updatedAt: jsonData.updatedAt || new Date().toISOString(),
          triggerKeywords: jsonData.triggerKeywords || [],
          category: jsonData.category || '',
          steps: jsonData.steps || [],
          dataSource: 'file'
        };
      } catch (error) {
        console.error(`ファイル読み込みエラー: ${file}`, error);
        return null;
      }
    }).filter(item => item !== null);
    
    res.json({
      success: true,
      data: flows,
      total: flows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 応急処置フロー一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フロー一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 応急処置フロー詳細取得API
apiRouter.get('/emergency-flow/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 応急処置フロー詳細取得リクエスト: ${id}`);
    
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const alternativeDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    
    let targetDir = troubleshootingDir;
    if (!fs.existsSync(troubleshootingDir)) {
      if (fs.existsSync(alternativeDir)) {
        targetDir = alternativeDir;
      } else {
        return res.status(404).json({
          success: false,
          error: 'トラブルシューティングディレクトリが見つかりません',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    const files = fs.readdirSync(targetDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    let flowData = null;
    let fileName = null;
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(targetDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        
        if (data.id === id || file.replace('.json', '') === id) {
          flowData = data;
          fileName = file;
          break;
        }
      } catch (error) {
        console.error(`ファイル読み込みエラー: ${file}`, error);
      }
    }
    
    if (!flowData) {
      return res.status(404).json({
        success: false,
        error: 'フローが見つかりません',
        details: `ID: ${id} のフローデータが見つかりませんでした`,
        timestamp: new Date().toISOString()
      });
    }
    
    if (flowData.steps) {
      flowData.steps.forEach((step, index) => {
        if (step.images && Array.isArray(step.images)) {
          step.images.forEach((img, imgIndex) => {
            if (img.url && !img.url.startsWith('http')) {
              // 既にAPIパスが含まれている場合はそのまま使用
              if (img.url.startsWith('/api/')) {
                img.url = `${req.protocol}://${req.get('host')}${img.url}`;
              } else {
                // ファイル名のみの場合は適切なAPIエンドポイントに変換
                img.url = `${req.protocol}://${req.get('host')}/api/emergency-flow/image/${img.url}`;
              }
            }
          });
        }
      });
    }
    
    res.json({
      success: true,
      data: flowData,
      fileName: fileName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 応急処置フロー詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フロー詳細の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// チャット送信API
apiRouter.post('/chats/:id/send', (req, res) => {
  const { id } = req.params;
  const { chatData } = req.body;
  
  console.log('📤 チャット送信リクエスト:', { id, messageCount: chatData?.messages?.length || 0 });
  
  const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
    console.log('exports フォルダを作成しました:', exportsDir);
  }
  
  const fileName = `chat_${id}_${Date.now()}.json`;
  const filePath = path.join(exportsDir, fileName);
  
  const exportData = {
    chatId: id,
    title: chatData.title || 'チャット履歴',
    machineType: chatData.machineInfo?.machineTypeName || '',
    machineNumber: chatData.machineInfo?.machineNumber || '',
    exportTimestamp: new Date().toISOString(),
    chatData: chatData,
    exportType: 'manual'
  };
  
  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), { encoding: 'utf8' });
  
  res.json({
    success: true,
    message: 'チャット内容をサーバーに送信しました',
    fileName: fileName,
    timestamp: new Date().toISOString()
  });
});

// 履歴の機種・機械番号データ取得API
apiRouter.get('/history/machine-data', async (req, res) => {
  try {
    console.log('📋 機種・機械番号データ取得リクエスト（履歴用）');
    
    if (dbPool) {
      try {
        const machineTypesResult = await dbPool.query(`
          SELECT id, machine_type_name as "machineTypeName"
          FROM machine_types
          ORDER BY machine_type_name
        `);
        
        const machinesResult = await dbPool.query(`
          SELECT m.id, m.machine_number as "machineNumber", m.machine_type_id as "machineTypeId", 
                 mt.machine_type_name as "machineTypeName"
          FROM machines m
          LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
          ORDER BY m.machine_number
        `);
        
        return res.json({
          success: true,
          machineTypes: machineTypesResult.rows,
          machines: machinesResult.rows,
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      machineTypes: [],
      machines: [],
      message: 'データベース接続がありません',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 機種・機械番号データ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種・機械番号データの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ナレッジベースAPI
apiRouter.get('/knowledge-base', async (req, res) => {
  try {
    console.log('📚 ナレッジベース取得リクエスト');

    const kbDir = getKnowledgeBaseDir();
    if (!kbDir) {
      return res.json({
        success: true,
        data: [],
        message: 'ナレッジベースディレクトリが見つかりません（KNOWLEDGE_BASE_PATH を確認してください）',
        timestamp: new Date().toISOString()
      });
    }

    const targetDir = kbDir;
    
    const files = fs.readdirSync(targetDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const knowledgeItems = jsonFiles.map(file => {
      try {
        const filePath = path.join(targetDir, file);
        const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
        const jsonData = JSON.parse(fileContent);
        
        return {
          id: file.replace('.json', ''),
          fileName: file,
          title: jsonData.title || 'タイトルなし',
          category: jsonData.category || 'unknown',
          createdAt: jsonData.createdAt || new Date().toISOString(),
          lastModified: jsonData.lastModified || new Date().toISOString()
        };
      } catch (error) {
        console.error(`ファイル読み込みエラー: ${file}`, error);
        return null;
      }
    }).filter(item => item !== null);
    
    res.json({
      success: true,
      data: knowledgeItems,
      total: knowledgeItems.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ナレッジベース取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジベースの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 設定RAG API
apiRouter.get('/settings/rag', async (req, res) => {
  try {
    console.log('⚙️ RAG設定取得リクエスト');
    
    res.json({
      success: true,
      data: {
        enabled: true,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
        chunkSize: 1000,
        overlap: 200
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ RAG設定取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'RAG設定の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// RAG設定API（エイリアス）
apiRouter.get('/config/rag', async (req, res) => {
  try {
    console.log('⚙️ RAG設定取得リクエスト（エイリアス）');
    
    res.json({
      success: true,
      data: {
        enabled: true,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
        chunkSize: 1000,
        overlap: 200
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ RAG設定取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'RAG設定の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 管理者ダッシュボードAPI
apiRouter.get('/admin/dashboard', async (req, res) => {
  try {
    console.log('📊 管理者ダッシュボード取得リクエスト');
    
    res.json({
      success: true,
      data: {
        totalUsers: 0,
        totalMachines: 0,
        totalHistory: 0,
        totalFlows: 0,
        systemStatus: 'running',
        lastUpdate: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 管理者ダッシュボード取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '管理者ダッシュボードの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// chat-exports画像ファイル取得エンドポイント
apiRouter.get('/images/chat-exports/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    console.log(`\n🖼️ ========================================`);
    console.log(`🖼️ 画像リクエスト受信: ${filename}`);
    console.log(`🖼️ ========================================`);
    
    console.log(`📂 process.cwd(): ${process.cwd()}`);
    
    // ES modules対応: __dirname を取得
    const __filename = fileURLToPath(import.meta.url);
    const currentDirname = path.dirname(__filename);
    console.log(`📂 __dirname: ${currentDirname}`);
    
    // 複数のパス候補を試す（順番に確認）
    // 重要: プロジェクトルート直下の knowledge-base を優先
    const pathCandidates = [
      path.resolve(currentDirname, '..', 'knowledge-base', 'images', 'chat-exports'),  // __dirname基準（最優先）
      path.resolve(currentDirname, '..', '..', 'knowledge-base', 'images', 'chat-exports'),  // __dirname基準（2階層上）
      path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports'),  // process.cwd()から見た相対パス
      path.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports'),  // process.cwd()直下
    ];
    
    // getImagesRoot()の結果も試すが、ファイルが存在することを確認する
    const imagesRoot = getImagesRoot();
    console.log(`📂 getImagesRoot()結果: ${imagesRoot || 'null'}`);
    if (imagesRoot) {
      const rootBasedPath = path.join(imagesRoot, 'chat-exports');
      const resolvedRootPath = path.resolve(rootBasedPath);
      // ディレクトリが存在し、かつ中に画像ファイルがあることを確認
      if (fs.existsSync(resolvedRootPath)) {
        try {
          const files = fs.readdirSync(resolvedRootPath);
          const imageFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
          // 画像ファイルが1つ以上ある場合のみ有効なパスとして扱う
          if (imageFiles.length > 0) {
            pathCandidates.unshift(resolvedRootPath);
            console.log(`📂 getImagesRoot()ベースのパス（有効）: ${resolvedRootPath} (画像ファイル数: ${imageFiles.length})`);
          } else {
            console.warn(`⚠️ getImagesRoot()ベースのパスは存在するが、画像ファイルがありません: ${resolvedRootPath}`);
          }
        } catch (e) {
          console.warn(`⚠️ getImagesRoot()ベースのパスの確認エラー: ${e.message}`);
        }
      }
    }
    
    let imagesDir = null;
    for (let i = 0; i < pathCandidates.length; i++) {
      const candidate = pathCandidates[i];
      const resolved = path.resolve(candidate);
      const exists = fs.existsSync(resolved);
      console.log(`📂 パス候補[${i}]: ${resolved}, 存在: ${exists}`);
      
      if (exists) {
        // ディレクトリ内のファイルを確認
        try {
          const files = fs.readdirSync(resolved);
          const imageFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
          console.log(`📂 ディレクトリ内の画像ファイル数: ${imageFiles.length}`);
          
          // 画像ファイルが1つ以上ある場合のみ有効なディレクトリとして扱う
          if (imageFiles.length > 0) {
            imagesDir = resolved;
            console.log(`✅ ディレクトリ発見（有効）: ${imagesDir}`);
            console.log(`📂 ファイル一覧（最初の10個）: ${imageFiles.slice(0, 10).join(', ')}`);
            break;
          } else {
            console.warn(`⚠️ パス候補[${i}]は存在するが、画像ファイルがありません: ${resolved}`);
          }
        } catch (e) {
          console.warn(`⚠️ パス候補[${i}]の読み込みエラー: ${e.message}`);
        }
      }
    }
    
    if (!imagesDir || !fs.existsSync(imagesDir)) {
      console.error(`❌ 画像ディレクトリが存在しません`);
      console.error(`❌ 試したパス候補:`);
      pathCandidates.forEach((p, i) => {
        try {
          const resolved = path.resolve(p);
          console.error(`  [${i}] ${resolved} (存在: ${fs.existsSync(resolved)})`);
        } catch (e) {
          console.error(`  [${i}] ${p} (エラー: ${e.message})`);
        }
      });
      return res.status(404).json({
        success: false,
        error: '画像ディレクトリが見つかりません',
        processCwd: process.cwd(),
        __dirname: currentDirname,
        triedPaths: pathCandidates.map(p => {
          try {
            const resolved = path.resolve(p);
            return { path: resolved, exists: fs.existsSync(resolved) };
          } catch (e) {
            return { path: p, error: e.message };
          }
        })
      });
    }
    
    // ディレクトリ内の全ファイルを読み込む
    const allFiles = fs.readdirSync(imagesDir);
    const imageFiles = allFiles.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
    console.log(`📂 ディレクトリ内の画像ファイル数: ${imageFiles.length}`);
    console.log(`📂 ファイル一覧:`, imageFiles.join(', '));
    
    let imagePath = null;
    let actualFilename = filename;
    
    // 1. 完全一致を確認（最優先）
    const exactMatch = imageFiles.find(f => f === filename);
    if (exactMatch) {
      imagePath = path.join(imagesDir, exactMatch);
      actualFilename = exactMatch;
      console.log(`✅ 完全一致でファイル発見: ${exactMatch}`);
    }
    
    // 2. 完全一致が見つからない場合、数値IDでマッチング
    if (!imagePath) {
      const numericId = filename.match(/\d{10,}/)?.[0];
      console.log(`🔍 数値ID抽出: ${numericId}`);
      
      if (numericId) {
        // 2-1. 数値IDを含むchat_image_ファイルを探す（最優先）
        const chatImageMatches = imageFiles.filter(f => 
          f.startsWith('chat_image_') && f.includes(numericId)
        );
        if (chatImageMatches.length > 0) {
          // より長い数値IDを含むものを優先（より正確なマッチ）
          const bestMatch = chatImageMatches.sort((a, b) => {
            const aNum = a.match(/\d{10,}/)?.[0] || '';
            const bNum = b.match(/\d{10,}/)?.[0] || '';
            return bNum.length - aNum.length;
          })[0];
          imagePath = path.join(imagesDir, bestMatch);
          actualFilename = bestMatch;
          console.log(`✅ 数値IDでchat_image_ファイル発見: ${bestMatch}`);
        } else if (numericId.length >= 10) {
          // 2-2. 最初の10桁でマッチング（タイムスタンプの最初の部分）
          const prefix10 = numericId.substring(0, 10);
          const prefixMatches = imageFiles.filter(f => 
            f.startsWith('chat_image_') && f.includes(prefix10)
          );
          if (prefixMatches.length > 0) {
            const bestMatch = prefixMatches.sort((a, b) => {
              const aNum = a.match(/\d{10,}/)?.[0] || '';
              const bNum = b.match(/\d{10,}/)?.[0] || '';
              return bNum.length - aNum.length;
            })[0];
            imagePath = path.join(imagesDir, bestMatch);
            actualFilename = bestMatch;
            console.log(`✅ 最初の10桁でchat_image_ファイル発見: ${bestMatch}`);
          }
        }
      }
    }
    
    // 3. 見つからなかった場合のエラー処理
    if (!imagePath) {
      console.error(`❌ 画像ファイルが見つかりません: ${filename}`);
      console.error(`❌ 検索ディレクトリ: ${imagesDir}`);
      console.error(`❌ リクエストされたファイル名: ${filename}`);
      console.error(`❌ 数値ID: ${filename.match(/\d{10,}/)?.[0] || 'なし'}`);
      return res.status(404).json({
        success: false,
        error: '画像ファイルが見つかりません',
        filename: filename,
        imagesDir: imagesDir,
        availableFiles: imageFiles.slice(0, 20)
      });
    }
    
    const stat = fs.statSync(imagePath);
    const ext = path.extname(actualFilename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    console.log(`✅ 画像ファイル配信: ${actualFilename} (${stat.size} bytes)`);
    const readStream = fs.createReadStream(imagePath);
    readStream.pipe(res);
    
  } catch (error) {
    console.error('❌ chat-exports画像ファイル取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '画像ファイルの取得に失敗しました',
      details: error.message
    });
  }
});

// 注意: 以下の重複エンドポイントは削除されました（上の詳細な検索ロジックを使用）

// 汎用画像ファイル配信API
apiRouter.get('/images/*', (req, res) => {
  try {
    const imagePath = req.params[0];
    const kbDir = getKnowledgeBaseDir();
    if (!kbDir) {
      return res.status(404).json({ error: 'トラブルシューティングディレクトリが見つかりません（KNOWLEDGE_BASE_PATH を確認してください）' });
    }

    const fullPath = path.join(kbDir, 'troubleshooting', imagePath);

    if (fs.existsSync(fullPath)) {
      res.sendFile(fullPath);
    } else {
      res.status(404).json({ error: '画像ファイルが見つかりません' });
    }
  } catch (error) {
    console.error('❌ 汎用画像配信エラー:', error);
    res.status(500).json({ error: '画像の配信に失敗しました' });
  }
});

// emergency-flow画像配信エンドポイント
apiRouter.get('/emergency-flow/image/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;

    // CORSヘッダーを設定（本番環境対応）
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');

    const imagesRoot = getImagesRoot();
    if (!imagesRoot) {
      return res.status(404).json({ success: false, error: '画像ルートが見つかりません（IMAGES_BASE_PATH を確認してください）' });
    }

    let uploadDir = path.join(imagesRoot, 'emergency-flows');
    let filePath = path.join(uploadDir, fileName);

    // emergency-flows にファイルがない場合は chat-exports を確認
    if (!fs.existsSync(filePath)) {
      uploadDir = path.join(imagesRoot, 'chat-exports');
      filePath = path.join(uploadDir, fileName);

      console.log('🔄 emergency-flows にファイルが見つからないため、chat-exports を確認:', { fileName, chatExportsDir: uploadDir, chatExportsPath: filePath, exists: fs.existsSync(filePath) });
    }

    // デバッグログ強化
    console.log('🖼️ 画像リクエスト:', { fileName, uploadDir, filePath, exists: fs.existsSync(filePath), filesInDir: fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [] });

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: '画像ファイルが見つかりません', details: `ファイル: ${fileName} が ${uploadDir} に見つかりませんでした。`, timestamp: new Date().toISOString() });
    }

    // ファイルのMIMEタイプを判定
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // ファイルを読み込んでレスポンス
    const fileBuffer = fs.readFileSync(filePath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年間キャッシュ
    res.send(fileBuffer);

    console.log('✅ 画像配信成功:', {
      fileName,
      contentType,
      fileSize: fileBuffer.length,
    });
  } catch (error) {
    console.error('❌ 画像配信エラー:', error);
    res.status(500).json({
      success: false,
      error: '画像の配信中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 画像アップロードエンドポイント
apiRouter.post('/images/upload', upload.single('image'), async (req, res) => {
  try {
    console.log('🖼️ 画像アップロードリクエスト受信');
    
    if (!req.file) {
      return res.status(400).json({ error: '画像ファイルがありません' });
    }

    const imagesDir = process.env.CHAT_IMAGES_PATH
      ? path.resolve(process.cwd(), process.env.CHAT_IMAGES_PATH)
      : path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports');

    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
      console.log('📁 画像保存ディレクトリを作成:', imagesDir);
    }

    const fileName = `chat_image_${Date.now()}.png`;
    const filePath = path.join(imagesDir, fileName);
    fs.writeFileSync(filePath, req.file.buffer);
    
    const imageUrl = `/api/images/chat-exports/${fileName}`;
    
    console.log('✅ 画像アップロード成功:', { fileName, imageUrl, size: req.file.size });
    
    res.json({ success: true, url: imageUrl, fileName });
  } catch (error) {
    console.error('❌ 画像アップロードエラー:', error);
    res.status(500).json({ error: '画像のアップロードに失敗しました' });
  }
});

// 注意: 上に詳細な検索ロジックを含むエンドポイントがあるため、重複エンドポイントは削除しました

// APIルーターをマウント（画像提供エンドポイントが正しく登録されるように先にマウント）
app.use('/api', apiRouter);

// チャットルートを登録（appに直接登録）
registerChatRoutes(app);

// 故障履歴ルートを登録
app.use('/api/fault-history', faultHistoryRouter);

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Emergency Assistance Unified Development Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend: http://localhost:${PORT} (proxied to Vite on port ${CLIENT_PORT})`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`🔥 Hot reload: Enabled`);
  console.log(`📁 Source files: Direct from client/src (no build required)`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  if (viteServer) {
    viteServer.kill();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  if (viteServer) {
    viteServer.kill();
  }
  process.exit(0);
});
