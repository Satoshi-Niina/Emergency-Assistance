import { apiRequest } from './api';

// 繧ｯ繝ｩ繧､繧｢繝ｳ繝亥・縺ｧ縺ｯ繧ｵ繝ｼ繝舌・API繧貞他縺ｳ蜃ｺ縺・async function callOpenAIAPI(
  prompt: string,
  useKnowledgeBase: boolean = true
): Promise<string> {
  try {
    const response = await apiRequest('/chatgpt', {
      method: 'POST',
      body: JSON.stringify({
        text: prompt,
        useOnlyKnowledgeBase: useKnowledgeBase,
      }),
    });

    return response.response || '蠢懃ｭ斐ｒ蜿門ｾ励〒縺阪∪縺帙ｓ縺ｧ縺励◆縲・;
  } catch (error) {
    console.error('OpenAI API蜻ｼ縺ｳ蜃ｺ縺励お繝ｩ繝ｼ:', error);
    throw error;
  }
}

export interface QAFlowStep {
  id: string;
  question: string;
  type: 'text' | 'choice' | 'image' | 'location';
  options?: string[];
  required: boolean;
  dependsOn?: string; // 蜑阪・蝗樒ｭ斐↓萓晏ｭ倥☆繧玖ｳｪ蝠・  condition?: string; // 陦ｨ遉ｺ譚｡莉ｶ
  reasoning?: string; // 雉ｪ蝠上・逶ｮ逧・  expectedOutcome?: string; // 譛溷ｾ・＆繧後ｋ邨先棡
  emergencyAction?: string; // 邱頑･譎ゅ・蟇ｾ蠢・  timeLimit?: number; // 譎る俣蛻ｶ髯撰ｼ亥・・・}

export interface QAFlow {
  id: string;
  title: string;
  description: string;
  category: string;
  steps: QAFlowStep[];
  knowledgeContext: string[];
  emergencyContact?: string; // 邱頑･騾｣邨｡蜈・  estimatedTime?: number; // 謗ｨ螳壽園隕∵凾髢・}

export interface QAAnswer {
  stepId: string;
  answer: string;
  timestamp: Date;
  confidence?: number;
}

export interface ProblemCategory {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  emergencyLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedTime: number;
  requiresExpert: boolean;
  flowSteps: QAFlowStep[];
}

export class QAFlowManager {
  private currentFlow: QAFlow | null = null;
  private answers: QAAnswer[] = [];
  private currentStepIndex = 0;
  private problemCategory: ProblemCategory | null = null;

