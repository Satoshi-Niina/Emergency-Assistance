// 拡張されたQAマネージャー - OpenAI活用牁E
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

// クライアント�Eではサーバ�EAPIを呼び出ぁE
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
      throw new Error(`API呼び出しエラー: ${response.status}`);
    }

    const data = await response.json();
    return data.response || '応答を取得できませんでした、E;
  } catch (error) {
    console.error('OpenAI API呼び出しエラー:', error);
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

  // ナレチE��ベ�Eスと応急処置惁E��の初期匁E
  async initializeKnowledgeBase(): Promise<void> {
    try {
      // ナレチE��ベ�Eスの取征E
      const knowledgeResponse = await fetch('/api/knowledge-base', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (knowledgeResponse.ok) {
        this.knowledgeBase = await knowledgeResponse.json();
      }

      // 応急処置惁E��の取征E
      const emergencyResponse = await fetch('/api/emergency-procedures', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (emergencyResponse.ok) {
        this.emergencyProcedures = await emergencyResponse.json();
      }
    } catch (error) {
      console.error('ナレチE��ベ�Eス初期化エラー:', error);
    }
  }

  // 問題�E詳細刁E��と最適な質問フローの生�E
  async analyzeProblemAndGenerateFlow(
    initialDescription: string,
    context: string = ''
  ): Promise<{ category: ProblemCategory; flow: QAFlow; contextualQuestions: ContextualQuestion[] }> {
    try {
      const analysisPrompt = `
あなた�E保守用車�E専門技術老E��す。�E期�E問題説明を詳細に刁E��し、最適な質問フローを生成してください、E

**初期問題説昁E*: ${initialDescription}
**追加コンチE��スチE*: ${context}
**利用可能なナレチE��**: ${this.knowledgeBase.map(k => k.title).join(', ')}
**応急処置惁E��**: ${this.emergencyProcedures.map(e => e.title).join(', ')}

以下�E刁E��を行ってください�E�E

1. **問題�E刁E��E*: エンジン系、E��気系、油圧系、走行系、作業裁E��系、安�E裁E��系から最適なカチE��リを選抁E
2. **緊急度の判宁E*: 安�Eリスク、作業への影響、時間的制紁E��老E�E
3. **質問戦略**: 段階的な診断に最適な質問�E頁E��と冁E��
4. **応急処置の忁E��性**: 即座に忁E��な安�E対応や応急処置の有無
5. **専門知識�E活用**: ナレチE��ベ�Eスと応急処置惁E��を活用した具体的な質啁E

以下�EJSON形式で返してください�E�E
{
  "category": {
    "id": "engine_start",
    "name": "エンジン始動不良",
    "description": "エンジンが正常に始動しなぁE��顁E,
    "keywords": ["エンジン", "始動", "かからなぁE, "スターター"],
    "emergencyLevel": "medium",
    "estimatedTime": 30,
    "requiresExpert": false
  },
  "flow": {
    "id": "engine_start_flow",
    "title": "エンジン始動不良の診断フロー",
    "description": "エンジンがかからなぁE��題�E段階的診断",
    "category": "engine_start",
    "emergencyContact": "技術支援センター: 0123-456-789",
    "estimatedTime": 30,
    "steps": [
      {
        "id": "safety_check",
        "question": "安�E確誁E 作業環墁E��危険はありませんか！E,
        "type": "choice",
        "options": ["安�E", "危険", "不�E"],
        "required": true,
        "reasoning": "作業前�E安�E確誁E,
        "expectedOutcome": "安�Eな作業環墁E�E確誁E,
        "emergencyAction": "危険な場合�E作業を中止し、安�E確保を優先してください"
      }
    ]
  },
  "contextualQuestions": [
    {
      "question": "問題�E発生時期を教えてください",
      "reasoning": "問題�E経時変化の把握",
      "expectedOutcome": "問題�E進行度合いの判断",
      "followUpQuestions": ["前回の点検�EぁE��ですか�E�E, "類似の問題�E過去にありましたか！E],
      "emergencyTriggers": ["突然発甁E, "作業中に発甁E],
      "knowledgeReferences": ["定期点検ガイチE, "敁E��診断マニュアル"]
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
        console.error('問題�E析�EJSON解析エラー:', parseError);
        throw new Error('問題�E析に失敗しました');
      }
    } catch (error) {
      console.error('問題�E析エラー:', error);
      throw error;
    }
  }

  // 動的質問生成（ナレチE��ベ�Eスと応急処置惁E��を活用�E�E
  async generateContextualQuestion(
    currentContext: string,
    previousAnswers: QAAnswer[],
    currentStep: QAFlowStep
  ): Promise<ContextualQuestion> {
    try {
      // 関連するナレチE��と応急処置を検索
      const relevantKnowledge = this.findRelevantKnowledge(currentContext, previousAnswers);
      const relevantProcedures = this.findRelevantProcedures(currentContext, previousAnswers);

      const contextualPrompt = `
あなた�E保守用車�E専門技術老E��す。現在の状況に基づぁE��、最も効果的な質問を生�Eしてください、E

**現在の状況E*: ${currentContext}
**現在の質啁E*: ${currentStep.question}
**これまでの回筁E*: ${previousAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**関連ナレチE��**: ${relevantKnowledge.map(k => k.title).join(', ')}
**関連応急処置**: ${relevantProcedures.map(p => p.title).join(', ')}

以下�E条件を満たす質問を生�Eしてください�E�E

1. **状況に特匁E*: 現在の回答と状況に基づぁE��具体的な質啁E
2. **安�E性優允E*: 危険性の早期発見を重要E
3. **効玁E��な診断**: 原因特定に直結する質啁E
4. **実用皁E��選択肢**: 現場で実行可能な対応策�E提示
5. **ナレチE��活用**: 専門知識を活用した高度な質啁E

以下�EJSON形式で返してください�E�E
{
  "question": "具体的で実用皁E��質問�E容",
  "reasoning": "こ�E質問で何を特定�E解決したぁE��",
  "expectedOutcome": "こ�E質問への回答で得られる惁E��",
  "followUpQuestions": ["関連する追加質啁E", "関連する追加質啁E"],
  "emergencyTriggers": ["緊急対応が忁E��な条件1", "緊急対応が忁E��な条件2"],
  "knowledgeReferences": ["参�EすべきナレチE��1", "参�EすべきナレチE��2"]
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
        console.error('斁E��質問生成�EJSON解析エラー:', parseError);
        return {
          question: "問題�E詳細を教えてください、E,
          reasoning: "基本皁E��惁E��収集",
          expectedOutcome: "問題�E詳細把握"
        };
      }
    } catch (error) {
      console.error('斁E��質問生成エラー:', error);
      throw error;
    }
  }

  // 関連するナレチE��ベ�Eス惁E��の検索
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
    ).slice(0, 5); // 上佁E件を返す
  }

  // 関連する応急処置惁E��の検索
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
    ).slice(0, 3); // 上佁E件を返す
  }

  // 回答に基づく次のスチE��プ�E動的決宁E
  async determineNextStep(
    currentAnswer: QAAnswer,
    allAnswers: QAAnswer[],
    currentStep: QAFlowStep
  ): Promise<{ nextStep: QAFlowStep | null; contextualQuestion: ContextualQuestion | null; emergencyAction: string | null }> {
    try {
      const analysisPrompt = `
以下�E回答を刁E��して、次のスチE��プを決定してください�E�E

**現在の回筁E*: ${currentAnswer.answer}
**現在の質啁E*: ${currentStep.question}
**これまでの回筁E*: ${allAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**利用可能なスチE��チE*: ${this.currentFlow?.steps.map(s => s.question).join(', ') || ''}
**関連ナレチE��**: ${this.findRelevantKnowledge(currentAnswer.answer, allAnswers).map(k => k.title).join(', ')}
**関連応急処置**: ${this.findRelevantProcedures(currentAnswer.answer, allAnswers).map(p => p.title).join(', ')}

刁E��結果を以下�EJSON形式で返してください�E�E
{
  "nextStepId": "次のスチE��プ�EID",
  "reasoning": "こ�EスチE��プを選んだ琁E��",
  "isComplete": false,
  "contextualQuestion": {
    "question": "状況に応じた追加質啁E,
    "reasoning": "こ�E質問�E目皁E,
    "expectedOutcome": "期征E��れる結果"
  },
  "emergencyAction": "緊急対応が忁E��な場合�E持E��",
  "suggestedKnowledge": ["参�EすべきナレチE��1", "参�EすべきナレチE��2"],
  "suggestedProcedures": ["実行すべき応急処置1", "実行すべき応急処置2"]
}
`;

      const response = await callOpenAIAPI(analysisPrompt, true);
      
      try {
        const parsed = JSON.parse(response);
        
        // 緊急対応�EチェチE��
        let emergencyAction = null;
        if (parsed.emergencyAction) {
          emergencyAction = parsed.emergencyAction;
        }

        // 次のスチE��プ�E決宁E
        let nextStep = null;
        if (parsed.nextStepId && this.currentFlow) {
          nextStep = this.currentFlow.steps.find(s => s.id === parsed.nextStepId) || null;
        }

        // 斁E��質問�E生�E
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
        console.error('次のスチE��プ決定�EJSON解析エラー:', parseError);
        return {
          nextStep: null,
          contextualQuestion: null,
          emergencyAction: null
        };
      }
    } catch (error) {
      console.error('次のスチE��プ決定エラー:', error);
      throw error;
    }
  }

  // 解決策�E生�E�E�ナレチE��ベ�Eスと応急処置惁E��を活用�E�E
  async generateComprehensiveSolution(
    allAnswers: QAAnswer[],
    problemCategory?: ProblemCategory
  ): Promise<string> {
    try {
      const relevantKnowledge = this.findRelevantKnowledge('', allAnswers);
      const relevantProcedures = this.findRelevantProcedures('', allAnswers);

      const solutionPrompt = `
あなた�E保守用車�E専門技術老E��す。収雁E��た情報と専門知識に基づぁE��、包括皁E��解決策を提案してください、E

**問題カチE��リ**: ${problemCategory?.name || '不�E'}
**収集した惁E��**: ${allAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**関連ナレチE��**: ${relevantKnowledge.map(k => `${k.title}: ${k.content}`).join('\n')}
**関連応急処置**: ${relevantProcedures.map(p => `${p.title}: ${p.description}`).join('\n')}

以下�E形式で具体的な解決策を提案してください�E�E

## 🔍 問題�E特宁E
- 現在発生してぁE��問題�E具体的な冁E��
- 影響篁E��と緊急度
- 根本原因の刁E��

## ⚠�E�E安�E確誁E
- 作業前�E安�E確認事頁E
- 危険性の有無と対処況E
- 安�E裁E��の忁E��性

## 🛠�E�E具体的な対応手頁E
1. **準備**: 忁E��な工具・部品�E安�E裁E��
2. **作業手頁E*: スチE��プバイスチE��プ�E具体的な手頁E
3. **確認事頁E*: 吁E��チE��プでの確認�EインチE
4. **応急処置**: 忁E��に応じた応急処置の手頁E

## 📋 注意事頁E
- 作業時�E安�E上�E注意点
- よくある失敗パターンと回避況E
- 専門家への相諁E��忁E��な場吁E

## ✁E完亁E��誁E
- 作業完亁E���E確認事頁E
- 再発防止筁E
- 次回点検時の注意点

## 🚨 緊急時�E対忁E
- 作業中に問題が発生した場合�E対処況E
- 緊急連絡允E ${problemCategory?.requiresExpert ? '専門技術老E��連絡してください' : '技術支援センター'}

## 📚 参老E��報
- 関連するナレチE��ベ�Eス惁E��
- 応急処置マニュアルの参�E箁E��

専門皁E��実用皁E��かつ安�Eな解決策を提供してください、E
`;

      return await callOpenAIAPI(solutionPrompt, true);
    } catch (error) {
      console.error('匁E��皁E��決策生成エラー:', error);
      return '解決策�E生�Eに失敗しました。専門家に相諁E��てください、E;
    }
  }

  // 学習データの生�Eと保孁E
  async learnFromSession(
    problemDescription: string,
    allAnswers: QAAnswer[],
    solution: string,
    success: boolean,
    userFeedback?: string
  ): Promise<void> {
    try {
      const learningPrompt = `
以下�EQ&AセチE��ョンから学習データを生成してください�E�E

**問題説昁E*: ${problemDescription}
**回答履歴**: ${allAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**解決筁E*: ${solution}
**成功**: ${success}
**ユーザーフィードバチE��**: ${userFeedback || 'なぁE}

こ�E惁E��をナレチE��ベ�Eスに追加するための構造化データを生成してください�E�E
{
  "category": "カチE��リ",
  "keywords": ["キーワーチE", "キーワーチE"],
  "summary": "要紁E,
  "solution": "解決筁E,
  "prevention": "予防筁E,
  "lessonsLearned": "学んだ教訁E,
  "improvementSuggestions": "改喁E��桁E
}
`;

      const response = await callOpenAIAPI(learningPrompt, false);
      
      // 学習データを保孁E
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
        console.error('学習データ保存エラー:', saveError);
      }
      
    } catch (error) {
      console.error('学習データ生�Eエラー:', error);
    }
  }

  // 状態管琁E��ソチE��
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

// シングルトンインスタンス
export const enhancedQAManager = new EnhancedQAManager();
