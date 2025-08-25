import { Router } from 'express';
import { authenticateToken as requireAuth } from '../middleware/auth.js';
import { processOpenAIRequest } from '../lib/openai.js';
import { searchKnowledgeBase } from '../lib/knowledge-base.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// Q&A繧ｻ繝・す繝ｧ繝ｳ縺九ｉ蟄ｦ鄙偵ョ繝ｼ繧ｿ繧堤函謌・
router.post('/generate-learning-data', requireAuth, async (req, res) => {
  try {
    const { 
      question, 
      answer, 
      solution, 
      success, 
      category = 'troubleshooting',
      machineType,
      machineNumber,
      timestamp 
    } = req.body;

    if (!question || !answer || !solution) {
      return res.status(400).json({
        success: false,
        error: '蠢・医ヱ繝ｩ繝｡繝ｼ繧ｿ縺御ｸ崎ｶｳ縺励※縺・∪縺・
      });
    }

    // 蟄ｦ鄙偵ョ繝ｼ繧ｿ逕滓・縺ｮ繝励Ο繝ｳ繝励ヨ
    const learningPrompt = `
莉･荳九・Q&A繧ｻ繝・す繝ｧ繝ｳ縺九ｉ蟄ｦ鄙偵ョ繝ｼ繧ｿ繧堤函謌舌＠縺ｦ縺上□縺輔＞・・

**雉ｪ蝠・*: ${question}
**蝗樒ｭ・*: ${answer}
**隗｣豎ｺ遲・*: ${solution}
**謌仙粥**: ${success}
**讖溽ｨｮ**: ${machineType || '荳肴・'}
**讖滓｢ｰ逡ｪ蜿ｷ**: ${machineNumber || '荳肴・'}
**繧ｫ繝・ざ繝ｪ**: ${category}

縺薙・諠・ｱ繧偵リ繝ｬ繝・ず繝吶・繧ｹ縺ｫ霑ｽ蜉縺吶ｋ縺溘ａ縺ｮ讒矩蛹悶ョ繝ｼ繧ｿ繧堤函謌舌＠縺ｦ縺上□縺輔＞縲・
莉･荳九・JSON蠖｢蠑上〒霑斐＠縺ｦ縺上□縺輔＞・・

{
  "category": "繧ｫ繝・ざ繝ｪ蜷・,
  "keywords": ["繧ｭ繝ｼ繝ｯ繝ｼ繝・", "繧ｭ繝ｼ繝ｯ繝ｼ繝・", "繧ｭ繝ｼ繝ｯ繝ｼ繝・"],
  "summary": "蝠城｡後→隗｣豎ｺ遲悶・隕∫ｴ・ｼ・00譁・ｭ嶺ｻ･蜀・ｼ・,
  "problem": "逋ｺ逕溘＠縺溷撫鬘後・隧ｳ邏ｰ",
  "solution": "蜈ｷ菴鍋噪縺ｪ隗｣豎ｺ謇矩・,
  "prevention": "蜀咲匱髦ｲ豁｢遲・,
  "difficulty": "髮｣譏灘ｺｦ・亥・邏・荳ｭ邏・荳顔ｴ夲ｼ・,
  "estimatedTime": "謗ｨ螳夊ｧ｣豎ｺ譎る俣・亥・・・,
  "requiredTools": ["蠢・ｦ√↑蟾･蜈ｷ1", "蠢・ｦ√↑蟾･蜈ｷ2"],
  "safetyNotes": "螳牙・荳翫・豕ｨ諢丈ｺ矩・,
  "relatedKnowledge": ["髢｢騾｣縺吶ｋ遏･隴・", "髢｢騾｣縺吶ｋ遏･隴・"]
}
`;

    const response = await processOpenAIRequest(learningPrompt, false);
    
    let learningData;
    try {
      learningData = JSON.parse(response);
    } catch (parseError) {
      console.error('蟄ｦ鄙偵ョ繝ｼ繧ｿ縺ｮJSON隗｣譫舌お繝ｩ繝ｼ:', parseError);
      return res.status(500).json({
        success: false,
        error: '蟄ｦ鄙偵ョ繝ｼ繧ｿ縺ｮ逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆'
      });
    }

    // 蟄ｦ鄙偵ョ繝ｼ繧ｿ繧剃ｿ晏ｭ假ｼ亥ｮ滄圀縺ｮ螳溯｣・〒縺ｯ繝・・繧ｿ繝吶・繧ｹ縺ｫ菫晏ｭ假ｼ・
    const savedData = {
      id: `learning_${Date.now()}`,
      ...learningData,
      originalQuestion: question,
      originalAnswer: answer,
      originalSolution: solution,
      success: success,
      machineType,
      machineNumber,
      category,
      timestamp: timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // 繝翫Ξ繝・ず繝吶・繧ｹ縺ｫ霑ｽ蜉
    await addToKnowledgeBase(savedData);

    res.json({
      success: true,
      data: savedData,
      message: '蟄ｦ鄙偵ョ繝ｼ繧ｿ縺梧ｭ｣蟶ｸ縺ｫ逕滓・繝ｻ菫晏ｭ倥＆繧後∪縺励◆'
    });

  } catch (error) {
    console.error('蟄ｦ鄙偵ョ繝ｼ繧ｿ逕滓・繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '蟄ｦ鄙偵ョ繝ｼ繧ｿ縺ｮ逕滓・荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
    });
  }
});