  // 蝠城｡悟・鬘槭→繝輔Ο繝ｼ莠域ｸｬ
  async classifyProblemAndPredictFlow(
    initialDescription: string,
    knowledgeBase: string[]
  ): Promise<{ category: ProblemCategory; flow: QAFlow } | null> {
    try {
      const classificationPrompt = `
縺ゅ↑縺溘・菫晏ｮ育畑霆翫・蟆る摩謚陦楢・〒縺吶ょ・譛溘・蝠城｡瑚ｪｬ譏弱°繧牙撫鬘後ｒ蛻・｡槭＠縲・←蛻・↑雉ｪ蝠上ヵ繝ｭ繝ｼ繧剃ｺ域ｸｬ縺励※縺上□縺輔＞縲・
**蛻晄悄蝠城｡瑚ｪｬ譏・*: ${initialDescription}
**蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｪ繝翫Ξ繝・ず**: ${knowledgeBase.join(', ')}

莉･荳九・蝠城｡後き繝・ざ繝ｪ縺九ｉ譛繧る←蛻・↑繧ゅ・繧帝∈謚槭＠縲∵ｮｵ髫守噪縺ｪ雉ｪ蝠上ヵ繝ｭ繝ｼ繧堤函謌舌＠縺ｦ縺上□縺輔＞・・
## 蝠城｡後き繝・ざ繝ｪ
1. **繧ｨ繝ｳ繧ｸ繝ｳ邉ｻ**: 繧ｨ繝ｳ繧ｸ繝ｳ縺後°縺九ｉ縺ｪ縺・∫焚髻ｳ縲√が繝ｼ繝舌・繝偵・繝育ｭ・2. **髮ｻ豌礼ｳｻ**: 繝舌ャ繝・Μ繝ｼ縲∫・譏弱√せ繧ｿ繝ｼ繧ｿ繝ｼ遲・3. **豐ｹ蝨ｧ邉ｻ**: 豐ｹ蝨ｧ繝昴Φ繝励√す繝ｪ繝ｳ繝繝ｼ縲・・邂｡遲・4. **襍ｰ陦檎ｳｻ**: 繝悶Ξ繝ｼ繧ｭ縲√ち繧､繝､縲√し繧ｹ繝壹Φ繧ｷ繝ｧ繝ｳ遲・5. **菴懈･ｭ陬・ｽｮ邉ｻ**: 繧ｯ繝ｬ繝ｼ繝ｳ縲√え繧､繝ｳ繝√∵ｲｹ蝨ｧ繧ｷ繝ｧ繝吶Ν遲・6. **螳牙・陬・ｽｮ邉ｻ**: 髱槫ｸｸ蛛懈ｭ｢縲∝ｮ牙・繧ｹ繧､繝・メ遲・
莉･荳九・JSON蠖｢蠑上〒霑斐＠縺ｦ縺上□縺輔＞・・{
  "category": {
    "id": "engine_start",
    "name": "繧ｨ繝ｳ繧ｸ繝ｳ蟋句虚荳崎憶",
    "description": "繧ｨ繝ｳ繧ｸ繝ｳ縺梧ｭ｣蟶ｸ縺ｫ蟋句虚縺励↑縺・撫鬘・,
    "keywords": ["繧ｨ繝ｳ繧ｸ繝ｳ", "蟋句虚", "縺九°繧峨↑縺・, "繧ｹ繧ｿ繝ｼ繧ｿ繝ｼ"],
    "emergencyLevel": "medium",
    "estimatedTime": 30,
    "requiresExpert": false
  },
  "flow": {
    "id": "engine_start_flow",
    "title": "繧ｨ繝ｳ繧ｸ繝ｳ蟋句虚荳崎憶縺ｮ險ｺ譁ｭ繝輔Ο繝ｼ",
    "description": "繧ｨ繝ｳ繧ｸ繝ｳ縺後°縺九ｉ縺ｪ縺・撫鬘後・谿ｵ髫守噪險ｺ譁ｭ",
    "category": "engine_start",
    "emergencyContact": "謚陦捺髪謠ｴ繧ｻ繝ｳ繧ｿ繝ｼ: 0123-456-789",
    "estimatedTime": 30,
    "steps": [
      {
        "id": "location_check",
        "question": "迴ｾ蝨ｨ縺ｮ蝣ｴ謇繧呈蕗縺医※縺上□縺輔＞",
        "type": "choice",
        "options": ["菫晄攝邱・, "霆雁ｺｫ", "迴ｾ蝣ｴ", "縺昴・莉・],
        "required": true,
        "reasoning": "蝣ｴ謇縺ｫ繧医▲縺ｦ蟇ｾ蠢懈婿豕輔′逡ｰ縺ｪ繧九◆繧・,
        "expectedOutcome": "蟇ｾ蠢懷庄閭ｽ縺ｪ蝣ｴ謇縺九←縺・°縺ｮ蛻､譁ｭ"
      },
      {
        "id": "time_check",
        "question": "菴懈･ｭ縺ｫ菴ｿ縺医ｋ譎る俣縺ｯ縺ゅｊ縺ｾ縺吶°・・,
        "type": "choice",
        "options": ["20蛻・ｻ･荳・, "30蛻・ｨ句ｺｦ", "1譎る俣遞句ｺｦ", "蜊∝・縺ｫ縺ゅｋ"],
        "required": true,
        "reasoning": "譎る俣縺ｫ繧医▲縺ｦ蟇ｾ蠢懈婿豕輔ｒ豎ｺ螳・,
        "expectedOutcome": "邱頑･蟇ｾ蠢懊・蠢・ｦ∵ｧ蛻､譁ｭ",
        "emergencyAction": "20蛻・ｻ･荳九・蝣ｴ蜷・ 縺吶＄縺ｫ謾ｯ謠ｴ閠・∈騾｣邨｡縺励※縺上□縺輔＞",
        "timeLimit": 20
      }
    ]
  }
}
`;

      const response = await callOpenAIAPI(classificationPrompt, true);

      try {
        const parsed = JSON.parse(response);
        return {
          category: parsed.category,
          flow: parsed.flow,
        };
      } catch (parseError) {
        console.error('蝠城｡悟・鬘槭・JSON隗｣譫舌お繝ｩ繝ｼ:', parseError);
        return null;
      }
    } catch (error) {
      console.error('蝠城｡悟・鬘槭お繝ｩ繝ｼ:', error);
      return null;
    }
  }

