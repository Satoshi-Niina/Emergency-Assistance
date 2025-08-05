import express from 'express';
import { upload } from '../lib/multer-config.js';
import { 
  saveKnowledgeData, 
  listKnowledgeData, 
  getKnowledgeData, 
  deleteKnowledgeData,
  KnowledgeType 
} from '../lib/knowledge-base.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * GET /api/knowledge-base
 * ナレッジデータ一覧を取得
 */
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const knowledgeType = type ? (type as KnowledgeType) : undefined;
    
    console.log('📚 ナレッジデータ一覧取得リクエスト:', { type: knowledgeType });
    
    const result = listKnowledgeData(knowledgeType);
    
    res.json({
      success: result.success,
      data: result.data,
      message: result.message,
      total: result.data.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ナレッジデータ一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジデータ一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/knowledge-base/:id
 * 特定のナレッジデータを取得
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📚 ナレッジデータ取得リクエスト:', { id });
    
    const result = getKnowledgeData(id);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.message || 'ナレッジデータが見つかりません'
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ナレッジデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジデータの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/knowledge-base/upload
 * ナレッジデータをアップロード
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'ファイルがアップロードされていません'
      });
    }
    
    const { title, category, tags, description } = req.body;
    const filePath = req.file.path;
    const filename = req.file.originalname;
    
    console.log('📚 ナレッジデータアップロードリクエスト:', { 
      filename, 
      title, 
      category, 
      tags: tags ? tags.split(',') : undefined 
    });
    
    // ファイル内容を読み込み
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // メタデータを準備
    const metadata = {
      title: title || filename,
      category: category || 'general',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      description: description || `アップロードされた${filename}`
    };
    
    // ナレッジデータとして保存
    const result = saveKnowledgeData(filename, content, metadata);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.message || 'ナレッジデータの保存に失敗しました'
      });
    }
    
    // アップロードされた一時ファイルを削除
    try {
      fs.unlinkSync(filePath);
    } catch (deleteError) {
      console.warn('一時ファイル削除警告:', deleteError);
    }
    
    res.json({
      success: true,
      data: result.metadata,
      message: result.message,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ナレッジデータアップロードエラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジデータのアップロードに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/knowledge-base/:id
 * ナレッジデータを削除
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📚 ナレッジデータ削除リクエスト:', { id });
    
    const result = deleteKnowledgeData(id);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.message || 'ナレッジデータの削除に失敗しました'
      });
    }
    
    res.json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ナレッジデータ削除エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジデータの削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/knowledge-base/types
 * ナレッジデータの種類一覧を取得
 */
router.get('/types/list', async (req, res) => {
  try {
    console.log('📚 ナレッジデータ種類一覧取得リクエスト');
    
    const types = Object.values(KnowledgeType).map(type => ({
      value: type,
      label: getTypeLabel(type)
    }));
    
    res.json({
      success: true,
      data: types,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ナレッジデータ種類一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジデータ種類一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * ナレッジデータの種類ラベルを取得
 */
function getTypeLabel(type: KnowledgeType): string {
  const labels: { [key in KnowledgeType]: string } = {
    [KnowledgeType.TROUBLESHOOTING]: 'トラブルシューティング',
    [KnowledgeType.DOCUMENT]: 'ドキュメント',
    [KnowledgeType.QA]: 'Q&A',
    [KnowledgeType.JSON]: 'JSONデータ',
    [KnowledgeType.PPT]: 'プレゼンテーション',
    [KnowledgeType.TEXT]: 'テキスト'
  };
  
  return labels[type] || type;
}

export default router;
