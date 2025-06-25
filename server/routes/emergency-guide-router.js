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
exports.emergencyGuideRouter = void 0;
var express_1 = require("express");
var fs = require("fs");
var path = require("path");
var multer_1 = require("multer");
var adm_zip_1 = require("adm-zip");
var node_fetch_1 = require("node-fetch");
var vite_1 = require("../vite");
var router = (0, express_1.Router)();
// 知識ベースディレクトリの設定 - uploadsフォルダの使用を廃止
var knowledgeBaseDir = path.resolve('./knowledge-base');
var kbPptDir = path.join(knowledgeBaseDir, 'ppt');
var kbJsonDir = path.join(knowledgeBaseDir, 'json');
var kbImageDir = path.join(knowledgeBaseDir, 'images');
var kbTempDir = path.join(knowledgeBaseDir, 'temp');
// ディレクトリの存在確認と作成
[knowledgeBaseDir, kbPptDir, kbJsonDir, kbImageDir, kbTempDir].forEach(function (dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});
// クリーンアップ処理：問題となるファイルを削除 (開発用)
var cleanupSpecificFiles = function () {
    try {
        // 問題のあるガイドファイルを確認して削除
        var problemFile = path.join(kbJsonDir, 'guide_1744876404679_metadata.json');
        if (fs.existsSync(problemFile)) {
            console.log('問題となるファイルを削除します:', problemFile);
            fs.unlinkSync(problemFile);
        }
        // 関連する画像を削除
        if (fs.existsSync(kbImageDir)) {
            var imageFiles = fs.readdirSync(kbImageDir);
            var relatedImages = imageFiles.filter(function (img) { return img.startsWith('guide_1744876404679'); });
            relatedImages.forEach(function (imgFile) {
                var imgPath = path.join(kbImageDir, imgFile);
                if (fs.existsSync(imgPath)) {
                    fs.unlinkSync(imgPath);
                    console.log('関連画像を削除しました:', imgPath);
                }
            });
        }
    }
    catch (error) {
        console.error('クリーンアップ中にエラーが発生しました:', error);
    }
};
// アプリケーション起動時にクリーンアップを実行
cleanupSpecificFiles();
// Multerの設定
var storage = multer_1.default.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, kbPptDir);
    },
    filename: function (_req, file, cb) {
        var timestamp = Date.now();
        var originalName = file.originalname;
        var extension = path.extname(originalName);
        var fileName = "guide_".concat(timestamp).concat(extension);
        cb(null, fileName);
    }
});
// ファイルフィルター（PPTX、PDFとJSONを許可）
var fileFilter = function (_req, file, cb) {
    var allowedExtensions = ['.pptx', '.ppt', '.pdf', '.xlsx', '.xls', '.json'];
    var ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error('サポートされていないファイル形式です。PowerPoint (.pptx, .ppt)、Excel (.xlsx, .xls)、PDF (.pdf)、またはJSON (.json) ファイルのみアップロードできます。'));
    }
};
var upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    }
});
// PowerPoint（PPTX）ファイルを処理してJSONデータに変換する関数
function processPowerPointFile(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var fileId, fileExtension, zip, extractDir, slidesDir, slideFiles, slides, i, slideNumber, slideFilePath, slideContent, imageRefs, imageRegex, match, textRegex, texts, noteFilePath, noteContent, noteXml, noteRegex, imageTexts, mediaDir, mediaFiles, _i, mediaFiles_1, mediaFile, sourcePath, targetFileName, targetPath, relativePath, imageText, corePropsPath, title, creator, created, modified, coreProps, titleMatch, creatorMatch, createdMatch, modifiedMatch, result, kbJsonFilePath;
        return __generator(this, function (_a) {
            try {
                fileId = "guide_".concat(Date.now());
                fileExtension = path.extname(filePath);
                // PPTXファイルを解凍してXMLとして処理
                if (fileExtension.toLowerCase() === '.pptx') {
                    zip = new adm_zip_1.default(filePath);
                    extractDir = path.join(kbTempDir, fileId);
                    // 一時ディレクトリが存在しない場合は作成
                    if (!fs.existsSync(kbTempDir)) {
                        fs.mkdirSync(kbTempDir, { recursive: true });
                    }
                    if (!fs.existsSync(extractDir)) {
                        fs.mkdirSync(extractDir, { recursive: true });
                    }
                    // ZIPとして展開
                    zip.extractAllTo(extractDir, true);
                    slidesDir = path.join(extractDir, 'ppt', 'slides');
                    slideFiles = fs.existsSync(slidesDir)
                        ? fs.readdirSync(slidesDir).filter(function (file) { return file.startsWith('slide') && file.endsWith('.xml'); })
                        : [];
                    slides = [];
                    for (i = 0; i < slideFiles.length; i++) {
                        slideNumber = i + 1;
                        slideFilePath = path.join(slidesDir, slideFiles[i]);
                        slideContent = fs.readFileSync(slideFilePath, 'utf8');
                        imageRefs = [];
                        imageRegex = /r:embed="rId(\d+)"/g;
                        match = void 0;
                        while ((match = imageRegex.exec(slideContent)) !== null) {
                            imageRefs.push(match[1]);
                        }
                        textRegex = /<a:t>(.*?)<\/a:t>/g;
                        texts = [];
                        while ((match = textRegex.exec(slideContent)) !== null) {
                            if (match[1].trim()) {
                                texts.push(match[1].trim());
                            }
                        }
                        noteFilePath = path.join(extractDir, 'ppt', 'notesSlides', "notesSlide".concat(slideNumber, ".xml"));
                        noteContent = '';
                        if (fs.existsSync(noteFilePath)) {
                            noteXml = fs.readFileSync(noteFilePath, 'utf8');
                            noteRegex = /<a:t>(.*?)<\/a:t>/g;
                            while ((match = noteRegex.exec(noteXml)) !== null) {
                                if (match[1].trim()) {
                                    noteContent += match[1].trim() + '\n';
                                }
                            }
                        }
                        imageTexts = [];
                        mediaDir = path.join(extractDir, 'ppt', 'media');
                        if (fs.existsSync(mediaDir)) {
                            mediaFiles = fs.readdirSync(mediaDir);
                            // 各画像ファイルを処理
                            for (_i = 0, mediaFiles_1 = mediaFiles; _i < mediaFiles_1.length; _i++) {
                                mediaFile = mediaFiles_1[_i];
                                sourcePath = path.join(mediaDir, mediaFile);
                                targetFileName = "".concat(fileId, "_slide").concat(slideNumber, "_").concat(mediaFile);
                                targetPath = path.join(kbImageDir, targetFileName);
                                // 画像をコピー
                                fs.copyFileSync(sourcePath, targetPath);
                                relativePath = "/knowledge-base/images/".concat(targetFileName);
                                imageText = texts.length > 0 ? texts[0] : '画像の説明がありません';
                                imageTexts.push({
                                    画像パス: relativePath,
                                    テキスト: imageText
                                });
                            }
                        }
                        // スライドデータの構築
                        slides.push({
                            スライド番号: slideNumber,
                            タイトル: texts.length > 0 ? texts[0] : "\u30B9\u30E9\u30A4\u30C9 ".concat(slideNumber),
                            本文: texts.slice(1), // 先頭（タイトル）以外のテキスト
                            ノート: noteContent,
                            画像テキスト: imageTexts
                        });
                    }
                    corePropsPath = path.join(extractDir, 'docProps', 'core.xml');
                    title = path.basename(filePath, fileExtension);
                    creator = '';
                    created = new Date().toISOString();
                    modified = new Date().toISOString();
                    if (fs.existsSync(corePropsPath)) {
                        coreProps = fs.readFileSync(corePropsPath, 'utf8');
                        titleMatch = /<dc:title>(.*?)<\/dc:title>/g.exec(coreProps);
                        if (titleMatch && titleMatch[1]) {
                            title = titleMatch[1];
                        }
                        creatorMatch = /<dc:creator>(.*?)<\/dc:creator>/g.exec(coreProps);
                        if (creatorMatch && creatorMatch[1]) {
                            creator = creatorMatch[1];
                        }
                        createdMatch = /<dcterms:created>(.*?)<\/dcterms:created>/g.exec(coreProps);
                        if (createdMatch && createdMatch[1]) {
                            created = createdMatch[1];
                        }
                        modifiedMatch = /<dcterms:modified>(.*?)<\/dcterms:modified>/g.exec(coreProps);
                        if (modifiedMatch && modifiedMatch[1]) {
                            modified = modifiedMatch[1];
                        }
                    }
                    // 一時ディレクトリを削除
                    fs.rmSync(extractDir, { recursive: true, force: true });
                    result = {
                        metadata: {
                            タイトル: title,
                            作成者: creator || 'Unknown',
                            作成日: created,
                            修正日: modified,
                            説明: "PowerPoint\u304B\u3089\u751F\u6210\u3055\u308C\u305F\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u300C".concat(title, "\u300D\u3067\u3059\u3002\u63A5\u7D9A\u756A\u53F7: 123")
                        },
                        slides: slides
                    };
                    kbJsonFilePath = path.join(kbJsonDir, "".concat(fileId, "_metadata.json"));
                    fs.writeFileSync(kbJsonFilePath, JSON.stringify(result, null, 2));
                    return [2 /*return*/, {
                            id: fileId,
                            filePath: kbJsonFilePath,
                            fileName: path.basename(filePath),
                            title: title,
                            createdAt: new Date().toISOString(),
                            slideCount: slides.length,
                            data: result
                        }];
                }
                else {
                    throw new Error('サポートされていないファイル形式です');
                }
            }
            catch (error) {
                console.error('PowerPointファイル処理エラー:', error);
                throw error;
            }
            return [2 /*return*/];
        });
    });
}
// JSONファイルを処理する関数
function processJsonFile(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var fileId, fileContent, jsonData, _i, _a, step, kbJsonFilePath, title, slideCount;
        return __generator(this, function (_b) {
            try {
                fileId = "guide_".concat(Date.now());
                console.log("JSON\u30D5\u30A1\u30A4\u30EB\u51E6\u7406: ID=".concat(fileId));
                // 知識ベースディレクトリが存在することを確認
                if (!fs.existsSync(kbJsonDir)) {
                    fs.mkdirSync(kbJsonDir, { recursive: true });
                    console.log("\u77E5\u8B58\u30D9\u30FC\u30B9JSON\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u4F5C\u6210: ".concat(kbJsonDir));
                }
                fileContent = fs.readFileSync(filePath, 'utf8');
                jsonData = JSON.parse(fileContent);
                // ファイルパスとファイル名をログ出力
                console.log("\u5143\u306E\u30D5\u30A1\u30A4\u30EB\u30D1\u30B9: ".concat(filePath));
                console.log("\u5143\u306E\u30D5\u30A1\u30A4\u30EB\u540D: ".concat(path.basename(filePath)));
                // アップロードされた画像パスがある場合、相対パスに変換
                if (jsonData.steps) {
                    for (_i = 0, _a = jsonData.steps; _i < _a.length; _i++) {
                        step = _a[_i];
                        if (step.imageUrl && step.imageUrl.startsWith('/uploads/')) {
                            step.imageUrl = step.imageUrl.replace('/uploads/', '/knowledge-base/');
                        }
                    }
                }
                kbJsonFilePath = path.join(kbJsonDir, "".concat(fileId, "_metadata.json"));
                console.log("\u4FDD\u5B58\u5148\u30D5\u30A1\u30A4\u30EB\u30D1\u30B9: ".concat(kbJsonFilePath));
                // JSONデータを文字列に変換して保存（コピーではなく書き込み）
                fs.writeFileSync(kbJsonFilePath, JSON.stringify(jsonData, null, 2));
                console.log("\u30D5\u30A1\u30A4\u30EB\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F: ".concat(kbJsonFilePath));
                title = jsonData.title || path.basename(filePath, '.json');
                slideCount = jsonData.steps ? jsonData.steps.length : 0;
                return [2 /*return*/, {
                        id: fileId,
                        filePath: kbJsonFilePath,
                        fileName: path.basename(filePath),
                        title: title,
                        createdAt: new Date().toISOString(),
                        slideCount: slideCount,
                        data: jsonData
                    }];
            }
            catch (error) {
                console.error('JSONファイル処理エラー:', error);
                throw error;
            }
            return [2 /*return*/];
        });
    });
}
// ファイルアップロードと処理のエンドポイント
router.post('/process', upload.single('file'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var autoGenerateFlow, filePath, fileExtension, result, knowledgeBaseDir_1, knowledgeBaseImagesDir, responseData, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                if (!req.file) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'ファイルがアップロードされていません' })];
                }
                autoGenerateFlow = req.body.autoGenerateFlow === 'true';
                filePath = req.file.path;
                fileExtension = path.extname(filePath).toLowerCase();
                result = void 0;
                if (!(fileExtension === '.json')) return [3 /*break*/, 2];
                (0, vite_1.log)("JSON\u30D5\u30A1\u30A4\u30EB\u51E6\u7406: ".concat(filePath));
                return [4 /*yield*/, processJsonFile(filePath)];
            case 1:
                result = _a.sent();
                return [3 /*break*/, 5];
            case 2:
                if (!['.pptx', '.ppt'].includes(fileExtension)) return [3 /*break*/, 4];
                (0, vite_1.log)("PowerPoint\u30D5\u30A1\u30A4\u30EB\u51E6\u7406: ".concat(filePath));
                return [4 /*yield*/, processPowerPointFile(filePath)];
            case 3:
                result = _a.sent();
                return [3 /*break*/, 5];
            case 4: return [2 /*return*/, res.status(400).json({
                    success: false,
                    error: 'サポートされていないファイル形式です。現在の処理はPowerPointとJSONのみサポートしています。'
                })];
            case 5:
                // JSONに保存されている画像パスがナレッジベース形式に変換されていることを確認
                if (fileExtension === '.json') {
                    knowledgeBaseDir_1 = path.join('knowledge-base');
                    if (!fs.existsSync(knowledgeBaseDir_1)) {
                        fs.mkdirSync(knowledgeBaseDir_1, { recursive: true });
                    }
                    knowledgeBaseImagesDir = path.join(knowledgeBaseDir_1, 'images');
                    if (!fs.existsSync(knowledgeBaseImagesDir)) {
                        fs.mkdirSync(knowledgeBaseImagesDir, { recursive: true });
                    }
                }
                responseData = {
                    success: true,
                    message: 'ファイルが正常に処理されました',
                    guideId: result.id,
                    data: result
                };
                // 自動フロー生成が有効な場合は、非同期でフロー生成プロセスを開始
                if (autoGenerateFlow) {
                    // まずレスポンスを返してクライアントを待たせない
                    res.json(responseData);
                    try {
                        console.log("\u81EA\u52D5\u30D5\u30ED\u30FC\u751F\u6210\u3092\u958B\u59CB: ".concat(result.id));
                        // 別プロセスでフロー生成APIを呼び出す（バックグラウンド処理）
                        (0, node_fetch_1.default)("http://localhost:".concat(process.env.PORT || 3000, "/api/flow-generator/generate-from-guide/").concat(result.id), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }).then(function (response) { return __awaiter(void 0, void 0, void 0, function () {
                            var generationResult, _a, _b, _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        if (!response.ok) return [3 /*break*/, 2];
                                        return [4 /*yield*/, response.json()];
                                    case 1:
                                        generationResult = _d.sent();
                                        console.log("\u30D5\u30ED\u30FC\u751F\u6210\u6210\u529F: ".concat(generationResult.flowData.id));
                                        return [3 /*break*/, 4];
                                    case 2:
                                        _b = (_a = console).error;
                                        _c = ['フロー生成エラー:'];
                                        return [4 /*yield*/, response.text()];
                                    case 3:
                                        _b.apply(_a, _c.concat([_d.sent()]));
                                        _d.label = 4;
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); }).catch(function (err) {
                            console.error('フロー生成リクエストエラー:', err);
                        });
                    }
                    catch (error) {
                        console.error('自動フロー生成開始エラー:', error);
                        // エラーが発生してもクライアントには既にレスポンスを返しているので何もしない
                    }
                    // レスポンスは既に返しているのでここでは何もしない
                    return [2 /*return*/];
                }
                // 自動フロー生成が無効な場合は通常のレスポンスを返す
                return [2 /*return*/, res.json(responseData)];
            case 6:
                error_1 = _a.sent();
                console.error('ファイル処理エラー:', error_1);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: error_1 instanceof Error ? error_1.message : '不明なエラーが発生しました'
                    })];
            case 7: return [2 /*return*/];
        }
    });
}); });
// ガイドファイル一覧を取得するエンドポイント
router.get('/list', function (_req, res) {
    try {
        console.log('ガイド一覧を取得します...');
        // 知識ベースディレクトリからファイルを読み取る
        if (!fs.existsSync(kbJsonDir)) {
            return res.status(404).json({ error: 'ディレクトリが見つかりません' });
        }
        // キャッシュバスティングのためにファイル一覧を再スキャン
        var allFiles = fs.readdirSync(kbJsonDir);
        console.log('全ファイル一覧:', allFiles);
        // 特定のファイルを除外するためのブラックリスト
        var blacklist_1 = ['guide_1744876404679_metadata.json'];
        // メタデータファイルのみをフィルタリング（かつブラックリストを除外）
        var files = allFiles
            .filter(function (file) { return file.endsWith('_metadata.json') && !blacklist_1.includes(file); });
        console.log('フィルタリング後のメタデータファイル一覧:', files);
        var guides = files.map(function (file) {
            try {
                var filePath = path.join(kbJsonDir, file);
                var content = fs.readFileSync(filePath, 'utf8');
                var data = JSON.parse(content);
                var id = file.split('_')[0] + '_' + file.split('_')[1];
                // JSONデータの形式に応じて処理
                // 通常のPowerPoint由来の形式
                if (data.metadata && data.slides) {
                    return {
                        id: id,
                        filePath: filePath,
                        fileName: data.metadata.タイトル || "\u30D5\u30A1\u30A4\u30EB_".concat(id),
                        title: data.metadata.タイトル || "\u30D5\u30A1\u30A4\u30EB_".concat(id),
                        createdAt: data.metadata.作成日,
                        slideCount: data.slides.length
                    };
                }
                // JSON由来の応急処置フロー形式
                else if (data.title && data.steps) {
                    return {
                        id: id,
                        filePath: filePath,
                        fileName: data.title || "\u30D5\u30ED\u30FC_".concat(id),
                        title: data.title || "\u30D5\u30ED\u30FC_".concat(id),
                        createdAt: data.createdAt || new Date().toISOString(),
                        slideCount: data.steps.length
                    };
                }
                // その他の形式の場合はファイル名をタイトルとして使用
                else {
                    return {
                        id: id,
                        filePath: filePath,
                        fileName: "\u30D5\u30A1\u30A4\u30EB_".concat(id),
                        title: "\u30D5\u30A1\u30A4\u30EB_".concat(id),
                        createdAt: new Date().toISOString(),
                        slideCount: 0
                    };
                }
            }
            catch (err) {
                console.error("\u30D5\u30A1\u30A4\u30EB\u51E6\u7406\u30A8\u30E9\u30FC: ".concat(file), err);
                // エラーの場合は最低限の情報を返す
                var id = file.split('_')[0] + '_' + file.split('_')[1];
                return {
                    id: id,
                    filePath: path.join(kbJsonDir, file),
                    fileName: "\u30A8\u30E9\u30FC\u30D5\u30A1\u30A4\u30EB_".concat(id),
                    title: "\u30A8\u30E9\u30FC\u30D5\u30A1\u30A4\u30EB_".concat(id),
                    createdAt: new Date().toISOString(),
                    slideCount: 0
                };
            }
        });
        // リスト取得前の最終状態チェック（完全にファイルシステムと同期するため）
        console.log('応急ガイド一覧をレスポンス送信前に最終検証:');
        console.log('- JSONディレクトリの内容:', fs.readdirSync(kbJsonDir));
        console.log('- 返却するガイド数:', guides.length);
        console.log('- ガイドID一覧:', guides.map(function (g) { return g.id; }).join(', '));
        // ヘッダーの追加でキャッシュを無効化
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        // レスポンスを返す
        res.json(guides);
    }
    catch (error) {
        console.error('ガイド一覧取得エラー:', error);
        res.status(500).json({ error: 'ガイド一覧の取得に失敗しました' });
    }
});
// 特定のガイド詳細データを取得するエンドポイント
router.get('/detail/:id', function (req, res) {
    try {
        var id_1 = req.params.id;
        var files = fs.readdirSync(kbJsonDir)
            .filter(function (file) { return file.startsWith(id_1) && file.endsWith('_metadata.json'); });
        if (files.length === 0) {
            return res.status(404).json({ error: 'ガイドが見つかりません' });
        }
        var filePath = path.join(kbJsonDir, files[0]);
        var content = fs.readFileSync(filePath, 'utf8');
        var data = JSON.parse(content);
        // アップロードパス(/uploads/)からナレッジベースパス(/knowledge-base/)への変換
        // スライド内の画像パスを更新
        if (data.slides && Array.isArray(data.slides)) {
            data.slides.forEach(function (slide) {
                if (slide.画像テキスト && Array.isArray(slide.画像テキスト)) {
                    slide.画像テキスト.forEach(function (imgText) {
                        if (imgText.画像パス && imgText.画像パス.startsWith('/uploads/')) {
                            // パスを/knowledge-baseに置き換え
                            imgText.画像パス = imgText.画像パス.replace('/uploads/', '/knowledge-base/');
                            console.log("\u753B\u50CF\u30D1\u30B9\u3092\u66F4\u65B0: ".concat(imgText.画像パス));
                        }
                    });
                }
            });
        }
        // JSONファイル内のデータが修正されたらファイルも更新（オプション）
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        res.json({
            id: id_1,
            filePath: filePath,
            fileName: files[0],
            data: data
        });
    }
    catch (error) {
        console.error('ガイド詳細取得エラー:', error);
        res.status(500).json({ error: 'ガイド詳細の取得に失敗しました' });
    }
});
// ガイドデータを更新するエンドポイント
router.post('/update/:id', function (req, res) {
    try {
        var id_2 = req.params.id;
        var data = req.body.data;
        if (!data) {
            return res.status(400).json({ error: 'データが提供されていません' });
        }
        var files = fs.readdirSync(kbJsonDir)
            .filter(function (file) { return file.startsWith(id_2) && file.endsWith('_metadata.json'); });
        if (files.length === 0) {
            return res.status(404).json({ error: 'ガイドが見つかりません' });
        }
        var filePath = path.join(kbJsonDir, files[0]);
        // 更新日時を現在の日時に設定
        if (data.metadata) {
            data.metadata.修正日 = new Date().toISOString();
        }
        // ファイルに書き込み
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        res.json({
            success: true,
            message: 'ガイドデータが更新されました',
            id: id_2
        });
    }
    catch (error) {
        console.error('ガイド更新エラー:', error);
        res.status(500).json({ error: 'ガイドの更新に失敗しました' });
    }
});
// ガイドデータを削除するエンドポイント
router.delete('/delete/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id_3, jsonFiles, matchingFiles_3, idPrefix_1, mainFilePath, title, content, data, deletedCount, _i, matchingFiles_1, file, filePath, indexPath, indexContent, indexData, beforeCount, afterCount, imageFiles, relatedImages, _a, relatedImages_1, imgFile, imgPath, remainingFiles, attempt, allDeleted, _b, matchingFiles_2, file, filePath, e_1, error_2;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 11, , 12]);
                id_3 = req.params.id;
                console.log("\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u524A\u9664\u30EA\u30AF\u30A8\u30B9\u30C8: ID=".concat(id_3));
                // 知識ベースJson（メタデータ）ディレクトリから直接ファイルを検索
                if (!fs.existsSync(kbJsonDir)) {
                    return [2 /*return*/, res.status(404).json({ error: 'JSONディレクトリが見つかりません' })];
                }
                jsonFiles = fs.readdirSync(kbJsonDir);
                console.log("\u524A\u9664\u51E6\u7406: ID=".concat(id_3, ", \u30D5\u30A1\u30A4\u30EB\u4E00\u89A7:"), jsonFiles);
                matchingFiles_3 = [];
                if (id_3.startsWith('mc_')) {
                    idPrefix_1 = id_3.split('_')[1];
                    console.log("mc_\u30BF\u30A4\u30D7\u306EID\u691C\u7D22: \u30D7\u30EC\u30D5\u30A3\u30C3\u30AF\u30B9=".concat(idPrefix_1));
                    jsonFiles.forEach(function (file) {
                        if (file.includes(idPrefix_1)) {
                            matchingFiles_3.push(file);
                        }
                    });
                }
                else {
                    // guide_形式のIDは前方一致で検索
                    jsonFiles.forEach(function (file) {
                        if (file.startsWith(id_3)) {
                            matchingFiles_3.push(file);
                        }
                    });
                }
                console.log("\u30DE\u30C3\u30C1\u3059\u308B\u30D5\u30A1\u30A4\u30EB (".concat(matchingFiles_3.length, "\u4EF6):"), matchingFiles_3);
                if (matchingFiles_3.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: "\u6307\u5B9A\u3055\u308C\u305F\u30AC\u30A4\u30C9 (ID: ".concat(id_3, ") \u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093") })];
                }
                mainFilePath = path.join(kbJsonDir, matchingFiles_3[0]);
                title = "\u30D5\u30A1\u30A4\u30EB_".concat(id_3);
                // JSONファイルの内容を読み取り、タイトルなどを取得
                try {
                    content = fs.readFileSync(mainFilePath, 'utf8');
                    data = JSON.parse(content);
                    if (data.metadata && data.metadata.タイトル) {
                        title = data.metadata.タイトル;
                    }
                    else if (data.title) {
                        title = data.title;
                    }
                }
                catch (readError) {
                    console.warn("\u524A\u9664\u524D\u306E\u30D5\u30A1\u30A4\u30EB\u5185\u5BB9\u8AAD\u307F\u53D6\u308A\u306B\u5931\u6557: ".concat(mainFilePath), readError);
                }
                deletedCount = 0;
                for (_i = 0, matchingFiles_1 = matchingFiles_3; _i < matchingFiles_1.length; _i++) {
                    file = matchingFiles_1[_i];
                    filePath = path.join(kbJsonDir, file);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log("JSON\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(filePath));
                        deletedCount++;
                    }
                }
                console.log("\u524A\u9664\u3055\u308C\u305FJSON\u30D5\u30A1\u30A4\u30EB\u6570: ".concat(deletedCount, "\u4EF6"));
                indexPath = path.join(knowledgeBaseDir, 'index.json');
                if (fs.existsSync(indexPath)) {
                    try {
                        indexContent = fs.readFileSync(indexPath, 'utf8');
                        indexData = JSON.parse(indexContent);
                        // IDに基づいてエントリを削除
                        if (Array.isArray(indexData.guides)) {
                            beforeCount = indexData.guides.length;
                            indexData.guides = indexData.guides.filter(function (guide) { return guide.id !== id_3; });
                            afterCount = indexData.guides.length;
                            if (beforeCount !== afterCount) {
                                fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
                                console.log("\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u304B\u3089\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(beforeCount - afterCount, "\u30A8\u30F3\u30C8\u30EA"));
                            }
                        }
                    }
                    catch (indexError) {
                        console.warn('インデックスの更新に失敗しました:', indexError);
                    }
                }
                // 関連する画像ファイルを削除
                try {
                    if (fs.existsSync(kbImageDir)) {
                        imageFiles = fs.readdirSync(kbImageDir);
                        relatedImages = imageFiles.filter(function (img) { return img.startsWith(id_3); });
                        for (_a = 0, relatedImages_1 = relatedImages; _a < relatedImages_1.length; _a++) {
                            imgFile = relatedImages_1[_a];
                            imgPath = path.join(kbImageDir, imgFile);
                            fs.unlinkSync(imgPath);
                            console.log("\u95A2\u9023\u753B\u50CF\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(imgPath));
                        }
                    }
                }
                catch (imgError) {
                    console.warn('関連画像の削除中にエラーが発生しました:', imgError);
                }
                console.log("\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ID=".concat(id_3, ", \u30BF\u30A4\u30C8\u30EB=").concat(title));
                remainingFiles = fs.readdirSync(kbJsonDir);
                console.log('----------- 削除後の状態 -----------');
                console.log('削除したID:', id_3);
                console.log('削除後のディレクトリ内容:', remainingFiles);
                console.log('削除したファイル:', matchingFiles_3);
                attempt = 0;
                _c.label = 1;
            case 1:
                if (!(attempt < 3)) return [3 /*break*/, 10];
                allDeleted = true;
                _b = 0, matchingFiles_2 = matchingFiles_3;
                _c.label = 2;
            case 2:
                if (!(_b < matchingFiles_2.length)) return [3 /*break*/, 7];
                file = matchingFiles_2[_b];
                filePath = path.join(kbJsonDir, file);
                if (!fs.existsSync(filePath)) return [3 /*break*/, 6];
                allDeleted = false;
                console.log("\u524A\u9664\u304C\u4E0D\u5B8C\u5168\u306A\u305F\u3081\u5F37\u5236\u518D\u8A66\u884C (".concat(attempt + 1, "/3): ").concat(filePath));
                _c.label = 3;
            case 3:
                _c.trys.push([3, 4, , 6]);
                // ファイルを強制的に削除
                fs.unlinkSync(filePath);
                console.log("  \u2192 \u524A\u9664\u6210\u529F: ".concat(filePath));
                return [3 /*break*/, 6];
            case 4:
                e_1 = _c.sent();
                console.error("  \u2192 \u524A\u9664\u5931\u6557: ".concat(e_1));
                // 100ms待機してから再試行
                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
            case 5:
                // 100ms待機してから再試行
                _c.sent();
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log("  \u2192 2\u56DE\u76EE\u306E\u524A\u9664\u304C\u6210\u529F: ".concat(filePath));
                    }
                }
                catch (e2) {
                    console.error("  \u2192 2\u56DE\u76EE\u306E\u524A\u9664\u3082\u5931\u6557: ".concat(e2));
                }
                return [3 /*break*/, 6];
            case 6:
                _b++;
                return [3 /*break*/, 2];
            case 7:
                if (allDeleted) {
                    console.log("\u3059\u3079\u3066\u306E\u30D5\u30A1\u30A4\u30EB\u304C\u6B63\u5E38\u306B\u524A\u9664\u3055\u308C\u307E\u3057\u305F (\u8A66\u884C: ".concat(attempt + 1, "\u56DE\u76EE\u3067\u5B8C\u4E86)"));
                    return [3 /*break*/, 10];
                }
                // 次の試行前に少し待機
                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 200); })];
            case 8:
                // 次の試行前に少し待機
                _c.sent();
                _c.label = 9;
            case 9:
                attempt++;
                return [3 /*break*/, 1];
            case 10:
                // 最終チェック（すべての試行が終わった後）
                // 非同期で削除タスクをキューに入れる
                setTimeout(function () {
                    try {
                        for (var _i = 0, matchingFiles_4 = matchingFiles_3; _i < matchingFiles_4.length; _i++) {
                            var file = matchingFiles_4[_i];
                            var filePath = path.join(kbJsonDir, file);
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                                console.log("\u30D0\u30C3\u30AF\u30B0\u30E9\u30A6\u30F3\u30C9\u524A\u9664: ".concat(filePath));
                            }
                        }
                        // 追加のクリーンアップ: トラブルシューティングディレクトリ内の関連ファイルも削除
                        var troubleshootingDir = path.join(knowledgeBaseDir, 'troubleshooting');
                        if (fs.existsSync(troubleshootingDir)) {
                            var tsFiles = fs.readdirSync(troubleshootingDir);
                            for (var _a = 0, tsFiles_1 = tsFiles; _a < tsFiles_1.length; _a++) {
                                var tsFile = tsFiles_1[_a];
                                if (tsFile.includes(id_3.split('_')[1])) {
                                    var tsFilePath = path.join(troubleshootingDir, tsFile);
                                    fs.unlinkSync(tsFilePath);
                                    console.log("\u30D0\u30C3\u30AF\u30B0\u30E9\u30A6\u30F3\u30C9\u524A\u9664\uFF08\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\uFF09: ".concat(tsFilePath));
                                }
                            }
                        }
                    }
                    catch (e) {
                        console.error('バックグラウンド削除エラー:', e);
                    }
                }, 1000);
                // キャッシュバスティングのためのヘッダー設定
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                res.setHeader('Surrogate-Control', 'no-store');
                res.setHeader('Content-Type', 'application/json');
                return [2 /*return*/, res.json({
                        success: true,
                        message: "\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u300C".concat(title, "\u300D\u3092\u524A\u9664\u3057\u307E\u3057\u305F"),
                        deletedFiles: matchingFiles_3
                    })];
            case 11:
                error_2 = _c.sent();
                console.error('ガイド削除エラー:', error_2);
                res.status(500).json({ error: 'ガイドの削除に失敗しました' });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