  // 蜍慕噪雉ｪ蝠冗函謌撰ｼ域隼蝟・沿・・  async generateNextQuestion(
    context: string,
    previousAnswers: QAAnswer[],
    knowledgeBase: string[],
    currentFlow?: QAFlow
  ): Promise<QAFlowStep | null> {
    try {
      // 莠句燕螳夂ｾｩ縺輔ｌ縺溘ヵ繝ｭ繝ｼ縺後≠繧句ｴ蜷医・縺昴ｌ繧剃ｽｿ逕ｨ
      if (currentFlow && currentFlow.steps.length > 0) {
        const nextStepIndex = previousAnswers.length;
        if (nextStepIndex < currentFlow.steps.length) {
          const nextStep = currentFlow.steps[nextStepIndex];

          // 譚｡莉ｶ繝√ぉ繝・け
          if (nextStep.condition) {
            const shouldShow = this.evaluateCondition(
              nextStep.condition,
              previousAnswers
            );
            if (!shouldShow) {
              return this.generateNextQuestion(
                context,
                previousAnswers,
                knowledgeBase,
                currentFlow
              );
            }
          }

          return nextStep;
        } else {
          // 繝輔Ο繝ｼ縺悟ｮ御ｺ・＠縺溷ｴ蜷医∬ｧ｣豎ｺ遲悶ｒ逕滓・
          return null;
        }
      }

      // 蜍慕噪雉ｪ蝠冗函謌撰ｼ医ヵ繧ｩ繝ｼ繝ｫ繝舌ャ繧ｯ・・      const contextPrompt = `
縺ゅ↑縺溘・菫晏ｮ育畑霆翫・蟆る摩謚陦楢・〒縺吶ょ撫鬘瑚ｧ｣豎ｺ縺ｮ縺溘ａ縺ｫ谿ｵ髫守噪縺ｫ雉ｪ蝠上ｒ陦後＞縺ｾ縺吶・
**迴ｾ蝨ｨ縺ｮ迥ｶ豕・*: ${context}
**縺薙ｌ縺ｾ縺ｧ縺ｮ蝗樒ｭ・*: ${previousAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｪ繝翫Ξ繝・ず**: ${knowledgeBase.join(', ')}

谺｡縺ｮ雉ｪ蝠上・莉･荳九・譚｡莉ｶ繧呈ｺ縺溘☆蠢・ｦ√′縺ゅｊ縺ｾ縺呻ｼ・1. **蝠城｡後・蜴溷屏迚ｹ螳壹↓逶ｴ邨舌☆繧・*: 逞・憾縺九ｉ蜴溷屏繧堤ｵ槭ｊ霎ｼ繧雉ｪ蝠・2. **蜈ｷ菴鍋噪縺ｪ蟇ｾ蠢懃ｭ悶ｒ蟆弱￥**: 蝗樒ｭ斐↓繧医▲縺ｦ蜈ｷ菴鍋噪縺ｪ蜃ｦ鄂ｮ縺梧ｱｺ縺ｾ繧玖ｳｪ蝠・3. **螳牙・遒ｺ隱阪ｒ蜆ｪ蜈・*: 蜊ｱ髯ｺ諤ｧ縺ｮ譛臥┌繧呈怙蛻昴↓遒ｺ隱・4. **谿ｵ髫守噪縺ｪ險ｺ譁ｭ**: 邁｡蜊倥↑遒ｺ隱阪°繧芽､・尅縺ｪ險ｺ譁ｭ縺ｸ
5. **螳溽畑逧・↑驕ｸ謚櫁い**: 驕ｸ謚櫁い縺後≠繧句ｴ蜷医・蜈ｷ菴鍋噪縺ｪ驕ｸ謚櫁い繧呈署遉ｺ

雉ｪ蝠上・遞ｮ鬘橸ｼ・- **逞・憾遒ｺ隱・*: 蜈ｷ菴鍋噪縺ｪ逞・憾繧・焚蟶ｸ縺ｮ隧ｳ邏ｰ
- **蜴溷屏迚ｹ螳・*: 閠・∴繧峨ｌ繧句次蝗縺ｮ邨槭ｊ霎ｼ縺ｿ
- **螳牙・遒ｺ隱・*: 菴懈･ｭ縺ｮ螳牙・諤ｧ繧・ｷ頑･蠎ｦ
- **蟇ｾ蠢懃ｭ夜∈謚・*: 蜈ｷ菴鍋噪縺ｪ蜃ｦ鄂ｮ譁ｹ豕輔・驕ｸ謚・- **遒ｺ隱阪・讀懆ｨｼ**: 蜃ｦ鄂ｮ蠕後・遒ｺ隱堺ｺ矩・
莉･荳九・JSON蠖｢蠑上〒霑斐＠縺ｦ縺上□縺輔＞・・{
  "id": "step_${Date.now()}",
  "question": "蜈ｷ菴鍋噪縺ｧ螳溽畑逧・↑雉ｪ蝠丞・螳ｹ",
  "type": "text",
  "required": true,
  "options": ["驕ｸ謚櫁い1", "驕ｸ謚櫁い2", "驕ｸ謚櫁い3"],
  "reasoning": "縺薙・雉ｪ蝠上〒菴輔ｒ迚ｹ螳壹・隗｣豎ｺ縺励◆縺・°",
  "expectedOutcome": "縺薙・雉ｪ蝠上∈縺ｮ蝗樒ｭ斐〒蠕励ｉ繧後ｋ諠・ｱ"
}
`;

      const response = await callOpenAIAPI(contextPrompt, true);

      try {
        const parsed = JSON.parse(response);

        // 驕ｸ謚櫁い縺後≠繧句ｴ蜷医・choice繧ｿ繧､繝励↓險ｭ螳・        const questionType =
          parsed.options && parsed.options.length > 0 ? 'choice' : 'text';

        return {
          id: parsed.id,
          question: parsed.question,
          type: questionType,
          required: parsed.required !== false,
          options: parsed.options || [],
          dependsOn: parsed.dependsOn,
          condition: parsed.condition,
          reasoning: parsed.reasoning,
          expectedOutcome: parsed.expectedOutcome,
        };
      } catch (parseError) {
        console.error('雉ｪ蝠冗函謌舌・JSON隗｣譫舌お繝ｩ繝ｼ:', parseError);
        // 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ逕ｨ縺ｮ蝓ｺ譛ｬ逧・↑雉ｪ蝠上ｒ霑斐☆
        return {
          id: `step_${Date.now()}`,
          question: '蝠城｡後・蜈ｷ菴鍋噪縺ｪ逞・憾繧呈蕗縺医※縺上□縺輔＞縲・,
          type: 'text',
          required: true,
          options: [],
          reasoning: '蝓ｺ譛ｬ逧・↑逞・憾遒ｺ隱・,
          expectedOutcome: '蝠城｡後・隧ｳ邏ｰ謚頑升',
        };
      }
    } catch (error) {
      console.error('蜍慕噪雉ｪ蝠冗函謌舌お繝ｩ繝ｼ:', error);
      return null;
    }
  }

  // 譚｡莉ｶ隧穂ｾ｡
  private evaluateCondition(condition: string, answers: QAAnswer[]): boolean {
    try {
      // 邁｡蜊倥↑譚｡莉ｶ隧穂ｾ｡・亥ｮ滄圀縺ｮ螳溯｣・〒縺ｯ繧医ｊ隍・尅縺ｪ譚｡莉ｶ隗｣譫舌′蠢・ｦ・ｼ・      const lastAnswer = answers[answers.length - 1];
      if (!lastAnswer) return true;

      if (condition.includes('time_limit')) {
        const timeLimit = parseInt(
          condition.match(/time_limit:(\d+)/)?.[1] || '0'
        );
        const timeAnswer = lastAnswer.answer;
        if (
          timeAnswer.includes('20蛻・ｻ･荳・) ||
          timeAnswer.includes('30蛻・ｻ･荳・)
        ) {
          return false; // 譎る俣蛻ｶ髯舌↓繧医ｊ谺｡縺ｮ雉ｪ蝠上ｒ繧ｹ繧ｭ繝・・
        }
      }

      return true;
    } catch (error) {
      console.error('譚｡莉ｶ隧穂ｾ｡繧ｨ繝ｩ繝ｼ:', error);
      return true;
    }
  }

  // 邱頑･蟇ｾ蠢懊メ繧ｧ繝・け
  checkEmergencyAction(currentStep: QAFlowStep, answer: string): string | null {
    if (currentStep.emergencyAction && currentStep.timeLimit) {
      const timeAnswer = answer.toLowerCase();
      if (
        timeAnswer.includes(`${currentStep.timeLimit}蛻・ｻ･荳義) ||
        timeAnswer.includes('20蛻・ｻ･荳・) ||
        timeAnswer.includes('30蛻・ｻ･荳・)
      ) {
        return currentStep.emergencyAction;
      }
    }
    return null;
  }

  // 蝗樒ｭ斐↓蝓ｺ縺･縺乗ｬ｡縺ｮ繧ｹ繝・ャ繝玲ｱｺ螳・  async determineNextStep(
    currentAnswer: QAAnswer,
    allAnswers: QAAnswer[],
    flow: QAFlow
  ): Promise<QAFlowStep | null> {
    try {
      const analysisPrompt = `
莉･荳九・蝗樒ｭ斐ｒ蛻・梵縺励※縲∵ｬ｡縺ｮ繧ｹ繝・ャ繝励ｒ豎ｺ螳壹＠縺ｦ縺上□縺輔＞・・
**迴ｾ蝨ｨ縺ｮ蝗樒ｭ・*: ${currentAnswer.answer}
**縺薙ｌ縺ｾ縺ｧ縺ｮ蝗樒ｭ・*: ${allAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｪ繧ｹ繝・ャ繝・*: ${flow.steps.map(s => s.question).join(', ')}

蛻・梵邨先棡繧剃ｻ･荳九・JSON蠖｢蠑上〒霑斐＠縺ｦ縺上□縺輔＞・・{
  "nextStepId": "谺｡縺ｮ繧ｹ繝・ャ繝励・ID",
  "reasoning": "縺薙・繧ｹ繝・ャ繝励ｒ驕ｸ繧薙□逅・罰",
  "isComplete": false,
  "suggestedAction": "謗ｨ螂ｨ縺輔ｌ繧句ｯｾ蠢・
}
`;

      const response = await callOpenAIAPI(analysisPrompt, true);

      try {
        const parsed = JSON.parse(response);
        const nextStep = flow.steps.find(s => s.id === parsed.nextStepId);
        return nextStep || null;
      } catch (parseError) {
        console.error('谺｡縺ｮ繧ｹ繝・ャ繝玲ｱｺ螳壹・JSON隗｣譫舌お繝ｩ繝ｼ:', parseError);
        return null;
      }
    } catch (error) {
      console.error('谺｡縺ｮ繧ｹ繝・ャ繝玲ｱｺ螳壹お繝ｩ繝ｼ:', error);
      return null;
    }
  }

