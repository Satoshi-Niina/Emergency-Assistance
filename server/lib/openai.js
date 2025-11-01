import OpenAI from 'openai';
import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
// ESM用__dirname定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// .envファイルの読み込み（相対パスで指定）
dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = 'gpt-4o';
// 複数の場所から.envファイルを読み込み
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });
// APIキーの取得
const apiKey = process.env.OPENAI_API_KEY;
// デバッグ用ログを有効化
console.log('[DEBUG] OpenAI initialization - API KEY exists:', apiKey ? 'YES' : 'NO');
console.log('[DEBUG] OpenAI API KEY prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND');
console.log('[DEBUG] Environment variables:', {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    PWD: __dirname,
});
// 開発環境ではAPIキーがなくても動作するように条件付き初期化
let openai = null;
if (apiKey &&
    apiKey !== 'dev-mock-key' &&
    apiKey !== 'your-openai-api-key-here' &&
    apiKey.startsWith('sk-')) {
    try {
        openai = new OpenAI({
            apiKey: apiKey,
        });
        console.log('[DEBUG] OpenAI client initialized successfully');
    }
    catch (error) {
        console.error('[DEBUG] OpenAI client initialization failed:', error);
        openai = null;
    }
}
else {
    console.log('[DEV] OpenAI client not initialized - API key not available or is mock key');
    console.log('[DEBUG] API Key validation:', {
        exists: !!apiKey,
        isMockKey: apiKey === 'dev-mock-key' || apiKey === 'your-openai-api-key-here',
        startsWithSk: apiKey ? apiKey.startsWith('sk-') : false,
        keyLength: apiKey ? apiKey.length : 0,
    });
}
// デバッグ用：OpenAIクライアントの状態を確認
console.log('[DEBUG] Final OpenAI client status:', {
    clientExists: !!openai,
    apiKeyExists: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND',
});
// OpenAIクライアントの状態を外部から確認する関数
export function getOpenAIClientStatus() {
    return {
        clientExists: !!openai,
        apiKeyExists: !!apiKey,
        apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND',
        apiKeyLength: apiKey ? apiKey.length : 0,
        isMockKey: apiKey === 'dev-mock-key' || apiKey === 'your-openai-api-key-here',
        startsWithSk: apiKey ? apiKey.startsWith('sk-') : false,
    };
}
// 開発環境用のより専門的で動的なモックレスポンス
const getMockResponse = (prompt) => {
    const lowerPrompt = prompt.toLowerCase();
    // キーワードベースの動的レスポンス生成
    if (lowerPrompt.includes('応急処置') ||
        lowerPrompt.includes('緊急') ||
        lowerPrompt.includes('故障')) {
        const vehicleTypes = [
            '軌道モータカー',
            'マルチプルタイタンパー',
            'バラストレギュレーター',
        ];
        const randomVehicle = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
        return `🚨 **緊急対応モード** - ${randomVehicle}の故障対応について

**【即座に実行すべき安全確認】**
1. 🔴 作業区域の安全確保（列車見張員配置確認）
2. 🔴 機械の完全停止確認（エンジン停止、ブレーキ確認）
3. 🔴 周囲作業員への安全指示伝達

**【応急診断手順】**
1. **症状の詳細確認**：
   - エラー表示の内容記録
   - 異音・振動・臭いの有無
   - 直前の作業内容と発生タイミング

2. **基本チェック項目**：
   - 油圧系統の油量・圧力確認
   - 電気系統の接続状況
   - 操縦系統の動作確認

**【現場判断基準】**
- ✅ 軽微な調整で復旧可能 → 現場対応続行
- ⚠️ 専門知識が必要 → 指令所・保守基地へ連絡
- 🚫 安全に不安 → 即座に作業中止・機械回送

**【本格運用時の機能】**
実際のシステムでは、車両固有の技術資料と過去の故障事例を基に、より具体的で即座に実行可能な対応手順を提供します。

何か具体的な症状や車両について教えていただければ、より詳細な対応をご案内できます。`;
    }
    // 車両別の専門的対応
    if (lowerPrompt.includes('タイタンパー') || lowerPrompt.includes('突固')) {
        return `🔧 **マルチプルタイタンパー専門対応**

**【突固作業での一般的なトラブル】**
1. **突固ユニット不調**：
   - 振動周波数の異常 → 油圧ポンプ系統確認
   - 突固深度不良 → リフト機構の油圧漏れチェック
   - 左右バランス不良 → 測定装置の校正確認

2. **走行系トラブル**：
   - 軌道から脱線傾向 → 車輪フランジ摩耗確認
   - 速度制御不良 → エンジン回転数・変速機確認

**【現場での迅速対応ポイント】**
- 油圧系：作動油温度85℃以下維持が重要
- 電気系：制御盤の湿気対策確認
- 機械系：各部グリス補給状況の定期確認

より具体的な症状をお聞かせください。実際の現場経験に基づいた対応をご提案します。`;
    }
    if (lowerPrompt.includes('モータカー') || lowerPrompt.includes('軌道車')) {
        return `🚂 **軌道モータカー技術サポート**

**【エンジン系統の基本診断】**
1. **始動不良**：
   - バッテリー電圧確認（24V系統正常値確認）
   - 燃料系統の水混入チェック
   - エアクリーナーの目詰まり確認

2. **走行中の異常**：
   - 出力不足 → 排気色・音の確認
   - 振動異常 → エンジンマウント点検
   - 過熱 → 冷却水循環・ラジエーター清掃

**【油圧作業装置の点検】**
- PTO（パワーテイクオフ）の接続確認
- 作動油の粘度・汚れ具合チェック
- 各シリンダーのストローク確認

現場での具体的な不具合症状を教えていただければ、経験に基づいた対処法をご提案できます。`;
    }
    // 一般的な挨拶への専門的な対応
    if (lowerPrompt.includes('こんにちは') || lowerPrompt.includes('hello')) {
        return `こんにちは！鉄道保守車両技術サポートシステムです。

**【対応可能な専門領域】**
🔧 軌道モータカー（エンジン・油圧・電気系統）
🔧 マルチプルタイタンパー（突固・整正・道床整理）
🔧 バラストレギュレーター（配石・整形作業）
🔧 レール削正車・溶接車等の特殊車両

**【緊急時対応】**
故障・トラブル発生時は「緊急」「故障」等のキーワードを含めてご質問ください。
安全確認→応急対応→本格修理の段階的対応をサポートします。

どのような車両のどのような症状についてお困りでしょうか？
現場の状況を詳しく教えていただければ、実践的なアドバイスを提供いたします。`;
    }
    // より動的なデフォルトレスポンス
    const responses = [
        `🔍 **技術診断サポート準備完了**

現在の症状や車両情報を詳しく教えてください：
- 車両の種類（モータカー、タイタンパー等）
- 発生している症状の詳細
- 作業環境（天候、時間帯、作業内容）

経験豊富な保守技術者の視点で、現場で即座に実行可能な対応策をご提案します。`,
        `⚙️ **保守車両技術相談窓口**

どのような技術的課題でお困りでしょうか？
- 故障診断・応急修理
- 定期点検・予防保全
- 作業効率向上のアドバイス
- 安全作業手順の確認

現場の実情に即した、実践的なソリューションを提供いたします。`,
        `🛠️ **現場技術者サポート**

保守車両のトラブル解決をお手伝いします。
症状の詳細をお聞かせください：
- いつ、どのような状況で発生したか
- エラー表示や異音の有無
- 直前に行っていた作業内容

20年以上の現場経験を基に、効果的な対応方法をご案内します。`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
};
/**
 * OpenAI APIにリクエストを送信して応答を取得する関数
 * @param prompt プロンプト文字列
 * @param useKnowledgeBase ナレッジベースを使用するかどうか
 * @returns OpenAI APIからの応答テキスト
 */
export async function processOpenAIRequest(prompt, useKnowledgeBase = true) {
    try {
        // OpenAIクライアントが利用可能かチェック
        if (!openai) {
            console.log('[DEV] OpenAI client not available, returning development message');
            console.log('[DEBUG] OpenAI client status:', {
                clientExists: !!openai,
                apiKeyExists: !!process.env.OPENAI_API_KEY,
                apiKeyPrefix: process.env.OPENAI_API_KEY
                    ? process.env.OPENAI_API_KEY.substring(0, 10) + '...'
                    : 'NOT FOUND',
            });
            return getMockResponse(prompt);
        }
        console.log('[DEBUG] OpenAI client is available, proceeding with API call');
        // コンテキスト分析を実行
        let contextAnalysis;
        try {
            const { analyzeUserContext, adjustSystemPromptForContext } = await import('./context-analyzer.js');
            contextAnalysis = analyzeUserContext(prompt);
            console.log('[DEBUG] Context analysis:', contextAnalysis);
        }
        catch (error) {
            console.warn('[WARN] Context analyzer not available, using default settings');
            contextAnalysis = null;
        }
        // システムプロンプトを設定
        let systemPrompt = 'あなたは保守用車支援システムの一部として機能するAIアシスタントです。ユーザーの質問に対して、正確で実用的な回答を提供してください。';
        // ナレッジベースから関連情報を取得して含める
        if (useKnowledgeBase) {
            try {
                const { generateSystemPromptWithKnowledge } = await import('./knowledge-base.js');
                systemPrompt = await generateSystemPromptWithKnowledge(prompt);
                // コンテキスト分析結果でシステムプロンプトを調整
                if (contextAnalysis) {
                    const { adjustSystemPromptForContext } = await import('./context-analyzer.js');
                    systemPrompt = adjustSystemPromptForContext(systemPrompt, contextAnalysis);
                }
            }
            catch (error) {
                console.error('ナレッジベース初期化エラー:', error);
                // エラーが発生した場合は基本的なシステムプロンプトを使用
                systemPrompt =
                    'あなたは保守用車支援システムの一部として機能するAIアシスタントです。ユーザーの質問に対して、正確で実用的な回答を提供してください。';
            }
        }
        // コンテキストに基づいた動的パラメータ設定
        const temperature = contextAnalysis?.suggestedResponseStyle.temperature ||
            (useKnowledgeBase ? 0.3 : 0.5);
        const maxTokens = contextAnalysis?.suggestedResponseStyle.maxTokens ||
            (useKnowledgeBase ? 3000 : 2000);
        // OpenAI API呼び出し
        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
            ],
            temperature: temperature,
            max_tokens: maxTokens,
            top_p: 0.9, // より多様な表現を可能にする
            frequency_penalty: 0.1, // 同じ表現の繰り返しを避ける
            presence_penalty: 0.1, // 新しい概念の導入を促進
        });
        // Remove detailed API response receiving logging
        // console.log('OpenAI APIレスポンス受信:', {
        //   id: response.id,
        //   model: response.model,
        //   usage: response.usage,
        //   choicesLength: response.choices?.length
        // });
        // レスポンスからテキストを抽出
        const responseText = response.choices[0].message.content || '';
        // Remove OpenAI response logging
        // console.log('OpenAI応答を受信しました:', responseText.substring(0, 100) + '...');
        return responseText;
    }
    catch (error) {
        console.error('OpenAI API Error Details:', {
            message: error.message,
            code: error.code,
            type: error.type,
            status: error.status,
            stack: error.stack,
        });
        // 特定のエラータイプに応じたメッセージを返す
        if (error.code === 'insufficient_quota') {
            return 'OpenAI APIのクォータが不足しています。';
        }
        else if (error.code === 'invalid_api_key') {
            return 'OpenAI APIキーが無効です。';
        }
        else if (error.code === 'rate_limit_exceeded') {
            return 'OpenAI APIのリクエスト制限に達しました。しばらく待ってから再試行してください。';
        }
        else if (error.message?.includes('timeout')) {
            return 'OpenAI APIのリクエストがタイムアウトしました。';
        }
        else if (error.status === 401) {
            return 'OpenAI APIキーの認証に失敗しました。';
        }
        else if (error.status === 429) {
            return 'OpenAI APIのレート制限に達しました。';
        }
        else if (error.status >= 500) {
            return 'OpenAI APIサーバーでエラーが発生しました。';
        }
        else {
            return `OpenAI APIエラー: ${error.message || 'Unknown error'}`;
        }
    }
}
/**
 * テキストを要約するヘルパー関数
 * @param text 要約するテキスト
 * @returns 要約されたテキスト
 */
