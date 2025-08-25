import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { loadKnowledgeBaseIndex } from '../lib/knowledge-base.js';
import { knowledgeBase } from '../knowledge-base-service.js';

const router = express.Router();

// 繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝臥畑縺ｮmulter險ｭ螳・
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB蛻ｶ髯・
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.pdf', '.xlsx', '.pptx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('繧ｵ繝昴・繝医＆繧後※縺・↑縺・ヵ繧｡繧､繝ｫ蠖｢蠑上〒縺・));
    }
  }
});

// 繝輔ぃ繧､繝ｫ縺九ｉ繝・く繧ｹ繝医ｒ謚ｽ蜃ｺ縺吶ｋ髢｢謨ｰ
async function extractTextFromFile(filePath: string, originalName: string): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();
  
  try {
    switch (ext) {
      case '.txt':
        return await fsPromises.readFile(filePath, 'utf-8');
      
      case '.pdf':
        console.log('PDF蜃ｦ逅・・譛ｪ螳溯｣・・縺溘ａ縲√ヵ繧｡繧､繝ｫ蜷阪・縺ｿ菫晏ｭ・);
        return `PDF file: ${originalName}`;
      
      case '.xlsx':
        console.log('Excel蜃ｦ逅・・譛ｪ螳溯｣・・縺溘ａ縲√ヵ繧｡繧､繝ｫ蜷阪・縺ｿ菫晏ｭ・);
        return `Excel file: ${originalName}`;
      
      case '.pptx':
        console.log('PowerPoint蜃ｦ逅・・譛ｪ螳溯｣・・縺溘ａ縲√ヵ繧｡繧､繝ｫ蜷阪・縺ｿ菫晏ｭ・);
        return `PowerPoint file: ${originalName}`;
      
      default:
        throw new Error(`繧ｵ繝昴・繝医＆繧後※縺・↑縺・ヵ繧｡繧､繝ｫ蠖｢蠑・ ${ext}`);
    }
  } catch (error) {
    console.error('繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ:', error);
    return `Error processing file: ${originalName}`;
  }
}

/**
 * GET /api/files/processed
 * 蜃ｦ逅・ｸ医∩繝輔ぃ繧､繝ｫ荳隕ｧ繧貞叙蠕・
 */
router.get('/processed', async (req, res) => {
  try {
    console.log('刀 蜃ｦ逅・ｸ医∩繝輔ぃ繧､繝ｫ荳隕ｧ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・);
    
    // knowledge-base/index.json縺九ｉ繝峨く繝･繝｡繝ｳ繝域ュ蝣ｱ繧貞叙蠕・
    const index = loadKnowledgeBaseIndex();
    
    // documents驟榊・縺悟ｭ伜惠縺励↑縺・ｴ蜷医・蛻晄悄蛹・
    if (!index.documents) {
      index.documents = [];
    }
    
    console.log(`笨・蜃ｦ逅・ｸ医∩繝輔ぃ繧､繝ｫ蜿門ｾ玲・蜉・ ${index.documents.length}莉ｶ`);
    
    res.json({
      success: true,
      data: index.documents,
      total: index.documents.length,
      message: index.documents.length > 0 ? '蜃ｦ逅・ｸ医∩繝輔ぃ繧､繝ｫ繧貞叙蠕励＠縺ｾ縺励◆' : '蜃ｦ逅・ｸ医∩繝輔ぃ繧､繝ｫ縺後≠繧翫∪縺帙ｓ',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('笶・蜃ｦ逅・ｸ医∩繝輔ぃ繧､繝ｫ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '蜃ｦ逅・ｸ医∩繝輔ぃ繧､繝ｫ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 繝輔ぃ繧､繝ｫ繧､繝ｳ繝昴・繝医お繝ｳ繝峨・繧､繝ｳ繝・
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '繝輔ぃ繧､繝ｫ縺碁∈謚槭＆繧後※縺・∪縺帙ｓ' });
    }

    const { originalname, path: tempPath } = req.file;
    const category = req.body.category || 'general';

    console.log(`繝輔ぃ繧､繝ｫ繧､繝ｳ繝昴・繝磯幕蟋・ ${originalname}`);

    // 繝輔ぃ繧､繝ｫ縺九ｉ繝・く繧ｹ繝医ｒ謚ｽ蜃ｺ
    const extractedText = await extractTextFromFile(tempPath, originalname);

    // 繧､繝ｳ繝昴・繝医ョ繝ｼ繧ｿ縺ｮ讒矩蛹・
    const importedData = {
      metadata: {
        importId: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalFileName: originalname,
        importedAt: new Date().toISOString(),
        category: category,
        fileType: path.extname(originalname).toLowerCase(),
        processedBy: 'file-import-system'
      },
      content: {
        extractedText: extractedText,
        summary: `Imported from ${originalname}`,
        source: 'file-import'
      },
      processing: {
        status: 'completed',
        processedAt: new Date().toISOString(),
        extractionMethod: 'automatic'
      }
    };

    // knowledge-base/vehicle-maintenance繝輔か繝ｫ繝縺ｫ菫晏ｭ・
    const fileName = `import_${Date.now()}_${originalname.replace(/[\\/:*?"<>|]/g, '_')}.json`;
    const filePath = `vehicle-maintenance/${fileName}`;
    
    await knowledgeBase.writeJSON(filePath, importedData);

    // 荳譎ゅヵ繧｡繧､繝ｫ繧貞炎髯､
    try {
      await fsPromises.unlink(tempPath);
    } catch (error) {
      console.warn('荳譎ゅヵ繧｡繧､繝ｫ縺ｮ蜑企勁縺ｫ螟ｱ謨・', error);
    }

    console.log(`繝輔ぃ繧､繝ｫ繧､繝ｳ繝昴・繝亥ｮ御ｺ・ ${originalname} -> ${filePath}`);

    res.json({
      success: true,
      message: '繝輔ぃ繧､繝ｫ縺梧ｭ｣蟶ｸ縺ｫ繧､繝ｳ繝昴・繝医＆繧後∪縺励◆',
      fileName: fileName,
      originalName: originalname,
      savedPath: filePath,
      processedEntries: 1,
      importId: importedData.metadata.importId
    });

  } catch (error) {
    console.error('繝輔ぃ繧､繝ｫ繧､繝ｳ繝昴・繝医お繝ｩ繝ｼ:', error);
    
    // 荳譎ゅヵ繧｡繧､繝ｫ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・
    if (req.file?.path) {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('荳譎ゅヵ繧｡繧､繝ｫ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺ｫ螟ｱ謨・', cleanupError);
      }
    }

    res.status(500).json({
      error: '繝輔ぃ繧､繝ｫ縺ｮ繧､繝ｳ繝昴・繝医↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ'
    });
  }
});

// 繧､繝ｳ繝昴・繝域ｸ医∩繝輔ぃ繧､繝ｫ縺ｮ荳隕ｧ蜿門ｾ・
router.get('/imports', async (req, res) => {
  try {
    const files = await knowledgeBase.listFiles('vehicle-maintenance');
    const importFiles = files.filter(file => file.startsWith('import_') && file.endsWith('.json'));
    
    const fileDetails = await Promise.all(
      importFiles.map(async (file) => {
        try {
          const data = await knowledgeBase.readJSON(`vehicle-maintenance/${file}`);
          return {
            fileName: file,
            originalName: data.metadata?.originalFileName || 'Unknown',
            importedAt: data.metadata?.importedAt || 'Unknown',
            category: data.metadata?.category || 'general',
            fileType: data.metadata?.fileType || 'unknown',
            importId: data.metadata?.importId || 'unknown'
          };
        } catch (error) {
          console.error(`繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ: ${file}`, error);
          return {
            fileName: file,
            originalName: 'Error',
            importedAt: 'Error',
            category: 'error',
            fileType: 'error',
            importId: 'error'
          };
        }
      })
    );

    res.json({
      success: true,
      imports: fileDetails,
      total: fileDetails.length
    });

  } catch (error) {
    console.error('繧､繝ｳ繝昴・繝井ｸ隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: '繧､繝ｳ繝昴・繝井ｸ隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ'
    });
  }
});

export default router; 