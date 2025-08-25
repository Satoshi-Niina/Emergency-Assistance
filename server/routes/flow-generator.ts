import * as express from 'express';
import * as path from 'path';
import { existsSync, writeFileSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'fs';
import { processOpenAIRequest } from '../lib/openai.js';
import { searchKnowledgeBase } from '../lib/knowledge-base.js';
import { cleanJsonResponse } from '../lib/json-helper.js';
// import { db } from '../db/index.js';
// import { emergencyFlows } from '../db/schema.js';

const router = express.Router();
// 遏･隴倥・繝ｼ繧ｹ繝・ぅ繝ｬ繧ｯ繝医Μ
const knowledgeBaseDir = path.join(process.cwd(), '..', 'knowledge-base');
const jsonDir: any = path.join(knowledgeBaseDir, 'json');
const troubleshootingDir: any = path.join(knowledgeBaseDir, 'troubleshooting');
// 繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・
if (!existsSync(troubleshootingDir)) {
    mkdirSync(troubleshootingDir, { recursive: true });
}
// 繝・ヰ繝・げ逕ｨ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.get('/debug', (req, res) => {
  res.json({
    success: true,
    data: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
      OPENAI_API_KEY_PREFIX: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'NOT FOUND',
      OPENAI_API_KEY_LENGTH: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
      NODE_ENV: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }
  });
});

