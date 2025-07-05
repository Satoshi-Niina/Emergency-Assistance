"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
export const extractComponentKeywords: any = extractComponentKeywords;
export const extractSymptomKeywords: any = extractSymptomKeywords;
export const detectPossibleModels: any = detectPossibleModels;
export const formatChatHistoryForExternalSystem: any = formatChatHistoryForExternalSystem;
import openai_1 from "openai";
import fs_1 from "fs";
import path_1 from "path";
// OpenAIクライアントの初期化
var openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
// 車両モデルのサンプルデータ
var vehicleModels = [
    { id: 'mt-100', name: 'MT-100型保線車', keywords: ['MT-100', 'MT100', 'MT 100'] },
    { id: 'mr-400', name: 'MR-400シリーズ', keywords: ['MR-400', 'MR400', 'MR 400'] },
    { id: 'tc-250', name: 'TC-250作業車', keywords: ['TC-250', 'TC250', 'TC 250'] },
    { id: 'ss-750', name: 'SS-750重機', keywords: ['SS-750', 'SS750', 'SS 750'] },
];
// 症状のサンプルデータ
var symptoms = [
    { id: 'engine-stop', description: 'エンジン停止', keywords: ['エンジン停止', 'エンジンが止まる', 'エンジン切れ'] },
    { id: 'engine-noise', description: '異音', keywords: ['異音', '変な音', '音がする'] },
    { id: 'brake-failure', description: 'ブレーキ不良', keywords: ['ブレーキ不良', 'ブレーキが効かない', 'ブレーキ故障'] },
    { id: 'hydraulic-leak', description: '油圧漏れ', keywords: ['油圧漏れ', 'オイル漏れ', '漏油'] },
    { id: 'electrical-failure', description: '電気系統故障', keywords: ['電気系統', '電装品', '電気不良'] },
];
// コンポーネントのサンプルデータ
var components = [
    { id: 'engine', name: 'エンジン', keywords: ['エンジン', 'engine', 'モーター'] },
    { id: 'brake', name: 'ブレーキ', keywords: ['ブレーキ', 'brake', '制動装置'] },
    { id: 'hydraulic', name: '油圧系統', keywords: ['油圧', 'hydraulic', 'オイル', '油'] },
    { id: 'electrical', name: '電気系統', keywords: ['電気', 'electrical', '電装', '配線'] },
    { id: 'transmission', name: '変速機', keywords: ['変速機', 'transmission', 'ギア', 'トランスミッション'] },
];
/**
 * テキストからコンポーネント関連のキーワードを抽出する
 */
function extractComponentKeywords(text) {
    var foundComponents = [];
    for (var _i = 0, components_1 = components; _i < components_1.length; _i++) {
        var component = components_1[_i];
        for (var _a = 0, _b = component.keywords; _a < _b.length; _a++) {
            var keyword = _b[_a];
            if (text.includes(keyword) && !foundComponents.includes(component.name)) {
                foundComponents.push(component.name);
                break;
            }
        }
    }
    return foundComponents;
}
/**
 * テキストから症状関連のキーワードを抽出する
 */
function extractSymptomKeywords(text) {
    var foundSymptoms = [];
    for (var _i = 0, symptoms_1 = symptoms; _i < symptoms_1.length; _i++) {
        var symptom = symptoms_1[_i];
        for (var _a = 0, _b = symptom.keywords; _a < _b.length; _a++) {
            var keyword = _b[_a];
            if (text.includes(keyword) && !foundSymptoms.includes(symptom.description)) {
                foundSymptoms.push(symptom.description);
                break;
            }
        }
    }
    return foundSymptoms;
}
/**
 * テキストから可能性のある機種モデルを判別する
 */
function detectPossibleModels(text) {
    var foundModels = [];
    for (var _i = 0, vehicleModels_1 = vehicleModels; _i < vehicleModels_1.length; _i++) {
        var model = vehicleModels_1[_i];
        for (var _a = 0, _b = model.keywords; _a < _b.length; _a++) {
            var keyword = _b[_a];
            if (text.includes(keyword) && !foundModels.includes(model.name)) {
                foundModels.push(model.name);
                break;
            }
        }
    }
    return foundModels;
}
/**
 * チャット履歴を外部システム用にフォーマットする
 */
