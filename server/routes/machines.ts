import express from 'express';
import { db } from '../db/index.js';
import { machineTypes, machines } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// 讖溽ｨｮ荳隕ｧ蜿門ｾ輸PI・・api/machine-types・・
router.get('/machine-types', async (req, res) => {
  try {
    console.log('剥 讖溽ｨｮ荳隕ｧ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・);
    
    // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
    res.setHeader('Content-Type', 'application/json');
    
    // Drizzle ORM繧剃ｽｿ逕ｨ縺励※讖溽ｨｮ荳隕ｧ繧貞叙蠕・
    const result = await db.select({
      id: machineTypes.id,
      machine_type_name: machineTypes.machineTypeName
    }).from(machineTypes)
    .orderBy(machineTypes.machineTypeName);
    
    console.log(`笨・讖溽ｨｮ荳隕ｧ蜿門ｾ怜ｮ御ｺ・ ${result.length}莉ｶ`);
    
    res.json({
      success: true,
      data: result,
      total: result.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('笶・讖溽ｨｮ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '讖溽ｨｮ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 蜈ｨ讖滓｢ｰ繝・・繧ｿ蜿門ｾ輸PI・・api/all-machines・・
router.get('/all-machines', async (req, res) => {
  try {
    console.log('剥 蜈ｨ讖滓｢ｰ繝・・繧ｿ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・);
    
    // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
    res.setHeader('Content-Type', 'application/json');
    
    // Drizzle ORM繧剃ｽｿ逕ｨ縺励※蜈ｨ讖滓｢ｰ繝・・繧ｿ繧貞叙蠕・
    const result = await db.select({
      type_id: machineTypes.id,
      machine_type_name: machineTypes.machineTypeName,
      machine_id: machines.id,
      machine_number: machines.machineNumber
    }).from(machineTypes)
    .leftJoin(machines, eq(machineTypes.id, machines.machineTypeId))
    .orderBy(machineTypes.machineTypeName, machines.machineNumber);
    
    // 讖溽ｨｮ縺斐→縺ｫ繧ｰ繝ｫ繝ｼ繝怜喧
    const groupedData = result.reduce((acc: any, row: any) => {
      const typeName = row.machine_type_name;
      if (!acc[typeName]) {
        acc[typeName] = {
          type_id: row.type_id,
          machine_type_name: typeName,
          machines: []
        };
      }
      if (row.machine_id) {
        acc[typeName].machines.push({
          id: row.machine_id,
          machine_number: row.machine_number
        });
      }
      return acc;
    }, {});
    
    console.log(`笨・蜈ｨ讖滓｢ｰ繝・・繧ｿ蜿門ｾ怜ｮ御ｺ・ ${Object.keys(groupedData).length}讖溽ｨｮ`);
    
    res.json({
      success: true,
      data: Object.values(groupedData),
      total: Object.keys(groupedData).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('笶・蜈ｨ讖滓｢ｰ繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '讖滓｢ｰ繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 讖溽ｨｮ霑ｽ蜉API
router.post('/machine-types', async (req, res) => {
  try {
    console.log('剥 讖溽ｨｮ霑ｽ蜉繝ｪ繧ｯ繧ｨ繧ｹ繝・', req.body);
    
    // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
    res.setHeader('Content-Type', 'application/json');
    
    const { machine_type_name } = req.body;
    
    // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    if (!machine_type_name) {
      return res.status(400).json({
        success: false,
        error: '讖溽ｨｮ蜷阪・蠢・医〒縺・,
        required: ['machine_type_name'],
        received: { machine_type_name: !!machine_type_name }
      });
    }
    
    // Drizzle ORM繧剃ｽｿ逕ｨ縺励※讖溽ｨｮ繧定ｿｽ蜉
    const newMachineType = await db.insert(machineTypes).values({
      machineTypeName: machine_type_name
    }).returning();
    
    console.log('笨・讖溽ｨｮ霑ｽ蜉螳御ｺ・', newMachineType[0]);
    
    res.status(201).json({
      success: true,
      data: newMachineType[0],
      message: '讖溽ｨｮ縺梧ｭ｣蟶ｸ縺ｫ霑ｽ蜉縺輔ｌ縺ｾ縺励◆',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('笶・讖溽ｨｮ霑ｽ蜉繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '讖溽ｨｮ縺ｮ霑ｽ蜉縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 謖・ｮ壽ｩ溽ｨｮ縺ｫ邏舌▼縺乗ｩ滓｢ｰ逡ｪ蜿ｷ荳隕ｧ蜿門ｾ輸PI
router.get('/machines', async (req, res) => {
  try {
    console.log('剥 讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・', req.query);
    
    // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
    res.setHeader('Content-Type', 'application/json');
    
    const { type_id } = req.query;
    
    if (!type_id) {
      return res.status(400).json({
        success: false,
        error: '讖溽ｨｮID縺梧欠螳壹＆繧後※縺・∪縺帙ｓ',
        timestamp: new Date().toISOString()
      });
    }

    // Drizzle ORM繧剃ｽｿ逕ｨ縺励※讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ繧貞叙蠕・
    const result = await db.select({
      id: machines.id,
      machine_number: machines.machineNumber
    }).from(machines)
    .where(eq(machines.machineTypeId, type_id as string))
    .orderBy(machines.machineNumber);
    
    console.log(`笨・讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ蜿門ｾ怜ｮ御ｺ・ ${result.length}莉ｶ`);
    
    res.json({
      success: true,
      data: result,
      total: result.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('笶・讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 讖滓｢ｰ逡ｪ蜿ｷ霑ｽ蜉API
router.post('/machines', async (req, res) => {
  try {
    console.log('剥 讖滓｢ｰ逡ｪ蜿ｷ霑ｽ蜉繝ｪ繧ｯ繧ｨ繧ｹ繝・', req.body);
    
    // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
    res.setHeader('Content-Type', 'application/json');
    
    const { machine_number, machine_type_id } = req.body;
    
    if (!machine_number || machine_number.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '讖滓｢ｰ逡ｪ蜿ｷ縺ｯ蠢・医〒縺・,
        timestamp: new Date().toISOString()
      });
    }

    if (!machine_type_id) {
      return res.status(400).json({
        success: false,
        error: '讖溽ｨｮID縺ｯ蠢・医〒縺・,
        timestamp: new Date().toISOString()
      });
    }

    // Drizzle ORM繧剃ｽｿ逕ｨ縺励※讖滓｢ｰ逡ｪ蜿ｷ繧定ｿｽ蜉
    const result = await db.insert(machines).values({
      machineNumber: machine_number.trim(),
      machineTypeId: machine_type_id
    }).returning();
    
    console.log('笨・讖滓｢ｰ逡ｪ蜿ｷ霑ｽ蜉螳御ｺ・', result[0]);
    
    res.status(201).json({
      success: true,
      data: result[0],
      message: '讖滓｢ｰ逡ｪ蜿ｷ繧定ｿｽ蜉縺励∪縺励◆',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('笶・讖滓｢ｰ逡ｪ蜿ｷ霑ｽ蜉繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '讖滓｢ｰ逡ｪ蜿ｷ縺ｮ霑ｽ蜉縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 讖溽ｨｮ蜑企勁API
router.delete('/machine-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`剥 讖溽ｨｮ蜑企勁繝ｪ繧ｯ繧ｨ繧ｹ繝・ ID=${id}`);
    
    // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
    res.setHeader('Content-Type', 'application/json');
    
    // Drizzle ORM繧剃ｽｿ逕ｨ縺励※讖溽ｨｮ繧貞炎髯､
    const result = await db.delete(machineTypes)
      .where(eq(machineTypes.id, id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: '謖・ｮ壹＆繧後◆讖溽ｨｮ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ',
        id,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('笨・讖溽ｨｮ蜑企勁螳御ｺ・', result[0]);
    
    res.json({
      success: true,
      data: result[0],
      message: '讖溽ｨｮ繧貞炎髯､縺励∪縺励◆',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('笶・讖溽ｨｮ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '讖溽ｨｮ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 讖滓｢ｰ逡ｪ蜿ｷ蜑企勁API
router.delete('/machines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`剥 讖滓｢ｰ逡ｪ蜿ｷ蜑企勁繝ｪ繧ｯ繧ｨ繧ｹ繝・ ID=${id}`);
    
    // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
    res.setHeader('Content-Type', 'application/json');
    
    // Drizzle ORM繧剃ｽｿ逕ｨ縺励※讖滓｢ｰ逡ｪ蜿ｷ繧貞炎髯､
    const result = await db.delete(machines)
      .where(eq(machines.id, id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: '謖・ｮ壹＆繧後◆讖滓｢ｰ逡ｪ蜿ｷ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ',
        id,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('笨・讖滓｢ｰ逡ｪ蜿ｷ蜑企勁螳御ｺ・', result[0]);
    
    res.json({
      success: true,
      data: result[0],
      message: '讖滓｢ｰ逡ｪ蜿ｷ繧貞炎髯､縺励∪縺励◆',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('笶・讖滓｢ｰ逡ｪ蜿ｷ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '讖滓｢ｰ逡ｪ蜿ｷ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ繝溘ラ繝ｫ繧ｦ繧ｧ繧｢
router.use((err: any, req: any, res: any, next: any) => {
  console.error('讖滓｢ｰ邂｡逅・お繝ｩ繝ｼ:', err);
  
  // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
  res.setHeader('Content-Type', 'application/json');
  
  res.status(500).json({
    success: false,
    error: '讖滓｢ｰ邂｡逅・・蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
    details: err.message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
});

// 404繝上Φ繝峨Μ繝ｳ繧ｰ
router.use('*', (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: '讖滓｢ｰ邂｡逅・・繧ｨ繝ｳ繝峨・繧､繝ｳ繝医′隕九▽縺九ｊ縺ｾ縺帙ｓ',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

export default router; 