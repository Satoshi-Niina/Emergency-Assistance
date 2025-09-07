// @ts-nocheck
import { Router, Request, Response } from 'express';
import * as z from 'zod';
import { loadRagConfig, updateRagConfig, validateRagConfig, getConfigDiff } from '../services/config-manager.js';

const router = Router();

// 設定更新スキーマの定義
const ConfigUpdateSchema = z.object({
  embedDim: z.number().min(1).max(4096).optional(),
  chunkSize: z.number().min(100).max(2000).optional(),
  chunkOverlap: z.number().min(0).max(500).optional(),
  retrieveK: z.number().min(1).max(50).optional(),
  rerankTop: z.number().min(1).max(20).optional(),
  rerankMin: z.number().min(0).max(1).optional(),
  maxTextLength: z.number().min(1000).max(1000000).optional(),
  batchSize: z.number().min(1).max(20).optional(),
  similarityThreshold: z.number().min(0).max(1).optional()
});


/**
 * 現在のRAG設定を取得
 * GET /api/config/rag
 */
router.get('/rag', async (req: Request, res: Response) => {
  try {
    const config = await loadRagConfig();
    
    res.json({
      config,
      message: 'RAG設定を取得しました',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ RAG設定取得エラー:', error);
    
    res.status(500).json({
      error: 'Failed to load RAG configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * RAG設定を更新
 * PATCH /api/config/rag
 */
router.patch('/rag', async (req: Request, res: Response) => {
  try {
    // リクエストボディの検証
    const validationResult = ConfigUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid configuration data',
        details: validationResult.error.errors
      });
    }
    
    const updateData = validationResult.data;
    
    // 設定の検証
    const validation = validateRagConfig(updateData);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Configuration validation failed',
        details: validation.errors
      });
    }
    
    // 現在の設定との差分を確認
    const changes = await getConfigDiff(updateData);
    
    if (changes.length === 0) {
      return res.json({
        message: '設定に変更はありません',
        config: await loadRagConfig(),
        changes: []
      });
    }
    
    // 設定を更新
    const updatedConfig = await updateRagConfig(updateData);
    
    console.log(`🔧 RAG設定を更新しました: ${changes.join(', ')}`);
    
    res.json({
      message: 'RAG設定を更新しました',
      config: updatedConfig,
      changes,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ RAG設定更新エラー:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      error: 'Failed to update RAG configuration',
      message: errorMessage
    });
  }
});

/**
 * 設定の検証
 * POST /api/config/rag/validate
 */
router.post('/rag/validate', async (req: Request, res: Response) => {
  try {
    const validationResult = ConfigUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid configuration data',
        details: validationResult.error.errors
      });
    }
    
    const configData = validationResult.data;
    const validation = validateRagConfig(configData);
    
    if (validation.valid) {
      res.json({
        valid: true,
        message: '設定は有効です',
        config: configData
      });
    } else {
      res.status(400).json({
        valid: false,
        message: '設定に問題があります',
        errors: validation.errors
      });
    }
    
  } catch (error) {
    console.error('❌ 設定検証エラー:', error);
    
    res.status(500).json({
      error: 'Configuration validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 設定の差分確認
 * POST /api/config/rag/diff
 */
router.post('/rag/diff', async (req: Request, res: Response) => {
  try {
    const validationResult = ConfigUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid configuration data',
        details: validationResult.error.errors
      });
    }
    
    const newConfig = validationResult.data;
    const changes = await getConfigDiff(newConfig);
    
    res.json({
      changes,
      hasChanges: changes.length > 0,
      message: changes.length > 0 ? `${changes.length}件の変更があります` : '変更はありません'
    });
    
  } catch (error) {
    console.error('❌ 設定差分確認エラー:', error);
    
    res.status(500).json({
      error: 'Failed to get configuration diff',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 設定のリセット
 * POST /api/config/rag/reset
 */
router.post('/rag/reset', async (req: Request, res: Response) => {
  try {
    // デフォルト設定を読み込み
    const defaultConfig = {
      embedDim: 1536,
      chunkSize: 800,
      chunkOverlap: 80,
      retrieveK: 8,
      rerankTop: 3,
      rerankMin: 0.25,
      maxTextLength: 100000,
      batchSize: 5,
      similarityThreshold: 0.7
    };
    
    // 現在の設定との差分を確認
    const changes = await getConfigDiff(defaultConfig);
    
    if (changes.length === 0) {
      return res.json({
        message: '設定は既にデフォルト値です',
        config: await loadRagConfig(),
        changes: []
      });
    }
    
    // 設定をリセット
    const resetConfig = await updateRagConfig(defaultConfig);
    
    console.log(`🔄 RAG設定をリセットしました: ${changes.join(', ')}`);
    
    res.json({
      message: 'RAG設定をリセットしました',
      config: resetConfig,
      changes,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ RAG設定リセットエラー:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      error: 'Failed to reset RAG configuration',
      message: errorMessage
    });
  }
});

/**
 * 設定のエクスポート
 * GET /api/config/rag/export
 */
router.get('/rag/export', async (req: Request, res: Response) => {
  try {
    const config = await loadRagConfig();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="rag-config.json"');
    
    res.json(config);
    
  } catch (error) {
    console.error('❌ RAG設定エクスポートエラー:', error);
    
    res.status(500).json({
      error: 'Failed to export RAG configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
