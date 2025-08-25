import OpenAI from 'openai';
import { HybridSearchService } from './hybrid-search.js';

export interface TroubleshootingStep {
  id: string;
  question: string;
  type: 'text' | 'choice' | 'confirmation';
  options?: string[];
  required: boolean;
  reasoning?: string;
  expectedOutcome?: string;
  emergencyAction?: string;
  timeLimit?: number;
}

export interface TroubleshootingSession {
  id: string;
  problemDescription: string;
  steps: TroubleshootingStep[];
  answers: TroubleshootingAnswer[];
  currentStepIndex: number;
  status: 'active' | 'completed' | 'emergency';
  createdAt: Date;
  updatedAt: Date;
}

export interface TroubleshootingAnswer {
  stepId: string;
  answer: string;
  timestamp: Date;
}

export interface TroubleshootingResponse {
  question?: string;
  options?: string[];
  solution?: string;
  emergencyAction?: string;
  status: 'continue' | 'complete' | 'emergency';
  reasoning?: string;
  nextStep?: TroubleshootingStep;
}

export class TroubleshootingQA {
  private openai: OpenAI;
  private hybridSearch: HybridSearchService;
  
  constructor() {
    this.openai = new OpenAI();
    this.hybridSearch = new HybridSearchService();
  }
  
  async startTroubleshooting(problemDescription: string): Promise<TroubleshootingResponse> {
    try {
      console.log('剥 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ髢句ｧ・', problemDescription);
      
      // 繝上う繝悶Μ繝・ラ讀懃ｴ｢縺ｧ髢｢騾｣諠・ｱ繧貞叙蠕・
      const searchResults = await this.hybridSearch.hybridSearch(problemDescription);
      
      // 蛻晄悄雉ｪ蝠上ｒ逕滓・
      const initialQuestion = await this.generateInitialQuestion(problemDescription, searchResults);
      
      return {
        question: initialQuestion.question,
        options: initialQuestion.options,
        status: 'continue',
        reasoning: initialQuestion.reasoning
      };
      
    } catch (error) {
      console.error('笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ髢句ｧ九お繝ｩ繝ｼ:', error);
      return {
        question: '逋ｺ逕溘＠縺滉ｺ玖ｱ｡繧呈蕗縺医※縺上□縺輔＞',
        options: ['繧ｨ繝ｳ繧ｸ繝ｳ縺梧ｭ｢縺ｾ縺｣縺・, '繝悶Ξ繝ｼ繧ｭ縺悟柑縺九↑縺・, '逡ｰ髻ｳ縺後☆繧・, '縺昴・莉・],
        status: 'continue'
      };
    }
  }
  
  async processAnswer(
    problemDescription: string,
    previousAnswers: TroubleshootingAnswer[],
    currentAnswer: string
  ): Promise<TroubleshootingResponse> {
    try {
      console.log('剥 蝗樒ｭ泌・逅・', { problemDescription, currentAnswer, previousAnswersCount: previousAnswers.length });
      
      // 蝗樒ｭ斐ｒ險倬鹸
      const allAnswers = [...previousAnswers, {
        stepId: `step_${Date.now()}`,
        answer: currentAnswer,
        timestamp: new Date()
      }];
      
      // 繝上う繝悶Μ繝・ラ讀懃ｴ｢縺ｧ髢｢騾｣諠・ｱ繧貞叙蠕・
      const searchQuery = `${problemDescription} ${currentAnswer} ${allAnswers.map(a => a.answer).join(' ')}`;
      const searchResults = await this.hybridSearch.hybridSearch(searchQuery);
      
      // 谺｡縺ｮ雉ｪ蝠上∪縺溘・隗｣豎ｺ遲悶ｒ逕滓・
      const response = await this.generateNextStep(problemDescription, allAnswers, searchResults);
      
      return response;
      
    } catch (error) {
      console.error('笶・蝗樒ｭ泌・逅・お繝ｩ繝ｼ:', error);
      return {
        question: '隧ｳ邏ｰ縺ｪ迥ｶ豕√ｒ謨吶∴縺ｦ縺上□縺輔＞',
        status: 'continue'
      };
    }
  }
  
