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

export interface QAFlowStep {
  id: string;
  question: string;
  type: 'text' | 'choice' | 'image' | 'location';
  options?: string[];
  required: boolean;
  dependsOn?: string; // 前�E回答に依存する質啁E
  condition?: string; // 表示条件
  reasoning?: string; // 質問�E目皁E
  expectedOutcome?: string; // 期征E��れる結果
  emergencyAction?: string; // 緊急時�E対忁E
  timeLimit?: number; // 時間制限（�E�E�E
}

export interface QAFlow {
  id: string;
  title: string;
  description: string;
  category: string;
  steps: QAFlowStep[];
  knowledgeContext: string[];
  emergencyContact?: string; // 緊急連絡允E
  estimatedTime?: number; // 推定所要時閁E
}

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

  // 問題�E類とフロー予測
  async classifyProblemAndPredictFlow(
    initialDescription: string,
    knowledgeBase: string[]
  ): Promise<{ category: ProblemCategory; flow: QAFlow } | null> {
    try {
      const classificationPrompt = `
あなた�E保守用車�E専門技術老E��す。�E期�E問題説明から問題を刁E��し、E��刁E��質問フローを予測してください、E

**初期問題説昁E*: ${initialDescription}
**利用可能なナレチE��**: ${knowledgeBase.join(', ')}

以下�E問題カチE��リから最も適刁E��も�Eを選択し、段階的な質問フローを生成してください�E�E

## 問題カチE��リ
1. **エンジン系**: エンジンがかからなぁE��異音、オーバ�Eヒ�Eト筁E
2. **電気系**: バッチE��ー、�E明、スターター筁E
3. **油圧系**: 油圧ポンプ、シリンダー、E�E管筁E
4. **走行系**: ブレーキ、タイヤ、サスペンション筁E
5. **作業裁E��系**: クレーン、ウインチ、油圧ショベル筁E
6. **安�E裁E��系**: 非常停止、安�EスイチE��筁E

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
        "id": "location_check",
        "question": "現在の場所を教えてください",
        "type": "choice",
        "options": ["保材緁E, "車庫", "現場", "そ�E仁E],
        "required": true,
        "reasoning": "場所によって対応方法が異なるためE,
        "expectedOutcome": "対応可能な場所かどぁE��の判断"
      },
      {
        "id": "time_check",
        "question": "作業に使える時間はありますか�E�E,
        "type": "choice",
        "options": ["20刁E��丁E, "30刁E��度", "1時間程度", "十�Eにある"],
        "required": true,
        "reasoning": "時間によって対応方法を決宁E,
        "expectedOutcome": "緊急対応�E忁E��性判断",
        "emergencyAction": "20刁E��下�E場吁E すぐに支援老E��連絡してください",
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
          flow: parsed.flow
        };
      } catch (parseError) {
        console.error('問題�E類�EJSON解析エラー:', parseError);
        return null;
      }
    } catch (error) {
      console.error('問題�E類エラー:', error);
      return null;
    }
  }

  // 動的質問生成（改喁E���E�E
  async generateNextQuestion(
    context: string,
    previousAnswers: QAAnswer[],
    knowledgeBase: string[],
    currentFlow?: QAFlow
  ): Promise<QAFlowStep | null> {
    try {
      // 事前定義されたフローがある場合�Eそれを使用
      if (currentFlow && currentFlow.steps.length > 0) {
        const nextStepIndex = previousAnswers.length;
        if (nextStepIndex < currentFlow.steps.length) {
          const nextStep = currentFlow.steps[nextStepIndex];
          
          // 条件チェチE��
          if (nextStep.condition) {
            const shouldShow = this.evaluateCondition(nextStep.condition, previousAnswers);
            if (!shouldShow) {
              return this.generateNextQuestion(context, previousAnswers, knowledgeBase, currentFlow);
            }
          }
          
          return nextStep;
        } else {
          // フローが完亁E��た場合、解決策を生�E
          return null;
        }
      }

      // 動的質問生成（フォールバック�E�E
      const contextPrompt = `
あなた�E保守用車�E専門技術老E��す。問題解決のために段階的に質問を行います、E

**現在の状況E*: ${context}
**これまでの回筁E*: ${previousAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**利用可能なナレチE��**: ${knowledgeBase.join(', ')}

次の質問�E以下�E条件を満たす忁E��があります！E
1. **問題�E原因特定に直結すめE*: 痁E��から原因を絞り込む質啁E
2. **具体的な対応策を導く**: 回答によって具体的な処置が決まる質啁E
3. **安�E確認を優允E*: 危険性の有無を最初に確誁E
4. **段階的な診断**: 簡単な確認から褁E��な診断へ
5. **実用皁E��選択肢**: 選択肢がある場合�E具体的な選択肢を提示

質問�E種類！E
- **痁E��確誁E*: 具体的な痁E��めE��常の詳細
- **原因特宁E*: 老E��られる原因の絞り込み
- **安�E確誁E*: 作業の安�E性めE��急度
- **対応策選抁E*: 具体的な処置方法�E選抁E
- **確認�E検証**: 処置後�E確認事頁E

以下�EJSON形式で返してください�E�E
{
  "id": "step_${Date.now()}",
  "question": "具体的で実用皁E��質問�E容",
  "type": "text",
  "required": true,
  "options": ["選択肢1", "選択肢2", "選択肢3"],
  "reasoning": "こ�E質問で何を特定�E解決したぁE��",
  "expectedOutcome": "こ�E質問への回答で得られる惁E��"
}
`;

      const response = await callOpenAIAPI(contextPrompt, true);
      
      try {
        const parsed = JSON.parse(response);
        
        // 選択肢がある場合�Echoiceタイプに設宁E
        const questionType = parsed.options && parsed.options.length > 0 ? 'choice' : 'text';
        
        return {
          id: parsed.id,
          question: parsed.question,
          type: questionType,
          required: parsed.required !== false,
          options: parsed.options || [],
          dependsOn: parsed.dependsOn,
          condition: parsed.condition,
          reasoning: parsed.reasoning,
          expectedOutcome: parsed.expectedOutcome
        };
      } catch (parseError) {
        console.error('質問生成�EJSON解析エラー:', parseError);
        // フォールバック用の基本皁E��質問を返す
        return {
          id: `step_${Date.now()}`,
          question: "問題�E具体的な痁E��を教えてください、E,
          type: 'text',
          required: true,
          options: [],
          reasoning: "基本皁E��痁E��確誁E,
          expectedOutcome: "問題�E詳細把握"
        };
      }
    } catch (error) {
      console.error('動的質問生成エラー:', error);
      return null;
    }
  }

  // 条件評価
  private evaluateCondition(condition: string, answers: QAAnswer[]): boolean {
    try {
      // 簡単な条件評価�E�実際の実裁E��はより褁E��な条件解析が忁E��E��E
      const lastAnswer = answers[answers.length - 1];
      if (!lastAnswer) return true;

      if (condition.includes('time_limit')) {
        const timeLimit = parseInt(condition.match(/time_limit:(\d+)/)?.[1] || '0');
        const timeAnswer = lastAnswer.answer;
        if (timeAnswer.includes('20刁E��丁E) || timeAnswer.includes('30刁E��丁E)) {
          return false; // 時間制限により次の質問をスキチE�E
        }
      }

      return true;
    } catch (error) {
      console.error('条件評価エラー:', error);
      return true;
    }
  }

  // 緊急対応チェチE��
  checkEmergencyAction(currentStep: QAFlowStep, answer: string): string | null {
    if (currentStep.emergencyAction && currentStep.timeLimit) {
      const timeAnswer = answer.toLowerCase();
      if (timeAnswer.includes(`${currentStep.timeLimit}刁E��下`) || 
          timeAnswer.includes('20刁E��丁E) || 
          timeAnswer.includes('30刁E��丁E)) {
        return currentStep.emergencyAction;
      }
    }
    return null;
  }

  // 回答に基づく次のスチE��プ決宁E
  async determineNextStep(
    currentAnswer: QAAnswer,
    allAnswers: QAAnswer[],
    flow: QAFlow
  ): Promise<QAFlowStep | null> {
    try {
      const analysisPrompt = `
以下�E回答を刁E��して、次のスチE��プを決定してください�E�E

**現在の回筁E*: ${currentAnswer.answer}
**これまでの回筁E*: ${allAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**利用可能なスチE��チE*: ${flow.steps.map(s => s.question).join(', ')}

刁E��結果を以下�EJSON形式で返してください�E�E
{
  "nextStepId": "次のスチE��プ�EID",
  "reasoning": "こ�EスチE��プを選んだ琁E��",
  "isComplete": false,
  "suggestedAction": "推奨される対忁E
}
`;

      const response = await callOpenAIAPI(analysisPrompt, true);
      
      try {
        const parsed = JSON.parse(response);
        const nextStep = flow.steps.find(s => s.id === parsed.nextStepId);
        return nextStep || null;
      } catch (parseError) {
        console.error('次のスチE��プ決定�EJSON解析エラー:', parseError);
        return null;
      }
    } catch (error) {
      console.error('次のスチE��プ決定エラー:', error);
      return null;
    }
  }

  // 問題解決の提案生戁E
  async generateSolution(
    allAnswers: QAAnswer[],
    knowledgeBase: string[],
    problemCategory?: ProblemCategory
  ): Promise<string> {
    try {
      const solutionPrompt = `
あなた�E保守用車�E専門技術老E��す。収雁E��た情報に基づぁE��、�E体的で実用皁E��解決策を提案してください、E

**問題カチE��リ**: ${problemCategory?.name || '不�E'}
**収集した惁E��**: ${allAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**専門ナレチE��**: ${knowledgeBase.join(', ')}

以下�E形式で具体的な解決策を提案してください�E�E

## 🔍 問題�E特宁E
- 現在発生してぁE��問題�E具体的な冁E��
- 影響篁E��と緊急度

## ⚠�E�E安�E確誁E
- 作業前�E安�E確認事頁E
- 危険性の有無と対処況E

## 🛠�E�E具体的な対応手頁E
1. **準備**: 忁E��な工具・部品�E安�E裁E��
2. **作業手頁E*: スチE��プバイスチE��プ�E具体的な手頁E
3. **確認事頁E*: 吁E��チE��プでの確認�EインチE

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

専門皁E��実用皁E��かつ安�Eな解決策を提供してください、E
`;

      return await callOpenAIAPI(solutionPrompt, true);
    } catch (error) {
      console.error('解決策生成エラー:', error);
      return '解決策�E生�Eに失敗しました。専門家に相諁E��てください、E;
    }
  }

  // ナレチE��ベ�Eスの学翁E
  async learnFromQA(
    question: string,
    answer: string,
    solution: string,
    success: boolean
  ): Promise<void> {
    try {
      const learningPrompt = `
以下�EQ&AセチE��ョンから学習データを生成してください�E�E

**質啁E*: ${question}
**回筁E*: ${answer}
**解決筁E*: ${solution}
**成功**: ${success}

こ�E惁E��をナレチE��ベ�Eスに追加するための構造化データを生成してください�E�E
{
  "category": "カチE��リ",
  "keywords": ["キーワーチE", "キーワーチE"],
  "summary": "要紁E,
  "solution": "解決筁E,
  "prevention": "予防筁E
}
`;

      const response = await callOpenAIAPI(learningPrompt, false);
      
      // 学習データを保存（実際の実裁E��はチE�Eタベ�Eスに保存！E
      console.log('学習データ生�E:', response);
      
    } catch (error) {
      console.error('学習データ生�Eエラー:', error);
    }
  }

  // フロー状態�E管琁E
  setCurrentFlow(flow: QAFlow): void {
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

// シングルトンインスタンス
export const qaFlowManager = new QAFlowManager();
