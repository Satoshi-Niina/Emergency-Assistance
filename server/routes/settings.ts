import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// RAG險ｭ螳壹・菫晏ｭ倥・隱ｭ縺ｿ霎ｼ縺ｿ逕ｨ縺ｮ繝輔ぃ繧､繝ｫ繝代せ
const RAG_SETTINGS_FILE = path.join(__dirname, '../data/rag-settings.json');

// 繝・ヵ繧ｩ繝ｫ繝医・RAG險ｭ螳・
const DEFAULT_RAG_SETTINGS = {
  chunkSize: 1000,
  chunkOverlap: 200,
  similarityThreshold: 0.7,
  maxResults: 10,
  useSemanticSearch: true,
  useKeywordSearch: true,
  removeDuplicates: true,
  preprocessingOptions: {
    removeStopWords: true,
    lowercaseText: true,
    removeSpecialChars: false
  },
  customPrompt: '',
  temperature: 0.7,
  maxTokens: 2000
};

// RAG險ｭ螳壹ｒ菫晏ｭ倥☆繧九ョ繧｣繝ｬ繧ｯ繝医Μ繧堤｢ｺ菫・
async function ensureDataDirectory() {
  const dataDir = path.dirname(RAG_SETTINGS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// RAG險ｭ螳壹ｒ蜿門ｾ・
router.get('/rag', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('剥 RAG險ｭ螳壼叙蠕励Μ繧ｯ繧ｨ繧ｹ繝・);
    
    await ensureDataDirectory();
    
    try {
      const data = await fs.readFile(RAG_SETTINGS_FILE, 'utf-8');
      const settings = JSON.parse(data);
      console.log('笨・RAG險ｭ螳夊ｪｭ縺ｿ霎ｼ縺ｿ謌仙粥:', settings);
      res.json(settings);
    } catch (error) {
      // 繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・繝・ヵ繧ｩ繝ｫ繝郁ｨｭ螳壹ｒ霑斐☆
      console.log('統 RAG險ｭ螳壹ヵ繧｡繧､繝ｫ縺悟ｭ伜惠縺励↑縺・◆繧√√ョ繝輔か繝ｫ繝郁ｨｭ螳壹ｒ霑斐＠縺ｾ縺・);
      res.json(DEFAULT_RAG_SETTINGS);
    }
  } catch (error) {
    console.error('笶・RAG險ｭ螳壼叙蠕励お繝ｩ繝ｼ:', error);
    res.status(500).json({ 
      error: 'RAG險ｭ螳壹・蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// RAG險ｭ螳壹ｒ菫晏ｭ・
router.post('/rag', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('沈 RAG險ｭ螳壻ｿ晏ｭ倥Μ繧ｯ繧ｨ繧ｹ繝・', req.body);
    
    await ensureDataDirectory();
    
    // 險ｭ螳壹ｒ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    const settings = {
      ...DEFAULT_RAG_SETTINGS,
      ...req.body
    };
    
    // 謨ｰ蛟､蝙九・繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    if (typeof settings.chunkSize !== 'number' || settings.chunkSize < 100 || settings.chunkSize > 2000) {
      return res.status(400).json({ error: '繝√Ε繝ｳ繧ｯ繧ｵ繧､繧ｺ縺ｯ100-2000縺ｮ遽・峇縺ｧ險ｭ螳壹＠縺ｦ縺上□縺輔＞' });
    }
    
    if (typeof settings.chunkOverlap !== 'number' || settings.chunkOverlap < 0 || settings.chunkOverlap >= settings.chunkSize) {
      return res.status(400).json({ error: '繝√Ε繝ｳ繧ｯ繧ｪ繝ｼ繝舌・繝ｩ繝・・縺ｯ繝√Ε繝ｳ繧ｯ繧ｵ繧､繧ｺ譛ｪ貅縺ｧ險ｭ螳壹＠縺ｦ縺上□縺輔＞' });
    }
    
    if (typeof settings.similarityThreshold !== 'number' || settings.similarityThreshold < 0.1 || settings.similarityThreshold > 1.0) {
      return res.status(400).json({ error: '鬘樔ｼｼ蠎ｦ髢ｾ蛟､縺ｯ0.1-1.0縺ｮ遽・峇縺ｧ險ｭ螳壹＠縺ｦ縺上□縺輔＞' });
    }
    
    if (typeof settings.maxResults !== 'number' || settings.maxResults < 1 || settings.maxResults > 20) {
      return res.status(400).json({ error: '譛螟ｧ邨先棡謨ｰ縺ｯ1-20縺ｮ遽・峇縺ｧ險ｭ螳壹＠縺ｦ縺上□縺輔＞' });
    }
    
    // 繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ・
    await fs.writeFile(RAG_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    
    console.log('笨・RAG險ｭ螳壻ｿ晏ｭ俶・蜉・', settings);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('笶・RAG險ｭ螳壻ｿ晏ｭ倥お繝ｩ繝ｼ:', error);
    res.status(500).json({ 
      error: 'RAG險ｭ螳壹・菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
