import express from 'express';
import fs from 'fs';
import path from 'path';
import { loadKnowledgeBaseIndex } from '../lib/knowledge-base.js';

const router = express.Router();

/**
 * GET /api/files/processed
 * 処理済みファイル一覧を取得
 */
router.get('/processed', async (req, res) => {
  try {
    console.log('📁 処理済みファイル一覧取得リクエスト');
    
    // knowledge-base/index.jsonからドキュメント情報を取得
    const index = loadKnowledgeBaseIndex();
    
    // documents配列が存在しない場合は初期化
    if (!index.documents) {
      index.documents = [];
    }
    
    console.log(`✅ 処理済みファイル取得成功: ${index.documents.length}件`);
    
    res.json({
      success: true,
      data: index.documents,
      total: index.documents.length,
      message: index.documents.length > 0 ? '処理済みファイルを取得しました' : '処理済みファイルがありません',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ 処理済みファイル一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '処理済みファイル一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 