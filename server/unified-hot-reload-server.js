#!/usr/bin/env node
// -*- coding: utf-8 -*-

// 統合開発サーバー - フロントエンドとバックエンドを統合
// ホットリロード対応、ビルド不要、元データから直接起動
// UTF-8 (BOMなし) エンコード標準

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { spawn } from 'child_process';

// UTF-8環境設定
process.env.NODE_OPTIONS = '--max-old-space-size=4096';
process.stdout.setEncoding('utf8');
process.stderr.setEncoding('utf8');

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 環境変数の読み込み
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, encoding: 'utf8' });
  console.log('📄 Loaded .env file from:', envPath);
} else {
  console.log('📄 .env file not found, using system environment variables');
}

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

// 環境に応じてViteサーバーを起動または静的ファイルを配信
if (isDevelopment) {
  // 開発環境: Viteサーバーを起動
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
} else {
  // 本番環境: ビルド済み静的ファイルを配信
  const publicDir = path.join(__dirname, 'public');
  const clientDistDir = path.join(__dirname, '..', 'client', 'dist');
  
  // publicディレクトリが存在する場合は使用（優先）
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir, { maxAge: '1y' }));
    console.log('✅ 静的ファイル配信: publicディレクトリ');
  } else if (fs.existsSync(clientDistDir)) {
    // client/distディレクトリから配信
    app.use(express.static(clientDistDir, { maxAge: '1y' }));
    console.log('✅ 静的ファイル配信: client/distディレクトリ');
  } else {
    console.warn('⚠️ 静的ファイルディレクトリが見つかりません。publicまたはclient/distが必要です。');
  }
  
  // SPAのルーティング対応: すべてのリクエストをindex.htmlにフォールバック
  app.get('*', (req, res, next) => {
    // APIルートは除外
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    // 静的ファイル（拡張子あり）は除外
    if (req.path.match(/\.[a-zA-Z0-9]+$/)) {
      return next();
    }
    
    // index.htmlを配信（SPAルーティング）
    const indexPath = fs.existsSync(publicDir)
      ? path.join(publicDir, 'index.html')
      : fs.existsSync(clientDistDir)
      ? path.join(clientDistDir, 'index.html')
      : null;
    
    if (indexPath && fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Page not found');
    }
  });
}

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

// API router
const apiRouter = express.Router();

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

