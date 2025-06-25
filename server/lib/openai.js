"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processOpenAIRequest = processOpenAIRequest;
exports.summarizeText = summarizeText;
exports.generateKeywords = generateKeywords;
exports.generateStepResponse = generateStepResponse;
exports.generateSearchQuery = generateSearchQuery;
exports.analyzeVehicleImage = analyzeVehicleImage;
var openai_1 = require("openai");
var dotenv_1 = require("dotenv");
var path_1 = require("path");
var url_1 = require("url");
// __dirnameの代替
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
// .envファイルの読み込み
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
var OPENAI_MODEL = "gpt-4o";
// 複数の場所から.envファイルを読み込み
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), 'server/.env') });
// APIキーの取得（Replitシークレットも考慮）
var apiKey = process.env.OPENAI_API_KEY || process.env.REPLIT_SECRET_OPENAI_API_KEY;
// デバッグ用ログを有効化
console.log("[DEBUG] OpenAI initialization - API KEY exists:", apiKey ? "YES" : "NO");
console.log("[DEBUG] OpenAI API KEY prefix:", apiKey ? apiKey.substring(0, 10) + "..." : "NOT FOUND");
console.log("[DEBUG] Environment variables:", {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "SET" : "NOT SET",
    REPLIT_SECRET_OPENAI_API_KEY: process.env.REPLIT_SECRET_OPENAI_API_KEY ? "SET" : "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
    PWD: process.cwd()
});
if (!apiKey) {
    console.error("[ERROR] OpenAI API Key not found in environment variables");
    throw new Error("OpenAI API Key not configured");
}
var openai = new openai_1.default({
    apiKey: apiKey,
});
// APIキーが存在するか確認
// Remove detailed API key existence logging
// console.log("[DEBUG] OpenAI API KEY exists:", process.env.OPENAI_API_KEY ? "YES" : "NO");
/**
 * OpenAI APIにリクエストを送信して応答を取得する関数
 * @param prompt プロンプト文字列
 * @param useKnowledgeBase ナレッジベースを使用するかどうか
 * @returns OpenAI APIからの応答テキスト
 */
function processOpenAIRequest(prompt_1) {
    return __awaiter(this, arguments, void 0, function (prompt, useKnowledgeBase) {
        var apiKey_1, systemPrompt, generateSystemPromptWithKnowledge, error_1, response, responseText, error_2;
        var _a;
        if (useKnowledgeBase === void 0) { useKnowledgeBase = true; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 7, , 8]);
                    apiKey_1 = process.env.OPENAI_API_KEY || process.env.REPLIT_SECRET_OPENAI_API_KEY;
                    console.log('[DEBUG] processOpenAIRequest - Environment check:', {
                        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "SET" : "NOT SET",
                        REPLIT_SECRET_OPENAI_API_KEY: process.env.REPLIT_SECRET_OPENAI_API_KEY ? "SET" : "NOT SET",
                        finalApiKey: apiKey_1 ? "SET" : "NOT SET",
                        apiKeyPrefix: apiKey_1 ? apiKey_1.substring(0, 10) + "..." : "NOT FOUND"
                    });
                    if (!apiKey_1) {
                        console.error('OpenAI API key not found');
                        return [2 /*return*/, 'OpenAI APIキーが設定されていません。環境変数OPENAI_API_KEYを確認してください。'];
                    }
                    systemPrompt = "あなたは保守用車支援システムの一部として機能するAIアシスタントです。ユーザーの質問に対して、正確で実用的な回答を提供してください。";
                    if (!useKnowledgeBase) return [3 /*break*/, 5];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./knowledge-base'); })];
                case 2:
                    generateSystemPromptWithKnowledge = (_b.sent()).generateSystemPromptWithKnowledge;
                    return [4 /*yield*/, generateSystemPromptWithKnowledge(prompt)];
                case 3:
                    systemPrompt = _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _b.sent();
                    console.error('ナレッジベース初期化エラー:', error_1);
                    // エラーが発生した場合は基本的なシステムプロンプトを使用
                    systemPrompt = "あなたは保守用車支援システムの一部として機能するAIアシスタントです。ユーザーの質問に対して、正確で実用的な回答を提供してください。";
                    return [3 /*break*/, 5];
                case 5: return [4 /*yield*/, openai.chat.completions.create({
                        model: OPENAI_MODEL,
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: prompt }
                        ],
                        temperature: 0.2,
                        // JSON形式の強制は解除
                    })];
                case 6:
                    response = _b.sent();
                    responseText = response.choices[0].message.content || '';
                    // Remove OpenAI response logging
                    // console.log('OpenAI応答を受信しました:', responseText.substring(0, 100) + '...');
                    return [2 /*return*/, responseText];
                case 7:
                    error_2 = _b.sent();
                    console.error('OpenAI API Error Details:', {
                        message: error_2.message,
                        code: error_2.code,
                        type: error_2.type,
                        status: error_2.status,
                        stack: error_2.stack
                    });
                    // 特定のエラータイプに応じたメッセージを返す
                    if (error_2.code === 'insufficient_quota') {
                        return [2 /*return*/, 'OpenAI APIのクォータが不足しています。'];
                    }
                    else if (error_2.code === 'invalid_api_key') {
                        return [2 /*return*/, 'OpenAI APIキーが無効です。'];
                    }
                    else if (error_2.code === 'rate_limit_exceeded') {
                        return [2 /*return*/, 'OpenAI APIのリクエスト制限に達しました。しばらく待ってから再試行してください。'];
                    }
                    else if ((_a = error_2.message) === null || _a === void 0 ? void 0 : _a.includes('timeout')) {
                        return [2 /*return*/, 'OpenAI APIのリクエストがタイムアウトしました。'];
                    }
                    else if (error_2.status === 401) {
                        return [2 /*return*/, 'OpenAI APIキーの認証に失敗しました。'];
                    }
                    else if (error_2.status === 429) {
                        return [2 /*return*/, 'OpenAI APIのレート制限に達しました。'];
                    }
                    else if (error_2.status >= 500) {
                        return [2 /*return*/, 'OpenAI APIサーバーでエラーが発生しました。'];
                    }
                    else {
                        return [2 /*return*/, "OpenAI API\u30A8\u30E9\u30FC: ".concat(error_2.message || 'Unknown error')];
                    }
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
/**
 * テキストを要約するヘルパー関数
 * @param text 要約するテキスト
 * @returns 要約されたテキスト
 */
