import express from 'express';
import { db } from '../db/index.js';
import { baseDocuments } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

/**
 * GET /api/base-data
 * base_documents繝・・繝悶Ν縺九ｉ蜈ｨ繝・・繧ｿ蜿門ｾ・
 */
router.get('/', async (req, res) => {
  try {
    console.log('塘 蝓ｺ遉弱ョ繝ｼ繧ｿ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・);
    
    // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
    res.setHeader('Content-Type', 'application/json');
    
    // base_documents繝・・繝悶Ν縺九ｉ蜈ｨ繝・・繧ｿ繧貞叙蠕・
    const documents = await db.select({
      id: baseDocuments.id,
      title: baseDocuments.title,
      filePath: baseDocuments.filePath,
      createdAt: baseDocuments.createdAt
    }).from(baseDocuments)
    .orderBy(baseDocuments.createdAt);

    console.log(`笨・蝓ｺ遉弱ョ繝ｼ繧ｿ蜿門ｾ怜ｮ御ｺ・ ${documents.length}莉ｶ`);

    res.json({
      success: true,
      data: documents,
      total: documents.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('笶・蝓ｺ遉弱ョ繝ｼ繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '蝓ｺ遉弱ョ繝ｼ繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/base-data
 * 譁ｰ隕丞渕遉弱ョ繝ｼ繧ｿ・域枚譖ｸ・峨ｒ菴懈・
 */
router.post('/', async (req, res) => {
  try {
    console.log('塘 蝓ｺ遉弱ョ繝ｼ繧ｿ菴懈・繝ｪ繧ｯ繧ｨ繧ｹ繝・', req.body);
    
    // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
    res.setHeader('Content-Type', 'application/json');
    
    const { title, filePath } = req.body;

    // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    if (!title || !filePath) {
      return res.status(400).json({
        success: false,
        error: '繧ｿ繧､繝医Ν縺ｨ繝輔ぃ繧､繝ｫ繝代せ縺ｯ蠢・医〒縺・,
        required: ['title', 'filePath'],
        received: { title: !!title, filePath: !!filePath }
      });
    }

    // 譁ｰ隕乗枚譖ｸ繧剃ｽ懈・
    const newDocument = await db.insert(baseDocuments).values({
      title,
      filePath
    }).returning();

    console.log('笨・蝓ｺ遉弱ョ繝ｼ繧ｿ菴懈・螳御ｺ・', newDocument[0]);

    res.status(201).json({
      success: true,
      data: newDocument[0],
      message: '蝓ｺ遉弱ョ繝ｼ繧ｿ縺梧ｭ｣蟶ｸ縺ｫ菴懈・縺輔ｌ縺ｾ縺励◆',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('笶・蝓ｺ遉弱ョ繝ｼ繧ｿ菴懈・繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '蝓ｺ遉弱ョ繝ｼ繧ｿ縺ｮ菴懈・縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/base-data/:id
 * 蝓ｺ遉弱ョ繝ｼ繧ｿ・域枚譖ｸ・峨ｒ譖ｴ譁ｰ
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, filePath } = req.body;
    
    console.log(`塘 蝓ｺ遉弱ョ繝ｼ繧ｿ譖ｴ譁ｰ繝ｪ繧ｯ繧ｨ繧ｹ繝・ ID=${id}`, req.body);
    
    // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
    res.setHeader('Content-Type', 'application/json');

    // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    if (!title || !filePath) {
      return res.status(400).json({
        success: false,
        error: '繧ｿ繧､繝医Ν縺ｨ繝輔ぃ繧､繝ｫ繝代せ縺ｯ蠢・医〒縺・,
        required: ['title', 'filePath'],
        received: { title: !!title, filePath: !!filePath }
      });
    }

    // 譌｢蟄俶枚譖ｸ繧偵メ繧ｧ繝・け
    const existingDocument = await db.select().from(baseDocuments).where(eq(baseDocuments.id, id));
    if (existingDocument.length === 0) {
      return res.status(404).json({
        success: false,
        error: '譖ｴ譁ｰ蟇ｾ雎｡縺ｮ譁・嶌縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ',
        id
      });
    }

    // 譁・嶌繧呈峩譁ｰ
    const updatedDocument = await db.update(baseDocuments)
      .set({ title, filePath })
      .where(eq(baseDocuments.id, id))
      .returning();

    console.log('笨・蝓ｺ遉弱ョ繝ｼ繧ｿ譖ｴ譁ｰ螳御ｺ・', updatedDocument[0]);

    res.json({
      success: true,
      data: updatedDocument[0],
      message: '蝓ｺ遉弱ョ繝ｼ繧ｿ縺梧ｭ｣蟶ｸ縺ｫ譖ｴ譁ｰ縺輔ｌ縺ｾ縺励◆',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('笶・蝓ｺ遉弱ョ繝ｼ繧ｿ譖ｴ譁ｰ繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '蝓ｺ遉弱ョ繝ｼ繧ｿ縺ｮ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/base-data/:id
 * 蝓ｺ遉弱ョ繝ｼ繧ｿ・域枚譖ｸ・峨ｒ蜑企勁
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`塘 蝓ｺ遉弱ョ繝ｼ繧ｿ蜑企勁繝ｪ繧ｯ繧ｨ繧ｹ繝・ ID=${id}`);
    
    // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
    res.setHeader('Content-Type', 'application/json');

    // 譌｢蟄俶枚譖ｸ繧偵メ繧ｧ繝・け
    const existingDocument = await db.select().from(baseDocuments).where(eq(baseDocuments.id, id));
    if (existingDocument.length === 0) {
      return res.status(404).json({
        success: false,
        error: '蜑企勁蟇ｾ雎｡縺ｮ譁・嶌縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ',
        id
      });
    }

    // 譁・嶌繧貞炎髯､
    await db.delete(baseDocuments).where(eq(baseDocuments.id, id));

    console.log('笨・蝓ｺ遉弱ョ繝ｼ繧ｿ蜑企勁螳御ｺ・', id);

    res.json({
      success: true,
      message: '蝓ｺ遉弱ョ繝ｼ繧ｿ縺梧ｭ｣蟶ｸ縺ｫ蜑企勁縺輔ｌ縺ｾ縺励◆',
      id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('笶・蝓ｺ遉弱ョ繝ｼ繧ｿ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '蝓ｺ遉弱ョ繝ｼ繧ｿ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/base-data/:id
 * 迚ｹ螳壹・蝓ｺ遉弱ョ繝ｼ繧ｿ・域枚譖ｸ・峨ｒ蜿門ｾ・
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`塘 蝓ｺ遉弱ョ繝ｼ繧ｿ隧ｳ邏ｰ蜿門ｾ・ ${id}`);

    // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
    res.setHeader('Content-Type', 'application/json');

    const document = await db.select({
      id: baseDocuments.id,
      title: baseDocuments.title,
      filePath: baseDocuments.filePath,
      createdAt: baseDocuments.createdAt
    }).from(baseDocuments)
    .where(eq(baseDocuments.id, id))
    .limit(1);

    if (document.length === 0) {
      return res.status(404).json({
        success: false,
        error: '譁・嶌縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ',
        id
      });
    }

    console.log('笨・蝓ｺ遉弱ョ繝ｼ繧ｿ隧ｳ邏ｰ蜿門ｾ怜ｮ御ｺ・);

    res.json({
      success: true,
      data: document[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('笶・蝓ｺ遉弱ョ繝ｼ繧ｿ隧ｳ邏ｰ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '蝓ｺ遉弱ョ繝ｼ繧ｿ縺ｮ隧ｳ邏ｰ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ繝溘ラ繝ｫ繧ｦ繧ｧ繧｢
router.use((err: any, req: any, res: any, next: any) => {
  console.error('蝓ｺ遉弱ョ繝ｼ繧ｿ繧ｨ繝ｩ繝ｼ:', err);
  
  // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
  res.setHeader('Content-Type', 'application/json');
  
  res.status(500).json({
    success: false,
    error: '蝓ｺ遉弱ョ繝ｼ繧ｿ縺ｮ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
    details: err.message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
});

// 404繝上Φ繝峨Μ繝ｳ繧ｰ
router.use('*', (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: '蝓ｺ遉弱ョ繝ｼ繧ｿ縺ｮ繧ｨ繝ｳ繝峨・繧､繝ｳ繝医′隕九▽縺九ｊ縺ｾ縺帙ｓ',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

export { router as baseDataRouter }; 