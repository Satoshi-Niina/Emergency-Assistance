
import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { existsSync, readdirSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ繝代せ
const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');

// 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ繧髢｢謨ｰ
async function loadTroubleshootingData() {
  try {
    console.log('剥 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ繝代せ:', troubleshootingDir);
    console.log('剥 迴ｾ蝨ｨ縺ｮ菴懈･ｭ繝・ぅ繝ｬ繧ｯ繝医Μ:', process.cwd());
    console.log('剥 邨ｶ蟇ｾ繝代せ:', path.resolve(troubleshootingDir));
    
    if (!existsSync(troubleshootingDir)) {
      console.warn(`笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ: ${troubleshootingDir}`);
      console.warn(`剥 莉｣譖ｿ繝代せ繧定ｩｦ陦御ｸｭ...`);
      
      // 莉｣譖ｿ繝代せ繧定ｩｦ陦・
      const alternativePaths = [
        path.join(process.cwd(), 'knowledge-base', 'troubleshooting'),
        path.join(__dirname, '..', '..', 'knowledge-base', 'troubleshooting'),
        path.join(__dirname, '..', 'knowledge-base', 'troubleshooting')
      ];
      
      for (const altPath of alternativePaths) {
        console.log(`剥 莉｣譖ｿ繝代せ繧偵メ繧ｧ繝・け荳ｭ: ${altPath}`);
        if (existsSync(altPath)) {
          console.log(`笨・莉｣譖ｿ繝代せ縺瑚ｦ九▽縺九ｊ縺ｾ縺励◆: ${altPath}`);
          const files = readdirSync(altPath);
          console.log(`刀 繝・ぅ繝ｬ繧ｯ繝医Μ蜀・・繝輔ぃ繧､繝ｫ:`, files);
          return await loadFromDirectory(altPath);
        }
      }
      
      console.error(`笶・縺ｩ縺ｮ繝代せ縺ｧ繧ゅョ繧｣繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆`);
      return [];
    }

    return await loadFromDirectory(troubleshootingDir);
  } catch (error) {
    console.error('笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・・繧ｿ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', error);
    return [];
  }
}

// 謖・ｮ壹＆繧後◆繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ繧髢｢謨ｰ
async function loadFromDirectory(dirPath: string) {
  try {
    console.log(`刀 繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ: ${dirPath}`);
    const files = readdirSync(dirPath);
    console.log('刀 繝・ぅ繝ｬ繧ｯ繝医Μ蜀・・繝輔ぃ繧､繝ｫ:', files);
    
    const jsonFiles = files.filter(file => {
      const isJson = file.endsWith('.json');
      const isNotBackup = !file.includes('.backup');
      const isNotTmp = !file.includes('.tmp');
      console.log(`塘 繝輔ぃ繧､繝ｫ ${file}: JSON=${isJson}, 繝舌ャ繧ｯ繧｢繝・・=${!isNotBackup}, 荳譎・${!isNotTmp}`);
      return isJson && isNotBackup && isNotTmp;
    });
    
    console.log('塘 蜃ｦ逅・ｯｾ雎｡縺ｮJSON繝輔ぃ繧､繝ｫ:', jsonFiles);

    const fileList = await Promise.all(jsonFiles.map(async (file) => {
      try {
        const filePath = path.join(dirPath, file);
        console.log(`剥 繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ: ${filePath}`);
        
        const content = await fs.readFile(filePath, 'utf8');
        console.log(`塘 繝輔ぃ繧､繝ｫ ${file} 縺ｮ繧ｵ繧､繧ｺ: ${content.length} 譁・ｭ輿);
        
        const data = JSON.parse(content);
        console.log(`笨・繝輔ぃ繧､繝ｫ ${file} 縺ｮJSON隗｣譫先・蜉・`, {
          id: data.id,
          title: data.title,
          hasDescription: !!data.description,
          hasSteps: !!(data.steps && data.steps.length > 0)
        });
        
        let description = data.description || '';
        if (!description && data.steps && data.steps.length > 0) {
          const firstStep = data.steps[0];
          description = firstStep.description || firstStep.message || '';
        }

        const result = {
          id: data.id || file.replace('.json', ''),
          title: data.title || '繧ｿ繧､繝医Ν縺ｪ縺・,
          description: description,
          fileName: file,
          filePath: `knowledge-base/troubleshooting/${file}`,
          createdAt: data.createdAt || data.savedAt || data.updatedAt || new Date().toISOString(),
          category: data.category || '',
          triggerKeywords: data.triggerKeywords || [],
          steps: data.steps || []
        };
        
        console.log(`笨・繝輔ぃ繧､繝ｫ ${file} 縺ｮ蜃ｦ逅・ｮ御ｺ・`, result);
        return result;
      } catch (error) {
        console.error(`笶・繝輔ぃ繧､繝ｫ ${file} 縺ｮ隗｣譫蝉ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:`, error);
        console.error(`剥 繧ｨ繝ｩ繝ｼ縺ｮ隧ｳ邏ｰ:`, {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        return null;
      }
    }));

    const validFiles = fileList.filter(Boolean);
    console.log(`搭 譛牙柑縺ｪ繝輔ぃ繧､繝ｫ謨ｰ: ${validFiles.length}/${jsonFiles.length}`);
    
    return validFiles;
  } catch (error) {
    console.error(`笶・繝・ぅ繝ｬ繧ｯ繝医Μ ${dirPath} 縺九ｉ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:`, error);
    return [];
  }
}

// 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ荳隕ｧ蜿門ｾ・
router.get('/list', async (req, res) => {
  console.log('搭 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ荳隕ｧ繝ｪ繧ｯ繧ｨ繧ｹ繝亥女菫｡');
  try {
    const data = await loadTroubleshootingData();
    console.log(`笨・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ荳隕ｧ蜿門ｾ怜ｮ御ｺ・ ${data.length}莉ｶ`);
    
    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      data: data,
      total: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({ 
      success: false,
      error: '繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 迚ｹ螳壹・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ蜿門ｾ・
router.get('/:id', async (req, res) => {
  console.log('搭 迚ｹ螳壹・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ蜿門ｾ鈴幕蟋・', req.params.id);
  try {
    const { id } = req.params;
    
    // 繧ｭ繝｣繝・す繝･蛻ｶ蠕｡繝倥ャ繝繝ｼ繧定ｨｭ螳・
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${timestamp}-${randomId}"`,
      'X-Accel-Expires': '0',
      'X-Requested-With': 'XMLHttpRequest'
    });
    
    console.log('剥 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ遒ｺ隱・', troubleshootingDir);
    
    // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ隧ｲ蠖薙☆繧徽SON繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    if (!existsSync(troubleshootingDir)) {
      console.error('笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ:', troubleshootingDir);
      return res.status(404).json({ 
        success: false,
        error: '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ',
        id,
        timestamp: new Date().toISOString()
      });
    }
    
    const files = readdirSync(troubleshootingDir);
    console.log('刀 繝・ぅ繝ｬ繧ｯ繝医Μ蜀・・繝輔ぃ繧､繝ｫ:', files);
    
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    console.log('塘 JSON繝輔ぃ繧､繝ｫ:', jsonFiles);
    
    let flowData = null;
    let fileName = null;
    
    // ID縺ｫ荳閾ｴ縺吶ｋ繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    for (const file of jsonFiles) {
      try {
        console.log(`剥 繝輔ぃ繧､繝ｫ ${file} 繧偵メ繧ｧ繝・け荳ｭ...`);
        const filePath = path.join(troubleshootingDir, file);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        console.log(`搭 繝輔ぃ繧､繝ｫ ${file} 縺ｮ蜀・ｮｹ:`, {
          fileId: data.id,
          requestId: id,
          idsMatch: data.id === id,
          fileNameMatch: file.replace('.json', '') === id
        });
        
        if (data.id === id || file.replace('.json', '') === id) {
          flowData = data;
          fileName = file;
          console.log(`笨・繝槭ャ繝√☆繧九ヵ繧｡繧､繝ｫ繧堤匱隕・ ${file}`);
          break;
        }
      } catch (error) {
        console.error(`笶・繝輔ぃ繧､繝ｫ ${file} 縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:`, error);
      }
    }
    
    if (!flowData) {
      console.error('笶・繝槭ャ繝√☆繧九ヵ繧｡繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ:', id);
      return res.status(404).json({ 
        success: false,
        error: '繧｢繧､繝・Β縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ',
        id,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`笨・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ蜿門ｾ怜ｮ御ｺ・`, {
      id: flowData.id,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0,
      fileName: fileName,
      hasSteps: !!flowData.steps,
      stepsType: typeof flowData.steps,
      stepsIsArray: Array.isArray(flowData.steps),
      flowDataKeys: Object.keys(flowData)
    });
    
    // 繝・・繧ｿ讒矩縺ｮ隧ｳ邏ｰ繝ｭ繧ｰ
    if (flowData.steps && Array.isArray(flowData.steps)) {
      console.log('搭 繧ｹ繝・ャ繝励ョ繝ｼ繧ｿ隧ｳ邏ｰ:', {
        totalSteps: flowData.steps.length,
        stepIds: flowData.steps.map((step: any, index: number) => ({
          index,
          id: step.id,
          title: step.title,
          hasImages: !!step.images,
          imagesCount: step.images?.length || 0
        }))
      });
    } else {
      console.warn('笞・・繧ｹ繝・ャ繝励ョ繝ｼ繧ｿ縺悟ｭ伜惠縺励↑縺・°縲・・蛻励〒縺ｯ縺ゅｊ縺ｾ縺帙ｓ:', {
        steps: flowData.steps,
        stepsType: typeof flowData.steps
      });
    }
    
    res.setHeader('Content-Type', 'application/json');
    const responseData = {
      success: true,
      data: flowData,
      timestamp: new Date().toISOString()
    };
    
    console.log('豆 繝ｬ繧ｹ繝昴Φ繧ｹ騾∽ｿ｡:', {
      success: responseData.success,
      dataId: responseData.data.id,
      dataStepsCount: responseData.data.steps?.length || 0
    });
    
    res.json(responseData);
  } catch (error) {
    console.error('笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({ 
      success: false,
      error: '繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ譖ｴ譁ｰ
router.put('/:id', async (req, res) => {
  console.log('統 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ譖ｴ譁ｰ:', req.params.id);
  try {
    const { id } = req.params;
    const flowData = req.body;
    
    // 蠢・医ヵ繧｣繝ｼ繝ｫ繝峨・讀懆ｨｼ
    if (!flowData.title) {
      return res.status(400).json({
        success: false,
        error: '繧ｿ繧､繝医Ν縺ｯ蠢・医〒縺・
      });
    }

    // 繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励ｒ譖ｴ譁ｰ
    flowData.updatedAt = new Date().toISOString();
    flowData.id = id; // ID繧堤｢ｺ螳溘↓險ｭ螳・

    // 繝輔ぃ繧､繝ｫ繝代せ繧呈ｧ狗ｯ・
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    // 繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ・
    writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf8');
    
    console.log('笨・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ譖ｴ譁ｰ謌仙粥:', {
      id: flowData.id,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0
    });

    res.json({
      success: true,
      data: flowData,
      message: '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ縺梧ｭ｣蟶ｸ縺ｫ譖ｴ譁ｰ縺輔ｌ縺ｾ縺励◆'
    });
  } catch (error) {
    console.error('笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ譖ｴ譁ｰ繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({ 
      success: false,
      error: '繝・・繧ｿ縺ｮ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ蜑企勁
router.delete('/:id', async (req, res) => {
  console.log('卵・・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ蜑企勁:', req.params.id);
  try {
    const { id } = req.params;
    
    // 繝輔ぃ繧､繝ｫ繝代せ繧呈ｧ狗ｯ・
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    // 繝輔ぃ繧､繝ｫ縺ｮ蟄伜惠遒ｺ隱・
    if (!existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '謖・ｮ壹＆繧後◆繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ',
        id
      });
    }

    // 繝輔ぃ繧､繝ｫ繧貞炎髯､
    unlinkSync(filePath);
    
    console.log('笨・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ蜑企勁謌仙粥:', id);

    res.json({
      success: true,
      message: '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ縺梧ｭ｣蟶ｸ縺ｫ蜑企勁縺輔ｌ縺ｾ縺励◆',
      id
    });
  } catch (error) {
    console.error('笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({ 
      success: false,
      error: '繝・・繧ｿ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ繝溘ラ繝ｫ繧ｦ繧ｧ繧｢
router.use((err: any, req: any, res: any, next: any) => {
  console.error('繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繧ｨ繝ｩ繝ｼ:', err);
  
  // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
  res.setHeader('Content-Type', 'application/json');
  
  res.status(500).json({
    success: false,
    error: '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ縺ｮ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
    details: err.message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
});

// 逕ｻ蜒城・菫｡繧ｨ繝ｳ繝峨・繧､繝ｳ繝茨ｼ・nowledge-base縺九ｉ逶ｴ謗･驟堺ｿ｡・・
router.get('/image/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    // 縺ｾ縺・emergency-flows 繝・ぅ繝ｬ繧ｯ繝医Μ繧堤｢ｺ隱・
    let uploadDir = path.join(process.cwd(), '..', 'knowledge-base', 'images', 'emergency-flows');
    let filePath = path.join(uploadDir, fileName);
    
    // emergency-flows 縺ｫ繝輔ぃ繧､繝ｫ縺後↑縺・ｴ蜷医・ chat-exports 繧堤｢ｺ隱・
    if (!existsSync(filePath)) {
      uploadDir = path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports');
      filePath = path.join(uploadDir, fileName);
      
      console.log('売 emergency-flows 縺ｫ繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｉ縺ｪ縺・◆繧√…hat-exports 繧堤｢ｺ隱・', {
        fileName,
        chatExportsDir: uploadDir,
        chatExportsPath: filePath,
        exists: existsSync(filePath)
      });
    }

    // 繝・ヰ繝・げ繝ｭ繧ｰ蠑ｷ蛹・
    console.log('名・・逕ｻ蜒上Μ繧ｯ繧ｨ繧ｹ繝・', {
      fileName,
      uploadDir,
      filePath,
      exists: existsSync(filePath),
      filesInDir: existsSync(uploadDir) ? readdirSync(uploadDir) : []
    });

    if (!existsSync(filePath)) {
      return res.status(404).json({
        error: '繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺励∪縺帙ｓ',
        fileName,
        emergencyFlowsPath: path.join(process.cwd(), '..', 'knowledge-base', 'images', 'emergency-flows', fileName),
        chatExportsPath: path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports', fileName),
        emergencyFlowsDir: existsSync(path.join(process.cwd(), '..', 'knowledge-base', 'images', 'emergency-flows')) ? readdirSync(path.join(process.cwd(), '..', 'knowledge-base', 'images', 'emergency-flows')) : [],
        chatExportsDir: existsSync(path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports')) ? readdirSync(path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports')) : []
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
    const fileBuffer = readFileSync(filePath);
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

// 404繝上Φ繝峨Μ繝ｳ繧ｰ
router.use('*', (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ縺ｮ繧ｨ繝ｳ繝峨・繧､繝ｳ繝医′隕九▽縺九ｊ縺ｾ縺帙ｓ',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

export default router;
