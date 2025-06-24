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
exports.registerDataProcessorRoutes = registerDataProcessorRoutes;
var fs_1 = require("fs");
var path_1 = require("path");
var multer_1 = require("multer");
var knowledge_base_1 = require("../lib/knowledge-base");
var document_processor_1 = require("../lib/document-processor");
var vite_1 = require("../vite");
// ファイル拡張子からドキュメントタイプを取得するヘルパー関数
function getFileTypeFromExtension(ext) {
    var extMap = {
        '.pdf': 'pdf',
        '.docx': 'word',
        '.doc': 'word',
        '.xlsx': 'excel',
        '.xls': 'excel',
        '.pptx': 'powerpoint',
        '.ppt': 'powerpoint',
        '.txt': 'text'
    };
    return extMap[ext] || 'unknown';
}
// ファイル拡張子から最適な処理タイプを決定するヘルパー関数
function determineOptimalProcessingTypes(ext, filename) {
    ext = ext.toLowerCase();
    filename = filename.toLowerCase();
    // 基本設定（すべて有効）
    var result = {
        forKnowledgeBase: true,
        forImageSearch: true,
        forQA: true,
        forEmergencyGuide: true
    };
    // ファイル名に特定のキーワードが含まれている場合、応急処置ガイド向けに優先
    if (filename.includes('応急') ||
        filename.includes('emergency') ||
        filename.includes('guide') ||
        filename.includes('ガイド') ||
        filename.includes('手順') ||
        filename.includes('procedure')) {
        result.forEmergencyGuide = true;
    }
    // 拡張子による調整
    switch (ext) {
        case '.pdf':
        case '.docx':
        case '.doc':
        case '.txt':
            // テキスト形式のドキュメントはナレッジベースとQ&Aに最適
            result.forKnowledgeBase = true;
            result.forQA = true;
            result.forImageSearch = false; // 画像はあまり重要ではない可能性
            break;
        case '.pptx':
        case '.ppt':
            // プレゼンテーションは画像検索と応急処置ガイドに最適
            result.forImageSearch = true;
            result.forEmergencyGuide = true;
            break;
        case '.xlsx':
        case '.xls':
            // スプレッドシートはデータ主体なのでナレッジベースに最適
            result.forKnowledgeBase = true;
            result.forImageSearch = false;
            break;
    }
    return result;
}
// ストレージ設定 - knowledge-baseに一元化
var storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        // 一時保存ディレクトリはknowledge-base内に配置
        var tempDir = path_1.default.join(process.cwd(), 'knowledge-base', 'temp');
        // ディレクトリの存在を確認し、ない場合は作成
        if (!fs_1.default.existsSync(tempDir)) {
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: function (req, file, cb) {
        // ファイル名に現在時刻のタイムスタンプを追加して一意にする
        var timestamp = Date.now();
        // 文字化け対策：latin1からUTF-8にデコード
        var decodedOriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        var originalExt = path_1.default.extname(decodedOriginalName);
        // サニタイズされたファイル名を生成
        var baseName = path_1.default.basename(decodedOriginalName, originalExt)
            .replace(/[\/\\:*?"<>|]/g, '')
            .replace(/\s+/g, '_');
        var filename = "".concat(baseName, "_").concat(timestamp).concat(originalExt);
        cb(null, filename);
    }
});
// アップロード設定
var upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB制限
    }
});
// 統合データ処理APIルートを登録
function registerDataProcessorRoutes(app) {
    var _this = this;
    // 統合データ処理API
    app.post('/api/data-processor/process', upload.single('file'), function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var filePath, originalName, fileExt, keepOriginalFile, processingTypes, extractKnowledgeBase, extractImageSearch, createQA, createEmergencyGuide, docId, processedDocument, result, timestamp, filename, fileExt_1, fileType, index, indexPath, openaiModule, generateQAPairs, qaPairs, fullText, qaDir, fileName, timestamp, qaFileName, qaError_1, guidesDir, timestamp, baseName, guideId_1, guideData, guideFilePath, jsonDir, metadataFilePath, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 12, , 13]);
                    if (!req.file) {
                        return [2 /*return*/, res.status(400).json({ error: 'ファイルがアップロードされていません' })];
                    }
                    filePath = req.file.path;
                    originalName = req.file.originalname;
                    fileExt = path_1.default.extname(originalName).toLowerCase();
                    keepOriginalFile = req.body.keepOriginalFile === 'true';
                    processingTypes = determineOptimalProcessingTypes(fileExt, originalName);
                    extractKnowledgeBase = processingTypes.forKnowledgeBase;
                    extractImageSearch = processingTypes.forImageSearch;
                    createQA = processingTypes.forQA;
                    createEmergencyGuide = processingTypes.forEmergencyGuide;
                    (0, vite_1.log)("\u30C7\u30FC\u30BF\u51E6\u7406\u3092\u958B\u59CB\u3057\u307E\u3059: ".concat(originalName));
                    (0, vite_1.log)("\u81EA\u52D5\u6C7A\u5B9A\u3055\u308C\u305F\u30AA\u30D7\u30B7\u30E7\u30F3: \u5143\u30D5\u30A1\u30A4\u30EB\u4FDD\u5B58=".concat(keepOriginalFile, ", \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9=").concat(extractKnowledgeBase, ", \u753B\u50CF\u691C\u7D22=").concat(extractImageSearch, ", Q&A=").concat(createQA, ", \u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9=").concat(createEmergencyGuide));
                    docId = '';
                    processedDocument = null;
                    return [4 /*yield*/, (0, document_processor_1.processDocument)(filePath)];
                case 1:
                    // 必ずドキュメントの処理は行う（後の処理で必要）
                    processedDocument = _a.sent();
                    if (!extractKnowledgeBase) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, knowledge_base_1.addDocumentToKnowledgeBase)({ originalname: path_1.default.basename(filePath), path: filePath, mimetype: 'text/plain' }, fs_1.default.readFileSync(filePath, 'utf-8'))];
                case 2:
                    result = _a.sent();
                    docId = result.success ? path_1.default.basename(filePath, path_1.default.extname(filePath)) : '';
                    (0, vite_1.log)("\u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u306B\u8FFD\u52A0\u3057\u307E\u3057\u305F: ".concat(docId));
                    return [3 /*break*/, 4];
                case 3:
                    if (extractImageSearch || createQA) {
                        timestamp = Date.now();
                        filename = path_1.default.basename(filePath);
                        fileExt_1 = path_1.default.extname(filename).toLowerCase();
                        fileType = getFileTypeFromExtension(fileExt_1);
                        // ユニークなIDを生成
                        docId = "doc_".concat(timestamp, "_").concat(Math.floor(Math.random() * 1000));
                        index = (0, knowledge_base_1.loadKnowledgeBaseIndex)();
                        index.documents.push({
                            id: docId,
                            title: filename,
                            path: filePath,
                            type: fileType,
                            chunkCount: 0, // 実際のチャンクはないが、表示用に追加
                            addedAt: new Date().toISOString()
                        });
                        indexPath = path_1.default.join(process.cwd(), 'knowledge-base', 'index.json');
                        fs_1.default.writeFileSync(indexPath, JSON.stringify(index, null, 2));
                        (0, vite_1.log)("\u753B\u50CF\u691C\u7D22/Q&A\u5C02\u7528\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u3068\u3057\u3066\u8FFD\u52A0: ".concat(docId));
                    }
                    _a.label = 4;
                case 4:
                    // 2. 画像検索用データの生成（画像の抽出とメタデータ生成）
                    if (extractImageSearch) {
                        // 既に処理されたドキュメントを使用
                        if (processedDocument) {
                            // 必要に応じて画像検索データにアイテムを追加
                            // 成功メッセージにはこの処理結果を含める
                            (0, vite_1.log)("\u753B\u50CF\u691C\u7D22\u7528\u30C7\u30FC\u30BF\u3092\u751F\u6210\u3057\u307E\u3057\u305F: ".concat(processedDocument.chunks.length, "\u30C1\u30E3\u30F3\u30AF"));
                        }
                    }
                    if (!createQA) return [3 /*break*/, 11];
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 10, , 11]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('../lib/openai'); })];
                case 6:
                    openaiModule = _a.sent();
                    generateQAPairs = openaiModule.generateQAPairs;
                    qaPairs = [];
                    if (!processedDocument) return [3 /*break*/, 8];
                    fullText = processedDocument.chunks.map(function (chunk) { return chunk.text; }).join("\n");
                    (0, vite_1.log)("Q&A\u751F\u6210\u7528\u306E\u30C6\u30AD\u30B9\u30C8\u6E96\u5099\u5B8C\u4E86: ".concat(fullText.length, "\u6587\u5B57"));
                    return [4 /*yield*/, generateQAPairs(fullText, 10)];
                case 7:
                    // Q&Aペアを生成
                    qaPairs = _a.sent();
                    (0, vite_1.log)("".concat(qaPairs.length, "\u500B\u306EQ&A\u30DA\u30A2\u3092\u751F\u6210\u3057\u307E\u3057\u305F"));
                    qaDir = path_1.default.join(process.cwd(), 'knowledge-base', 'qa');
                    if (!fs_1.default.existsSync(qaDir)) {
                        fs_1.default.mkdirSync(qaDir, { recursive: true });
                    }
                    fileName = path_1.default.basename(filePath, path_1.default.extname(filePath));
                    timestamp = Date.now();
                    qaFileName = "".concat(fileName, "_qa_").concat(timestamp, ".json");
                    // Q&AペアをJSONファイルとして保存
                    fs_1.default.writeFileSync(path_1.default.join(qaDir, qaFileName), JSON.stringify({
                        source: filePath,
                        fileName: path_1.default.basename(filePath),
                        timestamp: new Date().toISOString(),
                        qaPairs: qaPairs
                    }, null, 2));
                    (0, vite_1.log)("Q&A\u30C7\u30FC\u30BF\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F: ".concat(qaFileName));
                    return [3 /*break*/, 9];
                case 8: throw new Error('Q&A生成のためのドキュメント処理が完了していません');
                case 9: return [3 /*break*/, 11];
                case 10:
                    qaError_1 = _a.sent();
                    (0, vite_1.log)("Q&A\u751F\u6210\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: ".concat(qaError_1));
                    return [3 /*break*/, 11];
                case 11:
                    // 4. 応急処置ガイド用の処理
                    if (createEmergencyGuide) {
                        try {
                            (0, vite_1.log)("\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u7528\u306B\u51E6\u7406\u3092\u958B\u59CB\u3057\u307E\u3059: ".concat(originalName));
                            // 既に処理されたドキュメントを使用
                            if (processedDocument) {
                                // ドキュメントから抽出された画像がある場合
                                if (processedDocument.images && processedDocument.images.length > 0) {
                                    guidesDir = path_1.default.join(process.cwd(), 'knowledge-base', 'troubleshooting');
                                    if (!fs_1.default.existsSync(guidesDir)) {
                                        fs_1.default.mkdirSync(guidesDir, { recursive: true });
                                    }
                                    timestamp = Date.now();
                                    baseName = path_1.default.basename(filePath, path_1.default.extname(filePath))
                                        .replace(/[\/\\:*?"<>|]/g, '')
                                        .replace(/\s+/g, '_');
                                    guideId_1 = "guide_".concat(timestamp);
                                    guideData = {
                                        id: guideId_1,
                                        title: originalName.split('.')[0] || 'ガイド',
                                        createdAt: new Date().toISOString(),
                                        steps: processedDocument.images.map(function (image, index) {
                                            // 各画像をステップとして登録
                                            return {
                                                id: "".concat(guideId_1, "_step").concat(index + 1),
                                                title: "\u30B9\u30C6\u30C3\u30D7 ".concat(index + 1),
                                                description: image.alt || "\u624B\u9806\u8AAC\u660E ".concat(index + 1),
                                                imageUrl: image.path ? "/knowledge-base/".concat(image.path.split('/knowledge-base/')[1] || image.path) : '',
                                                order: index + 1
                                            };
                                        })
                                    };
                                    guideFilePath = path_1.default.join(guidesDir, "".concat(baseName, "_").concat(timestamp, ".json"));
                                    fs_1.default.writeFileSync(guideFilePath, JSON.stringify(guideData, null, 2));
                                    (0, vite_1.log)("\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F: ".concat(guideFilePath, " (").concat(guideData.steps.length, "\u30B9\u30C6\u30C3\u30D7)"));
                                    jsonDir = path_1.default.join(process.cwd(), 'knowledge-base', 'json');
                                    if (!fs_1.default.existsSync(jsonDir)) {
                                        fs_1.default.mkdirSync(jsonDir, { recursive: true });
                                    }
                                    metadataFilePath = path_1.default.join(jsonDir, "".concat(guideId_1, "_metadata.json"));
                                    fs_1.default.writeFileSync(metadataFilePath, JSON.stringify({
                                        id: guideId_1,
                                        title: originalName.split('.')[0] || 'ガイド',
                                        createdAt: new Date().toISOString(),
                                        slides: guideData.steps.map(function (step, idx) { return ({
                                            slideId: "slide".concat(idx + 1),
                                            title: step.title,
                                            content: step.description,
                                            imageUrl: step.imageUrl,
                                            order: step.order
                                        }); })
                                    }, null, 2));
                                    (0, vite_1.log)("\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u306E\u30E1\u30BF\u30C7\u30FC\u30BF\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F: ".concat(metadataFilePath));
                                }
                                else {
                                    (0, vite_1.log)("\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u4F5C\u6210\u306B\u5FC5\u8981\u306A\u753B\u50CF\u304C\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u304B\u3089\u62BD\u51FA\u3055\u308C\u307E\u305B\u3093\u3067\u3057\u305F");
                                }
                            }
                            else {
                                (0, vite_1.log)("\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u751F\u6210\u306E\u305F\u3081\u306E\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u51E6\u7406\u304C\u5B8C\u4E86\u3057\u3066\u3044\u307E\u305B\u3093");
                            }
                        }
                        catch (guideError) {
                            (0, vite_1.log)("\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u751F\u6210\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: ".concat(guideError));
                            // ガイド生成エラーは処理を継続
                        }
                    }
                    // 4. 処理が完了したら、元のファイルを削除するか保存するかの指定により分岐
                    if (!keepOriginalFile) {
                        try {
                            // 元のファイルを削除
                            fs_1.default.unlinkSync(filePath);
                            (0, vite_1.log)("\u5143\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(filePath));
                        }
                        catch (deleteError) {
                            (0, vite_1.log)("\u5143\u30D5\u30A1\u30A4\u30EB\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(deleteError));
                            // 削除失敗はエラーにはしない
                        }
                    }
                    else {
                        (0, vite_1.log)("\u5143\u30D5\u30A1\u30A4\u30EB\u3092\u4FDD\u5B58\u3057\u307E\u3059: ".concat(filePath));
                    }
                    // 処理成功レスポンス
                    return [2 /*return*/, res.status(200).json({
                            success: true,
                            docId: docId,
                            message: '処理が完了しました',
                            options: {
                                keepOriginalFile: keepOriginalFile,
                                extractKnowledgeBase: extractKnowledgeBase,
                                extractImageSearch: extractImageSearch,
                                createQA: createQA,
                                createEmergencyGuide: createEmergencyGuide
                            }
                        })];
                case 12:
                    error_1 = _a.sent();
                    console.error('データ処理エラー:', error_1);
                    return [2 /*return*/, res.status(500).json({
                            error: '処理中にエラーが発生しました',
                            message: error_1 instanceof Error ? error_1.message : '不明なエラーです'
                        })];
                case 13: return [2 /*return*/];
            }
        });
    }); });
    // 画像検索データの初期化API（既存のもの）
    app.post('/api/data-processor/init-image-search', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var initResponse, data, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch('http://localhost:5000/api/tech-support/init-image-search-data', {
                            method: 'POST'
                        })];
                case 1:
                    initResponse = _a.sent();
                    if (!initResponse.ok) {
                        throw new Error('画像検索データの初期化に失敗しました');
                    }
                    return [4 /*yield*/, initResponse.json()];
                case 2:
                    data = _a.sent();
                    return [2 /*return*/, res.status(200).json(data)];
                case 3:
                    error_2 = _a.sent();
                    console.error('画像検索データ初期化エラー:', error_2);
                    return [2 /*return*/, res.status(500).json({
                            error: '初期化中にエラーが発生しました',
                            message: error_2 instanceof Error ? error_2.message : '不明なエラーです'
                        })];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    // ナレッジベースの差分更新API
    app.post('/api/data-processor/merge', upload.single('file'), function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var targetDocId, filePath, newDocument, mergedContent, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    if (!req.file) {
                        return [2 /*return*/, res.status(400).json({ error: 'ファイルがアップロードされていません' })];
                    }
                    targetDocId = req.body.targetDocId;
                    if (!targetDocId) {
                        return [2 /*return*/, res.status(400).json({ error: '更新対象のドキュメントIDが指定されていません' })];
                    }
                    (0, vite_1.log)("\u5DEE\u5206\u66F4\u65B0\u3092\u958B\u59CB\u3057\u307E\u3059: \u30BF\u30FC\u30B2\u30C3\u30C8ID=".concat(targetDocId, ", \u30D5\u30A1\u30A4\u30EB=").concat(req.file.originalname));
                    filePath = req.file.path;
                    return [4 /*yield*/, (0, document_processor_1.processDocument)(filePath)];
                case 1:
                    newDocument = _a.sent();
                    mergedContent = (0, knowledge_base_1.mergeDocumentContent)([JSON.stringify(newDocument)]);
                    // 元ファイルを削除
                    try {
                        fs_1.default.unlinkSync(filePath);
                        (0, vite_1.log)("\u5143\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(filePath));
                    }
                    catch (deleteError) {
                        (0, vite_1.log)("\u5143\u30D5\u30A1\u30A4\u30EB\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(deleteError));
                    }
                    return [2 /*return*/, res.status(200).json({
                            success: true,
                            message: '差分更新が完了しました',
                            targetDocId: targetDocId
                        })];
                case 2:
                    error_3 = _a.sent();
                    console.error('差分更新エラー:', error_3);
                    return [2 /*return*/, res.status(500).json({
                            error: '差分更新中にエラーが発生しました',
                            message: error_3 instanceof Error ? error_3.message : '不明なエラーです'
                        })];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // ナレッジベース文書一覧取得API
    app.get('/api/data-processor/documents', function (req, res) {
        try {
            var index = (0, knowledge_base_1.loadKnowledgeBaseIndex)();
            return res.status(200).json({
                success: true,
                documents: index.documents.map(function (doc) { return ({
                    id: doc.id,
                    title: doc.title,
                    type: doc.type,
                    chunkCount: doc.chunkCount,
                    addedAt: doc.addedAt
                }); })
            });
        }
        catch (error) {
            console.error('ドキュメント一覧取得エラー:', error);
            return res.status(500).json({
                error: 'ドキュメント一覧取得中にエラーが発生しました',
                message: error instanceof Error ? error.message : '不明なエラーです'
            });
        }
    });
    // ナレッジベースバックアップAPI
    app.post('/api/data-processor/backup', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var docIds, zipFilePath, relativePath, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    docIds = req.body.docIds;
                    if (!Array.isArray(docIds)) {
                        return [2 /*return*/, res.status(400).json({ error: 'ドキュメントIDのリストが必要です' })];
                    }
                    (0, vite_1.log)("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u4F5C\u6210\u958B\u59CB: ".concat(docIds.length, "\u500B\u306E\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8"));
                    return [4 /*yield*/, (0, knowledge_base_1.backupKnowledgeBase)()];
                case 1:
                    zipFilePath = _a.sent();
                    relativePath = path_1.default.relative(process.cwd(), zipFilePath.backupPath || '');
                    return [2 /*return*/, res.status(200).json({
                            success: true,
                            backupPath: relativePath,
                            message: 'バックアップが作成されました'
                        })];
                case 2:
                    error_4 = _a.sent();
                    console.error('バックアップエラー:', error_4);
                    return [2 /*return*/, res.status(500).json({
                            error: 'バックアップ中にエラーが発生しました',
                            message: error_4 instanceof Error ? error_4.message : '不明なエラーです'
                        })];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // バックアップファイルのダウンロード
    app.get('/api/data-processor/download-backup/:filename', function (req, res) {
        try {
            var filename = req.params.filename;
            var backupDir = path_1.default.join(process.cwd(), 'knowledge-base', 'backups');
            var filePath = path_1.default.join(backupDir, filename);
            // パスのバリデーション（ディレクトリトラバーサル対策）
            if (!filePath.startsWith(backupDir) || filePath.includes('..')) {
                return res.status(400).json({ error: '不正なファイルパスです' });
            }
            // ファイルの存在確認
            if (!fs_1.default.existsSync(filePath)) {
                return res.status(404).json({ error: 'ファイルが見つかりません' });
            }
            // ファイルのダウンロード
            return res.download(filePath);
        }
        catch (error) {
            console.error('バックアップダウンロードエラー:', error);
            return res.status(500).json({
                error: 'ダウンロード中にエラーが発生しました',
                message: error instanceof Error ? error.message : '不明なエラーです'
            });
        }
    });
}