  // 蝠城｡瑚ｧ｣豎ｺ縺ｮ謠先｡育函謌・  async generateSolution(
    allAnswers: QAAnswer[],
    knowledgeBase: string[],
    problemCategory?: ProblemCategory
  ): Promise<string> {
    try {
      const solutionPrompt = `
縺ゅ↑縺溘・菫晏ｮ育畑霆翫・蟆る摩謚陦楢・〒縺吶ょ庶髮・＠縺滓ュ蝣ｱ縺ｫ蝓ｺ縺･縺・※縲∝・菴鍋噪縺ｧ螳溽畑逧・↑隗｣豎ｺ遲悶ｒ謠先｡医＠縺ｦ縺上□縺輔＞縲・
**蝠城｡後き繝・ざ繝ｪ**: ${problemCategory?.name || '荳肴・'}
**蜿朱寔縺励◆諠・ｱ**: ${allAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**蟆る摩繝翫Ξ繝・ず**: ${knowledgeBase.join(', ')}

莉･荳九・蠖｢蠑上〒蜈ｷ菴鍋噪縺ｪ隗｣豎ｺ遲悶ｒ謠先｡医＠縺ｦ縺上□縺輔＞・・
## 剥 蝠城｡後・迚ｹ螳・- 迴ｾ蝨ｨ逋ｺ逕溘＠縺ｦ縺・ｋ蝠城｡後・蜈ｷ菴鍋噪縺ｪ蜀・ｮｹ
- 蠖ｱ髻ｿ遽・峇縺ｨ邱頑･蠎ｦ

## 笞・・螳牙・遒ｺ隱・- 菴懈･ｭ蜑阪・螳牙・遒ｺ隱堺ｺ矩・- 蜊ｱ髯ｺ諤ｧ縺ｮ譛臥┌縺ｨ蟇ｾ蜃ｦ豕・
## 屏・・蜈ｷ菴鍋噪縺ｪ蟇ｾ蠢懈焔鬆・1. **貅門ｙ**: 蠢・ｦ√↑蟾･蜈ｷ繝ｻ驛ｨ蜩√・螳牙・陬・ｙ
2. **菴懈･ｭ謇矩・*: 繧ｹ繝・ャ繝励ヰ繧､繧ｹ繝・ャ繝励・蜈ｷ菴鍋噪縺ｪ謇矩・3. **遒ｺ隱堺ｺ矩・*: 蜷・せ繝・ャ繝励〒縺ｮ遒ｺ隱阪・繧､繝ｳ繝・
## 搭 豕ｨ諢丈ｺ矩・- 菴懈･ｭ譎ゅ・螳牙・荳翫・豕ｨ諢冗せ
- 繧医￥縺ゅｋ螟ｱ謨励ヱ繧ｿ繝ｼ繝ｳ縺ｨ蝗樣∩豕・- 蟆る摩螳ｶ縺ｸ縺ｮ逶ｸ隲・′蠢・ｦ√↑蝣ｴ蜷・
## 笨・螳御ｺ・｢ｺ隱・- 菴懈･ｭ螳御ｺ・ｾ後・遒ｺ隱堺ｺ矩・- 蜀咲匱髦ｲ豁｢遲・- 谺｡蝗樒せ讀懈凾縺ｮ豕ｨ諢冗せ

## 圷 邱頑･譎ゅ・蟇ｾ蠢・- 菴懈･ｭ荳ｭ縺ｫ蝠城｡後′逋ｺ逕溘＠縺溷ｴ蜷医・蟇ｾ蜃ｦ豕・- 邱頑･騾｣邨｡蜈・ ${problemCategory?.requiresExpert ? '蟆る摩謚陦楢・↓騾｣邨｡縺励※縺上□縺輔＞' : '謚陦捺髪謠ｴ繧ｻ繝ｳ繧ｿ繝ｼ'}

蟆る摩逧・〒螳溽畑逧・√°縺､螳牙・縺ｪ隗｣豎ｺ遲悶ｒ謠蝉ｾ帙＠縺ｦ縺上□縺輔＞縲・`;

      return await callOpenAIAPI(solutionPrompt, true);
    } catch (error) {
      console.error('隗｣豎ｺ遲也函謌舌お繝ｩ繝ｼ:', error);
      return '隗｣豎ｺ遲悶・逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆縲ょｰる摩螳ｶ縺ｫ逶ｸ隲・＠縺ｦ縺上□縺輔＞縲・;
    }
  }

