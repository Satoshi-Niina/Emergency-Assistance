import express from 'express';
import { db } from '../db/index.js';
import { supportHistory, machineTypes, machines } from '../db/schema.js';
import { eq, like, and, gte, lte, desc, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import { upload } from '../lib/multer-config.js';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import Fuse from 'fuse.js';

const router = express.Router();

// 螻･豁ｴ繝・・繧ｿ縺九ｉ讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ蜿門ｾ・
router.get('/machine-data', async (req, res) => {
  try {
    console.log('剥 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ蜿門ｾ鈴幕蟋・);
    
    // 螻･豁ｴ繝・・繧ｿ縺九ｉ讖溽ｨｮ荳隕ｧ繧貞叙蠕暦ｼ医ョ繝ｼ繧ｿ繝吶・繧ｹ繧ｫ繝ｩ繝縺ｨJSON繝・・繧ｿ縺ｮ荳｡譁ｹ縺九ｉ・・
    const machineTypesResult = await db
      .select({
        machineType: supportHistory.machineType,
        jsonData: supportHistory.jsonData
      })
      .from(supportHistory)
      .orderBy(supportHistory.createdAt);

    console.log('剥 讖溽ｨｮ繝・・繧ｿ蜿門ｾ礼ｵ先棡・・B・・', machineTypesResult.length, '莉ｶ');

    // 螻･豁ｴ繝・・繧ｿ縺九ｉ讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ繧貞叙蠕暦ｼ医ョ繝ｼ繧ｿ繝吶・繧ｹ繧ｫ繝ｩ繝縺ｨJSON繝・・繧ｿ縺ｮ荳｡譁ｹ縺九ｉ・・
    const machinesResult = await db
      .select({
        machineNumber: supportHistory.machineNumber,
        machineType: supportHistory.machineType,
        jsonData: supportHistory.jsonData
      })
      .from(supportHistory)
      .orderBy(supportHistory.createdAt);

    console.log('剥 讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ蜿門ｾ礼ｵ先棡・・B・・', machinesResult.length, '莉ｶ');

    // 讖溽ｨｮ荳隕ｧ繧呈ｧ狗ｯ会ｼ磯㍾隍・勁蜴ｻ・・
    const machineTypeSet = new Set<string>();
    const machineTypes: Array<{ id: string; machineTypeName: string }> = [];

    // 繝・・繧ｿ繝吶・繧ｹ繧ｫ繝ｩ繝縺九ｉ讖溽ｨｮ繧貞叙蠕・
    machineTypesResult.forEach((item, index) => {
      if (item.machineType && !machineTypeSet.has(item.machineType)) {
        machineTypeSet.add(item.machineType);
        machineTypes.push({
          id: `type_db_${index}`,
          machineTypeName: item.machineType
        });
      }
    });

    // JSON繝・・繧ｿ縺九ｉ讖溽ｨｮ繧貞叙蠕・
    machineTypesResult.forEach((item, index) => {
      try {
        const jsonData = typeof item.jsonData === 'string' ? JSON.parse(item.jsonData) : item.jsonData;
        if (jsonData.machineTypeName && !machineTypeSet.has(jsonData.machineTypeName)) {
          machineTypeSet.add(jsonData.machineTypeName);
          machineTypes.push({
            id: `type_json_${index}`,
            machineTypeName: jsonData.machineTypeName
          });
        }
      } catch (error) {
        // JSON隗｣譫舌お繝ｩ繝ｼ縺ｯ辟｡隕・
        console.log('剥 JSON隗｣譫舌お繝ｩ繝ｼ・域ｩ溽ｨｮ・・', error);
      }
    });

    // 讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ繧呈ｧ狗ｯ会ｼ磯㍾隍・勁蜴ｻ・・
    const machineSet = new Set<string>();
    const machines: Array<{ id: string; machineNumber: string; machineTypeName: string }> = [];

    // 繝・・繧ｿ繝吶・繧ｹ繧ｫ繝ｩ繝縺九ｉ讖滓｢ｰ逡ｪ蜿ｷ繧貞叙蠕・
    machinesResult.forEach((item, index) => {
      const key = `${item.machineNumber}_${item.machineType}`;
      if (item.machineNumber && !machineSet.has(key)) {
        machineSet.add(key);
        machines.push({
          id: `machine_db_${index}`,
          machineNumber: item.machineNumber,
          machineTypeName: item.machineType
        });
      }
    });

    // JSON繝・・繧ｿ縺九ｉ讖滓｢ｰ逡ｪ蜿ｷ繧貞叙蠕・
    machinesResult.forEach((item, index) => {
      try {
        const jsonData = typeof item.jsonData === 'string' ? JSON.parse(item.jsonData) : item.jsonData;
        if (jsonData.machineNumber && jsonData.machineTypeName) {
          const key = `${jsonData.machineNumber}_${jsonData.machineTypeName}`;
          if (!machineSet.has(key)) {
            machineSet.add(key);
            machines.push({
              id: `machine_json_${index}`,
              machineNumber: jsonData.machineNumber,
              machineTypeName: jsonData.machineTypeName
            });
          }
        }
      } catch (error) {
        // JSON隗｣譫舌お繝ｩ繝ｼ縺ｯ辟｡隕・
        console.log('剥 JSON隗｣譫舌お繝ｩ繝ｼ・域ｩ滓｢ｰ逡ｪ蜿ｷ・・', error);
      }
    });

    const result = {
      machineTypes,
      machines
    };

    console.log('剥 譛邨らｵ先棡:', {
      machineTypes: machineTypes.length,
      machines: machines.length,
      sampleMachineTypes: machineTypes.slice(0, 3),
      sampleMachines: machines.slice(0, 3)
    });

    res.json(result);

  } catch (error) {
    console.error('螻･豁ｴ繝・・繧ｿ縺九ｉ縺ｮ讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// 螻･豁ｴ讀懃ｴ｢逕ｨ繧ｹ繧ｭ繝ｼ繝・
const historyQuerySchema = z.object({
  machineType: z.string().optional(),
  machineNumber: z.string().optional(),
  searchText: z.string().optional(), // 繝・く繧ｹ繝域､懃ｴ｢逕ｨ
  searchDate: z.string().optional(), // 譌･莉俶､懃ｴ｢逕ｨ
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
});

// 螻･豁ｴ荳隕ｧ蜿門ｾ・
router.get('/', async (req, res) => {
  try {
    const query = historyQuerySchema.parse(req.query);
    
    // 蝓ｺ譛ｬ繧ｯ繧ｨ繝ｪ讒狗ｯ・
    let whereConditions = [];
    
    // 讖溽ｨｮ繝輔ぅ繝ｫ繧ｿ・医ョ繝ｼ繧ｿ繝吶・繧ｹ繧ｫ繝ｩ繝縺ｨJSON繝・・繧ｿ縺ｮ荳｡譁ｹ繧呈､懃ｴ｢・・
    if (query.machineType) {
      whereConditions.push(
        or(
          ilike(supportHistory.machineType, `%${query.machineType}%`),
          ilike(supportHistory.jsonData, `%${query.machineType}%`)
        )
      );
    }
    
    // 讖滓｢ｰ逡ｪ蜿ｷ繝輔ぅ繝ｫ繧ｿ・医ョ繝ｼ繧ｿ繝吶・繧ｹ繧ｫ繝ｩ繝縺ｨJSON繝・・繧ｿ縺ｮ荳｡譁ｹ繧呈､懃ｴ｢・・
    if (query.machineNumber) {
      whereConditions.push(
        or(
          ilike(supportHistory.machineNumber, `%${query.machineNumber}%`),
          ilike(supportHistory.jsonData, `%${query.machineNumber}%`)
        )
      );
    }
    
    // 繝・く繧ｹ繝域､懃ｴ｢・・SON繝・・繧ｿ蜀・・莉ｻ諢上・繝・く繧ｹ繝域､懃ｴ｢・・
    if (query.searchText) {
      // 隍・焚縺ｮ讀懃ｴ｢譚｡莉ｶ繧堤ｵ・∩蜷医ｏ縺帙※繧医ｊ隧ｳ邏ｰ縺ｪ讀懃ｴ｢繧貞ｮ溯｡・
      const searchTerms = query.searchText.split(/\s+/).filter(term => term.length > 0);
      
      if (searchTerms.length > 0) {
        const searchConditions = searchTerms.map(term => 
          ilike(supportHistory.jsonData, `%${term}%`)
        );
        whereConditions.push(and(...searchConditions));
      } else {
        whereConditions.push(ilike(supportHistory.jsonData, `%${query.searchText}%`));
      }
    }
    
    // 譌･莉俶､懃ｴ｢
    if (query.searchDate) {
      const searchDate = new Date(query.searchDate);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      whereConditions.push(
        and(
          gte(supportHistory.createdAt, searchDate),
          lte(supportHistory.createdAt, nextDay)
        )
      );
    }
    
    // 繝・・繧ｿ繝吶・繧ｹ縺九ｉ螻･豁ｴ繧貞叙蠕・
    const results = await db
      .select({
        id: supportHistory.id,
        machineType: supportHistory.machineType,
        machineNumber: supportHistory.machineNumber,
        jsonData: supportHistory.jsonData,
        imagePath: supportHistory.imagePath,
        createdAt: supportHistory.createdAt
      })
      .from(supportHistory)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(supportHistory.createdAt))
      .limit(query.limit)
      .offset(query.offset);

    // 邱丈ｻｶ謨ｰ繧貞叙蠕・
    const totalCount = await db
      .select({ count: supportHistory.id })
      .from(supportHistory)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    res.json({
      items: results,
      total: totalCount.length,
      hasMore: results.length === query.limit
    });

  } catch (error) {
    console.error('螻･豁ｴ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '螻･豁ｴ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// 螻･豁ｴ隧ｳ邏ｰ蜿門ｾ・
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const historyItem = await db
      .select()
      .from(supportHistory)
      .where(eq(supportHistory.id, id))
      .limit(1);
    
    if (historyItem.length === 0) {
      return res.status(404).json({ error: '螻･豁ｴ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
    }

    res.json(historyItem[0]);

  } catch (error) {
    console.error('螻･豁ｴ隧ｳ邏ｰ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '螻･豁ｴ隧ｳ邏ｰ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// 螻･豁ｴ菴懈・・育判蜒上い繝・・繝ｭ繝ｼ繝牙ｯｾ蠢懶ｼ・
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const createSchema = z.object({
      machineType: z.string(),
      machineNumber: z.string(),
      jsonData: z.any() // JSONB繝・・繧ｿ
    });

    const data = createSchema.parse(req.body);
    
    let imagePath = null;
    
    // 逕ｻ蜒上′繧｢繝・・繝ｭ繝ｼ繝峨＆繧後◆蝣ｴ蜷医・蜃ｦ逅・
    if (req.file) {
      const fileName = `support_history_${Date.now()}_${req.file.originalname}`;
      const uploadDir = path.join(process.cwd(), 'public', 'images', 'support-history');
      
      // 繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, fileName);
      
      // 繝輔ぃ繧､繝ｫ繧堤ｧｻ蜍・
      fs.renameSync(req.file.path, filePath);
      imagePath = `/images/support-history/${fileName}`;
    }

    // 繝・・繧ｿ繝吶・繧ｹ縺ｫ菫晏ｭ・
    const newHistoryItem = await db
      .insert(supportHistory)
      .values({
        machineType: data.machineType,
        machineNumber: data.machineNumber,
        jsonData: data.jsonData,
        imagePath: imagePath
      })
      .returning();

    res.status(201).json(newHistoryItem[0]);

  } catch (error) {
    console.error('螻･豁ｴ菴懈・繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '螻･豁ｴ縺ｮ菴懈・縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// 螻･豁ｴ蜑企勁
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 螻･豁ｴ鬆・岼繧貞叙蠕・
    const historyItem = await db
      .select()
      .from(supportHistory)
      .where(eq(supportHistory.id, id))
      .limit(1);
    
    if (historyItem.length === 0) {
      return res.status(404).json({ error: '螻･豁ｴ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
    }

    // 逕ｻ蜒上ヵ繧｡繧､繝ｫ縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷医・蜑企勁
    if (historyItem[0].imagePath) {
      const imagePath = path.join(process.cwd(), 'public', historyItem[0].imagePath);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // 繝・・繧ｿ繝吶・繧ｹ縺九ｉ蜑企勁
    await db
      .delete(supportHistory)
      .where(eq(supportHistory.id, id));

    res.json({ message: '螻･豁ｴ繧貞炎髯､縺励∪縺励◆' });

  } catch (error) {
    console.error('螻･豁ｴ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '螻･豁ｴ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// PDF繧ｨ繧ｯ繧ｹ繝昴・繝・
router.get('/:id/export-pdf', async (req, res) => {
  try {
    const { id } = req.params;
    
    const historyItem = await db
      .select()
      .from(supportHistory)
      .where(eq(supportHistory.id, id))
      .limit(1);
    
    if (historyItem.length === 0) {
      return res.status(404).json({ error: '螻･豁ｴ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
    }

    const item = historyItem[0];
    
    // PDF繝峨く繝･繝｡繝ｳ繝医ｒ菴懈・
    const doc = new PDFDocument();
    
    // 繝ｬ繧ｹ繝昴Φ繧ｹ繝倥ャ繝繝ｼ繧定ｨｭ螳・
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="support_history_${item.machineType}_${item.machineNumber}.pdf"`);
    
    // PDF繧偵Ξ繧ｹ繝昴Φ繧ｹ繧ｹ繝医Μ繝ｼ繝縺ｫ繝代う繝・
    doc.pipe(res);
    
    // PDF縺ｮ蜀・ｮｹ繧剃ｽ懈・
    doc.fontSize(20).text('蠢懈･蜃ｦ鄂ｮ繧ｵ繝昴・繝亥ｱ･豁ｴ', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(`讖溽ｨｮ: ${item.machineType}`);
    doc.text(`讖滓｢ｰ逡ｪ蜿ｷ: ${item.machineNumber}`);
    doc.text(`菴懈・譌･譎・ ${new Date(item.createdAt).toLocaleString('ja-JP')}`);
    doc.moveDown();
    
    doc.fontSize(14).text('繝・・繧ｿ蜀・ｮｹ:', { underline: true });
    doc.moveDown();
    
    // JSON繝・・繧ｿ繧呈紛蠖｢縺励※陦ｨ遉ｺ
    const jsonString = JSON.stringify(item.jsonData, null, 2);
    doc.fontSize(10).text(jsonString, { align: 'left' });
    
    // 逕ｻ蜒上′蟄伜惠縺吶ｋ蝣ｴ蜷・
    if (item.imagePath) {
      doc.moveDown();
      doc.fontSize(14).text('髢｢騾｣逕ｻ蜒・', { underline: true });
      doc.moveDown();
      
      const imagePath = path.join(process.cwd(), 'public', item.imagePath);
      if (fs.existsSync(imagePath)) {
        try {
          doc.image(imagePath, { width: 300 });
        } catch (error) {
          doc.text('逕ｻ蜒上・隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
        }
      } else {
        doc.text('逕ｻ蜒上ヵ繧｡繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
      }
    }
    
    // PDF繧堤ｵゆｺ・
    doc.end();

  } catch (error) {
    console.error('PDF繧ｨ繧ｯ繧ｹ繝昴・繝医お繝ｩ繝ｼ:', error);
    res.status(500).json({ error: 'PDF繧ｨ繧ｯ繧ｹ繝昴・繝医↓螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// 繝ｬ繝昴・繝育函謌先ｩ溯・
router.post('/generate-report', async (req, res) => {
  try {
    const { searchFilters, reportTitle, reportDescription } = req.body;
    
    // 讀懃ｴ｢譚｡莉ｶ縺ｫ蝓ｺ縺･縺・※螻･豁ｴ繧貞叙蠕・
    let whereConditions = [];
    
    if (searchFilters.machineType) {
      whereConditions.push(ilike(supportHistory.jsonData, `%${searchFilters.machineType}%`));
    }
    
    if (searchFilters.machineNumber) {
      whereConditions.push(ilike(supportHistory.jsonData, `%${searchFilters.machineNumber}%`));
    }
    
    if (searchFilters.searchText) {
      whereConditions.push(ilike(supportHistory.jsonData, `%${searchFilters.searchText}%`));
    }
    
    const results = await db
      .select({
        id: supportHistory.id,
        machineType: supportHistory.machineType,
        machineNumber: supportHistory.machineNumber,
        jsonData: supportHistory.jsonData,
        imagePath: supportHistory.imagePath,
        createdAt: supportHistory.createdAt
      })
      .from(supportHistory)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(supportHistory.createdAt));

    // 繝ｬ繝昴・繝医ョ繝ｼ繧ｿ繧呈ｧ狗ｯ・
    const reportData = {
      title: reportTitle || '螻･豁ｴ讀懃ｴ｢繝ｬ繝昴・繝・,
      description: reportDescription || '',
      generatedAt: new Date().toISOString(),
      searchFilters,
      totalCount: results.length,
      items: results.map(item => ({
        id: item.id,
        machineType: item.machineType,
        machineNumber: item.machineNumber,
        createdAt: item.createdAt,
        jsonData: item.jsonData,
        imagePath: item.imagePath
      }))
    };

    // PDF繝ｬ繝昴・繝医ｒ逕滓・
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="history_report_${new Date().toISOString().split('T')[0]}.pdf"`);
    
    doc.pipe(res);
    
    // 繝ｬ繝昴・繝医・繝・ム繝ｼ
    doc.fontSize(24).text(reportData.title, { align: 'center' });
    doc.moveDown();
    
    if (reportData.description) {
      doc.fontSize(12).text(reportData.description, { align: 'center' });
      doc.moveDown();
    }
    
    doc.fontSize(10).text(`逕滓・譌･譎・ ${new Date(reportData.generatedAt).toLocaleString('ja-JP')}`);
    doc.fontSize(10).text(`讀懃ｴ｢邨先棡: ${reportData.totalCount}莉ｶ`);
    doc.moveDown();
    
    // 讀懃ｴ｢譚｡莉ｶ
    doc.fontSize(14).text('讀懃ｴ｢譚｡莉ｶ:', { underline: true });
    doc.moveDown();
    if (searchFilters.machineType) doc.fontSize(10).text(`讖溽ｨｮ: ${searchFilters.machineType}`);
    if (searchFilters.machineNumber) doc.fontSize(10).text(`讖滓｢ｰ逡ｪ蜿ｷ: ${searchFilters.machineNumber}`);
    if (searchFilters.searchText) doc.fontSize(10).text(`讀懃ｴ｢繝・く繧ｹ繝・ ${searchFilters.searchText}`);
    doc.moveDown();
    
    // 讀懃ｴ｢邨先棡荳隕ｧ
    doc.fontSize(14).text('讀懃ｴ｢邨先棡荳隕ｧ:', { underline: true });
    doc.moveDown();
    
    reportData.items.forEach((item, index) => {
      doc.fontSize(12).text(`${index + 1}. ${item.machineType} - ${item.machineNumber}`, { underline: true });
      doc.fontSize(10).text(`菴懈・譌･譎・ ${new Date(item.createdAt).toLocaleString('ja-JP')}`);
      
      // JSON繝・・繧ｿ縺ｮ荳ｻ隕√↑諠・ｱ繧呈歓蜃ｺ
      try {
        const jsonData = typeof item.jsonData === 'string' ? JSON.parse(item.jsonData) : item.jsonData;
        if (jsonData.title) doc.fontSize(10).text(`繧ｿ繧､繝医Ν: ${jsonData.title}`);
        if (jsonData.description) doc.fontSize(10).text(`隱ｬ譏・ ${jsonData.description}`);
        if (jsonData.emergencyMeasures) doc.fontSize(10).text(`蠢懈･蜃ｦ鄂ｮ: ${jsonData.emergencyMeasures}`);
      } catch (error) {
        doc.fontSize(10).text('繝・・繧ｿ蠖｢蠑上お繝ｩ繝ｼ');
      }
      
      doc.moveDown();
    });
    
    doc.end();

  } catch (error) {
    console.error('繝ｬ繝昴・繝育函謌舌お繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '繝ｬ繝昴・繝育函謌舌↓螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// 鬮伜ｺｦ縺ｪ繝・く繧ｹ繝域､懃ｴ｢讖溯・
router.post('/advanced-search', async (req, res) => {
  try {
    const { searchText, limit = 50 } = req.body;
    
    if (!searchText) {
      return res.status(400).json({ error: '讀懃ｴ｢繝・く繧ｹ繝医′蠢・ｦ√〒縺・ });
    }
    
    // 蜈ｨ螻･豁ｴ繧貞叙蠕・
    const allHistory = await db
      .select({
        id: supportHistory.id,
        machineType: supportHistory.machineType,
        machineNumber: supportHistory.machineNumber,
        jsonData: supportHistory.jsonData,
        imagePath: supportHistory.imagePath,
        createdAt: supportHistory.createdAt
      })
      .from(supportHistory)
      .orderBy(desc(supportHistory.createdAt));

    // Fuse.js縺ｧ鬮伜ｺｦ縺ｪ讀懃ｴ｢繧貞ｮ溯｡・
    const fuse = new Fuse(allHistory, {
      keys: [
        { name: 'machineType', weight: 0.3 },
        { name: 'machineNumber', weight: 0.3 },
        { name: 'jsonData', weight: 1.0 }
      ],
      threshold: 0.3, // 繧医ｊ蜴ｳ蟇・↑讀懃ｴ｢
      includeScore: true,
      ignoreLocation: true,
      useExtendedSearch: true,
      minMatchCharLength: 1, // 1譁・ｭ励〒繧ゅ・繝・メ
      findAllMatches: true,
      shouldSort: true
    });

    // 讀懃ｴ｢繝・く繧ｹ繝医ｒ蛻・牡縺励※隍・焚譚｡莉ｶ縺ｧ讀懃ｴ｢
    const searchTerms = searchText.split(/\s+/).filter(term => term.length > 0);
    let searchResults = [];

    if (searchTerms.length > 1) {
      // 隍・焚繧ｭ繝ｼ繝ｯ繝ｼ繝峨・蝣ｴ蜷医∝推繧ｭ繝ｼ繝ｯ繝ｼ繝峨〒讀懃ｴ｢縺励※邨先棡繧堤ｵｱ蜷・
      const allResults = new Map();
      
      searchTerms.forEach(term => {
        const termResults = fuse.search(term);
        termResults.forEach(result => {
          if (!allResults.has(result.item.id)) {
            allResults.set(result.item.id, { ...result.item, score: result.score });
          } else {
            // 譌｢蟄倥・邨先棡縺後≠繧句ｴ蜷医・縲√ｈ繧願憶縺・せ繧ｳ繧｢繧呈治逕ｨ
            const existing = allResults.get(result.item.id);
            if (result.score < existing.score) {
              allResults.set(result.item.id, { ...result.item, score: result.score });
            }
          }
        });
      });
      
      searchResults = Array.from(allResults.values());
    } else {
      // 蜊倅ｸ繧ｭ繝ｼ繝ｯ繝ｼ繝峨・蝣ｴ蜷・
      searchResults = fuse.search(searchText);
    }
    
    const results = searchResults
      .slice(0, limit)
      .map(result => ({
        ...result.item,
        score: result.score
      }));

    res.json({
      items: results,
      total: results.length,
      searchText,
      searchTerms: searchTerms
    });

  } catch (error) {
    console.error('鬮伜ｺｦ縺ｪ讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '讀懃ｴ｢縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

export { router as supportHistoryRouter }; 