// 現在のユーザー情報取得エンドポイント
apiRouter.get('/auth/me', async (req, res) => {
  try {
    console.log('[auth/me] リクエスト詳細:', {
      hasSession: !!req.session,
      sessionId: req.session?.id,
      sessionUser: req.session?.user,
      sessionUserId: req.session?.userId,
      cookies: req.headers.cookie,
      authHeader: req.headers.authorization
    });
    
    // セッションベースの認証をチェック
    if (req.session?.user) {
      console.log('[auth/me] Session-based auth:', req.session.user);
      return res.json({ 
        success: true, 
        user: req.session.user,
        authenticated: true
      });
    }

    // Bearer token認証をチェック
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      try {
        const token = auth.slice(7);
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-32-characters-long');
        console.log('[auth/me] Token-based auth:', payload);
        return res.json({ 
          success: true, 
          user: { 
            id: payload.id || payload.sub, 
            username: payload.username,
            role: payload.role
          },
          authenticated: true
        });
      } catch (tokenError) {
        console.log('[auth/me] Invalid token:', tokenError.message);
        return res.status(401).json({ 
          success: false, 
          error: 'invalid_token',
          message: '無効なトークンです'
        });
      }
    }

    // 開発環境ではダミーユーザーを返す
    if (process.env.NODE_ENV === 'development' || process.env.BYPASS_DB_FOR_LOGIN === 'true') {
      console.log('[auth/me] Development mode: Returning demo user');
      return res.json({ 
        success: true, 
        user: {
          id: 'demo',
          username: 'demo',
          role: 'user',
          displayName: 'Demo User'
        },
        authenticated: true,
        demo: true
      });
    }

    // 未認証
    console.log('[auth/me] No authentication found');
    return res.status(401).json({ 
      success: false, 
      error: 'authentication_required',
      message: '認証が必要です'
    });
    
  } catch (error) {
    console.error('[auth/me] Unexpected error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'internal_error',
      message: 'サーバーエラーが発生しました'
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

// 履歴関連の具体的なルートを先に定義（/:idパラメータ付きルートより前に）
// GET /api/history/export-files - エクスポートファイル一覧取得（先に定義）
apiRouter.get('/history/export-files', async (req, res) => {
  try {
    console.log('📂 エクスポートファイル一覧取得リクエスト受信');
    const cwd = process.cwd();
    console.log('📁 現在の作業ディレクトリ:', cwd);
    
    // 複数のパス候補を試す
    const projectRoot = path.resolve(__dirname, '..');
    const possiblePaths = [
      // 環境変数が設定されている場合
      process.env.KNOWLEDGE_EXPORTS_DIR,
      // プロジェクトルートから
      path.join(projectRoot, 'knowledge-base', 'exports'),
      // カレントディレクトリから
      path.join(cwd, 'knowledge-base', 'exports'),
      // サーバーディレクトリから起動されている場合
      path.join(cwd, '..', 'knowledge-base', 'exports'),
      // __dirnameから
      path.join(__dirname, '..', 'knowledge-base', 'exports'),
    ].filter(Boolean); // undefined/nullを除外

    console.log('🔍 パス候補:', possiblePaths);
    
    let exportsDir = null;
    for (const testPath of possiblePaths) {
      if (!testPath) continue;
      const normalizedPath = path.resolve(testPath);
      console.log(`📂 試行パス: ${normalizedPath}, 存在: ${fs.existsSync(normalizedPath)}`);
      if (fs.existsSync(normalizedPath)) {
        const stats = fs.statSync(normalizedPath);
        if (stats.isDirectory()) {
          exportsDir = normalizedPath;
          console.log('✅ 有効なディレクトリを発見:', exportsDir);
          break;
        } else {
          console.warn(`⚠️ パスは存在するがディレクトリではありません: ${normalizedPath}`);
        }
      }
    }

    if (!exportsDir) {
      console.error('❌ エクスポートディレクトリが見つかりません。試行したパス:', possiblePaths);
      return res.json([]);
    }

    console.log('✅ エクスポートディレクトリ確認:', exportsDir);
    
    // ファイル一覧を取得（日本語ファイル名対応）
    const files = fs.readdirSync(exportsDir);
    console.log('📋 ディレクトリ内の全ファイル:', files);
    console.log('📋 ファイル数:', files.length);
    
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    console.log('📋 JSONファイル数:', jsonFiles.length, 'ファイル:', jsonFiles);
    
    const exportFiles = jsonFiles
      .filter(file => !file.includes('.backup.')) // バックアップファイルを除外
      .filter(file => !file.startsWith('test-backup-')) // テストファイルを除外
      .map(file => {
        const filePath = path.join(exportsDir, file);
        console.log('🔍 ファイル処理中:', filePath);
        
        try {
          // ファイルの存在確認
          if (!fs.existsSync(filePath)) {
            console.warn('❌ ファイルが見つかりません:', filePath);
            return null;
          }
          
          const stats = fs.statSync(filePath);
          if (!stats.isFile()) {
            console.warn('❌ ファイルではありません:', filePath);
            return null;
          }
          
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          const fileInfo = {
            fileName: file,
            filePath: filePath,
            chatId: data.chatId || data.id || 'unknown',
            title: data.title || data.problemDescription || 'タイトルなし',
            createdAt:
              data.createdAt ||
              data.exportTimestamp ||
              new Date().toISOString(),
            exportTimestamp: data.exportTimestamp || data.createdAt || new Date().toISOString(),
            lastModified: stats.mtime.toISOString(),
            size: stats.size,
          };
          console.log('✅ ファイル読み込み成功:', file, 'タイトル:', fileInfo.title);
          return fileInfo;
        } catch (error) {
          console.error(`❌ ファイル読み込みエラー: ${filePath}`, error);
          if (error instanceof Error) {
            console.error('エラー詳細:', error.message, error.stack);
          }
          return null;
        }
      })
      .filter(item => item !== null);

    console.log('📦 最終エクスポートファイル数:', exportFiles.length);
    console.log('📋 返却ファイル一覧:', exportFiles.map(f => f.fileName));

    res.json(exportFiles);
  } catch (error) {
    console.error('❌ エクスポートファイル一覧取得エラー:', error);
    res.status(500).json({
      error: 'エクスポートファイル一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
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
        
        const imageDir = path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
        let hasImages = false;
        let imageCount = 0;
        const images = [];
        
        if (fs.existsSync(imageDir)) {
          const imageFiles = fs.readdirSync(imageDir);
          const matchingImages = imageFiles.filter(imgFile => 
            imgFile.includes(actualId) && (imgFile.endsWith('.jpg') || imgFile.endsWith('.jpeg'))
          );
          
          if (matchingImages.length > 0) {
            hasImages = true;
            imageCount = matchingImages.length;
            images.push(...matchingImages.map(imgFile => ({
              fileName: imgFile,
              url: `/api/images/chat-exports/${imgFile}`,
              path: imgFile
            })));
          }
        }
        
        return {
          id: actualId,
          fileName: file,
          title: data.title || 'タイトルなし',
          machineType: data.machineType || 'Unknown',
          machineNumber: data.machineNumber || 'Unknown',
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
// 注意: export-filesなどの具体的なルートは既に上で定義されているため、ここでは通常のIDのみを処理
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
        imgFile.includes(id) && (imgFile.endsWith('.jpg') || imgFile.endsWith('.jpeg'))
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

// 履歴削除API（ファイルベース）
apiRouter.delete('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ 履歴削除リクエスト（ファイルベース）: ${id}`);
    
    // 履歴一覧取得APIと同じパス解決方法を使用
    const projectRoot = path.resolve(__dirname, '..');
    const exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');
    
    console.log(`📂 プロジェクトルート: ${projectRoot}`);
    console.log(`📂 エクスポートディレクトリ: ${exportsDir}`);
    console.log(`📂 ディレクトリ存在確認: ${fs.existsSync(exportsDir)}`);
    
    if (!fs.existsSync(exportsDir)) {
      return res.status(404).json({
        success: false,
        error: 'エクスポートディレクトリが見つかりません',
        exportsDir: exportsDir,
        timestamp: new Date().toISOString()
      });
    }
    
    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(file => 
      file.endsWith('.json') && 
      !file.includes('index') && 
      !file.includes('railway-maintenance-ai-prompt')
    );
    
    console.log(`📋 検出されたJSONファイル数: ${jsonFiles.length}`);
    
    let foundFile = null;
    
    for (const file of jsonFiles) {
      const fileName = file.replace('.json', '');
      const uuidMatch = fileName.match(/_([a-f0-9-]{36})_/);
      const fileId = uuidMatch ? uuidMatch[1] : fileName;
      
      console.log(`🔍 ファイルチェック: ${file}, fileName: ${fileName}, fileId: ${fileId}, id: ${id}`);
      
      if (fileId === id || fileName === id) {
        foundFile = file;
        console.log(`✅ マッチするファイルを発見: ${foundFile}`);
        break;
      }
    }
    
    if (!foundFile) {
      console.log(`❌ マッチするファイルが見つかりませんでした。検索ID: ${id}`);
      return res.status(404).json({
        success: false,
        error: '履歴が見つかりません',
        searchId: id,
        availableFiles: jsonFiles.slice(0, 10), // デバッグ用に最初の10ファイルを返す
        timestamp: new Date().toISOString()
      });
    }
    
    const filePath = path.join(exportsDir, foundFile);
    console.log(`🗑️ ファイル削除実行: ${filePath}`);
    fs.unlinkSync(filePath);
    console.log(`✅ ファイル削除完了: ${foundFile}`);
    
    // 画像ディレクトリも同じパス解決方法を使用
    const imageDir = path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
    if (fs.existsSync(imageDir)) {
      const imageFiles = fs.readdirSync(imageDir);
      const matchingImages = imageFiles.filter(imgFile => 
        imgFile.includes(id) && (imgFile.endsWith('.jpg') || imgFile.endsWith('.jpeg'))
      );
      
      console.log(`🖼️ マッチする画像ファイル数: ${matchingImages.length}`);
      
      matchingImages.forEach(imgFile => {
        const imgPath = path.join(imageDir, imgFile);
        try {
          fs.unlinkSync(imgPath);
          console.log(`🗑️ 画像ファイル削除: ${imgFile}`);
        } catch (error) {
          console.warn(`⚠️ 画像ファイル削除エラー: ${imgFile}`, error.message);
        }
      });
    } else {
      console.log(`📂 画像ディレクトリが存在しません: ${imageDir}`);
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
      stack: error.stack,
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

    // 画像URLを変換
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

// フロー削除エンドポイント
apiRouter.delete('/emergency-flow/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ フロー削除開始: ID=${id}`);

    // 複数のパス候補を試す
    const cwd = process.cwd();
    const projectRoot = path.resolve(__dirname, '..');
    
    // トラブルシューティングディレクトリのパス候補
    const troubleshootingPaths = [
      // プロジェクトルートから
      path.join(projectRoot, 'knowledge-base', 'troubleshooting'),
      // カレントディレクトリから
      path.join(cwd, 'knowledge-base', 'troubleshooting'),
      // サーバーディレクトリから起動されている場合
      path.join(cwd, '..', 'knowledge-base', 'troubleshooting'),
      // __dirnameから
      path.join(__dirname, '..', 'knowledge-base', 'troubleshooting'),
    ].map(p => path.resolve(p));
    
    console.log('🔍 troubleshooting パス候補:', troubleshootingPaths);
    console.log('📁 現在の作業ディレクトリ:', cwd);
    console.log('📁 プロジェクトルート:', projectRoot);

    let targetDir = null;
    let fileName = null;

    // 各パス候補を試す
    for (const testDir of troubleshootingPaths) {
      if (!fs.existsSync(testDir)) {
        console.log(`⚠️ ディレクトリが存在しません: ${testDir}`);
        continue;
      }

      console.log(`🔍 ディレクトリを検索中: ${testDir}`);
      const files = fs.readdirSync(testDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      console.log(`📄 見つかったJSONファイル数: ${jsonFiles.length}`);

      // IDに一致するファイルを検索
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(testDir, file);
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(fileContent);

          if (data.id === id || file.replace('.json', '') === id) {
            targetDir = testDir;
            fileName = file;
            console.log('✅ 削除対象のファイルを発見:', {
              dir: targetDir,
              file: fileName,
              id
            });
            break;
          }
        } catch (error) {
          console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
        }
      }

      if (fileName) {
        break;
      }
    }

    if (!fileName || !targetDir) {
      console.error('❌ 削除対象のフローが見つかりません:', {
        id,
        searchedPaths: troubleshootingPaths,
      });
      return res.status(404).json({
        success: false,
        error: '削除対象のフローが見つかりません',
        id,
        searchedPaths: troubleshootingPaths.map(p => ({
          path: p,
          exists: fs.existsSync(p),
        })),
      });
    }

    // JSONファイルを削除
    const filePath = path.join(targetDir, fileName);
    fs.unlinkSync(filePath);

    console.log(`🗑️ フロー削除完了: ${id}, ファイル: ${fileName}, パス: ${filePath}`);
    res.json({
      success: true,
      message: 'フローが削除されました',
      deletedId: id,
      deletedFile: fileName,
    });
  } catch (error) {
    console.error('❌ フロー削除エラー:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      id: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'フローの削除に失敗しました',
      details: error instanceof Error ? error.message : String(error),
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
    
    const knowledgeBaseDir = path.join(process.cwd(), 'knowledge-base');
    const alternativeDir = path.join(process.cwd(), '..', 'knowledge-base');
    
    let targetDir = knowledgeBaseDir;
    if (!fs.existsSync(knowledgeBaseDir)) {
      if (fs.existsSync(alternativeDir)) {
        targetDir = alternativeDir;
      } else {
        return res.json({
          success: true,
          data: [],
          message: 'ナレッジベースディレクトリが見つかりません',
          timestamp: new Date().toISOString()
        });
      }
    }
    
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
    console.log(`🖼️ chat-exports画像ファイル取得: ${filename}`);
    
    // プロジェクトルートを取得（__dirnameベース）
    const projectRoot = path.resolve(__dirname, '..');
    const imagesDir = path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
    
    console.log(`🔍 画像検索開始:`, { filename, imagesDir, exists: fs.existsSync(imagesDir) });
    
    // ディレクトリが存在しない場合は404を返す
    if (!fs.existsSync(imagesDir)) {
      console.log(`❌ 画像ディレクトリが存在しません: ${imagesDir}`);
      return res.status(404).json({
        success: false,
        error: '画像ディレクトリが見つかりません',
        imagesDir: imagesDir
      });
    }
    
    let imagePath = null;
    let actualFilename = filename;
    let searchedPatterns = [];
    let patterns = []; // エラーハンドリング用にスコープ外で定義
    
    // 1. 直接ファイル名で検索
    const directPath = path.join(imagesDir, filename);
    if (fs.existsSync(directPath)) {
      imagePath = directPath;
      actualFilename = filename;
      console.log(`✅ 直接ファイル名で発見: ${filename}`);
    } else {
      // 2. UUIDを抽出してパターンマッチング
      const uuidMatch = filename.match(/([a-f0-9-]{36})/);
      if (uuidMatch) {
        const uuid = uuidMatch[1];
        console.log(`🔍 UUID抽出: ${uuid}`);
        
        // UUIDを含むファイルを検索
        try {
          const files = fs.readdirSync(imagesDir);
          console.log(`📁 ディレクトリ内のファイル数: ${files.length}`);
          
          // UUIDを含むファイルを検索（複数のパターンを試行）
          patterns = [
            `${uuid}_3_0.jpeg`,
            `${uuid}_2_0.jpeg`,
            `${uuid}_1_0.jpeg`,
            `${uuid}_0_0.jpeg`,
            `${uuid}.jpg`,
            `${uuid}.jpeg`,
            `chat_image_${uuid}_*.jpg`,
            `chat_image_${uuid}_*.jpeg`
          ];
          searchedPatterns = patterns;
          
          // パターンマッチング
          for (const pattern of patterns) {
            // ワイルドカードパターンの処理
            if (pattern.includes('*')) {
              const prefix = pattern.replace('*', '');
              const matchingFile = files.find(file => 
                file.startsWith(prefix.replace('.jpg', '').replace('.jpeg', '')) && 
                (file.endsWith('.jpg') || file.endsWith('.jpeg'))
              );
              
              if (matchingFile) {
                imagePath = path.join(imagesDir, matchingFile);
                actualFilename = matchingFile;
                console.log(`✅ ワイルドカードパターンで発見: ${matchingFile}`);
                break;
              }
            } else {
              // 完全一致パターン
              const testPath = path.join(imagesDir, pattern);
              if (fs.existsSync(testPath)) {
                imagePath = testPath;
                actualFilename = pattern;
                console.log(`✅ パターンマッチで発見: ${pattern}`);
                break;
              }
            }
          }
          
          // UUIDを含むすべてのファイルを検索（フォールバック）
          if (!imagePath) {
            const uuidFiles = files.filter(file => 
              file.includes(uuid) && 
              (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'))
            );
            
            if (uuidFiles.length > 0) {
              // 最初に見つかったファイルを使用
              imagePath = path.join(imagesDir, uuidFiles[0]);
              actualFilename = uuidFiles[0];
              console.log(`✅ UUID検索で発見: ${uuidFiles[0]} (他${uuidFiles.length - 1}件)`);
            }
          }
        } catch (dirError) {
          console.error('❌ ディレクトリ読み込みエラー:', dirError.message);
          console.error('ディレクトリパス:', imagesDir);
        }
      }
      
      // 3. ファイル名から履歴IDを抽出して検索
      if (!imagePath) {
        const historyId = filename.replace(/\.(jpg|jpeg|png)$/i, '').replace(/_3_0$|_2_0$|_1_0$|_0_0$/, '');
        if (historyId && historyId !== filename) {
          console.log(`🔍 履歴ID抽出: ${historyId}`);
          try {
            const files = fs.readdirSync(imagesDir);
            const matchingFile = files.find(file => 
              file.includes(historyId) && 
              (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'))
            );
            
            if (matchingFile) {
              imagePath = path.join(imagesDir, matchingFile);
              actualFilename = matchingFile;
              console.log(`✅ 履歴ID検索で発見: ${matchingFile}`);
            }
          } catch (dirError) {
            console.warn('ディレクトリ読み込みエラー:', dirError.message);
          }
        }
      }
    }
    
    if (!imagePath) {
      console.log(`❌ 画像ファイルが見つかりません: ${filename}`);
      return res.status(404).json({
        success: false,
        error: '画像ファイルが見つかりません',
        filename: filename,
        searchedPatterns: searchedPatterns || patterns || [],
        imagesDir: imagesDir
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
    
    // ストリーミングエラーハンドリング
    readStream.on('error', (streamError) => {
      console.error('❌ 画像ストリーミングエラー:', streamError);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: '画像ファイルの読み込みに失敗しました',
          details: streamError.message
        });
      }
    });
    
    readStream.pipe(res);
    
  } catch (error) {
    console.error('❌ chat-exports画像ファイル取得エラー:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: '画像ファイルの取得に失敗しました',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
});

// 汎用画像ファイル配信API
apiRouter.get('/images/*', (req, res) => {
  try {
    const imagePath = req.params[0];
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const alternativeDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    
    let targetDir = troubleshootingDir;
    if (!fs.existsSync(troubleshootingDir)) {
      if (fs.existsSync(alternativeDir)) {
        targetDir = alternativeDir;
      } else {
        return res.status(404).json({ error: 'ディレクトリが見つかりません' });
      }
    }
    
    const fullPath = path.join(targetDir, imagePath);
    
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

    // 大文字小文字を区別しないファイル検索関数
    const findFileCaseInsensitive = (dir, targetFileName) => {
      if (!fs.existsSync(dir)) {
        return null;
      }
      
      const files = fs.readdirSync(dir);
      const lowerTarget = targetFileName.toLowerCase();
      
      // 完全一致を優先
      if (files.includes(targetFileName)) {
        return path.join(dir, targetFileName);
      }
      
      // 大文字小文字を区別しない検索
      const foundFile = files.find(file => file.toLowerCase() === lowerTarget);
      if (foundFile) {
        console.log('✅ 大文字小文字を区別しない検索でファイルを発見:', {
          requested: targetFileName,
          found: foundFile
        });
        return path.join(dir, foundFile);
      }
      
      return null;
    };

    // 複数のパス候補を試す
    const cwd = process.cwd();
    const projectRoot = path.resolve(__dirname, '..');
    
    // emergency-flowsディレクトリのパス候補
    const emergencyFlowsPaths = [
      // プロジェクトルートから
      path.join(projectRoot, 'knowledge-base', 'images', 'emergency-flows'),
      // カレントディレクトリから
      path.join(cwd, 'knowledge-base', 'images', 'emergency-flows'),
      // サーバーディレクトリから起動されている場合
      path.join(cwd, '..', 'knowledge-base', 'images', 'emergency-flows'),
      // __dirnameから
      path.join(__dirname, '..', 'knowledge-base', 'images', 'emergency-flows'),
    ].map(p => path.resolve(p));
    
    console.log('🔍 emergency-flows パス候補:', emergencyFlowsPaths);
    console.log('📁 現在の作業ディレクトリ:', cwd);
    console.log('📁 プロジェクトルート:', projectRoot);

    let uploadDir = null;
    let filePath = null;

    // emergency-flowsディレクトリを検索
    for (const testDir of emergencyFlowsPaths) {
      if (!fs.existsSync(testDir)) {
        console.log(`⚠️ ディレクトリが存在しません: ${testDir}`);
        continue;
      }
      const foundPath = findFileCaseInsensitive(testDir, fileName);
      if (foundPath) {
        uploadDir = testDir;
        filePath = foundPath;
        console.log('✅ emergency-flowsディレクトリとファイルを発見:', {
          dir: uploadDir,
          file: filePath,
          fileName
        });
        break;
      }
    }

    // emergency-flows にファイルがない場合は chat-exports を確認
    if (!filePath) {
      const chatExportsPaths = [
        path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports'),
        path.join(cwd, 'knowledge-base', 'images', 'chat-exports'),
        path.join(cwd, '..', 'knowledge-base', 'images', 'chat-exports'),
        path.join(__dirname, '..', 'knowledge-base', 'images', 'chat-exports'),
      ].map(p => path.resolve(p));
      
      console.log('🔄 emergency-flows にファイルが見つからないため、chat-exports を確認:', {
        fileName,
        chatExportsPaths,
      });
      
      for (const testDir of chatExportsPaths) {
        if (!fs.existsSync(testDir)) {
          continue;
        }
        const foundPath = findFileCaseInsensitive(testDir, fileName);
        if (foundPath) {
          uploadDir = testDir;
          filePath = foundPath;
          console.log('✅ chat-exportsディレクトリとファイルを発見:', {
            dir: uploadDir,
            file: filePath,
            fileName
          });
          break;
        }
      }
    }

    // デバッグログ強化
    console.log('🖼️ 画像リクエスト:', {
      fileName,
      uploadDir,
      filePath,
      exists: !!filePath,
      filesInDir: fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir).slice(0, 10) : [],
    });

    if (!filePath) {
      // デバッグ情報をより詳細に収集
      const debugInfo = {
        error: 'ファイルが存在しません',
        fileName,
        searchedPaths: {
          emergencyFlows: emergencyFlowsPaths.map(p => ({
            path: p,
            exists: fs.existsSync(p),
            files: fs.existsSync(p) ? fs.readdirSync(p).slice(0, 10) : [],
          })),
          chatExports: chatExportsPaths.map(p => ({
            path: p,
            exists: fs.existsSync(p),
            files: fs.existsSync(p) ? fs.readdirSync(p).slice(0, 10) : [],
          })),
        },
        currentWorkingDirectory: cwd,
        projectRoot,
      };

      console.error('❌ 画像ファイルが見つかりません:', debugInfo);
      
      return res.status(404).json(debugInfo);
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
      requestedFileName: fileName,
      actualFilePath: filePath,
      contentType,
      fileSize: fileBuffer.length,
      sourceDir: uploadDir.includes('emergency-flows')
        ? 'emergency-flows'
        : 'chat-exports',
    });
  } catch (error) {
    console.error('❌ 画像配信エラー:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fileName: req.params.fileName,
    });
    res.status(500).json({
      success: false,
      error: '画像の配信に失敗しました',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// 履歴ルート: knowledge-base/exports内のJSONファイルから検索・フィルター
// TypeScriptファイルを直接インポートできないため、エンドポイントを直接実装
// 注意: /history/export-filesは上で既に定義されているため、ここでは重複しない

// GET /api/history/exports/search - キーワード検索
apiRouter.get('/history/exports/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    
    console.log('🔍 検索リクエスト受信:', { keyword, type: typeof keyword });
    
    if (!keyword || typeof keyword !== 'string') {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'キーワードが指定されていません',
      });
    }

    // 既存のhistoryエンドポイントと同じパス解決ロジックを使用
    const projectRoot = path.resolve(__dirname, '..');
    const exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');
    
    if (!fs.existsSync(exportsDir)) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'exportsディレクトリが見つかりません',
      });
    }

    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    // 検索語を正規化（小文字化）
    const keywordLower = keyword.toLowerCase().trim();
    const searchTerms = keywordLower.split(/\s+/).filter(term => term.length > 0);
    
    if (searchTerms.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'キーワードが無効です',
      });
    }
    
    console.log('🔍 検索開始:', { keyword, keywordLower, searchTerms, totalFiles: jsonFiles.length });
    
    const results = [];

    for (const fileName of jsonFiles) {
      try {
        const filePath = path.join(exportsDir, fileName);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        
        // JSON全体を文字列化して検索対象にする
        const fullText = JSON.stringify(jsonData).toLowerCase();
        
        // すべての検索語が含まれているか確認
        const matches = searchTerms.every(term => fullText.includes(term));
        
        if (matches) {
          // SupportHistoryItem形式に変換
          // savedImagesを画像URL形式に変換
          const processedSavedImages = (jsonData.savedImages || []).map((img) => {
            if (typeof img === 'string') {
              return img;
            }
            if (img && typeof img === 'object') {
              // fileNameがある場合は、それをURLとして使用
              if (img.fileName) {
                return {
                  ...img,
                  url: `/api/images/chat-exports/${img.fileName}`,
                  fileName: img.fileName
                };
              }
              // urlやpathがある場合はそのまま使用
              if (img.url || img.path) {
                return img;
              }
            }
            return img;
          });
          
          const item = {
            id: jsonData.chatId || fileName.replace('.json', ''),
            type: 'export',
            fileName: fileName,
            chatId: jsonData.chatId || '',
            userId: jsonData.userId || '',
            exportType: jsonData.exportType || 'manual_send',
            exportTimestamp: jsonData.exportTimestamp || new Date().toISOString(),
            messageCount: jsonData.chatData?.messages?.length || 0,
            machineType: jsonData.machineType || jsonData.chatData?.machineInfo?.machineTypeName || '',
            machineNumber: jsonData.machineNumber || jsonData.chatData?.machineInfo?.machineNumber || '',
            machineInfo: jsonData.chatData?.machineInfo || {},
            title: jsonData.title || '',
            problemDescription: jsonData.problemDescription || '',
            extractedComponents: [],
            extractedSymptoms: [],
            possibleModels: [],
            conversationHistory: jsonData.conversationHistory || [],
            metadata: {},
            savedImages: processedSavedImages,
            images: processedSavedImages.map((img) => ({
              fileName: typeof img === 'string' ? img : (img.fileName || img.url || img.path || ''),
              url: typeof img === 'string' ? img : (img.url || `/api/images/chat-exports/${img.fileName || img.path || ''}`),
              path: typeof img === 'string' ? img : (img.path || img.fileName || '')
            })),
            fileSize: 0,
            lastModified: jsonData.lastModified || jsonData.exportTimestamp || new Date().toISOString(),
            createdAt: jsonData.exportTimestamp || new Date().toISOString(),
            jsonData: jsonData,
          };
          results.push(item);
        }
      } catch (error) {
        console.warn(`ファイル読み込みエラー: ${fileName}`, error);
      }
    }

    console.log('🔍 検索完了:', { 
      keyword, 
      totalFiles: jsonFiles.length, 
      resultsCount: results.length
    });
    
    res.json({
      success: true,
      data: results,
      total: results.length,
      keyword: keyword,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ エクスポート検索エラー:', error);
    res.status(500).json({
      success: false,
      error: 'エクスポート検索に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/history/exports/filter-data - 機種・機械番号のリスト取得
apiRouter.get('/history/exports/filter-data', async (req, res) => {
  try {
    // 既存のhistoryエンドポイントと同じパス解決ロジックを使用
    const projectRoot = path.resolve(__dirname, '..');
    const exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');
    
    if (!fs.existsSync(exportsDir)) {
      return res.json({
        success: true,
        machineTypes: [],
        machineNumbers: [],
        message: 'exportsディレクトリが見つかりません',
      });
    }

    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const machineTypeSet = new Set();
    const machineNumberSet = new Set();

    for (const fileName of jsonFiles) {
      try {
        const filePath = path.join(exportsDir, fileName);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        
        // 機種を抽出
        const machineType = jsonData.machineType || jsonData.chatData?.machineInfo?.machineTypeName || '';
        if (machineType && machineType.trim()) {
          machineTypeSet.add(machineType.trim());
        }
        
        // 機械番号を抽出
        const machineNumber = jsonData.machineNumber || jsonData.chatData?.machineInfo?.machineNumber || '';
        if (machineNumber && machineNumber.trim()) {
          machineNumberSet.add(machineNumber.trim());
        }
      } catch (error) {
        console.warn(`ファイル読み込みエラー: ${fileName}`, error);
      }
    }

    const machineTypes = Array.from(machineTypeSet).sort();
    const machineNumbers = Array.from(machineNumberSet).sort();

    res.json({
      success: true,
      machineTypes: machineTypes,
      machineNumbers: machineNumbers,
      total: jsonFiles.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ フィルターデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'フィルターデータの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

console.log('✅ History exports endpoints registered');

// Knowledge Base Cleanup Endpoints
// POST /api/knowledge-base/cleanup/auto - 1年以上経過データを自動削除
apiRouter.post('/knowledge-base/cleanup/auto', async (req, res) => {
  try {
    console.log('🗑️ 自動クリーンアップリクエスト（1年以上経過データ）');
    
    const projectRoot = path.resolve(__dirname, '..');
    const knowledgeBaseDir = path.join(projectRoot, 'knowledge-base');
    
    // 削除対象ディレクトリ
    const directoriesToClean = [
      'documents',
      'text',
      'qa',
      'troubleshooting'
    ];
    
    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const dirName of directoriesToClean) {
      const targetDir = path.join(knowledgeBaseDir, dirName);
      if (!fs.existsSync(targetDir)) {
        console.log(`📂 ディレクトリが存在しません: ${targetDir}`);
        continue;
      }
      
      try {
        const files = fs.readdirSync(targetDir);
        for (const file of files) {
          const filePath = path.join(targetDir, file);
          try {
            const stats = fs.statSync(filePath);
            // 最終更新日時が1年以上前の場合
            if (stats.mtimeMs < oneYearAgo) {
              if (stats.isDirectory()) {
                // ディレクトリの場合は再帰的に削除
                fs.rmSync(filePath, { recursive: true, force: true });
                console.log(`🗑️ ディレクトリ削除: ${filePath}`);
              } else {
                fs.unlinkSync(filePath);
                console.log(`🗑️ ファイル削除: ${filePath}`);
              }
              deletedCount++;
            }
          } catch (fileError) {
            console.error(`❌ ファイル削除エラー: ${filePath}`, fileError);
            errorCount++;
          }
        }
        
        // 空のディレクトリを削除
        try {
          const remainingFiles = fs.readdirSync(targetDir);
          if (remainingFiles.length === 0) {
            // ディレクトリ自体は残す（削除しない）
          }
        } catch (dirCheckError) {
          // ディレクトリチェックエラーは無視
        }
      } catch (dirError) {
        console.error(`❌ ディレクトリ処理エラー: ${targetDir}`, dirError);
        errorCount++;
      }
    }
    
    console.log(`✅ 自動クリーンアップ完了: ${deletedCount}件削除, ${errorCount}件エラー`);
    
    res.json({
      success: true,
      deletedCount: deletedCount,
      errorCount: errorCount,
      message: `${deletedCount}件のファイルを削除しました`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 自動クリーンアップエラー:', error);
    res.status(500).json({
      success: false,
      error: '自動クリーンアップに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/knowledge-base/cleanup/manual - 手動クリーンアップ（日数指定または全削除）
apiRouter.post('/knowledge-base/cleanup/manual', async (req, res) => {
  try {
    const { olderThanDays, deleteAll } = req.body;
    console.log('🗑️ 手動クリーンアップリクエスト:', { olderThanDays, deleteAll });
    
    const projectRoot = path.resolve(__dirname, '..');
    const knowledgeBaseDir = path.join(projectRoot, 'knowledge-base');
    
    // 削除対象ディレクトリ
    const directoriesToClean = [
      'documents',
      'text',
      'qa',
      'troubleshooting'
    ];
    
    let cutoffTime;
    if (deleteAll) {
      cutoffTime = Date.now() + (365 * 24 * 60 * 60 * 1000); // 未来の日時 = すべて削除
      console.log('⚠️ 全削除モード');
    } else if (olderThanDays && typeof olderThanDays === 'number') {
      cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      console.log(`📅 ${olderThanDays}日以上経過データを削除`);
    } else {
      return res.status(400).json({
        success: false,
        error: 'olderThanDaysまたはdeleteAllの指定が必要です',
        timestamp: new Date().toISOString()
      });
    }
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const dirName of directoriesToClean) {
      const targetDir = path.join(knowledgeBaseDir, dirName);
      if (!fs.existsSync(targetDir)) {
        console.log(`📂 ディレクトリが存在しません: ${targetDir}`);
        continue;
      }
      
      try {
        const files = fs.readdirSync(targetDir);
        for (const file of files) {
          const filePath = path.join(targetDir, file);
          try {
            const stats = fs.statSync(filePath);
            // 全削除モードまたは指定日数より古い場合
            if (deleteAll || stats.mtimeMs < cutoffTime) {
              if (stats.isDirectory()) {
                // ディレクトリの場合は再帰的に削除
                fs.rmSync(filePath, { recursive: true, force: true });
                console.log(`🗑️ ディレクトリ削除: ${filePath}`);
              } else {
                fs.unlinkSync(filePath);
                console.log(`🗑️ ファイル削除: ${filePath}`);
              }
              deletedCount++;
            }
          } catch (fileError) {
            console.error(`❌ ファイル削除エラー: ${filePath}`, fileError);
            errorCount++;
          }
        }
      } catch (dirError) {
        console.error(`❌ ディレクトリ処理エラー: ${targetDir}`, dirError);
        errorCount++;
      }
    }
    
    console.log(`✅ 手動クリーンアップ完了: ${deletedCount}件削除, ${errorCount}件エラー`);
    
    res.json({
      success: true,
      deletedCount: deletedCount,
      errorCount: errorCount,
      message: `${deletedCount}件のファイルを削除しました`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 手動クリーンアップエラー:', error);
    res.status(500).json({
      success: false,
      error: '手動クリーンアップに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/knowledge-base/archives - アーカイブ一覧取得
apiRouter.get('/knowledge-base/archives', async (req, res) => {
  try {
    console.log('📁 アーカイブ一覧取得リクエスト');
    
    const projectRoot = path.resolve(__dirname, '..');
    const archivesDir = path.join(projectRoot, 'knowledge-base', 'archives');
    
    if (!fs.existsSync(archivesDir)) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'アーカイブディレクトリが存在しません',
        timestamp: new Date().toISOString()
      });
    }
    
    const files = fs.readdirSync(archivesDir);
    const archiveFiles = files
      .filter(file => file.endsWith('.zip') || file.endsWith('.tar.gz'))
      .map(file => {
        const filePath = path.join(archivesDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      data: archiveFiles,
      total: archiveFiles.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ アーカイブ一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'アーカイブ一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

console.log('✅ Knowledge Base cleanup endpoints registered');

// APIルーターをマウント（すべてのエンドポイント定義の後）
app.use('/api', apiRouter);

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
  const env = process.env.NODE_ENV || 'development';
  console.log(`🚀 Emergency Assistance Unified Server running on port ${PORT}`);
  console.log(`📊 Environment: ${env}`);
  
  if (isDevelopment) {
    console.log(`🌐 Frontend: http://localhost:${PORT} (proxied to Vite on port ${CLIENT_PORT})`);
    console.log(`🔥 Hot reload: Enabled`);
    console.log(`📁 Source files: Direct from client/src (no build required)`);
  } else {
    const publicDir = path.join(__dirname, 'public');
    const clientDistDir = path.join(__dirname, '..', 'client', 'dist');
    const staticDir = fs.existsSync(publicDir) ? 'public' : (fs.existsSync(clientDistDir) ? 'client/dist' : 'none');
    console.log(`🌐 Frontend: http://localhost:${PORT} (static files from ${staticDir})`);
    console.log(`📦 Production mode: Static files only`);
  }
  
  console.log(`🔗 API: http://localhost:${PORT}/api`);
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
