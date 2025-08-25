import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { 
  DiagnosisState, 
  updateDiagnosisState, 
  generateInteractiveResponse,
  InteractiveResponse 
} from '../lib/interactive-diagnosis.js';
import { processOpenAIRequest } from '../lib/openai.js';

const router = Router();

// 繝ｪ繧ｯ繧ｨ繧ｹ繝医せ繧ｭ繝ｼ繝・
const InteractiveDiagnosisRequestSchema = z.object({
  userResponse: z.string().min(1),
  currentState: z.object({
    phase: z.enum(['initial', 'investigation', 'diagnosis', 'action', 'verification', 'completed']),
    collectedInfo: z.object({
      symptoms: z.array(z.string()),
      vehicleType: z.string().nullable(),
      safetyStatus: z.string().nullable(),
      timing: z.string().nullable(),
      tools: z.string().nullable(),
      environment: z.string().nullable(),
      urgency: z.enum(['low', 'medium', 'high', 'critical'])
    }),
    suspectedCauses: z.array(z.string()),
    currentFocus: z.string().nullable(),
    nextActions: z.array(z.string()),
    confidence: z.number()
  }).optional()
});

type InteractiveDiagnosisRequest = z.infer<typeof InteractiveDiagnosisRequestSchema>;

/**
 * 繧､繝ｳ繧ｿ繝ｩ繧ｯ繝・ぅ繝匁腐髫懆ｨｺ譁ｭ - 繝ｦ繝ｼ繧ｶ繝ｼ縺ｨ縺ｮ蟇ｾ隧ｱ逧・↑險ｺ譁ｭ繝励Ο繧ｻ繧ｹ
 * POST /api/interactive-diagnosis
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // 繝ｪ繧ｯ繧ｨ繧ｹ繝医・讀懆ｨｼ
    const validationResult = InteractiveDiagnosisRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.errors
      });
    }

    const { userResponse, currentState } = validationResult.data;

    // 蛻晄悄迥ｶ諷九・險ｭ螳・
    let diagnosisState: DiagnosisState;
    
    if (currentState) {
      diagnosisState = {
        phase: currentState.phase,
        collectedInfo: {
          symptoms: currentState.collectedInfo.symptoms,
          vehicleType: currentState.collectedInfo.vehicleType,
          safetyStatus: currentState.collectedInfo.safetyStatus,
          timing: currentState.collectedInfo.timing,
          tools: currentState.collectedInfo.tools,
          environment: currentState.collectedInfo.environment,
          urgency: currentState.collectedInfo.urgency
        },
        suspectedCauses: currentState.suspectedCauses,
        currentFocus: currentState.currentFocus,
        nextActions: currentState.nextActions,
        confidence: currentState.confidence
      };
    } else {
      diagnosisState = {
        phase: 'initial',
        collectedInfo: {
          symptoms: [],
          vehicleType: null,
          safetyStatus: null,
          timing: null,
          tools: null,
          environment: null,
          urgency: 'low'
        },
        suspectedCauses: [],
        currentFocus: null,
        nextActions: [],
        confidence: 0.0
      };
    }

    // 險ｺ譁ｭ迥ｶ諷九・譖ｴ譁ｰ
    const updatedState = updateDiagnosisState(diagnosisState, userResponse);

    // 繧､繝ｳ繧ｿ繝ｩ繧ｯ繝・ぅ繝悶Ξ繧ｹ繝昴Φ繧ｹ縺ｮ逕滓・
    let interactiveResponse = generateInteractiveResponse(updatedState, userResponse);

    // 鬮伜ｺｦ縺ｪ蛻・梵縺悟ｿ・ｦ√↑蝣ｴ蜷医・OpenAI API繧剃ｽｿ逕ｨ
    if (updatedState.confidence < 0.6 && updatedState.phase === 'diagnosis') {
      try {
        // 蜿朱寔縺励◆諠・ｱ繧偵さ繝ｳ繝・く繧ｹ繝医→縺励※縺ｾ縺ｨ繧√ｋ
        const context = `
霆贋ｸ｡: ${updatedState.collectedInfo.vehicleType || '譛ｪ迚ｹ螳・}
逞・憾: ${updatedState.collectedInfo.symptoms.join(', ')}
邱頑･蠎ｦ: ${updatedState.collectedInfo.urgency}
螳牙・迥ｶ豕・ ${updatedState.collectedInfo.safetyStatus || '譛ｪ遒ｺ隱・}
逍代ｏ繧後ｋ蜴溷屏: ${updatedState.suspectedCauses.join(', ')}
譛譁ｰ蝗樒ｭ・ ${userResponse}
        `.trim();

        const aiPrompt = `
菫晏ｮ育畑霆翫・謨・囿險ｺ譁ｭ繧定｡後▲縺ｦ縺・∪縺吶ゆｻ･荳九・諠・ｱ縺ｫ蝓ｺ縺･縺・※縲∵ｬ｡縺ｫ遒ｺ隱阪☆縺ｹ縺埼㍾隕√↑雉ｪ蝠上ｒ1縺､謠先｡医＠縺ｦ縺上□縺輔＞縲・

${context}

莉･荳九・譚｡莉ｶ縺ｧ蝗樒ｭ斐＠縺ｦ縺上□縺輔＞・・
1. 螳牙・遒ｺ隱阪′譛蜆ｪ蜈・
2. 逞・憾縺ｮ蜴溷屏繧堤音螳壹☆繧九◆繧√・蜈ｷ菴鍋噪縺ｪ雉ｪ蝠・
3. 迴ｾ蝣ｴ縺ｧ遒ｺ隱榊庄閭ｽ縺ｪ蜀・ｮｹ
4. 邁｡貎斐〒逅・ｧ｣縺励ｄ縺吶＞陦ｨ迴ｾ

雉ｪ蝠上・縺ｿ繧貞屓遲斐＠縺ｦ縺上□縺輔＞・井ｽ呵ｨ医↑隱ｬ譏弱・荳崎ｦ・ｼ峨・
        `;

        const aiResponse = await processOpenAIRequest(aiPrompt, true);
        
        // AI逕滓・縺ｮ雉ｪ蝠上〒譖ｴ譁ｰ
        if (aiResponse && aiResponse.length > 0) {
          interactiveResponse = {
            ...interactiveResponse,
            message: `､・**AI蛻・梵邨先棡**\n\n蜿朱寔縺励◆諠・ｱ繧貞・譫舌＠縺ｾ縺励◆縲ゅｈ繧頑ｭ｣遒ｺ縺ｪ險ｺ譁ｭ縺ｮ縺溘ａ縲∽ｻ･荳九ｒ遒ｺ隱阪＆縺帙※縺上□縺輔＞縲Ａ,
            nextQuestion: aiResponse,
            priority: 'diagnosis'
          };
        }
      } catch (error) {
        console.error('AI蛻・梵繧ｨ繝ｩ繝ｼ:', error);
        // AI繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・騾壼ｸｸ縺ｮ繝ｭ繧ｸ繝・け繧剃ｽｿ逕ｨ
      }
    }

    // 蠢懈･蜃ｦ鄂ｮ縺ｮ蜈ｷ菴鍋噪謇矩・′蠢・ｦ√↑蝣ｴ蜷・
    if (updatedState.phase === 'action' && updatedState.suspectedCauses.length > 0) {
      try {
        const primaryCause = updatedState.suspectedCauses[0];
        const vehicleInfo = updatedState.collectedInfo.vehicleType || '菫晏ｮ育畑霆・;
        
        const actionPrompt = `
${vehicleInfo}縺ｮ${primaryCause}縺ｫ蟇ｾ縺吶ｋ蠢懈･蜃ｦ鄂ｮ謇矩・ｒ縲∫樟蝣ｴ縺ｧ螳溯｡悟庄閭ｽ縺ｪ蠖｢縺ｧ謠先｡医＠縺ｦ縺上□縺輔＞縲・

逞・憾: ${updatedState.collectedInfo.symptoms.join(', ')}
邱頑･蠎ｦ: ${updatedState.collectedInfo.urgency}

莉･荳九・蠖｢蠑上〒蝗樒ｭ斐＠縺ｦ縺上□縺輔＞・・
1. 螳牙・遒ｺ隱堺ｺ矩・
2. 貅門ｙ縺吶ｋ繧ゅ・
3. 蜈ｷ菴鍋噪謇矩・ｼ医せ繝・ャ繝励ヰ繧､繧ｹ繝・ャ繝暦ｼ・
4. 遒ｺ隱阪・繧､繝ｳ繝・

迴ｾ蝣ｴ縺ｮ謚陦楢・′霑ｷ繧上★縺ｫ螳溯｡後〒縺阪ｋ蜀・ｮｹ縺ｫ縺励※縺上□縺輔＞縲・
        `;

        const actionResponse = await processOpenAIRequest(actionPrompt, true);
        
        if (actionResponse && actionResponse.length > 0) {
          interactiveResponse = {
            ...interactiveResponse,
            message: `屏・・**蟆る摩逧・ｿ懈･蜃ｦ鄂ｮ謇矩・*\n\n${actionResponse}`,
            nextQuestion: "荳願ｨ倥・謇矩・ｒ螳溯｡後＠縺ｾ縺励◆縺具ｼ溽ｵ先棡繧呈蕗縺医※縺上□縺輔＞縲・,
            priority: 'action'
          };
        }
      } catch (error) {
        console.error('蠢懈･蜃ｦ鄂ｮ逕滓・繧ｨ繝ｩ繝ｼ:', error);
      }
    }

    // 繝ｬ繧ｹ繝昴Φ繧ｹ
    const response = {
      interactiveResponse,
      updatedState,
      metadata: {
        phase: updatedState.phase,
        confidence: updatedState.confidence,
        urgency: updatedState.collectedInfo.urgency,
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);

  } catch (error) {
    console.error('繧､繝ｳ繧ｿ繝ｩ繧ｯ繝・ぅ繝冶ｨｺ譁ｭ繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: 'Interactive diagnosis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 譁ｰ縺励＞險ｺ譁ｭ繧ｻ繝・す繝ｧ繝ｳ縺ｮ髢句ｧ・
 * POST /api/interactive-diagnosis/start
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const initialState: DiagnosisState = {
      phase: 'initial',
      collectedInfo: {
        symptoms: [],
        vehicleType: null,
        safetyStatus: null,
        timing: null,
        tools: null,
        environment: null,
        urgency: 'low'
      },
      suspectedCauses: [],
      currentFocus: null,
      nextActions: [],
      confidence: 0.0
    };

    const initialResponse = generateInteractiveResponse(initialState);

    res.json({
      interactiveResponse: initialResponse,
      diagnosisState: initialState,
      sessionId: `diag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        phase: 'initial',
        confidence: 0.0,
        urgency: 'low',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('險ｺ譁ｭ繧ｻ繝・す繝ｧ繝ｳ髢句ｧ九お繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: 'Failed to start diagnosis session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 險ｺ譁ｭ迥ｶ諷九・菫晏ｭ・
 * POST /api/interactive-diagnosis/save
 */
router.post('/save', async (req: Request, res: Response) => {
  try {
    const { sessionId, diagnosisState, userNotes } = req.body;

    // 縺薙％縺ｧ險ｺ譁ｭ迥ｶ諷九ｒ繝・・繧ｿ繝吶・繧ｹ縺ｫ菫晏ｭ・
    // 螳溯｣・ｾ具ｼ・
    // await saveDiagnosisSession(sessionId, diagnosisState, userNotes);

    res.json({
      success: true,
      message: 'Diagnosis session saved successfully',
      sessionId
    });

  } catch (error) {
    console.error('險ｺ譁ｭ繧ｻ繝・す繝ｧ繝ｳ菫晏ｭ倥お繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: 'Failed to save diagnosis session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