function formatChatHistoryForExternalSystem(chat: any, messages: any, messageMedia: any, lastExport) {
    return __awaiter(this, void 0, void 0, function () {
        var allText, extractedComponents, extractedSymptoms, possibleModels, primaryProblem, problemDescription, userMessages, prompt_1, response, content, result, error_1, environmentContext, contextPrompt, contextResponse, error_2, conversationHistory;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    allText = messages.map(function (m) { return m.content; }).join(' ');
                    extractedComponents = extractComponentKeywords(allText);
                    extractedSymptoms = extractSymptomKeywords(allText);
                    possibleModels = detectPossibleModels(allText);
                    primaryProblem = '';
                    problemDescription = '';
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    userMessages = messages.filter(function (m) { return !m.isAiResponse; }).map(function (m) { return m.content; }).join('\n');
                    prompt_1 = "\n\u4EE5\u4E0B\u306F\u9244\u9053\u4FDD\u5B88\u7528\u8ECA\u4E21\u306E\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u306B\u95A2\u3059\u308B\u4F1A\u8A71\u3067\u3059\u3002\n\u3053\u306E\u4F1A\u8A71\u304B\u3089\u3001\u4E3B\u8981\u306A\u554F\u984C\u3068\u554F\u984C\u306E\u8A73\u7D30\u306A\u8AAC\u660E\u3092\u65E5\u672C\u8A9E\u3067\u62BD\u51FA\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\u62BD\u51FA\u7D50\u679C\u306F\u4EE5\u4E0B\u306EJSON\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u3067\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A\n{\n  \"primary_problem\": \"\u7C21\u6F54\u306A\u554F\u984C\u306E\u30BF\u30A4\u30C8\u30EB\uFF0815-20\u6587\u5B57\u7A0B\u5EA6\uFF09\",\n  \"problem_description\": \"\u554F\u984C\u306E\u8A73\u7D30\u8AAC\u660E\uFF0850-100\u6587\u5B57\u7A0B\u5EA6\uFF09\"\n}\n\n\u4F1A\u8A71\uFF1A\n".concat(userMessages, "\n");
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: "gpt-4o",
                            messages: [{ role: "user", content: prompt_1 }],
                            response_format: { type: "json_object" }
                        })];
                case 2:
                    response = _b.sent();
                    content = response.choices[0].message.content || '{"primary_problem":"不明な問題","problem_description":"詳細情報なし"}';
                    result = JSON.parse(content);
                    primaryProblem = result.primary_problem;
                    problemDescription = result.problem_description;
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _b.sent();
                    console.error('OpenAI APIでの分析中にエラーが発生しました:', error_1);
                    // エラーが発生した場合は単純な抽出結果を使用
                    primaryProblem = extractedComponents.length > 0 ?
                        "".concat(extractedComponents[0], "\u306B\u95A2\u3059\u308B\u554F\u984C") : '不明な問題';
                    problemDescription = extractedSymptoms.length > 0 ?
                        "".concat(extractedSymptoms.join('と'), "\u306E\u75C7\u72B6\u304C\u5831\u544A\u3055\u308C\u3066\u3044\u307E\u3059\u3002") : '詳細な症状は報告されていません。';
                    return [3 /*break*/, 4];
                case 4:
                    environmentContext = '';
                    _b.label = 5;
                case 5:
                    _b.trys.push([5, 7, , 8]);
                    contextPrompt = "\n\u4EE5\u4E0B\u306F\u9244\u9053\u4FDD\u5B88\u7528\u8ECA\u4E21\u306E\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u306B\u95A2\u3059\u308B\u4F1A\u8A71\u3067\u3059\u3002\n\u3053\u306E\u4F1A\u8A71\u304B\u3089\u3001\u8ECA\u4E21\u306E\u73FE\u5728\u306E\u72B6\u6CC1\u3084\u74B0\u5883\u306B\u95A2\u3059\u308B\u60C5\u5831\u309250-80\u6587\u5B57\u7A0B\u5EA6\u3067\u7C21\u6F54\u306B\u307E\u3068\u3081\u3066\u304F\u3060\u3055\u3044\u3002\n\u4F8B\u3048\u3070\u300C\u8ECA\u4E21\u306F\u3007\u3007\u306E\u72B6\u614B\u3067\u25B3\u25B3\u306E\u75C7\u72B6\u304C\u767A\u751F\u3057\u3066\u3044\u308B\u300D\u3068\u3044\u3063\u305F\u5F62\u5F0F\u3067\u3059\u3002\n\n\u4F1A\u8A71\uFF1A\n".concat(messages.slice(0, 10).map(function (m) { return m.content; }).join('\n'), "\n");
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: "gpt-4o",
                            messages: [{ role: "user", content: contextPrompt }],
                        })];
                case 6:
                    contextResponse = _b.sent();
                    // null チェックを追加
                    environmentContext = ((_a = contextResponse.choices[0].message.content) === null || _a === void 0 ? void 0 : _a.trim()) || '会話内容から環境情報を抽出できませんでした。';
                    return [3 /*break*/, 8];
                case 7:
                    error_2 = _b.sent();
                    console.error('環境情報の生成中にエラーが発生しました:', error_2);
                    environmentContext = '会話から環境情報を抽出できませんでした。';
                    return [3 /*break*/, 8];
                case 8:
                    conversationHistory = messages.map(function (message) {
                        // コンテンツ内の画像パスを検出
                        var updatedContent = message.content;
                        // 画像パスを正規表現で抽出 - パターンを拡張して相対パスと絶対パスの両方に対応
                        var imagePathRegex = /(\/|\.\/)?(knowledge-base|public)\/images\/[^)\s"'\n]+\.(svg|png|jpg|jpeg)/g;
                        var imagePaths = message.content.match(imagePathRegex) || [];
                        console.log("\u30E1\u30C3\u30BB\u30FC\u30B8ID ".concat(message.id, ": ").concat(imagePaths.length, "\u500B\u306E\u753B\u50CF\u30D1\u30B9\u3092\u691C\u51FA"));
                        // Base64エンコードした画像データを保持するマップ
                        var base64Images = {};
                        // プロジェクトのルートディレクトリを基準とする絶対パスを取得する関数
                        var resolveImagePath = function (imgPath) {
                            // パスが / で始まる場合は、プロジェクトルートからの絶対パスとして扱う
                            if (imgPath.startsWith('/')) {
                                return path_1.default.join(process.cwd(), imgPath.substring(1));
                            }
                            // ./ で始まる場合も同様
                            if (imgPath.startsWith('./')) {
                                return path_1.default.join(process.cwd(), imgPath.substring(2));
                            }
                            // それ以外は、相対パスとしてそのままプロジェクトルートから解決
                            return path_1.default.join(process.cwd(), imgPath);
                        };
                        // 画像をBase64エンコード
                        for (var _i = 0, imagePaths_1 = imagePaths; _i < imagePaths_1.length; _i++) {
                            var imagePath = imagePaths_1[_i];
                            try {
                                // 画像ファイルのパスを絶対パスに解決
                                var resolvedPath = resolveImagePath(imagePath);
                                console.log("\u753B\u50CF\u30D1\u30B9\u5909\u63DB: ".concat(imagePath, " -> ").concat(resolvedPath));
                                // 画像ファイルが存在するか確認
                                if (fs_1.default.existsSync(resolvedPath)) {
                                    console.log("\u753B\u50CF\u30D5\u30A1\u30A4\u30EB\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D: ".concat(resolvedPath));
                                    // 画像をBase64にエンコード
                                    var imageBuffer = fs_1.default.readFileSync(resolvedPath);
                                    var extension = path_1.default.extname(resolvedPath).toLowerCase().slice(1);
                                    var mimeType = extension === 'svg' ? 'image/svg+xml' :
                                        extension === 'png' ? 'image/png' :
                                            extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';
                                    var base64Data = "data:".concat(mimeType, ";base64,").concat(imageBuffer.toString('base64'));
                                    console.log("\u753B\u50CF ".concat(imagePath, " \u3092Base64\u306B\u30A8\u30F3\u30B3\u30FC\u30C9\u3057\u307E\u3057\u305F (").concat(imageBuffer.length, " \u30D0\u30A4\u30C8)"));
                                    // マップに追加
                                    base64Images[imagePath] = base64Data;
                                }
                                else {
                                    // ファイルが存在しない場合の代替パスを試す（knowledgeベースとpublicディレクトリの両方を試す）
                                    var alternativePaths = [
                                        path_1.default.join(process.cwd(), 'knowledge-base', 'images', path_1.default.basename(imagePath)),
                                        path_1.default.join(process.cwd(), 'public', 'images', path_1.default.basename(imagePath))
                                    ];
                                    var found = false;
                                    for (var _a = 0, alternativePaths_1 = alternativePaths; _a < alternativePaths_1.length; _a++) {
                                        var altPath = alternativePaths_1[_a];
                                        console.log("\u4EE3\u66FF\u30D1\u30B9\u3092\u78BA\u8A8D\u4E2D: ".concat(altPath));
                                        if (fs_1.default.existsSync(altPath)) {
                                            var imageBuffer = fs_1.default.readFileSync(altPath);
                                            var extension = path_1.default.extname(altPath).toLowerCase().slice(1);
                                            var mimeType = extension === 'svg' ? 'image/svg+xml' :
                                                extension === 'png' ? 'image/png' :
                                                    extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';
                                            var base64Data = "data:".concat(mimeType, ";base64,").concat(imageBuffer.toString('base64'));
                                            console.log("\u4EE3\u66FF\u30D1\u30B9 ".concat(altPath, " \u3092\u4F7F\u7528\u3057\u3066\u753B\u50CF\u3092\u30A8\u30F3\u30B3\u30FC\u30C9\u3057\u307E\u3057\u305F (").concat(imageBuffer.length, " \u30D0\u30A4\u30C8)"));
                                            base64Images[imagePath] = base64Data;
                                            found = true;
                                            break;
                                        }
                                    }
                                    if (!found) {
                                        console.warn("\u8B66\u544A: \u753B\u50CF\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093: ".concat(imagePath));
                                    }
                                }
                            }
                            catch (error) {
                                console.error("\u753B\u50CF ".concat(imagePath, " \u306EBase64\u30A8\u30F3\u30B3\u30FC\u30C9\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:"), error);
                            }
                        }
                        // メディア情報も画像をBase64エンコード
                        var encodedMedia = (messageMedia[message.id] || []).map(function (media) {
                            // mediaが画像パスを含む場合、Base64エンコード
                            if (media.type === 'image' && media.url) {
                                try {
                                    // 画像パスの解決
                                    var resolvedPath = resolveImagePath(media.url);
                                    console.log("\u30E1\u30C7\u30A3\u30A2\u753B\u50CF\u30D1\u30B9\u5909\u63DB: ".concat(media.url, " -> ").concat(resolvedPath));
                                    // 画像ファイルの存在チェック
                                    if (fs_1.default.existsSync(resolvedPath)) {
                                        console.log("\u30E1\u30C7\u30A3\u30A2\u753B\u50CF\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D: ".concat(resolvedPath));
                                        var imageBuffer = fs_1.default.readFileSync(resolvedPath);
                                        var extension = path_1.default.extname(resolvedPath).toLowerCase().slice(1);
                                        var mimeType = extension === 'svg' ? 'image/svg+xml' :
                                            extension === 'png' ? 'image/png' :
                                                extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';
                                        console.log("\u30E1\u30C7\u30A3\u30A2\u753B\u50CF\u3092Base64\u30A8\u30F3\u30B3\u30FC\u30C9\u3057\u307E\u3057\u305F (".concat(imageBuffer.length, " \u30D0\u30A4\u30C8)"));
                                        return __assign(__assign({}, media), { url: "data:".concat(mimeType, ";base64,").concat(imageBuffer.toString('base64')) });
                                    }
                                    else {
                                        // 代替パスを試す
                                        var alternativePaths = [
                                            path_1.default.join(process.cwd(), 'knowledge-base', 'images', path_1.default.basename(media.url)),
                                            path_1.default.join(process.cwd(), 'public', 'images', path_1.default.basename(media.url)),
                                            path_1.default.join(process.cwd(), 'uploads', path_1.default.basename(media.url))
                                        ];
                                        for (var _i = 0, alternativePaths_2 = alternativePaths; _i < alternativePaths_2.length; _i++) {
                                            var altPath = alternativePaths_2[_i];
                                            console.log("\u30E1\u30C7\u30A3\u30A2\u4EE3\u66FF\u30D1\u30B9\u3092\u78BA\u8A8D\u4E2D: ".concat(altPath));
                                            if (fs_1.default.existsSync(altPath)) {
                                                var imageBuffer = fs_1.default.readFileSync(altPath);
                                                var extension = path_1.default.extname(altPath).toLowerCase().slice(1);
                                                var mimeType = extension === 'svg' ? 'image/svg+xml' :
                                                    extension === 'png' ? 'image/png' :
                                                        extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';
                                                console.log("\u4EE3\u66FF\u30D1\u30B9 ".concat(altPath, " \u3092\u4F7F\u7528\u3057\u3066\u30E1\u30C7\u30A3\u30A2\u753B\u50CF\u3092\u30A8\u30F3\u30B3\u30FC\u30C9\u3057\u307E\u3057\u305F (").concat(imageBuffer.length, " \u30D0\u30A4\u30C8)"));
                                                return __assign(__assign({}, media), { url: "data:".concat(mimeType, ";base64,").concat(imageBuffer.toString('base64')) });
                                            }
                                        }
                                        console.warn("\u8B66\u544A: \u30E1\u30C7\u30A3\u30A2\u753B\u50CF\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093: ".concat(media.url));
                                        return media;
                                    }
                                }
                                catch (error) {
                                    console.error("\u30E1\u30C7\u30A3\u30A2\u753B\u50CF ".concat(media.url, " \u306E\u30A8\u30F3\u30B3\u30FC\u30C9\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:"), error);
                                    return media;
                                }
                            }
                            return media;
                        });
                        // timestamp の型安全な取得
                        var timestamp;
                        try {
                            if (message.timestamp && typeof message.timestamp.toISOString === 'function') {
                                timestamp = message.timestamp.toISOString();
                                // @ts-ignore - createdAtが存在する可能性がある
                            }
                            else if (message.createdAt && typeof message.createdAt.toISOString === 'function') {
                                // @ts-ignore
                                timestamp = message.createdAt.toISOString();
                            }
                            else {
                                timestamp = new Date().toISOString(); // フォールバック
                            }
                        }
                        catch (error) {
                            console.warn('タイムスタンプ処理でエラーが発生しました', error);
                            timestamp = new Date().toISOString();
                        }
                        return {
                            id: message.id,
                            timestamp: timestamp,
                            role: message.isAiResponse ? 'assistant' : 'user',
                            content: updatedContent,
                            media: encodedMedia,
                            base64_images: base64Images // Base64でエンコードした画像を追加
                        };
                    });
                    // 最終的なフォーマット済みデータを構築
                    return [2 /*return*/, {
                            session_id: chat.id,
                            timestamp: new Date().toISOString(),
                            user_id: chat.userId,
                            device_context: {
                                detected_models: possibleModels,
                                environment: environmentContext,
                                last_export: lastExport ? lastExport.timestamp.toISOString() : null
                            },
                            conversation_history: conversationHistory,
                            diagnostics: {
                                components: extractedComponents,
                                symptoms: extractedSymptoms,
                                possible_models: possibleModels,
                                primary_problem: primaryProblem,
                                problem_description: problemDescription
                            },
                            metadata: {
                                message_count: messages.length,
                                has_images: Object.values(messageMedia).some(function (media) { return media.length > 0; }),
                                extracted_timestamp: new Date().toISOString(),
                                version: "1.0.0"
                            }
                        }];
            }
        });
    });
}