function summarizeText(text) {
    return __awaiter(this, void 0, void 0, function () {
        var truncatedText, response, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    truncatedText = text.length > 4000 ? text.substring(0, 4000) + "..." : text;
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: OPENAI_MODEL,
                            messages: [
                                {
                                    role: "system",
                                    content: "あなたは技術文書の要約を行う専門家です。文章の要点を保ちながら、簡潔に要約してください。"
                                },
                                {
                                    role: "user",
                                    content: "\u4EE5\u4E0B\u306E\u30C6\u30AD\u30B9\u30C8\u3092100\u8A9E\u7A0B\u5EA6\u306B\u8981\u7D04\u3057\u3066\u304F\u3060\u3055\u3044:\n\n".concat(truncatedText)
                                }
                            ],
                            temperature: 0.3,
                        })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response.choices[0].message.content || ''];
                case 2:
                    error_3 = _a.sent();
                    console.error('テキスト要約エラー:', error_3.message);
                    return [2 /*return*/, '要約の生成中にエラーが発生しました。'];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * キーワードを生成するヘルパー関数
 * @param text キーワードを生成するテキスト
 * @returns キーワードの配列
 */
function generateKeywords(text) {
    return __awaiter(this, void 0, void 0, function () {
        var truncatedText, response, content, parsed, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    truncatedText = text.length > 4000 ? text.substring(0, 4000) + "..." : text;
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: OPENAI_MODEL,
                            messages: [
                                {
                                    role: "system",
                                    content: "あなたは技術文書からキーワードを抽出する専門家です。与えられたテキストから、検索に役立つ重要なキーワードを抽出してください。"
                                },
                                {
                                    role: "user",
                                    content: "\u4EE5\u4E0B\u306E\u30C6\u30AD\u30B9\u30C8\u304B\u3089\u3001\u6700\u3082\u91CD\u8981\u306A5\u301C10\u500B\u306E\u30AD\u30FC\u30EF\u30FC\u30C9\u3092\u62BD\u51FA\u3057\u3001JSON\u914D\u5217\u5F62\u5F0F\u3067\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u5C02\u9580\u7528\u8A9E\u3084\u56FA\u6709\u540D\u8A5E\u3092\u512A\u5148\u3057\u3066\u304F\u3060\u3055\u3044:\n\n".concat(truncatedText)
                                }
                            ],
                            temperature: 0.3,
                            response_format: { type: "json_object" }, // 強制的にJSONオブジェクトとして返す
                        })];
                case 1:
                    response = _a.sent();
                    content = response.choices[0].message.content || '{"keywords": []}';
                    try {
                        parsed = JSON.parse(content);
                        if (Array.isArray(parsed.keywords)) {
                            return [2 /*return*/, parsed.keywords];
                        }
                        else if (Array.isArray(parsed)) {
                            return [2 /*return*/, parsed];
                        }
                        return [2 /*return*/, []];
                    }
                    catch (e) {
                        console.error('キーワード解析エラー:', e);
                        return [2 /*return*/, []];
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_4 = _a.sent();
                    console.error('キーワード生成エラー:', error_4.message);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 検索クエリを生成する関数
 * @param text 元のテキスト
 * @returns 最適化された検索クエリ
 */
/**
 * キーワードからステップ形式のレスポンスを生成する
 */
function generateStepResponse(keyword) {
    return __awaiter(this, void 0, void 0, function () {
        var response, content, result, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: OPENAI_MODEL,
                            messages: [
                                {
                                    role: "system",
                                    content: "あなたは保守用車の専門家です。キーワードに基づいて、具体的な手順を説明してください。"
                                },
                                {
                                    role: "user",
                                    content: "\u4EE5\u4E0B\u306E\u30AD\u30FC\u30EF\u30FC\u30C9\u306B\u95A2\u3059\u308B\u5BFE\u5FDC\u624B\u9806\u3092\u30013-5\u3064\u306E\u30B9\u30C6\u30C3\u30D7\u306B\u5206\u3051\u3066\u8AAC\u660E\u3057\u3066\u304F\u3060\u3055\u3044:\n".concat(keyword)
                                }
                            ],
                            temperature: 0.3,
                            response_format: { type: "json_object" }
                        })];
                case 1:
                    response = _a.sent();
                    content = response.choices[0].message.content || '';
                    result = JSON.parse(content);
                    return [2 /*return*/, {
                            title: result.title || keyword,
                            steps: result.steps || []
                        }];
                case 2:
                    error_5 = _a.sent();
                    console.error('ステップレスポンス生成エラー:', error_5);
                    return [2 /*return*/, {
                            title: keyword,
                            steps: [{ description: "レスポンスの生成に失敗しました。" }]
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function generateSearchQuery(text) {
    return __awaiter(this, void 0, void 0, function () {
        var truncatedText, response, query, error_6;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    truncatedText = text.length > 200 ? text.substring(0, 200) + "..." : text;
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: OPENAI_MODEL,
                            messages: [
                                {
                                    role: "system",
                                    content: "You are a search query optimization expert. Generate optimal search queries for search engines from user questions or text."
                                },
                                {
                                    role: "user",
                                    content: "Extract optimal search keywords (5-10 words) from the following text for searching related technical documents. Prioritize technical terms and exclude unnecessary conjunctions and prepositions:\n\n".concat(truncatedText)
                                }
                            ],
                            temperature: 0.3,
                            max_tokens: 100,
                        })];
                case 1:
                    response = _b.sent();
                    query = ((_a = response.choices[0].message.content) === null || _a === void 0 ? void 0 : _a.trim()) || truncatedText;
                    return [2 /*return*/, query];
                case 2:
                    error_6 = _b.sent();
                    console.error('Search query generation error:', error_6.message);
                    // エラーが発生した場合は元のテキストを返す
                    return [2 /*return*/, text];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 車両画像を分析する関数
 * @param base64Image Base64エンコードされた画像データ
 * @returns 分析結果
 */
function analyzeVehicleImage(base64Image) {
    return __awaiter(this, void 0, void 0, function () {
        var response, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: "gpt-4o", // ビジョン機能を持つモデルを使用
                            messages: [
                                {
                                    role: "system",
                                    content: "あなたは車両画像分析の専門家です。保守用車・作業用車両・特殊車両の画像を分析し、車両のタイプ、状態、特徴を詳細に説明してください。"
                                },
                                {
                                    role: "user",
                                    content: [
                                        {
                                            type: "text",
                                            text: "この車両の画像を分析して、車両の種類、状態、目立つ特徴、および考えられる用途について詳細に説明してください。保守用車の場合は、その種類（軌道モータカー、マルチプルタイタンパー、バラストレギュレーターなど）も特定してください。"
                                        },
                                        {
                                            type: "image_url",
                                            image_url: {
                                                url: "data:image/jpeg;base64,".concat(base64Image)
                                            }
                                        }
                                    ],
                                },
                            ],
                            max_tokens: 1000,
                        })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, {
                            analysis: response.choices[0].message.content || '',
                            success: true
                        }];
                case 2:
                    error_7 = _a.sent();
                    console.error('車両画像分析エラー:', error_7.message);
                    return [2 /*return*/, {
                            analysis: '画像の分析中にエラーが発生しました。',
                            success: false,
                            error: error_7.message
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
