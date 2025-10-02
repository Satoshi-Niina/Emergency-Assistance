#!/usr/bin/env node

// ローカル開発環境用サーバー（本番に近い構造）
// モックデータではなく、実際のデータベースとファイルシステムを使用

import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { runMigrations } from './startup-migration.js';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ローカル環境変数を読み込み
const localEnvPath = path.join(__dirname, '..', 'local.env');
console.log('🔍 Loading local environment from:', localEnvPath);

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
  console.log('✅ Local environment loaded');
} else {
  console.log('⚠️ local.env not found, using system environment variables');
}

const app = express();
const PORT = process.env.PORT || 8000;

// データベース接続プール
let dbPool = null;

// データベース接続初期化
function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL is not set - running without database');
    return;
  }

  try {
    console.log('🔗 Initializing local database connection...');
    console.log('📊 DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('🔒 PG_SSL:', process.env.PG_SSL || 'not set');

    const sslConfig = process.env.PG_SSL === 'require' 
      ? { rejectUnauthorized: false }
      : process.env.PG_SSL === 'disable' 
      ? false 
      : { rejectUnauthorized: false };

    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 3,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 60000,
      query_timeout: 60000,
      statement_timeout: 60000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 0,
    });

    console.log('✅ Local database pool initialized');
    
    // 接続テスト
    setTimeout(async () => {
      try {
        const client = await dbPool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as version');
        await client.release();
        console.log('✅ Database connection test successful:', result.rows[0]);
      } catch (err) {
        console.warn('⚠️ Database connection test failed:', err.message);
        console.warn('⚠️ Server will continue running without database features');
      }
    }, 1000);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

// ローカルストレージ初期化（knowledge-baseのみ使用）
function initializeLocalStorage() {
  try {
    const knowledgeBasePath = path.join(process.cwd(), '..', 'knowledge-base');
    if (!fs.existsSync(knowledgeBasePath)) {
      fs.mkdirSync(knowledgeBasePath, { recursive: true });
      console.log('✅ Knowledge base directory created:', knowledgeBasePath);
    } else {
      console.log('✅ Knowledge base directory exists:', knowledgeBasePath);
    }
  } catch (error) {
    console.error('❌ Knowledge base initialization failed:', error);
  }
}

// セッション設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'local-development-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // ローカル環境ではHTTP
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24時間
  }
}));

// CORS設定
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:5178',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'expires',
    'cache-control',
    'pragma',
    'if-modified-since',
    'if-none-match',
    'etag',
    'last-modified'
  ]
}));

// JSON解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ルート設定
try {
  const configRoutes = await import('./routes/config.js');
  app.use('/api/config', configRoutes.default);
  console.log('✅ Config routes loaded');
} catch (error) {
  console.log('⚠️ Config routes not available:', error.message);
}

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'local-development',
    port: PORT,
    database: dbPool ? 'connected' : 'not_configured',
    storage: 'local_filesystem'
  });
});

// ログインエンドポイント（データベース認証）
app.post('/api/auth/login', async (req, res) => {
  try {
  const { username, password } = req.body;
  
  console.log('🔐 Local login attempt:', { 
    username, 
    hasPassword: !!password,
    timestamp: new Date().toISOString()
  });
  
    if (!username || !password) {
      return res.status(400).json({
      success: false,
      error: 'bad_request',
      message: 'Username and password required'
      });
    }

    if (!dbPool) {
      console.log('❌ Database pool not available');
      return res.status(500).json({
        success: false,
        error: 'database_unavailable',
        message: 'Database connection not available'
      });
    }

    try {
      // データベースからユーザーを検索
      console.log('🔍 Querying database for user:', username);
      const client = await dbPool.connect();
      
      const result = await client.query(
        'SELECT id, username, password, role, display_name, department FROM users WHERE username = $1 LIMIT 1',
        [username]
      );
      await client.release();
      
      console.log('🔍 User search result:', { 
        found: result.rows.length > 0,
        userCount: result.rows.length 
      });

      if (result.rows.length === 0) {
        console.log('❌ User not found:', username);
        return res.status(401).json({ 
          success: false, 
          error: 'invalid_credentials',
          message: 'ユーザー名またはパスワードが正しくありません'
        });
      }

      const foundUser = result.rows[0];
      console.log('🔍 User found:', { 
        id: foundUser.id, 
        username: foundUser.username, 
        role: foundUser.role 
      });

      // パスワード比較
      console.log('🔍 Comparing password...');
      console.log('🔍 Input password:', password);
      console.log('🔍 Stored hash:', foundUser.password);
      const isPasswordValid = await bcrypt.compare(password, foundUser.password);
      console.log('🔍 Password valid:', isPasswordValid);
      
      if (!isPasswordValid) {
        console.log('❌ Invalid password for user:', username);
        return res.status(401).json({ 
          success: false, 
          error: 'invalid_credentials',
          message: 'ユーザー名またはパスワードが正しくありません'
        });
      }

      // 成功レスポンス
      console.log('✅ Login successful:', { username, role: foundUser.role });
      
      // セッションにユーザー情報を保存
      req.session.user = {
        id: foundUser.id,
        username: foundUser.username,
        role: foundUser.role,
        displayName: foundUser.display_name,
        department: foundUser.department
      };
      
      res.json({
      success: true,
      user: {
          id: foundUser.id,
          username: foundUser.username,
          role: foundUser.role,
          displayName: foundUser.display_name,
          department: foundUser.department
        },
        message: 'ログインに成功しました'
      });
    } catch (dbError) {
      console.error('❌ Database error during login:', dbError);
      return res.status(500).json({
      success: false,
        error: 'database_error',
        message: 'データベースエラーが発生しました'
      });
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: '内部サーバーエラーが発生しました'
    });
  }
});

// 認証ハンドシェイク
app.get('/api/auth/handshake', (req, res) => {
  res.json({
    ok: true,
    mode: 'session',
    env: 'local-development',
    timestamp: new Date().toISOString()
  });
});

// 現在のユーザー情報
app.get('/api/auth/me', (req, res) => {
  if (req.session.user) {
  res.json({
    success: true,
      user: req.session.user
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'not_authenticated',
      message: '認証されていません'
    });
  }
});

// ログアウト
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Session destruction error:', err);
      return res.status(500).json({
        success: false,
        message: 'ログアウトに失敗しました'
      });
    }
  res.json({
    success: true,
      message: 'ログアウトしました'
    });
  });
});

