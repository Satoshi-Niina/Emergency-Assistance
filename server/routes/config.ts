import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { loadRagConfig, updateRagConfig, validateRagConfig, getConfigDiff } from '../services/config-manager.js';

const router = Router();

// 險ｭ螳壽峩譁ｰ繧ｹ繧ｭ繝ｼ繝槭・螳夂ｾｩ
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

type ConfigUpdate = z.infer<typeof ConfigUpdateSchema>;

/**
 * 迴ｾ蝨ｨ縺ｮRAG險ｭ螳壹ｒ蜿門ｾ・
 * GET /api/config/rag
 */
router.get('/rag', async (req: Request, res: Response) => {
  try {
    const config = await loadRagConfig();
    
    res.json({
      config,
      message: 'RAG險ｭ螳壹ｒ蜿門ｾ励＠縺ｾ縺励◆',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('笶・RAG險ｭ螳壼叙蠕励お繝ｩ繝ｼ:', error);
    
    res.status(500).json({
      error: 'Failed to load RAG configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * RAG險ｭ螳壹ｒ譖ｴ譁ｰ
 * PATCH /api/config/rag
 */
router.patch('/rag', async (req: Request, res: Response) => {
  try {
    // 繝ｪ繧ｯ繧ｨ繧ｹ繝医・繝・ぅ縺ｮ讀懆ｨｼ
    const validationResult = ConfigUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid configuration data',
        details: validationResult.error.errors
      });
    }
    
    const updateData = validationResult.data;
    
    // 險ｭ螳壹・讀懆ｨｼ
    const validation = validateRagConfig(updateData);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Configuration validation failed',
        details: validation.errors
      });
    }
    
    // 迴ｾ蝨ｨ縺ｮ險ｭ螳壹→縺ｮ蟾ｮ蛻・ｒ遒ｺ隱・
    const changes = await getConfigDiff(updateData);
    
    if (changes.length === 0) {
      return res.json({
        message: '險ｭ螳壹↓螟画峩縺ｯ縺ゅｊ縺ｾ縺帙ｓ',
        config: await loadRagConfig(),
        changes: []
      });
    }
    
    // 險ｭ螳壹ｒ譖ｴ譁ｰ
    const updatedConfig = await updateRagConfig(updateData);
    
    console.log(`肌 RAG險ｭ螳壹ｒ譖ｴ譁ｰ縺励∪縺励◆: ${changes.join(', ')}`);
    
    res.json({
      message: 'RAG險ｭ螳壹ｒ譖ｴ譁ｰ縺励∪縺励◆',
      config: updatedConfig,
      changes,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('笶・RAG險ｭ螳壽峩譁ｰ繧ｨ繝ｩ繝ｼ:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      error: 'Failed to update RAG configuration',
      message: errorMessage
    });
  }
});

/**
 * 險ｭ螳壹・讀懆ｨｼ
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
        message: '險ｭ螳壹・譛牙柑縺ｧ縺・,
        config: configData
      });
    } else {
      res.status(400).json({
        valid: false,
        message: '險ｭ螳壹↓蝠城｡後′縺ゅｊ縺ｾ縺・,
        errors: validation.errors
      });
    }
    
  } catch (error) {
    console.error('笶・險ｭ螳壽､懆ｨｼ繧ｨ繝ｩ繝ｼ:', error);
    
    res.status(500).json({
      error: 'Configuration validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 險ｭ螳壹・蟾ｮ蛻・｢ｺ隱・
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
      message: changes.length > 0 ? `${changes.length}莉ｶ縺ｮ螟画峩縺後≠繧翫∪縺兪 : '螟画峩縺ｯ縺ゅｊ縺ｾ縺帙ｓ'
    });
    
  } catch (error) {
    console.error('笶・險ｭ螳壼ｷｮ蛻・｢ｺ隱阪お繝ｩ繝ｼ:', error);
    
    res.status(500).json({
      error: 'Failed to get configuration diff',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 險ｭ螳壹・繝ｪ繧ｻ繝・ヨ
 * POST /api/config/rag/reset
 */
router.post('/rag/reset', async (req: Request, res: Response) => {
  try {
    // 繝・ヵ繧ｩ繝ｫ繝郁ｨｭ螳壹ｒ隱ｭ縺ｿ霎ｼ縺ｿ
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
    
    // 迴ｾ蝨ｨ縺ｮ險ｭ螳壹→縺ｮ蟾ｮ蛻・ｒ遒ｺ隱・
    const changes = await getConfigDiff(defaultConfig);
    
    if (changes.length === 0) {
      return res.json({
        message: '險ｭ螳壹・譌｢縺ｫ繝・ヵ繧ｩ繝ｫ繝亥､縺ｧ縺・,
        config: await loadRagConfig(),
        changes: []
      });
    }
    
    // 險ｭ螳壹ｒ繝ｪ繧ｻ繝・ヨ
    const resetConfig = await updateRagConfig(defaultConfig);
    
    console.log(`売 RAG險ｭ螳壹ｒ繝ｪ繧ｻ繝・ヨ縺励∪縺励◆: ${changes.join(', ')}`);
    
    res.json({
      message: 'RAG險ｭ螳壹ｒ繝ｪ繧ｻ繝・ヨ縺励∪縺励◆',
      config: resetConfig,
      changes,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('笶・RAG險ｭ螳壹Μ繧ｻ繝・ヨ繧ｨ繝ｩ繝ｼ:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      error: 'Failed to reset RAG configuration',
      message: errorMessage
    });
  }
});

/**
 * 險ｭ螳壹・繧ｨ繧ｯ繧ｹ繝昴・繝・
 * GET /api/config/rag/export
 */
router.get('/rag/export', async (req: Request, res: Response) => {
  try {
    const config = await loadRagConfig();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="rag-config.json"');
    
    res.json(config);
    
  } catch (error) {
    console.error('笶・RAG險ｭ螳壹お繧ｯ繧ｹ繝昴・繝医お繝ｩ繝ｼ:', error);
    
    res.status(500).json({
      error: 'Failed to export RAG configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
