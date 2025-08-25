import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { knowledgeBase } from '../knowledge-base-service.js';

const router = Router();

// 菫晏ｮ郁ｨ倬鹸縺ｮ菫晏ｭ倥お繝ｳ繝峨・繧､繝ｳ繝・
router.post('/save', async (req, res) => {
  try {
    const maintenanceRecord = req.body;
    
    // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    if (!maintenanceRecord.metadata?.recordId) {
      return res.status(400).json({ error: '繝ｬ繧ｳ繝ｼ繝迂D縺悟ｿ・ｦ√〒縺・ });
    }
    
    if (!maintenanceRecord.occurrence?.event) {
      return res.status(400).json({ error: '逋ｺ逕滉ｺ玖ｱ｡縺悟ｿ・ｦ√〒縺・ });
    }
    
    // 繝輔ぃ繧､繝ｫ蜷阪・逕滓・
    const now = new Date();
    const dateString = now.toISOString().slice(0, 10).replace(/-/g, '');
    const eventName = maintenanceRecord.occurrence.event
      .replace(/[\\/:*?"<>|]/g, '_')
      .substring(0, 50);
    const fileName = `maintenance_${dateString}_${eventName}_${maintenanceRecord.metadata.recordId}.json`;
    
    // vehicle-maintenance繝輔か繝ｫ繝縺ｫ菫晏ｭ・
    const filePath = `vehicle-maintenance/${fileName}`;
    
    // JSON繝・・繧ｿ繧呈紛蠖｢縺励※菫晏ｭ・
    const jsonString = JSON.stringify(maintenanceRecord, null, 2);
    await knowledgeBase.writeFile(filePath, jsonString);
    
    console.log(`菫晏ｮ郁ｨ倬鹸繧剃ｿ晏ｭ倥＠縺ｾ縺励◆: ${filePath}`);
    
    res.json({
      success: true,
      message: '菫晏ｮ郁ｨ倬鹸縺梧ｭ｣蟶ｸ縺ｫ菫晏ｭ倥＆繧後∪縺励◆',
      fileName: fileName,
      filePath: filePath,
      recordId: maintenanceRecord.metadata.recordId
    });
    
  } catch (error) {
    console.error('菫晏ｮ郁ｨ倬鹸菫晏ｭ倥お繝ｩ繝ｼ:', error);
    res.status(500).json({ 
      error: '菫晏ｭ倅ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 菫晏ｮ郁ｨ倬鹸縺ｮ荳隕ｧ蜿門ｾ励お繝ｳ繝峨・繧､繝ｳ繝・
router.get('/list', async (req, res) => {
  try {
    // maintenance-reports繝輔か繝ｫ繝蜀・・繝輔ぃ繧､繝ｫ繧貞叙蠕・
    const files = await knowledgeBase.listFiles('maintenance-reports');
    const maintenanceFiles = files.filter(file => 
      file.endsWith('.json') && file.includes('maintenance_')
    );
    
    const records = [];
    
    for (const file of maintenanceFiles) {
      try {
        const content = await knowledgeBase.readFile(`maintenance-reports/${file}`);
        const record = JSON.parse(content);
        
        records.push({
          fileName: file,
          recordId: record.metadata?.recordId,
          event: record.occurrence?.event,
          vehicleType: record.occurrence?.vehicle?.type,
          createdAt: record.metadata?.createdAt,
          recorder: record.notes?.recorder
        });
      } catch (error) {
        console.error(`繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ: ${file}`, error);
      }
    }
    
    // 菴懈・譌･譎ゅ・髯埼・〒繧ｽ繝ｼ繝・
    records.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    res.json({
      success: true,
      records: records,
      total: records.length
    });
    
  } catch (error) {
    console.error('菫晏ｮ郁ｨ倬鹸荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({ 
      error: '荳隕ｧ蜿門ｾ嶺ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 迚ｹ螳壹・菫晏ｮ郁ｨ倬鹸縺ｮ蜿門ｾ励お繝ｳ繝峨・繧､繝ｳ繝・
router.get('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    
    // 繝輔ぃ繧､繝ｫ荳隕ｧ繧貞叙蠕励＠縺ｦ繝ｬ繧ｳ繝ｼ繝迂D縺ｧ繝槭ャ繝√Φ繧ｰ
    const files = await knowledgeBase.listFiles('maintenance-reports');
    const targetFile = files.find(file => file.includes(recordId));
    
    if (!targetFile) {
      return res.status(404).json({ error: '謖・ｮ壹＆繧後◆繝ｬ繧ｳ繝ｼ繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ' });
    }
    
    const content = await knowledgeBase.readFile(`maintenance-reports/${targetFile}`);
    const record = JSON.parse(content);
    
    res.json({
      success: true,
      record: record,
      fileName: targetFile
    });
    
  } catch (error) {
    console.error('菫晏ｮ郁ｨ倬鹸蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({ 
      error: '險倬鹸蜿門ｾ嶺ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 菫晏ｮ郁ｨ倬鹸縺ｮ蜑企勁繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.delete('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    
    // 繝輔ぃ繧､繝ｫ荳隕ｧ繧貞叙蠕励＠縺ｦ繝ｬ繧ｳ繝ｼ繝迂D縺ｧ繝槭ャ繝√Φ繧ｰ
    const files = await knowledgeBase.listFiles('maintenance-reports');
    const targetFile = files.find(file => file.includes(recordId));
    
    if (!targetFile) {
      return res.status(404).json({ error: '謖・ｮ壹＆繧後◆繝ｬ繧ｳ繝ｼ繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ' });
    }
    
    await knowledgeBase.deleteFile(`maintenance-reports/${targetFile}`);
    
    console.log(`菫晏ｮ郁ｨ倬鹸繧貞炎髯､縺励∪縺励◆: ${targetFile}`);
    
    res.json({
      success: true,
      message: '菫晏ｮ郁ｨ倬鹸縺梧ｭ｣蟶ｸ縺ｫ蜑企勁縺輔ｌ縺ｾ縺励◆',
      fileName: targetFile
    });
    
  } catch (error) {
    console.error('菫晏ｮ郁ｨ倬鹸蜑企勁繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({ 
      error: '蜑企勁荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
