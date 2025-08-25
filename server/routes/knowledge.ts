import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * GET /api/knowledge
 * knowledge-base/data繝輔か繝ｫ繝縺ｮJSON繝輔ぃ繧､繝ｫ荳隕ｧ繧貞叙蠕・
 */
router.get('/', async (req, res) => {
  try {
    console.log('答 繝翫Ξ繝・ず繝吶・繧ｹ繝・・繧ｿ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・);
    
    // knowledge-base/data繝輔か繝ｫ繝縺ｮ繝代せ繧定ｨｭ螳・
    const dataPath = path.join(process.cwd(), 'knowledge-base', 'data');
    
    // 繝輔か繝ｫ繝縺悟ｭ伜惠縺吶ｋ縺狗｢ｺ隱・
    if (!fs.existsSync(dataPath)) {
      console.log('刀 knowledge-base/data/繝輔か繝ｫ繝縺悟ｭ伜惠縺励∪縺帙ｓ');
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'knowledge-base/data/繝輔か繝ｫ繝縺悟ｭ伜惠縺励∪縺帙ｓ'
      });
    }
    
    // 繝輔か繝ｫ繝蜀・・繝輔ぃ繧､繝ｫ荳隕ｧ繧貞叙蠕・
    const files = fs.readdirSync(dataPath);
    
    // JSON繝輔ぃ繧､繝ｫ縺ｮ縺ｿ繧偵ヵ繧｣繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
    const jsonFiles = files.filter(file => {
      const filePath = path.join(dataPath, file);
      const stats = fs.statSync(filePath);
      return stats.isFile() && file.toLowerCase().endsWith('.json');
    });
    
    // 繝輔ぃ繧､繝ｫ諠・ｱ繧貞叙蠕・
    const fileList = jsonFiles.map(file => {
      const filePath = path.join(dataPath, file);
      const stats = fs.statSync(filePath);
      
      return {
        filename: file,
        name: path.parse(file).name,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        path: `/knowledge-base/data/${file}`
      };
    });
    
    console.log(`笨・繝翫Ξ繝・ず繝吶・繧ｹ繝・・繧ｿ蜿門ｾ怜ｮ御ｺ・ ${fileList.length}莉ｶ`);
    
    res.json({
      success: true,
      data: fileList,
      total: fileList.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('笶・繝翫Ξ繝・ず繝吶・繧ｹ繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繝翫Ξ繝・ず繝吶・繧ｹ繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/knowledge/:filename
 * 迚ｹ螳壹・JSON繝輔ぃ繧､繝ｫ縺ｮ蜀・ｮｹ繧貞叙蠕・
 */
router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    console.log(`答 繝翫Ξ繝・ず繝吶・繧ｹ繝輔ぃ繧､繝ｫ蜿門ｾ・ ${filename}`);
    
    // 繝輔ぃ繧､繝ｫ繝代せ繧呈ｧ狗ｯ・
    const filePath = path.join(process.cwd(), 'knowledge-base', 'data', filename);
    
    // 繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺吶ｋ縺狗｢ｺ隱・
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }
    
    // JSON繝輔ぃ繧､繝ｫ縺九←縺・°遒ｺ隱・
    if (!filename.toLowerCase().endsWith('.json')) {
      return res.status(400).json({
        success: false,
        error: 'JSON繝輔ぃ繧､繝ｫ縺ｮ縺ｿ蜿門ｾ怜庄閭ｽ縺ｧ縺・
      });
    }
    
    // 繝輔ぃ繧､繝ｫ蜀・ｮｹ繧定ｪｭ縺ｿ霎ｼ縺ｿ
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    
    console.log('笨・繝翫Ξ繝・ず繝吶・繧ｹ繝輔ぃ繧､繝ｫ蜿門ｾ怜ｮ御ｺ・);
    
    res.json({
      success: true,
      data: jsonData,
      filename: filename,
      size: fileContent.length
    });
    
  } catch (error) {
    console.error('笶・繝翫Ξ繝・ず繝吶・繧ｹ繝輔ぃ繧､繝ｫ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繝翫Ξ繝・ず繝吶・繧ｹ繝輔ぃ繧､繝ｫ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as knowledgeRouter }; 