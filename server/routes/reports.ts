import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// JSON繝輔ぃ繧､繝ｫ繧呈峩譁ｰ縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.post('/update', async (req, res) => {
  try {
    console.log('=== /api/reports/update 繧ｨ繝ｳ繝峨・繧､繝ｳ繝医′蜻ｼ縺ｳ蜃ｺ縺輔ｌ縺ｾ縺励◆ ===');
    console.log('繝ｪ繧ｯ繧ｨ繧ｹ繝医・繝・ぅ:', req.body);
    
    const { chatId, diffData } = req.body;
    
    if (!chatId || !diffData) {
      console.log('繝代Λ繝｡繝ｼ繧ｿ荳崎ｶｳ:', { chatId, diffData });
      return res.status(400).json({ error: 'chatId 縺ｨ diffData 縺悟ｿ・ｦ√〒縺・ });
    }
    
    console.log('讀懃ｴ｢縺吶ｋchatId:', chatId);
    
    // knowledge-base/exports 繝輔か繝ｫ繝蜀・・JSON繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    const exportsDir = path.join(__dirname, '../../knowledge-base/exports');
    console.log('讀懃ｴ｢繝・ぅ繝ｬ繧ｯ繝医Μ:', exportsDir);
    
    const files = await fs.readdir(exportsDir);
    console.log('繝・ぅ繝ｬ繧ｯ繝医Μ蜀・・繝輔ぃ繧､繝ｫ:', files);
    
    // chatId繧貞性繧JSON繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    const targetFile = files.find(file => 
      file.includes(chatId) && file.endsWith('.json')
    );
    
    console.log('隕九▽縺九▲縺溘ヵ繧｡繧､繝ｫ:', targetFile);
    
    if (!targetFile) {
      console.log('蟇ｾ雎｡縺ｮJSON繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
      return res.status(404).json({ error: '蟇ｾ雎｡縺ｮJSON繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
    }
    
    const filePath = path.join(exportsDir, targetFile);
    console.log('繝輔ぃ繧､繝ｫ繝代せ:', filePath);
    
    // 譌｢蟄倥・JSON繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ縺ｿ
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    console.log('譌｢蟄倥ョ繝ｼ繧ｿ縺ｮ繧ｭ繝ｼ:', Object.keys(jsonData));
    
    // 蟾ｮ蛻・ョ繝ｼ繧ｿ縺ｧ譖ｴ譁ｰ
    const updatedData = {
      ...jsonData,
      ...diffData
    };
    
    console.log('譖ｴ譁ｰ蠕後・繝・・繧ｿ繧ｭ繝ｼ:', Object.keys(updatedData));
    
    // 譖ｴ譁ｰ縺輔ｌ縺櫟SON繝輔ぃ繧､繝ｫ繧剃ｿ晏ｭ・
    await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2), 'utf-8');
    
    console.log(`JSON繝輔ぃ繧､繝ｫ縺梧峩譁ｰ縺輔ｌ縺ｾ縺励◆: ${targetFile}`);
    
    res.json({ 
      success: true, 
      message: 'JSON繝輔ぃ繧､繝ｫ縺梧峩譁ｰ縺輔ｌ縺ｾ縺励◆',
      updatedFile: targetFile
    });
    
  } catch (error) {
    console.error('JSON繝輔ぃ繧､繝ｫ譖ｴ譁ｰ繧ｨ繝ｩ繝ｼ:', error);
    console.error('繧ｨ繝ｩ繝ｼ繧ｹ繧ｿ繝・け:', error.stack);
    res.status(500).json({ 
      error: 'JSON繝輔ぃ繧､繝ｫ縺ｮ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
