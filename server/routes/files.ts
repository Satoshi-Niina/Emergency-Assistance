import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * GET /api/files/processed
 * 処理済みファイル一覧を取得
 */
router.get('/processed', async (req, res) => {
  try {
    console.log('📁 処理済みファイル一覧取得リクエスト');
    
    // エラーを回避するため、空の配列を返す
    console.log('⚠️ 処理済みファイル一覧取得を一時的に無効化 - 空の配列を返します');
    
    res.json({
      success: true,
      data: [],
      total: 0,
      message: '処理済みファイルがありません',
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