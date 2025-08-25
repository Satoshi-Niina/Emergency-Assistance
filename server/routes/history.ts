
import express from 'express';
import { HistoryService } from '../services/historyService';
import { z } from 'zod';
import { db } from '../db/index.js';
import { historyItems, machineTypes, machines } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { BackupManager } from '../lib/backup-manager';

const router = express.Router();

// 繝舌ャ繧ｯ繧｢繝・・繝槭ロ繝ｼ繧ｸ繝｣繝ｼ縺ｮ險ｭ螳・
const backupManager = new BackupManager({
  maxBackups: parseInt(process.env.BACKUP_MAX_FILES || '3'),
  backupBaseDir: process.env.BACKUP_FOLDER_NAME || 'backups',
  disabled: process.env.BACKUP_ENABLED === 'false'
});

// 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝・
const saveHistorySchema = z.object({
  sessionId: z.string().uuid('繧ｻ繝・す繝ｧ繝ｳID縺ｯUUID蠖｢蠑上〒縺ゅｋ蠢・ｦ√′縺ゅｊ縺ｾ縺・),
  question: z.string().min(1, '雉ｪ蝠上・蠢・医〒縺・),
  answer: z.string().optional(),
  imageBase64: z.string().optional(),
  machineType: z.string().optional(),
  machineNumber: z.string().optional(),
  metadata: z.any().optional()
});

const createSessionSchema = z.object({
  title: z.string().optional(),
  machineType: z.string().optional(),
  machineNumber: z.string().optional(),
  metadata: z.any().optional()
});

/**
 * GET /api/history
 * 螻･豁ｴ荳隕ｧ繧貞叙蠕・
 */
router.get('/', async (req, res) => {
  try {
    console.log('搭 螻･豁ｴ荳隕ｧ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・', req.query);

    // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
    res.setHeader('Content-Type', 'application/json');

    // 繝輔ぅ繝ｫ繧ｿ繝ｼ繝代Λ繝｡繝ｼ繧ｿ繧貞叙蠕・
    const { machineType, machineNumber, searchText, searchDate, limit = 20, offset = 0 } = req.query;

    // 繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝医ヵ繧｡繧､繝ｫ縺ｮ縺ｿ繧貞叙蠕暦ｼ医ョ繝ｼ繧ｿ繝吶・繧ｹ縺ｯ菴ｿ逕ｨ縺励↑縺・ｼ・
    let exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
    
    // 繧ｵ繝ｼ繝舌・繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ襍ｷ蜍輔＆繧後※縺・ｋ蝣ｴ蜷医・莉｣譖ｿ繝代せ
    if (!fs.existsSync(exportsDir)) {
      const alternativePath = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
      if (fs.existsSync(alternativePath)) {
        exportsDir = alternativePath;
      }
    }
    
    console.log('搭 繧ｨ繧ｯ繧ｹ繝昴・繝医ョ繧｣繝ｬ繧ｯ繝医Μ:', exportsDir);
    console.log('搭 繝・ぅ繝ｬ繧ｯ繝医Μ蟄伜惠:', fs.existsSync(exportsDir));
    
    let chatExports: any[] = [];
    if (fs.existsSync(exportsDir)) {
      // 蜀榊ｸｰ逧・↓JSON繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢縺吶ｋ髢｢謨ｰ
      const findJsonFiles = (dir: string, baseDir: string = exportsDir): any[] => {
        const files: any[] = [];
        const items = fs.readdirSync(dir);
        
        console.log('搭 繝・ぅ繝ｬ繧ｯ繝医Μ蜀・ｮｹ:', dir, items);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            // 繧ｵ繝悶ョ繧｣繝ｬ繧ｯ繝医Μ繧貞・蟶ｰ逧・↓讀懃ｴ｢
            files.push(...findJsonFiles(itemPath, baseDir));
          } else if (item.endsWith('.json')) {
            try {
              console.log('搭 JSON繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ:', itemPath);
              const content = fs.readFileSync(itemPath, 'utf8');
              const data = JSON.parse(content);
              
              console.log('搭 繝輔ぃ繧､繝ｫ蜀・ｮｹ繧ｵ繝ｳ繝励Ν:', {
                chatId: data.chatId,
                machineTypeName: data.chatData?.machineInfo?.machineTypeName,
                machineNumber: data.chatData?.machineInfo?.machineNumber,
                messageCount: data.chatData?.messages?.length,
                firstMessage: data.chatData?.messages?.[0]?.content?.substring(0, 50)
              });
              
              // 逶ｸ蟇ｾ繝代せ繧定ｨ育ｮ・
              const relativePath = path.relative(baseDir, itemPath);
              
              files.push({
                id: `export_${relativePath.replace(/[\\/]/g, '_')}`,
                type: 'chat_export',
                fileName: relativePath,
                chatId: data.chatId,
                userId: data.userId,
                exportType: data.exportType,
                exportTimestamp: data.exportTimestamp,
                messageCount: data.chatData?.messages?.length || 0,
                // 譁ｰ縺励＞繝輔か繝ｼ繝槭ャ繝医・繝・・繧ｿ繧貞━蜈育噪縺ｫ菴ｿ逕ｨ
                machineType: data.machineType || data.chatData?.machineInfo?.machineTypeName || '',
                machineNumber: data.machineNumber || data.chatData?.machineInfo?.machineNumber || '',
                machineInfo: data.chatData?.machineInfo || {
                  selectedMachineType: '',
                  selectedMachineNumber: '',
                  machineTypeName: data.machineType || '',
                  machineNumber: data.machineNumber || ''
                },
                // 譁ｰ縺励＞繝輔か繝ｼ繝槭ャ繝医・繝・・繧ｿ繧ょ性繧√ｋ
                title: data.title,
                problemDescription: data.problemDescription,
                extractedComponents: data.extractedComponents,
                extractedSymptoms: data.extractedSymptoms,
                possibleModels: data.possibleModels,
                conversationHistory: data.conversationHistory,
                metadata: data.metadata,
                chatData: data.chatData, // chatData繧ょ性繧√ｋ
                savedImages: data.savedImages || [],
                fileSize: stats.size,
                lastModified: stats.mtime,
                createdAt: stats.mtime
              });
            } catch (error) {
              console.warn(`JSON繝輔ぃ繧､繝ｫ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ: ${itemPath}`, error);
            }
          }
        }
        
        return files;
      };
      
      chatExports = findJsonFiles(exportsDir)
        .sort((a, b) => new Date(b.exportTimestamp).getTime() - new Date(a.exportTimestamp).getTime());
      
      console.log('搭 隱ｭ縺ｿ霎ｼ縺ｿ螳御ｺ・', chatExports.length, '莉ｶ');
      
      // 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ縺ｮ遒ｺ隱・
      chatExports.forEach((item, index) => {
        console.log(`搭 繧｢繧､繝・Β ${index + 1}:`, {
          fileName: item.fileName,
          machineType: item.machineType,
          machineNumber: item.machineNumber,
          machineInfo: item.machineInfo
        });
      });
    }

    // 繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ繧帝←逕ｨ
    let filteredExports = chatExports;
    
    console.log('搭 繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ蜑阪・莉ｶ謨ｰ:', filteredExports.length);
    
    if (machineType && typeof machineType === 'string') {
      console.log('搭 讖溽ｨｮ繝輔ぅ繝ｫ繧ｿ繝ｼ驕ｩ逕ｨ:', machineType);
      filteredExports = filteredExports.filter(item => {
        // 譁ｰ縺励＞繝輔か繝ｼ繝槭ャ繝医→蠕捺擂縺ｮ繝輔か繝ｼ繝槭ャ繝医・荳｡譁ｹ縺ｫ蟇ｾ蠢・
        const itemMachineType = item.machineType || item.originalChatData?.machineInfo?.machineTypeName || item.machineInfo?.machineTypeName || '';
        console.log(`搭 讖溽ｨｮ繝輔ぅ繝ｫ繧ｿ繝ｼ蟇ｾ雎｡: ${item.fileName} -> ${itemMachineType}`);
        return itemMachineType.toLowerCase().includes(machineType.toLowerCase());
      });
      console.log('搭 讖溽ｨｮ繝輔ぅ繝ｫ繧ｿ繝ｼ蠕後・莉ｶ謨ｰ:', filteredExports.length);
    }
    
    if (machineNumber && typeof machineNumber === 'string') {
      console.log('搭 讖滓｢ｰ逡ｪ蜿ｷ繝輔ぅ繝ｫ繧ｿ繝ｼ驕ｩ逕ｨ:', machineNumber);
      filteredExports = filteredExports.filter(item => {
        // 譁ｰ縺励＞繝輔か繝ｼ繝槭ャ繝医→蠕捺擂縺ｮ繝輔か繝ｼ繝槭ャ繝医・荳｡譁ｹ縺ｫ蟇ｾ蠢・
        const itemMachineNumber = item.machineNumber || item.originalChatData?.machineInfo?.machineNumber || item.machineInfo?.machineNumber || '';
        console.log(`搭 讖滓｢ｰ逡ｪ蜿ｷ繝輔ぅ繝ｫ繧ｿ繝ｼ蟇ｾ雎｡: ${item.fileName} -> ${itemMachineNumber}`);
        return itemMachineNumber.toLowerCase().includes(machineNumber.toLowerCase());
      });
      console.log('搭 讖滓｢ｰ逡ｪ蜿ｷ繝輔ぅ繝ｫ繧ｿ繝ｼ蠕後・莉ｶ謨ｰ:', filteredExports.length);
    }
    
    if (searchText && typeof searchText === 'string') {
      console.log('搭 繝・く繧ｹ繝域､懃ｴ｢驕ｩ逕ｨ:', searchText);
      filteredExports = filteredExports.filter(item => {
        // 譁ｰ縺励＞繝輔か繝ｼ繝槭ャ繝医→蠕捺擂縺ｮ繝輔か繝ｼ繝槭ャ繝医・荳｡譁ｹ縺ｫ蟇ｾ蠢・
        const searchableText = [
          item.fileName,
          item.exportType,
          item.title || item.question || '',
          item.problemDescription || item.answer || '',
          item.machineType || item.originalChatData?.machineInfo?.machineTypeName || item.machineInfo?.machineTypeName || '',
          item.machineNumber || item.originalChatData?.machineInfo?.machineNumber || item.machineInfo?.machineNumber || '',
          // 譁ｰ縺励＞繝輔か繝ｼ繝槭ャ繝医・謚ｽ蜃ｺ諠・ｱ繧よ､懃ｴ｢蟇ｾ雎｡縺ｫ蜷ｫ繧√ｋ
          ...(item.extractedComponents || []),
          ...(item.extractedSymptoms || []),
          ...(item.possibleModels || []),
          // 蠕捺擂縺ｮ繝｡繝・そ繝ｼ繧ｸ蜀・ｮｹ繧よ､懃ｴ｢蟇ｾ雎｡縺ｫ蜷ｫ繧√ｋ
          ...(item.chatData?.messages?.map((msg: any) => msg.content) || []),
          // 譁ｰ縺励＞繝輔か繝ｼ繝槭ャ繝医・莨夊ｩｱ螻･豁ｴ繧よ､懃ｴ｢蟇ｾ雎｡縺ｫ蜷ｫ繧√ｋ
          ...(item.conversationHistory?.map((msg: any) => msg.content) || [])
        ].join(' ').toLowerCase();
        
        console.log('搭 讀懃ｴ｢蟇ｾ雎｡繧｢繧､繝・Β:', {
          fileName: item.fileName,
          title: item.title || item.question,
          problemDescription: item.problemDescription || item.answer,
          machineType: item.machineType || item.originalChatData?.machineInfo?.machineTypeName || item.machineInfo?.machineTypeName,
          machineNumber: item.machineNumber || item.originalChatData?.machineInfo?.machineNumber || item.machineInfo?.machineNumber,
          extractedComponents: item.extractedComponents,
          extractedSymptoms: item.extractedSymptoms
        });
        
        console.log('搭 讀懃ｴ｢蟇ｾ雎｡繝・く繧ｹ繝・', searchableText);
        console.log('搭 讀懃ｴ｢繧ｭ繝ｼ繝ｯ繝ｼ繝・', (searchText as string).toLowerCase());
        
        const match = searchableText.includes((searchText as string).toLowerCase());
        console.log('搭 繝槭ャ繝∫ｵ先棡:', match);
        
        return match;
      });
      console.log('搭 繝・く繧ｹ繝域､懃ｴ｢蠕後・莉ｶ謨ｰ:', filteredExports.length);
    }

    if (searchDate) {
      console.log('搭 譌･莉倥ヵ繧｣繝ｫ繧ｿ繝ｼ驕ｩ逕ｨ:', searchDate);
      const searchDateObj = new Date(searchDate as string);
      const nextDay = new Date(searchDateObj);
      nextDay.setDate(nextDay.getDate() + 1);
      
      filteredExports = filteredExports.filter(item => {
        const itemDate = new Date(item.exportTimestamp);
        const match = itemDate >= searchDateObj && itemDate < nextDay;
        console.log('搭 譌･莉倥・繝・メ:', item.exportTimestamp, '竊・, match);
        return match;
      });
      console.log('搭 譌･莉倥ヵ繧｣繝ｫ繧ｿ繝ｼ蠕後・莉ｶ謨ｰ:', filteredExports.length);
    }

    // 繝壹・繧ｸ繝阪・繧ｷ繝ｧ繝ｳ繧帝←逕ｨ
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const paginatedExports = filteredExports.slice(offsetNum, offsetNum + limitNum);

    console.log('搭 繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝井ｸ隕ｧ:', {
      total: filteredExports.length,
      filtered: paginatedExports.length,
      limit: limitNum,
      offset: offsetNum
    });

    res.json({
      success: true,
      items: paginatedExports,
      total: filteredExports.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('笶・螻･豁ｴ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '螻･豁ｴ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/history/search-filters
 * 螻･豁ｴ讀懃ｴ｢逕ｨ縺ｮ繝輔ぅ繝ｫ繧ｿ繝ｼ繝・・繧ｿ・井ｿ晏ｭ倥＆繧後◆JSON繝輔ぃ繧､繝ｫ縺九ｉ蜍慕噪縺ｫ蜿門ｾ暦ｼ・
 */
router.get('/search-filters', async (req, res) => {
  try {
    console.log('搭 螻･豁ｴ讀懃ｴ｢繝輔ぅ繝ｫ繧ｿ繝ｼ繝・・繧ｿ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・);

    let exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
    
    if (!fs.existsSync(exportsDir)) {
      const alternativePath = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
      if (fs.existsSync(alternativePath)) {
        exportsDir = alternativePath;
      }
    }

    const machineTypes = new Set<string>();
    const machineNumbers = new Set<string>();

    if (fs.existsSync(exportsDir)) {
      const files = fs.readdirSync(exportsDir);
      
      for (const file of files) {
        if (file.endsWith('.json') && !file.includes('.backup.')) {
          try {
            const filePath = path.join(exportsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            // 讖溽ｨｮ繧貞庶髮・
            const machineType = data.machineType || data.chatData?.machineInfo?.machineTypeName || '';
            if (machineType && machineType.trim()) {
              machineTypes.add(machineType.trim());
            }
            
            // 讖滓｢ｰ逡ｪ蜿ｷ繧貞庶髮・
            const machineNumber = data.machineNumber || data.chatData?.machineInfo?.machineNumber || '';
            if (machineNumber && machineNumber.trim()) {
              machineNumbers.add(machineNumber.trim());
            }
          } catch (error) {
            console.warn(`JSON繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ: ${file}`, error);
          }
        }
      }
    }

    const result = {
      success: true,
      machineTypes: Array.from(machineTypes).sort(),
      machineNumbers: Array.from(machineNumbers).sort()
    };

    console.log('搭 螻･豁ｴ讀懃ｴ｢繝輔ぅ繝ｫ繧ｿ繝ｼ繝・・繧ｿ:', {
      machineTypesCount: result.machineTypes.length,
      machineNumbersCount: result.machineNumbers.length
    });

    res.json(result);
  } catch (error) {
    console.error('笶・螻･豁ｴ讀懃ｴ｢繝輔ぅ繝ｫ繧ｿ繝ｼ繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '螻･豁ｴ讀懃ｴ｢繝輔ぅ繝ｫ繧ｿ繝ｼ繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/history/machine-data
 * 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝槭せ繧ｿ繝ｼ繝・・繧ｿ繧貞叙蠕暦ｼ・ostgreSQL縺九ｉ・・
 */
router.get('/machine-data', async (req, res) => {
  try {
    console.log('搭 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝茨ｼ・ostgreSQL縺九ｉ・・);

    // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
    res.setHeader('Content-Type', 'application/json');

    // PostgreSQL縺ｮmachineTypes繝・・繝悶Ν縺九ｉ讖溽ｨｮ荳隕ｧ繧貞叙蠕・
    const machineTypesData = await db.select({
      id: machineTypes.id,
      machineTypeName: machineTypes.machineTypeName
    }).from(machineTypes);

    console.log('搭 PostgreSQL縺九ｉ蜿門ｾ励＠縺滓ｩ溽ｨｮ繝・・繧ｿ:', machineTypesData.length, '莉ｶ');

    // PostgreSQL縺ｮmachines繝・・繝悶Ν縺九ｉ讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ繧貞叙蠕暦ｼ域ｩ溽ｨｮ蜷阪ｂ蜷ｫ繧・・
    const machinesData = await db.select({
      id: machines.id,
      machineNumber: machines.machineNumber,
      machineTypeId: machines.machineTypeId,
      machineTypeName: machineTypes.machineTypeName
    })
    .from(machines)
    .leftJoin(machineTypes, eq(machines.machineTypeId, machineTypes.id));

    console.log('搭 PostgreSQL縺九ｉ蜿門ｾ励＠縺滓ｩ滓｢ｰ繝・・繧ｿ:', machinesData.length, '莉ｶ');

    const result = {
      machineTypes: machineTypesData,
      machines: machinesData
    };

    console.log('搭 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ蜿門ｾ礼ｵ先棡:', {
      machineTypes: machineTypesData.length,
      machines: machinesData.length,
      sampleMachineTypes: machineTypesData.slice(0, 3),
      sampleMachines: machinesData.slice(0, 3)
    });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('笶・讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: '讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/history/save
 * 繝√Ε繝・ヨ螻･豁ｴ繧剃ｿ晏ｭ・
 */
router.post('/save', async (req, res) => {
  try {
    console.log('搭 螻･豁ｴ菫晏ｭ倥Μ繧ｯ繧ｨ繧ｹ繝・', req.body);

    // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    const validationResult = saveHistorySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: '繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ',
        details: validationResult.error.errors
      });
    }

    const data = validationResult.data;

    // 螻･豁ｴ繧剃ｿ晏ｭ・
    const history = await HistoryService.createHistory(data);

    res.json({
      success: true,
      message: '螻･豁ｴ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆',
      data: history
    });

  } catch (error) {
    console.error('笶・螻･豁ｴ菫晏ｭ倥お繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: '螻･豁ｴ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/history/session
 * 譁ｰ縺励＞繧ｻ繝・す繝ｧ繝ｳ繧剃ｽ懈・
 */
router.post('/session', async (req, res) => {
  try {
    console.log('搭 繧ｻ繝・す繝ｧ繝ｳ菴懈・繝ｪ繧ｯ繧ｨ繧ｹ繝・', req.body);
    
    // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    const validationResult = createSessionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: '繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ',
        details: validationResult.error.errors
      });
    }

    const data = validationResult.data;

    // 繧ｻ繝・す繝ｧ繝ｳ繧剃ｽ懈・
    const session = await HistoryService.createSession(data);

    res.json({
      success: true,
      message: '繧ｻ繝・す繝ｧ繝ｳ繧剃ｽ懈・縺励∪縺励◆',
      data: session
    });

  } catch (error) {
    console.error('笶・繧ｻ繝・す繝ｧ繝ｳ菴懈・繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: '繧ｻ繝・す繝ｧ繝ｳ菴懈・縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/history/list
 * 繧ｻ繝・す繝ｧ繝ｳ荳隕ｧ繧貞叙蠕・
 */
router.get('/list', async (req, res) => {
  try {
    console.log('搭 繧ｻ繝・す繝ｧ繝ｳ荳隕ｧ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・);

    const { machineType, machineNumber, status, limit, offset } = req.query;

    const params = {
      machineType: machineType as string,
      machineNumber: machineNumber as string,
      status: status as 'active' | 'completed' | 'archived',
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0
    };

    const result = await HistoryService.getSessionList(params);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('笶・繧ｻ繝・す繝ｧ繝ｳ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: '繧ｻ繝・す繝ｧ繝ｳ荳隕ｧ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/history/view/:sessionId
 * 繧ｻ繝・す繝ｧ繝ｳ隧ｳ邏ｰ縺ｨ螻･豁ｴ繧貞叙蠕・
 */
router.get('/view/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`搭 繧ｻ繝・す繝ｧ繝ｳ隧ｳ邏ｰ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・ ${sessionId}`);

    // 繧ｻ繝・す繝ｧ繝ｳ隧ｳ邏ｰ繧貞叙蠕・
    const session = await HistoryService.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({
        error: '繧ｻ繝・す繝ｧ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }

    // 繧ｻ繝・す繝ｧ繝ｳ螻･豁ｴ繧貞叙蠕・
    const history = await HistoryService.getSessionHistory(sessionId);

    res.json({
      success: true,
      data: {
        session,
        history
      }
    });

  } catch (error) {
    console.error('笶・繧ｻ繝・す繝ｧ繝ｳ隧ｳ邏ｰ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: '繧ｻ繝・す繝ｧ繝ｳ隧ｳ邏ｰ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/history/export-history
 * 繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ･豁ｴ荳隕ｧ繧貞叙蠕・
 */
router.get('/export-history', async (req, res) => {
  try {
    console.log('搭 繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ･豁ｴ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・);

    // 繧ｨ繧ｯ繧ｹ繝昴・繝医ョ繧｣繝ｬ繧ｯ繝医Μ縺九ｉ螻･豁ｴ繧貞叙蠕・
    let exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
    
    // 繧ｵ繝ｼ繝舌・繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ襍ｷ蜍輔＆繧後※縺・ｋ蝣ｴ蜷医・莉｣譖ｿ繝代せ
    if (!fs.existsSync(exportsDir)) {
      const alternativePath = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
      if (fs.existsSync(alternativePath)) {
        exportsDir = alternativePath;
      }
    }
    
    let exportHistory: any[] = [];
    if (fs.existsSync(exportsDir)) {
      const files = fs.readdirSync(exportsDir);
      
      exportHistory = files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(exportsDir, file);
          const stats = fs.statSync(filePath);
          
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            return {
              id: `export_${file.replace('.json', '')}`,
              filename: file,
              format: 'json' as const,
              exportedAt: data.exportTimestamp || stats.mtime.toISOString(),
              fileSize: stats.size,
              recordCount: data.chatData?.messages?.length || 0
            };
          } catch (error) {
            console.warn(`繧ｨ繧ｯ繧ｹ繝昴・繝医ヵ繧｡繧､繝ｫ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ: ${filePath}`, error);
            return {
              id: `export_${file.replace('.json', '')}`,
              filename: file,
              format: 'json' as const,
              exportedAt: stats.mtime.toISOString(),
              fileSize: stats.size,
              recordCount: 0
            };
          }
        })
        .sort((a, b) => new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime());
    }

    console.log(`搭 繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ･豁ｴ蜿門ｾ怜ｮ御ｺ・ ${exportHistory.length}莉ｶ`);

    res.json(exportHistory);

  } catch (error) {
    console.error('笶・繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ･豁ｴ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: '繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ･豁ｴ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/history/export-selected
 * 驕ｸ謚槭＆繧後◆螻･豁ｴ繧剃ｸ諡ｬ繧ｨ繧ｯ繧ｹ繝昴・繝・
 */
router.post('/export-selected', async (req, res) => {
  try {
    const { ids, format = 'json' } = req.body;
    console.log(`搭 驕ｸ謚槫ｱ･豁ｴ繧ｨ繧ｯ繧ｹ繝昴・繝医Μ繧ｯ繧ｨ繧ｹ繝・ ${ids?.length || 0}莉ｶ, 蠖｢蠑・ ${format}`);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: '繧ｨ繧ｯ繧ｹ繝昴・繝医☆繧句ｱ･豁ｴID縺梧欠螳壹＆繧後※縺・∪縺帙ｓ'
      });
    }

    // 驕ｸ謚槭＆繧後◆螻･豁ｴ繧貞叙蠕・
    const selectedHistory = await Promise.all(
      ids.map(async (id) => {
        try {
          const response = await fetch(`${req.protocol}://${req.get('host')}/api/history/${id}`);
          if (response.ok) {
            return await response.json();
          }
        } catch (error) {
          console.warn(`螻･豁ｴ蜿門ｾ励お繝ｩ繝ｼ (ID: ${id}):`, error);
        }
        return null;
      })
    );

    const validHistory = selectedHistory.filter(item => item !== null);

    if (validHistory.length === 0) {
      return res.status(404).json({
        error: '譛牙柑縺ｪ螻･豁ｴ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }

    let exportData: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      // CSV蠖｢蠑上〒繧ｨ繧ｯ繧ｹ繝昴・繝・
      const csvData = validHistory.map((item, index) => ({
        'No.': index + 1,
        '讖溽ｨｮ': item.machineType || '',
        '讖滓｢ｰ逡ｪ蜿ｷ': item.machineNumber || '',
        '菴懈・譌･譎・: new Date(item.createdAt).toLocaleString('ja-JP'),
        'JSON繝・・繧ｿ': JSON.stringify(item.jsonData)
      }));

      const csvContent = [
        'No.,讖溽ｨｮ,讖滓｢ｰ逡ｪ蜿ｷ,菴懈・譌･譎・JSON繝・・繧ｿ',
        ...csvData.map(row => 
          `${row['No.']},"${row['讖溽ｨｮ']}","${row['讖滓｢ｰ逡ｪ蜿ｷ']}","${row['菴懈・譌･譎・]}","${row['JSON繝・・繧ｿ']}"`
        )
      ].join('\n');

      exportData = csvContent;
      contentType = 'text/csv; charset=utf-8';
      filename = `selected_history_${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      // JSON蠖｢蠑上〒繧ｨ繧ｯ繧ｹ繝昴・繝・
      exportData = JSON.stringify(validHistory, null, 2);
      contentType = 'application/json';
      filename = `selected_history_${new Date().toISOString().slice(0, 10)}.json`;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);

  } catch (error) {
    console.error('笶・驕ｸ謚槫ｱ･豁ｴ繧ｨ繧ｯ繧ｹ繝昴・繝医お繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: '驕ｸ謚槫ｱ･豁ｴ縺ｮ繧ｨ繧ｯ繧ｹ繝昴・繝医↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/history/export-all
 * 蜈ｨ螻･豁ｴ繧偵お繧ｯ繧ｹ繝昴・繝・
 */
router.get('/export-all', async (req, res) => {
  try {
    const { format = 'json', machineType, machineNumber } = req.query;
    console.log(`搭 蜈ｨ螻･豁ｴ繧ｨ繧ｯ繧ｹ繝昴・繝医Μ繧ｯ繧ｨ繧ｹ繝・ 蠖｢蠑・ ${format}`);

    // 繝輔ぅ繝ｫ繧ｿ繝ｼ譚｡莉ｶ繧帝←逕ｨ縺励※螻･豁ｴ繧貞叙蠕・
    let exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
    
    // 繧ｵ繝ｼ繝舌・繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ襍ｷ蜍輔＆繧後※縺・ｋ蝣ｴ蜷医・莉｣譖ｿ繝代せ
    if (!fs.existsSync(exportsDir)) {
      const alternativePath = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
      if (fs.existsSync(alternativePath)) {
        exportsDir = alternativePath;
      }
    }
    
    let allHistory: any[] = [];
    if (fs.existsSync(exportsDir)) {
      const files = fs.readdirSync(exportsDir);
      
      allHistory = files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(exportsDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
          } catch (error) {
            console.warn(`繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ: ${filePath}`, error);
            return null;
          }
        })
        .filter(item => item !== null);
    }

    // 繝輔ぅ繝ｫ繧ｿ繝ｼ驕ｩ逕ｨ
    if (machineType) {
      allHistory = allHistory.filter(item => 
        item.chatData?.machineInfo?.machineTypeName?.includes(machineType) ||
        item.chatData?.machineInfo?.selectedMachineType?.includes(machineType)
      );
    }

    if (machineNumber) {
      allHistory = allHistory.filter(item => 
        item.chatData?.machineInfo?.machineNumber?.includes(machineNumber) ||
        item.chatData?.machineInfo?.selectedMachineNumber?.includes(machineNumber)
      );
    }

    let exportData: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      // CSV蠖｢蠑上〒繧ｨ繧ｯ繧ｹ繝昴・繝・
      const csvData = allHistory.map((item, index) => ({
        'No.': index + 1,
        '繝√Ε繝・ヨID': item.chatId || '',
        '繝ｦ繝ｼ繧ｶ繝ｼID': item.userId || '',
        '讖溽ｨｮ': item.chatData?.machineInfo?.machineTypeName || '',
        '讖滓｢ｰ逡ｪ蜿ｷ': item.chatData?.machineInfo?.machineNumber || '',
        '繧ｨ繧ｯ繧ｹ繝昴・繝域律譎・: new Date(item.exportTimestamp).toLocaleString('ja-JP'),
        '繝｡繝・そ繝ｼ繧ｸ謨ｰ': item.chatData?.messages?.length || 0
      }));

      const csvContent = [
        'No.,繝√Ε繝・ヨID,繝ｦ繝ｼ繧ｶ繝ｼID,讖溽ｨｮ,讖滓｢ｰ逡ｪ蜿ｷ,繧ｨ繧ｯ繧ｹ繝昴・繝域律譎・繝｡繝・そ繝ｼ繧ｸ謨ｰ',
        ...csvData.map(row => 
          `${row['No.']},"${row['繝√Ε繝・ヨID']}","${row['繝ｦ繝ｼ繧ｶ繝ｼID']}","${row['讖溽ｨｮ']}","${row['讖滓｢ｰ逡ｪ蜿ｷ']}","${row['繧ｨ繧ｯ繧ｹ繝昴・繝域律譎・]}","${row['繝｡繝・そ繝ｼ繧ｸ謨ｰ']}"`
        )
      ].join('\n');

      exportData = csvContent;
      contentType = 'text/csv; charset=utf-8';
      filename = `all_history_${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      // JSON蠖｢蠑上〒繧ｨ繧ｯ繧ｹ繝昴・繝・
      exportData = JSON.stringify(allHistory, null, 2);
      contentType = 'application/json';
      filename = `all_history_${new Date().toISOString().slice(0, 10)}.json`;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);

  } catch (error) {
    console.error('笶・蜈ｨ螻･豁ｴ繧ｨ繧ｯ繧ｹ繝昴・繝医お繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: '蜈ｨ螻･豁ｴ縺ｮ繧ｨ繧ｯ繧ｹ繝昴・繝医↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/history/advanced-search
 * 鬮伜ｺｦ縺ｪ繝・く繧ｹ繝域､懃ｴ｢
 */
router.post('/advanced-search', async (req, res) => {
  try {
    const { searchText, limit = 50 } = req.body;
    console.log(`搭 鬮伜ｺｦ縺ｪ讀懃ｴ｢繝ｪ繧ｯ繧ｨ繧ｹ繝・ "${searchText}", 蛻ｶ髯・ ${limit}`);

    if (!searchText) {
      return res.status(400).json({
        error: '讀懃ｴ｢繝・く繧ｹ繝医′蠢・ｦ√〒縺・
      });
    }

    // 繧ｨ繧ｯ繧ｹ繝昴・繝医ョ繧｣繝ｬ繧ｯ繝医Μ縺九ｉ螻･豁ｴ繧呈､懃ｴ｢
    let exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
    
    // 繧ｵ繝ｼ繝舌・繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ襍ｷ蜍輔＆繧後※縺・ｋ蝣ｴ蜷医・莉｣譖ｿ繝代せ
    if (!fs.existsSync(exportsDir)) {
      const alternativePath = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
      if (fs.existsSync(alternativePath)) {
        exportsDir = alternativePath;
      }
    }
    
    let searchResults: any[] = [];
    if (fs.existsSync(exportsDir)) {
      const files = fs.readdirSync(exportsDir);
      
      searchResults = files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(exportsDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            // 讀懃ｴ｢繝・く繧ｹ繝医〒繝槭ャ繝√Φ繧ｰ
            const searchLower = searchText.toLowerCase();
            const contentStr = JSON.stringify(data).toLowerCase();
            
            if (contentStr.includes(searchLower)) {
              return {
                id: `export_${file.replace('.json', '')}`,
                filename: file,
                chatId: data.chatId,
                userId: data.userId,
                machineInfo: data.chatData?.machineInfo || {},
                exportTimestamp: data.exportTimestamp,
                messageCount: data.chatData?.messages?.length || 0,
                matchScore: contentStr.split(searchLower).length - 1 // 繝槭ャ繝∝屓謨ｰ
              };
            }
            return null;
          } catch (error) {
            console.warn(`讀懃ｴ｢繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ: ${filePath}`, error);
            return null;
          }
        })
        .filter(item => item !== null)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
    }

    console.log(`搭 鬮伜ｺｦ縺ｪ讀懃ｴ｢螳御ｺ・ ${searchResults.length}莉ｶ`);

    res.json({
      items: searchResults,
      total: searchResults.length,
      searchText,
      searchTerms: searchText.split(/\s+/).filter(term => term.length > 0)
    });

  } catch (error) {
    console.error('笶・鬮伜ｺｦ縺ｪ讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: '鬮伜ｺｦ縺ｪ讀懃ｴ｢縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/history/generate-report
 * 繝ｬ繝昴・繝育函謌・
 */
router.post('/generate-report', async (req, res) => {
  try {
    const { searchFilters, reportTitle, reportDescription } = req.body;
    console.log('搭 繝ｬ繝昴・繝育函謌舌Μ繧ｯ繧ｨ繧ｹ繝・', { searchFilters, reportTitle });

    // 繝輔ぅ繝ｫ繧ｿ繝ｼ譚｡莉ｶ繧帝←逕ｨ縺励※螻･豁ｴ繧貞叙蠕・
    let exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
    
    // 繧ｵ繝ｼ繝舌・繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ襍ｷ蜍輔＆繧後※縺・ｋ蝣ｴ蜷医・莉｣譖ｿ繝代せ
    if (!fs.existsSync(exportsDir)) {
      const alternativePath = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
      if (fs.existsSync(alternativePath)) {
        exportsDir = alternativePath;
      }
    }
    
    let reportData: any[] = [];
    if (fs.existsSync(exportsDir)) {
      const files = fs.readdirSync(exportsDir);
      
      reportData = files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(exportsDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
          } catch (error) {
            console.warn(`繝ｬ繝昴・繝医ヵ繧｡繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ: ${filePath}`, error);
            return null;
          }
        })
        .filter(item => item !== null);

      // 繝輔ぅ繝ｫ繧ｿ繝ｼ驕ｩ逕ｨ
      if (searchFilters) {
        if (searchFilters.machineType) {
          reportData = reportData.filter(item => 
            item.machineType?.includes(searchFilters.machineType) ||
            item.originalChatData?.machineInfo?.machineTypeName?.includes(searchFilters.machineType) ||
            item.chatData?.machineInfo?.machineTypeName?.includes(searchFilters.machineType) ||
            item.chatData?.machineInfo?.selectedMachineType?.includes(searchFilters.machineType)
          );
        }

        if (searchFilters.machineNumber) {
          reportData = reportData.filter(item => 
            item.machineNumber?.includes(searchFilters.machineNumber) ||
            item.originalChatData?.machineInfo?.machineNumber?.includes(searchFilters.machineNumber) ||
            item.chatData?.machineInfo?.machineNumber?.includes(searchFilters.machineNumber) ||
            item.chatData?.machineInfo?.selectedMachineNumber?.includes(searchFilters.machineNumber)
          );
        }

        if (searchFilters.searchText) {
          const searchLower = searchFilters.searchText.toLowerCase();
          reportData = reportData.filter(item => 
            JSON.stringify(item).toLowerCase().includes(searchLower)
          );
        }
      }
    }

    // 繝ｬ繝昴・繝医ョ繝ｼ繧ｿ繧堤函謌・
    const report = {
      title: reportTitle || '螻･豁ｴ繝ｬ繝昴・繝・,
      description: reportDescription || '',
      generatedAt: new Date().toISOString(),
      totalCount: reportData.length,
      items: reportData.map(item => ({
        chatId: item.chatId,
        userId: item.userId,
        machineType: item.machineType || item.originalChatData?.machineInfo?.machineTypeName || item.chatData?.machineInfo?.machineTypeName || '',
        machineNumber: item.machineNumber || item.originalChatData?.machineInfo?.machineNumber || item.chatData?.machineInfo?.machineNumber || '',
        exportTimestamp: item.exportTimestamp,
        messageCount: item.chatData?.messages?.length || 0
      }))
    };

    // JSON蠖｢蠑上〒繝ｬ繝昴・繝医ｒ霑斐☆
    const reportJson = JSON.stringify(report, null, 2);
    const filename = `report_${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(reportJson);

  } catch (error) {
    console.error('笶・繝ｬ繝昴・繝育函謌舌お繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: '繝ｬ繝昴・繝育函謌舌↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/history/export/:sessionId
 * 繧ｻ繝・す繝ｧ繝ｳ螻･豁ｴ繧辰SV縺ｧ繧ｨ繧ｯ繧ｹ繝昴・繝・
 */
router.get('/export/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`搭 CSV繧ｨ繧ｯ繧ｹ繝昴・繝医Μ繧ｯ繧ｨ繧ｹ繝・ ${sessionId}`);

    // 繧ｨ繧ｯ繧ｹ繝昴・繝医ョ繝ｼ繧ｿ繧貞叙蠕・
    const exportData = await HistoryService.getExportData(sessionId);
    if (!exportData) {
      return res.status(404).json({
        error: '繧ｻ繝・す繝ｧ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }

    const { session, history } = exportData;

    // CSV繝・・繧ｿ繧堤函謌・
    const csvData = history.map((item, index) => ({
      'No.': index + 1,
      '雉ｪ蝠・: item.question,
      '蝗樒ｭ・: item.answer || '',
      '逕ｻ蜒酋RL': item.imageUrl || '',
      '讖溽ｨｮ': item.machineType || session.machineType || '',
      '讖滓｢ｰ逡ｪ蜿ｷ': item.machineNumber || session.machineNumber || '',
      '菴懈・譌･譎・: new Date(item.createdAt).toLocaleString('ja-JP')
    }));

    // CSV繝倥ャ繝繝ｼ繧定ｿｽ蜉
    const csvContent = [
      // 繧ｻ繝・す繝ｧ繝ｳ諠・ｱ
      `繧ｻ繝・す繝ｧ繝ｳID,${session.id}`,
      `繧ｿ繧､繝医Ν,${session.title || ''}`,
      `讖溽ｨｮ,${session.machineType || ''}`,
      `讖滓｢ｰ逡ｪ蜿ｷ,${session.machineNumber || ''}`,
      `繧ｹ繝・・繧ｿ繧ｹ,${session.status}`,
      `菴懈・譌･譎・${new Date(session.createdAt).toLocaleString('ja-JP')}`,
      `譖ｴ譁ｰ譌･譎・${new Date(session.updatedAt).toLocaleString('ja-JP')}`,
      '', // 遨ｺ陦・
      // 螻･豁ｴ繝・・繧ｿ
      'No.,雉ｪ蝠・蝗樒ｭ・逕ｻ蜒酋RL,讖溽ｨｮ,讖滓｢ｰ逡ｪ蜿ｷ,菴懈・譌･譎・,
      ...csvData.map(row => 
        `${row['No.']},"${row['雉ｪ蝠・]}","${row['蝗樒ｭ・]}","${row['逕ｻ蜒酋RL']}","${row['讖溽ｨｮ']}","${row['讖滓｢ｰ逡ｪ蜿ｷ']}","${row['菴懈・譌･譎・]}"`
      )
    ].join('\n');

    // 繝ｬ繧ｹ繝昴Φ繧ｹ繝倥ャ繝繝ｼ繧定ｨｭ螳・
    const filename = `emergency_assistance_${sessionId}_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // CSV繝・・繧ｿ繧帝∽ｿ｡
    res.send(csvContent);

  } catch (error) {
    console.error('笶・CSV繧ｨ繧ｯ繧ｹ繝昴・繝医お繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: 'CSV繧ｨ繧ｯ繧ｹ繝昴・繝医↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/history/:sessionId
 * 繧ｻ繝・す繝ｧ繝ｳ繧貞炎髯､
 */
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`搭 繧ｻ繝・す繝ｧ繝ｳ蜑企勁繝ｪ繧ｯ繧ｨ繧ｹ繝・ ${sessionId}`);

    const success = await HistoryService.deleteSession(sessionId);
    if (!success) {
      return res.status(404).json({
        error: '繧ｻ繝・す繝ｧ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }

    res.json({
      success: true,
      message: '繧ｻ繝・す繝ｧ繝ｳ繧貞炎髯､縺励∪縺励◆'
    });

  } catch (error) {
    console.error('笶・繧ｻ繝・す繝ｧ繝ｳ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: '繧ｻ繝・す繝ｧ繝ｳ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/history/:sessionId
 * 繧ｻ繝・す繝ｧ繝ｳ繧呈峩譁ｰ
 */
router.put('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`搭 繧ｻ繝・す繝ｧ繝ｳ譖ｴ譁ｰ繝ｪ繧ｯ繧ｨ繧ｹ繝・ ${sessionId}`, req.body);

    // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    const validationResult = createSessionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: '繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ',
        details: validationResult.error.errors
      });
    }

    const data = validationResult.data;

    // 繧ｻ繝・す繝ｧ繝ｳ繧呈峩譁ｰ
    const session = await HistoryService.updateSession(sessionId, data);
    if (!session) {
      return res.status(404).json({
        error: '繧ｻ繝・す繝ｧ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }

    res.json({
      success: true,
      message: '繧ｻ繝・す繝ｧ繝ｳ繧呈峩譁ｰ縺励∪縺励◆',
      data: session
    });

  } catch (error) {
    console.error('笶・繧ｻ繝・す繝ｧ繝ｳ譖ｴ譁ｰ繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: '繧ｻ繝・す繝ｧ繝ｳ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/history/update-item
 * 螻･豁ｴ繧｢繧､繝・Β縺ｮ譖ｴ譁ｰ・・SON繝輔ぃ繧､繝ｫ縺ｫ蟾ｮ蛻・〒荳頑嶌縺堺ｿ晏ｭ假ｼ・
 */
router.put('/update-item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { updatedData, updatedBy = 'user' } = req.body;
    
    console.log('統 螻･豁ｴ繧｢繧､繝・Β譖ｴ譁ｰ繝ｪ繧ｯ繧ｨ繧ｹ繝・', { 
      id, 
      updatedDataType: typeof updatedData,
      updatedDataKeys: updatedData ? Object.keys(updatedData) : [],
      updatedBy 
    });

    // ID繧呈ｭ｣隕丞喧・・xport_繝励Ξ繝輔ぅ繝・け繧ｹ髯､蜴ｻ縺ｪ縺ｩ・・
    let normalizedId = id;
    if (id.startsWith('export_')) {
      normalizedId = id.replace('export_', '');
      // 繝輔ぃ繧､繝ｫ蜷阪・蝣ｴ蜷医・諡｡蠑ｵ蟄舌ｂ髯､蜴ｻ
      if (normalizedId.endsWith('.json')) {
        normalizedId = normalizedId.replace('.json', '');
      }
      // 繝輔ぃ繧､繝ｫ蜷阪°繧営hatId繧呈歓蜃ｺ・・縺ｧ蛹ｺ蛻・ｉ繧後◆2逡ｪ逶ｮ縺ｮ驛ｨ蛻・ｼ・
      const parts = normalizedId.split('_');
      if (parts.length >= 2 && parts[1].match(/^[a-f0-9-]+$/)) {
        normalizedId = parts[1];
      }
    }
    
    console.log('統 豁｣隕丞喧縺輔ｌ縺櫑D:', normalizedId, '蜈・・ID:', id);

    // 蜈・・JSON繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    let exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
    
    // 繧ｵ繝ｼ繝舌・繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ襍ｷ蜍輔＆繧後※縺・ｋ蝣ｴ蜷医・莉｣譖ｿ繝代せ
    if (!fs.existsSync(exportsDir)) {
      const alternativePath = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
      if (fs.existsSync(alternativePath)) {
        exportsDir = alternativePath;
        console.log('売 莉｣譖ｿ繝代せ繧剃ｽｿ逕ｨ:', alternativePath);
      }
    }

    // 繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・
    if (!fs.existsSync(exportsDir)) {
      console.log('刀 exports繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｽ懈・:', exportsDir);
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    const files = fs.readdirSync(exportsDir);
    console.log('唐 讀懃ｴ｢蟇ｾ雎｡繝輔ぃ繧､繝ｫ荳隕ｧ:', files.filter(f => f.endsWith('.json')));
    
    let targetFile = null;
    let originalData = null;
    
    // ID縺ｫ蝓ｺ縺･縺・※繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(exportsDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          
          // ID縺御ｸ閾ｴ縺吶ｋ縺九メ繧ｧ繝・け・・hatId縲（d縲√∪縺溘・繝輔ぃ繧､繝ｫ蜷阪°繧会ｼ・
          const matches = [
            data.chatId === id,
            data.id === id,
            data.chatId === normalizedId,
            data.id === normalizedId,
            file.includes(id),
            file.includes(normalizedId),
            data.chat_id === id,
            data.chat_id === normalizedId,
            // 繝輔ぃ繧､繝ｫ蜷阪°繧画歓蜃ｺ縺励◆ID縺ｨ豈碑ｼ・
            file.split('_').some(part => part === id),
            file.split('_').some(part => part === normalizedId),
            // 遏ｭ邵ｮID縺ｨ豈碑ｼ・
            id.length > 8 && (data.chatId?.startsWith(id.substring(0, 8)) || data.id?.startsWith(id.substring(0, 8))),
            normalizedId.length > 8 && (data.chatId?.startsWith(normalizedId.substring(0, 8)) || data.id?.startsWith(normalizedId.substring(0, 8)))
          ];
          
          if (matches.some(Boolean)) {
            targetFile = filePath;
            originalData = data;
            console.log('笨・蟇ｾ雎｡繝輔ぃ繧､繝ｫ逋ｺ隕・', file);
            console.log('剥 繝槭ャ繝√＠縺滓擅莉ｶ:', matches.map((m, i) => m ? i : null).filter(x => x !== null));
            break;
          }
        } catch (error) {
          console.warn(`繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ: ${filePath}`, error);
        }
      }
    }
    
    if (!targetFile || !originalData) {
      console.log('笶・蟇ｾ雎｡繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ:', {
        id,
        exportsDir,
        filesFound: files.length,
        jsonFiles: files.filter(f => f.endsWith('.json')).length
      });
      
      return res.status(404).json({ 
        error: '蟇ｾ雎｡縺ｮ螻･豁ｴ繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ',
        id: id,
        searchedDirectory: exportsDir,
        availableFiles: files.filter(f => f.endsWith('.json'))
      });
    }
    
    // 蟾ｮ蛻・ｒ驕ｩ逕ｨ縺励※譖ｴ譁ｰ・域ｷｱ縺・・繝ｼ繧ｸ・・
    const mergeData = (original: any, updates: any): any => {
      const result = { ...original };
      
      for (const [key, value] of Object.entries(updates)) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          // 繧ｪ繝悶ず繧ｧ繧ｯ繝医・蝣ｴ蜷医・蜀榊ｸｰ逧・↓繝槭・繧ｸ
          result[key] = mergeData(result[key] || {}, value);
        } else {
          // 繝励Μ繝溘ユ繧｣繝門､繧・・蛻励・逶ｴ謗･莉｣蜈･
          result[key] = value;
        }
      }
      
      return result;
    };

    const updatedJsonData = mergeData(originalData, {
      ...updatedData,
      lastModified: new Date().toISOString(),
      // 譖ｴ譁ｰ螻･豁ｴ繧定ｿｽ蜉
      updateHistory: [
        ...(originalData.updateHistory || []),
        {
          timestamp: new Date().toISOString(),
          updatedFields: Object.keys(updatedData),
          updatedBy: updatedBy
        }
      ]
    });
    
    // 繝舌ャ繧ｯ繧｢繝・・繧剃ｽ懈・・・ackupManager繧剃ｽｿ逕ｨ・・
    console.log('売 繝舌ャ繧ｯ繧｢繝・・菴懈・髢句ｧ・', {
      targetFile,
      exists: fs.existsSync(targetFile),
      fileSize: fs.existsSync(targetFile) ? fs.statSync(targetFile).size : 'N/A'
    });
    const backupPath = backupManager.createBackup(targetFile);
    console.log('沈 繝舌ャ繧ｯ繧｢繝・・菴懈・螳御ｺ・', {
      backupPath: backupPath || '繝舌ャ繧ｯ繧｢繝・・縺檎┌蜉ｹ蛹悶＆繧後※縺・∪縺・,
      success: !!backupPath
    });
    
    // 繝輔ぃ繧､繝ｫ縺ｫ荳頑嶌縺堺ｿ晏ｭ・
    fs.writeFileSync(targetFile, JSON.stringify(updatedJsonData, null, 2), 'utf8');
    
    console.log('笨・螻･豁ｴ繝輔ぃ繧､繝ｫ譖ｴ譁ｰ螳御ｺ・', targetFile);
    console.log('投 譖ｴ譁ｰ縺輔ｌ縺溘ヵ繧｣繝ｼ繝ｫ繝・', Object.keys(updatedData));
    
    res.json({
      success: true,
      message: '螻･豁ｴ繝輔ぃ繧､繝ｫ縺梧峩譁ｰ縺輔ｌ縺ｾ縺励◆',
      updatedFile: path.basename(targetFile),
      updatedData: updatedJsonData,
      backupFile: backupPath ? path.basename(backupPath) : null,
      backupPath: backupPath
    });
    
  } catch (error) {
    console.error('笶・螻･豁ｴ繧｢繧､繝・Β譖ｴ譁ｰ繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({ 
      error: '螻･豁ｴ繧｢繧､繝・Β縺ｮ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

/**
 * GET /api/history/export-files
 * 繧ｨ繧ｯ繧ｹ繝昴・繝医ヵ繧｡繧､繝ｫ荳隕ｧ蜿門ｾ・
 */
router.get('/export-files', async (req, res) => {
  try {
    let exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
    
    // 繧ｵ繝ｼ繝舌・繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ襍ｷ蜍輔＆繧後※縺・ｋ蝣ｴ蜷医・莉｣譖ｿ繝代せ
    if (!fs.existsSync(exportsDir)) {
      const alternativePath = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
      if (fs.existsSync(alternativePath)) {
        exportsDir = alternativePath;
      }
    }
    
    if (!fs.existsSync(exportsDir)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(exportsDir);
    const exportFiles = files
      .filter(file => file.endsWith('.json'))
      .filter(file => !file.includes('.backup.')) // 繝舌ャ繧ｯ繧｢繝・・繝輔ぃ繧､繝ｫ繧帝勁螟・
      .filter(file => !file.startsWith('test-backup-')) // 繝・せ繝医ヵ繧｡繧､繝ｫ繧帝勁螟・
      .map(file => {
        const filePath = path.join(exportsDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          return {
            fileName: file,
            filePath: filePath,
            chatId: data.chatId || data.id || 'unknown',
            title: data.title || data.problemDescription || '繧ｿ繧､繝医Ν縺ｪ縺・,
            createdAt: data.createdAt || data.exportTimestamp || new Date().toISOString(),
            lastModified: fs.statSync(filePath).mtime.toISOString(),
            size: fs.statSync(filePath).size
          };
        } catch (error) {
          console.warn(`繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ: ${filePath}`, error);
          return null;
        }
      })
      .filter(item => item !== null);
    
    res.json(exportFiles);
    
  } catch (error) {
    console.error('笶・繧ｨ繧ｯ繧ｹ繝昴・繝医ヵ繧｡繧､繝ｫ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({ 
      error: '繧ｨ繧ｯ繧ｹ繝昴・繝医ヵ繧｡繧､繝ｫ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/history/statistics
 * 邨ｱ險域ュ蝣ｱ繧貞叙蠕・
 */
router.get('/statistics', async (req, res) => {
  try {
    console.log('搭 邨ｱ險域ュ蝣ｱ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・);

    const statistics = await HistoryService.getStatistics();

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('笶・邨ｱ險域ュ蝣ｱ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: '邨ｱ險域ュ蝣ｱ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/history/backups/:fileName
 * 謖・ｮ壹ヵ繧｡繧､繝ｫ縺ｮ繝舌ャ繧ｯ繧｢繝・・荳隕ｧ蜿門ｾ・
 */
router.get('/backups/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
    const targetFile = path.join(exportsDir, fileName);
    
    if (!fs.existsSync(targetFile)) {
      return res.status(404).json({ error: '繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
    }
    
    const backups = backupManager.listBackups(targetFile);
    res.json(backups);
  } catch (error) {
    console.error('繝舌ャ繧ｯ繧｢繝・・荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '繝舌ャ繧ｯ繧｢繝・・荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

/**
 * POST /api/history/backups/restore
 * 繝舌ャ繧ｯ繧｢繝・・縺九ｉ蠕ｩ蜈・
 */
router.post('/backups/restore', async (req, res) => {
  try {
    const { backupPath, targetFileName } = req.body;
    const exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
    const targetFile = path.join(exportsDir, targetFileName);
    
    backupManager.restoreFromBackup(backupPath, targetFile);
    
    res.json({ 
      success: true, 
      message: '繝舌ャ繧ｯ繧｢繝・・縺九ｉ蠕ｩ蜈・＠縺ｾ縺励◆',
      restoredFile: targetFileName
    });
  } catch (error) {
    console.error('繝舌ャ繧ｯ繧｢繝・・蠕ｩ蜈・お繝ｩ繝ｼ:', error);
    res.status(500).json({ 
      error: '繝舌ャ繧ｯ繧｢繝・・縺九ｉ縺ｮ蠕ｩ蜈・↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/history/backup-config
 * 繝舌ャ繧ｯ繧｢繝・・險ｭ螳壼叙蠕・
 */
router.get('/backup-config', (req, res) => {
  try {
    const config = backupManager.getConfig();
    res.json(config);
  } catch (error) {
    console.error('繝舌ャ繧ｯ繧｢繝・・險ｭ螳壼叙蠕励お繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '繝舌ャ繧ｯ繧｢繝・・險ｭ螳壹・蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

/**
 * PUT /api/history/backup-config
 * 繝舌ャ繧ｯ繧｢繝・・險ｭ螳壽峩譁ｰ
 */
router.put('/backup-config', (req, res) => {
  try {
    const newConfig = req.body;
    backupManager.updateConfig(newConfig);
    
    res.json({ 
      success: true, 
      message: '繝舌ャ繧ｯ繧｢繝・・險ｭ螳壹ｒ譖ｴ譁ｰ縺励∪縺励◆',
      config: backupManager.getConfig()
    });
  } catch (error) {
    console.error('繝舌ャ繧ｯ繧｢繝・・險ｭ螳壽峩譁ｰ繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({ 
      error: '繝舌ャ繧ｯ繧｢繝・・險ｭ螳壹・譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as historyRouter };
