// 諡｡蠑ｵ縺輔ｌ縺櫺A繝槭ロ繝ｼ繧ｸ繝｣繝ｼ - OpenAI豢ｻ逕ｨ迚・
import { QAFlowStep, QAAnswer, QAFlow, ProblemCategory } from './qa-flow-manager';

interface EmergencyProcedure {
  id: string;
  title: string;
  description: string;
  steps: string[];
  safetyNotes: string[];
  requiredTools: string[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

interface KnowledgeBaseItem {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  lastUpdated: Date;
  source: string;
}

interface ContextualQuestion {
  question: string;
  reasoning: string;
  expectedOutcome: string;
  followUpQuestions?: string[];
  emergencyTriggers?: string[];
  knowledgeReferences?: string[];
}

// 繧ｯ繝ｩ繧､繧｢繝ｳ繝亥・縺ｧ縺ｯ繧ｵ繝ｼ繝舌・API繧貞他縺ｳ蜃ｺ縺・
async function callOpenAIAPI(prompt: string, useKnowledgeBase: boolean = true): Promise<string> {
  try {
    const response = await fetch('/api/chatgpt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        text: prompt,
        useOnlyKnowledgeBase: useKnowledgeBase
      })
    });

    if (!response.ok) {
      throw new Error(`API蜻ｼ縺ｳ蜃ｺ縺励お繝ｩ繝ｼ: ${response.status}`);
    }

    const data = await response.json();
    return data.response || '蠢懃ｭ斐ｒ蜿門ｾ励〒縺阪∪縺帙ｓ縺ｧ縺励◆縲・;
  } catch (error) {
    console.error('OpenAI API蜻ｼ縺ｳ蜃ｺ縺励お繝ｩ繝ｼ:', error);
    throw error;
  }
}

export class EnhancedQAManager {
  private currentFlow: QAFlow | null = null;
  private answers: QAAnswer[] = [];
  private problemCategory: ProblemCategory | null = null;
  private knowledgeBase: KnowledgeBaseItem[] = [];
  private emergencyProcedures: EmergencyProcedure[] = [];
  private contextualHistory: ContextualQuestion[] = [];

