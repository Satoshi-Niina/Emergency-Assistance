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
exports.processPerplexityRequest = processPerplexityRequest;
var axios_1 = require("axios");
var knowledge_base_1 = require("./knowledge-base");
var vite_1 = require("../vite");
// Perplexity API キーが設定されているかチェック
function validateApiKey() {
    var apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
        (0, vite_1.log)('環境変数 PERPLEXITY_API_KEY が設定されていません', 'perplexity');
        return false;
    }
    return true;
}
/**
 * Perplexity API を使用して回答を生成する
 * @param query ユーザーの質問
 * @param useKnowledgeBaseOnly ナレッジベースのみを使用する場合はtrue
 * @returns 生成された回答
 */
function processPerplexityRequest(query_1) {
    return __awaiter(this, arguments, void 0, function (query, systemPrompt, useKnowledgeBaseOnly) {
        var finalSystemPrompt, _a, requestOptions, response, content, citations, error_1;
        if (systemPrompt === void 0) { systemPrompt = ""; }
        if (useKnowledgeBaseOnly === void 0) { useKnowledgeBaseOnly = true; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // API キーをチェック
                    if (!validateApiKey()) {
                        throw new Error('Perplexity API キーが設定されていません');
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 5, , 6]);
                    _a = systemPrompt;
                    if (_a) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, knowledge_base_1.generateSystemPromptWithKnowledge)(query)];
                case 2:
                    _a = (_b.sent());
                    _b.label = 3;
                case 3:
                    finalSystemPrompt = _a;
                    requestOptions = {
                        model: "llama-3.1-sonar-small-128k-online", // デフォルトモデル
                        messages: [
                            {
                                role: "system",
                                content: finalSystemPrompt
                            },
                            {
                                role: "user",
                                content: query
                            }
                        ],
                        temperature: 0.2,
                        top_p: 0.9,
                        frequency_penalty: 1,
                        search_recency_filter: "month",
                        return_related_questions: false
                    };
                    // ナレッジベースのみを使用する場合は検索ドメインを制限
                    if (useKnowledgeBaseOnly) {
                        requestOptions.search_domain_filter = ["perplexity.ai"];
                    }
                    return [4 /*yield*/, axios_1.default.post('https://api.perplexity.ai/chat/completions', requestOptions, {
                            headers: {
                                'Authorization': "Bearer ".concat(process.env.PERPLEXITY_API_KEY),
                                'Content-Type': 'application/json'
                            }
                        })];
                case 4:
                    response = _b.sent();
                    content = response.data.choices[0].message.content;
                    citations = response.data.citations || [];
                    // 応答をログに記録
                    (0, vite_1.log)("Perplexity\u5FDC\u7B54: ".concat(content.substring(0, 100), "..."), 'perplexity');
                    return [2 /*return*/, { content: content, citations: citations }];
                case 5:
                    error_1 = _b.sent();
                    // エラーをログに記録
                    if (axios_1.default.isAxiosError(error_1)) {
                        (0, vite_1.log)("Perplexity API\u30A8\u30E9\u30FC: ".concat(error_1.message), 'perplexity');
                        if (error_1.response) {
                            (0, vite_1.log)("\u30EC\u30B9\u30DD\u30F3\u30B9\u30C7\u30FC\u30BF: ".concat(JSON.stringify(error_1.response.data)), 'perplexity');
                        }
                    }
                    else {
                        (0, vite_1.log)("Perplexity\u51E6\u7406\u30A8\u30E9\u30FC: ".concat(error_1 instanceof Error ? error_1.message : String(error_1)), 'perplexity');
                    }
                    throw error_1;
                case 6: return [2 /*return*/];
            }
        });
    });
}
