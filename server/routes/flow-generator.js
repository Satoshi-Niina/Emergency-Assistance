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
exports.flowGeneratorRouter = void 0;
var express_1 = require("express");
var fs = require("fs");
var path = require("path");
var openai_1 = require("../lib/openai");
var knowledge_base_1 = require("../lib/knowledge-base");
var json_helper_1 = require("../lib/json-helper");
var router = (0, express_1.Router)();
// 知識ベースディレクトリ
var knowledgeBaseDir = './knowledge-base';
var jsonDir = path.join(knowledgeBaseDir, 'json');
var troubleshootingDir = path.join(knowledgeBaseDir, 'troubleshooting');
// ディレクトリが存在しない場合は作成
if (!fs.existsSync(troubleshootingDir)) {
    fs.mkdirSync(troubleshootingDir, { recursive: true });
}
// キーワードからフローを生成するエンドポイント
router.post('/generate-from-keywords', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var keywords, relevantChunks, relatedKnowledgeText, chunksToInclude, _i, chunksToInclude_1, chunk, prompt_1, generatedFlow, cleanedResponse, flowData, generatedId, flowFilePath, finalId, counter, error, errorPosition, position, contextStart, contextEnd, lastBraceIndex, truncated, truncatedData, generatedId, flowFilePath, finalId, counter, error_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                keywords = req.body.keywords;
                if (!keywords || typeof keywords !== 'string' || !keywords.trim()) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'キーワードが指定されていません'
                        })];
                }
                console.log("\u30AD\u30FC\u30EF\u30FC\u30C9 \"".concat(keywords, "\" \u304B\u3089\u30D5\u30ED\u30FC\u3092\u751F\u6210\u3057\u307E\u3059"));
                // ナレッジベースから関連情報を検索
                console.log('ナレッジベースから関連情報を検索中...');
                return [4 /*yield*/, (0, knowledge_base_1.searchKnowledgeBase)(keywords)];
            case 1:
                relevantChunks = _b.sent();
                console.log("\u95A2\u9023\u30C1\u30E3\u30F3\u30AF\u6570: ".concat(relevantChunks.length));
                relatedKnowledgeText = '';
                if (relevantChunks.length > 0) {
                    relatedKnowledgeText = '\n\n【関連する知識ベース情報】:\n';
                    chunksToInclude = relevantChunks.slice(0, 5);
                    for (_i = 0, chunksToInclude_1 = chunksToInclude; _i < chunksToInclude_1.length; _i++) {
                        chunk = chunksToInclude_1[_i];
                        relatedKnowledgeText += "---\n\u51FA\u5178: ".concat(chunk.metadata.source || '不明', "\n\n").concat(chunk.text, "\n---\n\n");
                    }
                }
                prompt_1 = "\u4EE5\u4E0B\u306E\u30AD\u30FC\u30EF\u30FC\u30C9\u306B\u95A2\u9023\u3059\u308B\u5FDC\u6025\u51E6\u7F6E\u30D5\u30ED\u30FC\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\u5FC5\u305A\u5B8C\u5168\u306AJSON\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u306E\u307F\u3092\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u8FFD\u52A0\u306E\u8AAC\u660E\u3084\u30C6\u30AD\u30B9\u30C8\u306F\u4E00\u5207\u542B\u3081\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\n\u30EC\u30B9\u30DD\u30F3\u30B9\u306F\u7D14\u7C8B\u306AJSON\u30C7\u30FC\u30BF\u3060\u3051\u3067\u3042\u308B\u3079\u304D\u3067\u3001\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u306E\u30DE\u30FC\u30AF\u30C0\u30A6\u30F3\u8A18\u6CD5\u306F\u4F7F\u7528\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\n\u751F\u6210\u3059\u308BJSON\u306F\u5B8C\u5168\u306A\u6709\u52B9\u306AJSON\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u3001\u9014\u4E2D\u3067\u5207\u308C\u305F\u308A\u4E0D\u5B8C\u5168\u306A\u69CB\u9020\u3067\u3042\u3063\u3066\u306F\u306A\u308A\u307E\u305B\u3093\u3002\n\u7279\u306B\u3001\u5404\u914D\u5217\u3084\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u304C\u9069\u5207\u306B\u9589\u3058\u3089\u308C\u3066\u3044\u308B\u3053\u3068\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\n\u4EE5\u4E0B\u306E\u5F62\u5F0F\u306B\u53B3\u5BC6\u306B\u5F93\u3063\u3066\u304F\u3060\u3055\u3044\u3002\u6761\u4EF6\u5206\u5C90\u30CE\u30FC\u30C9\uFF08\"type\": \"condition\"\uFF09\u3067\u306F\u5FC5\u305A\"conditions\"\u914D\u5217\u3068\"message\"\u30D5\u30A3\u30FC\u30EB\u30C9\u3092\u542B\u3081\u3066\u304F\u3060\u3055\u3044:\n\n{\n  \"id\": \"\u6A5F\u68B0\u7684\u306AID\uFF08\u82F1\u6570\u5B57\u3068\u30A2\u30F3\u30C0\u30FC\u30B9\u30B3\u30A2\u306E\u307F\uFF09\",\n  \"title\": \"\u30D5\u30ED\u30FC\u306E\u30BF\u30A4\u30C8\u30EB\",\n  \"description\": \"\u7C21\u6F54\u306A\u8AAC\u660E\",\n  \"triggerKeywords\": [\"\u30AD\u30FC\u30EF\u30FC\u30C91\", \"\u30AD\u30FC\u30EF\u30FC\u30C92\"],\n  \"steps\": [\n    {\n      \"id\": \"step1\",\n      \"title\": \"\u958B\u59CB\",\n      \"description\": \"\u3053\u306E\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u3067\u306F\u3001[\u4E3B\u306A\u75C7\u72B6\u3084\u554F\u984C]\u306B\u5BFE\u51E6\u3059\u308B\u624B\u9806\u3092\u8AAC\u660E\u3057\u307E\u3059\u3002\u5B89\u5168\u3092\u78BA\u4FDD\u3057\u306A\u304C\u3089\u3001\u539F\u56E0\u3092\u7279\u5B9A\u3057\u89E3\u6C7A\u3059\u308B\u305F\u3081\u306E\u624B\u9806\u306B\u5F93\u3063\u3066\u304F\u3060\u3055\u3044\u3002\",\n      \"message\": \"\u3053\u306E\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u3067\u306F\u3001[\u4E3B\u306A\u75C7\u72B6\u3084\u554F\u984C]\u306B\u5BFE\u51E6\u3059\u308B\u624B\u9806\u3092\u8AAC\u660E\u3057\u307E\u3059\u3002\u5B89\u5168\u3092\u78BA\u4FDD\u3057\u306A\u304C\u3089\u3001\u539F\u56E0\u3092\u7279\u5B9A\u3057\u89E3\u6C7A\u3059\u308B\u305F\u3081\u306E\u624B\u9806\u306B\u5F93\u3063\u3066\u304F\u3060\u3055\u3044\u3002\",\n      \"imageUrl\": \"\",\n      \"type\": \"step\",\n      \"options\": []\n    },\n    {\n      \"id\": \"step2\",\n      \"title\": \"\u5B89\u5168\u78BA\u4FDD\",\n      \"description\": \"1. \u4E8C\u6B21\u707D\u5BB3\u3092\u9632\u3050\u305F\u3081\u3001\u8ECA\u4E21\u304C\u5B89\u5168\u306A\u5834\u6240\u306B\u505C\u6B62\u3057\u3066\u3044\u308B\u3053\u3068\u3092\u78BA\u8A8D\u3057\u307E\u3059\u3002\n2. \u63A5\u8FD1\u3059\u308B\u5217\u8ECA\u3084\u969C\u5BB3\u7269\u304C\u306A\u3044\u304B\u5468\u56F2\u3092\u78BA\u8A8D\u3057\u307E\u3059\u3002\n3. \u5FC5\u8981\u306B\u5FDC\u3058\u3066\u505C\u6B62\u8868\u793A\u5668\u3084\u9632\u8B77\u7121\u7DDA\u3092\u4F7F\u7528\u3057\u307E\u3059\u3002\",\n      \"message\": \"1. \u4E8C\u6B21\u707D\u5BB3\u3092\u9632\u3050\u305F\u3081\u3001\u8ECA\u4E21\u304C\u5B89\u5168\u306A\u5834\u6240\u306B\u505C\u6B62\u3057\u3066\u3044\u308B\u3053\u3068\u3092\u78BA\u8A8D\u3057\u307E\u3059\u3002\n2. \u63A5\u8FD1\u3059\u308B\u5217\u8ECA\u3084\u969C\u5BB3\u7269\u304C\u306A\u3044\u304B\u5468\u56F2\u3092\u78BA\u8A8D\u3057\u307E\u3059\u3002\n3. \u5FC5\u8981\u306B\u5FDC\u3058\u3066\u505C\u6B62\u8868\u793A\u5668\u3084\u9632\u8B77\u7121\u7DDA\u3092\u4F7F\u7528\u3057\u307E\u3059\u3002\",\n      \"imageUrl\": \"\",\n      \"type\": \"step\",\n      \"options\": []\n    },\n    {\n      \"id\": \"step3\",\n      \"type\": \"condition\",\n      \"title\": \"\u72B6\u614B\u78BA\u8A8D\u5206\u5C90\",\n      \"message\": \"\u73FE\u5728\u306E\u72B6\u6CC1\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u8A72\u5F53\u3059\u308B\u72B6\u6CC1\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002\",\n      \"conditions\": [\n        {\n          \"label\": \"\u72B6\u6CC1A\",\n          \"nextId\": \"step4\"\n        },\n        {\n          \"label\": \"\u72B6\u6CC1B\",\n          \"nextId\": \"step5\"\n        }\n      ]\n    },\n    {\n      \"id\": \"step4\",\n      \"title\": \"\u72B6\u6CC1A\u306E\u5BFE\u51E6\",\n      \"description\": \"\u72B6\u6CC1A\u306B\u5BFE\u3059\u308B\u5177\u4F53\u7684\u306A\u5BFE\u51E6\u624B\u9806\u3092\u8AAC\u660E\u3057\u307E\u3059\u3002\",\n      \"message\": \"\u72B6\u6CC1A\u306B\u5BFE\u3059\u308B\u5177\u4F53\u7684\u306A\u5BFE\u51E6\u624B\u9806\u3092\u8AAC\u660E\u3057\u307E\u3059\u3002\",\n      \"imageUrl\": \"\",\n      \"type\": \"step\",\n      \"options\": []\n    },\n    {\n      \"id\": \"step5\",\n      \"title\": \"\u72B6\u6CC1B\u306E\u5BFE\u51E6\",\n      \"description\": \"\u72B6\u6CC1B\u306B\u5BFE\u3059\u308B\u5177\u4F53\u7684\u306A\u5BFE\u51E6\u624B\u9806\u3092\u8AAC\u660E\u3057\u307E\u3059\u3002\",\n      \"message\": \"\u72B6\u6CC1B\u306B\u5BFE\u3059\u308B\u5177\u4F53\u7684\u306A\u5BFE\u51E6\u624B\u9806\u3092\u8AAC\u660E\u3057\u307E\u3059\u3002\",\n      \"imageUrl\": \"\",\n      \"type\": \"step\",\n      \"options\": []\n    },\n    {\n      \"id\": \"step6\",\n      \"type\": \"condition\",\n      \"title\": \"\u6700\u7D42\u78BA\u8A8D\",\n      \"message\": \"\u5BFE\u51E6\u5F8C\u306E\u72B6\u6CC1\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\",\n      \"conditions\": [\n        {\n          \"label\": \"\u554F\u984C\u89E3\u6C7A\",\n          \"nextId\": \"step7\"\n        },\n        {\n          \"label\": \"\u554F\u984C\u7D99\u7D9A\",\n          \"nextId\": \"step8\"\n        }\n      ]\n    },\n    {\n      \"id\": \"step7\",\n      \"title\": \"\u904B\u8EE2\u518D\u958B\u624B\u9806\",\n      \"description\": \"1. \u5404\u8A08\u5668\u306E\u5024\u304C\u6B63\u5E38\u7BC4\u56F2\u5185\u306B\u3042\u308B\u3053\u3068\u3092\u78BA\u8A8D\u3057\u307E\u3059\u3002\n2. \u7570\u5E38\u306A\u97F3\u3001\u632F\u52D5\u3001\u81ED\u3044\u304C\u306A\u3044\u304B\u78BA\u8A8D\u3057\u307E\u3059\u3002\n3. \u5168\u3066\u6B63\u5E38\u3067\u3042\u308C\u3070\u3001\u904B\u8EE2\u3092\u518D\u958B\u3057\u307E\u3059\u3002\",\n      \"message\": \"1. \u5404\u8A08\u5668\u306E\u5024\u304C\u6B63\u5E38\u7BC4\u56F2\u5185\u306B\u3042\u308B\u3053\u3068\u3092\u78BA\u8A8D\u3057\u307E\u3059\u3002\n2. \u7570\u5E38\u306A\u97F3\u3001\u632F\u52D5\u3001\u81ED\u3044\u304C\u306A\u3044\u304B\u78BA\u8A8D\u3057\u307E\u3059\u3002\n3. \u5168\u3066\u6B63\u5E38\u3067\u3042\u308C\u3070\u3001\u904B\u8EE2\u3092\u518D\u958B\u3057\u307E\u3059\u3002\",\n      \"imageUrl\": \"\",\n      \"type\": \"step\",\n      \"options\": []\n    },\n    {\n      \"id\": \"step8\",\n      \"title\": \"\u5C02\u9580\u7684\u306A\u652F\u63F4\u8981\u8ACB\",\n      \"description\": \"1. \u6307\u4EE4\u6240\u307E\u305F\u306F\u4FDD\u5B88\u62C5\u5F53\u306B\u9023\u7D61\u3057\u3001\u73FE\u5728\u306E\u72B6\u6CC1\u3068\u4F4D\u7F6E\u3092\u5831\u544A\u3057\u307E\u3059\u3002\n2. \u3053\u308C\u307E\u3067\u306B\u5B9F\u65BD\u3057\u305F\u78BA\u8A8D\u4E8B\u9805\u3068\u5BFE\u51E6\u5185\u5BB9\u3092\u4F1D\u3048\u307E\u3059\u3002\n3. \u652F\u63F4\u3092\u8981\u8ACB\u3057\u3001\u5B89\u5168\u306A\u5834\u6240\u3067\u5F85\u6A5F\u3057\u307E\u3059\u3002\",\n      \"message\": \"1. \u6307\u4EE4\u6240\u307E\u305F\u306F\u4FDD\u5B88\u62C5\u5F53\u306B\u9023\u7D61\u3057\u3001\u73FE\u5728\u306E\u72B6\u6CC1\u3068\u4F4D\u7F6E\u3092\u5831\u544A\u3057\u307E\u3059\u3002\n2. \u3053\u308C\u307E\u3067\u306B\u5B9F\u65BD\u3057\u305F\u78BA\u8A8D\u4E8B\u9805\u3068\u5BFE\u51E6\u5185\u5BB9\u3092\u4F1D\u3048\u307E\u3059\u3002\n3. \u652F\u63F4\u3092\u8981\u8ACB\u3057\u3001\u5B89\u5168\u306A\u5834\u6240\u3067\u5F85\u6A5F\u3057\u307E\u3059\u3002\",\n      \"imageUrl\": \"\",\n      \"type\": \"step\",\n      \"options\": []\n    }\n  ],\n  \"updatedAt\": \"2025-06-14T09:28:05.650Z\"\n}\n\n\u3010\u30AD\u30FC\u30EF\u30FC\u30C9\u3011: ".concat(keywords, "\n").concat(relatedKnowledgeText, "\n\n\u30D5\u30ED\u30FC\u751F\u6210\u306B\u95A2\u3059\u308B\u91CD\u8981\u306A\u30AC\u30A4\u30C9\u30E9\u30A4\u30F3\uFF1A\n1. \u30D5\u30ED\u30FC\u306F\u5B9F\u7528\u7684\u3067\u3001\u5B9F\u969B\u306E\u7DCA\u6025\u6642\u306B\u5F79\u7ACB\u3064\u624B\u9806\u3092\u63D0\u4F9B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u30D7\u30EC\u30FC\u30B9\u30DB\u30EB\u30C0\u30FC\u3084\u30B5\u30F3\u30D7\u30EB\u30C6\u30AD\u30B9\u30C8\u306F\u4F7F\u7528\u305B\u305A\u3001\u5177\u4F53\u7684\u3067\u5B9F\u884C\u53EF\u80FD\u306A\u6307\u793A\u3092\u542B\u3081\u3066\u304F\u3060\u3055\u3044\u3002\n2. \u5404\u30B9\u30C6\u30C3\u30D7\u306B\u306F\u5177\u4F53\u7684\u306A\u6307\u793A\u3084\u78BA\u8A8D\u4E8B\u9805\u3092\u7B87\u6761\u66F8\u304D\u3067\u542B\u3081\u3066\u304F\u3060\u3055\u3044\u30021\u301C3\u306E\u3088\u3046\u306A\u6570\u5B57\u4ED8\u304D\u30EA\u30B9\u30C8\u3092\u4F7F\u7528\u3057\u3001\u6539\u884C\u306B\u306F\\n\u3092\u4F7F\u7528\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n3. decision\uFF08\u5224\u65AD\uFF09\u30CE\u30FC\u30C9\u3067\u306F\u3001\u660E\u78BA\u306A\u8CEA\u554F\u5F62\u5F0F\u306E\u8AAC\u660E\u3092\u63D0\u4F9B\u3057\u3001\u9078\u629E\u80A2\u306F\u5177\u4F53\u7684\u306A\u72B6\u614B\u3084\u6761\u4EF6\u3092\u53CD\u6620\u3055\u305B\u3066\u304F\u3060\u3055\u3044\u3002\n4. \u4FDD\u5B88\u7528\u8ECA\u306E\u5C02\u9580\u77E5\u8B58\u3092\u6D3B\u7528\u3057\u3001\u5B89\u5168\u3092\u6700\u512A\u5148\u3057\u305F\u6280\u8853\u7684\u306B\u6B63\u78BA\u306A\u624B\u9806\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n5. \u7DCA\u6025\u6642\u306E\u5BFE\u5FDC\u3068\u3057\u3066\u3001\u307E\u305A\u5B89\u5168\u78BA\u4FDD\u3001\u6B21\u306B\u72B6\u6CC1\u8A55\u4FA1\u3001\u305D\u3057\u3066\u89E3\u6C7A\u7B56\u306E\u5B9F\u884C\u3068\u3044\u3046\u8AD6\u7406\u7684\u306A\u6D41\u308C\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n6. \u5C11\u306A\u304F\u3068\u30822\u3064\u306E\u4E3B\u8981\u306A\u5224\u65AD\u30DD\u30A4\u30F3\u30C8\uFF08decision\uFF09\u3068\u3001\u305D\u308C\u305E\u308C\u306B\u5BFE\u5FDC\u3059\u308B\u5206\u5C90\u30D1\u30B9\u3092\u542B\u3081\u3066\u304F\u3060\u3055\u3044\u3002\n7. \u3059\u3079\u3066\u306E\u30D1\u30B9\u304C\u5B8C\u4E86\u307E\u305F\u306F\u5C02\u9580\u5BB6\u3078\u306E\u76F8\u8AC7\u3067\u7D42\u308F\u308B\u3088\u3046\u306B\u3057\u3001\u884C\u304D\u6B62\u307E\u308A\u306E\u306A\u3044\u30D5\u30ED\u30FC\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n8. title\uFF08\u30BF\u30A4\u30C8\u30EB\uFF09\u30D5\u30A3\u30FC\u30EB\u30C9\u306B\u306F\u77ED\u304F\u660E\u78BA\u306A\u898B\u51FA\u3057\u3092\u3001description\uFF08\u8AAC\u660E\uFF09\u30D5\u30A3\u30FC\u30EB\u30C9\u306B\u306F\u8A73\u7D30\u306A\u6307\u793A\u3084\u72B6\u6CC1\u8AAC\u660E\u3092\u5165\u308C\u3066\u304F\u3060\u3055\u3044\u3002\n9. \u8ECC\u9053\u30E2\u30FC\u30BF\u30AB\u30FC\u7279\u6709\u306E\u6A5F\u5668\u3084\u30B7\u30B9\u30C6\u30E0\uFF08\u4F8B\uFF1A\u5236\u5FA1\u88C5\u7F6E\u3001\u30D6\u30EC\u30FC\u30AD\u30B7\u30B9\u30C6\u30E0\u3001\u30D1\u30F3\u30BF\u30B0\u30E9\u30D5\u7B49\uFF09\u306B\u95A2\u3059\u308B\u5177\u4F53\u7684\u306A\u8A00\u53CA\u3092\u542B\u3081\u3066\u304F\u3060\u3055\u3044\u3002\n10. \u6700\u7D42\u30B9\u30C6\u30C3\u30D7\u3067\u306F\u5FC5\u305A\u5177\u4F53\u7684\u306A\u5BFE\u5FDC\u7D50\u679C\u3084\u6B21\u306E\u30B9\u30C6\u30C3\u30D7\u3092\u660E\u793A\u3057\u3001\u5229\u7528\u8005\u304C\u6B21\u306B\u3068\u308B\u3079\u304D\u884C\u52D5\u3092\u660E\u78BA\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
                // OpenAIでフローを生成
                console.log('OpenAIにフロー生成をリクエスト中...');
                return [4 /*yield*/, (0, openai_1.processOpenAIRequest)(prompt_1)];
            case 2:
                generatedFlow = _b.sent();
                try {
                    cleanedResponse = (0, json_helper_1.cleanJsonResponse)(generatedFlow);
                    flowData = JSON.parse(cleanedResponse);
                    // IDが設定されていない場合はキーワードから生成
                    if (!flowData.id) {
                        generatedId = keywords.toLowerCase()
                            .replace(/[^a-z0-9_]/g, '_')
                            .replace(/_+/g, '_')
                            .substring(0, 50);
                        flowData.id = "flow_".concat(generatedId, "_").concat(Date.now());
                    }
                    flowFilePath = path.join(troubleshootingDir, "".concat(flowData.id, ".json"));
                    finalId = flowData.id;
                    counter = 1;
                    while (fs.existsSync(path.join(troubleshootingDir, "".concat(finalId, ".json")))) {
                        finalId = "".concat(flowData.id, "_").concat(counter);
                        counter++;
                    }
                    flowData.id = finalId;
                    // フローをファイルに保存
                    fs.writeFileSync(path.join(troubleshootingDir, "".concat(flowData.id, ".json")), JSON.stringify(flowData, null, 2));
                    // 生成日時を記録
                    flowData.createdAt = new Date().toISOString();
                    // 成功レスポンス
                    res.json({
                        success: true,
                        message: "\u30D5\u30ED\u30FC\u304C\u6B63\u5E38\u306B\u751F\u6210\u3055\u308C\u307E\u3057\u305F: ".concat(flowData.title),
                        flowData: flowData
                    });
                }
                catch (parseError) {
                    error = parseError;
                    console.error('生成されたフローの解析エラー:', error);
                    console.error('生成されたテキスト:', generatedFlow);
                    errorPosition = (_a = error.message) === null || _a === void 0 ? void 0 : _a.match(/position\s+(\d+)/i);
                    if (errorPosition && errorPosition[1]) {
                        position = parseInt(errorPosition[1], 10);
                        contextStart = Math.max(0, position - 20);
                        contextEnd = Math.min(generatedFlow.length, position + 20);
                        console.error("\u30A8\u30E9\u30FC\u4F4D\u7F6E: ".concat(position));
                        console.error("\u554F\u984C\u7B87\u6240\u306E\u5468\u8FBA: \"".concat(generatedFlow.substring(contextStart, position), "<<<ERROR HERE>>>").concat(generatedFlow.substring(position, contextEnd), "\""));
                        // 末尾のJSONを切り取る試み
                        if (position > generatedFlow.length * 0.9) {
                            lastBraceIndex = generatedFlow.lastIndexOf('}');
                            if (lastBraceIndex > 0) {
                                truncated = generatedFlow.substring(0, lastBraceIndex + 1);
                                console.log('末尾を切り詰めたJSONを試行...');
                                try {
                                    truncatedData = JSON.parse(truncated);
                                    // 成功した場合は切り詰めたデータを使用
                                    console.log('切り詰めたJSONの解析に成功しました');
                                    generatedId = keywords.toLowerCase()
                                        .replace(/[^a-z0-9_]/g, '_')
                                        .replace(/_+/g, '_')
                                        .substring(0, 50);
                                    truncatedData.id = "flow_".concat(generatedId, "_").concat(Date.now());
                                    flowFilePath = path.join(troubleshootingDir, "".concat(truncatedData.id, ".json"));
                                    finalId = truncatedData.id;
                                    counter = 1;
                                    while (fs.existsSync(path.join(troubleshootingDir, "".concat(finalId, ".json")))) {
                                        finalId = "".concat(truncatedData.id, "_").concat(counter);
                                        counter++;
                                    }
                                    truncatedData.id = finalId;
                                    // フローをファイルに保存
                                    fs.writeFileSync(path.join(troubleshootingDir, "".concat(truncatedData.id, ".json")), JSON.stringify(truncatedData, null, 2));
                                    // 生成日時を記録
                                    truncatedData.createdAt = new Date().toISOString();
                                    // 成功レスポンス
                                    return [2 /*return*/, res.json({
                                            success: true,
                                            message: "\u4FEE\u5FA9\u3057\u305FJSON\u304B\u3089\u30D5\u30ED\u30FC\u304C\u751F\u6210\u3055\u308C\u307E\u3057\u305F: ".concat(truncatedData.title),
                                            flowData: truncatedData
                                        })];
                                }
                                catch (secondError) {
                                    console.error('切り詰めたJSONの解析にも失敗しました:', secondError);
                                }
                            }
                        }
                    }
                    res.status(500).json({
                        success: false,
                        error: 'フローデータの解析に失敗しました',
                        rawResponse: generatedFlow
                    });
                }
                return [3 /*break*/, 4];
            case 3:
                error_1 = _b.sent();
                console.error('フロー生成エラー:', error_1);
                res.status(500).json({
                    success: false,
                    error: error_1 instanceof Error ? error_1.message : '不明なエラーが発生しました'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// トラブルシューティングフローを取得するエンドポイント
router.get('/list', function (req, res) {
    try {
        // トラブルシューティングディレクトリからJSONファイルを取得
        var files = fs.readdirSync(troubleshootingDir)
            .filter(function (file) { return file.endsWith('.json'); });
        var flowList = files.map(function (file) {
            try {
                var fileContent = fs.readFileSync(path.join(troubleshootingDir, file), 'utf-8');
                var flowData = JSON.parse(fileContent);
                return {
                    id: flowData.id || file.replace('.json', ''),
                    title: flowData.title || 'タイトルなし',
                    description: flowData.description || '',
                    triggerKeywords: flowData.triggerKeywords || [],
                    createdAt: flowData.createdAt || null
                };
            }
            catch (error) {
                console.error("\u30D5\u30A1\u30A4\u30EB ".concat(file, " \u306E\u89E3\u6790\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:"), error);
                return null;
            }
        }).filter(Boolean);
        res.json({
            success: true,
            flowList: flowList
        });
    }
    catch (error) {
        console.error('フローリスト取得エラー:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : '不明なエラーが発生しました'
        });
    }
});
// トラブルシューティングフローの詳細を取得するエンドポイント
router.get('/detail/:id', function (req, res) {
    var _a, _b;
    try {
        var cleanFlowId = req.params.id.startsWith('ts_') ? req.params.id.substring(3) : req.params.id;
        var filePath = path.join(troubleshootingDir, "".concat(cleanFlowId, ".json"));
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: '指定されたフローが見つかりません'
            });
        }
        var fileContent = fs.readFileSync(filePath, 'utf-8');
        var flowData = JSON.parse(fileContent);
        var decisionSteps = ((_a = flowData.steps) === null || _a === void 0 ? void 0 : _a.filter(function (step) { return step.type === 'decision'; })) || [];
        var conditionSteps = ((_b = flowData.steps) === null || _b === void 0 ? void 0 : _b.filter(function (step) { return step.type === 'condition'; })) || [];
        var decisionStepsDetail = decisionSteps.map(function (step) { return ({
            id: step.id,
            title: step.title,
            description: step.description,
            message: step.message,
            conditions: step.conditions
        }); });
        var conditionStepsDetail = conditionSteps.map(function (step) { return ({
            id: step.id,
            title: step.title,
            description: step.description,
            message: step.message,
            conditions: step.conditions
        }); });
        res.json({
            success: true,
            flowData: __assign(__assign({}, flowData), { decisionSteps: decisionStepsDetail, conditionSteps: conditionStepsDetail })
        });
    }
    catch (error) {
        console.error('フロー詳細取得エラー:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : '不明なエラーが発生しました'
        });
    }
});
// トラブルシューティングフローを削除するエンドポイント
router.delete('/:id', function (req, res) {
    try {
        var flowId = req.params.id;
        var filePath = path.join(troubleshootingDir, "".concat(flowId, ".json"));
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: '指定されたフローが見つかりません'
            });
        }
        fs.unlinkSync(filePath);
        res.json({
            success: true,
            message: 'フローが正常に削除されました'
        });
    }
    catch (error) {
        console.error('フロー削除エラー:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : '不明なエラーが発生しました'
        });
    }
});
exports.flowGeneratorRouter = router;
