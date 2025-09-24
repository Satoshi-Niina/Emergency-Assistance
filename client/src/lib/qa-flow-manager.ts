import { apiFetch } from './apiClient';

// クライアント側ではサーバーAPIを呼び出す
async function callOpenAIAPI(
  prompt: string,
  useKnowledgeBase: boolean = true
): Promise<string> {
  try {
    const response = await apiFetch('/chatgpt', {
      method: 'POST',
      body: JSON.stringify({
        text: prompt,
        useOnlyKnowledgeBase: useKnowledgeBase,
      }),
    });

    return response.response || '応答を取得できませんでした。';
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
  dependsOn?: string; // 前の回答に依存する質問
  condition?: string; // 表示条件
  reasoning?: string; // 質問の目的
  expectedOutcome?: string; // 期待される結果
  emergencyAction?: string; // 緊急時の対応
  timeLimit?: number; // 時間制限（分）
}

export interface QAFlow {
  id: string;
  title: string;
  description: string;
  category: string;
  steps: QAFlowStep[];
  knowledgeContext: string[];
  emergencyContact?: string; // 緊急連絡先
  estimatedTime?: number; // 推定所要時間
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

  // 問題分類とフロー予測
  async classifyProblemAndPredictFlow(
    initialDescription: string,
    knowledgeBase: string[]
  ): Promise<{ category: ProblemCategory; flow: QAFlow } | null> {
    try {
      const classificationPrompt = `
あなたは保守用車の専門技術者です。初期の問題説明から問題を分類し、適切な質問フローを予測してください。

**初期問題説明**: ${initialDescription}
**利用可能なナレッジ**: ${knowledgeBase.join(', ')}

以下の問題カテゴリから最も適切なものを選択し、段階的な質問フローを生成してください：

## 問題カテゴリ
1. **エンジン系**: エンジンがかからない、異音、オーバーヒート等
2. **電気系**: バッテリー、照明、スターター等
3. **油圧系**: 油圧ポンプ、シリンダー、配管等
4. **走行系**: ブレーキ、タイヤ、サスペンション等
5. **作業装置系**: クレーン、ウインチ、油圧ショベル等
6. **安全装置系**: 非常停止、安全スイッチ等

以下のJSON形式で返してください：
{
  "category": {
    "id": "engine_start",
    "name": "エンジン始動不良",
    "description": "エンジンが正常に始動しない問題",
    "keywords": ["エンジン", "始動", "かからない", "スターター"],
    "emergencyLevel": "medium",
    "estimatedTime": 30,
    "requiresExpert": false
  },
  "flow": {
    "id": "engine_start_flow",
    "title": "エンジン始動不良の診断フロー",
    "description": "エンジンがかからない問題の段階的診断",
    "category": "engine_start",
    "emergencyContact": "技術支援センター: 0123-456-789",
    "estimatedTime": 30,
    "steps": [
      {
        "id": "location_check",
        "question": "現在の場所を教えてください",
        "type": "choice",
        "options": ["保材線", "車庫", "現場", "その他"],
        "required": true,
        "reasoning": "場所によって対応方法が異なるため",
        "expectedOutcome": "対応可能な場所かどうかの判断"
      },
      {
        "id": "time_check",
        "question": "作業に使える時間はありますか？",
        "type": "choice",
        "options": ["20分以下", "30分程度", "1時間程度", "十分にある"],
        "required": true,
        "reasoning": "時間によって対応方法を決定",
        "expectedOutcome": "緊急対応の必要性判断",
        "emergencyAction": "20分以下の場合: すぐに支援者へ連絡してください",
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
        console.error('問題分類のJSON解析エラー:', parseError);
        return null;
      }
    } catch (error) {
      console.error('問題分類エラー:', error);
      return null;
    }
  }

  // 動的質問生成（改善版）
  async generateNextQuestion(
    context: string,
    previousAnswers: QAAnswer[],
    knowledgeBase: string[],
    currentFlow?: QAFlow
  ): Promise<QAFlowStep | null> {
    try {
      // 事前定義されたフローがある場合はそれを使用
      if (currentFlow && currentFlow.steps.length > 0) {
        const nextStepIndex = previousAnswers.length;
        if (nextStepIndex < currentFlow.steps.length) {
          const nextStep = currentFlow.steps[nextStepIndex];

          // 条件チェック
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
          // フローが完了した場合、解決策を生成
          return null;
        }
      }

      // 動的質問生成（フォールバック）
      const contextPrompt = `
あなたは保守用車の専門技術者です。問題解決のために段階的に質問を行います。

**現在の状況**: ${context}
**これまでの回答**: ${previousAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**利用可能なナレッジ**: ${knowledgeBase.join(', ')}

次の質問は以下の条件を満たす必要があります：
1. **問題の原因特定に直結する**: 症状から原因を絞り込む質問
2. **具体的な対応策を導く**: 回答によって具体的な処置が決まる質問
3. **安全確認を優先**: 危険性の有無を最初に確認
4. **段階的な診断**: 簡単な確認から複雑な診断へ
5. **実用的な選択肢**: 選択肢がある場合は具体的な選択肢を提示

質問の種類：
- **症状確認**: 具体的な症状や異常の詳細
- **原因特定**: 考えられる原因の絞り込み
- **安全確認**: 作業の安全性や緊急度
- **対応策選択**: 具体的な処置方法の選択
- **確認・検証**: 処置後の確認事項

以下のJSON形式で返してください：
{
  "id": "step_${Date.now()}",
  "question": "具体的で実用的な質問内容",
  "type": "text",
  "required": true,
  "options": ["選択肢1", "選択肢2", "選択肢3"],
  "reasoning": "この質問で何を特定・解決したいか",
  "expectedOutcome": "この質問への回答で得られる情報"
}
`;

      const response = await callOpenAIAPI(contextPrompt, true);

      try {
        const parsed = JSON.parse(response);

        // 選択肢がある場合はchoiceタイプに設定
        const questionType =
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
        console.error('質問生成のJSON解析エラー:', parseError);
        // フォールバック用の基本的な質問を返す
        return {
          id: `step_${Date.now()}`,
          question: '問題の具体的な症状を教えてください。',
          type: 'text',
          required: true,
          options: [],
          reasoning: '基本的な症状確認',
          expectedOutcome: '問題の詳細把握',
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
      // 簡単な条件評価（実際の実装ではより複雑な条件解析が必要）
      const lastAnswer = answers[answers.length - 1];
      if (!lastAnswer) return true;

      if (condition.includes('time_limit')) {
        const timeLimit = parseInt(
          condition.match(/time_limit:(\d+)/)?.[1] || '0'
        );
        const timeAnswer = lastAnswer.answer;
        if (
          timeAnswer.includes('20分以下') ||
          timeAnswer.includes('30分以下')
        ) {
          return false; // 時間制限により次の質問をスキップ
        }
      }

      return true;
    } catch (error) {
      console.error('条件評価エラー:', error);
      return true;
    }
  }

  // 緊急対応チェック
  checkEmergencyAction(currentStep: QAFlowStep, answer: string): string | null {
    if (currentStep.emergencyAction && currentStep.timeLimit) {
      const timeAnswer = answer.toLowerCase();
      if (
        timeAnswer.includes(`${currentStep.timeLimit}分以下`) ||
        timeAnswer.includes('20分以下') ||
        timeAnswer.includes('30分以下')
      ) {
        return currentStep.emergencyAction;
      }
    }
    return null;
  }

  // 回答に基づく次のステップ決定
  async determineNextStep(
    currentAnswer: QAAnswer,
    allAnswers: QAAnswer[],
    flow: QAFlow
  ): Promise<QAFlowStep | null> {
    try {
      const analysisPrompt = `
以下の回答を分析して、次のステップを決定してください：

**現在の回答**: ${currentAnswer.answer}
**これまでの回答**: ${allAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**利用可能なステップ**: ${flow.steps.map(s => s.question).join(', ')}

分析結果を以下のJSON形式で返してください：
{
  "nextStepId": "次のステップのID",
  "reasoning": "このステップを選んだ理由",
  "isComplete": false,
  "suggestedAction": "推奨される対応"
}
`;

      const response = await callOpenAIAPI(analysisPrompt, true);

      try {
        const parsed = JSON.parse(response);
        const nextStep = flow.steps.find(s => s.id === parsed.nextStepId);
        return nextStep || null;
      } catch (parseError) {
        console.error('次のステップ決定のJSON解析エラー:', parseError);
        return null;
      }
    } catch (error) {
      console.error('次のステップ決定エラー:', error);
      return null;
    }
  }

  // 問題解決の提案生成
  async generateSolution(
    allAnswers: QAAnswer[],
    knowledgeBase: string[],
    problemCategory?: ProblemCategory
  ): Promise<string> {
    try {
      const solutionPrompt = `
あなたは保守用車の専門技術者です。収集した情報に基づいて、具体的で実用的な解決策を提案してください。

**問題カテゴリ**: ${problemCategory?.name || '不明'}
**収集した情報**: ${allAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**専門ナレッジ**: ${knowledgeBase.join(', ')}

以下の形式で具体的な解決策を提案してください：

## 🔍 問題の特定
- 現在発生している問題の具体的な内容
- 影響範囲と緊急度

## ⚠️ 安全確認
- 作業前の安全確認事項
- 危険性の有無と対処法

## 🛠️ 具体的な対応手順
1. **準備**: 必要な工具・部品・安全装備
2. **作業手順**: ステップバイステップの具体的な手順
3. **確認事項**: 各ステップでの確認ポイント

## 📋 注意事項
- 作業時の安全上の注意点
- よくある失敗パターンと回避法
- 専門家への相談が必要な場合

## ✅ 完了確認
- 作業完了後の確認事項
- 再発防止策
- 次回点検時の注意点

## 🚨 緊急時の対応
- 作業中に問題が発生した場合の対処法
- 緊急連絡先: ${problemCategory?.requiresExpert ? '専門技術者に連絡してください' : '技術支援センター'}

専門的で実用的、かつ安全な解決策を提供してください。
`;

      return await callOpenAIAPI(solutionPrompt, true);
    } catch (error) {
      console.error('解決策生成エラー:', error);
      return '解決策の生成に失敗しました。専門家に相談してください。';
    }
  }

  // ナレッジベースの学習
  async learnFromQA(
    question: string,
    answer: string,
    solution: string,
    success: boolean
  ): Promise<void> {
    try {
      const learningPrompt = `
以下のQ&Aセッションから学習データを生成してください：

**質問**: ${question}
**回答**: ${answer}
**解決策**: ${solution}
**成功**: ${success}

この情報をナレッジベースに追加するための構造化データを生成してください：
{
  "category": "カテゴリ",
  "keywords": ["キーワード1", "キーワード2"],
  "summary": "要約",
  "solution": "解決策",
  "prevention": "予防策"
}
`;

      const response = await callOpenAIAPI(learningPrompt, false);

      // 学習データを保存（実際の実装ではデータベースに保存）
      console.log('学習データ生成:', response);
    } catch (error) {
      console.error('学習データ生成エラー:', error);
    }
  }

  // フロー状態の管理
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
