import * as express from 'express';
import OpenAI from 'openai';
import { z } from 'zod';
// import { db } from '../db/index.js';
// import { emergencyFlows } from '../db/schema.js';
import { findRelevantImages } from '../utils/image-matcher.js';
import * as fs from 'fs';
import * as path from 'path';
// import { eq } from 'drizzle-orm';
import { validate as validateUUID } from 'uuid';
import { promises as fsPromises } from 'fs';
import { upload } from '../utils/image-uploader.js';
import { validateFlowData, autoFixFlowData } from '../lib/flow-validator.js';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

// ESM逕ｨ__dirname螳夂ｾｩ
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 髢狗匱迺ｰ蠅・〒縺ｯOpenAI API繧ｭ繝ｼ縺後↑縺上※繧ょ虚菴懊☆繧九ｈ縺・↓譚｡莉ｶ莉倥″蛻晄悄蛹・
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dev-mock-key') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} else {
  console.log('[DEV] OpenAI client not initialized - API key not available');
}

const generateFlowSchema = z.object({
  keyword: z.string().min(1),
});

// 繝・Φ繝励Ξ繝ｼ繝医せ繧ｭ繝ｼ繝槭ｒ驕ｩ逕ｨ縺吶ｋ髢｢謨ｰ・井ｻｮ螳溯｣・ｼ・
function applyTemplateSchema(data: any): any {
  // TODO: 螳滄圀縺ｮ繧ｹ繧ｭ繝ｼ繝樣←逕ｨ繝ｭ繧ｸ繝・け繧貞ｮ溯｣・
  // 萓具ｼ單ata縺ｫ蠢・ｦ√↑繝輔ぅ繝ｼ繝ｫ繝峨′蟄伜惠縺励↑縺・ｴ蜷医↓繝・ヵ繧ｩ繝ｫ繝亥､繧定ｿｽ蜉縺吶ｋ
  if (data && data.steps) {
    data.steps = data.steps.map((step: any) => {
      if (step.type === 'decision' && !step.options) {
        step.options = [
          { text: '縺ｯ縺・, nextStepId: '', condition: '', isTerminal: false, conditionType: 'yes' },
          { text: '縺・＞縺・, nextStepId: '', condition: '', isTerminal: false, conditionType: 'no' }
        ];
      }
      return step;
    });
  }
  return data;
}

// POST /api/emergency-flow/update-step-title
router.post('/update-step-title', async (req, res) => {
  try {
    const { flowId, stepId, title } = req.body;

    if (!flowId || !stepId || !title) {
      return res.status(400).json({ error: 'flowId, stepId, title are required' });
    }

    // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ隧ｲ蠖薙☆繧徽SON繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingDir)) {
      return res.status(404).json({ error: '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
    }
    
    const files = fs.readdirSync(troubleshootingDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    let flowData = null;
    let fileName = null;
    
    // ID縺ｫ荳閾ｴ縺吶ｋ繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(troubleshootingDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        
        if (data.id === flowId || file.replace('.json', '') === flowId) {
          flowData = data;
          fileName = file;
          break;
        }
      } catch (error) {
        console.error(`笶・繝輔ぃ繧､繝ｫ ${file} 縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:`, error);
      }
    }
    
    if (!flowData) {
      return res.status(404).json({ error: '繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
    }

    const steps = flowData.steps || [];

    // 謖・ｮ壹＆繧後◆繧ｹ繝・ャ繝励・繧ｿ繧､繝医Ν繧呈峩譁ｰ
    const stepIndex = steps.findIndex((step) => step.id === stepId);
    if (stepIndex === -1) {
      return res.status(404).json({ error: '繧ｹ繝・ャ繝励′隕九▽縺九ｊ縺ｾ縺帙ｓ' });
    }

    steps[stepIndex].title = title;
    flowData.steps = steps;
    flowData.updatedAt = new Date().toISOString();

    // JSON繝輔ぃ繧､繝ｫ繧呈峩譁ｰ
    const filePath = path.join(troubleshootingDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf-8');

    res.json({ success: true, message: '繧ｿ繧､繝医Ν縺梧峩譁ｰ縺輔ｌ縺ｾ縺励◆' });
  } catch (error) {
    console.error('繧ｿ繧､繝医Ν譖ｴ譁ｰ繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '繧ｿ繧､繝医Ν譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// 繝輔Ο繝ｼ繝・・繧ｿ縺ｮ繧ｹ繧ｭ繝ｼ繝槫ｮ夂ｾｩ
const flowDataSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  steps: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    message: z.string(),
    type: z.enum(['start', 'step', 'decision', 'condition', 'end']),
    imageUrl: z.string().optional(),
    options: z.array(z.object({
      text: z.string(),
      nextStepId: z.string(),
      isTerminal: z.boolean(),
      conditionType: z.enum(['yes', 'no', 'other']),
      condition: z.string().optional()
    })).optional()
  })),
  triggerKeywords: z.array(z.string())
});

// 繝輔Ο繝ｼ菫晏ｭ倥お繝ｳ繝峨・繧､繝ｳ繝茨ｼ域眠隕丈ｽ懈・繝ｻ譖ｴ譁ｰ・・
router.post('/', async (req, res) => {
  try {
    const flowData = req.body;
    console.log('売 繝輔Ο繝ｼ菫晏ｭ倬幕蟋・', { id: flowData.id, title: flowData.title });

    // 蠢・医ヵ繧｣繝ｼ繝ｫ繝峨・讀懆ｨｼ
    if (!flowData.title) {
      return res.status(400).json({
        success: false,
        error: '繧ｿ繧､繝医Ν縺ｯ蠢・医〒縺・
      });
    }

    // ID縺梧欠螳壹＆繧後※縺・↑縺・ｴ蜷医・逕滓・
    if (!flowData.id) {
      flowData.id = `flow_${Date.now()}`;
    }

    // 繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励ｒ險ｭ螳・
    flowData.createdAt = flowData.createdAt || new Date().toISOString();
    flowData.updatedAt = new Date().toISOString();

    // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺ｫ菫晏ｭ・
    try {
      const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
      
      if (!fs.existsSync(troubleshootingDir)) {
        fs.mkdirSync(troubleshootingDir, { recursive: true });
      }
      
      const fileName = `${flowData.id}.json`;
      const filePath = path.join(troubleshootingDir, fileName);
      
      // 譌｢蟄倥ヵ繧｡繧､繝ｫ縺ｮ遒ｺ隱・
      const isExisting = fs.existsSync(filePath);
      
      // 繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励ｒ譖ｴ譁ｰ
      flowData.updatedAt = new Date().toISOString();
      if (!flowData.createdAt) {
        flowData.createdAt = new Date().toISOString();
      }
      
      // JSON繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ・
      fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf-8');
      
      if (isExisting) {
        console.log('笨・譌｢蟄倥ヵ繝ｭ繝ｼ譖ｴ譁ｰ謌仙粥:', {
          id: flowData.id,
          title: flowData.title,
          filePath: filePath
        });
      } else {
        console.log('笨・譁ｰ隕上ヵ繝ｭ繝ｼ菴懈・謌仙粥:', {
          id: flowData.id,
          title: flowData.title,
          filePath: filePath
        });
      }
    } catch (fileError) {
      console.error('笶・繝輔ぃ繧､繝ｫ菫晏ｭ倥お繝ｩ繝ｼ:', fileError);
      return res.status(500).json({
        success: false,
        error: '繝輔ぃ繧､繝ｫ縺ｸ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆',
        details: fileError instanceof Error ? fileError.message : 'Unknown file error'
      });
    }

    console.log('笨・繝輔Ο繝ｼ菫晏ｭ俶・蜉・', {
      id: flowData.id,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0
    });

    res.json({
      success: true,
      data: flowData,
      message: '繝輔Ο繝ｼ縺梧ｭ｣蟶ｸ縺ｫ菫晏ｭ倥＆繧後∪縺励◆'
    });

  } catch (error) {
    console.error('笶・繝輔Ο繝ｼ菫晏ｭ倥お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繝輔Ο繝ｼ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 繝輔Ο繝ｼ譖ｴ譁ｰ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const flowData = req.body;
    console.log('売 繝輔Ο繝ｼ譖ｴ譁ｰ髢句ｧ・', { id, title: flowData.title });

    // ID縺ｮ荳閾ｴ遒ｺ隱・
    if (id !== flowData.id) {
      return res.status(400).json({
        success: false,
        error: 'URL縺ｮID縺ｨ繝・・繧ｿ縺ｮID縺御ｸ閾ｴ縺励∪縺帙ｓ'
      });
    }

    // 蠢・医ヵ繧｣繝ｼ繝ｫ繝峨・讀懆ｨｼ
    if (!flowData.title) {
      return res.status(400).json({
        success: false,
        error: '繧ｿ繧､繝医Ν縺ｯ蠢・医〒縺・
      });
    }

    // 繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励ｒ譖ｴ譁ｰ
    flowData.updatedAt = new Date().toISOString();

    // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ隧ｲ蠖薙☆繧徽SON繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingDir)) {
      return res.status(404).json({
        success: false,
        error: '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }
    
    const files = fs.readdirSync(troubleshootingDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    let fileName = null;
    
    // ID縺ｫ荳閾ｴ縺吶ｋ繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(troubleshootingDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        
        if (data.id === id || file.replace('.json', '') === id) {
          fileName = file;
          break;
        }
      } catch (error) {
        console.error(`笶・繝輔ぃ繧､繝ｫ ${file} 縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:`, error);
      }
    }
    
    if (!fileName) {
      return res.status(404).json({
        success: false,
        error: '譖ｴ譁ｰ蟇ｾ雎｡縺ｮ繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }

    // JSON繝輔ぃ繧､繝ｫ繧呈峩譁ｰ
    const filePath = path.join(troubleshootingDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf-8');
    
    console.log('笨・繝輔Ο繝ｼ譖ｴ譁ｰ謌仙粥:', {
      id: flowData.id,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0,
      filePath: filePath
    });

    res.json({
      success: true,
      data: flowData,
      message: '繝輔Ο繝ｼ縺梧ｭ｣蟶ｸ縺ｫ譖ｴ譁ｰ縺輔ｌ縺ｾ縺励◆'
    });

  } catch (error) {
    console.error('笶・繝輔Ο繝ｼ譖ｴ譁ｰ繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繝輔Ο繝ｼ縺ｮ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 繝輔Ο繝ｼ荳隕ｧ蜿門ｾ励お繝ｳ繝峨・繧､繝ｳ繝茨ｼ医Ν繝ｼ繝医ヱ繧ｹ・・
router.get('/', async (req, res) => {
  try {
    // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
    res.setHeader('Content-Type', 'application/json');
    
    console.log('剥 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ繝輔Ο繝ｼ荳隕ｧ繧貞叙蠕嶺ｸｭ...');
    
    // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉJSON繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ縺ｿ
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    console.log('剥 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ繝代せ:', troubleshootingDir);
    console.log('剥 迴ｾ蝨ｨ縺ｮ菴懈･ｭ繝・ぅ繝ｬ繧ｯ繝医Μ:', process.cwd());
    console.log('剥 邨ｶ蟇ｾ繝代せ:', path.resolve(troubleshootingDir));
    
    if (!fs.existsSync(troubleshootingDir)) {
      console.log('笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励∪縺帙ｓ');
      console.log('剥 莉｣譖ｿ繝代せ繧定ｩｦ陦御ｸｭ...');
      
      // 莉｣譖ｿ繝代せ繧定ｩｦ陦・
      const alternativePaths = [
        path.join(process.cwd(), 'knowledge-base', 'troubleshooting'),
        path.join(__dirname, '..', '..', 'knowledge-base', 'troubleshooting'),
        path.join(__dirname, '..', 'knowledge-base', 'troubleshooting')
      ];
      
      for (const altPath of alternativePaths) {
        console.log(`剥 莉｣譖ｿ繝代せ繧偵メ繧ｧ繝・け荳ｭ: ${altPath}`);
        if (fs.existsSync(altPath)) {
          console.log(`笨・莉｣譖ｿ繝代せ縺瑚ｦ九▽縺九ｊ縺ｾ縺励◆: ${altPath}`);
          const fileList = await loadFromDirectory(altPath);
          return res.json({
            success: true,
            data: fileList,
            total: fileList.length,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      console.error('笶・縺ｩ縺ｮ繝代せ縺ｧ繧ゅョ繧｣繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆');
      return res.json({
        success: true,
        data: [],
        total: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    const fileList = await loadFromDirectory(troubleshootingDir);
    
    // 菴懈・譌･譎ゅ〒繧ｽ繝ｼ繝・
    fileList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    console.log('搭 譛邨ら噪縺ｪ繝輔Ο繝ｼ荳隕ｧ:', fileList);
    res.json({
      success: true,
      data: fileList,
      total: fileList.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('笶・繝輔Ο繝ｼ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繝輔Ο繝ｼ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 謖・ｮ壹＆繧後◆繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ繧髢｢謨ｰ
async function loadFromDirectory(dirPath: string) {
  try {
    console.log(`刀 繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ: ${dirPath}`);
    const files = fs.readdirSync(dirPath);
    console.log('刀 繝・ぅ繝ｬ繧ｯ繝医Μ蜀・・繝輔ぃ繧､繝ｫ:', files);
    
    const jsonFiles = files.filter(file => {
      const isJson = file.endsWith('.json');
      const isNotBackup = !file.includes('.backup');
      const isNotTmp = !file.includes('.tmp');
      console.log(`塘 繝輔ぃ繧､繝ｫ ${file}: JSON=${isJson}, 繝舌ャ繧ｯ繧｢繝・・=${!isNotBackup}, 荳譎・${!isNotTmp}`);
      return isJson && isNotBackup && isNotTmp;
    });
    
    console.log('塘 蜃ｦ逅・ｯｾ雎｡縺ｮJSON繝輔ぃ繧､繝ｫ:', jsonFiles);
    
    const fileList = [];
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(dirPath, file);
        console.log(`剥 繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ: ${filePath}`);
        
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        console.log(`塘 繝輔ぃ繧､繝ｫ ${file} 縺ｮ繧ｵ繧､繧ｺ: ${fileContent.length} 譁・ｭ輿);
        
        const flowData = JSON.parse(fileContent);
        console.log(`笨・繝輔ぃ繧､繝ｫ ${file} 縺ｮJSON隗｣譫先・蜉・`, {
          id: flowData.id,
          title: flowData.title,
          hasDescription: !!flowData.description,
          hasSteps: !!(flowData.steps && flowData.steps.length > 0)
        });
        
        let description = flowData.description || '';
        if (!description && flowData.steps && flowData.steps.length > 0) {
          const firstStep = flowData.steps[0];
          description = firstStep.description || firstStep.message || '';
        }

        const result = {
          id: flowData.id || file.replace('.json', ''),
          title: flowData.title || '繧ｿ繧､繝医Ν縺ｪ縺・,
          description: description,
          fileName: file,
          filePath: `knowledge-base/troubleshooting/${file}`,
          createdAt: flowData.createdAt || new Date().toISOString(),
          updatedAt: flowData.updatedAt || new Date().toISOString(),
          triggerKeywords: flowData.triggerKeywords || flowData.trigger || [],
          category: flowData.category || '',
          dataSource: 'file'
        };
        
        fileList.push(result);
        console.log(`笨・繝輔Ο繝ｼ ${result.id} 蜃ｦ逅・ｮ御ｺ・`, result);
      } catch (error) {
        console.error(`笶・繝輔ぃ繧､繝ｫ ${file} 縺ｮ隗｣譫蝉ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:`, error);
        console.error(`剥 繧ｨ繝ｩ繝ｼ縺ｮ隧ｳ邏ｰ:`, {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }
    
    console.log(`搭 譛牙柑縺ｪ繝輔ぃ繧､繝ｫ謨ｰ: ${fileList.length}/${jsonFiles.length}`);
    return fileList;
  } catch (error) {
    console.error(`笶・繝・ぅ繝ｬ繧ｯ繝医Μ ${dirPath} 縺九ｉ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:`, error);
    return [];
  }
}

// 繝輔Ο繝ｼ荳隕ｧ蜿門ｾ励お繝ｳ繝峨・繧､繝ｳ繝茨ｼ井ｺ呈鋤諤ｧ縺ｮ縺溘ａ谿九☆・・
router.get('/list', async (req, res) => {
  try {
    console.log('剥 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ繝輔Ο繝ｼ荳隕ｧ繧貞叙蠕嶺ｸｭ・・list・・..');
    
    // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉJSON繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ縺ｿ
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    console.log('剥 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ繝代せ:', troubleshootingDir);
    console.log('剥 迴ｾ蝨ｨ縺ｮ菴懈･ｭ繝・ぅ繝ｬ繧ｯ繝医Μ:', process.cwd());
    console.log('剥 邨ｶ蟇ｾ繝代せ:', path.resolve(troubleshootingDir));
    
    if (!fs.existsSync(troubleshootingDir)) {
      console.log('笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励∪縺帙ｓ');
      console.log('剥 莉｣譖ｿ繝代せ繧定ｩｦ陦御ｸｭ...');
      
      // 莉｣譖ｿ繝代せ繧定ｩｦ陦・
      const alternativePaths = [
        path.join(process.cwd(), 'knowledge-base', 'troubleshooting'),
        path.join(__dirname, '..', '..', 'knowledge-base', 'troubleshooting'),
        path.join(__dirname, '..', 'knowledge-base', 'troubleshooting')
      ];
      
      for (const altPath of alternativePaths) {
        console.log(`剥 莉｣譖ｿ繝代せ繧偵メ繧ｧ繝・け荳ｭ: ${altPath}`);
        if (fs.existsSync(altPath)) {
          console.log(`笨・莉｣譖ｿ繝代せ縺瑚ｦ九▽縺九ｊ縺ｾ縺励◆: ${altPath}`);
          const fileList = await loadFromDirectory(altPath);
          return res.json({
            success: true,
            data: fileList,
            total: fileList.length,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      console.error('笶・縺ｩ縺ｮ繝代せ縺ｧ繧ゅョ繧｣繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆');
      return res.json({
        success: true,
        data: [],
        total: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    const fileList = await loadFromDirectory(troubleshootingDir);
    
    // 菴懈・譌･譎ゅ〒繧ｽ繝ｼ繝・
    fileList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    console.log('搭 譛邨ら噪縺ｪ繝輔Ο繝ｼ荳隕ｧ:', fileList);
    res.json({
      success: true,
      data: fileList,
      total: fileList.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('笶・繝輔Ο繝ｼ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({ 
      success: false,
      error: '繝輔Ο繝ｼ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

// 繝輔Ο繝ｼ隧ｳ邏ｰ蜿門ｾ励お繝ｳ繝峨・繧､繝ｳ繝・
router.get('/detail/:id', async (req, res) => {
  try {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    
    // 繧ｭ繝｣繝・す繝･蛻ｶ蠕｡繝倥ャ繝繝ｼ繧定ｨｭ螳・
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${timestamp}-${randomId}"`,
      'X-Accel-Expires': '0',
      'X-Requested-With': 'XMLHttpRequest'
    });

    const { id } = req.params;
    console.log(`売 [${timestamp}] 繝輔Ο繝ｼ隧ｳ邏ｰ蜿門ｾ鈴幕蟋・ ID=${id}`);

    // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ隧ｲ蠖薙☆繧徽SON繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingDir)) {
      console.log(`笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ`);
      return res.status(404).json({ error: '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
    }
    
    const files = fs.readdirSync(troubleshootingDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    let flowData = null;
    let fileName = null;
    
    // ID縺ｫ荳閾ｴ縺吶ｋ繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(troubleshootingDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        
        if (data.id === id || file.replace('.json', '') === id) {
          flowData = data;
          fileName = file;
          break;
        }
      } catch (error) {
        console.error(`笶・繝輔ぃ繧､繝ｫ ${file} 縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:`, error);
      }
    }
    
    if (!flowData) {
      console.log(`笶・繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ: ${id}`);
      return res.status(404).json({ error: '繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
    }

    console.log(`笨・繝輔Ο繝ｼ隧ｳ邏ｰ隱ｭ縺ｿ霎ｼ縺ｿ謌仙粥: ${id}`, {
      id: flowData.id,
      title: flowData.title,
      hasSteps: !!flowData.steps,
      stepsCount: flowData.steps?.length || 0,
      fileName: fileName
    });

    // 譚｡莉ｶ蛻・ｲ舌せ繝・ャ繝励・遒ｺ隱・
    const decisionSteps = flowData.steps?.filter((step: any) => (step as any).type === 'decision') || [];
    const conditionSteps = flowData.steps?.filter((step: any) => (step as any).type === 'condition') || [];

    console.log(`楳 譚｡莉ｶ蛻・ｲ舌せ繝・ャ繝励・遒ｺ隱・`, {
      totalSteps: flowData.steps?.length || 0, 
      decisionSteps: decisionSteps.length, 
      conditionSteps: conditionSteps.length, 
      decisionStepsDetail: decisionSteps.map((step) => ({
        id: step.id,
        title: step.title,
        optionsCount: step.options?.length || 0
      })),
      conditionStepsDetail: conditionSteps.map((step) => ({
        id: step.id,
          title: step.title,
          conditionsCount: step.conditions?.length || 0
        }))
      });

      // 繝輔Ο繝ｼ繝・・繧ｿ繧呈紛蠖｢
      const data = {
        id: flowData.id,
        title: flowData.title,
        description: flowData.description,
        steps: flowData.steps || [],
        triggerKeywords: flowData.triggerKeywords || flowData.trigger || [],
        category: flowData.category,
        createdAt: flowData.createdAt,
        updatedAt: flowData.updatedAt
      };

      res.json({
        success: true,
        data: data,
        metadata: {
          requestId: `${timestamp}-${randomId}`,
          processedAt: new Date().toISOString()
        }
      });

      console.log(`笨・螳悟・繝・・繧ｿ隗｣譫先・蜉・`, {
        id: data.id,
        title: data.title,
        stepsCount: data.steps?.length || 0,
        decisionStepsCount: decisionSteps.length,
        conditionStepsCount: conditionSteps.length,
        responseSize: JSON.stringify(data).length
      });

  } catch (error) {
    console.error('笶・繝輔Ο繝ｼ隧ｳ邏ｰ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '繝輔Ο繝ｼ隧ｳ邏ｰ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// 繝輔Ο繝ｼ蜑企勁繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`卵・・繝輔Ο繝ｼ蜑企勁髢句ｧ・ ID=${id}`);

    // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ隧ｲ蠖薙☆繧徽SON繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingDir)) {
      return res.status(404).json({
        success: false,
        error: '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }
    
    const files = fs.readdirSync(troubleshootingDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    let fileName = null;
    
    // ID縺ｫ荳閾ｴ縺吶ｋ繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(troubleshootingDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        
        if (data.id === id || file.replace('.json', '') === id) {
          fileName = file;
          break;
        }
      } catch (error) {
        console.error(`笶・繝輔ぃ繧､繝ｫ ${file} 縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:`, error);
      }
    }
    
    if (!fileName) {
      return res.status(404).json({
        success: false,
        error: '蜑企勁蟇ｾ雎｡縺ｮ繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }

    // JSON繝輔ぃ繧､繝ｫ繧貞炎髯､
    const filePath = path.join(troubleshootingDir, fileName);
    fs.unlinkSync(filePath);
    
    console.log(`卵・・繝輔Ο繝ｼ蜑企勁螳御ｺ・ ${id}, 繝輔ぃ繧､繝ｫ: ${fileName}`);
    res.json({ 
      success: true, 
      message: '繝輔Ο繝ｼ縺悟炎髯､縺輔ｌ縺ｾ縺励◆',
      deletedId: id,
      deletedFile: fileName
    });
  } catch (error) {
    console.error('笶・繝輔Ο繝ｼ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '繝輔Ο繝ｼ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// 繝輔Ο繝ｼ逶ｴ謗･蜿門ｾ励お繝ｳ繝峨・繧､繝ｳ繝茨ｼ医く繝｣繝・す繝･蛻ｶ蠕｡莉倥″・・
router.get('/get/:id', async (req, res) => {
  try {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    
    // 繧ｭ繝｣繝・す繝･蛻ｶ蠕｡繝倥ャ繝繝ｼ繧定ｨｭ螳・
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${timestamp}-${randomId}"`,
      'X-Accel-Expires': '0',
      'X-Requested-With': 'XMLHttpRequest'
    });

    const { id } = req.params;
    console.log(`売 [${timestamp}] 繝輔Ο繝ｼ逶ｴ謗･蜿門ｾ・ ID=${id}`);

    // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ隧ｲ蠖薙☆繧徽SON繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingDir)) {
      console.log(`笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ`);
      return res.status(404).json({ error: '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
    }
    
    const files = fs.readdirSync(troubleshootingDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    let flowData = null;
    
    // ID縺ｫ荳閾ｴ縺吶ｋ繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(troubleshootingDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        
        if (data.id === id || file.replace('.json', '') === id) {
          flowData = data;
          break;
        }
      } catch (error) {
        console.error(`笶・繝輔ぃ繧､繝ｫ ${file} 縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:`, error);
      }
    }
    
    if (!flowData) {
      console.log(`笶・繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ: ${id}`);
      return res.status(404).json({ error: '繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
    }

    console.log(`投 繝輔Ο繝ｼ諠・ｱ:`, {
      id: flowData.id,
      title: flowData.title,
      hasSteps: !!flowData.steps,
      stepsCount: flowData.steps?.length || 0
    });

    // 繝輔Ο繝ｼ繝・・繧ｿ繧呈紛蠖｢
    const data = {
      id: flowData.id,
      title: flowData.title,
      description: flowData.description,
      steps: flowData.steps || [],
      triggerKeywords: flowData.triggerKeywords || flowData.trigger || [],
      category: flowData.category,
      createdAt: flowData.createdAt,
      updatedAt: flowData.updatedAt
    };

      // 譚｡莉ｶ蛻・ｲ舌せ繝・ャ繝励・遒ｺ隱・
      const decisionSteps = data.steps?.filter((step: any) => step.type === 'decision') || [];
      const conditionSteps = data.steps?.filter((step: any) => step.type === 'condition') || [];

      console.log(`楳 譚｡莉ｶ蛻・ｲ舌せ繝・ャ繝励・遒ｺ隱・`, {
        totalSteps: data.steps?.length || 0,
        decisionSteps: decisionSteps.length,
        conditionSteps: conditionSteps.length
      });

      res.json({
        ...data,
        metadata: {
          requestId: `${timestamp}-${randomId}`,
          processedAt: new Date().toISOString()
        }
      });

      console.log(`笨・逶ｴ謗･繝・・繧ｿ蜿門ｾ玲・蜉・`, {
        id: data.id,
        title: data.title,
        stepsCount: data.steps?.length || 0,
        decisionStepsCount: decisionSteps.length,
        conditionStepsCount: conditionSteps.length
      });

  } catch (error) {
    console.error('笶・繝輔Ο繝ｼ逶ｴ謗･蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '繝輔Ο繝ｼ逶ｴ謗･蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// GPT繝ｬ繧ｹ繝昴Φ繧ｹ縺九ｉ謇矩・ｒ謚ｽ蜃ｺ縺吶ｋ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ髢｢謨ｰ
function extractStepsFromResponse(response: string, keyword: string) {
  const steps = [];
  const lines = response.split('\n').filter(line => line.trim());
  
  // 谿ｵ關ｽ縺斐→縺ｫ謇矩・→縺励※謚ｽ蜃ｺ
  let currentStep = null;
  let stepCount = 0;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 譁ｰ縺励＞谿ｵ關ｽ縺ｮ髢句ｧ九ｒ讀懷・
    if (trimmedLine && 
        !trimmedLine.startsWith('**') && 
        !trimmedLine.startsWith('萓・') && 
        !trimmedLine.startsWith('繧ｿ繧､繝医Ν・・) &&
        !trimmedLine.startsWith('謇矩・ｼ・) &&
        !trimmedLine.match(/^謇矩・d+・・) &&
        !trimmedLine.match(/^\d+\./)) {
      
      if (currentStep) {
        steps.push(currentStep);
      }
      
      stepCount++;
      currentStep = {
        id: `step_${stepCount}`,
        title: trimmedLine.substring(0, 50) + (trimmedLine.length > 50 ? '...' : ''),
        description: trimmedLine,
        message: trimmedLine,
        type: 'step',
        imageUrl: '',
        options: []
      };
    } else if (currentStep && trimmedLine) {
      // 譌｢蟄倥・謇矩・↓隧ｳ邏ｰ繧定ｿｽ蜉
      currentStep.description += '\n' + trimmedLine;
      currentStep.message += '\n' + trimmedLine;
    }
  }
  
  if (currentStep) {
    steps.push(currentStep);
  }
  
  // 謇矩・′謚ｽ蜃ｺ縺ｧ縺阪↑縺・ｴ蜷医・縲√く繝ｼ繝ｯ繝ｼ繝峨・繝ｼ繧ｹ縺ｧ繝・ヵ繧ｩ繝ｫ繝域焔鬆・ｒ逕滓・
  if (steps.length === 0) {
    steps.push({
      id: 'step_1',
      title: `${keyword}縺ｮ螳牙・遒ｺ隱港,
      description: `${keyword}縺ｮ迥ｶ豕√ｒ螳牙・縺ｫ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲ゆｽ懈･ｭ迴ｾ蝣ｴ縺ｮ螳牙・繧堤｢ｺ菫昴＠縲∝ｿ・ｦ√↓蠢懊§縺ｦ邱頑･蛛懈ｭ｢繧定｡後▲縺ｦ縺上□縺輔＞縲Ａ,
      message: `${keyword}縺ｮ迥ｶ豕√ｒ螳牙・縺ｫ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲ゆｽ懈･ｭ迴ｾ蝣ｴ縺ｮ螳牙・繧堤｢ｺ菫昴＠縲∝ｿ・ｦ√↓蠢懊§縺ｦ邱頑･蛛懈ｭ｢繧定｡後▲縺ｦ縺上□縺輔＞縲Ａ,
      type: 'step',
      imageUrl: '',
      options: []
    });
    
    steps.push({
      id: 'step_2',
      title: `${keyword}縺ｮ隧ｳ邏ｰ轤ｹ讀彖,
      description: `${keyword}縺ｮ謨・囿迥ｶ豕√ｒ隧ｳ邏ｰ縺ｫ轤ｹ讀懊＠縲∝撫鬘後・遞句ｺｦ縺ｨ遽・峇繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲Ａ,
      message: `${keyword}縺ｮ謨・囿迥ｶ豕√ｒ隧ｳ邏ｰ縺ｫ轤ｹ讀懊＠縲∝撫鬘後・遞句ｺｦ縺ｨ遽・峇繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲Ａ,
      type: 'step',
      imageUrl: '',
      options: []
    });
    
    steps.push({
      id: 'step_3',
      title: '蟆る摩謚陦楢・∈縺ｮ騾｣邨｡',
      description: '螳牙・縺ｧ遒ｺ螳溘↑蟇ｾ蠢懊・縺溘ａ縲∝ｰる摩謚陦楢・↓騾｣邨｡縺励※謖・､ｺ繧剃ｻｰ縺・〒縺上□縺輔＞縲・,
      message: '螳牙・縺ｧ遒ｺ螳溘↑蟇ｾ蠢懊・縺溘ａ縲∝ｰる摩謚陦楢・↓騾｣邨｡縺励※謖・､ｺ繧剃ｻｰ縺・〒縺上□縺輔＞縲・,
      type: 'step',
      imageUrl: '',
      options: []
    });
  }
  
  return steps;
}

// 繝輔Ο繝ｼ逕滓・繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.post('/generate', async (req, res) => {
  try {
    const { keyword } = generateFlowSchema.parse(req.body);
    console.log(`売 繝輔Ο繝ｼ逕滓・髢句ｧ・ 繧ｭ繝ｼ繝ｯ繝ｼ繝・${keyword}`);

    // OpenAI繧ｯ繝ｩ繧､繧｢繝ｳ繝医′蛻ｩ逕ｨ蜿ｯ閭ｽ縺九メ繧ｧ繝・け
    if (!openai) {
      return res.status(503).json({
        success: false,
        error: 'OpenAI API縺悟茜逕ｨ縺ｧ縺阪∪縺帙ｓ縲る幕逋ｺ迺ｰ蠅・〒縺ｯAPI繧ｭ繝ｼ繧定ｨｭ螳壹＠縺ｦ縺上□縺輔＞縲・,
        details: 'OpenAI client not available'
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `縺ゅ↑縺溘・蟒ｺ險ｭ讖滓｢ｰ縺ｮ謨・囿險ｺ譁ｭ縺ｨ蠢懈･蜃ｦ鄂ｮ縺ｮ蟆る摩螳ｶ縺ｧ縺吶・
莉･荳九・蠖｢蠑上〒蜈ｷ菴鍋噪縺ｧ螳溽畑逧・↑蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧堤函謌舌＠縺ｦ縺上□縺輔＞・・

**蠢・医ヵ繧ｩ繝ｼ繝槭ャ繝・**
1. 繧ｿ繧､繝医Ν・喙蜈ｷ菴鍋噪縺ｪ蝠城｡悟錐]
2. 謇矩・ｼ・
   - 謇矩・・喙蜈ｷ菴鍋噪縺ｪ菴懈･ｭ蜀・ｮｹ縺ｨ謇矩・
   - 謇矩・・喙蜈ｷ菴鍋噪縺ｪ菴懈･ｭ蜀・ｮｹ縺ｨ謇矩・
   - 謇矩・・喙蜈ｷ菴鍋噪縺ｪ菴懈･ｭ蜀・ｮｹ縺ｨ謇矩・
   ・亥ｿ・ｦ√↓蠢懊§縺ｦ4-6謇矩・∪縺ｧ・・

**驥崎ｦ√↑隕∵ｱゆｺ矩・**
- 蜷・焔鬆・・蜈ｷ菴鍋噪縺ｪ菴懈･ｭ蜀・ｮｹ繧貞性繧・医檎｢ｺ隱阪☆繧九阪檎せ讀懊☆繧九阪□縺代〒縺ｯ縺ｪ縺上∽ｽ輔ｒ縺ｩ縺・｢ｺ隱阪・轤ｹ讀懊☆繧九°繧呈・險假ｼ・
- 螳牙・荳翫・豕ｨ諢丈ｺ矩・ｒ蜷ｫ繧√ｋ
- 蠢・ｦ√↑蟾･蜈ｷ繧・Κ蜩√′縺ゅｌ縺ｰ譏手ｨ・
- 蟆る摩謚陦楢・∈縺ｮ騾｣邨｡縺悟ｿ・ｦ√↑蝣ｴ蜷医・譏手ｨ・
- 謚陦楢・〒繧らｴ莠ｺ縺ｧ繧ょｮ溯｡悟庄閭ｽ縺ｪ繝ｬ繝吶Ν縺ｧ隱ｬ譏・

**萓・**
謇矩・・壹お繝ｳ繧ｸ繝ｳ繝ｫ繝ｼ繝縺ｮ螳牙・遒ｺ隱搾ｼ医お繝ｳ繧ｸ繝ｳ蛛懈ｭ｢縲√ヶ繝ｬ繝ｼ繧ｭ謗帙￠縲∽ｽ懈･ｭ迴ｾ蝣ｴ縺ｮ螳牙・遒ｺ菫晢ｼ・
謇矩・・壹ヰ繝・ユ繝ｪ繝ｼ遶ｯ蟄舌・轤ｹ讀懶ｼ育ｫｯ蟄舌・邱ｩ縺ｿ縲∬・鬟溘∵磁邯夂憾諷九ｒ逶ｮ隕也｢ｺ隱搾ｼ・
謇矩・・壹ヰ繝・ユ繝ｪ繝ｼ髮ｻ蝨ｧ貂ｬ螳夲ｼ医ユ繧ｹ繧ｿ繝ｼ縺ｧ12.6V莉･荳翫≠繧九°遒ｺ隱搾ｼ荏
        },
        {
          role: "user",
          content: `莉･荳九・謨・囿迥ｶ豕√↓蟇ｾ縺吶ｋ蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧堤函謌舌＠縺ｦ縺上□縺輔＞・・{keyword}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const generatedContent = completion.choices[0]?.message?.content;
    if (!generatedContent) {
      throw new Error('繝輔Ο繝ｼ逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
    }

    // 逕滓・縺輔ｌ縺溘さ繝ｳ繝・Φ繝・ｒ繝代・繧ｹ縺励※繝輔Ο繝ｼ讒矩縺ｫ螟画鋤
    console.log('剥 GPT繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ隗｣譫宣幕蟋・', {
      contentLength: generatedContent.length,
      lineCount: generatedContent.split('\n').length
    });
    
    const lines = generatedContent.split('\n').filter(line => line.trim());
    const title = lines.find(line => line.includes('繧ｿ繧､繝医Ν・・))?.replace('繧ｿ繧､繝医Ν・・, '').trim() || keyword;
    
    console.log('統 謚ｽ蜃ｺ縺輔ｌ縺溘ち繧､繝医Ν:', title);
    
    const steps = [];
    let currentStep = null;
    
    for (const line of lines) {
      // 謇矩・・髢句ｧ九ｒ讀懷・・域焔鬆・ｼ壹∵焔鬆・・壹・. 縺ｪ縺ｩ縺ｮ繝代ち繝ｼ繝ｳ・・
      if (line.includes('謇矩・ｼ・) || line.match(/^謇矩・d+・・) || line.match(/^\d+\./)) {
        if (currentStep) {
          steps.push(currentStep);
          console.log('笨・謇矩・ｒ霑ｽ蜉:', currentStep.title);
        }
        
        // 謇矩・分蜿ｷ縺ｨ繧ｿ繧､繝医Ν繧呈歓蜃ｺ
        const stepMatch = line.match(/^(?:謇矩・?(?:(\d+)・・?\s*(.+)/);
        if (stepMatch) {
          const stepNumber = stepMatch[1] || (steps.length + 1);
          const stepTitle = stepMatch[2].trim();
          
          currentStep = {
            id: `step_${stepNumber}`,
            title: stepTitle,
            description: stepTitle,
            message: stepTitle,
            type: 'step',
            imageUrl: '',
            options: []
          };
          
          console.log('・ 譁ｰ縺励＞謇矩・ｒ菴懈・:', { id: currentStep.id, title: stepTitle });
        }
      } else if (currentStep && line.trim()) {
        // 謇矩・・隧ｳ邏ｰ隱ｬ譏弱ｒ霑ｽ蜉
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('**') && !trimmedLine.startsWith('萓・')) {
          currentStep.description += '\n' + trimmedLine;
          currentStep.message += '\n' + trimmedLine;
        }
      }
    }
    
    if (currentStep) {
      steps.push(currentStep);
      console.log('笨・譛蠕後・謇矩・ｒ霑ｽ蜉:', currentStep.title);
    }
    
    console.log('投 謇矩・歓蜃ｺ邨先棡:', {
      totalSteps: steps.length,
      stepTitles: steps.map(s => s.title)
    });
    
    // 謇矩・′逕滓・縺輔ｌ縺ｦ縺・↑縺・ｴ蜷医・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ蜃ｦ逅・
    if (steps.length === 0) {
      console.log('笞・・謇矩・′逕滓・縺輔ｌ縺ｦ縺・↑縺・◆繧√√ヵ繧ｩ繝ｼ繝ｫ繝舌ャ繧ｯ蜃ｦ逅・ｒ螳溯｡・);
      
      // GPT縺ｮ逕溘・繝ｬ繧ｹ繝昴Φ繧ｹ縺九ｉ謇矩・ｒ謚ｽ蜃ｺ
      const fallbackSteps = extractStepsFromResponse(generatedContent, keyword);
      steps.push(...fallbackSteps);
      
      console.log('売 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ謇矩・函謌仙ｮ御ｺ・', {
        fallbackStepsCount: fallbackSteps.length,
        totalStepsAfterFallback: steps.length
      });
    }

    const flowData = {
      id: `flow_${Date.now()}`,
      title: title,
      description: `閾ｪ蜍慕函謌舌＆繧後◆${keyword}縺ｮ蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ`,
      triggerKeywords: [keyword],
      steps: steps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // knowledge-base/troubleshooting繝輔か繝ｫ繝縺ｫ菫晏ｭ・
    try {
      const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
      const filePath = path.join(troubleshootingDir, `${flowData.id}.json`);
      
      // 繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・
      if (!fs.existsSync(troubleshootingDir)) {
        fs.mkdirSync(troubleshootingDir, { recursive: true });
      }
      
      // 繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ・
      fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf8');
      
      console.log('笨・逕滓・繝輔Ο繝ｼ菫晏ｭ俶・蜉・', {
        id: flowData.id,
        title: flowData.title,
        stepsCount: flowData.steps.length,
        filePath: filePath
      });
    } catch (fileError) {
      console.error('笶・繝輔ぃ繧､繝ｫ菫晏ｭ倥お繝ｩ繝ｼ:', fileError);
      return res.status(500).json({
        success: false,
        error: '繝輔ぃ繧､繝ｫ縺ｸ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆',
        details: fileError instanceof Error ? fileError.message : 'Unknown file error'
      });
    }

    // 逕滓・縺輔ｌ縺溘ヵ繝ｭ繝ｼ縺ｮ隧ｳ邏ｰ諠・ｱ繧貞性繧繝ｬ繧ｹ繝昴Φ繧ｹ
    const responseData = {
      success: true,
      data: flowData,
      message: '繝輔Ο繝ｼ縺梧ｭ｣蟶ｸ縺ｫ逕滓・縺輔ｌ縺ｾ縺励◆',
      generatedContent: generatedContent, // GPT縺ｮ逕溘・繝ｬ繧ｹ繝昴Φ繧ｹ
      extractedSteps: steps.map(step => ({
        id: step.id,
        title: step.title,
        description: step.description
      })),
      summary: {
        totalSteps: steps.length,
        hasSpecificActions: steps.some(step => 
          step.description.includes('遒ｺ隱・) || 
          step.description.includes('轤ｹ讀・) || 
          step.description.includes('貂ｬ螳・) ||
          step.description.includes('隱ｿ謨ｴ')
        ),
        safetyNotes: steps.some(step => 
          step.description.includes('螳牙・') || 
          step.description.includes('蜊ｱ髯ｺ') ||
          step.description.includes('蛛懈ｭ｢')
        )
      }
    };

    res.json(responseData);

  } catch (error) {
    console.error('笶・繝輔Ο繝ｼ逕滓・繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繝輔Ο繝ｼ縺ｮ逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 繝輔Ο繝ｼ逕滓・縺ｮ繝・せ繝育畑繧ｨ繝ｳ繝峨・繧､繝ｳ繝茨ｼ磯幕逋ｺ迺ｰ蠅・・縺ｿ・・
if (process.env.NODE_ENV === 'development') {
  router.post('/test-generate', async (req, res) => {
    try {
      const { keyword, testPrompt } = req.body;
      console.log(`ｧｪ 繝・せ繝医ヵ繝ｭ繝ｼ逕滓・: 繧ｭ繝ｼ繝ｯ繝ｼ繝・${keyword}`);

      if (!openai) {
        return res.status(503).json({
          success: false,
          error: 'OpenAI API縺悟茜逕ｨ縺ｧ縺阪∪縺帙ｓ'
        });
      }

      // 繝・せ繝育畑縺ｮ繧ｫ繧ｹ繧ｿ繝繝励Ο繝ｳ繝励ヨ
      const customPrompt = testPrompt || `莉･荳九・謨・囿迥ｶ豕√↓蟇ｾ縺吶ｋ蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧堤函謌舌＠縺ｦ縺上□縺輔＞・・{keyword}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `縺ゅ↑縺溘・蟒ｺ險ｭ讖滓｢ｰ縺ｮ謨・囿險ｺ譁ｭ縺ｨ蠢懈･蜃ｦ鄂ｮ縺ｮ蟆る摩螳ｶ縺ｧ縺吶・
莉･荳九・蠖｢蠑上〒蜈ｷ菴鍋噪縺ｧ螳溽畑逧・↑蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧堤函謌舌＠縺ｦ縺上□縺輔＞・・

**蠢・医ヵ繧ｩ繝ｼ繝槭ャ繝・**
1. 繧ｿ繧､繝医Ν・喙蜈ｷ菴鍋噪縺ｪ蝠城｡悟錐]
2. 謇矩・ｼ・
   - 謇矩・・喙蜈ｷ菴鍋噪縺ｪ菴懈･ｭ蜀・ｮｹ縺ｨ謇矩・
   - 謇矩・・喙蜈ｷ菴鍋噪縺ｪ菴懈･ｭ蜀・ｮｹ縺ｨ謇矩・
   - 謇矩・・喙蜈ｷ菴鍋噪縺ｪ菴懈･ｭ蜀・ｮｹ縺ｨ謇矩・
   ・亥ｿ・ｦ√↓蠢懊§縺ｦ4-6謇矩・∪縺ｧ・・

**驥崎ｦ√↑隕∵ｱゆｺ矩・**
- 蜷・焔鬆・・蜈ｷ菴鍋噪縺ｪ菴懈･ｭ蜀・ｮｹ繧貞性繧・医檎｢ｺ隱阪☆繧九阪檎せ讀懊☆繧九阪□縺代〒縺ｯ縺ｪ縺上∽ｽ輔ｒ縺ｩ縺・｢ｺ隱阪・轤ｹ讀懊☆繧九°繧呈・險假ｼ・
- 螳牙・荳翫・豕ｨ諢丈ｺ矩・ｒ蜷ｫ繧√ｋ
- 蠢・ｦ√↑蟾･蜈ｷ繧・Κ蜩√′縺ゅｌ縺ｰ譏手ｨ・
- 蟆る摩謚陦楢・∈縺ｮ騾｣邨｡縺悟ｿ・ｦ√↑蝣ｴ蜷医・譏手ｨ・
- 謚陦楢・〒繧らｴ莠ｺ縺ｧ繧ょｮ溯｡悟庄閭ｽ縺ｪ繝ｬ繝吶Ν縺ｧ隱ｬ譏・

**萓・**
謇矩・・壹お繝ｳ繧ｸ繝ｳ繝ｫ繝ｼ繝縺ｮ螳牙・遒ｺ隱搾ｼ医お繝ｳ繧ｸ繝ｳ蛛懈ｭ｢縲√ヶ繝ｬ繝ｼ繧ｭ謗帙￠縲∽ｽ懈･ｭ迴ｾ蝣ｴ縺ｮ螳牙・遒ｺ菫晢ｼ・
謇矩・・壹ヰ繝・ユ繝ｪ繝ｼ遶ｯ蟄舌・轤ｹ讀懶ｼ育ｫｯ蟄舌・邱ｩ縺ｿ縲∬・鬟溘∵磁邯夂憾諷九ｒ逶ｮ隕也｢ｺ隱搾ｼ・
謇矩・・壹ヰ繝・ユ繝ｪ繝ｼ髮ｻ蝨ｧ貂ｬ螳夲ｼ医ユ繧ｹ繧ｿ繝ｼ縺ｧ12.6V莉･荳翫≠繧九°遒ｺ隱搾ｼ荏
          },
          {
            role: "user",
            content: customPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const generatedContent = completion.choices[0]?.message?.content;
      if (!generatedContent) {
        throw new Error('繝・せ繝医ヵ繝ｭ繝ｼ逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
      }

      res.json({
        success: true,
        data: {
          keyword,
          generatedContent,
          testPrompt: customPrompt,
          timestamp: new Date().toISOString()
        },
        message: '繝・せ繝医ヵ繝ｭ繝ｼ逕滓・縺悟ｮ御ｺ・＠縺ｾ縺励◆'
      });

    } catch (error) {
      console.error('笶・繝・せ繝医ヵ繝ｭ繝ｼ逕滓・繧ｨ繝ｩ繝ｼ:', error);
      res.status(500).json({
        success: false,
        error: '繝・せ繝医ヵ繝ｭ繝ｼ縺ｮ逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

// 逕ｻ蜒上い繝・・繝ｭ繝ｼ繝峨お繝ｳ繝峨・繧､繝ｳ繝・
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '逕ｻ蜒上ヵ繧｡繧､繝ｫ縺梧署萓帙＆繧後※縺・∪縺帙ｓ'
      });
    }

    // 繝輔ぃ繧､繝ｫ蠖｢蠑上メ繧ｧ繝・け
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: '蟇ｾ蠢懊＠縺ｦ縺・↑縺・ヵ繧｡繧､繝ｫ蠖｢蠑上〒縺・
      });
    }

    // 繝輔ぃ繧､繝ｫ繧ｵ繧､繧ｺ繝√ぉ繝・け・・MB・・
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: '繝輔ぃ繧､繝ｫ繧ｵ繧､繧ｺ縺ｯ5MB莉･荳九↓縺励※縺上□縺輔＞'
      });
    }

    // 繝輔ぃ繧､繝ｫ蜷阪ｒ逕滓・・医ち繧､繝繧ｹ繧ｿ繝ｳ繝・+ 繧ｪ繝ｪ繧ｸ繝翫Ν蜷搾ｼ・
    const timestamp = Date.now();
    const originalName = req.file.originalname;
    const extension = originalName.split('.').pop();
    const fileName = `emergency-flow-step${timestamp}.${extension}`;

    // 菫晏ｭ伜・繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｽ懈・
    const uploadDir = path.join(__dirname, '../../knowledge-base/images/emergency-flows');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 繝輔ぃ繧､繝ｫ縺ｮ驥崎､・メ繧ｧ繝・け
    const fileHash = calculateFileHash(req.file.buffer);
    console.log('剥 繝輔ぃ繧､繝ｫ繝上ャ繧ｷ繝･險育ｮ・', { fileHash });
    
    const existingFile = findExistingImageByHash(uploadDir, fileHash);
    let finalFileName = fileName;
    let isDuplicate = false;

    if (existingFile) {
      console.log('売 驥崎､・判蜒上ｒ讀懷・縲∵里蟄倥ヵ繧｡繧､繝ｫ繧剃ｽｿ逕ｨ:', existingFile);
      finalFileName = existingFile;
      isDuplicate = true;
    } else {
      // 譁ｰ縺励＞繝輔ぃ繧､繝ｫ繧剃ｿ晏ｭ・
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);
    }

    // API繧ｨ繝ｳ繝峨・繧､繝ｳ繝医・URL繧堤函謌・
    const imageUrl = `/api/emergency-flow/image/${finalFileName}`;

    console.log('笨・逕ｻ蜒上い繝・・繝ｭ繝ｼ繝画・蜉・', {
      fileName: finalFileName,
      imageUrl,
      fileSize: req.file.size,
      isDuplicate,
      details: {
        originalFileName: fileName,
        finalFileName: finalFileName,
        finalImageUrl: imageUrl
      }
    });

    res.json({
      success: true,
      imageUrl,
      fileName: finalFileName,
      isDuplicate
    });

  } catch (error) {
    console.error('笶・逕ｻ蜒上い繝・・繝ｭ繝ｼ繝峨お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '逕ｻ蜒上・繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆'
    });
  }
});

// URI證怜捷蛹夜未謨ｰ
/*
function encryptUri(fileName: string): string {
  console.log('柏 證怜捷蛹夜幕蟋・', { fileName });
  const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key';
  console.log('柏 證怜捷蛹悶く繝ｼ:', { secretLength: secret.length, secretPrefix: secret.substring(0, 10) + '...' });
  
  const cipher = crypto.createCipher('aes-256-cbc', secret);
  let encrypted = cipher.update(fileName, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  console.log('柏 證怜捷蛹門ｮ御ｺ・', { 
    originalFileName: fileName, 
    encryptedFileName: encrypted,
    encryptedLength: encrypted.length 
  });
  
  return encrypted;
}
*/

// URI蠕ｩ蜿ｷ蛹夜未謨ｰ
/*
function decryptUri(encryptedFileName: string): string {
  const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key';
  const decipher = crypto.createDecipher('aes-256-cbc', secret);
  let decrypted = decipher.update(encryptedFileName, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
*/

// 逕ｻ蜒城・菫｡繧ｨ繝ｳ繝峨・繧､繝ｳ繝茨ｼ・nowledge-base縺九ｉ逶ｴ謗･驟堺ｿ｡・・
router.get('/image/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    // 縺ｾ縺・emergency-flows 繝・ぅ繝ｬ繧ｯ繝医Μ繧堤｢ｺ隱・
    let uploadDir = path.join(__dirname, '../../knowledge-base/images/emergency-flows');
    let filePath = path.join(uploadDir, fileName);
    
    // emergency-flows 縺ｫ繝輔ぃ繧､繝ｫ縺後↑縺・ｴ蜷医・ chat-exports 繧堤｢ｺ隱・
    if (!fs.existsSync(filePath)) {
      uploadDir = path.join(__dirname, '../../knowledge-base/images/chat-exports');
      filePath = path.join(uploadDir, fileName);
      
      console.log('売 emergency-flows 縺ｫ繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｉ縺ｪ縺・◆繧√…hat-exports 繧堤｢ｺ隱・', {
        fileName,
        chatExportsDir: uploadDir,
        chatExportsPath: filePath,
        exists: fs.existsSync(filePath)
      });
    }

    // 繝・ヰ繝・げ繝ｭ繧ｰ蠑ｷ蛹・
    console.log('名・・逕ｻ蜒上Μ繧ｯ繧ｨ繧ｹ繝・', {
      fileName,
      uploadDir,
      filePath,
      exists: fs.existsSync(filePath),
      filesInDir: fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : []
    });

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: '繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺励∪縺帙ｓ',
        fileName,
        emergencyFlowsPath: path.join(__dirname, '../../knowledge-base/images/emergency-flows', fileName),
        chatExportsPath: path.join(__dirname, '../../knowledge-base/images/chat-exports', fileName),
        emergencyFlowsDir: fs.existsSync(path.join(__dirname, '../../knowledge-base/images/emergency-flows')) ? fs.readdirSync(path.join(__dirname, '../../knowledge-base/images/emergency-flows')) : [],
        chatExportsDir: fs.existsSync(path.join(__dirname, '../../knowledge-base/images/chat-exports')) ? fs.readdirSync(path.join(__dirname, '../../knowledge-base/images/chat-exports')) : []
      });
    }

    // 繝輔ぃ繧､繝ｫ縺ｮMIME繧ｿ繧､繝励ｒ蛻､螳・
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // 繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ繧薙〒繝ｬ繧ｹ繝昴Φ繧ｹ
    const fileBuffer = fs.readFileSync(filePath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1蟷ｴ髢薙く繝｣繝・す繝･
    res.send(fileBuffer);

    console.log('笨・逕ｻ蜒城・菫｡謌仙粥:', {
      fileName,
      contentType,
      fileSize: fileBuffer.length,
      filePath,
      sourceDir: uploadDir.includes('emergency-flows') ? 'emergency-flows' : 'chat-exports'
    });

  } catch (error) {
    console.error('笶・逕ｻ蜒城・菫｡繧ｨ繝ｩ繝ｼ:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fileName: req.params.fileName
    });
    res.status(500).json({
      success: false,
      error: '逕ｻ蜒上・驟堺ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆'
    });
  }
});

// 繝輔ぃ繧､繝ｫ縺ｮ繝上ャ繧ｷ繝･繧定ｨ育ｮ励☆繧矩未謨ｰ
function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

// 譌｢蟄倥・逕ｻ蜒上ヵ繧｡繧､繝ｫ縺九ｉ蜷後§繝上ャ繧ｷ繝･縺ｮ繝輔ぃ繧､繝ｫ繧呈爾縺咎未謨ｰ
function findExistingImageByHash(uploadDir: string, fileHash: string): string | null {
  try {
    const files = fs.readdirSync(uploadDir);
    for (const file of files) {
      if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.gif') || file.endsWith('.webp')) {
        const filePath = path.join(uploadDir, file);
        const fileBuffer = fs.readFileSync(filePath);
        const existingHash = calculateFileHash(fileBuffer);
        
        if (existingHash === fileHash) {
          console.log(`売 蜷後§繝上ャ繧ｷ繝･縺ｮ逕ｻ蜒上ｒ逋ｺ隕・ ${file}`);
          return file;
        }
      }
    }
  } catch (error) {
    console.error('譌｢蟄倥ヵ繧｡繧､繝ｫ讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
  }
  return null;
}

// 繝輔Ο繝ｼ蜿門ｾ励お繝ｳ繝峨・繧､繝ｳ繝茨ｼ・:id・・
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`売 繝輔Ο繝ｼ蜿門ｾ鈴幕蟋・ ID=${id}`);

    const troubleshootingDir = path.join(__dirname, '../../knowledge-base/troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      console.log(`笶・繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺励∪縺帙ｓ: ${filePath}`);
      return res.status(404).json({ error: '繝輔Ο繝ｼ繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    console.log(`笨・繝輔Ο繝ｼ蜿門ｾ玲・蜉・`, {
      id: data.id,
      title: data.title,
      stepsCount: data.steps?.length || 0
    });

    res.json(data);

  } catch (error) {
    console.error('笶・繝輔Ο繝ｼ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '繝輔Ο繝ｼ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// 繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ繝溘ラ繝ｫ繧ｦ繧ｧ繧｢
router.use((err: any, req: any, res: any, next: any) => {
  console.error('蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧ｨ繝ｩ繝ｼ:', err);
  
  // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
  res.setHeader('Content-Type', 'application/json');
  
  res.status(500).json({
    success: false,
    error: '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺ｮ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
    details: err.message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
});

// 404繝上Φ繝峨Μ繝ｳ繧ｰ
router.use('*', (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺ｮ繧ｨ繝ｳ繝峨・繧､繝ｳ繝医′隕九▽縺九ｊ縺ｾ縺帙ｓ',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

export default router;