  // 繝翫Ξ繝・ず繝吶・繧ｹ縺ｨ蠢懈･蜃ｦ鄂ｮ諠・ｱ縺ｮ蛻晄悄蛹・
  async initializeKnowledgeBase(): Promise<void> {
    try {
      // 繝翫Ξ繝・ず繝吶・繧ｹ縺ｮ蜿門ｾ・
      const knowledgeResponse = await fetch('/api/knowledge-base', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (knowledgeResponse.ok) {
        this.knowledgeBase = await knowledgeResponse.json();
      }

      // 蠢懈･蜃ｦ鄂ｮ諠・ｱ縺ｮ蜿門ｾ・
      const emergencyResponse = await fetch('/api/emergency-procedures', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (emergencyResponse.ok) {
        this.emergencyProcedures = await emergencyResponse.json();
      }
    } catch (error) {
      console.error('繝翫Ξ繝・ず繝吶・繧ｹ蛻晄悄蛹悶お繝ｩ繝ｼ:', error);
    }
  }

  // 蝠城｡後・隧ｳ邏ｰ蛻・梵縺ｨ譛驕ｩ縺ｪ雉ｪ蝠上ヵ繝ｭ繝ｼ縺ｮ逕滓・
  async analyzeProblemAndGenerateFlow(
    initialDescription: string,
    context: string = ''
  ): Promise<{ category: ProblemCategory; flow: QAFlow; contextualQuestions: ContextualQuestion[] }> {
    try {
      const analysisPrompt = `
縺ゅ↑縺溘・菫晏ｮ育畑霆翫・蟆る摩謚陦楢・〒縺吶ょ・譛溘・蝠城｡瑚ｪｬ譏弱ｒ隧ｳ邏ｰ縺ｫ蛻・梵縺励∵怙驕ｩ縺ｪ雉ｪ蝠上ヵ繝ｭ繝ｼ繧堤函謌舌＠縺ｦ縺上□縺輔＞縲・

**蛻晄悄蝠城｡瑚ｪｬ譏・*: ${initialDescription}
**霑ｽ蜉繧ｳ繝ｳ繝・く繧ｹ繝・*: ${context}
**蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｪ繝翫Ξ繝・ず**: ${this.knowledgeBase.map(k => k.title).join(', ')}
**蠢懈･蜃ｦ鄂ｮ諠・ｱ**: ${this.emergencyProcedures.map(e => e.title).join(', ')}

莉･荳九・蛻・梵繧定｡後▲縺ｦ縺上□縺輔＞・・

1. **蝠城｡後・蛻・｡・*: 繧ｨ繝ｳ繧ｸ繝ｳ邉ｻ縲・崕豌礼ｳｻ縲∵ｲｹ蝨ｧ邉ｻ縲∬ｵｰ陦檎ｳｻ縲∽ｽ懈･ｭ陬・ｽｮ邉ｻ縲∝ｮ牙・陬・ｽｮ邉ｻ縺九ｉ譛驕ｩ縺ｪ繧ｫ繝・ざ繝ｪ繧帝∈謚・
2. **邱頑･蠎ｦ縺ｮ蛻､螳・*: 螳牙・繝ｪ繧ｹ繧ｯ縲∽ｽ懈･ｭ縺ｸ縺ｮ蠖ｱ髻ｿ縲∵凾髢鍋噪蛻ｶ邏・ｒ閠・・
3. **雉ｪ蝠乗姶逡･**: 谿ｵ髫守噪縺ｪ險ｺ譁ｭ縺ｫ譛驕ｩ縺ｪ雉ｪ蝠上・鬆・ｺ上→蜀・ｮｹ
4. **蠢懈･蜃ｦ鄂ｮ縺ｮ蠢・ｦ∵ｧ**: 蜊ｳ蠎ｧ縺ｫ蠢・ｦ√↑螳牙・蟇ｾ蠢懊ｄ蠢懈･蜃ｦ鄂ｮ縺ｮ譛臥┌
5. **蟆る摩遏･隴倥・豢ｻ逕ｨ**: 繝翫Ξ繝・ず繝吶・繧ｹ縺ｨ蠢懈･蜃ｦ鄂ｮ諠・ｱ繧呈ｴｻ逕ｨ縺励◆蜈ｷ菴鍋噪縺ｪ雉ｪ蝠・

莉･荳九・JSON蠖｢蠑上〒霑斐＠縺ｦ縺上□縺輔＞・・
{
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
        "id": "safety_check",
        "question": "螳牙・遒ｺ隱・ 菴懈･ｭ迺ｰ蠅・↓蜊ｱ髯ｺ縺ｯ縺ゅｊ縺ｾ縺帙ｓ縺具ｼ・,
        "type": "choice",
        "options": ["螳牙・", "蜊ｱ髯ｺ", "荳肴・"],
        "required": true,
        "reasoning": "菴懈･ｭ蜑阪・螳牙・遒ｺ隱・,
        "expectedOutcome": "螳牙・縺ｪ菴懈･ｭ迺ｰ蠅・・遒ｺ隱・,
        "emergencyAction": "蜊ｱ髯ｺ縺ｪ蝣ｴ蜷医・菴懈･ｭ繧剃ｸｭ豁｢縺励∝ｮ牙・遒ｺ菫昴ｒ蜆ｪ蜈医＠縺ｦ縺上□縺輔＞"
      }
    ]
  },
  "contextualQuestions": [
    {
      "question": "蝠城｡後・逋ｺ逕滓凾譛溘ｒ謨吶∴縺ｦ縺上□縺輔＞",
      "reasoning": "蝠城｡後・邨梧凾螟牙喧縺ｮ謚頑升",
      "expectedOutcome": "蝠城｡後・騾ｲ陦悟ｺｦ蜷医＞縺ｮ蛻､譁ｭ",
      "followUpQuestions": ["蜑榊屓縺ｮ轤ｹ讀懊・縺・▽縺ｧ縺吶°・・, "鬘樔ｼｼ縺ｮ蝠城｡後・驕主悉縺ｫ縺ゅｊ縺ｾ縺励◆縺具ｼ・],
      "emergencyTriggers": ["遯∫┯逋ｺ逕・, "菴懈･ｭ荳ｭ縺ｫ逋ｺ逕・],
      "knowledgeReferences": ["螳壽悄轤ｹ讀懊ぎ繧､繝・, "謨・囿險ｺ譁ｭ繝槭ル繝･繧｢繝ｫ"]
    }
  ]
}
`;

      const response = await callOpenAIAPI(analysisPrompt, true);
      
      try {
        const parsed = JSON.parse(response);
        return {
          category: parsed.category,
          flow: parsed.flow,
          contextualQuestions: parsed.contextualQuestions || []
        };
      } catch (parseError) {
        console.error('蝠城｡悟・譫舌・JSON隗｣譫舌お繝ｩ繝ｼ:', parseError);
        throw new Error('蝠城｡悟・譫舌↓螟ｱ謨励＠縺ｾ縺励◆');
      }
    } catch (error) {
      console.error('蝠城｡悟・譫舌お繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  // 蜍慕噪雉ｪ蝠冗函謌撰ｼ医リ繝ｬ繝・ず繝吶・繧ｹ縺ｨ蠢懈･蜃ｦ鄂ｮ諠・ｱ繧呈ｴｻ逕ｨ・・
  async generateContextualQuestion(
    currentContext: string,
    previousAnswers: QAAnswer[],
    currentStep: QAFlowStep
  ): Promise<ContextualQuestion> {
    try {
      // 髢｢騾｣縺吶ｋ繝翫Ξ繝・ず縺ｨ蠢懈･蜃ｦ鄂ｮ繧呈､懃ｴ｢
      const relevantKnowledge = this.findRelevantKnowledge(currentContext, previousAnswers);
      const relevantProcedures = this.findRelevantProcedures(currentContext, previousAnswers);

      const contextualPrompt = `
縺ゅ↑縺溘・菫晏ｮ育畑霆翫・蟆る摩謚陦楢・〒縺吶ら樟蝨ｨ縺ｮ迥ｶ豕√↓蝓ｺ縺･縺・※縲∵怙繧ょ柑譫懃噪縺ｪ雉ｪ蝠上ｒ逕滓・縺励※縺上□縺輔＞縲・

**迴ｾ蝨ｨ縺ｮ迥ｶ豕・*: ${currentContext}
**迴ｾ蝨ｨ縺ｮ雉ｪ蝠・*: ${currentStep.question}
**縺薙ｌ縺ｾ縺ｧ縺ｮ蝗樒ｭ・*: ${previousAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**髢｢騾｣繝翫Ξ繝・ず**: ${relevantKnowledge.map(k => k.title).join(', ')}
**髢｢騾｣蠢懈･蜃ｦ鄂ｮ**: ${relevantProcedures.map(p => p.title).join(', ')}

莉･荳九・譚｡莉ｶ繧呈ｺ縺溘☆雉ｪ蝠上ｒ逕滓・縺励※縺上□縺輔＞・・

1. **迥ｶ豕√↓迚ｹ蛹・*: 迴ｾ蝨ｨ縺ｮ蝗樒ｭ斐→迥ｶ豕√↓蝓ｺ縺･縺・◆蜈ｷ菴鍋噪縺ｪ雉ｪ蝠・
2. **螳牙・諤ｧ蜆ｪ蜈・*: 蜊ｱ髯ｺ諤ｧ縺ｮ譌ｩ譛溽匱隕九ｒ驥崎ｦ・
3. **蜉ｹ邇・噪縺ｪ險ｺ譁ｭ**: 蜴溷屏迚ｹ螳壹↓逶ｴ邨舌☆繧玖ｳｪ蝠・
4. **螳溽畑逧・↑驕ｸ謚櫁い**: 迴ｾ蝣ｴ縺ｧ螳溯｡悟庄閭ｽ縺ｪ蟇ｾ蠢懃ｭ悶・謠千､ｺ
5. **繝翫Ξ繝・ず豢ｻ逕ｨ**: 蟆る摩遏･隴倥ｒ豢ｻ逕ｨ縺励◆鬮伜ｺｦ縺ｪ雉ｪ蝠・

莉･荳九・JSON蠖｢蠑上〒霑斐＠縺ｦ縺上□縺輔＞・・
{
  "question": "蜈ｷ菴鍋噪縺ｧ螳溽畑逧・↑雉ｪ蝠丞・螳ｹ",
  "reasoning": "縺薙・雉ｪ蝠上〒菴輔ｒ迚ｹ螳壹・隗｣豎ｺ縺励◆縺・°",
  "expectedOutcome": "縺薙・雉ｪ蝠上∈縺ｮ蝗樒ｭ斐〒蠕励ｉ繧後ｋ諠・ｱ",
  "followUpQuestions": ["髢｢騾｣縺吶ｋ霑ｽ蜉雉ｪ蝠・", "髢｢騾｣縺吶ｋ霑ｽ蜉雉ｪ蝠・"],
  "emergencyTriggers": ["邱頑･蟇ｾ蠢懊′蠢・ｦ√↑譚｡莉ｶ1", "邱頑･蟇ｾ蠢懊′蠢・ｦ√↑譚｡莉ｶ2"],
  "knowledgeReferences": ["蜿ら・縺吶∋縺阪リ繝ｬ繝・ず1", "蜿ら・縺吶∋縺阪リ繝ｬ繝・ず2"]
}
`;

      const response = await callOpenAIAPI(contextualPrompt, true);
      
      try {
        const parsed = JSON.parse(response);
        return {
          question: parsed.question,
          reasoning: parsed.reasoning,
          expectedOutcome: parsed.expectedOutcome,
          followUpQuestions: parsed.followUpQuestions || [],
          emergencyTriggers: parsed.emergencyTriggers || [],
          knowledgeReferences: parsed.knowledgeReferences || []
        };
      } catch (parseError) {
        console.error('譁・ц雉ｪ蝠冗函謌舌・JSON隗｣譫舌お繝ｩ繝ｼ:', parseError);
        return {
          question: "蝠城｡後・隧ｳ邏ｰ繧呈蕗縺医※縺上□縺輔＞縲・,
          reasoning: "蝓ｺ譛ｬ逧・↑諠・ｱ蜿朱寔",
          expectedOutcome: "蝠城｡後・隧ｳ邏ｰ謚頑升"
        };
      }
    } catch (error) {
      console.error('譁・ц雉ｪ蝠冗函謌舌お繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  // 髢｢騾｣縺吶ｋ繝翫Ξ繝・ず繝吶・繧ｹ諠・ｱ縺ｮ讀懃ｴ｢
  private findRelevantKnowledge(context: string, answers: QAAnswer[]): KnowledgeBaseItem[] {
    const searchTerms = [
      context,
      ...answers.map(a => a.answer),
      this.problemCategory?.keywords || []
    ].flat();

    return this.knowledgeBase.filter(item => 
      searchTerms.some(term => 
        item.title.toLowerCase().includes(term.toLowerCase()) ||
        item.content.toLowerCase().includes(term.toLowerCase()) ||
        item.keywords.some(keyword => 
          keyword.toLowerCase().includes(term.toLowerCase())
        )
      )
    ).slice(0, 5); // 荳贋ｽ・莉ｶ繧定ｿ斐☆
  }

  // 髢｢騾｣縺吶ｋ蠢懈･蜃ｦ鄂ｮ諠・ｱ縺ｮ讀懃ｴ｢
  private findRelevantProcedures(context: string, answers: QAAnswer[]): EmergencyProcedure[] {
    const searchTerms = [
      context,
      ...answers.map(a => a.answer),
      this.problemCategory?.keywords || []
    ].flat();

    return this.emergencyProcedures.filter(procedure => 
      searchTerms.some(term => 
        procedure.title.toLowerCase().includes(term.toLowerCase()) ||
        procedure.description.toLowerCase().includes(term.toLowerCase()) ||
        procedure.category.toLowerCase().includes(term.toLowerCase())
      )
    ).slice(0, 3); // 荳贋ｽ・莉ｶ繧定ｿ斐☆
  }

  // 蝗樒ｭ斐↓蝓ｺ縺･縺乗ｬ｡縺ｮ繧ｹ繝・ャ繝励・蜍慕噪豎ｺ螳・
  async determineNextStep(
    currentAnswer: QAAnswer,
    allAnswers: QAAnswer[],
    currentStep: QAFlowStep
  ): Promise<{ nextStep: QAFlowStep | null; contextualQuestion: ContextualQuestion | null; emergencyAction: string | null }> {
    try {
      const analysisPrompt = `
莉･荳九・蝗樒ｭ斐ｒ蛻・梵縺励※縲∵ｬ｡縺ｮ繧ｹ繝・ャ繝励ｒ豎ｺ螳壹＠縺ｦ縺上□縺輔＞・・

**迴ｾ蝨ｨ縺ｮ蝗樒ｭ・*: ${currentAnswer.answer}
**迴ｾ蝨ｨ縺ｮ雉ｪ蝠・*: ${currentStep.question}
**縺薙ｌ縺ｾ縺ｧ縺ｮ蝗樒ｭ・*: ${allAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｪ繧ｹ繝・ャ繝・*: ${this.currentFlow?.steps.map(s => s.question).join(', ') || ''}
**髢｢騾｣繝翫Ξ繝・ず**: ${this.findRelevantKnowledge(currentAnswer.answer, allAnswers).map(k => k.title).join(', ')}
**髢｢騾｣蠢懈･蜃ｦ鄂ｮ**: ${this.findRelevantProcedures(currentAnswer.answer, allAnswers).map(p => p.title).join(', ')}

蛻・梵邨先棡繧剃ｻ･荳九・JSON蠖｢蠑上〒霑斐＠縺ｦ縺上□縺輔＞・・
{
  "nextStepId": "谺｡縺ｮ繧ｹ繝・ャ繝励・ID",
  "reasoning": "縺薙・繧ｹ繝・ャ繝励ｒ驕ｸ繧薙□逅・罰",
  "isComplete": false,
  "contextualQuestion": {
    "question": "迥ｶ豕√↓蠢懊§縺溯ｿｽ蜉雉ｪ蝠・,
    "reasoning": "縺薙・雉ｪ蝠上・逶ｮ逧・,
    "expectedOutcome": "譛溷ｾ・＆繧後ｋ邨先棡"
  },
  "emergencyAction": "邱頑･蟇ｾ蠢懊′蠢・ｦ√↑蝣ｴ蜷医・謖・､ｺ",
  "suggestedKnowledge": ["蜿ら・縺吶∋縺阪リ繝ｬ繝・ず1", "蜿ら・縺吶∋縺阪リ繝ｬ繝・ず2"],
  "suggestedProcedures": ["螳溯｡後☆縺ｹ縺榊ｿ懈･蜃ｦ鄂ｮ1", "螳溯｡後☆縺ｹ縺榊ｿ懈･蜃ｦ鄂ｮ2"]
}
`;

      const response = await callOpenAIAPI(analysisPrompt, true);
      
      try {
        const parsed = JSON.parse(response);
        
        // 邱頑･蟇ｾ蠢懊・繝√ぉ繝・け
        let emergencyAction = null;
        if (parsed.emergencyAction) {
          emergencyAction = parsed.emergencyAction;
        }

        // 谺｡縺ｮ繧ｹ繝・ャ繝励・豎ｺ螳・
        let nextStep = null;
        if (parsed.nextStepId && this.currentFlow) {
          nextStep = this.currentFlow.steps.find(s => s.id === parsed.nextStepId) || null;
        }

        // 譁・ц雉ｪ蝠上・逕滓・
        let contextualQuestion = null;
        if (parsed.contextualQuestion) {
          contextualQuestion = parsed.contextualQuestion;
        }

        return {
          nextStep,
          contextualQuestion,
          emergencyAction
        };
      } catch (parseError) {
        console.error('谺｡縺ｮ繧ｹ繝・ャ繝玲ｱｺ螳壹・JSON隗｣譫舌お繝ｩ繝ｼ:', parseError);
        return {
          nextStep: null,
          contextualQuestion: null,
          emergencyAction: null
        };
      }
    } catch (error) {
      console.error('谺｡縺ｮ繧ｹ繝・ャ繝玲ｱｺ螳壹お繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  // 隗｣豎ｺ遲悶・逕滓・・医リ繝ｬ繝・ず繝吶・繧ｹ縺ｨ蠢懈･蜃ｦ鄂ｮ諠・ｱ繧呈ｴｻ逕ｨ・・
  async generateComprehensiveSolution(
    allAnswers: QAAnswer[],
    problemCategory?: ProblemCategory
  ): Promise<string> {
    try {
      const relevantKnowledge = this.findRelevantKnowledge('', allAnswers);
      const relevantProcedures = this.findRelevantProcedures('', allAnswers);

      const solutionPrompt = `
縺ゅ↑縺溘・菫晏ｮ育畑霆翫・蟆る摩謚陦楢・〒縺吶ょ庶髮・＠縺滓ュ蝣ｱ縺ｨ蟆る摩遏･隴倥↓蝓ｺ縺･縺・※縲∝桁諡ｬ逧・↑隗｣豎ｺ遲悶ｒ謠先｡医＠縺ｦ縺上□縺輔＞縲・

**蝠城｡後き繝・ざ繝ｪ**: ${problemCategory?.name || '荳肴・'}
**蜿朱寔縺励◆諠・ｱ**: ${allAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**髢｢騾｣繝翫Ξ繝・ず**: ${relevantKnowledge.map(k => `${k.title}: ${k.content}`).join('\n')}
**髢｢騾｣蠢懈･蜃ｦ鄂ｮ**: ${relevantProcedures.map(p => `${p.title}: ${p.description}`).join('\n')}

莉･荳九・蠖｢蠑上〒蜈ｷ菴鍋噪縺ｪ隗｣豎ｺ遲悶ｒ謠先｡医＠縺ｦ縺上□縺輔＞・・

## 剥 蝠城｡後・迚ｹ螳・
- 迴ｾ蝨ｨ逋ｺ逕溘＠縺ｦ縺・ｋ蝠城｡後・蜈ｷ菴鍋噪縺ｪ蜀・ｮｹ
- 蠖ｱ髻ｿ遽・峇縺ｨ邱頑･蠎ｦ
- 譬ｹ譛ｬ蜴溷屏縺ｮ蛻・梵

## 笞・・螳牙・遒ｺ隱・
- 菴懈･ｭ蜑阪・螳牙・遒ｺ隱堺ｺ矩・
- 蜊ｱ髯ｺ諤ｧ縺ｮ譛臥┌縺ｨ蟇ｾ蜃ｦ豕・
- 螳牙・陬・ｙ縺ｮ蠢・ｦ∵ｧ

## 屏・・蜈ｷ菴鍋噪縺ｪ蟇ｾ蠢懈焔鬆・
1. **貅門ｙ**: 蠢・ｦ√↑蟾･蜈ｷ繝ｻ驛ｨ蜩√・螳牙・陬・ｙ
2. **菴懈･ｭ謇矩・*: 繧ｹ繝・ャ繝励ヰ繧､繧ｹ繝・ャ繝励・蜈ｷ菴鍋噪縺ｪ謇矩・
3. **遒ｺ隱堺ｺ矩・*: 蜷・せ繝・ャ繝励〒縺ｮ遒ｺ隱阪・繧､繝ｳ繝・
4. **蠢懈･蜃ｦ鄂ｮ**: 蠢・ｦ√↓蠢懊§縺溷ｿ懈･蜃ｦ鄂ｮ縺ｮ謇矩・

## 搭 豕ｨ諢丈ｺ矩・
- 菴懈･ｭ譎ゅ・螳牙・荳翫・豕ｨ諢冗せ
- 繧医￥縺ゅｋ螟ｱ謨励ヱ繧ｿ繝ｼ繝ｳ縺ｨ蝗樣∩豕・
- 蟆る摩螳ｶ縺ｸ縺ｮ逶ｸ隲・′蠢・ｦ√↑蝣ｴ蜷・

## 笨・螳御ｺ・｢ｺ隱・
- 菴懈･ｭ螳御ｺ・ｾ後・遒ｺ隱堺ｺ矩・
- 蜀咲匱髦ｲ豁｢遲・
- 谺｡蝗樒せ讀懈凾縺ｮ豕ｨ諢冗せ

## 圷 邱頑･譎ゅ・蟇ｾ蠢・
- 菴懈･ｭ荳ｭ縺ｫ蝠城｡後′逋ｺ逕溘＠縺溷ｴ蜷医・蟇ｾ蜃ｦ豕・
- 邱頑･騾｣邨｡蜈・ ${problemCategory?.requiresExpert ? '蟆る摩謚陦楢・↓騾｣邨｡縺励※縺上□縺輔＞' : '謚陦捺髪謠ｴ繧ｻ繝ｳ繧ｿ繝ｼ'}

## 答 蜿り・ュ蝣ｱ
- 髢｢騾｣縺吶ｋ繝翫Ξ繝・ず繝吶・繧ｹ諠・ｱ
- 蠢懈･蜃ｦ鄂ｮ繝槭ル繝･繧｢繝ｫ縺ｮ蜿ら・邂・園

蟆る摩逧・〒螳溽畑逧・√°縺､螳牙・縺ｪ隗｣豎ｺ遲悶ｒ謠蝉ｾ帙＠縺ｦ縺上□縺輔＞縲・
`;

      return await callOpenAIAPI(solutionPrompt, true);
    } catch (error) {
      console.error('蛹・峡逧・ｧ｣豎ｺ遲也函謌舌お繝ｩ繝ｼ:', error);
      return '隗｣豎ｺ遲悶・逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆縲ょｰる摩螳ｶ縺ｫ逶ｸ隲・＠縺ｦ縺上□縺輔＞縲・;
    }
  }

  // 蟄ｦ鄙偵ョ繝ｼ繧ｿ縺ｮ逕滓・縺ｨ菫晏ｭ・
  async learnFromSession(
    problemDescription: string,
    allAnswers: QAAnswer[],
    solution: string,
    success: boolean,
    userFeedback?: string
  ): Promise<void> {
    try {
      const learningPrompt = `
莉･荳九・Q&A繧ｻ繝・す繝ｧ繝ｳ縺九ｉ蟄ｦ鄙偵ョ繝ｼ繧ｿ繧堤函謌舌＠縺ｦ縺上□縺輔＞・・

**蝠城｡瑚ｪｬ譏・*: ${problemDescription}
**蝗樒ｭ泌ｱ･豁ｴ**: ${allAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**隗｣豎ｺ遲・*: ${solution}
**謌仙粥**: ${success}
**繝ｦ繝ｼ繧ｶ繝ｼ繝輔ぅ繝ｼ繝峨ヰ繝・け**: ${userFeedback || '縺ｪ縺・}

縺薙・諠・ｱ繧偵リ繝ｬ繝・ず繝吶・繧ｹ縺ｫ霑ｽ蜉縺吶ｋ縺溘ａ縺ｮ讒矩蛹悶ョ繝ｼ繧ｿ繧堤函謌舌＠縺ｦ縺上□縺輔＞・・
{
  "category": "繧ｫ繝・ざ繝ｪ",
  "keywords": ["繧ｭ繝ｼ繝ｯ繝ｼ繝・", "繧ｭ繝ｼ繝ｯ繝ｼ繝・"],
  "summary": "隕∫ｴ・,
  "solution": "隗｣豎ｺ遲・,
  "prevention": "莠磯亟遲・,
  "lessonsLearned": "蟄ｦ繧薙□謨呵ｨ・,
  "improvementSuggestions": "謾ｹ蝟・署譯・
}
`;

      const response = await callOpenAIAPI(learningPrompt, false);
      
      // 蟄ｦ鄙偵ョ繝ｼ繧ｿ繧剃ｿ晏ｭ・
      try {
        await fetch('/api/learn', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            learningData: response,
            sessionData: {
              problemDescription,
              answers: allAnswers,
              solution,
              success,
              userFeedback
            }
          })
        });
      } catch (saveError) {
        console.error('蟄ｦ鄙偵ョ繝ｼ繧ｿ菫晏ｭ倥お繝ｩ繝ｼ:', saveError);
      }
      
    } catch (error) {
      console.error('蟄ｦ鄙偵ョ繝ｼ繧ｿ逕滓・繧ｨ繝ｩ繝ｼ:', error);
    }
  }

  // 迥ｶ諷狗ｮ｡逅・Γ繧ｽ繝・ラ
  setCurrentFlow(flow: QAFlow): void {
    this.currentFlow = flow;
    this.answers = [];
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

  getKnowledgeBase(): KnowledgeBaseItem[] {
    return this.knowledgeBase;
  }

  getEmergencyProcedures(): EmergencyProcedure[] {
    return this.emergencyProcedures;
  }

  reset(): void {
    this.currentFlow = null;
    this.answers = [];
    this.problemCategory = null;
    this.contextualHistory = [];
  }
}

// 繧ｷ繝ｳ繧ｰ繝ｫ繝医Φ繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ
export const enhancedQAManager = new EnhancedQAManager();
