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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeKnowledgeBase = initializeKnowledgeBase;
exports.searchKnowledgeBase = searchKnowledgeBase;
exports.generateSystemPromptWithKnowledge = generateSystemPromptWithKnowledge;
exports.addDocumentToKnowledgeBase = addDocumentToKnowledgeBase;
exports.backupKnowledgeBase = backupKnowledgeBase;
exports.mergeDocumentContent = mergeDocumentContent;
exports.loadKnowledgeBaseIndex = loadKnowledgeBaseIndex;
exports.listKnowledgeBaseDocuments = listKnowledgeBaseDocuments;
exports.removeDocumentFromKnowledgeBase = removeDocumentFromKnowledgeBase;
/**
 * 知識ベース検索関連の機能
 */
var path = require("path");
var fs = require("fs");
// 知識ベースディレクトリのパス
var KNOWLEDGE_BASE_DIR = './knowledge-base';
var DATA_DIR = path.join(KNOWLEDGE_BASE_DIR, 'data');
var TEXT_DIR = path.join(KNOWLEDGE_BASE_DIR, 'text');
var TROUBLESHOOTING_DIR = path.join(KNOWLEDGE_BASE_DIR, 'troubleshooting');
var BACKUP_DIR = path.join(KNOWLEDGE_BASE_DIR, 'backups');
// 知識ベースインデックスファイル
var INDEX_FILE = path.join(DATA_DIR, 'knowledge_index.json');
// 知識ベースの初期化
function initializeKnowledgeBase() {
    return __awaiter(this, void 0, void 0, function () {
        var directories, _i, directories_1, dir;
        return __generator(this, function (_a) {
            try {
                directories = [KNOWLEDGE_BASE_DIR, DATA_DIR, TEXT_DIR, TROUBLESHOOTING_DIR, BACKUP_DIR];
                for (_i = 0, directories_1 = directories; _i < directories_1.length; _i++) {
                    dir = directories_1[_i];
                    try {
                        if (!fs.existsSync(dir)) {
                            fs.mkdirSync(dir, { recursive: true });
                        }
                    }
                    catch (error) {
                        console.warn("\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u4F5C\u6210\u8B66\u544A ".concat(dir, ":"), error);
                        // 致命的でないエラーは継続
                    }
                }
                // Knowledge base directories initialized
                return [2 /*return*/, true];
            }
            catch (error) {
                console.error('知識ベース初期化エラー:', error);
                throw error;
            }
            return [2 /*return*/];
        });
    });
}
/**
 * シンプルな類似度計算関数
 * @param text1
 * @param text2
 * @returns
 */
function calculateSimilarity(text1, text2) {
    // 文字列を小文字に変換して単語に分割
    var words1 = text1.toLowerCase().split(/\s+/);
    var words2 = text2.toLowerCase().split(/\s+/);
    // 共通の単語数をカウント
    var commonWords = words1.filter(function (word) { return words2.includes(word); });
    // 類似度スコアを計算（Jaccard類似度の簡易版）
    var allWords = new Set(__spreadArray(__spreadArray([], words1, true), words2, true));
    return commonWords.length / allWords.size;
}
/**
 * 知識ベースから検索する関数
 * @param query 検索クエリ
 * @returns 関連するテキストチャンクの配列
 */