// ローカルストレージAPI
// ファイル一覧取得
app.get('/api/storage/list', async (req, res) => {
  try {
    const prefix = req.query.prefix || '';
    console.log('📁 Local storage list request:', { prefix });
    
    const fullPath = path.join(process.cwd(), '..', 'knowledge-base', prefix);
    
    if (!fs.existsSync(fullPath)) {
      return res.json({
        success: true,
        data: [],
        message: `Directory not found: ${prefix}`,
        timestamp: new Date().toISOString()
      });
    }
    
    const files = fs.readdirSync(fullPath, { withFileTypes: true })
      .filter(dirent => dirent.isFile())
      .map(dirent => {
        const filePath = path.join(fullPath, dirent.name);
        const stats = fs.statSync(filePath);
        return {
          name: path.join(prefix, dirent.name).replace(/\\/g, '/'),
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          contentType: 'application/json'
        };
      });
    
  res.json({
    success: true,
      data: files,
      message: `ローカルストレージファイル一覧を取得しました: ${files.length} files`,
    timestamp: new Date().toISOString()
  });
  } catch (error) {
    console.error('❌ Storage list error:', error);
    res.status(500).json({
      error: 'storage_list_error',
      message: error.message
    });
  }
});

// ファイル内容取得
app.get('/api/storage/json/:name', (req, res) => {
  try {
    const name = req.params.name;
    console.log('📄 Local storage get request:', { name });
    
    const filePath = path.join(process.cwd(), '..', 'knowledge-base', name);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'file_not_found',
        message: `File not found: ${name}`
      });
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
  res.json({
    success: true,
      content: content,
      name: name,
    timestamp: new Date().toISOString()
  });
  } catch (error) {
    console.error('❌ Storage get error:', error);
    res.status(500).json({
      error: 'storage_get_error',
      message: error.message
    });
  }
});

// ファイル保存
app.put('/api/storage/json/:name', (req, res) => {
  try {
    const name = req.params.name;
    const content = req.body;
    console.log('💾 Local storage save request:', { name, contentLength: JSON.stringify(content).length });
    
    const filePath = path.join(process.cwd(), '..', 'knowledge-base', name);
    const dirPath = path.dirname(filePath);
    
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // ファイルを保存
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    
  res.json({
    success: true,
      message: 'ファイルを保存しました',
      name: name,
    timestamp: new Date().toISOString()
  });
  } catch (error) {
    console.error('❌ Storage save error:', error);
    res.status(500).json({
      error: 'storage_save_error',
      message: error.message
    });
  }
});

// 画像URL取得（ローカルファイルシステム用）
app.get('/api/storage/image-url', (req, res) => {
  const name = req.query.name;
  console.log('🖼️ Local storage image URL request:', { name });
  
  // ローカルファイルシステムの画像URL
  res.json({
    success: true,
    url: `http://localhost:${PORT}/api/local-image/${encodeURIComponent(name)}`,
    message: 'ローカル画像URL',
    timestamp: new Date().toISOString()
  });
});

// ローカル画像配信
app.get('/api/local-image/:name', (req, res) => {
  const name = req.params.name;
  console.log('🖼️ Local image request:', { name });
  
  // 複数の場所から画像を探す（既存のknowledge-baseを優先）
  const searchPaths = [
    path.join(process.cwd(), '..', 'knowledge-base', 'images', 'emergency-flows', name),
    path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports', name),
    path.join(process.cwd(), '..', 'knowledge-base', 'images', name),
    path.join(process.cwd(), 'client', 'public', 'images', name),
    path.join(process.cwd(), 'images', name)
  ];
  
  for (const imagePath of searchPaths) {
    if (fs.existsSync(imagePath)) {
      console.log('📁 Found image at:', imagePath);
      return res.sendFile(imagePath);
    }
  }
  
  console.log('❌ Image not found:', name);
  res.status(404).json({
    error: 'image_not_found',
    message: `Image not found: ${name}`,
    searchedPaths: searchPaths
  });
});

// 応急処置フロー画像配信
app.get('/api/emergency-flow/image/:name', (req, res) => {
  const name = req.params.name;
  console.log('🖼️ Emergency flow image request:', { name });
  
  // 複数の場所から画像を探す（既存のknowledge-baseを優先）
  const searchPaths = [
    path.join(process.cwd(), '..', 'knowledge-base', 'images', 'emergency-flows', name),
    path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports', name),
    path.join(process.cwd(), '..', 'knowledge-base', 'images', name),
    path.join(process.cwd(), 'client', 'public', 'images', name),
    path.join(process.cwd(), 'images', name)
  ];
  
  for (const imagePath of searchPaths) {
    if (fs.existsSync(imagePath)) {
      console.log('📁 Found emergency flow image at:', imagePath);
      return res.sendFile(imagePath);
    }
  }
  
  console.log('❌ Emergency flow image not found:', name);
  res.status(404).json({
    success: false,
    error: 'not_found',
    message: '応急処置フロー画像が見つかりません'
  });
});

// トラブルシューティング画像配信
app.get('/api/troubleshooting/image/:name', (req, res) => {
  const name = req.params.name;
  console.log('🖼️ Troubleshooting image request:', { name });
  
  // 複数の場所から画像を探す（既存のknowledge-baseを優先）
  const searchPaths = [
    path.join(process.cwd(), '..', 'knowledge-base', 'images', 'emergency-flows', name),
    path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports', name),
    path.join(process.cwd(), '..', 'knowledge-base', 'images', name),
    path.join(process.cwd(), 'client', 'public', 'images', name),
    path.join(process.cwd(), 'images', name)
  ];
  
  for (const imagePath of searchPaths) {
    if (fs.existsSync(imagePath)) {
      console.log('📁 Found troubleshooting image at:', imagePath);
      return res.sendFile(imagePath);
    }
  }
  
  console.log('❌ Troubleshooting image not found:', name);
  res.status(404).json({
    success: false,
    error: 'not_found',
    message: 'トラブルシューティング画像が見つかりません'
  });
});