// チャットに応急処置ガイドを送信するエンドポイント
// 緊急ガイドデータをチャットに直接送信するエンドポイント
router.post('/send', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, chatId, guideData, senderId, storage_1, userMessage, aiMessage, dbError_1, error_3;
    var _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 6, , 7]);
                _a = req.body, chatId = _a.chatId, guideData = _a.guideData;
                if (!chatId || !guideData) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: "チャットIDとガイドデータが必要です"
                        })];
                }
                // ログ出力強化
                console.log('------------------------------------');
                console.log('応急処置ガイドデータをチャットに送信:');
                console.log("chatId: ".concat(chatId));
                console.log("title: ".concat(guideData.title || "無題"));
                console.log("content: ".concat((_b = guideData.content) === null || _b === void 0 ? void 0 : _b.substring(0, 100), "..."));
                console.log("sessionUserId: ".concat(((_c = req === null || req === void 0 ? void 0 : req.session) === null || _c === void 0 ? void 0 : _c.userId) || 'unknown'));
                console.log('------------------------------------');
                senderId = ((_d = req.session) === null || _d === void 0 ? void 0 : _d.userId) || 1;
                storage_1 = req.app.locals.storage;
                if (!storage_1) {
                    console.error('ストレージが初期化されていません');
                    return [2 /*return*/, res.status(500).json({ success: false,
                            message: "サーバー内部エラー: ストレージが初期化されていません"
                        })];
                }
                _e.label = 1;
            case 1:
                _e.trys.push([1, 4, , 5]);
                return [4 /*yield*/, storage_1.createMessage({
                        chatId: Number(chatId),
                        content: guideData.content || guideData.title || "応急処置ガイド",
                        isAiResponse: false,
                        senderId: senderId
                    })];
            case 2:
                userMessage = _e.sent();
                return [4 /*yield*/, storage_1.createMessage({
                        chatId: Number(chatId),
                        content: "\u25A0 ".concat(guideData.title, "\n\n\u3010\u5B9F\u65BD\u3057\u305F\u624B\u9806\u306E\u8A73\u7D30\u3011\n").concat(guideData.content, "\n\n\u3010AI\u5206\u6790\u3011\nAI\u304C\u5206\u6790\u3057\u305F\u7D50\u679C\u3092\u3053\u3053\u306B\u8868\u793A\u3057\u307E\u3059\u3002"),
                        isAiResponse: true,
                        senderId: senderId
                    })];
            case 3:
                aiMessage = _e.sent();
                console.log('チャットメッセージを作成しました:', userMessage.id, aiMessage.id);
                return [2 /*return*/, res.json({
                        success: true,
                        userMessage: userMessage,
                        aiMessage: aiMessage
                    })];
            case 4:
                dbError_1 = _e.sent();
                console.error('メッセージ作成中にデータベースエラーが発生しました:', dbError_1);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        message: "メッセージの保存中にエラーが発生しました",
                        error: dbError_1 instanceof Error ? dbError_1.message : "データベースエラー"
                    })];
            case 5: return [3 /*break*/, 7];
            case 6:
                error_3 = _e.sent();
                console.error("緊急ガイド送信エラー:", error_3);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        message: "緊急ガイドの送信中にエラーが発生しました",
                        error: error_3 instanceof Error ? error_3.message : "不明なエラー"
                    })];
            case 7: return [2 /*return*/];
        }
    });
}); });
// システムメッセージをチャットに送信するエンドポイント（フォールバック用）
router.post('/system-message', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, chatId, content, _b, isUserMessage, senderId, storage_2, message, storageError_1, appStorage, message, error_4;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 8, , 9]);
                _a = req.body, chatId = _a.chatId, content = _a.content, _b = _a.isUserMessage, isUserMessage = _b === void 0 ? false : _b;
                if (!chatId || !content) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: "チャットIDとメッセージ内容が必要です"
                        })];
                }
                // ログ出力
                console.log('------------------------------------');
                console.log('システムメッセージをチャットに送信:');
                console.log("chatId: ".concat(chatId));
                console.log("content: ".concat(content.substring(0, 100), "..."));
                console.log("isUserMessage: ".concat(isUserMessage));
                console.log("sessionUserId: ".concat(((_c = req === null || req === void 0 ? void 0 : req.session) === null || _c === void 0 ? void 0 : _c.userId) || 'unknown'));
                console.log('------------------------------------');
                senderId = ((_d = req.session) === null || _d === void 0 ? void 0 : _d.userId) || 1;
                _e.label = 1;
            case 1:
                _e.trys.push([1, 3, , 7]);
                storage_2 = require('../storage').storage;
                return [4 /*yield*/, storage_2.createMessage({
                        chatId: Number(chatId),
                        content: content,
                        senderId: senderId,
                        isUserMessage: isUserMessage,
                        timestamp: new Date()
                    })];
            case 2:
                message = _e.sent();
                console.log('システムメッセージを作成しました:', message.id);
                return [2 /*return*/, res.json({
                        success: true,
                        message: message
                    })];
            case 3:
                storageError_1 = _e.sent();
                console.error('ストレージエラー:', storageError_1);
                appStorage = req.app.locals.storage;
                if (!appStorage) return [3 /*break*/, 5];
                return [4 /*yield*/, appStorage.createMessage({
                        chatId: Number(chatId),
                        content: content,
                        senderId: senderId,
                        isUserMessage: isUserMessage,
                        timestamp: new Date()
                    })];
            case 4:
                message = _e.sent();
                console.log('代替ストレージでシステムメッセージを作成しました:', message.id);
                return [2 /*return*/, res.json({
                        success: true,
                        message: message
                    })];
            case 5: throw new Error('有効なストレージが見つかりません');
            case 6: return [3 /*break*/, 7];
            case 7: return [3 /*break*/, 9];
            case 8:
                error_4 = _e.sent();
                console.error("システムメッセージ送信エラー:", error_4);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        message: "メッセージの送信中にエラーが発生しました",
                        error: error_4 instanceof Error ? error_4.message : "不明なエラー"
                    })];
            case 9: return [2 /*return*/];
        }
    });
}); });
// 古い実装 - 特定のガイドをチャットに送信するエンドポイント
router.post('/send-to-chat/:guideId/:chatId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, guideId_1, chatId, files, filePath, content, guideData, messageContent, response, result, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                _a = req.params, guideId_1 = _a.guideId, chatId = _a.chatId;
                files = fs.readdirSync(kbJsonDir)
                    .filter(function (file) { return file.startsWith(guideId_1) && file.endsWith('_metadata.json'); });
                if (files.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'ガイドが見つかりません' })];
                }
                filePath = path.join(kbJsonDir, files[0]);
                content = fs.readFileSync(filePath, 'utf8');
                guideData = JSON.parse(content);
                messageContent = '';
                // PowerPoint由来の形式の場合
                if (guideData.metadata && guideData.slides) {
                    messageContent = "\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u300C".concat(guideData.metadata.タイトル, "\u300D\u304C\u5171\u6709\u3055\u308C\u307E\u3057\u305F\u3002\n\n").concat(guideData.metadata.説明);
                }
                // JSON由来の応急処置フロー形式の場合
                else if (guideData.title && guideData.description) {
                    messageContent = "\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u300C".concat(guideData.title, "\u300D\u304C\u5171\u6709\u3055\u308C\u307E\u3057\u305F\u3002\n\n").concat(guideData.description);
                }
                // その他の形式の場合
                else {
                    messageContent = "\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u300C".concat(path.basename(filePath, '_metadata.json'), "\u300D\u304C\u5171\u6709\u3055\u308C\u307E\u3057\u305F\u3002");
                }
                return [4 /*yield*/, (0, node_fetch_1.default)("http://localhost:".concat(process.env.PORT || 3000, "/api/chats/").concat(chatId, "/messages/system"), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            content: messageContent,
                            isUserMessage: false
                        })
                    })];
            case 1:
                response = _b.sent();
                if (!response.ok) {
                    throw new Error('チャットへのメッセージ送信に失敗しました');
                }
                return [4 /*yield*/, response.json()];
            case 2:
                result = _b.sent();
                res.json({
                    success: true,
                    message: 'ガイドがチャットに送信されました',
                    messageId: result.id
                });
                return [3 /*break*/, 4];
            case 3:
                error_5 = _b.sent();
                console.error('ガイド送信エラー:', error_5);
                res.status(500).json({ error: '応急処置ガイドのチャットへの送信に失敗しました' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.emergencyGuideRouter = router;
