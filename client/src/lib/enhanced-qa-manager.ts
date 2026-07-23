// 拡張されたQAマネージャー - OpenAI活用版
import {
  QAFlowStep,
  QAAnswer,
  QAFlow,
  ProblemCategory,
} from './qa-flow-manager';
import { buildApiUrl } from './api';

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

// クライアント側ではサーバーAPIを呼び出す
async function callOpenAIAPI(
  prompt: string,
  useKnowledgeBase: boolean = true
): Promise<string> {
  try {
    const response = await fetch(buildApiUrl('/chatgpt'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        text: prompt,
        useOnlyKnowledgeBase: useKnowledgeBase,
      }),
    });

    if (!response.ok) {
      throw new Error(`API呼び出しエラー: ${response.status}`);
    }

    const data = await response.json();
    return data.response || '応答を取得できませんでした。';
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

  // ナレッジベースと応急処置情報の初期化
  async initializeKnowledgeBase(): Promise<void> {
    try {
      // ナレッジベースの取得
      const knowledgeResponse = await fetch(buildApiUrl('/knowledge-base'), {
        method: 'GET',
        credentials: 'include',
      });

      if (knowledgeResponse.ok) {
        this.knowledgeBase = await knowledgeResponse.json();
      }

      // 応急処置情報の取得
      const emergencyResponse = await fetch(buildApiUrl('/emergency-procedures'), {
        method: 'GET',
        credentials: 'include',
      });

      if (emergencyResponse.ok) {
        this.emergencyProcedures = await emergencyResponse.json();
      }
    } catch (error) {
      console.error('ナレッジベース初期化エラー:', error);
    }
  }

  // 問題の詳細分析と最適な質問フローの生成
  async analyzeProblemAndGenerateFlow(
    initialDescription: string,
    context: string = ''
  ): Promise<{
    category: ProblemCategory;
    flow: QAFlow;
    contextualQuestions: ContextualQuestion[];
  }> {
    try {
      const analysisPrompt = `
あなたは保守用車の専門技術者です。初期の問題説明を詳細に分析し、最適な質問フローを生成してください。

**初期問題説明**: ${initialDescription}
**追加コンテキスト**: ${context}
**利用可能なナレッジ**: ${this.knowledgeBase.map(k => k.title).join(', ')}
**応急処置情報**: ${this.emergencyProcedures.map(e => e.title).join(', ')}

以下の分析を行ってください：

1. **問題の分類**: エンジン系、電気系、油圧系、走行系、作業装置系、安全装置系から最適なカテゴリを選択
2. **緊急度の判定**: 安全リスク、作業への影響、時間的制約を考慮
3. **質問戦略**: 段階的な診断に最適な質問の順序と内容
4. **応急処置の必要性**: 即座に必要な安全対応や応急処置の有無
5. **専門知識の活用**: ナレッジベースと応急処置情報を活用した具体的な質問

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
        "id": "safety_check",
        "question": "安全確認: 作業環境に危険はありませんか？",
        "type": "choice",
        "options": ["安全", "危険", "不明"],
        "required": true,
        "reasoning": "作業前の安全確認",
        "expectedOutcome": "安全な作業環境の確認",
        "emergencyAction": "危険な場合は作業を中止し、安全確保を優先してください"
      }
    ]
  },
  "contextualQuestions": [
    {
      "question": "問題の発生時期を教えてください",
      "reasoning": "問題の経時変化の把握",
      "expectedOutcome": "問題の進行度合いの判断",
      "followUpQuestions": ["前回の点検はいつですか？", "類似の問題は過去にありましたか？"],
      "emergencyTriggers": ["突然発生", "作業中に発生"],
      "knowledgeReferences": ["定期点検ガイド", "故障診断マニュアル"]
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
          contextualQuestions: parsed.contextualQuestions || [],
        };
      } catch (parseError) {
        console.error('問題分析のJSON解析エラー:', parseError);
        throw new Error('問題分析に失敗しました');
      }
    } catch (error) {
      console.error('問題分析エラー:', error);
      throw error;
    }
  }

  // 動的質問生成（ナレッジベースと応急処置情報を活用）
  async generateContextualQuestion(
    currentContext: string,
    previousAnswers: QAAnswer[],
    currentStep: QAFlowStep
  ): Promise<ContextualQuestion> {
    try {
      // 関連するナレッジと応急処置を検索
      const relevantKnowledge = this.findRelevantKnowledge(
        currentContext,
        previousAnswers
      );
      const relevantProcedures = this.findRelevantProcedures(
        currentContext,
        previousAnswers
      );

      const contextualPrompt = `
あなたは保守用車の専門技術者です。現在の状況に基づいて、最も効果的な質問を生成してください。

**現在の状況**: ${currentContext}
**現在の質問**: ${currentStep.question}
**これまでの回答**: ${previousAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**関連ナレッジ**: ${relevantKnowledge.map(k => k.title).join(', ')}
**関連応急処置**: ${relevantProcedures.map(p => p.title).join(', ')}

以下の条件を満たす質問を生成してください：

1. **状況に特化**: 現在の回答と状況に基づいた具体的な質問
2. **安全性優先**: 危険性の早期発見を重視
3. **効率的な診断**: 原因特定に直結する質問
4. **実用的な選択肢**: 現場で実行可能な対応策の提示
5. **ナレッジ活用**: 専門知識を活用した高度な質問

以下のJSON形式で返してください：
{
  "question": "具体的で実用的な質問内容",
  "reasoning": "この質問で何を特定・解決したいか",
  "expectedOutcome": "この質問への回答で得られる情報",
  "followUpQuestions": ["関連する追加質問1", "関連する追加質問2"],
  "emergencyTriggers": ["緊急対応が必要な条件1", "緊急対応が必要な条件2"],
  "knowledgeReferences": ["参照すべきナレッジ1", "参照すべきナレッジ2"]
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
          knowledgeReferences: parsed.knowledgeReferences || [],
        };
      } catch (parseError) {
        console.error('文脈質問生成のJSON解析エラー:', parseError);
        return {
          question: '問題の詳細を教えてください。',
          reasoning: '基本的な情報収集',
          expectedOutcome: '問題の詳細把握',
        };
      }
    } catch (error) {
      console.error('文脈質問生成エラー:', error);
      throw error;
    }
  }

  // 関連するナレッジベース情報の検索
  private findRelevantKnowledge(
    context: string,
    answers: QAAnswer[]
  ): KnowledgeBaseItem[] {
    const searchTerms = [
      context,
      ...answers.map(a => a.answer),
      this.problemCategory?.keywords || [],
    ].flat();

    return this.knowledgeBase
      .filter(item =>
        searchTerms.some(
          term =>
            item.title.toLowerCase().includes(term.toLowerCase()) ||
            item.content.toLowerCase().includes(term.toLowerCase()) ||
            item.keywords.some(keyword =>
              keyword.toLowerCase().includes(term.toLowerCase())
            )
        )
      )
      .slice(0, 5); // 上位5件を返す
  }

  // 関連する応急処置情報の検索
  private findRelevantProcedures(
    context: string,
    answers: QAAnswer[]
  ): EmergencyProcedure[] {
    const searchTerms = [
      context,
      ...answers.map(a => a.answer),
      this.problemCategory?.keywords || [],
    ].flat();

    return this.emergencyProcedures
      .filter(procedure =>
        searchTerms.some(
          term =>
            procedure.title.toLowerCase().includes(term.toLowerCase()) ||
            procedure.description.toLowerCase().includes(term.toLowerCase()) ||
            procedure.category.toLowerCase().includes(term.toLowerCase())
        )
      )
      .slice(0, 3); // 上位3件を返す
  }

  // 回答に基づく次のステップの動的決定
  async determineNextStep(
    currentAnswer: QAAnswer,
    allAnswers: QAAnswer[],
    currentStep: QAFlowStep
  ): Promise<{
    nextStep: QAFlowStep | null;
    contextualQuestion: ContextualQuestion | null;
    emergencyAction: string | null;
  }> {
    try {
      const analysisPrompt = `
以下の回答を分析して、次のステップを決定してください：

**現在の回答**: ${currentAnswer.answer}
**現在の質問**: ${currentStep.question}
**これまでの回答**: ${allAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**利用可能なステップ**: ${this.currentFlow?.steps.map(s => s.question).join(', ') || ''}
**関連ナレッジ**: ${this.findRelevantKnowledge(currentAnswer.answer, allAnswers)
          .map(k => k.title)
          .join(', ')}
**関連応急処置**: ${this.findRelevantProcedures(
            currentAnswer.answer,
            allAnswers
          )
          .map(p => p.title)
          .join(', ')}

分析結果を以下のJSON形式で返してください：
{
  "nextStepId": "次のステップのID",
  "reasoning": "このステップを選んだ理由",
  "isComplete": false,
  "contextualQuestion": {
    "question": "状況に応じた追加質問",
    "reasoning": "この質問の目的",
    "expectedOutcome": "期待される結果"
  },
  "emergencyAction": "緊急対応が必要な場合の指示",
  "suggestedKnowledge": ["参照すべきナレッジ1", "参照すべきナレッジ2"],
  "suggestedProcedures": ["実行すべき応急処置1", "実行すべき応急処置2"]
}
`;

      const response = await callOpenAIAPI(analysisPrompt, true);

      try {
        const parsed = JSON.parse(response);

        // 緊急対応のチェック
        let emergencyAction = null;
        if (parsed.emergencyAction) {
          emergencyAction = parsed.emergencyAction;
        }

        // 次のステップの決定
        let nextStep = null;
        if (parsed.nextStepId && this.currentFlow) {
          nextStep =
            this.currentFlow.steps.find(s => s.id === parsed.nextStepId) ||
            null;
        }

        // 文脈質問の生成
        let contextualQuestion = null;
        if (parsed.contextualQuestion) {
          contextualQuestion = parsed.contextualQuestion;
        }

        return {
          nextStep,
          contextualQuestion,
          emergencyAction,
        };
      } catch (parseError) {
        console.error('次のステップ決定のJSON解析エラー:', parseError);
        return {
          nextStep: null,
          contextualQuestion: null,
          emergencyAction: null,
        };
      }
    } catch (error) {
      console.error('次のステップ決定エラー:', error);
      throw error;
    }
  }

  // 解決策の生成（ナレッジベースと応急処置情報を活用）
  async generateComprehensiveSolution(
    allAnswers: QAAnswer[],
    problemCategory?: ProblemCategory
  ): Promise<string> {
    try {
      const relevantKnowledge = this.findRelevantKnowledge('', allAnswers);
      const relevantProcedures = this.findRelevantProcedures('', allAnswers);

      const solutionPrompt = `
あなたは保守用車の専門技術者です。収集した情報と専門知識に基づいて、包括的な解決策を提案してください。

**問題カテゴリ**: ${problemCategory?.name || '不明'}
**収集した情報**: ${allAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**関連ナレッジ**: ${relevantKnowledge.map(k => `${k.title}: ${k.content}`).join('\n')}
**関連応急処置**: ${relevantProcedures.map(p => `${p.title}: ${p.description}`).join('\n')}

以下の形式で具体的な解決策を提案してください：

## 🔍 問題の特定
- 現在発生している問題の具体的な内容
- 影響範囲と緊急度
- 根本原因の分析

## ⚠️ 安全確認
- 作業前の安全確認事項
- 危険性の有無と対処法
- 安全装備の必要性

## 🛠️ 具体的な対応手順
1. **準備**: 必要な工具・部品・安全装備
2. **作業手順**: ステップバイステップの具体的な手順
3. **確認事項**: 各ステップでの確認ポイント
4. **応急処置**: 必要に応じた応急処置の手順

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

## 📚 参考情報
- 関連するナレッジベース情報
- 応急処置マニュアルの参照箇所

専門的で実用的、かつ安全な解決策を提供してください。
`;

      return await callOpenAIAPI(solutionPrompt, true);
    } catch (error) {
      console.error('包括的解決策生成エラー:', error);
      return '解決策の生成に失敗しました。専門家に相談してください。';
    }
  }

  // 学習データの生成と保存
  async learnFromSession(
    problemDescription: string,
    allAnswers: QAAnswer[],
    solution: string,
    success: boolean,
    userFeedback?: string
  ): Promise<void> {
    try {
      const learningPrompt = `
以下のQ&Aセッションから学習データを生成してください：

**問題説明**: ${problemDescription}
**回答履歴**: ${allAnswers.map(a => `${a.stepId}: ${a.answer}`).join(', ')}
**解決策**: ${solution}
**成功**: ${success}
**ユーザーフィードバック**: ${userFeedback || 'なし'}

この情報をナレッジベースに追加するための構造化データを生成してください：
{
  "category": "カテゴリ",
  "keywords": ["キーワード1", "キーワード2"],
  "summary": "要約",
  "solution": "解決策",
  "prevention": "予防策",
  "lessonsLearned": "学んだ教訓",
  "improvementSuggestions": "改善提案"
}
`;

      const response = await callOpenAIAPI(learningPrompt, false);

      // 学習データを保存
      try {
        await fetch('/learn', {
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
              userFeedback,
            },
          }),
        });
      } catch (saveError) {
        console.error('学習データ保存エラー:', saveError);
      }
    } catch (error) {
      console.error('学習データ生成エラー:', error);
    }
  }

  // 状態管理メソッド
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
