import express from 'express';
import { TroubleshootingQA, TroubleshootingAnswer } from '../lib/troubleshooting-qa.js';

const router = express.Router();
const troubleshootingQA = new TroubleshootingQA();

// 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繧ｻ繝・す繝ｧ繝ｳ縺ｮ髢句ｧ・
router.post('/start', async (req, res) => {
  try {
    const { problemDescription } = req.body;
    
    if (!problemDescription) {
      return res.status(400).json({
        success: false,
        error: '蝠城｡後・隱ｬ譏弱′蠢・ｦ√〒縺・
      });
    }

    console.log('剥 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ髢句ｧ・', problemDescription);
    
    const response = await troubleshootingQA.startTroubleshooting(problemDescription);
    
    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ髢句ｧ九お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ縺ｮ髢句ｧ九↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 蝗樒ｭ斐・蜃ｦ逅・→谺｡縺ｮ雉ｪ蝠上・逕滓・
router.post('/answer', async (req, res) => {
  try {
    const { problemDescription, previousAnswers, currentAnswer } = req.body;
    
    if (!problemDescription || !currentAnswer) {
      return res.status(400).json({
        success: false,
        error: '蝠城｡後・隱ｬ譏弱→蝗樒ｭ斐′蠢・ｦ√〒縺・
      });
    }

    console.log('剥 蝗樒ｭ泌・逅・', { problemDescription, currentAnswer, previousAnswersCount: previousAnswers?.length || 0 });
    
    const response = await troubleshootingQA.processAnswer(
      problemDescription,
      previousAnswers || [],
      currentAnswer
    );
    
    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('笶・蝗樒ｭ泌・逅・お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '蝗樒ｭ斐・蜃ｦ逅・↓螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 隗｣豎ｺ遲悶・逕滓・
router.post('/solution', async (req, res) => {
  try {
    const { problemDescription, answers } = req.body;
    
    if (!problemDescription || !answers) {
      return res.status(400).json({
        success: false,
        error: '蝠城｡後・隱ｬ譏弱→蝗樒ｭ泌ｱ･豁ｴ縺悟ｿ・ｦ√〒縺・
      });
    }

    console.log('剥 隗｣豎ｺ遲也函謌・', { problemDescription, answersCount: answers.length });
    
    const solution = await troubleshootingQA.generateSolution(problemDescription, answers);
    
    res.json({
      success: true,
      data: {
        solution,
        problemDescription,
        answersCount: answers.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('笶・隗｣豎ｺ遲也函謌舌お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      error: '隗｣豎ｺ遲悶・逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