export async function summarizeText(text) {
    try {
        // OpenAIクライアントが利用可能かチェック
        if (!openai) {
            console.log('[DEV] OpenAI client not available for text summarization');
            return '開発環境ではテキスト要約機能が利用できません。';
        }
        // 長すぎるテキストを切り詰める
        const truncatedText = text.length > 4000 ? text.substring(0, 4000) + '...' : text;
        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'あなたは技術文書の要約を行う専門家です。文章の要点を保ちながら、簡潔に要約してください。',
                },
                {
                    role: 'user',
                    content: `以下のテキストを100語程度に要約してください:\n\n${truncatedText}`,
                },
            ],
            temperature: 0.3,
        });
        return response.choices[0].message.content || '';
    }
    catch (error) {
        console.error('テキスト要約エラー:', error.message);
        return '要約の生成中にエラーが発生しました。';
    }
}
/**
 * キーワードを生成するヘルパー関数
 * @param text キーワードを生成するテキスト
 * @returns キーワードの配列
 */
export async function generateKeywords(text) {
    try {
        // OpenAIクライアントが利用可能かチェック
        if (!openai) {
            console.log('[DEV] OpenAI client not available for keyword generation');
            return ['開発環境', 'キーワード生成', '利用不可'];
        }
        // 長すぎるテキストを切り詰める
        const truncatedText = text.length > 4000 ? text.substring(0, 4004) + '...' : text;
        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'あなたは技術文書からキーワードを抽出する専門家です。与えられたテキストから、検索に役立つ重要なキーワードを抽出してください。',
                },
                {
                    role: 'user',
                    content: `以下のテキストから、最も重要な5〜10個のキーワードを抽出し、JSON配列形式で返してください。専門用語や固有名詞を優先してください:\n\n${truncatedText}`,
                },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' }, // 強制的にJSONオブジェクトとして返す
        });
        const content = response.choices[0].message.content || '{"keywords": []}';
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed.keywords)) {
                return parsed.keywords;
            }
            else if (Array.isArray(parsed)) {
                return parsed;
            }
            return [];
        }
        catch (e) {
            console.error('キーワード解析エラー:', e);
            return [];
        }
    }
    catch (error) {
        console.error('キーワード生成エラー:', error.message);
        return [];
    }
}
/**
 * 検索クエリを生成する関数
 * @param text 元のテキスト
 * @returns 最適化された検索クエリ
 */
