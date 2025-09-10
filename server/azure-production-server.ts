#!/usr/bin/env node
/**
 * Azure App Service 本番環境専用サーバー
 * セッション管理、CORS、認証機能を含む完全版
 */

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { Client } from 'pg';
import bcrypt from 'bcrypt';
import { BlobServiceClient } from '@azure/storage-blob';

const app = express();

// 環境変数の確認とデフォルト値
const PORT = process.env.PORT || 80;
const NODE_ENV = process.env.NODE_ENV || 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://witty-river-012f39e00.1.azurestaticapps.net';
const SESSION_SECRET = process.env.SESSION_SECRET || 'emergency-assistance-session-secret-2025';
const DATABASE_URL = process.env.DATABASE_URL;

console.log('🚀 Azure App Service Server Starting...');
console.log('Environment:', NODE_ENV);
console.log('Port:', PORT);
console.log('Frontend URL:', FRONTEND_URL);
console.log('Database URL exists:', !!DATABASE_URL);

// CORS設定 - Azure Static Web Apps用
const corsOptions = {
  origin: [
    FRONTEND_URL,
    'https://witty-river-012f39e00.1.azurestaticapps.net',
    'https://localhost:5173',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// JSON解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// セッション設定 - Azure環境用
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production', // Azure App Serviceは自動でHTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24時間
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax' // Cross-site対応
  },
  name: 'emergency-assistance-session'
}));

// セッション拡張のための型定義
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userRole?: string;
  }
}

// データベース接続ヘルパー
async function createDbClient() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    query_timeout: 30000
  });
  
  await client.connect();
  return client;
}

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    message: 'Emergency Assistance Server - Azure Production',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    session: {
      hasUserId: !!req.session.userId,
      userRole: req.session.userRole || 'none'
    }
  });
});

// ヘルスチェックエンドポイント
app.get('/health', async (req, res) => {
  try {
    // データベース接続テスト
    const client = await createDbClient();
    const result = await client.query('SELECT NOW() as current_time, version()');
    await client.end();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        serverTime: result.rows[0].current_time,
        version: result.rows[0].version.substring(0, 50)
      },
      session: {
        configured: true,
        hasUserId: !!req.session.userId,
        userRole: req.session.userRole || 'none'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        connected: false
      }
    });
  }
});

// 認証API - ログイン
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔑 Login attempt for:', username);
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'ユーザー名とパスワードが必要です'
      });
    }
    
    const client = await createDbClient();
    const result = await client.query(
      'SELECT id, username, password, role, display_name, department FROM users WHERE username = $1',
      [username]
    );
    await client.end();
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが違います'
      });
    }
    
    const foundUser = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, foundUser.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが違います'
      });
    }
    
    console.log('✅ Login successful for:', username, 'Role:', foundUser.role);
    
    // セッションにユーザー情報を保存
    req.session.userId = foundUser.id;
    req.session.userRole = foundUser.role;
    
    // セッション保存の確認
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save error:', err);
          reject(err);
        } else {
          console.log('💾 Session saved successfully');
          resolve();
        }
      });
    });
    
    res.json({
      success: true,
      message: 'ログインに成功しました',
      user: {
        id: foundUser.id,
        username: foundUser.username,
        displayName: foundUser.display_name || foundUser.username,
        role: foundUser.role,
        department: foundUser.department || 'General'
      }
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
});

// 認証状態確認
app.get('/api/auth/me', (req, res) => {
  console.log('🔍 Auth check - Session:', {
    hasSession: !!req.session,
    userId: req.session?.userId,
    userRole: req.session?.userRole
  });
  
  if (!req.session || !req.session.userId) {
    return res.json({
      success: false,
      isAuthenticated: false
    });
  }
  
  res.json({
    success: true,
    isAuthenticated: true,
    user: {
      id: req.session.userId,
      role: req.session.userRole
    }
  });
});

// ログアウト
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Session destroy error:', err);
      return res.status(500).json({
        success: false,
        error: 'ログアウトに失敗しました'
      });
    }
    
    res.clearCookie('emergency-assistance-session');
    res.json({
      success: true,
      message: 'ログアウトしました'
    });
  });
});