// 繧ｭ繝ｼ繝ｯ繝ｼ繝峨°繧峨ヵ繝ｭ繝ｼ繧堤函謌舌☆繧九お繝ｳ繝峨・繧､繝ｳ繝茨ｼ井ｺ呈鋤諤ｧ縺ｮ縺溘ａ・・
router.post('/keywords', async (req, res) => {
  try {
    const { keywords } = req.body;
    if (!keywords || typeof keywords !== 'string' || !keywords.trim()) {
      return res.status(400).json({
        success: false,
        error: '繧ｭ繝ｼ繝ｯ繝ｼ繝峨′謖・ｮ壹＆繧後※縺・∪縺帙ｓ'
      });
    }
    console.log(`繧ｭ繝ｼ繝ｯ繝ｼ繝・"${keywords}" 縺九ｉ繝輔Ο繝ｼ繧堤函謌舌＠縺ｾ縺兪);
    
    // 邁｡蜊倥↑繝輔Ο繝ｼ繧堤函謌撰ｼ医ム繝溘・螳溯｣・ｼ・
    const flowData = {
      id: `flow_${Date.now()}`,
      title: `繧ｭ繝ｼ繝ｯ繝ｼ繝臥函謌舌ヵ繝ｭ繝ｼ: ${keywords}`,
      description: `繧ｭ繝ｼ繝ｯ繝ｼ繝峨・{keywords}縲阪°繧芽・蜍慕函謌舌＆繧後◆繝輔Ο繝ｼ`,
      triggerKeywords: keywords.split(',').map(k => k.trim()),
      steps: [
        {
          id: 'step1',
          title: '髢句ｧ・,
          description: `繧ｭ繝ｼ繝ｯ繝ｼ繝峨・{keywords}縲阪↓髢｢縺吶ｋ蠢懈･蜃ｦ鄂ｮ繧帝幕蟋九＠縺ｾ縺兪,
          message: `繧ｭ繝ｼ繝ｯ繝ｼ繝峨・{keywords}縲阪↓髢｢縺吶ｋ蠢懈･蜃ｦ鄂ｮ繧帝幕蟋九＠縺ｾ縺兪,
          type: 'step',
          options: []
        },
        {
          id: 'step2',
          title: '迥ｶ豕∫｢ｺ隱・,
          description: '迴ｾ蝨ｨ縺ｮ迥ｶ豕√ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞',
          message: '迴ｾ蝨ｨ縺ｮ迥ｶ豕√ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞',
          type: 'condition',
          conditions: [
            {
              label: '蝠城｡瑚ｧ｣豎ｺ',
              nextId: 'step3'
            },
            {
              label: '蝠城｡檎ｶ咏ｶ・,
              nextId: 'step4'
            }
          ]
        },
        {
          id: 'step3',
          title: '螳御ｺ・,
          description: '蠢懈･蜃ｦ鄂ｮ縺悟ｮ御ｺ・＠縺ｾ縺励◆',
          message: '蠢懈･蜃ｦ鄂ｮ縺悟ｮ御ｺ・＠縺ｾ縺励◆',
          type: 'step',
          options: []
        },
        {
          id: 'step4',
          title: '蟆る摩螳ｶ騾｣邨｡',
          description: '蟆る摩螳ｶ縺ｫ騾｣邨｡縺励※縺上□縺輔＞',
          message: '蟆る摩螳ｶ縺ｫ騾｣邨｡縺励※縺上□縺輔＞',
          type: 'step',
          options: []
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // knowledge-base/troubleshooting繝輔か繝ｫ繝縺ｫ菫晏ｭ・
    try {
      const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
      const filePath = path.join(troubleshootingDir, `${flowData.id}.json`);
      
      // 繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・
      if (!existsSync(troubleshootingDir)) {
        mkdirSync(troubleshootingDir, { recursive: true });
      }
      
      // 繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ・
      writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf8');
      
      console.log('笨・繧ｭ繝ｼ繝ｯ繝ｼ繝峨ヵ繝ｭ繝ｼ菫晏ｭ俶・蜉・', {
        id: flowData.id,
        title: flowData.title,
        filePath: filePath
      });
    } catch (fileError) {
      console.error('笶・繝輔ぃ繧､繝ｫ菫晏ｭ倥お繝ｩ繝ｼ:', fileError);
      return res.status(500).json({
        success: false,
        error: '繝輔ぃ繧､繝ｫ縺ｸ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆',
        details: fileError instanceof Error ? fileError.message : 'Unknown file error'
      });
    }
    
    res.json({
      success: true,
      message: `繝輔Ο繝ｼ縺梧ｭ｣蟶ｸ縺ｫ逕滓・縺輔ｌ縺ｾ縺励◆: ${flowData.title}`,
      flowData
    });
  } catch (error) {
    console.error('繝輔Ο繝ｼ逕滓・繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繝輔Ο繝ｼ縺ｮ逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆'
    });
  }
});

// 繧ｭ繝ｼ繝ｯ繝ｼ繝峨°繧峨ヵ繝ｭ繝ｼ繧堤函謌舌☆繧九お繝ｳ繝峨・繧､繝ｳ繝茨ｼ亥・縺ｮ螳溯｣・ｼ・
router.post('/generate-from-keywords', async (req, res) => {
    try {
        console.log('[DEBUG] generate-from-keywords endpoint called');
        
        const { keywords } = req.body;
        if (!keywords || typeof keywords !== 'string' || !keywords.trim()) {
            return res.status(400).json({
                success: false,
                error: '繧ｭ繝ｼ繝ｯ繝ｼ繝峨′謖・ｮ壹＆繧後※縺・∪縺帙ｓ'
            });
        }
        console.log(`繧ｭ繝ｼ繝ｯ繝ｼ繝・"${keywords}" 縺九ｉ繝輔Ο繝ｼ繧堤函謌舌＠縺ｾ縺兪);
        
        // OpenAI API繧ｭ繝ｼ縺ｮ遒ｺ隱・
        console.log('[DEBUG] Checking OpenAI API key...');
        console.log('[DEBUG] process.env.OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'EXISTS' : 'NOT EXISTS');
        
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
            console.log('[DEBUG] OpenAI API key validation failed - missing or default value');
            return res.status(400).json({
                success: false,
                error: 'OpenAI API繧ｭ繝ｼ縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ縲ら腸蠅・､画焚OPENAI_API_KEY繧定ｨｭ螳壹＠縺ｦ縺上□縺輔＞縲・,
                details: '髢狗匱迺ｰ蠅・〒縺ｯ.env繝輔ぃ繧､繝ｫ縺ｫOPENAI_API_KEY繧定ｨｭ螳壹＠縺ｦ縺上□縺輔＞縲・
            });
        }
        
        // API繧ｭ繝ｼ縺ｮ蠖｢蠑冗｢ｺ隱・
        if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
            console.log('[DEBUG] OpenAI API key validation failed - invalid format');
            return res.status(400).json({
                success: false,
                error: 'OpenAI API繧ｭ繝ｼ縺ｮ蠖｢蠑上′辟｡蜉ｹ縺ｧ縺吶・,
                details: 'API繧ｭ繝ｼ縺ｯ縲茎k-縲阪〒蟋九∪繧句ｿ・ｦ√′縺ゅｊ縺ｾ縺吶・
            });
        }
        
        console.log('[DEBUG] OpenAI API Key validation passed');
        console.log('[DEBUG] OpenAI API Key validation:', {
            exists: !!process.env.OPENAI_API_KEY,
            startsWithSk: process.env.OPENAI_API_KEY.startsWith('sk-'),
            keyLength: process.env.OPENAI_API_KEY.length,
            prefix: process.env.OPENAI_API_KEY.substring(0, 10) + '...'
        });
        
        // OpenAI繧ｯ繝ｩ繧､繧｢繝ｳ繝医・迥ｶ諷九ｒ遒ｺ隱・
        console.log('[DEBUG] Importing OpenAI modules...');
        const { processOpenAIRequest, getOpenAIClientStatus } = await import('../lib/openai.js');
        console.log('[DEBUG] processOpenAIRequest function imported successfully');
        
        // OpenAI繧ｯ繝ｩ繧､繧｢繝ｳ繝医・隧ｳ邏ｰ縺ｪ迥ｶ諷九ｒ遒ｺ隱・
        const clientStatus = getOpenAIClientStatus();
        console.log('[DEBUG] OpenAI Client Status:', clientStatus);
        
        if (!clientStatus.clientExists) {
            return res.status(400).json({
                success: false,
                error: 'OpenAI繧ｯ繝ｩ繧､繧｢繝ｳ繝医′蛻晄悄蛹悶＆繧後※縺・∪縺帙ｓ',
                details: clientStatus
            });
        }
        
        // 繝翫Ξ繝・ず繝吶・繧ｹ縺九ｉ髢｢騾｣諠・ｱ繧呈､懃ｴ｢
        console.log('繝翫Ξ繝・ず繝吶・繧ｹ縺九ｉ髢｢騾｣諠・ｱ繧呈､懃ｴ｢荳ｭ...');
        const relevantChunks: any = await searchKnowledgeBase(keywords);
        console.log(`髢｢騾｣繝√Ε繝ｳ繧ｯ謨ｰ: ${relevantChunks.length}`);
        
        // 髢｢騾｣諠・ｱ繧偵・繝ｭ繝ｳ繝励ヨ縺ｫ霑ｽ蜉縺吶ｋ縺溘ａ縺ｮ譁・ｭ怜・繧呈ｧ狗ｯ・
        let relatedKnowledgeText = '';
        if (relevantChunks.length > 0) {
            relatedKnowledgeText = '\n\n縲宣未騾｣縺吶ｋ遏･隴倥・繝ｼ繧ｹ諠・ｱ縲・\n';
            // 譛螟ｧ5繝√Ε繝ｳ繧ｯ縺ｾ縺ｧ霑ｽ蜉(螟壹☆縺弱ｋ縺ｨ繝医・繧ｯ繝ｳ謨ｰ蛻ｶ髯舌↓驕斐☆繧句庄閭ｽ諤ｧ縺後≠繧・
            const chunksToInclude: any = relevantChunks.slice(0, 5);
            for (const chunk of chunksToInclude) {
                relatedKnowledgeText += `---\n蜃ｺ蜈ｸ: ${chunk.metadata.source || '荳肴・'}\n\n${chunk.text}\n---\n\n`;
            }
        }
        
        // GPT縺ｫ貂｡縺吝ｼｷ蛹悶＆繧後◆繝励Ο繝ｳ繝励ヨ
        const prompt = `莉･荳九・繧ｭ繝ｼ繝ｯ繝ｼ繝峨↓髢｢騾｣縺吶ｋ蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧堤函謌舌＠縺ｦ縺上□縺輔＞縲・
蠢・★螳悟・縺ｪJSON繧ｪ繝悶ず繧ｧ繧ｯ繝医・縺ｿ繧定ｿ斐＠縺ｦ縺上□縺輔＞縲りｿｽ蜉縺ｮ隱ｬ譏弱ｄ繝・く繧ｹ繝医・荳蛻・性繧√↑縺・〒縺上□縺輔＞縲・
繝ｬ繧ｹ繝昴Φ繧ｹ縺ｯ邏皮ｲ九↑JSON繝・・繧ｿ縺縺代〒縺ゅｋ縺ｹ縺阪〒縲√さ繝ｼ繝峨ヶ繝ｭ繝・け縺ｮ繝槭・繧ｯ繝繧ｦ繝ｳ險俶ｳ輔・菴ｿ逕ｨ縺励↑縺・〒縺上□縺輔＞縲・
逕滓・縺吶ｋJSON縺ｯ螳悟・縺ｪ譛牙柑縺ｪJSON縺ｧ縺ゅｋ蠢・ｦ√′縺ゅｊ縲・比ｸｭ縺ｧ蛻・ｌ縺溘ｊ荳榊ｮ悟・縺ｪ讒矩縺ｧ縺ゅ▲縺ｦ縺ｯ縺ｪ繧翫∪縺帙ｓ縲・
迚ｹ縺ｫ縲∝推驟榊・繧・が繝悶ず繧ｧ繧ｯ繝医′驕ｩ蛻・↓髢峨§繧峨ｌ縺ｦ縺・ｋ縺薙→繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲・

莉･荳九・蠖｢蠑上↓蜴ｳ蟇・↓蠕薙▲縺ｦ縺上□縺輔＞縲よ擅莉ｶ蛻・ｲ舌ヮ繝ｼ繝会ｼ・type": "condition"・峨〒縺ｯ蠢・★"conditions"驟榊・縺ｨ"message"繝輔ぅ繝ｼ繝ｫ繝峨ｒ蜷ｫ繧√※縺上□縺輔＞:

{
  "id": "讖滓｢ｰ逧・↑ID・郁恭謨ｰ蟄励→繧｢繝ｳ繝繝ｼ繧ｹ繧ｳ繧｢縺ｮ縺ｿ・・,
  "title": "繝輔Ο繝ｼ縺ｮ繧ｿ繧､繝医Ν",
  "description": "邁｡貎斐↑隱ｬ譏・,
  "triggerKeywords": ["繧ｭ繝ｼ繝ｯ繝ｼ繝・", "繧ｭ繝ｼ繝ｯ繝ｼ繝・"],
  "steps": [
    {
      "id": "step1",
      "title": "髢句ｧ・,
      "description": "縺薙・蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨〒縺ｯ縲ー荳ｻ縺ｪ逞・憾繧・撫鬘珪縺ｫ蟇ｾ蜃ｦ縺吶ｋ謇矩・ｒ隱ｬ譏弱＠縺ｾ縺吶ょｮ牙・繧堤｢ｺ菫昴＠縺ｪ縺後ｉ縲∝次蝗繧堤音螳壹＠隗｣豎ｺ縺吶ｋ縺溘ａ縺ｮ謇矩・↓蠕薙▲縺ｦ縺上□縺輔＞縲・,
      "message": "縺薙・蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨〒縺ｯ縲ー荳ｻ縺ｪ逞・憾繧・撫鬘珪縺ｫ蟇ｾ蜃ｦ縺吶ｋ謇矩・ｒ隱ｬ譏弱＠縺ｾ縺吶ょｮ牙・繧堤｢ｺ菫昴＠縺ｪ縺後ｉ縲∝次蝗繧堤音螳壹＠隗｣豎ｺ縺吶ｋ縺溘ａ縺ｮ謇矩・↓蠕薙▲縺ｦ縺上□縺輔＞縲・,
      "imageUrl": "",
      "type": "step",
      "options": []
    },
    {
      "id": "step2",
      "title": "螳牙・遒ｺ菫・,
      "description": "1. 莠梧ｬ｡轣ｽ螳ｳ繧帝亟縺舌◆繧√∬ｻ贋ｸ｡縺悟ｮ牙・縺ｪ蝣ｴ謇縺ｫ蛛懈ｭ｢縺励※縺・ｋ縺薙→繧堤｢ｺ隱阪＠縺ｾ縺吶・n2. 謗･霑代☆繧句・霆翫ｄ髫懷ｮｳ迚ｩ縺後↑縺・°蜻ｨ蝗ｲ繧堤｢ｺ隱阪＠縺ｾ縺吶・n3. 蠢・ｦ√↓蠢懊§縺ｦ蛛懈ｭ｢陦ｨ遉ｺ蝎ｨ繧・亟隴ｷ辟｡邱壹ｒ菴ｿ逕ｨ縺励∪縺吶・,
      "message": "1. 莠梧ｬ｡轣ｽ螳ｳ繧帝亟縺舌◆繧√∬ｻ贋ｸ｡縺悟ｮ牙・縺ｪ蝣ｴ謇縺ｫ蛛懈ｭ｢縺励※縺・ｋ縺薙→繧堤｢ｺ隱阪＠縺ｾ縺吶・n2. 謗･霑代☆繧句・霆翫ｄ髫懷ｮｳ迚ｩ縺後↑縺・°蜻ｨ蝗ｲ繧堤｢ｺ隱阪＠縺ｾ縺吶・n3. 蠢・ｦ√↓蠢懊§縺ｦ蛛懈ｭ｢陦ｨ遉ｺ蝎ｨ繧・亟隴ｷ辟｡邱壹ｒ菴ｿ逕ｨ縺励∪縺吶・,
      "imageUrl": "",
      "type": "step",
      "options": []
    },
    {
      "id": "step3",
      "type": "condition",
      "title": "迥ｶ諷狗｢ｺ隱榊・蟯・,
      "message": "迴ｾ蝨ｨ縺ｮ迥ｶ豕√ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲りｩｲ蠖薙☆繧狗憾豕√ｒ驕ｸ謚槭＠縺ｦ縺上□縺輔＞縲・,
      "conditions": [
        {
          "label": "迥ｶ豕、",
          "nextId": "step4"
        },
        {
          "label": "迥ｶ豕。",
          "nextId": "step5"
        }
      ]
    },
    {
      "id": "step4",
      "title": "迥ｶ豕、縺ｮ蟇ｾ蜃ｦ",
      "description": "迥ｶ豕、縺ｫ蟇ｾ縺吶ｋ蜈ｷ菴鍋噪縺ｪ蟇ｾ蜃ｦ謇矩・ｒ隱ｬ譏弱＠縺ｾ縺吶・,
      "message": "迥ｶ豕、縺ｫ蟇ｾ縺吶ｋ蜈ｷ菴鍋噪縺ｪ蟇ｾ蜃ｦ謇矩・ｒ隱ｬ譏弱＠縺ｾ縺吶・,
      "imageUrl": "",
      "type": "step",
      "options": []
    },
    {
      "id": "step5",
      "title": "迥ｶ豕。縺ｮ蟇ｾ蜃ｦ",
      "description": "迥ｶ豕。縺ｫ蟇ｾ縺吶ｋ蜈ｷ菴鍋噪縺ｪ蟇ｾ蜃ｦ謇矩・ｒ隱ｬ譏弱＠縺ｾ縺吶・,
      "message": "迥ｶ豕。縺ｫ蟇ｾ縺吶ｋ蜈ｷ菴鍋噪縺ｪ蟇ｾ蜃ｦ謇矩・ｒ隱ｬ譏弱＠縺ｾ縺吶・,
      "imageUrl": "",
      "type": "step",
      "options": []
    },
    {
      "id": "step6",
      "type": "condition",
      "title": "譛邨ら｢ｺ隱・,
      "message": "蟇ｾ蜃ｦ蠕後・迥ｶ豕√ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲・,
      "conditions": [
        {
          "label": "蝠城｡瑚ｧ｣豎ｺ",
          "nextId": "step7"
        },
        {
          "label": "蝠城｡檎ｶ咏ｶ・,
          "nextId": "step8"
        }
      ]
    },
    {
      "id": "step7",
      "title": "驕玖ｻ｢蜀埼幕謇矩・,
      "description": "1. 蜷・ｨ亥勣縺ｮ蛟､縺梧ｭ｣蟶ｸ遽・峇蜀・↓縺ゅｋ縺薙→繧堤｢ｺ隱阪＠縺ｾ縺吶・n2. 逡ｰ蟶ｸ縺ｪ髻ｳ縲∵険蜍輔∬・縺・′縺ｪ縺・°遒ｺ隱阪＠縺ｾ縺吶・n3. 蜈ｨ縺ｦ豁｣蟶ｸ縺ｧ縺ゅｌ縺ｰ縲・°霆｢繧貞・髢九＠縺ｾ縺吶・,
      "message": "1. 蜷・ｨ亥勣縺ｮ蛟､縺梧ｭ｣蟶ｸ遽・峇蜀・↓縺ゅｋ縺薙→繧堤｢ｺ隱阪＠縺ｾ縺吶・n2. 逡ｰ蟶ｸ縺ｪ髻ｳ縲∵険蜍輔∬・縺・′縺ｪ縺・°遒ｺ隱阪＠縺ｾ縺吶・n3. 蜈ｨ縺ｦ豁｣蟶ｸ縺ｧ縺ゅｌ縺ｰ縲・°霆｢繧貞・髢九＠縺ｾ縺吶・,
      "imageUrl": "",
      "type": "step",
      "options": []
    },
    {
      "id": "step8",
      "title": "蟆る摩逧・↑謾ｯ謠ｴ隕∬ｫ・,
      "description": "1. 謖・ｻ､謇縺ｾ縺溘・菫晏ｮ域球蠖薙↓騾｣邨｡縺励∫樟蝨ｨ縺ｮ迥ｶ豕√→菴咲ｽｮ繧貞ｱ蜻翫＠縺ｾ縺吶・n2. 縺薙ｌ縺ｾ縺ｧ縺ｫ螳滓命縺励◆遒ｺ隱堺ｺ矩・→蟇ｾ蜃ｦ蜀・ｮｹ繧剃ｼ昴∴縺ｾ縺吶・n3. 謾ｯ謠ｴ繧定ｦ∬ｫ九＠縲∝ｮ牙・縺ｪ蝣ｴ謇縺ｧ蠕・ｩ溘＠縺ｾ縺吶・,
      "message": "1. 謖・ｻ､謇縺ｾ縺溘・菫晏ｮ域球蠖薙↓騾｣邨｡縺励∫樟蝨ｨ縺ｮ迥ｶ豕√→菴咲ｽｮ繧貞ｱ蜻翫＠縺ｾ縺吶・n2. 縺薙ｌ縺ｾ縺ｧ縺ｫ螳滓命縺励◆遒ｺ隱堺ｺ矩・→蟇ｾ蜃ｦ蜀・ｮｹ繧剃ｼ昴∴縺ｾ縺吶・n3. 謾ｯ謠ｴ繧定ｦ∬ｫ九＠縲∝ｮ牙・縺ｪ蝣ｴ謇縺ｧ蠕・ｩ溘＠縺ｾ縺吶・,
      "imageUrl": "",
      "type": "step",
      "options": []
    }
  ],
  "updatedAt": "2025-06-14T09:28:05.650Z"
}

縲舌く繝ｼ繝ｯ繝ｼ繝峨・ ${keywords}
${relatedKnowledgeText}

繝輔Ο繝ｼ逕滓・縺ｫ髢｢縺吶ｋ驥崎ｦ√↑繧ｬ繧､繝峨Λ繧､繝ｳ・・
1. 繝輔Ο繝ｼ縺ｯ螳溽畑逧・〒縲∝ｮ滄圀縺ｮ邱頑･譎ゅ↓蠖ｹ遶九▽謇矩・ｒ謠蝉ｾ帙＠縺ｦ縺上□縺輔＞縲ゅ・繝ｬ繝ｼ繧ｹ繝帙Ν繝繝ｼ繧・し繝ｳ繝励Ν繝・く繧ｹ繝医・菴ｿ逕ｨ縺帙★縲∝・菴鍋噪縺ｧ螳溯｡悟庄閭ｽ縺ｪ謖・､ｺ繧貞性繧√※縺上□縺輔＞縲・
2. 蜷・せ繝・ャ繝励↓縺ｯ蜈ｷ菴鍋噪縺ｪ謖・､ｺ繧・｢ｺ隱堺ｺ矩・ｒ邂・擅譖ｸ縺阪〒蜷ｫ繧√※縺上□縺輔＞縲・縲・縺ｮ繧医≧縺ｪ謨ｰ蟄嶺ｻ倥″繝ｪ繧ｹ繝医ｒ菴ｿ逕ｨ縺励∵隼陦後↓縺ｯ\\n繧剃ｽｿ逕ｨ縺励※縺上□縺輔＞縲・
3. decision・亥愛譁ｭ・峨ヮ繝ｼ繝峨〒縺ｯ縲∵・遒ｺ縺ｪ雉ｪ蝠丞ｽ｢蠑上・隱ｬ譏弱ｒ謠蝉ｾ帙＠縲・∈謚櫁い縺ｯ蜈ｷ菴鍋噪縺ｪ迥ｶ諷九ｄ譚｡莉ｶ繧貞渚譏縺輔○縺ｦ縺上□縺輔＞縲・
4. 菫晏ｮ育畑霆翫・蟆る摩遏･隴倥ｒ豢ｻ逕ｨ縺励∝ｮ牙・繧呈怙蜆ｪ蜈医＠縺滓橿陦鍋噪縺ｫ豁｣遒ｺ縺ｪ謇矩・ｒ菴懈・縺励※縺上□縺輔＞縲・
5. 邱頑･譎ゅ・蟇ｾ蠢懊→縺励※縲√∪縺壼ｮ牙・遒ｺ菫昴∵ｬ｡縺ｫ迥ｶ豕∬ｩ穂ｾ｡縲√◎縺励※隗｣豎ｺ遲悶・螳溯｡後→縺・≧隲也炊逧・↑豬√ｌ縺ｫ縺励※縺上□縺輔＞縲・
6. 蟆代↑縺上→繧・縺､縺ｮ荳ｻ隕√↑蛻､譁ｭ繝昴う繝ｳ繝茨ｼ・ecision・峨→縲√◎繧後◇繧後↓蟇ｾ蠢懊☆繧句・蟯舌ヱ繧ｹ繧貞性繧√※縺上□縺輔＞縲・
7. 縺吶∋縺ｦ縺ｮ繝代せ縺悟ｮ御ｺ・∪縺溘・蟆る摩螳ｶ縺ｸ縺ｮ逶ｸ隲・〒邨ゅｏ繧九ｈ縺・↓縺励∬｡後″豁｢縺ｾ繧翫・縺ｪ縺・ヵ繝ｭ繝ｼ縺ｫ縺励※縺上□縺輔＞縲・
8. title・医ち繧､繝医Ν・峨ヵ繧｣繝ｼ繝ｫ繝峨↓縺ｯ遏ｭ縺乗・遒ｺ縺ｪ隕句・縺励ｒ縲‥escription・郁ｪｬ譏趣ｼ峨ヵ繧｣繝ｼ繝ｫ繝峨↓縺ｯ隧ｳ邏ｰ縺ｪ謖・､ｺ繧・憾豕∬ｪｬ譏弱ｒ蜈･繧後※縺上□縺輔＞縲・
9. 霆碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ迚ｹ譛峨・讖溷勣繧・す繧ｹ繝・Β・井ｾ具ｼ壼宛蠕｡陬・ｽｮ縲√ヶ繝ｬ繝ｼ繧ｭ繧ｷ繧ｹ繝・Β縲√ヱ繝ｳ繧ｿ繧ｰ繝ｩ繝慕ｭ会ｼ峨↓髢｢縺吶ｋ蜈ｷ菴鍋噪縺ｪ險蜿翫ｒ蜷ｫ繧√※縺上□縺輔＞縲・
10. 譛邨ゅせ繝・ャ繝励〒縺ｯ蠢・★蜈ｷ菴鍋噪縺ｪ蟇ｾ蠢懃ｵ先棡繧・ｬ｡縺ｮ繧ｹ繝・ャ繝励ｒ譏守､ｺ縺励∝茜逕ｨ閠・′谺｡縺ｫ縺ｨ繧九∋縺崎｡悟虚繧呈・遒ｺ縺ｫ縺励※縺上□縺輔＞縲Ａ;
        
        // OpenAI縺ｧ繝輔Ο繝ｼ繧堤函謌・
        console.log('OpenAI縺ｫ繝輔Ο繝ｼ逕滓・繧偵Μ繧ｯ繧ｨ繧ｹ繝井ｸｭ...');
        const generatedFlow: any = await processOpenAIRequest(prompt);
        
        // OpenAI API繧ｨ繝ｩ繝ｼ縺ｮ遒ｺ隱・
        if (typeof generatedFlow === 'string' && generatedFlow.includes('OpenAI API繧ｭ繝ｼ縺檎┌蜉ｹ縺ｧ縺・)) {
            return res.status(400).json({
                success: false,
                error: 'OpenAI API繧ｭ繝ｼ縺檎┌蜉ｹ縺ｧ縺吶よ怏蜉ｹ縺ｪAPI繧ｭ繝ｼ繧定ｨｭ螳壹＠縺ｦ縺上□縺輔＞縲・,
                details: '迺ｰ蠅・､画焚OPENAI_API_KEY縺ｫ譛牙柑縺ｪAPI繧ｭ繝ｼ繧定ｨｭ螳壹＠縺ｦ縺上□縺輔＞縲・
            });
        }
        
        try {
            // 蜈ｱ騾壹・JSON蜃ｦ逅・・繝ｫ繝代・繧剃ｽｿ逕ｨ縺励※繝ｬ繧ｹ繝昴Φ繧ｹ繧偵け繝ｪ繝ｼ繝九Φ繧ｰ
            const cleanedResponse: any = cleanJsonResponse(generatedFlow);
            // JSON縺ｨ縺励※隗｣譫・
            const flowData: any = JSON.parse(cleanedResponse);
            // ID縺瑚ｨｭ螳壹＆繧後※縺・↑縺・ｴ蜷医・繧ｭ繝ｼ繝ｯ繝ｼ繝峨°繧臥函謌・
            if (!flowData.id) {
                // 繧ｭ繝ｼ繝ｯ繝ｼ繝峨°繧迂D繧堤函謌・蟆乗枚蟄怜喧縺励※繧ｹ繝壹・繧ｹ繧偵い繝ｳ繝繝ｼ繧ｹ繧ｳ繧｢縺ｫ鄂ｮ謠・
                const generatedId: any = keywords.toLowerCase()
                    .replace(/[^a-z0-9_]/g, '_')
                    .replace(/_+/g, '_')
                    .substring(0, 50); // 髟ｷ縺吶℃繧句ｴ蜷医・蛻・ｊ隧ｰ繧・
                flowData.id = `flow_${generatedId}_${Date.now()}`;
            }
            // 繝輔Ο繝ｼ縺ｮ繝輔ぃ繧､繝ｫ繝代せ
            const flowFilePath: any = path.join(troubleshootingDir, `${flowData.id}.json`);
            // 譌｢蟄倥・繝輔ぃ繧､繝ｫ蜷阪→遶ｶ蜷医＠縺ｪ縺・ｈ縺・↓遒ｺ隱・
            let finalId = flowData.id;
            let counter = 1;
            while (existsSync(path.join(troubleshootingDir, `${finalId}.json`))) {
                finalId = `${flowData.id}_${counter}`;
                counter++;
            }
            flowData.id = finalId;
            // 繝輔Ο繝ｼ繧偵ヵ繧｡繧､繝ｫ縺ｫ菫晏ｭ・
            writeFileSync(path.join(troubleshootingDir, `${flowData.id}.json`), JSON.stringify(flowData, null, 2));
            // 逕滓・譌･譎ゅｒ險倬鹸
            flowData.createdAt = new Date().toISOString();
            // 謌仙粥繝ｬ繧ｹ繝昴Φ繧ｹ
            res.json({
                success: true,
                message: `繝輔Ο繝ｼ縺梧ｭ｣蟶ｸ縺ｫ逕滓・縺輔ｌ縺ｾ縺励◆: ${flowData.title}`,
                flowData
            });
        }
        catch (parseError) {
            const error: any = parseError;
            console.error('逕滓・縺輔ｌ縺溘ヵ繝ｭ繝ｼ縺ｮ隗｣譫舌お繝ｩ繝ｼ:', error);
            console.error('逕滓・縺輔ｌ縺溘ユ繧ｭ繧ｹ繝・', generatedFlow);
            // JSON隗｣譫舌お繝ｩ繝ｼ縺ｮ隧ｳ邏ｰ繧堤｢ｺ隱・
            const errorPosition: any = error.message?.match(/position\s+(\d+)/i);
            if (errorPosition && errorPosition[1]) {
                const position: any = parseInt(errorPosition[1], 10);
                const contextStart: any = Math.max(0, position - 20);
                const contextEnd: any = Math.min(generatedFlow.length, position + 20);
                console.error(`繧ｨ繝ｩ繝ｼ菴咲ｽｮ: ${position}`);
                console.error(`蝠城｡檎ｮ・園縺ｮ蜻ｨ霎ｺ: "${generatedFlow.substring(contextStart, position)}<<<ERROR HERE>>>${generatedFlow.substring(position, contextEnd)}"`);
                // 譛ｫ蟆ｾ縺ｮJSON繧貞・繧雁叙繧玖ｩｦ縺ｿ
                if (position > generatedFlow.length * 0.9) {
                    const lastBraceIndex: any = generatedFlow.lastIndexOf('}');
                    if (lastBraceIndex > 0) {
                        const truncated: any = generatedFlow.substring(0, lastBraceIndex + 1);
                        console.log('譛ｫ蟆ｾ繧貞・繧願ｩｰ繧√◆JSON繧定ｩｦ陦・..');
                        try {
                            const truncatedData: any = JSON.parse(truncated);
                            // 謌仙粥縺励◆蝣ｴ蜷医・蛻・ｊ隧ｰ繧√◆繝・・繧ｿ繧剃ｽｿ逕ｨ
                            console.log('蛻・ｊ隧ｰ繧√◆JSON縺ｮ隗｣譫舌↓謌仙粥縺励∪縺励◆');
                            // 莉･荳九！D縺ｮ逕滓・縺ｪ縺ｩ縺ｮ蜃ｦ逅・ｒ邯夊｡・..
                            // 縺薙・驛ｨ蛻・・荳願ｨ倥・繧ｳ繝ｼ繝峨→蜷梧ｧ・
                            const generatedId: any = keywords.toLowerCase()
                                .replace(/[^a-z0-9_]/g, '_')
                                .replace(/_+/g, '_')
                                .substring(0, 50);
                            truncatedData.id = `flow_${generatedId}_${Date.now()}`;
                            // 繝輔Ο繝ｼ縺ｮ繝輔ぃ繧､繝ｫ繝代せ
                            const flowFilePath: any = path.join(troubleshootingDir, `${truncatedData.id}.json`);
                            // 譌｢蟄倥・繝輔ぃ繧､繝ｫ蜷阪→遶ｶ蜷医＠縺ｪ縺・ｈ縺・↓遒ｺ隱・
                            let finalId = truncatedData.id;
                            let counter = 1;
                            while (existsSync(path.join(troubleshootingDir, `${finalId}.json`))) {
                                finalId = `${truncatedData.id}_${counter}`;
                                counter++;
                            }
                            truncatedData.id = finalId;
                            // 繝輔Ο繝ｼ繧偵ヵ繧｡繧､繝ｫ縺ｫ菫晏ｭ・
                            writeFileSync(path.join(troubleshootingDir, `${truncatedData.id}.json`), JSON.stringify(truncatedData, null, 2));
                            // 逕滓・譌･譎ゅｒ險倬鹸
                            truncatedData.createdAt = new Date().toISOString();
                            // 謌仙粥繝ｬ繧ｹ繝昴Φ繧ｹ
                            return res.json({
                                success: true,
                                message: `菫ｮ蠕ｩ縺励◆JSON縺九ｉ繝輔Ο繝ｼ縺檎函謌舌＆繧後∪縺励◆: ${truncatedData.title}`,
                                flowData: truncatedData
                            });
                        }
                        catch (secondError) {
                            console.error('蛻・ｊ隧ｰ繧√◆JSON縺ｮ隗｣譫舌↓繧ょ､ｱ謨励＠縺ｾ縺励◆:', secondError);
                        }
                    }
                }
            }
            res.status(500).json({
                success: false,
                error: '繝輔Ο繝ｼ繝・・繧ｿ縺ｮ隗｣譫舌↓螟ｱ謨励＠縺ｾ縺励◆',
                rawResponse: generatedFlow
            });
        }
    }
    catch (error) {
        console.error('繝輔Ο繝ｼ逕滓・繧ｨ繝ｩ繝ｼ:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
        });
    }
});
// 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔Ο繝ｼ繧貞叙蠕励☆繧九お繝ｳ繝峨・繧､繝ｳ繝・
router.get('/list', (req, res) => {
    try {
        // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉJSON繝輔ぃ繧､繝ｫ繧貞叙蠕・
        const files: any = readdirSync(troubleshootingDir)
            .filter(file => file.endsWith('.json'));
        const flowList: any = files.map(file => {
            try {
                const fileContent: any = readFileSync(path.join(troubleshootingDir, file), 'utf-8');
                const flowData: any = JSON.parse(fileContent);
                return {
                    id: flowData.id || file.replace('.json', ''),
                    title: flowData.title || '繧ｿ繧､繝医Ν縺ｪ縺・,
                    description: flowData.description || '',
                    triggerKeywords: flowData.triggerKeywords || [],
                    createdAt: flowData.createdAt || null
                };
            }
            catch (error) {
                console.error(`繝輔ぃ繧､繝ｫ ${file} 縺ｮ隗｣譫蝉ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:`, error);
                return null;
            }
        }).filter(Boolean);
        res.json({
            success: true,
            flowList
        });
    }
    catch (error) {
        console.error('繝輔Ο繝ｼ繝ｪ繧ｹ繝亥叙蠕励お繝ｩ繝ｼ:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
        });
    }
});
// 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔Ο繝ｼ縺ｮ隧ｳ邏ｰ繧貞叙蠕励☆繧九お繝ｳ繝峨・繧､繝ｳ繝・
router.get('/detail/:id', (req, res) => {
    try {
        const cleanFlowId: any = req.params.id.startsWith('ts_') ? req.params.id.substring(3) : req.params.id;
        const filePath: any = path.join(troubleshootingDir, `${cleanFlowId}.json`);
        if (!existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: '謖・ｮ壹＆繧後◆繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
            });
        }
        const fileContent: any = readFileSync(filePath, 'utf-8');
        const flowData: any = JSON.parse(fileContent);
        const decisionSteps: any = flowData.steps?.filter((step) => step.type === 'decision') || [];
        const conditionSteps: any = flowData.steps?.filter((step) => step.type === 'condition') || [];
        const decisionStepsDetail: any = decisionSteps.map((step) => ({
            id: step.id,
            title: step.title,
            description: step.description,
            message: step.message,
            conditions: step.conditions
        }));
        const conditionStepsDetail: any = conditionSteps.map((step) => ({
            id: step.id,
            title: step.title,
            description: step.description,
            message: step.message,
            conditions: step.conditions
        }));
        res.json({
            success: true,
            flowData: {
                ...flowData,
                decisionSteps: decisionStepsDetail,
                conditionSteps: conditionStepsDetail
            }
        });
    }
    catch (error) {
        console.error('繝輔Ο繝ｼ隧ｳ邏ｰ蜿門ｾ励お繝ｩ繝ｼ:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
        });
    }
});
// 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔Ο繝ｼ繧貞炎髯､縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.delete('/:id', (req, res) => {
    try {
        const flowId: any = req.params.id;
        const filePath: any = path.join(troubleshootingDir, `${flowId}.json`);
        if (!existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: '謖・ｮ壹＆繧後◆繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
            });
        }
        unlinkSync(filePath);
        res.json({
            success: true,
            message: '繝輔Ο繝ｼ縺梧ｭ｣蟶ｸ縺ｫ蜑企勁縺輔ｌ縺ｾ縺励◆'
        });
    }
    catch (error) {
        console.error('繝輔Ο繝ｼ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
        });
    }
});
export default router;