/**
 * キーワードからステップ形式のレスポンスを生成する
 */
export async function generateStepResponse(keyword) {
    try {
        // OpenAIクライアントが利用可能かチェック
        if (!openai) {
            console.log('[DEV] OpenAI client not available for step response generation');
            return {
                title: keyword,
                steps: [
                    { description: '開発環境ではステップ生成機能が利用できません。' },
                ],
            };
        }
        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'あなたは保守用車の専門家です。キーワードに基づいて、具体的な手順を説明してください。',
                },
                {
                    role: 'user',
                    content: `以下のキーワードに関する対応手順を、3-5つのステップに分けて説明してください:\n${keyword}`,
                },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = response.choices[0].message.content || '';
        const result = JSON.parse(content);
        return {
            title: result.title || keyword,
            steps: result.steps || [],
        };
    }
    catch (error) {
        console.error('ステップレスポンス生成エラー:', error);
        return {
            title: keyword,
            steps: [{ description: 'レスポンスの生成に失敗しました。' }],
        };
    }
}
export async function generateSearchQuery(text) {
    try {
        // OpenAIクライアントが利用可能かチェック
        if (!openai) {
            console.log('[DEV] OpenAI client not available for search query generation');
            return text.substring(0, 50); // 開発環境では元のテキストの一部を返す
        }
        // 長すぎるテキストを切り詰める
        const truncatedText = text.length > 200 ? text.substring(0, 200) + '...' : text;
        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a search query optimization expert. Generate optimal search queries for search engines from user questions or text.',
                },
                {
                    role: 'user',
                    content: `Extract optimal search keywords (5-10 words) from the following text for searching related technical documents. Prioritize technical terms and exclude unnecessary conjunctions and prepositions:\n\n${truncatedText}`,
                },
            ],
            temperature: 0.3,
            max_tokens: 100,
        });
        const query = response.choices[0].message.content?.trim() || truncatedText;
        return query;
    }
    catch (error) {
        console.error('Search query generation error:', error.message);
        // エラーが発生した場合は元のテキストを返す
        return text;
    }
}
/**
 * 車両画像を分析する関数
 * @param base64Image Base64エンコードされた画像データ
 * @returns 分析結果
 */
export async function analyzeVehicleImage(base64Image) {
    try {
        // OpenAIクライアントが利用可能かチェック
        if (!openai) {
            console.log('[DEV] OpenAI client not available for vehicle image analysis');
            return {
                analysis: '開発環境では画像分析機能が利用できません。',
                success: false,
                error: 'OpenAI client not available',
            };
        }
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // ビジョン機能を持つモデルを使用
            messages: [
                {
                    role: 'system',
                    content: 'あなたは車両画像分析の専門家です。保守用車・作業用車両・特殊車両の画像を分析し、車両のタイプ、状態、特徴を詳細に説明してください。',
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'この車両の画像を分析して、車両の種類、状態、目立つ特徴、および考えられる用途について詳細に説明してください。保守用車の場合は、その種類（軌道モータカー、マルチプルタイタンパー、バラストレギュレーターなど）も特定してください。',
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 1000,
        });
        return {
            analysis: response.choices[0].message.content || '',
            success: true,
        };
    }
    catch (error) {
        console.error('車両画像分析エラー:', error.message);
        return {
            analysis: '画像の分析中にエラーが発生しました。',
            success: false,
            error: error.message,
        };
    }
}
// OpenAIクライアントをエクスポート
export { openai };
