import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝・
const createFlowSchema = {
  title: (value: string) => value && value.length > 0 ? null : '繧ｿ繧､繝医Ν縺ｯ蠢・医〒縺・,
  jsonData: (value: any) => null // 繧ｪ繝励す繝ｧ繝翫Ν
};

/**
 * GET /api/flows
 * 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ荳隕ｧ繧貞叙蠕・
 */
router.get('/', async (req, res) => {
  try {
    console.log('売 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・);
    
    // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉJSON繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ縺ｿ
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    console.log('剥 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ:', troubleshootingDir);
    
    if (!fs.existsSync(troubleshootingDir)) {
      console.log('笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励∪縺帙ｓ');
      return res.json({
        success: true,
        flows: [],
        total: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    const files = fs.readdirSync(troubleshootingDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    console.log('塘 JSON繝輔ぃ繧､繝ｫ:', jsonFiles);
    
    const flows = [];
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(troubleshootingDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const flowData = JSON.parse(fileContent);
        
        // 繝輔Ο繝ｼ繝・・繧ｿ繧呈紛蠖｢
        const flow = {
          id: flowData.id || file.replace('.json', ''),
          title: flowData.title || '繧ｿ繧､繝医Ν縺ｪ縺・,
          description: flowData.description || '',
          fileName: file,
          filePath: `knowledge-base/troubleshooting/${file}`,
          createdAt: flowData.createdAt || new Date().toISOString(),
          updatedAt: flowData.updatedAt || new Date().toISOString(),
          triggerKeywords: flowData.triggerKeywords || flowData.trigger || [],
          category: flowData.category || '',
          steps: flowData.steps || [],
          dataSource: 'file'
        };
        
        flows.push(flow);
      } catch (error) {
        console.error(`笶・繝輔ぃ繧､繝ｫ ${file} 縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:`, error);
      }
    }
    
    // 菴懈・譌･譎ゅ〒繧ｽ繝ｼ繝・
    flows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    console.log(`笨・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ蜿門ｾ怜ｮ御ｺ・ ${flows.length}莉ｶ`);

    res.json({
      success: true,
      flows: flows,
      total: flows.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('笶・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/flows
 * 譁ｰ隕丞ｿ懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧剃ｽ懈・
 */
router.post('/', async (req, res) => {
  try {
    console.log('売 譁ｰ隕丞ｿ懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ菴懈・繝ｪ繧ｯ繧ｨ繧ｹ繝・);
    
    // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ繝代せ繧貞叙蠕・
    const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingDir)) {
      fs.mkdirSync(troubleshootingDir, { recursive: true });
    }
    
    // 譁ｰ縺励＞ID繧堤函謌・
    const newId = `flow_${Date.now()}`;
    const fileName = `${newId}.json`;
    const filePath = path.join(troubleshootingDir, fileName);
    
    // 譁ｰ隕上ヵ繝ｭ繝ｼ繝・・繧ｿ繧剃ｽ懈・
    const newFlowData = {
      id: newId,
      title: req.body.title || '譁ｰ隕上ヵ繝ｭ繝ｼ',
      description: req.body.description || '',
      steps: req.body.steps || [],
      triggerKeywords: req.body.triggerKeywords || [],
      category: req.body.category || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dataSource: 'file',
      ...req.body
    };
    
    // JSON繝輔ぃ繧､繝ｫ繧剃ｽ懈・
    fs.writeFileSync(filePath, JSON.stringify(newFlowData, null, 2), 'utf-8');

    console.log('笨・譁ｰ隕丞ｿ懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ菴懈・螳御ｺ・', newId);

    res.status(201).json({
      success: true,
      data: newFlowData,
      message: '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺梧ｭ｣蟶ｸ縺ｫ菴懈・縺輔ｌ縺ｾ縺励◆'
    });

  } catch (error) {
    console.error('笶・譁ｰ隕丞ｿ懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ菴懈・繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺ｮ菴懈・縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/flows/:id
 * 迚ｹ螳壹・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧貞叙蠕・
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`売 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ隧ｳ邏ｰ蜿門ｾ・ ${id}`);

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
      return res.status(404).json({
        success: false,
        error: '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }

    console.log('笨・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ隧ｳ邏ｰ蜿門ｾ怜ｮ御ｺ・);

    res.json({
      success: true,
      data: {
        id: flowData.id,
        title: flowData.title || '繧ｿ繧､繝医Ν縺ｪ縺・,
        description: flowData.description || '',
        fileName: fileName,
        filePath: `knowledge-base/troubleshooting/${fileName}`,
        createdAt: flowData.createdAt || new Date().toISOString(),
        updatedAt: flowData.updatedAt || new Date().toISOString(),
        triggerKeywords: flowData.triggerKeywords || flowData.trigger || [],
        category: flowData.category || '',
        steps: flowData.steps || [],
        dataSource: 'file',
        ...flowData // 蜈・・繝・・繧ｿ繧ょ性繧√ｋ
      }
    });

  } catch (error) {
    console.error('笶・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ隧ｳ邏ｰ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺ｮ隧ｳ邏ｰ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/flows/:id
 * 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧呈峩譁ｰ
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`売 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ譖ｴ譁ｰ: ${id}`);
    
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
      return res.status(404).json({
        success: false,
        error: '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }

    // 譖ｴ譁ｰ繝・・繧ｿ繧呈ｺ門ｙ
    const updatedData = {
      ...flowData,
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    // JSON繝輔ぃ繧､繝ｫ繧呈峩譁ｰ
    const filePath = path.join(troubleshootingDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf-8');

    console.log('笨・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ譖ｴ譁ｰ螳御ｺ・);

    res.json({
      success: true,
      data: updatedData,
      message: '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺梧ｭ｣蟶ｸ縺ｫ譖ｴ譁ｰ縺輔ｌ縺ｾ縺励◆'
    });

  } catch (error) {
    console.error('笶・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ譖ｴ譁ｰ繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺ｮ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/flows/:id
 * 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧貞炎髯､
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`売 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ蜑企勁: ${id}`);

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
        error: '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }

    // JSON繝輔ぃ繧､繝ｫ繧貞炎髯､
    const filePath = path.join(troubleshootingDir, fileName);
    fs.unlinkSync(filePath);

    console.log('笨・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ蜑企勁螳御ｺ・);

    res.json({
      success: true,
      message: '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺梧ｭ｣蟶ｸ縺ｫ蜑企勁縺輔ｌ縺ｾ縺励◆',
      deletedId: id,
      deletedFile: fileName
    });

  } catch (error) {
    console.error('笶・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as flowsRouter }; 