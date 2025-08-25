import express from 'express';
import { upload } from '../lib/multer-config.js';
import { 
  initializeKnowledgeBase,
  saveKnowledgeData,
  listKnowledgeData,
  getKnowledgeData, 
  deleteKnowledgeData,
  KnowledgeType,
  searchKnowledgeBase,
  loadKnowledgeBaseIndex,
  INDEX_FILE
} from '../lib/knowledge-base.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * GET /api/knowledge-base
 * 繝翫Ξ繝・ず繝・・繧ｿ荳隕ｧ繧貞叙蠕・
 */
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const knowledgeType = type ? (type as KnowledgeType) : undefined;
    
    console.log('答 繝翫Ξ繝・ず繝・・繧ｿ荳隕ｧ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・', { type: knowledgeType });
    
    const result = listKnowledgeData(knowledgeType);
    
    res.json({
      success: result.success,
      data: result.data,
      message: result.message,
      total: result.data.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('笶・繝翫Ξ繝・ず繝・・繧ｿ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繝翫Ξ繝・ず繝・・繧ｿ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/knowledge-base/:id
 * 迚ｹ螳壹・繝翫Ξ繝・ず繝・・繧ｿ繧貞叙蠕・
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('答 繝翫Ξ繝・ず繝・・繧ｿ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・', { id });
    
    const result = getKnowledgeData(id);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.message || '繝翫Ξ繝・ず繝・・繧ｿ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('笶・繝翫Ξ繝・ず繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繝翫Ξ繝・ず繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/knowledge-base/upload
 * 繝翫Ξ繝・ず繝・・繧ｿ繧偵い繝・・繝ｭ繝ｼ繝・
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '繝輔ぃ繧､繝ｫ縺後い繝・・繝ｭ繝ｼ繝峨＆繧後※縺・∪縺帙ｓ'
      });
    }
    
    const { title, category, tags, description } = req.body;
    const filePath = req.file.path;
    const filename = req.file.originalname;
    
    console.log('答 繝翫Ξ繝・ず繝・・繧ｿ繧｢繝・・繝ｭ繝ｼ繝峨Μ繧ｯ繧ｨ繧ｹ繝・', { 
      filename, 
      title, 
      category, 
      tags: tags ? tags.split(',') : undefined 
    });
    
    // 繝輔ぃ繧､繝ｫ蜀・ｮｹ繧定ｪｭ縺ｿ霎ｼ縺ｿ
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 繝｡繧ｿ繝・・繧ｿ繧呈ｺ門ｙ
    const metadata = {
      title: title || filename,
      category: category || 'general',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      description: description || `繧｢繝・・繝ｭ繝ｼ繝峨＆繧後◆${filename}`
    };
    
    // 繝翫Ξ繝・ず繝・・繧ｿ縺ｨ縺励※菫晏ｭ・
    const result = saveKnowledgeData(filename, content, metadata);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.message || '繝翫Ξ繝・ず繝・・繧ｿ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆'
      });
    }
    
    // 繧｢繝・・繝ｭ繝ｼ繝峨＆繧後◆荳譎ゅヵ繧｡繧､繝ｫ繧貞炎髯､
    try {
      fs.unlinkSync(filePath);
    } catch (deleteError) {
      console.warn('荳譎ゅヵ繧｡繧､繝ｫ蜑企勁隴ｦ蜻・', deleteError);
    }
    
    res.json({
      success: true,
      data: result.metadata,
      message: result.message,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('笶・繝翫Ξ繝・ず繝・・繧ｿ繧｢繝・・繝ｭ繝ｼ繝峨お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繝翫Ξ繝・ず繝・・繧ｿ縺ｮ繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/knowledge-base/:id
 * 繝翫Ξ繝・ず繝・・繧ｿ繧貞炎髯､
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('答 繝翫Ξ繝・ず繝・・繧ｿ蜑企勁繝ｪ繧ｯ繧ｨ繧ｹ繝・', { id });
    
    const result = deleteKnowledgeData(id);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.message || '繝翫Ξ繝・ず繝・・繧ｿ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆'
      });
    }
    
    res.json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('笶・繝翫Ξ繝・ず繝・・繧ｿ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繝翫Ξ繝・ず繝・・繧ｿ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/knowledge-base/types
 * 繝翫Ξ繝・ず繝・・繧ｿ縺ｮ遞ｮ鬘樔ｸ隕ｧ繧貞叙蠕・
 */
router.get('/types/list', async (req, res) => {
  try {
    console.log('答 繝翫Ξ繝・ず繝・・繧ｿ遞ｮ鬘樔ｸ隕ｧ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・);
    
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
    console.error('笶・繝翫Ξ繝・ず繝・・繧ｿ遞ｮ鬘樔ｸ隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繝翫Ξ繝・ず繝・・繧ｿ遞ｮ鬘樔ｸ隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/knowledge-base/search
 * 繝翫Ξ繝・ず繝吶・繧ｹ縺九ｉ讀懃ｴ｢繧貞ｮ溯｡・
 */
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: '讀懃ｴ｢繧ｯ繧ｨ繝ｪ縺悟ｿ・ｦ√〒縺・
      });
    }

    console.log(`剥 繝翫Ξ繝・ず繝吶・繧ｹ讀懃ｴ｢: "${query}"`);
    
    // 繝・ヰ繝・げ: 讀懃ｴ｢蜑阪・迥ｶ諷九ｒ遒ｺ隱・
    console.log('剥 讀懃ｴ｢蜑阪ョ繝舌ャ繧ｰ諠・ｱ:');
    console.log('- 讀懃ｴ｢繧ｯ繧ｨ繝ｪ:', query);
    
    // 謾ｹ蝟・＆繧後◆讀懃ｴ｢讖溯・繧剃ｽｿ逕ｨ
    const results = await searchKnowledgeBase(query);
    
    console.log(`笨・讀懃ｴ｢螳御ｺ・ ${results.length}莉ｶ縺ｮ邨先棡`);
    console.log('剥 讀懃ｴ｢邨先棡隧ｳ邏ｰ:', results.map(r => ({
      source: r.metadata.source,
      similarity: r.similarity,
      textLength: r.text.length
    })));
    
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: '繝翫Ξ繝・ず繝・・繧ｿ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ',
        debug: {
          query: query,
          searchFunction: 'searchKnowledgeBase',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    res.json({
      success: true,
      results: results.map(chunk => ({
        text: chunk.text,
        title: chunk.metadata.source,
        content: chunk.text,
        metadata: chunk.metadata,
        similarity: chunk.similarity
      })),
      total: results.length,
      query: query,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('笶・繝翫Ξ繝・ず繝吶・繧ｹ讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繝翫Ξ繝・ず繝吶・繧ｹ讀懃ｴ｢縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/knowledge-base/process
 * 繝翫Ξ繝・ず繝・・繧ｿ縺ｮ繝吶け繝医Ν蛹門・逅・ｒ螳溯｡・
 */
router.post('/process', async (req, res) => {
  try {
    console.log('答 繝翫Ξ繝・ず繝・・繧ｿ繝吶け繝医Ν蛹門・逅・幕蟋・);
    
    // 繝翫Ξ繝・ず繝吶・繧ｹ縺ｮ繧､繝ｳ繝・ャ繧ｯ繧ｹ繧定ｪｭ縺ｿ霎ｼ縺ｿ
    const index = loadKnowledgeBaseIndex();
    
    if (!index.knowledge || index.knowledge.length === 0) {
      return res.status(404).json({
        success: false,
        error: '蜃ｦ逅・ｯｾ雎｡縺ｮ繝翫Ξ繝・ず繝・・繧ｿ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }
    
    let processedCount = 0;
    const errors: string[] = [];
    
    // 蜷・リ繝ｬ繝・ず繝・・繧ｿ繧偵・繧ｯ繝医Ν蛹門・逅・
    for (const knowledgeItem of index.knowledge) {
      try {
        // 繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺吶ｋ縺九メ繧ｧ繝・け
        if (!fs.existsSync(knowledgeItem.path)) {
          errors.push(`繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ: ${knowledgeItem.path}`);
          continue;
        }
        
        // 繝輔ぃ繧､繝ｫ蜀・ｮｹ繧定ｪｭ縺ｿ霎ｼ縺ｿ
        const content = fs.readFileSync(knowledgeItem.path, 'utf-8');
        
        // 繝吶け繝医Ν蛹門・逅・ｼ・penAI Embeddings API繧剃ｽｿ逕ｨ・・
        if (process.env.OPENAI_API_KEY) {
          try {
            const { openai } = await import('../lib/openai.js');
            if (openai) {
              const response = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: content
              });
              
              const embedding = response.data[0].embedding;
              
              // 繝吶け繝医Ν繝・・繧ｿ繧剃ｿ晏ｭ・
              const embeddingPath = knowledgeItem.path.replace('.txt', '_embedding.json');
              fs.writeFileSync(embeddingPath, JSON.stringify({
                embedding,
                timestamp: new Date().toISOString(),
                model: "text-embedding-3-small"
              }));
              
              // 繧､繝ｳ繝・ャ繧ｯ繧ｹ繧呈峩譁ｰ
              knowledgeItem.embeddingPath = embeddingPath;
              knowledgeItem.processedAt = new Date().toISOString();
              
              processedCount++;
              console.log(`笨・繝吶け繝医Ν蛹門ｮ御ｺ・ ${knowledgeItem.title}`);
            }
          } catch (embeddingError) {
            console.error(`繝吶け繝医Ν蛹悶お繝ｩ繝ｼ (${knowledgeItem.title}):`, embeddingError);
            errors.push(`繝吶け繝医Ν蛹悶↓螟ｱ謨・ ${knowledgeItem.title}`);
          }
        } else {
          errors.push('OpenAI API繧ｭ繝ｼ縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ');
          break;
        }
      } catch (error) {
        console.error(`蜃ｦ逅・お繝ｩ繝ｼ (${knowledgeItem.title}):`, error);
        errors.push(`蜃ｦ逅・↓螟ｱ謨・ ${knowledgeItem.title}`);
      }
    }
    
    // 譖ｴ譁ｰ縺輔ｌ縺溘う繝ｳ繝・ャ繧ｯ繧ｹ繧剃ｿ晏ｭ・
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    
    res.json({
      success: true,
      message: `${processedCount}莉ｶ縺ｮ繝翫Ξ繝・ず繝・・繧ｿ繧偵・繧ｯ繝医Ν蛹悶＠縺ｾ縺励◆`,
      processedCount,
      totalCount: index.knowledge.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('笶・繝翫Ξ繝・ず繝・・繧ｿ繝吶け繝医Ν蛹門・逅・お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繝翫Ξ繝・ず繝・・繧ｿ縺ｮ繝吶け繝医Ν蛹門・逅・↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 繝翫Ξ繝・ず繝・・繧ｿ縺ｮ遞ｮ鬘槭Λ繝吶Ν繧貞叙蠕・
 */
function getTypeLabel(type: KnowledgeType): string {
  const labels: { [key in KnowledgeType]: string } = {
    [KnowledgeType.TROUBLESHOOTING]: '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ',
    [KnowledgeType.DOCUMENT]: '繝峨く繝･繝｡繝ｳ繝・,
    [KnowledgeType.QA]: 'Q&A',
    [KnowledgeType.JSON]: 'JSON繝・・繧ｿ',
    [KnowledgeType.PPT]: '繝励Ξ繧ｼ繝ｳ繝・・繧ｷ繝ｧ繝ｳ',
    [KnowledgeType.TEXT]: '繝・く繧ｹ繝・
  };
  
  return labels[type] || type;
}

export default router;

/**
 * 繝翫Ξ繝・ず繝吶・繧ｹ繝ｫ繝ｼ繝医ｒ逋ｻ骭ｲ縺吶ｋ髢｢謨ｰ
 * @param app Express繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ
 */
export function registerKnowledgeBaseRoutes(app: any): void {
  app.use('/api/knowledge-base', router);
}