// 機種一覧API
app.get('/api/machines/machine-types', async (req, res) => {
  try {
    console.log('🔧 Machine types request');
    
    if (!dbPool) {
      return res.json({
    success: true,
    data: [
          { id: '1', machine_type_name: '軌道モータカー', description: '軌道走行用モータカー' },
          { id: '2', machine_type_name: '鉄製トロ（10t）', description: '10トン積載の鉄製トロ' },
          { id: '3', machine_type_name: 'クレーン', description: '建設用クレーン' },
          { id: '4', machine_type_name: 'ブルドーザー', description: '土木作業用ブルドーザー' },
          { id: '5', machine_type_name: 'ショベルカー', description: '掘削用ショベルカー' }
        ],
        message: '機種一覧を取得しました（データベース未接続）',
    timestamp: new Date().toISOString()
  });
    }

    const client = await dbPool.connect();
    const result = await client.query('SELECT id, machine_type_name FROM machine_types ORDER BY machine_type_name');
    await client.release();

  res.json({
      success: true,
      data: result.rows,
      message: '機種一覧を取得しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Machine types error:', error);
    res.status(500).json({
      success: false,
      error: 'machine_types_error',
      message: error.message
    });
  }
});

// 機械一覧API
app.get('/api/machines/machines', async (req, res) => {
  try {
  const { type_id } = req.query;
    console.log('🔧 Machines request:', { type_id });
    
    if (!dbPool) {
      return res.json({
    success: true,
    data: [
          { id: '1', machine_number: 'MC-001', machine_type_id: type_id || '1', description: '軌道モータカー 1号機' },
          { id: '2', machine_number: 'MC-002', machine_type_id: type_id || '1', description: '軌道モータカー 2号機' },
          { id: '3', machine_number: 'TR-001', machine_type_id: type_id || '2', description: '鉄製トロ 1号機' }
        ],
        message: '機械一覧を取得しました（データベース未接続）',
    timestamp: new Date().toISOString()
  });
    }

    const client = await dbPool.connect();
    let query = 'SELECT id, machine_number, machine_type_id FROM machines';
    let params = [];
    
    if (type_id) {
      query += ' WHERE machine_type_id = $1';
      params.push(type_id);
    }
    
    query += ' ORDER BY machine_number';
    
    const result = await client.query(query, params);
    await client.release();

  res.json({
      success: true,
      data: result.rows,
      message: '機械一覧を取得しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Machines error:', error);
    res.status(500).json({
      success: false,
      error: 'machines_error',
      message: error.message
    });
  }
});

// 全機械一覧API（machine-management.tsx用）
app.get('/api/machines/all-machines', async (req, res) => {
  try {
    console.log('🔧 All machines request');
    
    if (!dbPool) {
      return res.json({
    success: true,
    data: [
      {
            id: '1', 
            machine_number: 'MC-001', 
            machine_type_id: '1',
            machine_type_name: '軌道モータカー',
            description: '軌道モータカー 1号機',
            status: 'active',
            location: '工場A',
            last_maintenance: '2025-09-01T00:00:00.000Z'
          },
          { 
            id: '2', 
            machine_number: 'MC-002', 
            machine_type_id: '1',
            machine_type_name: '軌道モータカー',
            description: '軌道モータカー 2号機',
            status: 'active',
            location: '工場A',
            last_maintenance: '2025-09-15T00:00:00.000Z'
          },
          { 
            id: '3', 
            machine_number: 'TR-001', 
            machine_type_id: '2',
            machine_type_name: '鉄製トロ（10t）',
            description: '鉄製トロ 1号機',
            status: 'maintenance',
            location: '工場B',
            last_maintenance: '2025-09-20T00:00:00.000Z'
          }
        ],
        message: '全機械一覧を取得しました（データベース未接続）',
    timestamp: new Date().toISOString()
  });
    }

    const client = await dbPool.connect();
    const query = `
      SELECT 
        m.id, 
        m.machine_number, 
        m.machine_type_id,
        mt.machine_type_name,
        m.created_at
      FROM machines m
      LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
      ORDER BY m.machine_number
    `;
    
    const result = await client.query(query);
    await client.release();

    // データベースの結果に追加フィールドをマッピング
    const enrichedData = result.rows.map(row => ({
      ...row,
      description: `${row.machine_type_name || 'Unknown'} - ${row.machine_number}`,
      status: 'active',
      location: '工場A',
      last_maintenance: row.created_at
    }));

    res.json({
      success: true,
      data: enrichedData,
      message: '全機械一覧を取得しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ All machines error:', error);
    res.status(500).json({
      success: false,
      error: 'all_machines_error',
      message: error.message
    });
  }
});

// 全機械一覧API（machine-list.tsx用）
app.get('/api/all-machines', async (req, res) => {
  try {
    console.log('🔧 All machines (alternative) request');
    
    // /api/machines/all-machinesと同じデータを返す
    const response = await fetch(`http://localhost:${PORT}/api/machines/all-machines`);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error('❌ All machines (alternative) error:', error);
    res.status(500).json({
      success: false,
      error: 'all_machines_alternative_error',
      message: error.message
    });
  }
});

// ナレッジベースAPI
app.get('/api/knowledge-base', async (req, res) => {
  try {
    console.log('📚 Knowledge base request');
    
    // ローカルストレージからナレッジベースファイルを取得
    const knowledgePath = path.join(process.cwd(), '..', 'knowledge-base');
    
    if (!fs.existsSync(knowledgePath)) {
      return res.json({
        success: true,
        data: [],
        message: 'ナレッジベースディレクトリが存在しません',
        timestamp: new Date().toISOString()
      });
    }
    
    const files = fs.readdirSync(knowledgePath, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
      .map(dirent => {
        const filePath = path.join(knowledgePath, dirent.name);
        const stats = fs.statSync(filePath);
        return {
          id: dirent.name.replace('.json', ''),
          name: dirent.name.replace('.json', ''),
          type: 'document',
          createdAt: stats.birthtime.toISOString(),
          size: stats.size
        };
      });
    
  res.json({
      success: true,
      data: files,
      total: files.length,
      message: 'ナレッジベースを取得しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Knowledge base error:', error);
    res.status(500).json({
      success: false,
      error: 'knowledge_base_error',
      message: error.message
    });
  }
});

// 履歴API
app.get('/api/history', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    console.log('📜 History request:', { limit, offset });
    
    res.json({
      success: true,
      data: [],
      total: 0,
      message: '履歴データは空です（ローカル開発）',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ History error:', error);
    res.status(500).json({
      success: false,
      error: 'history_error',
      message: error.message
    });
  }
});

// ユーザー一覧API
app.get('/api/users', async (req, res) => {
  try {
    console.log('👥 Users request');
    
    if (!dbPool) {
      return res.json({
    success: true,
    data: [
          { id: 'admin-001', username: 'admin', role: 'admin', displayName: '管理者' },
          { id: 'niina-001', username: 'niina', role: 'admin', displayName: 'Niina' },
          { id: 'takabeni1-001', username: 'takabeni1', role: 'admin', displayName: 'Takabeni1' },
          { id: 'takabeni2-001', username: 'takabeni2', role: 'employee', displayName: 'Takabeni2' },
          { id: 'employee-001', username: 'employee', role: 'employee', displayName: '一般ユーザー' }
        ],
        message: 'ユーザー一覧を取得しました（データベース未接続）',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query('SELECT id, username, role, display_name FROM users ORDER BY username');
    await client.release();

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        username: row.username,
        role: row.role,
        displayName: row.display_name || row.username
      })),
      message: 'ユーザー一覧を取得しました',
    timestamp: new Date().toISOString()
  });
  } catch (error) {
    console.error('❌ Users error:', error);
    res.status(500).json({
      success: false,
      error: 'users_error',
      message: error.message
    });
  }
});

// RAG設定API
app.get('/api/settings/rag', (req, res) => {
  console.log('⚙️ RAG settings request');
  
  res.json({
    success: true,
    data: {
      enabled: true,
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      knowledgeBaseEnabled: true
    },
    message: 'RAG設定を取得しました（ローカル開発）',
    timestamp: new Date().toISOString()
  });
});

// 応急処置フロー一覧API（flows）
app.get('/api/flows', async (req, res) => {
  try {
    console.log('🔄 Flows request');
    
    // 既存のknowledge-base/troubleshootingディレクトリからフローファイルを取得
    const troubleshootingPath = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    
    let allFiles = [];
    
    // 既存のtroubleshootingディレクトリからファイルを取得
    if (fs.existsSync(troubleshootingPath)) {
      console.log('📁 Troubleshooting path:', troubleshootingPath);
      console.log('📁 Path exists:', fs.existsSync(troubleshootingPath));
      
      const files = fs.readdirSync(troubleshootingPath);
      console.log('📁 Files in troubleshooting:', files);
      
      const troubleshootingFiles = fs.readdirSync(troubleshootingPath, { withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
        .map(dirent => {
          const filePath = path.join(troubleshootingPath, dirent.name);
          const stats = fs.statSync(filePath);
          
          // JSONファイルの内容を読み込んで、実際のデータを使用
          let fileData = {};
          try {
            const jsonContent = fs.readFileSync(filePath, 'utf8');
            fileData = JSON.parse(jsonContent);
          } catch (error) {
            console.warn('JSONファイルの読み込みに失敗:', dirent.name, error.message);
          }
          
          return {
            id: fileData.id || dirent.name.replace('.json', ''),
            name: dirent.name.replace('.json', ''),
            title: fileData.title || dirent.name.replace('.json', ''),
            type: 'flow',
            createdAt: fileData.createdAt || stats.birthtime.toISOString(),
            size: stats.size,
            filePath: `knowledge-base/troubleshooting/${dirent.name}`,
            // 実際のJSONデータを追加
            description: fileData.description || '',
            steps: fileData.steps || [],
            category: fileData.category || 'troubleshooting',
            tags: fileData.tags || [],
            // 画像情報を追加
            hasImages: fileData.steps && fileData.steps.some(step => 
              step.imageUrl || step.images || (step.content && step.content.includes('data:image/'))
            ),
            imageCount: fileData.steps ? 
              fileData.steps.filter(step => 
                step.imageUrl || step.images || (step.content && step.content.includes('data:image/'))
              ).length : 0
          };
        });
      allFiles = allFiles.concat(troubleshootingFiles);
    }
    
    console.log('📁 Found flows:', allFiles.length);
    
    res.json({
      success: true,
      data: allFiles,
      total: allFiles.length,
      message: 'フロー一覧を取得しました',
    timestamp: new Date().toISOString()
  });
  } catch (error) {
    console.error('❌ Flows error:', error);
    res.status(500).json({
      success: false,
      error: 'flows_error',
      message: error.message
    });
  }
});

// 応急処置フロー一覧API（emergency-flow/list）
app.get('/api/emergency-flow/list', async (req, res) => {
  try {
    console.log('🚨 Emergency flow list request');
    
    // 既存のknowledge-base/troubleshootingディレクトリからフローファイルを取得
    const troubleshootingPath = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingPath)) {
      return res.json({
        success: true,
        data: [],
        message: '応急処置フローディレクトリが存在しません',
        timestamp: new Date().toISOString()
      });
    }
    
    const files = fs.readdirSync(troubleshootingPath, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
      .map(dirent => {
        const filePath = path.join(troubleshootingPath, dirent.name);
        const stats = fs.statSync(filePath);
        
        // JSONファイルの内容を読み込んで、実際のデータを使用
        let fileData = {};
        try {
          const jsonContent = fs.readFileSync(filePath, 'utf8');
          fileData = JSON.parse(jsonContent);
        } catch (error) {
          console.warn('JSONファイルの読み込みに失敗:', dirent.name, error.message);
        }
        
        return {
          id: fileData.id || dirent.name.replace('.json', ''),
          name: dirent.name.replace('.json', ''),
          title: fileData.title || dirent.name.replace('.json', ''),
          type: 'emergency-flow',
          createdAt: fileData.createdAt || stats.birthtime.toISOString(),
          size: stats.size,
          filePath: `knowledge-base/troubleshooting/${dirent.name}`,
          description: fileData.description || '',
          steps: fileData.steps || [],
          category: fileData.category || 'troubleshooting',
          tags: fileData.tags || []
        };
      });
    
  res.json({
    success: true,
      data: files,
      total: files.length,
      message: '応急処置フロー一覧を取得しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Emergency flow list error:', error);
    res.status(500).json({
      success: false,
      error: 'emergency_flow_list_error',
      message: error.message
    });
  }
});

// チャット送信API（テスト用）
app.post('/api/chats/:id/send-test', async (req, res) => {
  try {
    const { id } = req.params;
    const { chatData, exportType } = req.body;
    
    console.log('💬 Chat send test request:', { id, exportType });
    console.log('📊 Chat data:', chatData);
    
    // チャットデータをknowledge-base/exportsに保存
    const exportsPath = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
    
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(exportsPath)) {
      fs.mkdirSync(exportsPath, { recursive: true });
      console.log('📁 Created exports directory:', exportsPath);
    }
    
    // ユーザーの最初のリクエスト内容を要約してファイル名を生成
    let summaryTitle = chatData.title || 'チャット';
    
    // 会話履歴から最初のユーザーメッセージを取得
    const conversationHistory = chatData.conversationHistory || [];
    const firstUserMessage = conversationHistory.find(msg => msg.role === 'user');
    
    if (firstUserMessage && firstUserMessage.content) {
      try {
        console.log('🤖 Generating summary title from first message:', firstUserMessage.content);
        
        // GPT-4oを使用してタイトルを生成（一時的に無効化）
        // TODO: ログイン問題解決後に再有効化
        /*
        if (process.env.OPENAI_API_KEY && 
            !process.env.OPENAI_API_KEY.includes('CHANGE_THIS') && 
            !process.env.OPENAI_API_KEY.includes('your-actual-openai-api-key-here') &&
            process.env.OPENAI_API_KEY.length >= 20) {
          
          const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: 'ユーザーの最初のメッセージから、機械のトラブルシューティングに関連する簡潔なタイトルを生成してください。10文字以内の日本語で、問題の核心を表すタイトルにしてください。例：「エンジン不調」「ブレーキ異常」「油圧問題」など。'
                },
                {
                  role: 'user',
                  content: `最初のメッセージ: ${firstUserMessage.content}\n\nこの内容から簡潔なタイトルを生成してください。`
                }
              ],
              max_tokens: 50,
              temperature: 0.3
            })
          });

          if (openaiResponse.ok) {
            const openaiData = await openaiResponse.json();
            const generatedTitle = openaiData.choices?.[0]?.message?.content?.trim();
            if (generatedTitle && generatedTitle.length > 0) {
              // 特殊文字を除去してファイル名に適した形にする
              summaryTitle = generatedTitle.replace(/[<>:"/\\|?*]/g, '').substring(0, 20);
              console.log('✅ Generated title:', summaryTitle);
            }
          }
        }
        */
        
        // 一時的に最初のメッセージの最初の部分を使用
        summaryTitle = firstUserMessage.content.substring(0, 20).replace(/[<>:"/\\|?*]/g, '');
        console.log('📝 Using fallback title:', summaryTitle);
      } catch (error) {
        console.log('⚠️ Title generation failed, using fallback:', error.message);
        // GPT生成に失敗した場合は、最初のメッセージの最初の部分を使用
        summaryTitle = firstUserMessage.content.substring(0, 20).replace(/[<>:"/\\|?*]/g, '');
      }
    }
    
    // ファイル名を生成（要約タイトル + ID + タイムスタンプ）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${summaryTitle}_${id}_${timestamp}.json`;
    const filePath = path.join(exportsPath, fileName);
    
    // チャットデータを保存
    const saveData = {
      chatId: id,
      userId: chatData.userId || 'local-user',
      exportType: exportType || 'manual_send',
      exportTimestamp: new Date().toISOString(),
      title: summaryTitle,
      problemDescription: chatData.problemDescription || '',
      machineType: chatData.machineType || 'Unknown',
      machineNumber: chatData.machineNumber || 'Unknown',
      extractedComponents: chatData.extractedComponents || [],
      extractedSymptoms: chatData.extractedSymptoms || [],
      possibleModels: chatData.possibleModels || [],
      conversationHistory: chatData.conversationHistory || [],
      ...chatData
    };
    
    fs.writeFileSync(filePath, JSON.stringify(saveData, null, 2), 'utf8');
    console.log('💾 Chat data saved to:', filePath);
    
    res.json({
      success: true,
      message: 'チャットデータを保存しました',
      chatId: id,
      filePath: `knowledge-base/exports/${fileName}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Chat send test error:', error);
    res.status(500).json({
      success: false,
      error: 'chat_send_test_error',
      message: error.message
    });
  }
});

// 履歴管理API（機械故障履歴）
app.get('/api/history/machine-data', async (req, res) => {
  try {
    console.log('📊 Machine data history request');
    
    let allFiles = [];
    
    // knowledge-base/exportsディレクトリのみからファイルを取得
    const exportsPath = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
    console.log('📁 Exports path:', exportsPath);
    console.log('📁 Path exists:', fs.existsSync(exportsPath));
    
    if (fs.existsSync(exportsPath)) {
      const files = fs.readdirSync(exportsPath);
      console.log('📁 Files in exports:', files);
      
      const exportFiles = fs.readdirSync(exportsPath, { withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
        .map(dirent => {
          const filePath = path.join(exportsPath, dirent.name);
          const stats = fs.statSync(filePath);
          
          // JSONファイルの内容を読み込んで、実際のデータを使用
          let fileData = {};
          try {
            const jsonContent = fs.readFileSync(filePath, 'utf8');
            fileData = JSON.parse(jsonContent);
          } catch (error) {
            console.warn('JSONファイルの読み込みに失敗:', dirent.name, error.message);
          }
          
          return {
            id: fileData.chatId || dirent.name.replace('.json', ''),
            name: dirent.name.replace('.json', ''),
            title: fileData.title || dirent.name.replace('.json', ''),
            type: 'history',
            createdAt: fileData.exportTimestamp || stats.birthtime.toISOString(),
            size: stats.size,
            filePath: `knowledge-base/exports/${dirent.name}`,
            category: 'exports',
            // 実際のJSONデータを追加
            machineType: fileData.machineType || 'Unknown',
            machineNumber: fileData.machineNumber || 'Unknown',
            problemDescription: fileData.problemDescription || '',
            extractedComponents: fileData.extractedComponents || [],
            extractedSymptoms: fileData.extractedSymptoms || [],
            possibleModels: fileData.possibleModels || [],
            conversationHistory: fileData.conversationHistory || [],
            // 画像情報を追加
            hasImages: fileData.conversationHistory && fileData.conversationHistory.some(msg => 
              msg.content && msg.content.startsWith('data:image/')
            ),
            imageCount: fileData.conversationHistory ? 
              fileData.conversationHistory.filter(msg => 
                msg.content && msg.content.startsWith('data:image/')
              ).length : 0
          };
        });
      allFiles = allFiles.concat(exportFiles);
    }
    
    console.log('📁 Found history files:', allFiles.length);
    console.log('📁 History files details:', allFiles.map(f => ({ id: f.id, category: f.category, filePath: f.filePath })));
    
    res.json({
      success: true,
      data: allFiles,
      total: allFiles.length,
      message: '機械故障履歴を取得しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Machine data history error:', error);
    res.status(500).json({
      success: false,
      error: 'machine_data_history_error',
      message: error.message
    });
  }
});

// 履歴詳細API
app.get('/api/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📄 History detail request:', id);
    
    // knowledge-base/exportsから履歴ファイルを取得
    const exportsPath = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
    const historyPath = path.join(exportsPath, `${id}.json`);
    
    if (!fs.existsSync(historyPath)) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: '履歴ファイルが見つかりません'
      });
    }
    
    const fileContent = fs.readFileSync(historyPath, 'utf8');
    const historyData = JSON.parse(fileContent);
    
    res.json({
      success: true,
      data: historyData,
      message: '履歴詳細を取得しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ History detail error:', error);
    res.status(500).json({
      success: false,
      error: 'history_detail_error',
      message: error.message
    });
  }
});

// フロー詳細API
app.get('/api/emergency-flow/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔄 Emergency flow detail request:', id);
    
    let flowData = null;
    let filePath = null;
    
    // 既存のknowledge-base/troubleshootingディレクトリからファイルを探す
    const troubleshootingPath = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting', `${id}.json`);
    if (fs.existsSync(troubleshootingPath)) {
      filePath = troubleshootingPath;
    }
    
    if (!filePath) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'フローファイルが見つかりません'
      });
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    flowData = JSON.parse(fileContent);
    
    console.log('📄 Loaded flow from:', filePath);
    console.log('📄 Flow data structure:', {
      hasId: 'id' in flowData,
      hasTitle: 'title' in flowData,
      hasSteps: 'steps' in flowData,
      stepsLength: flowData.steps?.length || 0,
      allKeys: Object.keys(flowData)
    });
    
    // フローの詳細データを直接返す（フロントエンドが期待する形式）
    res.json({
      success: true,
      ...flowData, // フローデータを直接展開
      message: 'フロー詳細を取得しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Emergency flow detail error:', error);
    res.status(500).json({
      success: false,
      error: 'emergency_flow_detail_error',
      message: error.message
    });
  }
});

// フロー生成API（GPTを使用）
app.post('/api/emergency-flow/generate', async (req, res) => {
  try {
    const { keyword } = req.body;
    console.log('🤖 Flow generation request:', { keyword });
    
    if (!keyword || keyword.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'keyword_required',
        message: 'キーワードが必要です'
      });
    }
    
    console.log('🔍 ChatGPT API呼び出し開始');
    console.log('🔑 OPENAI_API_KEY存在:', !!process.env.OPENAI_API_KEY);
    console.log('🔑 OPENAI_API_KEY長さ:', process.env.OPENAI_API_KEY?.length || 0);
    
    if (!process.env.OPENAI_API_KEY || 
        process.env.OPENAI_API_KEY.includes('CHANGE_THIS') || 
        process.env.OPENAI_API_KEY.includes('your-actual-openai-api-key-here') ||
        process.env.OPENAI_API_KEY.length < 20) {
      console.log('❌ OpenAI API Key not configured properly');
      
      return res.status(500).json({
        success: false,
        error: 'api_key_not_configured',
        message: 'OpenAI APIキーが正しく設定されていません。local.envファイルでOPENAI_API_KEYを設定してください。'
      });
    }
    
    console.log('🌐 OpenAI API呼び出し開始');
    
    // GPT-4oを使用してフローを生成
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `あなたは機械のトラブルシューティング専門家です。与えられたキーワードから応急処置フローを生成してください。

フローは以下のJSON形式で返してください：
{
  "id": "flow_" + timestamp,
  "title": "問題のタイトル",
  "description": "問題の詳細説明",
  "steps": [
    {
      "id": "step_1",
      "title": "ステップ1のタイトル",
      "description": "ステップ1の詳細説明",
      "message": "ユーザーへの指示",
      "type": "step"
    },
    {
      "id": "step_2", 
      "title": "ステップ2のタイトル",
      "description": "ステップ2の詳細説明",
      "message": "ユーザーへの指示",
      "type": "decision",
      "conditions": [
        {
          "label": "はい",
          "nextId": "step_3"
        },
        {
          "label": "いいえ", 
          "nextId": "step_4"
        }
      ]
    }
  ]
}

各ステップは論理的な順序で、実際のトラブルシューティング手順に基づいて作成してください。`
          },
          {
            role: 'user',
            content: `キーワード: ${keyword}\n\nこのキーワードから応急処置フローを生成してください。`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    console.log('📡 OpenAI APIレスポンス:', openaiResponse.status, openaiResponse.statusText);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.log('❌ OpenAI API エラー:', errorText);
      throw new Error(`OpenAI API エラー: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    console.log('✅ OpenAI API 成功');

    // GPTのレスポンスからJSONを抽出
    const responseText = openaiData.choices?.[0]?.message?.content || '';
    console.log('📝 GPT Response:', responseText.substring(0, 200) + '...');

    try {
      // JSONを抽出してパース
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSONが見つかりません');
      }
      
      const flowData = JSON.parse(jsonMatch[0]);
      
      // IDを生成
      const timestamp = Date.now();
      flowData.id = `flow_${timestamp}`;
      
      console.log('✅ Flow generated successfully:', flowData.id);
      
      res.json({
        success: true,
        data: flowData,
        message: 'フローが正常に生成されました',
        timestamp: new Date().toISOString()
      });
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      res.status(500).json({
        success: false,
        error: 'json_parse_error',
        message: 'GPTのレスポンスを解析できませんでした',
        details: responseText.substring(0, 500)
      });
    }
  } catch (error) {
    console.error('❌ Flow generation error:', error);
    res.status(500).json({
      success: false,
      error: 'flow_generation_error',
      message: `フロー生成エラー: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// ファイルからフロー生成API（GPTを使用）
app.post('/api/flow-generator/file', async (req, res) => {
  try {
    console.log('📁 File-based flow generation request');
    
    // ファイルアップロードの処理（簡易版）
    if (!req.body || !req.body.file) {
      return res.status(400).json({
        success: false,
        error: 'file_required',
        message: 'ファイルが必要です'
      });
    }
    
    // ファイルからテキストを抽出（簡易版）
    const fileContent = req.body.file;
    console.log('📄 File content length:', fileContent.length);
    
    console.log('🔍 ChatGPT API呼び出し開始');
    console.log('🔑 OPENAI_API_KEY存在:', !!process.env.OPENAI_API_KEY);
    
    if (!process.env.OPENAI_API_KEY || 
        process.env.OPENAI_API_KEY.includes('CHANGE_THIS') || 
        process.env.OPENAI_API_KEY.includes('your-actual-openai-api-key-here') ||
        process.env.OPENAI_API_KEY.length < 20) {
      console.log('❌ OpenAI API Key not configured properly');
      
      return res.status(500).json({
        success: false,
        error: 'api_key_not_configured',
        message: 'OpenAI APIキーが正しく設定されていません。local.envファイルでOPENAI_API_KEYを設定してください。'
      });
    }
    
    console.log('🌐 OpenAI API呼び出し開始');
    
    // GPT-4oを使用してフローを生成
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `あなたは機械のトラブルシューティング専門家です。与えられたファイルの内容から応急処置フローを生成してください。

フローは以下のJSON形式で返してください：
{
  "id": "flow_" + timestamp,
  "title": "問題のタイトル",
  "description": "問題の詳細説明",
  "steps": [
    {
      "id": "step_1",
      "title": "ステップ1のタイトル",
      "description": "ステップ1の詳細説明",
      "message": "ユーザーへの指示",
      "type": "step"
    },
    {
      "id": "step_2", 
      "title": "ステップ2のタイトル",
      "description": "ステップ2の詳細説明",
      "message": "ユーザーへの指示",
      "type": "decision",
      "conditions": [
        {
          "label": "はい",
          "nextId": "step_3"
        },
        {
          "label": "いいえ", 
          "nextId": "step_4"
        }
      ]
    }
  ]
}

ファイルの内容を分析して、実際のトラブルシューティング手順に基づいた論理的なフローを作成してください。`
          },
          {
            role: 'user',
            content: `ファイル内容: ${fileContent}\n\nこのファイルの内容から応急処置フローを生成してください。`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    console.log('📡 OpenAI APIレスポンス:', openaiResponse.status, openaiResponse.statusText);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.log('❌ OpenAI API エラー:', errorText);
      throw new Error(`OpenAI API エラー: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    console.log('✅ OpenAI API 成功');

    // GPTのレスポンスからJSONを抽出
    const responseText = openaiData.choices?.[0]?.message?.content || '';
    console.log('📝 GPT Response:', responseText.substring(0, 200) + '...');

    try {
      // JSONを抽出してパース
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSONが見つかりません');
      }
      
      const flowData = JSON.parse(jsonMatch[0]);
      
      // IDを生成
      const timestamp = Date.now();
      flowData.id = `flow_${timestamp}`;
      
      console.log('✅ Flow generated successfully from file:', flowData.id);
      
      res.json({
        success: true,
        data: flowData,
        message: 'ファイルからフローが正常に生成されました',
        timestamp: new Date().toISOString()
      });
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      res.status(500).json({
        success: false,
        error: 'json_parse_error',
        message: 'GPTのレスポンスを解析できませんでした',
        details: responseText.substring(0, 500)
      });
    }
  } catch (error) {
    console.error('❌ File flow generation error:', error);
    res.status(500).json({
      success: false,
      error: 'file_flow_generation_error',
      message: `ファイルからのフロー生成エラー: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/chatgpt', async (req, res) => {
  const { 
    text, 
    useOnlyKnowledgeBase = false, 
    conversationHistory = [], 
    elapsedMinutes = 0, 
    aiSupportMode = false 
  } = req.body;
  
  console.log('🔍 ChatGPT API呼び出し開始');
  console.log('🔑 OPENAI_API_KEY存在:', !!process.env.OPENAI_API_KEY);
  console.log('🔑 OPENAI_API_KEY長さ:', process.env.OPENAI_API_KEY?.length || 0);
  console.log('🔑 OPENAI_API_KEY先頭:', process.env.OPENAI_API_KEY?.substring(0, 10) || 'undefined');
  console.log('🤖 AI支援モード:', aiSupportMode);
  console.log('⏰ 経過時間:', elapsedMinutes, '分');
  
  if (!process.env.OPENAI_API_KEY || 
      process.env.OPENAI_API_KEY.includes('CHANGE_THIS') || 
      process.env.OPENAI_API_KEY.includes('your-actual-openai-api-key-here') ||
      process.env.OPENAI_API_KEY.length < 20) {
    console.log('❌ OpenAI API Key not configured properly');
    
    // AI支援モードの場合は特別な応答
    if (aiSupportMode) {
      return res.json({
        success: true,
        response: 'こんにちは！AI支援です。何か問題がありましたか？お困りの事象を教えてください！',
        message: 'AI支援モード（APIキー未設定）',
        details: {
          inputText: text || 'no text provided',
          useOnlyKnowledgeBase: useOnlyKnowledgeBase,
          environment: 'local-development',
          apiKeyConfigured: false,
          aiSupportMode: true
        },
        timestamp: new Date().toISOString()
      });
    }
    
    return res.json({
      success: false,
      error: 'api_key_not_configured',
      response: `ローカル開発モード: "${text || 'no text provided'}" に対するAI回答（APIキー未設定）`,
      message: 'OpenAI APIキーが正しく設定されていません。local.envファイルでOPENAI_API_KEYを設定してください。',
    details: {
        inputText: text || 'no text provided',
        useOnlyKnowledgeBase: useOnlyKnowledgeBase,
      environment: 'local-development',
        apiKeyConfigured: false,
        apiKeyLength: process.env.OPENAI_API_KEY?.length || 0
    },
    timestamp: new Date().toISOString()
  });
  }
  
  console.log('🌐 OpenAI API呼び出し開始');
  
  try {
    // AI支援モード用のシステムプロンプト
    let systemPrompt = 'あなたは技術サポートアシスタントです。機械の故障やトラブルシューティングについて、専門的で分かりやすい回答を提供してください。';
    
    if (aiSupportMode) {
      const simpleMode = req.body.simpleMode || false;
      
      if (simpleMode) {
        const emergencyStep = req.body.emergencyStep || 0;
        const problemType = req.body.problemType || '';
        const conversationHistory = req.body.conversationHistory || [];
        
        systemPrompt = `あなたは鉄道保守用車の故障診断AIです。

**絶対的なルール:**
- 1つの質問のみを返す
- 説明文は一切含めない
- 複数の選択肢は含めない
- 長い文章は含めない

**現在の状況:**
- ステップ: ${emergencyStep}
- 問題タイプ: ${problemType}

**質問例（1つだけ）:**
- "応急処置する時間がありますか？"
- "エンジンルームにあるアクセルワイヤーが外れていませんか？"
- "アクセルレバーを指で押して動きますか？"

**重要**: 質問以外の文字は一切含めないでください。`;
      } else {
        systemPrompt = `あなたは鉄道保守用車の故障診断AIです。以下のルールに従って、フレンドリーで一問一答形式の支援を提供してください：

1. **初期応答**: 会話開始時は「何か問題がありましたか？お困りの事象を教えてください！」と返す
2. **一問一答**: ユーザーの回答に応じて、次に確認すべき項目を1つだけ提示
3. **フレンドリー**: 親しみやすい言い回しを使用（「〜ですね」「〜してみてくださいね」など）
4. **段階的診断**: 問題を段階的に絞り込み、最終的に原因または応急処置に誘導
5. **時間制限**: 約20分以内での解決を目指し、困難な場合は救援要請を提案
6. **条件分岐**: 様々な報告から支援内容をフレキシブルに調整

例：
- 駐車バネブレーキが解放しない → エアー圧はありますか？
- エアー圧がない → 照明は明るいですか？
- 照明が暗い → エンジン回転を上げると、明暗はありませんか？

会話履歴: ${JSON.stringify(conversationHistory.slice(-4))}
経過時間: ${elapsedMinutes}分`;
      }
    }

    // 実際のOpenAI APIを呼び出し
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: text || 'こんにちは'
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    console.log('📡 OpenAI APIレスポンス:', openaiResponse.status, openaiResponse.statusText);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.log('❌ OpenAI API エラー:', errorText);
      throw new Error(`OpenAI API エラー: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    console.log('✅ OpenAI API 成功:', openaiData.choices?.[0]?.message?.content?.substring(0, 100) + '...');
    
    let response = openaiData.choices?.[0]?.message?.content || '回答を生成できませんでした';
    
    // AI支援モードでシンプルモードの場合は1つの質問のみに絞り込む
    if (aiSupportMode && simpleMode) {
      response = extractSingleQuestion(response);
    }
  
  res.json({
    success: true,
      response: response,
      message: aiSupportMode ? 'AI支援モード（実際のAPI）' : 'ChatGPT API（実際のAPI）',
    details: {
      inputText: text || 'no text provided',
      useOnlyKnowledgeBase: useOnlyKnowledgeBase,
      environment: 'local-development',
        apiKeyConfigured: true,
        model: 'gpt-4o',
        tokensUsed: openaiData.usage?.total_tokens || 0,
        aiSupportMode: aiSupportMode,
        elapsedMinutes: elapsedMinutes
    },
    timestamp: new Date().toISOString()
  });
  } catch (error) {
    console.error('❌ OpenAI API呼び出しエラー:', error);
    res.json({
      success: false,
      error: 'openai_api_error',
      response: aiSupportMode ? 
        '申し訳ございません。現在AI支援の応答を生成できません。しばらく時間をおいてから再度お試しください。' :
        `API呼び出しエラー: ${error.message}`,
      message: 'OpenAI APIの呼び出しに失敗しました',
      details: {
        inputText: text || 'no text provided',
        error: error.message,
        environment: 'local-development',
        aiSupportMode: aiSupportMode
      },
      timestamp: new Date().toISOString()
    });
  }
});

// ナレッジベース検索API（構造化診断フロー用）
app.post('/api/knowledge-base/search', async (req, res) => {
  try {
    const { query, machineType, limit = 5 } = req.body;
    
    console.log('🔍 ナレッジベース検索:', { query, machineType, limit });
    
    // ナレッジベースファイルの検索
    const fs = require('fs');
    const path = require('path');
    const knowledgeBasePath = path.join(__dirname, '../knowledge-base');
    
    let results = [];
    
    try {
      // documentsディレクトリから検索
      const documentsPath = path.join(knowledgeBasePath, 'documents');
      if (fs.existsSync(documentsPath)) {
        const files = fs.readdirSync(documentsPath);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const filePath = path.join(documentsPath, file);
              const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
              
              // クエリとの関連性をチェック
              const title = content.title || '';
              const description = content.description || '';
              const text = content.text || '';
              
              const searchText = `${title} ${description} ${text}`.toLowerCase();
              const queryLower = query.toLowerCase();
              
              if (searchText.includes(queryLower) || 
                  (machineType && searchText.includes(machineType.toLowerCase()))) {
                results.push({
                  id: content.id || file,
                  title: title,
                  description: description,
                  text: text.substring(0, 200) + '...',
                  relevance: calculateRelevance(searchText, queryLower)
                });
              }
            } catch (fileError) {
              console.error('ファイル読み込みエラー:', file, fileError);
            }
          }
        }
      }
      
      // 関連度でソート
      results.sort((a, b) => b.relevance - a.relevance);
      results = results.slice(0, limit);
      
    } catch (error) {
      console.error('ナレッジベース検索エラー:', error);
    }
    
    res.json({
      success: true,
      results: results,
      query: query,
      machineType: machineType,
      count: results.length
    });
    
  } catch (error) {
    console.error('ナレッジベース検索APIエラー:', error);
    res.json({
      success: false,
      error: error.message,
      results: []
    });
  }
});

// 関連度計算関数
function calculateRelevance(text, query) {
  const queryWords = query.split(' ').filter(word => word.length > 1);
  let score = 0;
  
  for (const word of queryWords) {
    const matches = (text.match(new RegExp(word, 'g')) || []).length;
    score += matches;
  }
  
  return score;
}

// 1つの質問のみを抽出する関数（厳格版）
function extractSingleQuestion(text) {
  if (!text) return text;
  
  // テキストをクリーンアップ
  let cleanText = text.trim();
  
  // 複数の質問がある場合は最初の質問のみを抽出
  const questionMarks = cleanText.split('？');
  if (questionMarks.length > 1) {
    cleanText = questionMarks[0] + '？';
  }
  
  // 改行で分割して最初の質問のみを取得
  const lines = cleanText.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && (
      trimmedLine.includes('？') || 
      trimmedLine.includes('ですか') || 
      trimmedLine.includes('ますか') ||
      trimmedLine.includes('ありますか') ||
      trimmedLine.includes('でしょうか')
    )) {
      return trimmedLine;
    }
  }
  
  // 質問が見つからない場合は最初の行のみを返す（100文字以内）
  const firstLine = lines[0]?.trim();
  if (firstLine && firstLine.length <= 100) {
    return firstLine;
  }
  
  // それでも長い場合は最初の50文字のみ
  return cleanText.substring(0, 50);
}

// 環境情報
app.get('/api/_diag/env', (req, res) => {
  res.json({
    success: true,
    environment: 'local-development',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    env: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || '8000',
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
      STORAGE_TYPE: 'knowledge-base',
      KNOWLEDGE_BASE_PATH: path.join(process.cwd(), '..', 'knowledge-base'),
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 
        `Set (${process.env.OPENAI_API_KEY.length} chars)` : 'Not set'
    },
    database_pool_status: {
      initialized: !!dbPool,
      message: dbPool ? 'Database pool initialized' : 'Database pool not initialized'
    },
    storage_status: {
      type: 'knowledge-base',
      path: path.join(process.cwd(), '..', 'knowledge-base'),
      exists: fs.existsSync(path.join(process.cwd(), '..', 'knowledge-base'))
    },
    message: '環境変数情報（ローカル開発）',
    timestamp: new Date().toISOString()
  });
});

// PostgreSQL接続確認API
app.get('/api/_diag/postgresql', async (req, res) => {
  try {
    if (!dbPool) {
      return res.json({
        success: false,
        error: 'database_pool_not_initialized',
        message: 'データベースプールが初期化されていません',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    await client.release();

  res.json({ 
    success: true,
      message: 'PostgreSQL接続成功',
      data: {
        current_time: result.rows[0].current_time,
        version: result.rows[0].version
      },
    timestamp: new Date().toISOString()
  });
  } catch (error) {
    console.error('❌ PostgreSQL connection test error:', error);
    res.json({
      success: false,
      error: 'postgresql_connection_failed',
      message: `PostgreSQL接続失敗: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// GPT接続確認API
app.get('/api/_diag/gpt', async (req, res) => {
  try {
    console.log('🔍 GPT診断開始');
    console.log('🔑 OPENAI_API_KEY存在:', !!process.env.OPENAI_API_KEY);
    console.log('🔑 OPENAI_API_KEY長さ:', process.env.OPENAI_API_KEY?.length || 0);
    console.log('🔑 OPENAI_API_KEY先頭:', process.env.OPENAI_API_KEY?.substring(0, 10) || 'undefined');
    
    if (!process.env.OPENAI_API_KEY || 
        process.env.OPENAI_API_KEY.includes('CHANGE_THIS') || 
        process.env.OPENAI_API_KEY.includes('your-actual-openai-api-key-here') ||
        process.env.OPENAI_API_KEY.length < 20) {
      console.log('❌ OpenAI APIキーが正しく設定されていません');
      return res.json({
        success: false,
        error: 'api_key_not_configured',
        message: 'OpenAI APIキーが正しく設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🌐 OpenAI APIテストリクエスト送信中...');
    // 簡単なテストリクエストを送信
    const testResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 OpenAI APIレスポンス:', testResponse.status, testResponse.statusText);

    if (testResponse.ok) {
      console.log('✅ GPT接続成功');
  res.json({
        success: true,
        message: 'GPT接続成功',
        data: {
          api_key_configured: true,
          api_key_length: process.env.OPENAI_API_KEY.length
        },
        timestamp: new Date().toISOString()
      });
    } else {
      const errorText = await testResponse.text();
      console.log('❌ GPT接続失敗:', errorText);
      res.json({
        success: false,
        error: 'gpt_api_error',
        message: `GPT API エラー: ${testResponse.status} ${testResponse.statusText}`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ GPT connection test error:', error);
    res.json({
      success: false,
      error: 'gpt_connection_failed',
      message: `GPT接続失敗: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Local Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Local development server error',
    timestamp: new Date().toISOString()
  });
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// 初期化とサーバー起動
async function startServer() {
  try {
    console.log('🚀 Starting Local Development Server (Production-like)...');
    
    // データベース初期化
    initializeDatabase();
    
    // ローカルストレージ初期化
    initializeLocalStorage();
    
    // マイグレーション実行
    if (dbPool) {
      await runMigrations();
    }

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Local Development Server running on http://localhost:${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️ Database: ${dbPool ? 'Connected' : 'Not configured'}`);
      console.log(`💾 Storage: Knowledge-base filesystem`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/auth/login`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();