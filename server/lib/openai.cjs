"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function () { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function (o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function (o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function (o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openai = void 0;
exports.getOpenAIClientStatus = getOpenAIClientStatus;
exports.processOpenAIRequest = processOpenAIRequest;
exports.generateStructuredQAResponse = generateStructuredQAResponse;
exports.evaluateFlowMachineMatch = evaluateFlowMachineMatch;
exports.isAllowedChatHistoryExportJson = isAllowedChatHistoryExportJson;
exports.isFluidLeakageSymptom = isFluidLeakageSymptom;
exports.detectHazardOrAbnormalState = detectHazardOrAbnormalState;
exports.resolveNextFlowStepSafely = resolveNextFlowStepSafely;
exports.matchStandardFlowsAndEvidence = matchStandardFlowsAndEvidence;
exports.summarizeText = summarizeText;
exports.generateKeywords = generateKeywords;
exports.generateStepResponse = generateStepResponse;
exports.generateSearchQuery = generateSearchQuery;
exports.analyzeVehicleImage = analyzeVehicleImage;
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// CommonJS用__dirname定義（既に利用可能）
// .envファイルの読み込み（相対パスで指定）
// 開発環境用の.env.developmentを優先的に読み込む
dotenv_1.default.config({ path: path.resolve(__dirname, '../../server/.env.development') });
dotenv_1.default.config({ path: path.resolve(__dirname, '../../server/.env.production') });
dotenv_1.default.config({ path: path.resolve(__dirname, '../../server/.env') });
dotenv_1.default.config({ path: path.resolve(__dirname, '../../.env') });
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = 'gpt-4o';
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
exports.openai = openai;
if (apiKey &&
    apiKey !== 'dev-mock-key' &&
    apiKey !== 'your-openai-api-key-here' &&
    apiKey.startsWith('sk-')) {
    try {
        exports.openai = openai = new openai_1.default({
            apiKey: apiKey,
        });
        console.log('[DEBUG] OpenAI client initialized successfully');
    }
    catch (error) {
        console.error('[DEBUG] OpenAI client initialization failed:', error);
        exports.openai = openai = null;
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
function getOpenAIClientStatus() {
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
async function processOpenAIRequest(prompt, useKnowledgeBase = true) {
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
            const { analyzeUserContext, adjustSystemPromptForContext } = await import('./context-analyzer.cjs');
            contextAnalysis = analyzeUserContext(prompt);
            console.log('[DEBUG] Context analysis:', contextAnalysis);
        }
        catch (error) {
            console.warn('[WARN] Context analyzer not available, using default settings');
            contextAnalysis = null;
        }
        // システムプロンプトを設定
        let systemPrompt = `あなたは、**鉄道の保守用車（軌道モーターカー）**に関する専門的な知識を持つAIアシスタントです。

【厳守事項】

回答の範囲: 回答は、あなたが保持している保守用車（軌道モーターカー）の仕様、機能、および故障事例に関するナレッジデータのみに基づいて行い、このナレッジにない情報については回答できません。

情報源の限定: インターネット検索や外部情報源を参照することは一切禁止します。

ナレッジの不足時の対応: 質問に対する情報がナレッジデータ内に存在しない場合は、「申し訳ありませんが、その情報（または、その詳細）は、現在の私の保守用車に関するナレッジデータには含まれておりません。」と明確に回答し、それ以上の推測や一般的な情報の提供は行わないでください。

【回答の品質】

専門性: 鉄道保守・車両工学の専門用語を用いて、正確かつ技術的な観点から回答してください。

構造化: 仕様、機能、故障のデータは、箇条書きや表を用いて、利用者が理解しやすいよう構造化して提示してください。

具体的なデータとの紐づけ: 可能な限り、具体的な仕様名、機能名称、故障コード、または特定の構成部品と紐づけて回答してください。

【タスク例】

特定の車種（例：〇〇型軌道モーターカー）のエンジン出力や最大牽引力の仕様を問い合わせられた場合。

油圧駆動システムの機能について説明を求められた場合。

特定の故障コード（例：E-123）が発生した場合の考えられる原因や一次的な対処法を問い合わせられた場合。

上記を厳守し、専門家として、ユーザーの質問に正確に回答してください。`;
        // ナレッジベースから関連情報を取得して含める
        if (useKnowledgeBase) {
            try {
                const { generateSystemPromptWithKnowledge } = await import('./knowledge-base.cjs');
                // RAG設定を読み込む（settings.tsの設定ファイルから）
                let ragSettings = null;
                try {
                    // まず、settings.tsの設定ファイルから読み込む
                    const settingsPath = path.join(__dirname, '../routes/../data/rag-settings.json');
                    const settingsPathAlt = path.join(process.cwd(), 'server', 'data', 'rag-settings.json');
                    let ragConfigData = null;
                    if (fs.existsSync(settingsPath)) {
                        ragConfigData = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
                    }
                    else if (fs.existsSync(settingsPathAlt)) {
                        ragConfigData = JSON.parse(fs.readFileSync(settingsPathAlt, 'utf-8'));
                    }
                    if (ragConfigData) {
                        ragSettings = {
                            similarityThreshold: ragConfigData.similarityThreshold ?? 0.7,
                            maxResults: ragConfigData.maxResults ?? 5,
                            enableSemantic: ragConfigData.useSemanticSearch ?? true,
                            enableKeyword: ragConfigData.useKeywordSearch ?? true,
                            customPrompt: ragConfigData.customPrompt ?? '',
                        };
                        console.log('✅ RAG設定を読み込みました:', ragSettings);
                    }
                    else {
                        // config-manager.tsから読み込む（フォールバック）
                        try {
                            const { loadRagConfig } = await import('../services/config-manager.js');
                            const ragConfig = await loadRagConfig();
                            ragSettings = {
                                similarityThreshold: ragConfig.similarityThreshold,
                                maxResults: ragConfig.retrieveK,
                                enableSemantic: true,
                                enableKeyword: true,
                                customPrompt: '',
                            };
                        }
                        catch (configManagerError) {
                            throw configManagerError;
                        }
                    }
                }
                catch (ragError) {
                    console.warn('RAG設定の読み込みに失敗しました。デフォルト値を使用します:', ragError);
                    // デフォルト値を使用
                    ragSettings = {
                        similarityThreshold: 0.7,
                        maxResults: 5,
                        enableSemantic: true,
                        enableKeyword: true,
                        customPrompt: '',
                    };
                }
                systemPrompt = await generateSystemPromptWithKnowledge(prompt, ragSettings);
                // コンテキスト分析結果でシステムプロンプトを調整
                if (contextAnalysis) {
                    const { adjustSystemPromptForContext } = await import('./context-analyzer.cjs');
                    systemPrompt = adjustSystemPromptForContext(systemPrompt, contextAnalysis);
                }
            }
            catch (error) {
                console.error('ナレッジベース初期化エラー:', error);
                if (error instanceof Error) {
                    console.error('エラー詳細:', {
                        message: error.message,
                        stack: error.stack,
                        name: error.name
                    });
                }
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
async function summarizeText(text) {
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
async function generateKeywords(text) {
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
async function generateStepResponse(keyword) {
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
async function generateSearchQuery(text) {
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
async function analyzeVehicleImage(base64Image) {
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

/**
 * 知識ベースディレクトリの解決ヘルパー
 */
function resolveKnowledgeBaseRoot() {
    if (process.env.KNOWLEDGE_BASE_PATH && fs.existsSync(process.env.KNOWLEDGE_BASE_PATH)) {
        return process.env.KNOWLEDGE_BASE_PATH;
    }
    const candidates = [
        path.join(__dirname, '..', '..', 'knowledge-base'),
        path.join(process.cwd(), 'knowledge-base'),
        path.join(__dirname, '..', 'knowledge-base'),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return path.join(process.cwd(), 'knowledge-base');
}

/**
 * 日本語テキストから照合用キーワードを抽出
 */
function extractJapaneseTerms(text) {
    if (!text || typeof text !== 'string') return [];
    const domainKeywords = [
        'エンジン', 'ディーゼル', '停止', '始動', 'かからない', '止まった',
        '回転', 'アクセル', 'アイドリング', '出力',
        '前進', '後進', 'スイッチ', 'トルクコンバータ', 'トルコン', '走行', '動かない', '反応しない',
        'ラジエーター', '異音', '音', '振動', '異臭', '煙', '発熱', 'オーバーヒート', '冷却', '水漏れ', '冷却液',
        '燃料', '軽油', 'フィルター', 'オイル', '油量', '油圧', '作動油', '油漏れ', 'ポンプ', 'シリンダー',
        '油', '水', '液体', '漏れ', '落ちている', '垂れている', '滴下', '染み', '水たまり',
        'エアー', '空気', 'コンプレッサー', '圧力', '溜まらない',
        'ブレーキ', '駐車', 'バネブレーキ', '解放しない', '制動', '緩まない',
        'バッテリー', '電圧', 'スターター', 'セル', '照明', 'ライト', '暗い', 'ヒューズ', '配線', '電気',
        '警告', 'ランプ', 'エラー', 'アラーム', 'ブザー',
        'タイタンパー', '突固', 'モータカー', 'モーターカー', 'トロ', '脱線', '車輪'
    ];
    const lower = text.toLowerCase();
    const matched = domainKeywords.filter(kw => lower.includes(kw.toLowerCase()));
    const tokens = lower
        .split(/[\s、。！？!?,.\n\r「」『』（）()【】\[\]：:／/]+/)
        .map(t => t.trim())
        .filter(t => t.length >= 2 && !['です', 'ます', 'した', 'する', 'ある', 'ない', 'から', 'ため', 'こと', 'もの', 'よう'].includes(t));
    return Array.from(new Set([...matched, ...tokens]));
}

/**
 * 機種名の正規化ヘルパー（表記ゆれ吸収：モーターカー⇔モータカー等）
 */
function normalizeMachineName(name) {
    if (!name || typeof name !== 'string') return '';
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/モーターカー/g, 'モータカー')
        .replace(/ﾓｰﾀｶｰ/g, 'モータカー')
        .replace(/ﾓｰﾀｰｶｰ/g, 'モータカー')
        .replace(/マルタイ/g, 'マルチプルタイタンパー')
        .replace(/タイタンパ$/g, 'タイタンパー');
}

/**
 * 機種マスタ（knowledge-base/data/machines.json）を読み込み、機種ID・機種名一覧を返す
 */
function loadMachineMaster(kbRoot) {
    const masterPath = path.join(kbRoot || resolveKnowledgeBaseRoot(), 'data', 'machines.json');
    if (!fs.existsSync(masterPath)) {
        return { machineTypes: [], machines: [] };
    }
    try {
        const data = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
        return {
            machineTypes: Array.isArray(data.machineTypes) ? data.machineTypes : [],
            machines: Array.isArray(data.machines) ? data.machines : [],
        };
    } catch (_err) {
        return { machineTypes: [], machines: [] };
    }
}

/**
 * 選択中の機種情報（machineInfo）と標準フロー（flowData）の適用機種を厳格照合する
 * - 構造化フィールド（machineTypeId, machineTypeName, targetMachineTypes, applicableMachines, conditions）を最優先
 * - タイトルや本文のキーワード一致だけでは isVerifiedMachine: true にしない
 * - 他機種と判定された場合は status: 'mismatch'、適用機種不明の場合は status: 'unknown_flow_machine'
 */
function evaluateFlowMachineMatch(flowData, machineInfo = {}, kbRoot = null) {
    if (!flowData || typeof flowData !== 'object') {
        return {
            status: 'unknown_flow_machine',
            isVerifiedMachine: false,
            reason: 'フローデータが不正です',
        };
    }

    const master = loadMachineMaster(kbRoot);
    const rawSelectedId =
        machineInfo?.machineTypeId ||
        machineInfo?.selectedMachineType ||
        machineInfo?.machine_type_id ||
        '';
    let rawSelectedName =
        machineInfo?.machineTypeName ||
        machineInfo?.machine_type_name ||
        machineInfo?.machineType ||
        '';

    // 機種IDから機種マスタの名称を補完
    if (rawSelectedId && !rawSelectedName && master.machineTypes.length > 0) {
        const foundType = master.machineTypes.find(
            t => String(t.id) === String(rawSelectedId) || String(t.machine_type_name) === String(rawSelectedId)
        );
        if (foundType) {
            rawSelectedName = foundType.machine_type_name;
        }
    }

    const normalizedSelectedId = String(rawSelectedId || '').trim().toLowerCase();
    const normalizedSelectedName = normalizeMachineName(rawSelectedName);
    const hasSelectedMachine = Boolean(normalizedSelectedId || normalizedSelectedName);

    // 1. フロー側の構造化機種情報（ID・名称・適用条件）を抽出
    const structuredIds = [
        flowData.machineTypeId,
        flowData.machine_type_id,
        ...(Array.isArray(flowData.machineTypeIds) ? flowData.machineTypeIds : []),
        ...(Array.isArray(flowData.targetMachineIds) ? flowData.targetMachineIds : []),
        ...(Array.isArray(flowData.applicableMachineIds) ? flowData.applicableMachineIds : []),
    ]
        .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
        .map(v => String(v).trim().toLowerCase());

    const structuredNames = [
        flowData.machineTypeName,
        flowData.machine_type_name,
        flowData.machineType,
        ...(Array.isArray(flowData.targetMachineTypes) ? flowData.targetMachineTypes : []),
        ...(Array.isArray(flowData.applicableMachines) ? flowData.applicableMachines : []),
        ...(Array.isArray(flowData.applicableConditions?.machineTypes)
            ? flowData.applicableConditions.machineTypes
            : []),
    ]
        .filter(v => typeof v === 'string' && v.trim() !== '')
        .map(v => v.trim());

    // conditions配列内の構造化機種条件もチェック
    const allConditions = [
        ...(Array.isArray(flowData.conditions) ? flowData.conditions : []),
        ...(Array.isArray(flowData.steps)
            ? flowData.steps.flatMap(s => (Array.isArray(s.conditions) ? s.conditions : []))
            : []),
    ];
    for (const cond of allConditions) {
        if (cond && typeof cond === 'object') {
            if (cond.machineTypeId || cond.machine_type_id) {
                structuredIds.push(String(cond.machineTypeId || cond.machine_type_id).trim().toLowerCase());
            }
            if (cond.machineTypeName || cond.machine_type_name || cond.machineType) {
                structuredNames.push(String(cond.machineTypeName || cond.machine_type_name || cond.machineType).trim());
            }
        }
    }

    const hasStructuredMachineInfo = structuredIds.length > 0 || structuredNames.length > 0;

    if (hasStructuredMachineInfo) {
        if (!hasSelectedMachine) {
            return {
                status: 'unknown_selected_machine',
                isVerifiedMachine: false,
                flowMachineLabel: structuredNames.join(', ') || structuredIds.join(', '),
                reason: '現在選択されている機種が未指定のため、標準フローの適用機種と照合できません。',
            };
        }

        const idMatched =
            normalizedSelectedId &&
            structuredIds.some(id => id === normalizedSelectedId);
        const nameMatched =
            normalizedSelectedName &&
            structuredNames.some(name => {
                const normFlowName = normalizeMachineName(name);
                return (
                    normFlowName === normalizedSelectedName ||
                    normFlowName.includes(normalizedSelectedName) ||
                    normalizedSelectedName.includes(normFlowName)
                );
            });

        if (idMatched || nameMatched) {
            return {
                status: 'matched',
                isVerifiedMachine: true,
                flowMachineLabel: structuredNames.join(', ') || rawSelectedName || rawSelectedId,
                reason: '選択機種と標準フローの構造化適用機種が一致しました。',
            };
        }

        return {
            status: 'mismatch',
            isVerifiedMachine: false,
            flowMachineLabel: structuredNames.join(', ') || structuredIds.join(', '),
            reason: `選択機種（${rawSelectedName || rawSelectedId}）と標準フローの対象機種（${structuredNames.join(', ') || structuredIds.join(', ')}）が一致しません。`,
        };
    }

    // 2. 構造化機種情報が存在しない場合：本文・タイトル内の他機種記載を検出して区別する
    // ※ルール：「タイトルや本文のキーワード一致だけで isVerified: true にしない」「適用機種が不明なフローを確定手順として表示しない」
    const knownMachineKeywords = [
        '軌道モータカー',
        '軌道モーターカー',
        'マルチプルタイタンパー',
        'マルタイ',
        'バラストレギュレーター',
        'レール削正車',
        '高所作業車',
        '確認車',
        ...master.machineTypes.map(t => t.machine_type_name).filter(Boolean),
    ];

    const fullFlowText = [
        flowData.title || '',
        flowData.description || '',
        ...(Array.isArray(flowData.steps)
            ? flowData.steps.map(s => `${s.title || ''} ${s.description || ''}`)
            : []),
    ].join(' ');

    const detectedMachinesInText = Array.from(
        new Set(
            knownMachineKeywords.filter(kw =>
                normalizeMachineName(fullFlowText).includes(normalizeMachineName(kw))
            )
        )
    );

    if (detectedMachinesInText.length > 0 && hasSelectedMachine) {
        const matchesSelectedInText = detectedMachinesInText.some(kw => {
            const normKw = normalizeMachineName(kw);
            return (
                normKw === normalizedSelectedName ||
                normKw.includes(normalizedSelectedName) ||
                normalizedSelectedName.includes(normKw)
            );
        });

        if (!matchesSelectedInText) {
            return {
                status: 'mismatch',
                isVerifiedMachine: false,
                flowMachineLabel: detectedMachinesInText.join(', '),
                reason: `選択機種（${rawSelectedName || rawSelectedId}）に対し、他機種（${detectedMachinesInText.join(', ')}）に関する記載があるフローのため参考情報として区別します。`,
            };
        }
    }

    // 構造化された適用機種情報が存在しないため、キーワード一致のみでは確定手順（isVerifiedMachine: true）としない
    return {
        status: 'unknown_flow_machine',
        isVerifiedMachine: false,
        flowMachineLabel: detectedMachinesInText.length > 0 ? `${detectedMachinesInText.join(', ')}（構造化適用機種未設定）` : '適用機種未設定',
        reason: '標準フローに構造化された適用機種（機種ID・適用条件）が設定されていないため、確定した応急処置としては表示しません。',
    };
}

/**
 * 対応履歴エクスポートJSON（knowledge-base/exports/*.json）の許可判定ヘルパー（不具合③対策）
 * - システムプロンプト設定ファイル（railway-maintenance-ai-prompt.json 等）を除外し、対応履歴JSONのみを許可する
 */
function isAllowedChatHistoryExportJson(fileName, parsedData) {
    if (!fileName || typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.json')) {
        return false;
    }
    const lowerName = fileName.toLowerCase();
    // システム設定・プロンプト定義・テンプレート等のファイル名を明示的に拒否
    if (
        lowerName.includes('prompt') ||
        lowerName.includes('config') ||
        lowerName.includes('setting') ||
        lowerName.includes('system') ||
        lowerName.includes('schema') ||
        lowerName.includes('template')
    ) {
        return false;
    }
    if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
        return false;
    }
    // システムプロンプト特有のキーを持つJSONを拒否
    if (
        parsedData.ai_role ||
        parsedData.personality ||
        parsedData.rules ||
        parsedData.output_format ||
        parsedData.emergency_procedures
    ) {
        return false;
    }
    // 対応履歴JSONの必須構造（chatData.messages または chatId + messages）を確認
    const messages = Array.isArray(parsedData.chatData?.messages)
        ? parsedData.chatData.messages
        : Array.isArray(parsedData.messages)
          ? parsedData.messages
          : null;
    const hasChatIdentifier = Boolean(parsedData.chatId || parsedData.chatData?.chatId || parsedData.exportTimestamp);

    return Boolean(messages && messages.length > 0 && hasChatIdentifier);
}

/**
 * 液体漏出（「エンジン下に油か水のようなものが落ちている」等）の報告かどうかを判定
 */
function isFluidLeakageSymptom(text) {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase();
    // 明示的な漏出複合語
    if (
        lower.includes('油漏れ') ||
        lower.includes('水漏れ') ||
        lower.includes('オイル漏れ') ||
        lower.includes('燃料漏れ') ||
        lower.includes('冷却水漏れ') ||
        lower.includes('冷却液が漏れ') ||
        lower.includes('液漏れ')
    ) {
        return true;
    }
    const hasFluidWord = /(油|オイル|作動油|水|冷却水|冷却液|燃料|軽油|液体|液)/.test(lower);
    const hasLeakAction = /(落ちている|落ちて|垂れている|垂れて|漏れている|漏れて|漏れ|滴下|染み|溜まって|水たまり|濡れて)/.test(lower);
    return hasFluidWord && hasLeakAction;
}

/**
 * 確認ステップや選択肢の回答から「冷却水漏れ・油漏れ・亀裂・煙・異臭・異常発熱・異常音」等の異常/危険状態を検出
 */
function detectHazardOrAbnormalState(latestUserText, conversationHistory = []) {
    const userTexts = [
        ...(Array.isArray(conversationHistory)
            ? conversationHistory.filter(m => !m.isAiResponse && m.content).map(m => m.content)
            : []),
        latestUserText || '',
    ];
    const latest = (latestUserText || '').trim();
    const combined = userTexts.join(' ');

    // 正常回答（「異常は見つからなかった」「正常」「異音は止まった」「十分にある」「清潔」等）の場合は最新回答自体は異常ではない
    const isLatestExplicitlyNormal =
        /(異常は見つからなかった|異常なし|正常|十分にある|清潔|止まった|再発しなかった|異常表示はない)/.test(latest) &&
        !/(漏れ|亀裂|異臭|発熱|煙|破損|異物|濁って|低い|過剰|少ない|異常音)/.test(latest);

    const hazardPatterns = [
        { pattern: /(冷却液が漏れ|冷却水漏れ|ラジエーターから.*漏れ|ラジエーターに亀裂|亀裂が見つかった)/, type: 'coolant_or_radiator_hazard', label: '冷却液漏れ・ラジエーター亀裂' },
        { pattern: /(油漏れ|オイル漏れ|作動油漏れ|燃料漏れ|燃料に異物)/, type: 'fluid_or_fuel_hazard', label: '油漏れ・燃料系異常' },
        { pattern: /(異臭|焦げ臭|煙|発煙|白煙|黒煙|異常な発熱|オーバーヒート)/, type: 'thermal_or_fire_hazard', label: '異臭・発煙・異常発熱' },
        { pattern: /(エンジンから異常音|エンジンが異常音|異音が続いている|フィルターが破損|黒く濁っている|オイルレベルが低い|オイルレベルが過剰)/, type: 'mechanical_or_lubrication_hazard', label: '機関異音・潤滑/フィルター異常' },
    ];

    for (const h of hazardPatterns) {
        if (!isLatestExplicitlyNormal && h.pattern.test(latest)) {
            return {
                hasHazard: true,
                isFromLatestAnswer: true,
                hazardType: h.type,
                hazardLabel: h.label,
                matchedText: latest,
            };
        }
    }

    for (const h of hazardPatterns) {
        if (h.pattern.test(combined)) {
            return {
                hasHazard: true,
                isFromLatestAnswer: false,
                hazardType: h.type,
                hazardLabel: h.label,
                matchedText: combined,
            };
        }
    }

    return {
        hasHazard: false,
        isFromLatestAnswer: false,
        hazardType: null,
        hazardLabel: null,
    };
}

/**
 * 手順や質問テキストに「エンジン再始動・始動・走行・作業装置操作」等の安全上重要な危険操作が含まれるか判定
 */
function containsDangerousOperation(text) {
    if (!text || typeof text !== 'string') return false;
    return /(再始動|再度始動|エンジンを始動|エンジンをかけ|セルを回|クランキング|走行させ|前進させ|後進させ|移動させ|運転を再開|作業装置を操作|ハイドロリックポンプの稼働音を耳で確認|手動解放ボルトを回)/.test(
        text
    );
}

/**
 * 液体に触れる・臭いを嗅ぐ・高温部や回転部に近づく・外観だけで液種を断定する不適切表現を除去/安全化する
 */
function sanitizeUnsafeInspectionText(text) {
    if (!text || typeof text !== 'string') return text;
    let safe = text;
    if (/(触って|触れて|指で触|手で触|臭いを嗅|においを嗅|匂いを嗅|高温部に近づ|回転部に近づ)/.test(safe)) {
        safe = 'エンジン停止状態を維持し、液体に触れたり臭いを嗅いだりせず、高温部・回転部から離れた安全な位置から目視のみで確認してください。';
    }
    return safe;
}

/**
 * 汎用・定型的な安全注意文（初期カードで既に表示済みの定型文）かどうかを判定
 */
function isGenericSafetyWarning(text) {
    if (!text || typeof text !== 'string') return true;
    const t = text.trim();
    if (!t) return true;
    const genericPatterns = [
        /^異臭・発煙・液漏れがある場合はエンジンを始動せず、高温部や回転部に近づかないでください。?$/,
        /^点検・確認を行う前に、作業区域の安全確保と車両の完全停止（駐車ブレーキ・輪止め設置）を確認してください。?$/,
        /^点検前に必ず車両を安全な場所に停止させ/,
        /^確認作業を行う前に、作業区域の安全確保/,
        /^確認作業中はエンジン停止と転動防止措置/,
        /^作業前に必ず車両の完全停止・エンジン停止/,
        /^点検時は前後進レバーを中立/,
        /^作業中はエンジン停止・転動防止措置（輪止め）を維持し/,
    ];
    return genericPatterns.some(p => p.test(t));
}

/**
 * 2枚目以降のカード向けに、最新の危険兆候・状態に応じて必要な場合のみ安全注意文を構築する
 * （汎用安全注意の毎回繰り返しを防止しつつ、緊急・液体漏出・異臭/発煙/異常発熱/危険操作抑止は確実に表示する）
 */
function resolveContextualSafetyWarning({
    status = 'question',
    latestInput = '',
    hazardState = null,
    dangerousStepText = '',
    emergencyFallbackWarning = undefined,
} = {}) {
    if (status === 'emergency') {
        return (
            emergencyFallbackWarning ||
            '安全確保のためエンジン再始動・走行・作業装置の操作は絶対に行わず、駐車ブレーキと輪止めを維持して責任者・技術支援センターへ連絡してください。'
        );
    }

    if (isFluidLeakageSymptom(latestInput)) {
        return '液漏れが確認されているため、エンジンは絶対に始動・再始動しないでください。漏れた液体に触れる・臭いを嗅ぐ・高温部や回転部に近づく行為は厳禁です。';
    }

    if (hazardState?.hasHazard && hazardState.isFromLatestAnswer) {
        if (hazardState.hazardType === 'thermal_or_fire_hazard') {
            return `【緊急注意】${hazardState.hazardLabel}が報告されています。直ちにエンジン停止・火気厳禁を徹底し、周囲の安全を確保して近づかないでください。`;
        }
        return `【危険兆候検知】${hazardState.hazardLabel}が報告されています。エンジン再始動・走行は行わず、安全な距離を保って状態を確認してください。`;
    }

    if (dangerousStepText && containsDangerousOperation(dangerousStepText)) {
        return 'この確認中は、エンジンの無理な再始動・走行・作業装置の操作を絶対に行わず、停止・転動防止状態を維持してください。';
    }

    return undefined;
}

/**
 * 承認済み標準フロー（knowledge-base/troubleshooting/*.json）と根拠資料（documents / exports / text）を検索・照合
 */
function matchStandardFlowsAndEvidence(queryText, conversationHistory = [], machineInfo = {}) {
    const kbRoot = resolveKnowledgeBaseRoot();
    const historyUserTexts = (Array.isArray(conversationHistory) ? conversationHistory : [])
        .filter(m => !m.isAiResponse && m.content && !m.invalidated)
        .map(m => m.content);
    const combinedUserContext = [...historyUserTexts, queryText || ''].join(' ');
    const terms = extractJapaneseTerms(combinedUserContext);

    // 1. 承認済み標準フロー（troubleshooting/*.json）の照合＋機種照合
    const flowsDir = path.join(kbRoot, 'troubleshooting');
    const matchedFlows = [];
    const referenceOtherMachineFlows = [];

    if (fs.existsSync(flowsDir)) {
        try {
            const files = fs.readdirSync(flowsDir).filter(f => f.endsWith('.json'));
            for (const file of files) {
                try {
                    const flowPath = path.join(flowsDir, file);
                    const flowData = JSON.parse(fs.readFileSync(flowPath, 'utf-8'));
                    const triggerText = Array.isArray(flowData.triggerKeywords)
                        ? flowData.triggerKeywords.join(' ')
                        : '';
                    const stepsText = Array.isArray(flowData.steps)
                        ? flowData.steps.map(s => `${s.title || ''} ${s.description || ''}`).join(' ')
                        : '';
                    const targetHeader = `${flowData.title || ''} ${flowData.description || ''} ${triggerText}`.toLowerCase();
                    const targetFull = `${targetHeader} ${stepsText}`.toLowerCase();

                    let score = 0;
                    let headerMatchCount = 0;
                    for (const term of terms) {
                        if (targetHeader.includes(term)) {
                            const isGeneric = ['音', '停止', '走行', '異常', '確認', 'エンジン'].includes(term);
                            score += isGeneric ? 1 : 3;
                            headerMatchCount += 1;
                        } else if (targetFull.includes(term)) {
                            score += 1;
                        }
                    }

                    // タイトル/トリガーで具体的な語を含む複数一致（スコア4以上かつ2語以上一致）
                    if (score >= 4 && headerMatchCount >= 2) {
                        const machineCheck = evaluateFlowMachineMatch(flowData, machineInfo, kbRoot);
                        const flowEntry = {
                            id: flowData.id || path.basename(file, '.json'),
                            title: flowData.title || path.basename(file, '.json'),
                            description: flowData.description || '',
                            steps: Array.isArray(flowData.steps) ? flowData.steps : [],
                            score,
                            machineMatchStatus: machineCheck.status,
                            isMachineVerified: machineCheck.isVerifiedMachine,
                            flowMachineLabel: machineCheck.flowMachineLabel,
                            machineMatchReason: machineCheck.reason,
                        };

                        if (machineCheck.status === 'mismatch') {
                            // 他機種の標準フローは確定手順にも進行フローにも使わず、参考情報として分離
                            referenceOtherMachineFlows.push(flowEntry);
                        } else {
                            matchedFlows.push(flowEntry);
                        }
                    }
                } catch (_err) {
                    // 個別ファイルのパースエラーは無視
                }
            }
        } catch (_err) {
            // ディレクトリ読み取りエラーは無視
        }
    }
    matchedFlows.sort((a, b) => b.score - a.score);
    referenceOtherMachineFlows.sort((a, b) => b.score - a.score);

    // 2. 根拠資料（documents/*/chunks.json および 許可された対応履歴 exports/*.json）の照合
    const matchedChunks = [];
    const docsDir = path.join(kbRoot, 'documents');
    if (fs.existsSync(docsDir) && terms.length > 0) {
        try {
            const docFolders = fs.readdirSync(docsDir).filter(d => {
                const p = path.join(docsDir, d);
                return fs.existsSync(p) && fs.statSync(p).isDirectory();
            });
            for (const folder of docFolders) {
                const chunksFile = path.join(docsDir, folder, 'chunks.json');
                const metaFile = path.join(docsDir, folder, 'metadata.json');
                if (!fs.existsSync(chunksFile)) continue;
                try {
                    let docTitle = folder;
                    if (fs.existsSync(metaFile)) {
                        const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
                        // システムプロンプト設定等が紛れ込んでいた場合は除外
                        if (meta.category === 'system_prompt' || meta.type === 'prompt_config') {
                            continue;
                        }
                        docTitle = meta.decodedFileName || meta.safeFileName || meta.title || folder;
                        if (/[äåæçèéêëìíîïðñòóôõö]/.test(docTitle)) {
                            try {
                                docTitle = Buffer.from(docTitle, 'latin1').toString('utf8');
                            } catch (_e) {
                                // ignore
                            }
                        }
                    }
                    const chunks = JSON.parse(fs.readFileSync(chunksFile, 'utf-8'));
                    if (Array.isArray(chunks)) {
                        for (const chunk of chunks) {
                            const chunkText = chunk.text || '';
                            if (!chunkText) continue;
                            const lowerChunk = chunkText.toLowerCase();
                            let score = 0;
                            for (const term of terms) {
                                if (lowerChunk.includes(term)) score += 1;
                            }
                            if (score >= 2) {
                                matchedChunks.push({
                                    source: docTitle,
                                    text: chunkText.substring(0, 350),
                                    score,
                                    isReferenceOnly: true,
                                });
                            }
                        }
                    }
                } catch (_err) {
                    // 無視
                }
            }
        } catch (_err) {
            // 無視
        }
    }

    // 過去の対応履歴エクスポート（knowledge-base/exports/*.json）の照合（システムプロンプト設定JSONを厳格除外）
    const exportsDir = path.join(kbRoot, 'exports');
    if (fs.existsSync(exportsDir) && terms.length > 0) {
        try {
            const exportFiles = fs.readdirSync(exportsDir).filter(f => f.endsWith('.json'));
            for (const file of exportFiles) {
                try {
                    const filePath = path.join(exportsDir, file);
                    const raw = fs.readFileSync(filePath, 'utf-8');
                    const parsed = JSON.parse(raw);

                    // 不具合③対策: 対応履歴JSONと設定/システムプロンプトJSONを明確に区別
                    if (!isAllowedChatHistoryExportJson(file, parsed)) {
                        continue;
                    }

                    const historyMessages = Array.isArray(parsed.chatData?.messages)
                        ? parsed.chatData.messages
                        : Array.isArray(parsed.messages)
                          ? parsed.messages
                          : [];
                    const historyTitle = parsed.title || file.split('_')[0];
                    const messageContents = historyMessages
                        .map(m => m.content || '')
                        .filter(c => c && !c.includes('機種及び機械番号を選択入力してください') && !c.includes('AI支援を終了しました'))
                        .join('\n');
                    const searchableText = `${historyTitle}\n${messageContents}`.toLowerCase();

                    let score = 0;
                    for (const term of terms) {
                        if (searchableText.includes(term)) {
                            score += 2;
                        }
                    }
                    if (score >= 2) {
                        matchedChunks.push({
                            source: `対応履歴ナレッジ: ${historyTitle}`,
                            text: `${historyTitle}: ${messageContents.substring(0, 300)}`,
                            score,
                            isReferenceOnly: true,
                        });
                    }
                } catch (_err) {
                    // 無視
                }
            }
        } catch (_err) {
            // 無視
        }
    }

    matchedChunks.sort((a, b) => b.score - a.score);

    return {
        bestFlow: matchedFlows[0] || null,
        matchedFlows: matchedFlows.slice(0, 2),
        referenceOtherMachineFlows: referenceOtherMachineFlows.slice(0, 2),
        matchedChunks: matchedChunks.slice(0, 4),
    };
}

/**
 * 標準フロー内の次のステップを安全条件・分岐整合性を検証しながら解決する
 * - 単純な decisionIdx 順次進行を廃止
 * - 異常選択肢（冷却水漏れ、亀裂、異臭、発熱、異常音、油異常等）が選ばれた場合や分岐不全（自己ループ等）時は危険操作へ進ませず emergency へ移行
 */
function resolveNextFlowStepSafely(flow, latestInput, conversationHistory = []) {
    if (!flow || !Array.isArray(flow.steps) || flow.steps.length === 0) {
        return { action: 'none' };
    }

    const steps = flow.steps;
    const decisionSteps = steps.filter(
        s => s.type === 'decision' && Array.isArray(s.options) && s.options.length > 0
    );
    if (decisionSteps.length === 0) {
        return { action: 'none' };
    }

    const activeHistory = (Array.isArray(conversationHistory) ? conversationHistory : []).filter(
        m => !m.invalidated
    );
    const userAnswers = activeHistory
        .filter(m => !m.isAiResponse && m.content)
        .map(m => m.content.trim());
    if (latestInput && userAnswers[userAnswers.length - 1] !== latestInput.trim()) {
        userAnswers.push(latestInput.trim());
    }

    // 1. これまでの回答で標準フロー内のどの decision ステップまで回答済みかを特定
    let currentDecisionIndex = 0;
    let lastMatchedDecision = null;
    let lastSelectedOption = null;

    for (let i = 0; i < decisionSteps.length; i++) {
        const dStep = decisionSteps[i];
        const cleanTitle = (dStep.title || dStep.message || '')
            .replace(/^（decision）[:：]\s*/i, '')
            .replace(/^\(decision\)[:：]\s*/i, '');

        // AIがこの質問を既に提示したか、またはユーザーの回答がこのdecisionの選択肢と一致するか確認
        const wasAskedByAi = activeHistory.some(
            m => m.isAiResponse && m.content && cleanTitle && m.content.includes(cleanTitle)
        );
        const matchedOpt = dStep.options.find(opt => {
            const optText = typeof opt === 'string' ? opt : opt.text || opt.condition || '';
            return optText && userAnswers.some(ans => ans === optText || ans.includes(optText));
        });

        if (matchedOpt) {
            lastMatchedDecision = dStep;
            lastSelectedOption = typeof matchedOpt === 'string' ? { text: matchedOpt } : matchedOpt;
            currentDecisionIndex = i + 1;
        } else if (wasAskedByAi && userAnswers.length > i + 1) {
            lastMatchedDecision = dStep;
            lastSelectedOption = { text: userAnswers[userAnswers.length - 1], conditionType: 'unknown' };
            currentDecisionIndex = i + 1;
        } else {
            break;
        }
    }

    // 2. 直前の回答が異常選択肢（conditionType !== 'yes' または異常・危険ワードを含む）だった場合の安全評価
    if (lastSelectedOption) {
        const optText = lastSelectedOption.text || lastSelectedOption.condition || '';
        const isNormalOption =
            lastSelectedOption.conditionType === 'yes' ||
            /(正常|異常は見つからなかった|止まった|十分にある|清潔|再発しなかった)/.test(optText);
        const isAbnormalOrUnknownOption =
            !isNormalOption ||
            /(漏れている|漏れ|亀裂|異物|異臭|発熱|異常音|少ない|燃料はない|汚れ|破損|黒く濁って|低い|過剰|続いている|不明|分から|わから)/.test(
                optText
            );

        if (isAbnormalOrUnknownOption) {
            // 遷移先ステップを確認
            const nextStepId = lastSelectedOption.nextStepId;
            const targetStep = nextStepId ? steps.find(s => s.id === nextStepId) : null;

            // 分岐不整合チェック：
            // (a) 自己ループ（step_6 -> step_6）
            // (b) 異常が検出されたのに「エンジン再始動」「ハイドロリックポンプ稼働音（エンジン始動状態）」等の危険操作ステップへ進む
            // (c) 異常時に個別処置ステップがなく最終decisionへ飛んでいる
            const nextDecisionCandidate = decisionSteps[currentDecisionIndex];
            const nextPrecedingAction = steps.find(
                (s, idx) =>
                    s.type === 'step' &&
                    nextDecisionCandidate &&
                    idx < steps.indexOf(nextDecisionCandidate) &&
                    idx > steps.indexOf(lastMatchedDecision)
            );

            const combinedNextText = [
                targetStep?.title || '',
                targetStep?.description || '',
                nextPrecedingAction?.title || '',
                nextPrecedingAction?.description || '',
                nextDecisionCandidate?.title || '',
                nextDecisionCandidate?.description || '',
            ].join(' ');

            if (
                containsDangerousOperation(combinedNextText) ||
                /(漏れている|亀裂|異臭|異常な発熱|エンジンから異常音|エンジンが異常音|燃料に異物|フィルターが破損|黒く濁って)/.test(
                    optText
                ) ||
                !targetStep ||
                targetStep.id === lastMatchedDecision?.id ||
                targetStep.id === decisionSteps[decisionSteps.length - 1]?.id
            ) {
                return {
                    action: 'abort_to_emergency',
                    abortedReason: `確認項目「${(lastMatchedDecision?.title || '').replace(/^（decision）[:：]\s*/i, '')}」にて異常または未確定状態（${optText}）が確認されたため、以降の通常確認・再始動手順への進行を停止しました。`,
                    detectedAbnormalOption: optText,
                };
            }
        }
    }

    // 3. まだ未回答の decision ステップがある場合、そのステップが危険操作を含まないか検証
    if (currentDecisionIndex < decisionSteps.length) {
        const nextDecision = decisionSteps[currentDecisionIndex];
        const decisionPos = steps.indexOf(nextDecision);
        const precedingAction =
            decisionPos > 0 && steps[decisionPos - 1]?.type === 'step'
                ? steps[decisionPos - 1]
                : null;

        const checkText = `${precedingAction?.title || ''} ${precedingAction?.description || ''} ${nextDecision.title || ''} ${nextDecision.description || ''}`;

        // エンジン再始動・走行・作業装置操作を含むステップは、機種一致（isMachineVerified）かつ異常なしの場合のみ許可
        if (containsDangerousOperation(checkText) && !flow.isMachineVerified) {
            return {
                action: 'abort_to_emergency',
                abortedReason: `次の手順に安全上重要な操作（エンジン始動・稼働確認等）が含まれますが、標準フロー「${flow.title}」の適用機種条件が未確認のため操作案内を停止しました。`,
            };
        }

        return {
            action: 'ask_decision',
            decisionStep: nextDecision,
            precedingAction,
            decisionIdx: currentDecisionIndex,
        };
    }

    // 4. 全質問ステップ完了後
    return {
        action: 'completed_questions',
    };
}

/**
 * 標準フローまたはナレッジに基づくルールベース1問1答生成（OpenAI未設定時・フォールバック時・標準フロー厳格照合用）
 */
function buildRuleBasedStructuredQA(userMessage, conversationHistory = [], evidence = null, machineInfo = {}) {
    const activeHistory = (Array.isArray(conversationHistory) ? conversationHistory : []).filter(
        m => !m.invalidated
    );
    const ev = evidence || matchStandardFlowsAndEvidence(userMessage, activeHistory, machineInfo);
    const bestFlow = ev.bestFlow;
    const otherMachineFlow = ev.referenceOtherMachineFlows && ev.referenceOtherMachineFlows[0];
    const topChunk = ev.matchedChunks && ev.matchedChunks[0];

    const userTurns = activeHistory.filter(m => !m.isAiResponse && m.content);
    const turnCount = userTurns.length;
    const latestInput = (userMessage || '').trim();
    const allUserText = [...userTurns.map(m => m.content), latestInput].join(' ');

    // 0. ユーザーが「解決した（完了）」を選択した場合
    if (
        latestInput.includes('解決した') ||
        latestInput.includes('対応完了') ||
        latestInput.includes('復旧した')
    ) {
        const summaryText =
            '処置により正常復旧を確認しました。周囲の安全と工具の置き忘れがないか最終確認を行い、必要に応じて「サーバーへ送信」から対応履歴を保存してください。';
        return {
            response: summaryText,
            qaData: {
                status: 'solution',
                safetyWarning: '運転再開前に周囲の安全確認・輪止め撤去確認・列車見張員への合図を徹底してください。',
                reasoning: '現場での応急処置および正常動作が確認されたため。',
                steps: [
                    '使用した工具・点検箇所の復旧漏れがないか確認してください。',
                    '周囲の作業員へ合図し、安全を確認してから運転を再開してください。',
                    '画面右上の「サーバーへ送信」ボタンから今回の対応履歴を記録してください。',
                ],
                options: ['了解しました（対応完了）'],
                verifiedSource: {
                    isVerified: Boolean(bestFlow && bestFlow.isMachineVerified),
                    sourceName: bestFlow ? bestFlow.title : topChunk ? topChunk.source : '標準安全手順',
                    matchedGuideId: bestFlow ? bestFlow.id : undefined,
                    matchedGuideTitle: bestFlow ? bestFlow.title : undefined,
                },
            },
        };
    }

    // 1. ユーザーが「解決しない」または「技術支援センター・専門部署へ連絡」を選択した場合（不具合②対策：同じ処置を再表示せずエスカレーション）
    if (
        latestInput.includes('解決しない') ||
        latestInput.includes('改善しない') ||
        latestInput.includes('直らない') ||
        latestInput.includes('技術支援センター') ||
        latestInput.includes('専門部署') ||
        latestInput.includes('指令へ連絡') ||
        latestInput.includes('責任者へ連絡')
    ) {
        // 直前に提示された未解決処置を抽出して診断状態に保持
        const previousAiSolutions = activeHistory
            .filter(m => m.isAiResponse && m.content)
            .map(m => m.content)
            .slice(-2);
        const unresolvedNote =
            latestInput.includes('解決しない') || latestInput.includes('改善しない') || latestInput.includes('直らない')
                ? `【未解決の処置履歴】直前の処置を実施しましたが改善が見られませんでした。\n${previousAiSolutions.length > 0 ? `実施済み案内: ${previousAiSolutions[previousAiSolutions.length - 1].substring(0, 150)}` : ''}`
                : '';

        const emergencyText =
            '実施した確認・処置で解決しないため、同じ処置の繰り返しや無理な再始動は行わず、安全を確保した上で責任者・技術支援センターへ連絡してください。';
        return {
            response: emergencyText,
            qaData: {
                status: 'emergency',
                safetyWarning: '未解決の状態でエンジン再始動や走行・分解作業を続けることは危険です。直ちに作業を中断し、駐車ブレーキと輪止めを確実にかけてください。',
                reasoning: '実施済みの手順で改善しないため、これ以上の現場単独対応を停止し専門部署へ引き継ぎます。',
                steps: [
                    '車両のエンジン停止・駐車ブレーキ作動・輪止め設置を確認してください。',
                    '列車見張員および周囲作業員へ作業中断と待機を伝達してください。',
                    '責任者または技術支援センターへ「機種・機械番号・発生症状・実施したが解決しなかった処置内容」を報告してください。',
                ],
                detailDescription: [
                    unresolvedNote,
                    bestFlow ? `参照フロー: ${bestFlow.title}（${bestFlow.flowMachineLabel || '適用機種未設定'}）` : '',
                ]
                    .filter(Boolean)
                    .join('\n\n') || undefined,
                options: [
                    '技術支援センター・指令へ連絡しました',
                    '別の症状について診断を開始する',
                ],
                verifiedSource: {
                    isVerified: false,
                    sourceName: bestFlow ? `参考フロー: ${bestFlow.title}` : topChunk ? topChunk.source : undefined,
                    matchedGuideId: bestFlow ? bestFlow.id : undefined,
                    matchedGuideTitle: bestFlow ? bestFlow.title : undefined,
                },
            },
        };
    }

    // 2. 最優先安全制御（不具合④）：異常・危険状態（冷却水漏れ、油漏れ、亀裂、異臭、煙、異常発熱等）が回答で確定した場合
    const hazardState = detectHazardOrAbnormalState(latestInput, activeHistory);
    if (hazardState.hasHazard && hazardState.isFromLatestAnswer && !isFluidLeakageSymptom(userTurns[0]?.content || latestInput)) {
        const hazardMsg = `${hazardState.hazardLabel}が確認されました。エンジンの再始動や走行・機器操作は重大な事故や機関破損につながるため絶対に行わず、安全を確保して責任者・技術支援センターへ連絡してください。`;
        return {
            response: hazardMsg,
            qaData: {
                status: 'emergency',
                safetyWarning: `【重要】${hazardState.hazardLabel}が確認されています。エンジン再始動・走行・作業装置の操作は絶対に行わないでください。また、高温部や漏れた液体には触れず、臭いを嗅いだり近づいたりしないでください。`,
                reasoning: `${hazardState.hazardLabel}（回答：「${latestInput}」）が確認されたため、安全条件を再評価し通常手順への進行を停止しました。`,
                steps: [
                    'エンジン停止状態を維持し、前後進レバー中立・駐車ブレーキ作動・輪止め設置を確実に確認してください。',
                    '高温部・回転部や漏出物には絶対に触れず、周囲の火気厳禁と作業員の安全距離を確保してください。',
                    '確認した異常内容（冷却液漏れ・亀裂・異臭・発熱等）を責任者および技術支援センターへ報告し、指示を仰いでください。',
                ],
                detailDescription: bestFlow
                    ? `【安全停止理由】標準フロー「${bestFlow.title}」の確認中に「${latestInput}」が確認されたため、後続のエンジン再始動・稼働確認ステップへの遷移をブロックしました。`
                    : undefined,
                options: [
                    '技術支援センター・指令へ連絡しました',
                    '応急復旧マニュアル一覧を確認する',
                ],
                verifiedSource: {
                    isVerified: false,
                    sourceName: bestFlow ? `安全停止制御（参照: ${bestFlow.title}）` : '異常検知時の安全停止基準',
                    matchedGuideId: bestFlow ? bestFlow.id : undefined,
                    matchedGuideTitle: bestFlow ? bestFlow.title : undefined,
                },
            },
        };
    }

    // 3. 最優先安全制御（不具合④）：液体漏出（「エンジン下に油か水のようなものが落ちている」等）の症状理解と段階的安全確認
    if (isFluidLeakageSymptom(allUserText)) {
        // 第1問：安全な位置からの漏出継続性・広がりの目視確認
        if (turnCount <= 1) {
            const q1 = '安全な位置からの目視確認として、車両下の液体は現在も垂れ続けていますか？それとも地面に染み・溜まりがある状態ですか？';
            return {
                response: q1,
                qaData: {
                    status: 'question',
                    safetyWarning: 'エンジンは絶対に始動・再始動しないでください。駐車ブレーキと輪止めを確実に設置し、高温部・回転部に近づかず、漏れた液体には直接手を触れたり臭いを嗅いだりしないでください。',
                    question: q1,
                    options: [
                        '現在もポタポタ・連続して垂れ続けている',
                        '地面に染みや垂れた跡がある（現在は止まっている）',
                        '広範囲に広がっている・量が多い',
                        '分からない（判断できない）',
                    ],
                    reasoning: '液体漏出時はエンジン始動不良の点検ではなく漏出状況の安全確認を最優先とし、安全な距離から漏出の継続性と規模を把握するため。',
                    steps: [
                        'エンジンを停止したまま、車体下や高温部・回転部に身体を入れず、安全な位置から地面の漏出状態のみを目視確認してください。',
                    ],
                    detailDescription: '※注意：液体の色や外観だけで油・冷却水・燃料・結露水を確定することはできません。火傷や有害物質吸引を防ぐため、液体に手で触れる・臭いを嗅ぐ等の確認は絶対に行わないでください。',
                    verifiedSource: {
                        isVerified: false,
                        sourceName: topChunk ? `参考資料: ${topChunk.source}` : '液体漏出時の安全確認基準',
                    },
                },
            };
        }

        // 第2問：運転席の警告表示・メーター異常および外観上の安全確認（触れる・嗅ぐ・近づくを禁止）
        if (turnCount === 2) {
            const q2 = 'エンジンを停止したまま運転席から確認できる範囲で、警告灯の点灯やメーター（油量・水温・燃料・エア圧等）の異常表示はありますか？';
            return {
                response: q2,
                qaData: {
                    status: 'question',
                    safetyWarning: resolveContextualSafetyWarning({
                        status: 'question',
                        latestInput,
                        hazardState,
                    }),
                    question: q2,
                    options: [
                        '油圧・水温・燃料・エンジン等の警告灯やメーター異常がある',
                        '警告灯やメーターの異常表示はない',
                        '電源ONも危険なため計器は確認できない',
                        '分からない（判断できない）',
                    ],
                    reasoning: '外観や色だけでは漏出液の種類（エンジンオイル・作動油・冷却水・燃料）を確定できないため、安全に確認できる計器情報を整理します。',
                    steps: [
                        'セルモーター（エンジン始動）は絶対に回さず、運転席の計器盤・警告表示のみを目視確認してください。',
                    ],
                    detailDescription: '※液体の色・粘度等の見た目だけで液種を断定して運転や継ぎ足しを行うことは重大事故につながります。',
                    verifiedSource: {
                        isVerified: false,
                        sourceName: topChunk ? `参考資料: ${topChunk.source}` : '液体漏出時の安全確認基準',
                    },
                },
            };
        }

        // 第3ターン以降：色や外観だけで液種を確定せず、エンジン始動・操作を禁止して責任者・専門部署へ引き継ぐ
        const leakEmergencyMsg =
            'エンジン下の液体漏出について安全確認事項を整理しました。色や外観だけで油・冷却水・燃料を確定することはできず、エンジン始動や走行は火災・機関破損の危険があるため、安全を確保して責任者・技術支援センターへ連絡してください。';
        return {
            response: leakEmergencyMsg,
            qaData: {
                status: 'emergency',
                safetyWarning: 'エンジン再始動・走行・作業装置の操作は絶対に行わないでください。また、漏れた液体に触れる・臭いを嗅ぐ・高温部や回転部に近づく行為は厳禁です。',
                reasoning: '液体漏出時は外観のみで油・冷却水・燃料を確定できず、承認済み手順の安全条件を満たさないため、操作を案内せず責任者・専門部署への確認へ移行します。',
                steps: [
                    'エンジン停止・駐車ブレーキ作動・輪止め設置を維持し、車両周囲の火気厳禁を確保してください。',
                    '漏れた液体には触れず、高温部や回転部から離れた安全な場所で待機してください。',
                    '確認した「漏出の位置・継続状況・警告灯/計器の状態」を責任者および技術支援センターへ報告し、指示を仰いでください。',
                ],
                detailDescription: `【確認済み内容】\n${userTurns.map((u, i) => `${i + 1}. ${u.content}`).join('\n')}\n${latestInput ? `${userTurns.length + 1}. ${latestInput}` : ''}`,
                options: [
                    '技術支援センター・指令へ連絡しました',
                    '別の症状について診断を開始する',
                ],
                verifiedSource: {
                    isVerified: false,
                    sourceName: topChunk ? `参考資料: ${topChunk.source}` : '液体漏出時の安全確保基準',
                },
            },
        };
    }

    // 4. 他機種の標準フローのみがヒットした場合（不具合④対策：確定手順として表示せず参考情報として区別）
    if (!bestFlow && otherMachineFlow) {
        if (turnCount <= 1) {
            const qOther = `選択中の機種（${machineInfo?.machineTypeName || '現在の機種'}）に対応する専用標準フローが見つかりませんでした。現在の車両状態として、以下のどれに当てはまりますか？`;
            return {
                response: qOther,
                qaData: {
                    status: 'question',
                    safetyWarning: resolveContextualSafetyWarning({
                        status: 'question',
                        latestInput,
                        hazardState,
                    }),
                    question: qOther,
                    options: [
                        '警告灯・エラー表示が点灯している',
                        '異音・振動・異臭などの異常がある',
                        'スイッチやレバーを操作しても全く反応しない',
                        '分からない（判断できない）',
                    ],
                    reasoning: `他機種向けフロー「${otherMachineFlow.title}（${otherMachineFlow.flowMachineLabel}）」は存在しますが、機種が異なるため確定手順としては適用せず、安全な状態確認を行います。`,
                    detailDescription: `【参考情報（他機種フロー）】\nフロー名: ${otherMachineFlow.title}\n対象: ${otherMachineFlow.flowMachineLabel}\n※機種が異なるため、このフローの手順を確定応急処置として実施しないでください。`,
                    verifiedSource: {
                        isVerified: false,
                        sourceName: `参考情報（他機種フロー: ${otherMachineFlow.title}）`,
                    },
                },
            };
        }

        const mismatchMsg = `選択中の機種（${machineInfo?.machineTypeName || '現在の機種'}）に一致する承認済み標準フローが登録されていません（他機種「${otherMachineFlow.flowMachineLabel}」用フローのみ存在）。機種不一致の手順実施は危険ですので、安全を確保のうえ責任者・技術支援センターへ連絡してください。`;
        return {
            response: mismatchMsg,
            qaData: {
                status: 'emergency',
                safetyWarning: '他機種向けの応急処置手順をそのまま適用してエンジン再始動や機器操作を行わないでください。',
                reasoning: otherMachineFlow.machineMatchReason,
                steps: [
                    'エンジン停止・駐車ブレーキ作動・輪止め設置を確実に確認してください。',
                    '責任者または技術支援センターへ「選択機種・機械番号・発生症状」を報告し、当該機種の正規手順について指示を仰いでください。',
                ],
                detailDescription: `【参考情報（他機種フローのため確定手順対象外）】\nID: ${otherMachineFlow.id}\nタイトル: ${otherMachineFlow.title}\n判定: ${otherMachineFlow.machineMatchReason}`,
                options: [
                    '技術支援センター・指令へ連絡しました',
                    '別の症状について診断を開始する',
                ],
                verifiedSource: {
                    isVerified: false,
                    sourceName: `参考情報（他機種フロー: ${otherMachineFlow.title}）`,
                },
            },
        };
    }

    // 5. 標準フロー（bestFlow）が候補にある場合：安全分岐制御と機種一致判定を適用
    if (bestFlow && Array.isArray(bestFlow.steps) && bestFlow.steps.length > 0) {
        const flowResolution = resolveNextFlowStepSafely(bestFlow, latestInput, activeHistory);

        // 異常検知または危険操作ブロックにより緊急停止へ移行する場合
        if (flowResolution.action === 'abort_to_emergency') {
            const abortMsg = `${flowResolution.abortedReason} 安全を確保し、責任者または技術支援センターへ連絡してください。`;
            return {
                response: abortMsg,
                qaData: {
                    status: 'emergency',
                    safetyWarning: '異常が確認された状態、または適用機種条件が未確認の状態でのエンジン再始動・走行・機器操作は絶対に行わないでください。',
                    reasoning: flowResolution.abortedReason,
                    steps: [
                        '車両を安全な場所に停止させ、エンジン停止・駐車ブレーキ作動・輪止め設置を維持してください。',
                        '高温部・回転部や漏出物には触れず、現状のまま待機してください。',
                        'これまでの確認結果を責任者および技術支援センターへ報告し、指示を仰いでください。',
                    ],
                    detailDescription: `【参照フロー情報】\nID: ${bestFlow.id}\nタイトル: ${bestFlow.title}\n機種照合: ${bestFlow.machineMatchReason}`,
                    options: [
                        '技術支援センター・指令へ連絡しました',
                        '応急復旧マニュアル一覧を確認する',
                    ],
                    verifiedSource: {
                        isVerified: false,
                        sourceName: bestFlow.isMachineVerified
                            ? `標準フロー（安全停止）: ${bestFlow.title}`
                            : `参考フロー（${bestFlow.flowMachineLabel || '適用機種未設定'}）: ${bestFlow.title}`,
                        matchedGuideId: bestFlow.id,
                        matchedGuideTitle: bestFlow.title,
                    },
                },
            };
        }

        // 安全な確認質問ステップを1問提示する場合
        if (flowResolution.action === 'ask_decision' && flowResolution.decisionStep) {
            const currentDecision = flowResolution.decisionStep;
            const precedingAction = flowResolution.precedingAction;
            const cleanQuestion = sanitizeUnsafeInspectionText(
                (currentDecision.title || currentDecision.message || '')
                    .replace(/^（decision）[:：]\s*/i, '')
                    .replace(/^\(decision\)[:：]\s*/i, '')
            );
            const optionTexts = currentDecision.options
                .map(o => (typeof o === 'string' ? o : o.text || o.condition))
                .filter(Boolean);

            const safeActionStep = precedingAction?.title
                ? sanitizeUnsafeInspectionText(precedingAction.title)
                : undefined;

            return {
                response: cleanQuestion,
                qaData: {
                    status: 'question',
                    safetyWarning: resolveContextualSafetyWarning({
                        status: 'question',
                        latestInput,
                        hazardState,
                        dangerousStepText: `${precedingAction?.title || ''} ${precedingAction?.description || ''} ${currentDecision.title || ''}`,
                    }),
                    question: cleanQuestion,
                    options: optionTexts,
                    reasoning: bestFlow.isMachineVerified
                        ? precedingAction?.description ||
                          currentDecision.description ||
                          `承認済み標準フロー「${bestFlow.title}」に基づき状態を切り分けます。`
                        : `参考フロー「${bestFlow.title}」（※${bestFlow.flowMachineLabel || '適用機種未設定'}）の安全な確認項目に基づき状態を確認します。`,
                    steps: safeActionStep ? [safeActionStep] : undefined,
                    detailDescription: bestFlow.description
                        ? `【参照フロー】${bestFlow.title}\n${bestFlow.description}\n【機種照合】${bestFlow.machineMatchReason}`
                        : undefined,
                    verifiedSource: {
                        // タイトルや本文のキーワード一致だけでは true にせず、構造化機種一致が確認された場合のみ true
                        isVerified: Boolean(bestFlow.isMachineVerified),
                        sourceName: bestFlow.isMachineVerified
                            ? `承認済み標準フロー: ${bestFlow.title}`
                            : `参考情報（${bestFlow.flowMachineLabel || '適用機種不明'}）: ${bestFlow.title}`,
                        matchedGuideId: bestFlow.id,
                        matchedGuideTitle: bestFlow.title,
                    },
                },
            };
        }

        // 質問ステップ完了後：
        // ルール：「機種の一致を確認できない場合、確定した応急処置として表示しない」「適用機種が不明なフローを確定手順として表示しない」
        if (!bestFlow.isMachineVerified) {
            const unverifiedFlowMsg = `一通りの状態確認が完了しましたが、参照したフロー「${bestFlow.title}」は選択中の機種（${machineInfo?.machineTypeName || '未確認'}）に対する適用機種設定が確認できないため、確定した応急処置手順としては表示しません。安全を確保のうえ責任者・技術支援センターへ確認結果を報告してください。`;
            return {
                response: unverifiedFlowMsg,
                qaData: {
                    status: 'emergency',
                    safetyWarning: '適用機種が未確認の手順によるエンジン再始動・走行・機器操作は行わず、駐車ブレーキと輪止めを維持してください。',
                    reasoning: bestFlow.machineMatchReason,
                    steps: [
                        'エンジン停止および駐車ブレーキ・輪止めの設置状態を再確認してください。',
                        'これまでの確認結果を責任者または技術支援センターへ報告し、当該機種に適用可能な処置の指示を仰いでください。',
                    ],
                    detailDescription: `【参考情報（適用機種未確認のため確定手順対象外）】\nフローID: ${bestFlow.id}\nタイトル: ${bestFlow.title}\n理由: ${bestFlow.machineMatchReason}`,
                    options: [
                        '技術支援センター・指令へ連絡しました',
                        '応急復旧マニュアル一覧を確認する',
                    ],
                    verifiedSource: {
                        isVerified: false,
                        sourceName: `参考情報（${bestFlow.flowMachineLabel || '適用機種不明'}）: ${bestFlow.title}`,
                        matchedGuideId: bestFlow.id,
                        matchedGuideTitle: bestFlow.title,
                    },
                },
            };
        }

        // 機種一致が確認され、かつ危険操作を含まない安全な手順のみ確定手順（solution）として表示
        const safeFlowProcedureSteps = bestFlow.steps
            .filter(s => s.type === 'step')
            .map(s => sanitizeUnsafeInspectionText((s.title || '').replace(/^（decision）[:：]\s*/i, '')))
            .filter(s => s && !containsDangerousOperation(s))
            .slice(0, 5);

        const solutionText = `承認済み標準フロー「${bestFlow.title}」（対象機種照合済）に基づく応急処置手順をご案内します。`;
        return {
            response: solutionText,
            qaData: {
                status: 'solution',
                safetyWarning: resolveContextualSafetyWarning({
                    status: 'solution',
                    latestInput,
                    hazardState,
                    dangerousStepText: safeFlowProcedureSteps.join(' '),
                }),
                reasoning: `選択機種（${machineInfo?.machineTypeName || ''}）と承認済み標準フロー「${bestFlow.title}」の適用条件および安全確認が一致しました。`,
                steps:
                    safeFlowProcedureSteps.length > 0
                        ? safeFlowProcedureSteps
                        : ['確認結果と車両状態を責任者・専門技術者に報告し、指示を仰いでください。'],
                detailDescription: bestFlow.description || '',
                options: [
                    '処置を実施し解決した（完了）',
                    '処置を実施したが解決しない（診断を続ける）',
                    '現場対応が困難なため技術支援センターへ連絡する',
                ],
                verifiedSource: {
                    isVerified: true,
                    sourceName: `承認済み標準フロー: ${bestFlow.title}`,
                    matchedGuideId: bestFlow.id,
                    matchedGuideTitle: bestFlow.title,
                },
            },
        };
    }

    // 6. 標準フロー外でナレッジベース（保守用車ナレッジ・Q&A・過去履歴）に関連情報がある場合：段階的に安全な質問を実施（確定手順 solution としては出さない）
    if (allUserText.includes('エアー') || allUserText.includes('空気') || allUserText.includes('圧力')) {
        if (turnCount <= 1) {
            const q = 'エアー圧力計の指示値と、安全な位置から聞こえるエア漏れ音の有無はどうなっていますか？';
            return {
                response: q,
                qaData: {
                    status: 'question',
                    safetyWarning: resolveContextualSafetyWarning({
                        status: 'question',
                        latestInput,
                        hazardState,
                    }),
                    question: q,
                    options: [
                        'エアー圧が全く上がらない（エア漏れ音がする）',
                        'エアー圧が全く上がらない（エア漏れ音はしない）',
                        '少しずつ上がるが規定圧に達しない',
                        '分からない（判断できない）',
                    ],
                    reasoning: '空圧回路のドレンコック開放等による漏れか、コンプレッサー系の異常かを切り分けるため。',
                    verifiedSource: {
                        isVerified: false,
                        sourceName: topChunk ? `参考資料: ${topChunk.source}` : '参考情報: 保守用車ナレッジ（空圧回路）',
                    },
                },
            };
        }
    }

    if (allUserText.includes('ブレーキ') || allUserText.includes('バネブレーキ')) {
        if (turnCount <= 1) {
            const q = '駐車バネブレーキ（または制動装置）が解放しない際、運転席のエアー圧力計は規定値（正常範囲）まで上がっていますか？';
            return {
                response: q,
                qaData: {
                    status: 'question',
                    safetyWarning: resolveContextualSafetyWarning({
                        status: 'question',
                        latestInput,
                        hazardState,
                    }),
                    question: q,
                    options: [
                        'エアー圧力は正常（規定値あり）だが解放しない',
                        'エアー圧力が低く解放しない',
                        'ブレーキ警告灯が消えない',
                        '分からない（判断できない）',
                    ],
                    reasoning: 'エアー圧不足によるバネブレーキ作動と、電磁弁・機械系統の異常を切り分けるため。',
                    verifiedSource: {
                        isVerified: false,
                        sourceName: topChunk ? `参考資料: ${topChunk.source}` : '参考情報: 対応履歴ナレッジ（駐車バネブレーキ）',
                    },
                },
            };
        }
    }

    if (allUserText.includes('エンジン') || allUserText.includes('始動') || allUserText.includes('回転')) {
        if (turnCount <= 1) {
            const q = 'エンジンの具体的な状態として、以下のどれに最も近いですか？';
            return {
                response: q,
                qaData: {
                    status: 'question',
                    safetyWarning: resolveContextualSafetyWarning({
                        status: 'question',
                        latestInput,
                        hazardState,
                    }),
                    question: q,
                    options: [
                        '運転中にディーゼルエンジンが急に停止した',
                        'セルモーターは回るがエンジンがかからない',
                        'セルモーター自体が回らない（電源・バッテリー異常）',
                        'エンジンはかかるが回転数が上がらない',
                    ],
                    reasoning: '燃料系・電源系・制御系のどこに異常があるかを切り分けるため。',
                    verifiedSource: {
                        isVerified: false,
                        sourceName: topChunk ? `参考資料: ${topChunk.source}` : '参考情報: 保守用車ナレッジ（エンジン系統）',
                    },
                },
            };
        }
    }

    // 初期または一般的な切り分け質問
    if (turnCount <= 1) {
        const q = '現在発生している故障・異常の部位や状態を以下から選択してください。';
        return {
            response: q,
            qaData: {
                status: 'question',
                safetyWarning: resolveContextualSafetyWarning({
                    status: 'question',
                    latestInput,
                    hazardState,
                }),
                question: q,
                options: [
                    'ディーゼルエンジンが急に停止した・かからない',
                    '前進スイッチを入れたがトルコン（走行）が反応しない',
                    '走行中にラジエーター付近から異音がする',
                    'エアーが溜まらない・駐車バネブレーキが解放しない',
                ],
                reasoning: '該当する診断項目を特定するため。',
                verifiedSource: {
                    isVerified: false,
                    sourceName: topChunk ? `参考資料: ${topChunk.source}` : undefined,
                },
            },
        };
    }

    // 2ターン目以降で該当する標準フローがない場合：推測で確定手順を出さず、安全な外観・警告灯確認を1問行う
    if (turnCount === 2) {
        const q = '運転席の警告灯・エラー表示の点灯や、安全な位置から見て異音・発煙・液漏れなどの異常はありますか？';
        return {
            response: q,
            qaData: {
                status: 'question',
                safetyWarning: resolveContextualSafetyWarning({
                    status: 'question',
                    latestInput,
                    hazardState,
                }),
                question: q,
                options: [
                    '警告灯・エラー表示が点灯している',
                    '異音または振動がある',
                    '油漏れ・水漏れ・異臭がある',
                    '外観や計器上の異常は特に見当たらない',
                ],
                reasoning: '現場で安全に確認できる範囲の異常有無を整理し、責任者・専門部署への報告内容を明確にするため。',
                verifiedSource: {
                    isVerified: false,
                    sourceName: topChunk ? `参考資料: ${topChunk.source}` : undefined,
                },
            },
        };
    }

    // それ以降で機種照合済みの承認済み標準フローに該当しない場合は、推測手順を確定表示せず安全にエスカレーションを案内
    const unverifiedMsg =
        'ご回答いただいた症状および選択機種に完全一致する承認済み標準フローが登録されていません。推測による処置や無理な再始動は行わず、安全を確保のうえ責任者・技術支援センターへ連絡してください。';
    return {
        response: unverifiedMsg,
        qaData: {
            status: 'emergency',
            safetyWarning: '承認済み手順書にない操作やエンジン再始動・分解調整は危険ですので行わないでください。車両の停止と輪止めを再確認してください。',
            reasoning: '選択機種および安全条件を満たす承認済み標準フローが存在しないため、安全を最優先し責任者・専門部署へ引き継ぎます。',
            steps: [
                'エンジンを停止し、駐車ブレーキおよび輪止めを確実に設置してください。',
                '確認した症状と機械番号を整理し、責任者または技術支援センターへ連絡してください。',
            ],
            detailDescription: topChunk ? `【参考資料抜粋（確定手順ではありません）】\n${topChunk.source}:\n${topChunk.text}` : undefined,
            options: [
                '技術支援センター・指令へ連絡しました',
                '応急復旧マニュアル一覧を確認する',
            ],
            verifiedSource: {
                isVerified: false,
                sourceName: topChunk ? `参考資料: ${topChunk.source}` : undefined,
            },
        },
    };
}

/**
 * 1問1答の動的選択ボタン表示および安全性照合に対応した構造化レスポンス生成関数
 */
async function generateStructuredQAResponse(options = {}) {
    const {
        prompt = '',
        rawUserMessage = '',
        conversationHistory = [],
        machineInfo = {},
        useKnowledgeBase = true,
    } = options;

    const activeHistory = (Array.isArray(conversationHistory) ? conversationHistory : []).filter(
        m => !m.invalidated
    );
    const effectiveUserText = rawUserMessage || prompt;
    const evidence = matchStandardFlowsAndEvidence(effectiveUserText, activeHistory, machineInfo);
    const bestFlow = evidence.bestFlow;
    const matchedChunks = evidence.matchedChunks || [];

    // 安全上重要なケース（液体漏出、異常検知、「解決しない」、他機種不一致、標準フロー分岐制御）は
    // LLMの自由生成による危険誘導を防ぐため、まず安全制御エンジンで評価する
    const userTurns = activeHistory.filter(m => !m.isAiResponse && m.content);
    const allUserText = [...userTurns.map(m => m.content), effectiveUserText].join(' ');
    const hazardState = detectHazardOrAbnormalState(effectiveUserText, activeHistory);

    if (
        !openai ||
        isFluidLeakageSymptom(allUserText) ||
        (hazardState.hasHazard && hazardState.isFromLatestAnswer) ||
        effectiveUserText.includes('解決しない') ||
        effectiveUserText.includes('改善しない') ||
        effectiveUserText.includes('直らない') ||
        effectiveUserText.includes('技術支援センター') ||
        effectiveUserText.includes('解決した') ||
        bestFlow ||
        (evidence.referenceOtherMachineFlows && evidence.referenceOtherMachineFlows.length > 0)
    ) {
        return buildRuleBasedStructuredQA(effectiveUserText, activeHistory, evidence, machineInfo);
    }

    try {
        let baseSystemPrompt = '';
        if (useKnowledgeBase) {
            try {
                const { generateSystemPromptWithKnowledge } = await import('./knowledge-base.cjs');
                baseSystemPrompt = await generateSystemPromptWithKnowledge(effectiveUserText, {
                    similarityThreshold: 0.3,
                    maxResults: 5,
                });
            } catch (kbErr) {
                console.warn('[generateStructuredQAResponse] knowledge-base load warning:', kbErr.message);
            }
        }

        let chunksContextText = '';
        if (matchedChunks.length > 0) {
            chunksContextText = `\n\n【参考資料（※確定手順ではなく参考情報）】\n${matchedChunks
                .map((c, idx) => `${idx + 1}. 出典: ${c.source}\n内容: ${c.text}`)
                .join('\n\n')}`;
        }

        const machineContextText =
            machineInfo && (machineInfo.machineTypeName || machineInfo.machineNumber)
                ? `\n【対象車両】機種: ${machineInfo.machineTypeName || '未指定'}, 機械番号: ${machineInfo.machineNumber || '未指定'}`
                : '\n【対象車両】機種: 未指定';

        const structuredInstruction = `
あなたは鉄道保守用車の故障対応支援AIです。
必ず以下のJSON形式のみで応答してください（マークダウンのコードブロックは不要）。

{
  "status": "question" | "emergency",
  "safetyWarning": "安全確認が必要な場合の最優先注意文",
  "question": "ユーザーへの確認質問（statusがquestionの場合、必ず1回につき1問のみ）",
  "options": ["状況に応じた具体的な選択肢1", "選択肢2", "選択肢3", "分からない（判断できない）"],
  "reasoning": "この質問や確認を行う短い理由（1文以内）",
  "steps": ["安全な確認手順1"],
  "detailDescription": "必要時に展開表示する補足説明（任意）",
  "usedEvidenceSource": "参照した資料名（ない場合は空文字）"
}

【絶対厳守ルール】
1. 推測による確定手順（solution）の禁止: 適用機種が一致する承認済み標準フローが存在しない場合、"status" を "solution" にすることは絶対禁止。"question" または "emergency" のみを使用すること。
2. 危険な確認・操作の禁止: エンジン再始動、走行、作業装置の操作、漏れた液体に触れる、臭いを嗅ぐ、高温部や回転部に近づく確認方法を案内してはならない。また色や外観だけで油・冷却水・燃料を断定してはならない。`;

        const completion = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: `${baseSystemPrompt}\n${chunksContextText}\n${machineContextText}\n${structuredInstruction}`,
                },
                {
                    role: 'user',
                    content: prompt || effectiveUserText,
                },
            ],
            temperature: 0.2,
            max_tokens: 1000,
            response_format: { type: 'json_object' },
        });

        const rawContent = completion.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(rawContent);

        // 機種一致済みの標準フローがない限り、絶対に solution や isVerified: true にはしない
        let status = parsed.status === 'question' && userTurns.length < 2 ? 'question' : 'emergency';
        const safeQuestion = sanitizeUnsafeInspectionText(parsed.question || '現在の具体的な状況を教えてください。');
        const safeSteps = Array.isArray(parsed.steps)
            ? parsed.steps
                  .map(s => sanitizeUnsafeInspectionText(s))
                  .filter(s => s && !containsDangerousOperation(s))
            : undefined;

        const contextualWarning =
            status === 'emergency'
                ? parsed.safetyWarning ||
                  '安全確保のためエンジン再始動・走行・作業装置の操作は行わず、責任者・技術支援センターへ連絡してください。'
                : resolveContextualSafetyWarning({
                      status,
                      latestInput: effectiveUserText,
                      hazardState,
                      dangerousStepText: `${safeQuestion || ''} ${Array.isArray(safeSteps) ? safeSteps.join(' ') : ''}`,
                  }) ||
                  (!isGenericSafetyWarning(parsed.safetyWarning) ? parsed.safetyWarning : undefined);

        const qaData = {
            status,
            safetyWarning: contextualWarning,
            question: status === 'question' ? safeQuestion : undefined,
            options:
                status === 'question'
                    ? Array.isArray(parsed.options) && parsed.options.length > 0
                        ? parsed.options
                        : ['はい（異常なし）', 'いいえ（異常あり）', '分からない（判断できない）']
                    : [
                          '技術支援センター・指令へ連絡しました',
                          '応急復旧マニュアル一覧を確認する',
                      ],
            reasoning: parsed.reasoning || undefined,
            steps: safeSteps,
            detailDescription: parsed.detailDescription || undefined,
            verifiedSource: {
                isVerified: false,
                sourceName: matchedChunks[0] ? `参考資料: ${matchedChunks[0].source}` : undefined,
            },
        };

        const responseText =
            status === 'question'
                ? qaData.question
                : '承認済み標準フローで適用条件が確認できないため、安全を確保のうえ責任者・技術支援センターへ連絡してください。';

        return {
            response: responseText,
            qaData,
        };
    } catch (error) {
        console.error('[generateStructuredQAResponse] Error, falling back to rule-based QA:', error.message);
        return buildRuleBasedStructuredQA(effectiveUserText, activeHistory, evidence, machineInfo);
    }
}