// ユーザー一覧取得（管理者のみ）
app.get('/api/users', async (req, res) => {
  try {
    console.log('📊 Users list request - Session:', {
      userId: req.session?.userId,
      userRole: req.session?.userRole
    });
    
    // 認証チェック
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        error: '認証が必要です'
      });
    }
    
    // 管理者権限チェック
    if (req.session.userRole !== 'system_admin') {
      return res.status(403).json({
        success: false,
        error: '管理者権限が必要です'
      });
    }
    
    const client = await createDbClient();
    const result = await client.query(
      'SELECT id, username, role, display_name, department, created_at FROM users ORDER BY created_at DESC'
    );
    await client.end();
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Users list error:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザー一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Debug情報エンドポイント
app.get('/api/debug', (req, res) => {
  res.json({
    environment: NODE_ENV,
    port: PORT,
    corsOrigin: FRONTEND_URL,
    session: {
      hasSession: !!req.session,
      sessionId: req.session?.id,
      userId: req.session?.userId,
      userRole: req.session?.userRole
    },
    headers: {
      origin: req.get('Origin'),
      userAgent: req.get('User-Agent'),
      cookie: req.get('Cookie') ? 'present' : 'missing'
    },
    timestamp: new Date().toISOString()
  });
});

// システム診断API - データベース接続確認
app.get('/api/system-check/db-check', async (req, res) => {
  try {
    const client = await createDbClient();
    const result = await client.query('SELECT NOW() as db_time, version() as db_version');
    await client.end();
    
    res.json({
      status: "OK",
      db_time: result.rows[0].db_time,
      db_version: result.rows[0].db_version.substring(0, 50)
    });
  } catch (error) {
    console.error('DB接続確認エラー:', error);
    res.status(500).json({
      status: "ERROR",
      message: error instanceof Error ? error.message : "データベース接続エラー"
    });
  }
});

// システム診断API - GPT接続確認
app.post('/api/system-check/gpt-check', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        status: "ERROR",
        message: "メッセージが指定されていません"
      });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        status: "ERROR",
        message: "OpenAI APIキーが設定されていません"
      });
    }
    
    // OpenAI API呼び出し
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }],
        max_tokens: 100,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response';
    
    res.json({
      status: "OK",
      reply: reply.trim()
    });
  } catch (error) {
    console.error('GPT接続確認エラー:', error);
    res.status(500).json({
      status: "ERROR",
      message: error instanceof Error ? error.message : "GPT接続エラー"
    });
  }
});

// システム診断API - Azure Storage接続確認
app.get('/api/system-check/storage-check', async (req, res) => {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    
    if (!connectionString) {
      return res.status(500).json({
        status: "ERROR",
        message: "Azure Storage接続文字列が設定されていません"
      });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    
    // 接続テスト: 既存のコンテナー一覧を取得
    const containers: string[] = [];
    for await (const containerItem of blobServiceClient.listContainers()) {
      containers.push(containerItem.name);
      if (containers.length >= 10) break; // 最大10個まで
    }
    
    res.json({
      status: "OK",
      message: `接続成功 - ${containers.length}個のコンテナーを確認`,
      containers: containers
    });
  } catch (error) {
    console.error('Storage接続確認エラー:', error);
    res.status(500).json({
      status: "ERROR",
      message: error instanceof Error ? error.message : "Azure Storage接続エラー"
    });
  }
});

