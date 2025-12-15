import OpenAI from 'openai';
import { HybridSearchService } from './hybrid-search.js';
export class TroubleshootingQA {
    openai;
    hybridSearch;
    constructor() {
        this.openai = new OpenAI();
        this.hybridSearch = new HybridSearchService();
    }
    async startTroubleshooting(problemDescription) {
        try {
            console.log('🔍 トラブルシューティング開始:', problemDescription);
            // ハイブリッド検索で関連情報を取得
            const searchResults = await this.hybridSearch.hybridSearch(problemDescription);
            // 初期質問を生成
            const initialQuestion = await this.generateInitialQuestion(problemDescription, searchResults);
            return {
                question: initialQuestion.question,
                options: initialQuestion.options,
                status: 'continue',
                reasoning: initialQuestion.reasoning,
            };
        }
        catch (error) {
            console.error('❌ トラブルシューティング開始エラー:', error);
            return {
                question: '発生した事象を教えてください',
                options: [
                    'エンジンが止まった',
                    'ブレーキが効かない',
                    '異音がする',
                    'その他',
                ],
                status: 'continue',
            };
        }
    }
    async processAnswer(problemDescription, previousAnswers, currentAnswer) {
        try {
            console.log('🔍 回答処理:', {
                problemDescription,
                currentAnswer,
                previousAnswersCount: previousAnswers.length,
            });
            // 回答を記録
            const allAnswers = [
                ...previousAnswers,
                {
                    stepId: `step_${Date.now()}`,
                    answer: currentAnswer,
                    timestamp: new Date(),
                },
            ];
            // ハイブリッド検索で関連情報を取得
            const searchQuery = `${problemDescription} ${currentAnswer} ${allAnswers.map(a => a.answer).join(' ')}`;
            const searchResults = await this.hybridSearch.hybridSearch(searchQuery);
            // 次の質問または解決策を生成
            const response = await this.generateNextStep(problemDescription, allAnswers, searchResults);
            return response;
        }
        catch (error) {
            console.error('❌ 回答処理エラー:', error);
            return {
                question: '詳細な状況を教えてください',
                status: 'continue',
            };
        }
    }
    async generateInitialQuestion(problemDescription, searchResults) {
        try {
            const context = this.buildContext(searchResults.results);
            const prompt = `あなたは保守用車の専門技術者です。以下の問題に対して、段階的な診断を行うための最初の質問を生成してください。

**問題**: ${problemDescription}
**関連情報**: ${context}

以下の条件を満たす質問を生成してください：
1. **問題の原因特定に直結する**: 症状から原因を絞り込む質問
2. **具体的な対応策を導く**: 回答によって具体的な処置が決まる質問
3. **安全確認を優先**: 危険性の有無を最初に確認
4. **実用的な選択肢**: 選択肢がある場合は具体的で分かりやすい選択肢を提示

**質問の種類**:
- 症状の詳細確認（例：エンジンが止まった時の状況）
- 安全確認（例：作業環境に危険はありませんか？）
- 原因の絞り込み（例：バッテリー、燃料、点火系など）

以下のJSON形式で返してください：
{
  "question": "具体的な質問内容",
  "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
  "reasoning": "この質問で何を特定・解決したいか"
}

選択肢は3-5個程度で、具体的で分かりやすい内容にしてください。`;
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'あなたは保守用車の専門技術者です。段階的な診断を行うための質問を生成してください。',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.1,
                max_tokens: 1000,
            });
            const content = response.choices[0].message.content || '';
            try {
                const parsed = JSON.parse(content);
                return {
                    question: parsed.question || '発生した事象の詳細を教えてください',
                    options: parsed.options || [],
                    reasoning: parsed.reasoning || '',
                };
            }
            catch (parseError) {
                console.error('JSON解析エラー:', parseError);
                return {
                    question: '発生した事象の詳細を教えてください',
                    options: [
                        'エンジンが止まった',
                        'ブレーキが効かない',
                        '異音がする',
                        'その他',
                    ],
                    reasoning: '初期症状の確認',
                };
            }
        }
        catch (error) {
            console.error('❌ 初期質問生成エラー:', error);
            return {
                question: '発生した事象の詳細を教えてください',
                options: [
                    'エンジンが止まった',
                    'ブレーキが効かない',
                    '異音がする',
                    'その他',
                ],
                reasoning: '初期症状の確認',
            };
        }
    }
    async generateNextStep(problemDescription, answers, searchResults) {
        try {
            const context = this.buildContext(searchResults.results);
            const answersText = answers
                .map((a, index) => `Q${index + 1}: ${a.answer}`)
                .join(', ');
            const prompt = `あなたは保守用車の専門技術者です。以下の状況に基づいて、次の質問または解決策を決定してください。

**初期問題**: ${problemDescription}
**これまでの回答**: ${answersText}
**関連情報**: ${context}

以下の条件で次のステップを決定してください：
1. **問題解決に十分な情報が得られた場合**: 具体的な解決策を提示
2. **まだ情報が不足している場合**: 原因特定や処置決定に必要な次の質問と選択肢を生成
3. **緊急対応が必要な場合**: 緊急対応の指示を提示
4. **ナレッジベース活用**: 利用可能な専門知識を活用した質問

**質問の流れ**:
- 1段階目: 発生事象の確認（例：エンジンが始動しない）
- 2段階目: 症状の詳細確認（例：エンジン始動時の状態）
- 3段階目: 原因の絞り込み（例：バッテリー、燃料、点火系など）
- 4段階目: 具体的な確認（例：バッテリー電圧、燃料残量など）
- 5段階目: 対応策の選択（例：充電、燃料補給、部品交換など）

以下のJSON形式で返してください：
{
  "status": "continue|complete|emergency",
  "question": "次の質問内容（statusがcontinueの場合）",
  "options": ["選択肢1", "選択肢2", "選択肢3"],
  "solution": "具体的な解決策（statusがcompleteの場合）",
  "emergencyAction": "緊急対応の指示（statusがemergencyの場合）",
  "reasoning": "この判断の理由"
}`;
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'あなたは保守用車の専門技術者です。段階的な診断と解決策を提供してください。',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.1,
                max_tokens: 1500,
            });
            const content = response.choices[0].message.content || '';
            try {
                const parsed = JSON.parse(content);
                if (parsed.status === 'complete') {
                    return {
                        solution: parsed.solution ||
                            '解決策を生成できませんでした。専門家に相談してください。',
                        status: 'complete',
                        reasoning: parsed.reasoning,
                    };
                }
                else if (parsed.status === 'emergency') {
                    return {
                        emergencyAction: parsed.emergencyAction ||
                            '緊急対応が必要です。専門家に連絡してください。',
                        status: 'emergency',
                        reasoning: parsed.reasoning,
                    };
                }
                else {
                    return {
                        question: parsed.question || '詳細な状況を教えてください',
                        options: parsed.options || [],
                        status: 'continue',
                        reasoning: parsed.reasoning,
                    };
                }
            }
            catch (parseError) {
                console.error('JSON解析エラー:', parseError);
                return {
                    question: '詳細な状況を教えてください',
                    status: 'continue',
                };
            }
        }
        catch (error) {
            console.error('❌ 次のステップ生成エラー:', error);
            return {
                question: '詳細な状況を教えてください',
                status: 'continue',
            };
        }
    }
    buildContext(searchResults) {
        if (!searchResults || searchResults.length === 0) {
            return '関連情報なし';
        }
        return searchResults
            .slice(0, 3) // 上位3件のみ使用
            .map(result => {
            const source = result.metadata?.source || result.title || '不明';
            const score = Math.round((result.finalScore || result.score || result.similarity || 0) * 100);
            return `【${source} (関連度: ${score}%)】${result.text || result.content || ''}`;
        })
            .join('\n');
    }
    async generateSolution(problemDescription, answers) {
        try {
            const answersText = answers
                .map((a, index) => `Q${index + 1}: ${a.answer}`)
                .join(', ');
            const prompt = `あなたは保守用車の専門技術者です。以下の回答に基づいて具体的な解決策を提示してください。

**初期問題**: ${problemDescription}
**これまでの回答**: ${answersText}

以下の形式で解決策を提示してください：
1. **問題の特定**: 回答から推測される問題
2. **原因分析**: 考えられる原因
3. **具体的な処置手順**: 段階的な対処方法
4. **安全上の注意**: 作業時の注意事項
5. **専門家への相談**: 必要に応じて専門家への相談タイミング

実用的で安全な解決策を提示してください。
必ず具体的な手順と安全上の注意を含めてください。`;
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'あなたは保守用車の専門技術者です。具体的で安全な解決策を提供してください。',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.1,
                max_tokens: 2000,
            });
            return (response.choices[0].message.content ||
                '解決策を生成できませんでした。専門家に相談してください。');
        }
        catch (error) {
            console.error('❌ 解決策生成エラー:', error);
            return '解決策を生成できませんでした。専門家に相談してください。';
        }
    }
}