  private async generateInitialQuestion(problemDescription: string, searchResults: any): Promise<{
    question: string;
    options?: string[];
    reasoning?: string;
  }> {
    try {
      const context = this.buildContext(searchResults.results);
      
      const prompt = `縺ゅ↑縺溘・菫晏ｮ育畑霆翫・蟆る摩謚陦楢・〒縺吶ゆｻ･荳九・蝠城｡後↓蟇ｾ縺励※縲∵ｮｵ髫守噪縺ｪ險ｺ譁ｭ繧定｡後≧縺溘ａ縺ｮ譛蛻昴・雉ｪ蝠上ｒ逕滓・縺励※縺上□縺輔＞縲・

**蝠城｡・*: ${problemDescription}
**髢｢騾｣諠・ｱ**: ${context}

莉･荳九・譚｡莉ｶ繧呈ｺ縺溘☆雉ｪ蝠上ｒ逕滓・縺励※縺上□縺輔＞・・
1. **蝠城｡後・蜴溷屏迚ｹ螳壹↓逶ｴ邨舌☆繧・*: 逞・憾縺九ｉ蜴溷屏繧堤ｵ槭ｊ霎ｼ繧雉ｪ蝠・
2. **蜈ｷ菴鍋噪縺ｪ蟇ｾ蠢懃ｭ悶ｒ蟆弱￥**: 蝗樒ｭ斐↓繧医▲縺ｦ蜈ｷ菴鍋噪縺ｪ蜃ｦ鄂ｮ縺梧ｱｺ縺ｾ繧玖ｳｪ蝠・
3. **螳牙・遒ｺ隱阪ｒ蜆ｪ蜈・*: 蜊ｱ髯ｺ諤ｧ縺ｮ譛臥┌繧呈怙蛻昴↓遒ｺ隱・
4. **螳溽畑逧・↑驕ｸ謚櫁い**: 驕ｸ謚櫁い縺後≠繧句ｴ蜷医・蜈ｷ菴鍋噪縺ｧ蛻・°繧翫ｄ縺吶＞驕ｸ謚櫁い繧呈署遉ｺ

**雉ｪ蝠上・遞ｮ鬘・*:
- 逞・憾縺ｮ隧ｳ邏ｰ遒ｺ隱搾ｼ井ｾ具ｼ壹お繝ｳ繧ｸ繝ｳ縺梧ｭ｢縺ｾ縺｣縺滓凾縺ｮ迥ｶ豕・ｼ・
- 螳牙・遒ｺ隱搾ｼ井ｾ具ｼ壻ｽ懈･ｭ迺ｰ蠅・↓蜊ｱ髯ｺ縺ｯ縺ゅｊ縺ｾ縺帙ｓ縺具ｼ滂ｼ・
- 蜴溷屏縺ｮ邨槭ｊ霎ｼ縺ｿ・井ｾ具ｼ壹ヰ繝・ユ繝ｪ繝ｼ縲∫㏍譁吶∫せ轣ｫ邉ｻ縺ｪ縺ｩ・・

莉･荳九・JSON蠖｢蠑上〒霑斐＠縺ｦ縺上□縺輔＞・・
{
  "question": "蜈ｷ菴鍋噪縺ｪ雉ｪ蝠丞・螳ｹ",
  "options": ["驕ｸ謚櫁い1", "驕ｸ謚櫁い2", "驕ｸ謚櫁い3", "驕ｸ謚櫁い4"],
  "reasoning": "縺薙・雉ｪ蝠上〒菴輔ｒ迚ｹ螳壹・隗｣豎ｺ縺励◆縺・°"
}

驕ｸ謚櫁い縺ｯ3-5蛟狗ｨ句ｺｦ縺ｧ縲∝・菴鍋噪縺ｧ蛻・°繧翫ｄ縺吶＞蜀・ｮｹ縺ｫ縺励※縺上□縺輔＞縲Ａ;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "縺ゅ↑縺溘・菫晏ｮ育畑霆翫・蟆る摩謚陦楢・〒縺吶よｮｵ髫守噪縺ｪ險ｺ譁ｭ繧定｡後≧縺溘ａ縺ｮ雉ｪ蝠上ｒ逕滓・縺励※縺上□縺輔＞縲・ },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content || '';
      
      try {
        const parsed = JSON.parse(content);
        return {
          question: parsed.question || '逋ｺ逕溘＠縺滉ｺ玖ｱ｡縺ｮ隧ｳ邏ｰ繧呈蕗縺医※縺上□縺輔＞',
          options: parsed.options || [],
          reasoning: parsed.reasoning || ''
        };
      } catch (parseError) {
        console.error('JSON隗｣譫舌お繝ｩ繝ｼ:', parseError);
        return {
          question: '逋ｺ逕溘＠縺滉ｺ玖ｱ｡縺ｮ隧ｳ邏ｰ繧呈蕗縺医※縺上□縺輔＞',
          options: ['繧ｨ繝ｳ繧ｸ繝ｳ縺梧ｭ｢縺ｾ縺｣縺・, '繝悶Ξ繝ｼ繧ｭ縺悟柑縺九↑縺・, '逡ｰ髻ｳ縺後☆繧・, '縺昴・莉・],
          reasoning: '蛻晄悄逞・憾縺ｮ遒ｺ隱・
        };
      }
      
    } catch (error) {
      console.error('笶・蛻晄悄雉ｪ蝠冗函謌舌お繝ｩ繝ｼ:', error);
      return {
        question: '逋ｺ逕溘＠縺滉ｺ玖ｱ｡縺ｮ隧ｳ邏ｰ繧呈蕗縺医※縺上□縺輔＞',
        options: ['繧ｨ繝ｳ繧ｸ繝ｳ縺梧ｭ｢縺ｾ縺｣縺・, '繝悶Ξ繝ｼ繧ｭ縺悟柑縺九↑縺・, '逡ｰ髻ｳ縺後☆繧・, '縺昴・莉・],
        reasoning: '蛻晄悄逞・憾縺ｮ遒ｺ隱・
      };
    }
  }
  
  private async generateNextStep(
    problemDescription: string,
    answers: TroubleshootingAnswer[],
    searchResults: any
  ): Promise<TroubleshootingResponse> {
    try {
      const context = this.buildContext(searchResults.results);
      const answersText = answers.map((a, index) => `Q${index + 1}: ${a.answer}`).join(', ');
      
      const prompt = `縺ゅ↑縺溘・菫晏ｮ育畑霆翫・蟆る摩謚陦楢・〒縺吶ゆｻ･荳九・迥ｶ豕√↓蝓ｺ縺･縺・※縲∵ｬ｡縺ｮ雉ｪ蝠上∪縺溘・隗｣豎ｺ遲悶ｒ豎ｺ螳壹＠縺ｦ縺上□縺輔＞縲・

**蛻晄悄蝠城｡・*: ${problemDescription}
**縺薙ｌ縺ｾ縺ｧ縺ｮ蝗樒ｭ・*: ${answersText}
**髢｢騾｣諠・ｱ**: ${context}

莉･荳九・譚｡莉ｶ縺ｧ谺｡縺ｮ繧ｹ繝・ャ繝励ｒ豎ｺ螳壹＠縺ｦ縺上□縺輔＞・・
1. **蝠城｡瑚ｧ｣豎ｺ縺ｫ蜊∝・縺ｪ諠・ｱ縺悟ｾ励ｉ繧後◆蝣ｴ蜷・*: 蜈ｷ菴鍋噪縺ｪ隗｣豎ｺ遲悶ｒ謠千､ｺ
2. **縺ｾ縺諠・ｱ縺御ｸ崎ｶｳ縺励※縺・ｋ蝣ｴ蜷・*: 蜴溷屏迚ｹ螳壹ｄ蜃ｦ鄂ｮ豎ｺ螳壹↓蠢・ｦ√↑谺｡縺ｮ雉ｪ蝠上→驕ｸ謚櫁い繧堤函謌・
3. **邱頑･蟇ｾ蠢懊′蠢・ｦ√↑蝣ｴ蜷・*: 邱頑･蟇ｾ蠢懊・謖・､ｺ繧呈署遉ｺ
4. **繝翫Ξ繝・ず繝吶・繧ｹ豢ｻ逕ｨ**: 蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｪ蟆る摩遏･隴倥ｒ豢ｻ逕ｨ縺励◆雉ｪ蝠・

**雉ｪ蝠上・豬√ｌ**:
- 1谿ｵ髫守岼: 逋ｺ逕滉ｺ玖ｱ｡縺ｮ遒ｺ隱搾ｼ井ｾ具ｼ壹お繝ｳ繧ｸ繝ｳ縺悟ｧ句虚縺励↑縺・ｼ・
- 2谿ｵ髫守岼: 逞・憾縺ｮ隧ｳ邏ｰ遒ｺ隱搾ｼ井ｾ具ｼ壹お繝ｳ繧ｸ繝ｳ蟋句虚譎ゅ・迥ｶ諷具ｼ・
- 3谿ｵ髫守岼: 蜴溷屏縺ｮ邨槭ｊ霎ｼ縺ｿ・井ｾ具ｼ壹ヰ繝・ユ繝ｪ繝ｼ縲∫㏍譁吶∫せ轣ｫ邉ｻ縺ｪ縺ｩ・・
- 4谿ｵ髫守岼: 蜈ｷ菴鍋噪縺ｪ遒ｺ隱搾ｼ井ｾ具ｼ壹ヰ繝・ユ繝ｪ繝ｼ髮ｻ蝨ｧ縲∫㏍譁呎ｮ矩㍼縺ｪ縺ｩ・・
- 5谿ｵ髫守岼: 蟇ｾ蠢懃ｭ悶・驕ｸ謚橸ｼ井ｾ具ｼ壼・髮ｻ縲∫㏍譁呵｣懃ｵｦ縲・Κ蜩∽ｺ､謠帙↑縺ｩ・・

莉･荳九・JSON蠖｢蠑上〒霑斐＠縺ｦ縺上□縺輔＞・・
{
  "status": "continue|complete|emergency",
  "question": "谺｡縺ｮ雉ｪ蝠丞・螳ｹ・・tatus縺慶ontinue縺ｮ蝣ｴ蜷茨ｼ・,
  "options": ["驕ｸ謚櫁い1", "驕ｸ謚櫁い2", "驕ｸ謚櫁い3"],
  "solution": "蜈ｷ菴鍋噪縺ｪ隗｣豎ｺ遲厄ｼ・tatus縺慶omplete縺ｮ蝣ｴ蜷茨ｼ・,
  "emergencyAction": "邱頑･蟇ｾ蠢懊・謖・､ｺ・・tatus縺憩mergency縺ｮ蝣ｴ蜷茨ｼ・,
  "reasoning": "縺薙・蛻､譁ｭ縺ｮ逅・罰"
}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "縺ゅ↑縺溘・菫晏ｮ育畑霆翫・蟆る摩謚陦楢・〒縺吶よｮｵ髫守噪縺ｪ險ｺ譁ｭ縺ｨ隗｣豎ｺ遲悶ｒ謠蝉ｾ帙＠縺ｦ縺上□縺輔＞縲・ },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1500
      });