function searchKnowledgeBase(query) {
    return __awaiter(this, void 0, void 0, function () {
        var chunks_1, textFiles, _loop_1, _i, textFiles_1, file, flowFiles, _loop_2, _a, flowFiles_1, file, scoredChunks;
        return __generator(this, function (_b) {
            // インメモリで単純な検索を実装
            try {
                chunks_1 = [];
                // テキストファイルを読み込む
                try {
                    if (fs.existsSync(TEXT_DIR)) {
                        textFiles = fs.readdirSync(TEXT_DIR).filter(function (file) { return file.endsWith('.txt'); });
                        _loop_1 = function (file) {
                            try {
                                var content = fs.readFileSync(path.join(TEXT_DIR, file), 'utf-8');
                                // テキストをチャンクに分割（単純な段落分割）
                                var paragraphs = content.split(/\n\s*\n/);
                                paragraphs.forEach(function (paragraph, index) {
                                    // 空の段落はスキップ
                                    if (paragraph.trim().length === 0)
                                        return;
                                    chunks_1.push({
                                        text: paragraph,
                                        metadata: {
                                            source: file,
                                            index: index
                                        }
                                    });
                                });
                            }
                            catch (error) {
                                console.error("\u30D5\u30A1\u30A4\u30EB ".concat(file, " \u306E\u8AAD\u307F\u8FBC\u307F\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:"), error);
                            }
                        };
                        for (_i = 0, textFiles_1 = textFiles; _i < textFiles_1.length; _i++) {
                            file = textFiles_1[_i];
                            _loop_1(file);
                        }
                    }
                    else {
                        console.log('TEXT_DIRが存在しません:', TEXT_DIR);
                    }
                }
                catch (error) {
                    console.error('テキストファイル検索エラー:', error);
                }
                // トラブルシューティングフローも検索対象に含める
                try {
                    if (fs.existsSync(TROUBLESHOOTING_DIR)) {
                        flowFiles = fs.readdirSync(TROUBLESHOOTING_DIR).filter(function (file) { return file.endsWith('.json'); });
                        _loop_2 = function (file) {
                            try {
                                var content = fs.readFileSync(path.join(TROUBLESHOOTING_DIR, file), 'utf-8');
                                var flowData = JSON.parse(content);
                                // フローのタイトルと説明を検索対象に含める
                                var flowText = "".concat(flowData.title || '', " ").concat(flowData.description || '');
                                // キーワードがあれば追加
                                if (flowData.triggerKeywords && Array.isArray(flowData.triggerKeywords)) {
                                    var keywords = flowData.triggerKeywords.join(' ');
                                    chunks_1.push({
                                        text: "".concat(flowText, " ").concat(keywords),
                                        metadata: {
                                            source: "\u30D5\u30ED\u30FC: ".concat(file),
                                            index: 0
                                        }
                                    });
                                }
                                else {
                                    chunks_1.push({
                                        text: flowText,
                                        metadata: {
                                            source: "\u30D5\u30ED\u30FC: ".concat(file),
                                            index: 0
                                        }
                                    });
                                }
                                // 各ステップの説明も検索対象に含める
                                if (flowData.steps && Array.isArray(flowData.steps)) {
                                    flowData.steps.forEach(function (step, index) {
                                        var stepText = "".concat(step.title || '', " ").concat(step.description || '');
                                        if (stepText.trim()) {
                                            chunks_1.push({
                                                text: stepText,
                                                metadata: {
                                                    source: "\u30D5\u30ED\u30FC\u30B9\u30C6\u30C3\u30D7: ".concat(file),
                                                    index: index + 1
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                            catch (error) {
                                console.error("\u30D5\u30ED\u30FC\u30D5\u30A1\u30A4\u30EB ".concat(file, " \u306E\u8AAD\u307F\u8FBC\u307F\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:"), error);
                            }
                        };
                        for (_a = 0, flowFiles_1 = flowFiles; _a < flowFiles_1.length; _a++) {
                            file = flowFiles_1[_a];
                            _loop_2(file);
                        }
                    }
                    else {
                        console.log('TROUBLESHOOTING_DIRが存在しません:', TROUBLESHOOTING_DIR);
                    }
                }
                catch (error) {
                    console.error('トラブルシューティングフロー検索エラー:', error);
                }
                scoredChunks = chunks_1.map(function (chunk) {
                    var similarityScore = calculateSimilarity(query, chunk.text);
                    return __assign(__assign({}, chunk), { similarity: similarityScore });
                });
                // 類似度でソートして上位10件を返す
                return [2 /*return*/, scoredChunks
                        .sort(function (a, b) { return (b.similarity || 0) - (a.similarity || 0); })
                        .slice(0, 10)];
            }
            catch (error) {
                console.error('知識ベース検索エラー:', error);
                return [2 /*return*/, []];
            }
            return [2 /*return*/];
        });
    });
}
/**
 * 知識ベースの内容を使用してシステムプロンプトを生成する
 * @param query ユーザークエリ
 * @returns 知識ベースを組み込んだシステムプロンプト
 */
function generateSystemPromptWithKnowledge(query) {
    return __awaiter(this, void 0, void 0, function () {
        var relevantChunks, knowledgeText, chunksToInclude, _i, chunksToInclude_1, chunk, baseSystemPrompt;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, searchKnowledgeBase(query)];
                case 1:
                    relevantChunks = _a.sent();
                    knowledgeText = '';
                    if (relevantChunks.length > 0) {
                        knowledgeText = '\n\n【関連する知識ベース情報】:\n';
                        chunksToInclude = relevantChunks.slice(0, 5);
                        for (_i = 0, chunksToInclude_1 = chunksToInclude; _i < chunksToInclude_1.length; _i++) {
                            chunk = chunksToInclude_1[_i];
                            knowledgeText += "---\n\u51FA\u5178: ".concat(chunk.metadata.source || '不明', "\n\n").concat(chunk.text, "\n---\n\n");
                        }
                    }
                    baseSystemPrompt = "\u3042\u306A\u305F\u306F\u4FDD\u5B88\u7528\u8ECA\u652F\u63F4\u30B7\u30B9\u30C6\u30E0\u306E\u4E00\u90E8\u3068\u3057\u3066\u6A5F\u80FD\u3059\u308BAI\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002\n\u30E6\u30FC\u30B6\u30FC\u306E\u8CEA\u554F\u306B\u5BFE\u3057\u3066\u3001\u6B63\u78BA\u3067\u5B9F\u7528\u7684\u306A\u56DE\u7B54\u3092\u63D0\u4F9B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\u4EE5\u4E0B\u306E\u77E5\u8B58\u30D9\u30FC\u30B9\u306E\u60C5\u5831\u3092\u6D3B\u7528\u3057\u3066\u56DE\u7B54\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
                    return [2 /*return*/, "".concat(baseSystemPrompt).concat(knowledgeText)];
            }
        });
    });
}
/**
 * ドキュメントを知識ベースに追加する
 * @param fileInfo ファイル情報
 * @param content コンテンツ
 * @returns 処理結果
 */
function addDocumentToKnowledgeBase(fileInfo, content) {
    try {
        // ファイル名から拡張子を除いた部分を取得
        var baseName = path.basename(fileInfo.originalname, path.extname(fileInfo.originalname));
        var safeBaseName = baseName.replace(/[^a-zA-Z0-9_]/g, '_');
        // タイムスタンプを含むファイル名を作成
        var timestamp = Date.now();
        var textFileName = "".concat(safeBaseName, "_").concat(timestamp, ".txt");
        // テキストファイルを知識ベースに保存
        fs.writeFileSync(path.join(TEXT_DIR, textFileName), content, 'utf-8');
        console.log("\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u3092\u77E5\u8B58\u30D9\u30FC\u30B9\u306B\u8FFD\u52A0\u3057\u307E\u3057\u305F: ".concat(textFileName));
        return {
            success: true,
            message: "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8 ".concat(fileInfo.originalname, " \u3092\u77E5\u8B58\u30D9\u30FC\u30B9\u306B\u8FFD\u52A0\u3057\u307E\u3057\u305F")
        };
    }
    catch (error) {
        console.error('ドキュメントの知識ベース追加エラー:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : '不明なエラーが発生しました'
        };
    }
}
/**
 * 知識ベースのバックアップを作成する
 * @returns バックアップ結果
 */
function backupKnowledgeBase() {
    try {
        // バックアップディレクトリが存在しない場合は作成
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        // バックアップファイル名（現在のタイムスタンプを含む）
        var timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        var backupFileName = "knowledge_base_backup_".concat(timestamp, ".json");
        var backupPath = path.join(BACKUP_DIR, backupFileName);
        // テキストコンテンツのインデックスを作成
        var textFiles = fs.readdirSync(TEXT_DIR).filter(function (file) { return file.endsWith('.txt'); });
        var textContents = {};
        for (var _i = 0, textFiles_2 = textFiles; _i < textFiles_2.length; _i++) {
            var file = textFiles_2[_i];
            try {
                var content = fs.readFileSync(path.join(TEXT_DIR, file), 'utf-8');
                textContents[file] = content;
            }
            catch (error) {
                console.error("\u30D5\u30A1\u30A4\u30EB ".concat(file, " \u306E\u8AAD\u307F\u8FBC\u307F\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:"), error);
            }
        }
        // バックアップデータ構造
        var backupData = {
            timestamp: new Date().toISOString(),
            textFiles: textContents,
            // 必要に応じて他のデータも追加
        };
        // バックアップファイルに書き込み
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
        console.log("\u77E5\u8B58\u30D9\u30FC\u30B9\u306E\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F: ".concat(backupFileName));
        return {
            success: true,
            message: "\u77E5\u8B58\u30D9\u30FC\u30B9\u306E\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F: ".concat(backupFileName),
            backupPath: backupPath
        };
    }
    catch (error) {
        console.error('知識ベースのバックアップ作成エラー:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : '不明なエラーが発生しました'
        };
    }
}
/**
 * 複数のドキュメントコンテンツをマージする
 * @param contents マージするコンテンツの配列
 * @returns マージされたコンテンツ
 */
function mergeDocumentContent(contents) {
    // 単純に改行で区切ってマージする
    return contents.join('\n\n---\n\n');
}
/**
 * 知識ベースのインデックスをロードする
 * @returns インデックスデータ
 */
function loadKnowledgeBaseIndex() {
    try {
        if (!fs.existsSync(INDEX_FILE)) {
            // インデックスファイルが存在しない場合は空のインデックスを返す
            return {
                documents: [],
                lastUpdated: new Date().toISOString()
            };
        }
        var indexContent = fs.readFileSync(INDEX_FILE, 'utf-8');
        return JSON.parse(indexContent);
    }
    catch (error) {
        console.error('知識ベースインデックス読み込みエラー:', error);
        // エラーが発生した場合も空のインデックスを返す
        return {
            documents: [],
            lastUpdated: new Date().toISOString(),
            error: error instanceof Error ? error.message : '不明なエラー'
        };
    }
}
/**
 * 知識ベースに保存されているドキュメントの一覧を取得する
 * @returns ドキュメントのメタデータ配列
 */
function listKnowledgeBaseDocuments() {
    try {
        // テキストファイルを取得
        var textFiles = fs.readdirSync(TEXT_DIR).filter(function (file) { return file.endsWith('.txt'); });
        // ファイル情報の配列を作成
        var documents = textFiles.map(function (file) {
            try {
                var stats = fs.statSync(path.join(TEXT_DIR, file));
                var content = fs.readFileSync(path.join(TEXT_DIR, file), 'utf-8');
                // ファイル名からメタデータを抽出
                var nameParts = file.split('_');
                var timestamp = parseInt(nameParts[nameParts.length - 1], 10) || stats.mtime.getTime();
                return {
                    id: file.replace('.txt', ''),
                    filename: file,
                    title: nameParts.slice(0, -1).join('_').replace(/_/g, ' '),
                    size: stats.size,
                    createdAt: new Date(timestamp).toISOString(),
                    lastModified: stats.mtime.toISOString(),
                    contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
                };
            }
            catch (error) {
                console.error("\u30D5\u30A1\u30A4\u30EB ".concat(file, " \u306E\u60C5\u5831\u53D6\u5F97\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:"), error);
                return {
                    id: file.replace('.txt', ''),
                    filename: file,
                    title: file.replace('.txt', ''),
                    error: error instanceof Error ? error.message : '不明なエラー'
                };
            }
        });
        // 新しい順に並べ替え
        documents.sort(function (a, b) {
            return new Date(b.createdAt || new Date()).getTime() - new Date(a.createdAt || new Date()).getTime();
        });
        return {
            success: true,
            documents: documents
        };
    }
    catch (error) {
        console.error('知識ベースドキュメント一覧取得エラー:', error);
        return {
            success: false,
            documents: [],
            message: error instanceof Error ? error.message : '不明なエラーが発生しました'
        };
    }
}
/**
 * 知識ベースからドキュメントを削除する
 * @param documentId ドキュメントID
 * @returns 削除結果
 */
function removeDocumentFromKnowledgeBase(documentId) {
    try {
        // ファイル名を作成（.txtが含まれていない場合は追加）
        var filename = documentId.endsWith('.txt') ? documentId : "".concat(documentId, ".txt");
        var filePath = path.join(TEXT_DIR, filename);
        // ファイルが存在するか確認
        if (!fs.existsSync(filePath)) {
            return {
                success: false,
                message: "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8 ".concat(documentId, " \u306F\u5B58\u5728\u3057\u307E\u305B\u3093")
            };
        }
        // ファイルを削除
        fs.unlinkSync(filePath);
        console.log("\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8 ".concat(documentId, " \u3092\u77E5\u8B58\u30D9\u30FC\u30B9\u304B\u3089\u524A\u9664\u3057\u307E\u3057\u305F"));
        return {
            success: true,
            message: "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8 ".concat(documentId, " \u3092\u77E5\u8B58\u30D9\u30FC\u30B9\u304B\u3089\u524A\u9664\u3057\u307E\u3057\u305F")
        };
    }
    catch (error) {
        console.error('ドキュメント削除エラー:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : '不明なエラーが発生しました'
        };
    }
}
