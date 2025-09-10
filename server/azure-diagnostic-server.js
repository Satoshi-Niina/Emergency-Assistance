const express = require('express');

/**
 * Azure App Service 最小限診断サーバー
 * 接続問題の診断用
 */

const app = express();
const PORT = process.env.PORT || 80;

app.use(express.json());

// ヘルスチェック
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// 環境変数診断
app.get('/api/env-check', (req, res) => {
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
    DATABASE_URL: process.env.DATABASE_URL ? 'CONFIGURED' : 'NOT_SET',
    AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'CONFIGURED' : 'NOT_SET',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'CONFIGURED' : 'NOT_SET',
    SESSION_SECRET: process.env.SESSION_SECRET ? 'CONFIGURED' : 'NOT_SET',
    FRONTEND_URL: process.env.FRONTEND_URL || 'NOT_SET',
    CORS_ORIGINS: process.env.CORS_ORIGINS || 'NOT_SET',
    PORT: PORT,
    WEBSITE_SITE_NAME: process.env.WEBSITE_SITE_NAME || 'NOT_SET'
  };
  
  res.json(envCheck);
});

// データベース接続テスト
app.get('/api/db-test', async (req, res) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        status: 'ERROR',
        message: 'DATABASE_URL not configured'
      });
    }

    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });

    await client.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    await client.end();

    res.json({
      status: 'SUCCESS',
      current_time: result.rows[0].current_time,
      db_version: result.rows[0].db_version.substring(0, 100)
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message
    });
  }
});

// Blob Storage接続テスト
app.get('/api/storage-test', async (req, res) => {
  try {
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      return res.status(500).json({
        status: 'ERROR',
        message: 'AZURE_STORAGE_CONNECTION_STRING not configured'
      });
    }

    const { BlobServiceClient } = require('@azure/storage-blob');
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );

    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'emergency-assistance-images';
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // コンテナの存在確認
    const exists = await containerClient.exists();
    
    if (!exists) {
      // コンテナが存在しない場合は作成を試行
      await containerClient.create();
    }

    res.json({
      status: 'SUCCESS',
      container: containerName,
      container_exists: exists,
      message: exists ? 'Container accessible' : 'Container created'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message
    });
  }
});

// 包括的診断
app.get('/api/diagnosis', async (req, res) => {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    server_status: 'running',
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      PORT: PORT,
      WEBSITE_SITE_NAME: process.env.WEBSITE_SITE_NAME || 'NOT_SET'
    },
    configuration: {
      database: process.env.DATABASE_URL ? 'CONFIGURED' : 'NOT_SET',
      storage: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'CONFIGURED' : 'NOT_SET',
      openai: process.env.OPENAI_API_KEY ? 'CONFIGURED' : 'NOT_SET',
      session: process.env.SESSION_SECRET ? 'CONFIGURED' : 'NOT_SET',
      frontend: process.env.FRONTEND_URL || 'NOT_SET',
      cors: process.env.CORS_ORIGINS || 'NOT_SET'
    },
    tests: {}
  };

  // データベーステスト
  try {
    if (process.env.DATABASE_URL) {
      const { Client } = require('pg');
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      diagnosis.tests.database = 'SUCCESS';
    } else {
      diagnosis.tests.database = 'NOT_CONFIGURED';
    }
  } catch (error) {
    diagnosis.tests.database = `ERROR: ${error.message}`;
  }

  // ストレージテスト
  try {
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
      const { BlobServiceClient } = require('@azure/storage-blob');
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING
      );
      const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'emergency-assistance-images';
      const containerClient = blobServiceClient.getContainerClient(containerName);
      await containerClient.exists();
      diagnosis.tests.storage = 'SUCCESS';
    } else {
      diagnosis.tests.storage = 'NOT_CONFIGURED';
    }
  } catch (error) {
    diagnosis.tests.storage = `ERROR: ${error.message}`;
  }

  res.json(diagnosis);
});

app.listen(PORT, () => {
  console.log(`🔍 Azure診断サーバーがポート ${PORT} で起動しました`);
  console.log(`ヘルスチェック: http://localhost:${PORT}/`);
  console.log(`環境変数確認: http://localhost:${PORT}/api/env-check`);
  console.log(`DB接続テスト: http://localhost:${PORT}/api/db-test`);
  console.log(`ストレージテスト: http://localhost:${PORT}/api/storage-test`);
  console.log(`包括的診断: http://localhost:${PORT}/api/diagnosis`);
});