      const content = response.choices[0].message.content || '';
      
      try {
        const parsed = JSON.parse(content);
        
        if (parsed.status === 'complete') {
          return {
            solution: parsed.solution || '隗｣豎ｺ遲悶ｒ逕滓・縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲ょｰる摩螳ｶ縺ｫ逶ｸ隲・＠縺ｦ縺上□縺輔＞縲・,
            status: 'complete',
            reasoning: parsed.reasoning
          };
        } else if (parsed.status === 'emergency') {
          return {
            emergencyAction: parsed.emergencyAction || '邱頑･蟇ｾ蠢懊′蠢・ｦ√〒縺吶ょｰる摩螳ｶ縺ｫ騾｣邨｡縺励※縺上□縺輔＞縲・,
            status: 'emergency',
            reasoning: parsed.reasoning
          };
        } else {
          return {
            question: parsed.question || '隧ｳ邏ｰ縺ｪ迥ｶ豕√ｒ謨吶∴縺ｦ縺上□縺輔＞',
            options: parsed.options || [],
            status: 'continue',
            reasoning: parsed.reasoning
          };
        }
        
      } catch (parseError) {
        console.error('JSON隗｣譫舌お繝ｩ繝ｼ:', parseError);
        return {
          question: '隧ｳ邏ｰ縺ｪ迥ｶ豕√ｒ謨吶∴縺ｦ縺上□縺輔＞',
          status: 'continue'
        };
      }
      
    } catch (error) {
      console.error('笶・谺｡縺ｮ繧ｹ繝・ャ繝礼函謌舌お繝ｩ繝ｼ:', error);
      return {
        question: '隧ｳ邏ｰ縺ｪ迥ｶ豕√ｒ謨吶∴縺ｦ縺上□縺輔＞',
        status: 'continue'
      };
    }
  }
  
  private buildContext(searchResults: any[]): string {
    if (!searchResults || searchResults.length === 0) {
      return '髢｢騾｣諠・ｱ縺ｪ縺・;
    }
    
    return searchResults
      .slice(0, 3) // 荳贋ｽ・莉ｶ縺ｮ縺ｿ菴ｿ逕ｨ
      .map(result => {
        const source = result.metadata?.source || result.title || '荳肴・';
        const score = Math.round((result.finalScore || result.score || result.similarity || 0) * 100);
        return `縲・{source} (髢｢騾｣蠎ｦ: ${score}%)縲・{result.text || result.content || ''}`;
      })
      .join('\n');
  }
  
  async generateSolution(
    problemDescription: string,
    answers: TroubleshootingAnswer[]
  ): Promise<string> {
    try {
      const answersText = answers.map((a, index) => `Q${index + 1}: ${a.answer}`).join(', ');
      
      const prompt = `縺ゅ↑縺溘・菫晏ｮ育畑霆翫・蟆る摩謚陦楢・〒縺吶ゆｻ･荳九・蝗樒ｭ斐↓蝓ｺ縺･縺・※蜈ｷ菴鍋噪縺ｪ隗｣豎ｺ遲悶ｒ謠千､ｺ縺励※縺上□縺輔＞縲・

**蛻晄悄蝠城｡・*: ${problemDescription}
**縺薙ｌ縺ｾ縺ｧ縺ｮ蝗樒ｭ・*: ${answersText}

莉･荳九・蠖｢蠑上〒隗｣豎ｺ遲悶ｒ謠千､ｺ縺励※縺上□縺輔＞・・
1. **蝠城｡後・迚ｹ螳・*: 蝗樒ｭ斐°繧画耳貂ｬ縺輔ｌ繧句撫鬘・
2. **蜴溷屏蛻・梵**: 閠・∴繧峨ｌ繧句次蝗
3. **蜈ｷ菴鍋噪縺ｪ蜃ｦ鄂ｮ謇矩・*: 谿ｵ髫守噪縺ｪ蟇ｾ蜃ｦ譁ｹ豕・
4. **螳牙・荳翫・豕ｨ諢・*: 菴懈･ｭ譎ゅ・豕ｨ諢丈ｺ矩・
5. **蟆る摩螳ｶ縺ｸ縺ｮ逶ｸ隲・*: 蠢・ｦ√↓蠢懊§縺ｦ蟆る摩螳ｶ縺ｸ縺ｮ逶ｸ隲・ち繧､繝溘Φ繧ｰ

螳溽畑逧・〒螳牙・縺ｪ隗｣豎ｺ遲悶ｒ謠千､ｺ縺励※縺上□縺輔＞縲・
蠢・★蜈ｷ菴鍋噪縺ｪ謇矩・→螳牙・荳翫・豕ｨ諢上ｒ蜷ｫ繧√※縺上□縺輔＞縲Ａ;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "縺ゅ↑縺溘・菫晏ｮ育畑霆翫・蟆る摩謚陦楢・〒縺吶ょ・菴鍋噪縺ｧ螳牙・縺ｪ隗｣豎ｺ遲悶ｒ謠蝉ｾ帙＠縺ｦ縺上□縺輔＞縲・ },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      return response.choices[0].message.content || '隗｣豎ｺ遲悶ｒ逕滓・縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲ょｰる摩螳ｶ縺ｫ逶ｸ隲・＠縺ｦ縺上□縺輔＞縲・;
      
    } catch (error) {
      console.error('笶・隗｣豎ｺ遲也函謌舌お繝ｩ繝ｼ:', error);
      return '隗｣豎ｺ遲悶ｒ逕滓・縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲ょｰる摩螳ｶ縺ｫ逶ｸ隲・＠縺ｦ縺上□縺輔＞縲・;
    }
  }
}