// 繝翫Ξ繝・ず繝吶・繧ｹ縺ｫ蟄ｦ鄙偵ョ繝ｼ繧ｿ繧定ｿｽ蜉
async function addToKnowledgeBase(learningData: any) {
  try {
    // 蟄ｦ鄙偵ョ繝ｼ繧ｿ繧偵リ繝ｬ繝・ず繝吶・繧ｹ縺ｮ蠖｢蠑上↓螟画鋤
    const knowledgeContent = `
# ${learningData.category} - ${learningData.summary}

## 蝠城｡・
${learningData.problem}

## 隗｣豎ｺ遲・
${learningData.solution}

## 蜀咲匱髦ｲ豁｢遲・
${learningData.prevention}

## 隧ｳ邏ｰ諠・ｱ
- **髮｣譏灘ｺｦ**: ${learningData.difficulty}
- **謗ｨ螳壽凾髢・*: ${learningData.estimatedTime}蛻・
- **蠢・ｦ√↑蟾･蜈ｷ**: ${learningData.requiredTools.join(', ')}
- **螳牙・荳翫・豕ｨ諢・*: ${learningData.safetyNotes}
- **髢｢騾｣遏･隴・*: ${learningData.relatedKnowledge.join(', ')}

## 蜈・・Q&A
**雉ｪ蝠・*: ${learningData.originalQuestion}
**蝗樒ｭ・*: ${learningData.originalAnswer}
**隗｣豎ｺ遲・*: ${learningData.originalSolution}
**謌仙粥**: ${learningData.success}
**讖溽ｨｮ**: ${learningData.machineType || '荳肴・'}
**讖滓｢ｰ逡ｪ蜿ｷ**: ${learningData.machineNumber || '荳肴・'}

---
逕滓・譌･譎・ ${learningData.createdAt}
`;

    // 繝輔ぃ繧､繝ｫ縺ｨ縺励※菫晏ｭ・
    const knowledgeDir = path.join(process.cwd(), 'knowledge-base', 'learning');
    if (!fs.existsSync(knowledgeDir)) {
      fs.mkdirSync(knowledgeDir, { recursive: true });
    }

    const fileName = `learning_${Date.now()}.json`;
    const filePath = path.join(knowledgeDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify({
      content: knowledgeContent,
      metadata: learningData,
      keywords: learningData.keywords,
      category: learningData.category
    }, null, 2));

    console.log(`蟄ｦ鄙偵ョ繝ｼ繧ｿ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆: ${filePath}`);

  } catch (error) {
    console.error('繝翫Ξ繝・ず繝吶・繧ｹ縺ｸ縺ｮ霑ｽ蜉繧ｨ繝ｩ繝ｼ:', error);
    throw error;
  }
}

// 蟄ｦ鄙偵ョ繝ｼ繧ｿ縺ｮ荳隕ｧ蜿門ｾ・
router.get('/learning-data', requireAuth, async (req, res) => {
  try {
    const knowledgeDir = path.join(process.cwd(), 'knowledge-base', 'learning');
    
    if (!fs.existsSync(knowledgeDir)) {
      return res.json({
        success: true,
        data: []
      });
    }

    const files = fs.readdirSync(knowledgeDir)
      .filter((file: string) => file.endsWith('.json'))
      .sort((a: string, b: string) => {
        const aTime = fs.statSync(path.join(knowledgeDir, a)).mtime.getTime();
        const bTime = fs.statSync(path.join(knowledgeDir, b)).mtime.getTime();
        return bTime - aTime;
      });

    const learningData = files.map((file: string) => {
      try {
        const filePath = path.join(knowledgeDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        return {
          id: file.replace('.json', ''),
          ...data.metadata,
          content: data.content
        };
      } catch (error) {
        console.error(`繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ: ${file}`, error);
        return null;
      }
    }).filter(Boolean);

    res.json({
      success: true,
      data: learningData
    });

  } catch (error) {
    console.error('蟄ｦ鄙偵ョ繝ｼ繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '蟄ｦ鄙偵ョ繝ｼ繧ｿ縺ｮ蜿門ｾ嶺ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
    });
  }
});

// 蟄ｦ鄙偵ョ繝ｼ繧ｿ縺ｮ蜑企勁
router.delete('/learning-data/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const knowledgeDir = path.join(process.cwd(), 'knowledge-base', 'learning');
    const filePath = path.join(knowledgeDir, `${id}.json`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: '蟄ｦ鄙偵ョ繝ｼ繧ｿ縺悟炎髯､縺輔ｌ縺ｾ縺励◆'
      });
    } else {
      res.status(404).json({
        success: false,
        error: '謖・ｮ壹＆繧後◆蟄ｦ鄙偵ョ繝ｼ繧ｿ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }

  } catch (error) {
    console.error('蟄ｦ鄙偵ョ繝ｼ繧ｿ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '蟄ｦ鄙偵ョ繝ｼ繧ｿ縺ｮ蜑企勁荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
    });
  }
});

export default router;