// 機種一覧取得API
app.get('/api/machines/machine-types', async (req, res) => {
  try {
    console.log('🔍 機種一覧取得リクエスト');
    
    res.setHeader('Content-Type', 'application/json');
    
    const client = await createDbClient();
    const result = await client.query(`
      SELECT id, machine_type_name 
      FROM machine_types 
      ORDER BY machine_type_name
    `);
    await client.end();
    
    console.log(`✅ 機種一覧取得完了: ${result.rows.length}件`);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 機種一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 全機械データ取得API
app.get('/api/machines/all-machines', async (req, res) => {
  try {
    console.log('🔍 全機械データ取得リクエスト');
    
    res.setHeader('Content-Type', 'application/json');
    
    const client = await createDbClient();
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
    await client.end();
    
    // データをグループ化
    const groupedData: { [key: string]: { 
      id: string; 
      machine_type_name: string; 
      machines: { id: string; machine_number: string; }[]
    } } = {};
    
    result.rows.forEach((row) => {
      const key = row.machine_type_id;
      if (!groupedData[key]) {
        groupedData[key] = {
          id: row.machine_type_id,
          machine_type_name: row.machine_type_name,
          machines: []
        };
      }
      
      if (row.machine_id && row.machine_number) {
        groupedData[key].machines.push({
          id: row.machine_id,
          machine_number: row.machine_number
        });
      }
    });
    
    res.json({
      success: true,
      data: Object.values(groupedData),
      total: Object.keys(groupedData).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 全機械データ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械データの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 指定機種に紐づく機械番号一覧取得API
app.get('/api/machines/machines', async (req, res) => {
  try {
    console.log('🔍 機械番号一覧取得リクエスト:', req.query);
    
    res.setHeader('Content-Type', 'application/json');
    
    const { type_id } = req.query;
    
    if (!type_id) {
      return res.status(400).json({
        success: false,
        error: '機種IDが指定されていません',
        timestamp: new Date().toISOString()
      });
    }
    
    const client = await createDbClient();
    const result = await client.query(`
      SELECT id, machine_number 
      FROM machines 
      WHERE machine_type_id = $1 
      ORDER BY machine_number
    `, [type_id]);
    await client.end();
    
    console.log(`✅ 機械番号一覧取得完了: ${result.rows.length}件`);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 機械番号一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械番号一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// ナレッジベース（Blob Storage）ファイル一覧API
app.get('/api/knowledge', async (req, res) => {
  try {
    console.log('📚 ナレッジベースデータ取得リクエスト');
    
    res.setHeader('Content-Type', 'application/json');
    
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    
    if (!connectionString) {
      return res.status(500).json({
        success: false,
        error: 'Azure Storage接続文字列が設定されていません'
      });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerName = process.env.BLOB_CONTAINER_NAME || 'knowledge';
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // knowledge-base/data/ プレフィックスでファイル一覧を取得
    const files: string[] = [];
    for await (const blob of containerClient.listBlobsFlat({ prefix: 'knowledge-base/data/' })) {
      if (blob.name.toLowerCase().endsWith('.json')) {
        files.push(blob.name);
      }
    }
    
    // ファイル情報を構築
    const fileList = files.map(blobName => {
      const filename = blobName.split('/').pop() || blobName;
      const name = filename.replace('.json', '');
      
      return {
        filename,
        name,
        size: 0,
        modifiedAt: new Date().toISOString(),
        path: blobName,
        isBlob: true
      };
    });
    
    console.log(`✅ Azure Blob Storage からナレッジベースデータ取得完了: ${fileList.length}件`);
    
    res.json({
      success: true,
      data: fileList,
      total: fileList.length,
      timestamp: new Date().toISOString(),
      source: 'azure-blob-storage'
    });
  } catch (error) {
    console.error('❌ ナレッジベースデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジベースデータの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// ナレッジベース個別ファイル取得API
app.get('/api/knowledge/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    console.log('📄 ナレッジベースファイル取得リクエスト:', filename);
    
    res.setHeader('Content-Type', 'application/json');
    
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    
    if (!connectionString) {
      return res.status(500).json({
        success: false,
        error: 'Azure Storage接続文字列が設定されていません'
      });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerName = process.env.BLOB_CONTAINER_NAME || 'knowledge';
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    const blobName = `knowledge-base/data/${filename}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // ファイルの存在確認
    const exists = await blockBlobClient.exists();
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'ファイルが見つかりません'
      });
    }
    
    // JSONファイルかどうか確認
    if (!filename.toLowerCase().endsWith('.json')) {
      return res.status(400).json({
        success: false,
        error: 'JSONファイルのみ取得可能です'
      });
    }
    
    // ファイル内容を読み込み
    const downloadResponse = await blockBlobClient.download();
    if (!downloadResponse.readableStreamBody) {
      throw new Error('ファイルの読み込みに失敗しました');
    }
    
    // ストリームを文字列に変換
    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.from(chunk));
    }
    const fileContent = Buffer.concat(chunks).toString('utf8');
    
    const jsonData = JSON.parse(fileContent);
    
    console.log('✅ Azure Blob Storage からナレッジベースファイル取得完了');
    
    res.json({
      success: true,
      data: jsonData,
      filename: filename,
      size: fileContent.length,
      source: 'azure-blob-storage'
    });
    
  } catch (error) {
    console.error('❌ ナレッジベースファイル取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジベースファイルの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// プリフライトリクエスト対応
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.sendStatus(200);
});

// グローバルエラーハンドラー
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('🚨 Global error:', err);
  res.status(500).json({
    success: false,
    error: 'サーバーエラーが発生しました',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'エンドポイントが見つかりません',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${NODE_ENV}`);
  console.log(`🔗 CORS Origin: ${FRONTEND_URL}`);
  console.log(`💾 Session configured: ${!!SESSION_SECRET}`);
  console.log(`🗄️ Database configured: ${!!DATABASE_URL}`);
  console.log('🚀 Server ready to accept requests');
});

// プロセス終了時のクリーンアップ
process.on('SIGTERM', () => {
  console.log('💤 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('💤 SIGINT received, shutting down gracefully');
  process.exit(0);
});
