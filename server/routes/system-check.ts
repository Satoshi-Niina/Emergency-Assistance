import { Router } from 'express';
import { sql } from '../db/db.js';
import { processOpenAIRequest } from '../lib/openai.js';
import { BlobServiceClient } from '@azure/storage-blob';

const router = Router();

// PostgreSQL接続確認API
router.get('/db-check', async (req, res) => {
  try {
    const result = await sql`SELECT NOW() as db_time`;
    res.json({
      status: "OK",
      db_time: result[0].db_time
    });
  } catch (error) {
    console.error('DB接続確認エラー:', error);
    res.status(500).json({
      status: "ERROR",
      message: error instanceof Error ? error.message : "データベース接続エラー"
    });
  }
});

// GPT接続確認API
router.post('/gpt-check', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        status: "ERROR",
        message: "メッセージが指定されていません"
      });
    }

    const reply = await processOpenAIRequest(message, false);
    
    res.json({
      status: "OK",
      reply: reply
    });
  } catch (error) {
    console.error('GPT接続確認エラー:', error);
    res.status(500).json({
      status: "ERROR",
      message: error instanceof Error ? error.message : "GPT接続エラー"
    });
  }
});

// Azure Storage接続確認API
router.get('/storage-check', async (req, res) => {
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
    }
    
    res.json({
      status: "OK",
      message: `接続成功 - ${containers.length}個のコンテナーを確認: ${containers.join(', ')}`
    });
  } catch (error) {
    console.error('Storage接続確認エラー:', error);
    res.status(500).json({
      status: "ERROR",
      message: error instanceof Error ? error.message : "Azure Storage接続エラー"
    });
  }
});

export default router; 