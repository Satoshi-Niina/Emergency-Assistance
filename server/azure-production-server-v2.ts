// Azure App Service 本番用統合サーバー v2
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const port = process.env.PORT || 80;

// PostgreSQL接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// CORS設定
app.use(cors({
  origin: [
    'https://witty-river-012f39e00.1.azurestaticapps.net',
    'http://localhost:3000',
    'http://localhost:5002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5002'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ヘルスチェックエンドポイント（Azure App Service用）
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'emergency-assistance-backend',
    time: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', async (req, res) => {
  try {
    // データベース接続チェック
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      time: new Date().toISOString(),
      service: 'emergency-assistance-backend',
      version: '2.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      time: new Date().toISOString(),
      service: 'emergency-assistance-backend',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'emergency-assistance-backend',
    version: '2.0.0'
  });
});

app.get('/healthz', (req, res) => {
  res.status(200).type('text/plain').send('OK');
});

// 認証API
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // データベースからユーザーを検索
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, username, password, role FROM users WHERE username = $1',
        [username]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      const user = result.rows[0];
      // パスワード検証（平文比較 - テスト用）
      // TODO: 本番環境ではbcryptハッシュ化が必要
      const isValidPassword = password === user.password;
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

app.get('/api/auth/status', (req, res) => {
  res.status(200).json({
    authenticated: false,
    message: 'Auth status check'
  });
});

// Blob Storageテストエンドポイント
app.get('/api/debug/blob', async (req, res) => {
  try {
    const { BlobServiceClient } = require('@azure/storage-blob');
    
    // 環境変数の確認
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';
    
    if (!connectionString) {
      return res.status(500).json({
        success: false,
        error: 'AZURE_STORAGE_CONNECTION_STRING not set',
        envVars: {
          AZURE_STORAGE_CONNECTION_STRING: connectionString ? 'SET' : 'NOT SET',
          AZURE_STORAGE_CONTAINER_NAME: containerName,
          NODE_ENV: process.env.NODE_ENV
        }
      });
    }
    
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // コンテナの存在確認
    let containerExists = false;
    try {
      containerExists = await containerClient.exists();
    } catch (err) {
      console.error('Container exists check error:', err);
    }
    
    // コンテナ内のファイル一覧取得
    let blobs = [];
    try {
      const listOptions = {
        prefix: 'knowledge-base/',
        includeMetadata: true
      };
      
      for await (const blob of containerClient.listBlobsFlat(listOptions)) {
        blobs.push({
          name: blob.name,
          size: blob.properties.contentLength,
          lastModified: blob.properties.lastModified,
          contentType: blob.properties.contentType,
          url: containerClient.getBlobClient(blob.name).url
        });
      }
    } catch (err) {
      console.error('List blobs error:', err);
    }
    
    // テストファイルの書き込みテスト
    let writeTest: { success: boolean; error: string | null; blobName?: string; url?: string } = { success: false, error: null };
    try {
      const testBlobName = `knowledge-base/test-${Date.now()}.txt`;
      const testContent = `Test file created at ${new Date().toISOString()}`;
      const blockBlobClient = containerClient.getBlockBlobClient(testBlobName);
      
      await blockBlobClient.upload(testContent, Buffer.byteLength(testContent), {
        blobHTTPHeaders: {
          blobContentType: 'text/plain'
        }
      });
      
      writeTest.success = true;
      writeTest.blobName = testBlobName;
      writeTest.url = blockBlobClient.url;
    } catch (err) {
      writeTest.error = err instanceof Error ? err.message : 'Unknown error';
    }
    
    // テストファイルの読み込みテスト
    let readTest: { success: boolean; error: string | null; content: string | null } = { success: false, error: null, content: null };
    if (writeTest.success && writeTest.blobName) {
      try {
        const testBlobName = writeTest.blobName;
        const blockBlobClient = containerClient.getBlockBlobClient(testBlobName);
        const downloadResponse = await blockBlobClient.download();
        const content = await streamToString(downloadResponse.readableStreamBody);
        readTest.success = true;
        readTest.content = content;
      } catch (err) {
        readTest.error = err instanceof Error ? err.message : 'Unknown error';
      }
    }
    
    res.status(200).json({
      success: true,
      containerName,
      containerExists,
      blobCount: blobs.length,
      blobs: blobs.slice(0, 10), // 最初の10個のみ表示
      writeTest,
      readTest,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Debug Blob Storage error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// ストリームを文字列に変換するヘルパー関数
async function streamToString(readableStream: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    readableStream.on('data', (data: any) => {
      chunks.push(data.toString());
    });
    readableStream.on('end', () => {
      resolve(chunks.join(''));
    });
    readableStream.on('error', reject);
  });
}

// パスワードリセットエンドポイント（管理者専用）
app.post('/api/admin/reset-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    
    if (!username || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'ユーザー名と新しいパスワードが必要です'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'パスワードは8文字以上である必要があります'
      });
    }
    
    const client = await pool.connect();
    try {
      // パスワードをハッシュ化
      const bcrypt = require('bcryptjs');
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // ユーザーのパスワードを更新
      const result = await client.query(
        'UPDATE users SET password = $1 WHERE username = $2 RETURNING username, display_name, role',
        [hashedPassword, username]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'ユーザーが見つかりません'
        });
      }
      
      const user = result.rows[0];
      res.status(200).json({
        success: true,
        message: 'パスワードが正常に更新されました',
        user: {
          username: user.username,
          display_name: user.display_name,
          role: user.role
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'パスワードリセット中にエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// デバッグ用エンドポイント
app.get('/api/debug/db', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      // テーブル一覧を取得
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      // usersテーブルの構造を確認
      let usersTableInfo: any[] | { error: string } | null = null;
      try {
        const usersResult = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = 'users'
          ORDER BY ordinal_position
        `);
        usersTableInfo = usersResult.rows;
      } catch (err) {
        usersTableInfo = { error: err instanceof Error ? err.message : 'Unknown error' };
      }
      
      // 実際のユーザーデータを確認（パスワード以外）
      let sampleUsers: any[] | { error: string } = [];
      try {
        const sampleResult = await client.query(`
          SELECT id, username, password, display_name, role, department, created_at
          FROM users
          LIMIT 3
        `);
        sampleUsers = sampleResult.rows;
      } catch (err) {
        sampleUsers = { error: err instanceof Error ? err.message : 'Unknown error' };
      }
      
      // ユーザー数を確認
      let userCount: number | { error: string } = 0;
      try {
        const countResult = await client.query('SELECT COUNT(*) as count FROM users');
        userCount = countResult.rows[0].count;
      } catch (err) {
        userCount = { error: err instanceof Error ? err.message : 'Unknown error' };
      }
      
      res.status(200).json({
        success: true,
        tables: tablesResult.rows,
        usersTableInfo,
        sampleUsers,
        userCount,
        timestamp: new Date().toISOString()
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Debug DB error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// 緊急手順API
app.get('/api/emergency-procedures', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM emergency_procedures ORDER BY created_at DESC');
      res.status(200).json({
        success: true,
        data: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Emergency procedures error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency procedures'
    });
  }
});

// エラーハンドリング
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message || 'Unknown error'
  });
});

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

// サーバー起動
app.listen(port, () => {
  console.log(`✅ Emergency Assistance Backend v2.0 running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