  // 繝翫Ξ繝・ず繝吶・繧ｹ縺ｮ蟄ｦ鄙・  async learnFromQA(
    question: string,
    answer: string,
    solution: string,
    success: boolean
  ): Promise<void> {
    try {
      const learningPrompt = `
莉･荳九・Q&A繧ｻ繝・す繝ｧ繝ｳ縺九ｉ蟄ｦ鄙偵ョ繝ｼ繧ｿ繧堤函謌舌＠縺ｦ縺上□縺輔＞・・
**雉ｪ蝠・*: ${question}
**蝗樒ｭ・*: ${answer}
**隗｣豎ｺ遲・*: ${solution}
**謌仙粥**: ${success}

縺薙・諠・ｱ繧偵リ繝ｬ繝・ず繝吶・繧ｹ縺ｫ霑ｽ蜉縺吶ｋ縺溘ａ縺ｮ讒矩蛹悶ョ繝ｼ繧ｿ繧堤函謌舌＠縺ｦ縺上□縺輔＞・・{
  "category": "繧ｫ繝・ざ繝ｪ",
  "keywords": ["繧ｭ繝ｼ繝ｯ繝ｼ繝・", "繧ｭ繝ｼ繝ｯ繝ｼ繝・"],
  "summary": "隕∫ｴ・,
  "solution": "隗｣豎ｺ遲・,
  "prevention": "莠磯亟遲・
}
`;

      const response = await callOpenAIAPI(learningPrompt, false);

      // 蟄ｦ鄙偵ョ繝ｼ繧ｿ繧剃ｿ晏ｭ假ｼ亥ｮ滄圀縺ｮ螳溯｣・〒縺ｯ繝・・繧ｿ繝吶・繧ｹ縺ｫ菫晏ｭ假ｼ・      console.log('蟄ｦ鄙偵ョ繝ｼ繧ｿ逕滓・:', response);
    } catch (error) {
      console.error('蟄ｦ鄙偵ョ繝ｼ繧ｿ逕滓・繧ｨ繝ｩ繝ｼ:', error);
    }
  }

  // 繝輔Ο繝ｼ迥ｶ諷九・邂｡逅・  setCurrentFlow(flow: QAFlow): void {
    this.currentFlow = flow;
    this.answers = [];
    this.currentStepIndex = 0;
  }

  setProblemCategory(category: ProblemCategory): void {
    this.problemCategory = category;
  }

  addAnswer(answer: QAAnswer): void {
    this.answers.push(answer);
  }

  getCurrentAnswers(): QAAnswer[] {
    return this.answers;
  }

  getCurrentFlow(): QAFlow | null {
    return this.currentFlow;
  }

  getProblemCategory(): ProblemCategory | null {
    return this.problemCategory;
  }

  reset(): void {
    this.currentFlow = null;
    this.answers = [];
    this.currentStepIndex = 0;
    this.problemCategory = null;
  }
}

// 繧ｷ繝ｳ繧ｰ繝ｫ繝医Φ繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ
export const qaFlowManager = new QAFlowManager();
