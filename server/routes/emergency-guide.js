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
var express_1 = require("express");
var fs = require("fs");
var path = require("path");
var multer_1 = require("multer");
var adm_zip_1 = require("adm-zip");
var vite_1 = require("../vite");
// 一時ファイルクリーンアップユーティリティ
function cleanupTempDirectory(dirPath) {
    if (!fs.existsSync(dirPath))
        return;
    try {
        var files = fs.readdirSync(dirPath);
        for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
            var file = files_1[_i];
            var filePath = path.join(dirPath, file);
            var stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                // 再帰的にディレクトリを削除
                cleanupTempDirectory(filePath);
                fs.rmdirSync(filePath);
            }
            else {
                // ファイルを削除
                fs.unlinkSync(filePath);
            }
        }
        console.log("\u4E00\u6642\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u3057\u307E\u3057\u305F: ".concat(dirPath));
    }
    catch (error) {
        console.error("\u4E00\u6642\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306E\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(dirPath), error);
    }
}
var router = (0, express_1.Router)();
// ディレクトリ構造の設定
var knowledgeBaseDir = path.resolve('./knowledge-base');
var pptDir = path.join(knowledgeBaseDir, 'ppt');
var jsonDir = path.join(knowledgeBaseDir, 'json');
var imageDir = path.join(knowledgeBaseDir, 'images');
var tempDir = path.join(knowledgeBaseDir, 'temp');
// knowledge-baseに完全に一元化されたため、uploadsディレクトリの参照は不要
// データの参照はすべてknowledge-baseディレクトリから行う
// ディレクトリの存在確認と作成（主にknowledge-base）
[knowledgeBaseDir, pptDir, jsonDir, imageDir, tempDir].forEach(function (dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});
// Multerの設定
var storage = multer_1.default.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, pptDir);
    },
    filename: function (_req, file, cb) {
        var timestamp = Date.now();
        var originalName = file.originalname;
        var extension = path.extname(originalName);
        var fileName = "guide_".concat(timestamp).concat(extension);
        cb(null, fileName);
    }
});
// ファイルフィルター（許可する拡張子）
var fileFilter = function (_req, file, cb) {
    var allowedExtensions = ['.pptx', '.ppt', '.xlsx', '.xls', '.pdf', '.json'];
    var ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error('サポートされていないファイル形式です。PowerPoint (.pptx, .ppt)、Excel (.xlsx, .xls)、PDF (.pdf)、または JSON (.json) ファイルのみアップロードできます。'));
    }
};
var upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    }
});
// 各種ファイル形式を処理してJSONデータに変換する関数
function processFile(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var fileId, fileExtension, zip, extractDir, slidesDir, slideFiles, slides, i, slideNumber, slideFilePath, slideContent, imageRefs, imageRegex, match, textRegex, texts, noteFilePath, noteContent, noteXml, noteRegex, imageTexts, mediaDir, mediaFiles, _i, mediaFiles_1, mediaFile, sourcePath, targetFileName, targetPath, relativePath, imageText, corePropsPath, title, creator, created, modified, coreProps, titleMatch, creatorMatch, createdMatch, modifiedMatch, result, jsonFilePath, fileName, slides, XLSX, workbook, sheetNames, i, sheetName, worksheet, sheetData, title, bodyTexts, j, rowText, result, jsonFilePath, fileName, slides, result, jsonFilePath, fileName, jsonContent, jsonData, isTroubleshootingFormat, convertedData, slideData, troubleshootingDir, tsFilePath, jsonFilePath;
        var _a;
        return __generator(this, function (_b) {
            try {
                fileId = "guide_".concat(Date.now());
                fileExtension = path.extname(filePath);
                // PPTXファイルを解凍してXMLとして処理
                if (fileExtension.toLowerCase() === '.pptx') {
                    zip = new adm_zip_1.default(filePath);
                    extractDir = path.join(tempDir, fileId);
                    // 一時ディレクトリが存在することを確認
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
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
                                targetPath = path.join(imageDir, targetFileName);
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
                            説明: "PowerPoint\u304B\u3089\u751F\u6210\u3055\u308C\u305F\u5FDC\u6025\u5FA9\u65E7\u30D5\u30ED\u30FC\u300C".concat(title, "\u300D\u3067\u3059\u3002\u63A5\u7D9A\u756A\u53F7: 123")
                        },
                        slides: slides
                    };
                    jsonFilePath = path.join(jsonDir, "".concat(fileId, "_metadata.json"));
                    fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
                    return [2 /*return*/, {
                            id: fileId,
                            filePath: jsonFilePath,
                            fileName: path.basename(filePath),
                            title: title,
                            createdAt: new Date().toISOString(),
                            slideCount: slides.length,
                            data: result
                        }];
                }
                else if (fileExtension.toLowerCase() === '.xlsx' || fileExtension.toLowerCase() === '.xls') {
                    fileName = path.basename(filePath, fileExtension);
                    slides = [];
                    try {
                        XLSX = require('xlsx');
                        workbook = XLSX.readFile(filePath);
                        sheetNames = workbook.SheetNames;
                        // 各シートを「スライド」として処理
                        for (i = 0; i < sheetNames.length; i++) {
                            sheetName = sheetNames[i];
                            worksheet = workbook.Sheets[sheetName];
                            sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                            // 空のシートをスキップ
                            if (sheetData.length === 0)
                                continue;
                            title = Array.isArray(sheetData[0]) && sheetData[0].length > 0
                                ? String(sheetData[0][0] || "\u30B7\u30FC\u30C8 ".concat(i + 1))
                                : "\u30B7\u30FC\u30C8 ".concat(i + 1);
                            bodyTexts = [];
                            for (j = 1; j < sheetData.length; j++) {
                                if (Array.isArray(sheetData[j])) {
                                    rowText = sheetData[j].filter(function (cell) { return cell !== undefined && cell !== null; })
                                        .map(function (cell) { return String(cell).trim(); })
                                        .join(', ');
                                    if (rowText) {
                                        bodyTexts.push(rowText);
                                    }
                                }
                            }
                            // スライドデータを追加
                            slides.push({
                                スライド番号: i + 1,
                                タイトル: title,
                                本文: bodyTexts,
                                ノート: "Excel\u30B7\u30FC\u30C8\u300C".concat(sheetName, "\u300D\u304B\u3089\u751F\u6210\u3055\u308C\u307E\u3057\u305F"),
                                画像テキスト: []
                            });
                        }
                        result = {
                            metadata: {
                                タイトル: fileName,
                                作成者: 'Excel抽出',
                                作成日: new Date().toISOString(),
                                修正日: new Date().toISOString(),
                                説明: "Excel\u30D5\u30A1\u30A4\u30EB\u300C".concat(fileName, "\u300D\u304B\u3089\u751F\u6210\u3055\u308C\u305F\u5FDC\u6025\u5FA9\u65E7\u30D5\u30ED\u30FC\u3067\u3059\u3002\u63A5\u7D9A\u756A\u53F7: 123")
                            },
                            slides: slides
                        };
                        jsonFilePath = path.join(jsonDir, "".concat(fileId, "_metadata.json"));
                        fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
                        return [2 /*return*/, {
                                id: fileId,
                                filePath: jsonFilePath,
                                fileName: path.basename(filePath),
                                title: fileName,
                                createdAt: new Date().toISOString(),
                                slideCount: slides.length,
                                data: result
                            }];
                    }
                    catch (error) {
                        console.error('Excelファイル処理エラー:', error);
                        throw new Error('Excelファイルの処理に失敗しました');
                    }
                }
                else if (fileExtension.toLowerCase() === '.pdf') {
                    fileName = path.basename(filePath, fileExtension);
                    // PDFファイル処理の実装（例：テキスト抽出のみ）
                    // 実際のPDF処理はpdfjs-distを使用します
                    try {
                        slides = [{
                                スライド番号: 1,
                                タイトル: fileName,
                                本文: ['PDFからテキストを抽出しました。接続番号: 123'],
                                ノート: 'PDFファイルから生成された応急復旧フローです',
                                画像テキスト: []
                            }];
                        result = {
                            metadata: {
                                タイトル: fileName,
                                作成者: 'PDF抽出',
                                作成日: new Date().toISOString(),
                                修正日: new Date().toISOString(),
                                説明: "PDF\u30D5\u30A1\u30A4\u30EB\u300C".concat(fileName, "\u300D\u304B\u3089\u751F\u6210\u3055\u308C\u305F\u5FDC\u6025\u51E6\u7F6E\u30D5\u30ED\u30FC\u3067\u3059")
                            },
                            slides: slides
                        };
                        jsonFilePath = path.join(jsonDir, "".concat(fileId, "_metadata.json"));
                        fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
                        return [2 /*return*/, {
                                id: fileId,
                                filePath: jsonFilePath,
                                fileName: path.basename(filePath),
                                title: fileName,
                                createdAt: new Date().toISOString(),
                                slideCount: slides.length,
                                data: result
                            }];
                    }
                    catch (error) {
                        console.error('PDFファイル処理エラー:', error);
                        throw new Error('PDFファイルの処理に失敗しました');
                    }
                }
                else if (fileExtension.toLowerCase() === '.json') {
                    // JSONファイルの処理
                    console.log('JSONファイルを処理します:', filePath);
                    fileName = path.basename(filePath, fileExtension);
                    try {
                        jsonContent = fs.readFileSync(filePath, 'utf8');
                        jsonData = JSON.parse(jsonContent);
                        // JSON構造を検証
                        if (!jsonData) {
                            throw new Error('JSONファイルの解析に失敗しました。有効なJSONファイルを確認してください。');
                        }
                        console.log('元のJSONデータの構造:', Object.keys(jsonData));
                        isTroubleshootingFormat = jsonData.steps && Array.isArray(jsonData.steps);
                        if (isTroubleshootingFormat) {
                            console.log('トラブルシューティング形式のJSONを検出しました。steps配列があります。');
                            convertedData = {
                                metadata: {
                                    タイトル: jsonData.title || fileName || '応急処置フローデータ',
                                    作成者: 'システム',
                                    作成日: new Date().toISOString(),
                                    修正日: new Date().toISOString(),
                                    説明: jsonData.description || 'トラブルシューティングフローから生成された応急処置フローです',
                                    原形式: 'troubleshooting'
                                },
                                slides: jsonData.steps.map(function (step, index) { return ({
                                    スライド番号: index + 1,
                                    タイトル: step.title || "\u30B9\u30C6\u30C3\u30D7 ".concat(index + 1),
                                    本文: [step.message || step.description || ''],
                                    ノート: step.options ? "\u9078\u629E\u80A2: ".concat(step.options.map(function (opt) { return opt.text; }).join(', ')) : '',
                                    画像テキスト: []
                                }); }),
                                original: jsonData // 元のJSONデータも保持
                            };
                            // 変換後のデータで置き換え
                            jsonData = convertedData;
                            console.log('トラブルシューティング形式からガイド形式に変換しました');
                        }
                        else {
                            // 標準的なガイド形式に変換
                            // 必要に応じて構造を構築（metadata、slidesがない場合は作成）
                            if (!jsonData.metadata) {
                                console.log('JSONにmetadataがないため、作成します');
                                jsonData.metadata = {
                                    タイトル: jsonData.title || fileName || '応急処置フローデータ',
                                    作成者: 'システム',
                                    作成日: new Date().toISOString(),
                                    修正日: new Date().toISOString(),
                                    説明: jsonData.description || 'JSONファイルから生成された応急処置フローです'
                                };
                            }
                            if (!jsonData.slides || !Array.isArray(jsonData.slides)) {
                                console.log('JSONにslidesがないか配列ではないため、作成します');
                                // slidesを作成
                                jsonData.slides = [];
                                // stepsがあれば、それをslidesに変換
                                if (jsonData.steps && Array.isArray(jsonData.steps)) {
                                    console.log('steps配列をslidesに変換します');
                                    jsonData.slides = jsonData.steps.map(function (step, index) { return ({
                                        スライド番号: index + 1,
                                        タイトル: step.title || "\u30B9\u30C6\u30C3\u30D7 ".concat(index + 1),
                                        本文: [step.message || step.description || ''],
                                        ノート: step.options ? "\u9078\u629E\u80A2: ".concat(step.options.map(function (opt) { return opt.text; }).join(', ')) : '',
                                        画像テキスト: []
                                    }); });
                                }
                                else {
                                    slideData = {
                                        スライド番号: 1,
                                        タイトル: ((_a = jsonData.metadata) === null || _a === void 0 ? void 0 : _a.タイトル) || jsonData.title || fileName || 'JSONデータ',
                                        本文: [jsonData.description || 'JSONデータから自動生成されたスライドです'],
                                        ノート: 'JSONファイルから生成された内容です',
                                        画像テキスト: []
                                    };
                                    jsonData.slides.push(slideData);
                                }
                            }
                        }
                        troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
                        // トラブルシューティングディレクトリが存在しない場合は作成
                        if (!fs.existsSync(troubleshootingDir)) {
                            fs.mkdirSync(troubleshootingDir, { recursive: true });
                        }
                        // トラブルシューティング形式のJSONの場合、元の形式も保存
                        if (isTroubleshootingFormat) {
                            tsFilePath = path.join(troubleshootingDir, "".concat(path.basename(fileName, '.json'), ".json"));
                            fs.writeFileSync(tsFilePath, jsonContent);
                            console.log("\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u5F62\u5F0F\u306EJSON\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F: ".concat(tsFilePath));
                        }
                        // 画像パスの修正（必要に応じて）
                        jsonData.slides.forEach(function (slide) {
                            if (slide.画像テキスト && Array.isArray(slide.画像テキスト)) {
                                slide.画像テキスト.forEach(function (imgText) {
                                    if (imgText.画像パス && imgText.画像パス.startsWith('/uploads/')) {
                                        imgText.画像パス = imgText.画像パス.replace('/uploads/', '/knowledge-base/');
                                    }
                                });
                            }
                        });
                        // メタデータの更新
                        jsonData.metadata.作成日 = jsonData.metadata.作成日 || new Date().toISOString();
                        jsonData.metadata.修正日 = new Date().toISOString();
                        // 説明を更新し、「応急復旧」を「応急処置」に統一
                        if (jsonData.metadata.説明 && jsonData.metadata.説明.includes('応急復旧')) {
                            jsonData.metadata.説明 = jsonData.metadata.説明.replace(/応急復旧/g, '応急処置');
                        }
                        // タイトルの「応急復旧」を「応急処置」に統一
                        if (jsonData.metadata.タイトル && jsonData.metadata.タイトル.includes('応急復旧')) {
                            jsonData.metadata.タイトル = jsonData.metadata.タイトル.replace(/応急復旧/g, '応急処置');
                        }
                        jsonFilePath = path.join(jsonDir, "".concat(fileId, "_metadata.json"));
                        fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));
                        return [2 /*return*/, {
                                id: fileId,
                                filePath: jsonFilePath,
                                fileName: path.basename(filePath),
                                title: jsonData.metadata.タイトル || fileName,
                                createdAt: new Date().toISOString(),
                                slideCount: jsonData.slides.length,
                                data: jsonData
                            }];
                    }
                    catch (error) {
                        console.error('JSONファイル処理エラー:', error);
                        throw new Error("JSON\u30D5\u30A1\u30A4\u30EB\u306E\u51E6\u7406\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(error instanceof Error ? error.message : '不明なエラー'));
                    }
                }
                else {
                    throw new Error('サポートされていないファイル形式です');
                }
            }
            catch (error) {
                console.error('ファイル処理エラー:', error);
                throw error;
            }
            return [2 /*return*/];
        });
    });
}
// ファイルアップロードと処理のエンドポイント
router.post('/process', upload.single('file'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var filePath, result, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                if (!req.file) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'ファイルがアップロードされていません' })];
                }
                filePath = req.file.path;
                (0, vite_1.log)("\u30D5\u30A1\u30A4\u30EB\u51E6\u7406: ".concat(filePath));
                return [4 /*yield*/, processFile(filePath)];
            case 1:
                result = _a.sent();
                // knowledge-baseディレクトリにすでに直接保存されているため、コピー不要
                console.log("\u30D5\u30A1\u30A4\u30EB\u306Fknowledge-base\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u76F4\u63A5\u51E6\u7406\u3055\u308C\u307E\u3057\u305F: ".concat(result.filePath));
                // 元のアップロードファイルを削除（データ抽出とJSON生成が完了したため）
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log("\u5143\u306E\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(filePath));
                    }
                }
                catch (cleanupError) {
                    console.error("\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u30A8\u30E9\u30FC: ".concat(cleanupError));
                    // ファイル削除に失敗しても処理は続行
                }
                // 一時ディレクトリをクリーンアップ
                if (fs.existsSync(tempDir)) {
                    cleanupTempDirectory(tempDir);
                }
                // メモリキャッシュがあれば削除
                if (typeof global !== 'undefined' && global.fileCache) {
                    delete global.fileCache[filePath];
                }
                return [2 /*return*/, res.json({
                        success: true,
                        message: 'ファイルが正常に処理されました',
                        guideId: result.id,
                        data: result
                    })];
            case 2:
                error_1 = _a.sent();
                console.error('ファイル処理エラー:', error_1);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: error_1 instanceof Error ? error_1.message : '不明なエラーが発生しました'
                    })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ガイドファイル一覧を取得するエンドポイント
router.get('/list', function (_req, res) {
    try {
        // メインのJSONディレクトリをチェック
        if (!fs.existsSync(jsonDir)) {
            fs.mkdirSync(jsonDir, { recursive: true });
            console.log("jsonDir\u304C\u5B58\u5728\u3057\u306A\u304B\u3063\u305F\u305F\u3081\u4F5C\u6210\u3057\u307E\u3057\u305F: ".concat(jsonDir));
        }
        // メインのJSONディレクトリからファイルを取得
        var jsonFiles = fs.existsSync(jsonDir)
            ? fs.readdirSync(jsonDir).filter(function (file) { return file.endsWith('_metadata.json'); })
            : [];
        console.log("jsonDir\u304B\u3089".concat(jsonFiles.length, "\u500B\u306E\u30E1\u30BF\u30C7\u30FC\u30BF\u30D5\u30A1\u30A4\u30EB\u3092\u53D6\u5F97\u3057\u307E\u3057\u305F"));
        // トラブルシューティングディレクトリをチェック
        var troubleshootingDir_1 = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        if (!fs.existsSync(troubleshootingDir_1)) {
            fs.mkdirSync(troubleshootingDir_1, { recursive: true });
            console.log("troubleshootingDir\u304C\u5B58\u5728\u3057\u306A\u304B\u3063\u305F\u305F\u3081\u4F5C\u6210\u3057\u307E\u3057\u305F: ".concat(troubleshootingDir_1));
        }
        // トラブルシューティングディレクトリからファイルを取得
        var troubleshootingFiles = fs.existsSync(troubleshootingDir_1)
            ? fs.readdirSync(troubleshootingDir_1).filter(function (file) { return file.endsWith('.json'); })
            : [];
        console.log("troubleshootingDir\u304B\u3089".concat(troubleshootingFiles.length, "\u500B\u306EJSON\u30D5\u30A1\u30A4\u30EB\u3092\u53D6\u5F97\u3057\u307E\u3057\u305F"));
        // ガイドリストの構築
        var guides_1 = [];
        // メインJSONディレクトリからのガイド
        jsonFiles.forEach(function (file) {
            var _a, _b;
            try {
                var filePath = path.join(jsonDir, file);
                var content = fs.readFileSync(filePath, 'utf8');
                var data = JSON.parse(content);
                var id = file.split('_')[0] + '_' + file.split('_')[1];
                guides_1.push({
                    id: id,
                    filePath: filePath,
                    fileName: file,
                    title: ((_a = data.metadata) === null || _a === void 0 ? void 0 : _a.タイトル) || path.basename(file, '_metadata.json'),
                    createdAt: ((_b = data.metadata) === null || _b === void 0 ? void 0 : _b.作成日) || new Date().toISOString(),
                    slideCount: Array.isArray(data.slides) ? data.slides.length : 0,
                    source: 'regular'
                });
            }
            catch (err) {
                console.error("\u30D5\u30A1\u30A4\u30EB ".concat(file, " \u306E\u51E6\u7406\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:"), err);
            }
        });
        // トラブルシューティングディレクトリからのガイド
        troubleshootingFiles.forEach(function (file) {
            var _a, _b;
            try {
                var filePath = path.join(troubleshootingDir_1, file);
                var content = fs.readFileSync(filePath, 'utf8');
                var data = JSON.parse(content);
                // ファイル名からIDを取得（拡張子を除く）
                var id = path.basename(file, '.json');
                guides_1.push({
                    id: "ts_".concat(id), // トラブルシューティングの識別子をつける
                    filePath: filePath,
                    fileName: file,
                    title: ((_a = data.metadata) === null || _a === void 0 ? void 0 : _a.タイトル) || data.title || id,
                    createdAt: ((_b = data.metadata) === null || _b === void 0 ? void 0 : _b.作成日) || data.createdAt || new Date().toISOString(),
                    slideCount: Array.isArray(data.slides) ? data.slides.length : (Array.isArray(data.steps) ? data.steps.length : 0),
                    source: 'troubleshooting'
                });
            }
            catch (err) {
                console.error("\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30A1\u30A4\u30EB ".concat(file, " \u306E\u51E6\u7406\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:"), err);
            }
        });
        // 作成日の新しい順にソート
        guides_1.sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        console.log("\u5408\u8A08".concat(guides_1.length, "\u500B\u306E\u30AC\u30A4\u30C9\u3092\u53D6\u5F97\u3057\u307E\u3057\u305F"));
        res.json(guides_1);
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
        // トラブルシューティングファイルかどうかをチェック
        if (id_1.startsWith('ts_')) {
            // トラブルシューティングファイルの場合
            var troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
            var tsId = id_1.replace('ts_', ''); // プレフィックスを削除
            var filePath = path.join(troubleshootingDir, "".concat(tsId, ".json"));
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'トラブルシューティングファイルが見つかりません' });
            }
            var content = fs.readFileSync(filePath, 'utf8');
            var jsonData = JSON.parse(content);
            // データ構造を標準化
            var data = {
                metadata: jsonData.metadata || {
                    タイトル: jsonData.title || tsId,
                    作成者: 'システム',
                    作成日: jsonData.createdAt || new Date().toISOString(),
                    修正日: new Date().toISOString(),
                    説明: jsonData.description || 'トラブルシューティングフロー'
                },
                slides: jsonData.slides || []
            };
            // stepsがあれば、slidesに変換
            if (jsonData.steps && Array.isArray(jsonData.steps) && data.slides.length === 0) {
                data.slides = jsonData.steps.map(function (step, index) { return ({
                    スライド番号: index + 1,
                    タイトル: step.title || "\u30B9\u30C6\u30C3\u30D7 ".concat(index + 1),
                    本文: [step.description || ''],
                    ノート: step.note || '',
                    画像テキスト: step.imageUrl ? [{
                            画像パス: step.imageUrl,
                            テキスト: step.imageCaption || ''
                        }] : []
                }); });
            }
            res.json({
                id: id_1,
                filePath: filePath,
                fileName: path.basename(filePath),
                data: data,
                source: 'troubleshooting'
            });
        }
        else {
            // 通常のガイドファイルの場合
            var files = fs.readdirSync(jsonDir)
                .filter(function (file) { return file.startsWith(id_1) && file.endsWith('_metadata.json'); });
            if (files.length === 0) {
                return res.status(404).json({ error: 'ガイドが見つかりません' });
            }
            var filePath = path.join(jsonDir, files[0]);
            var content = fs.readFileSync(filePath, 'utf8');
            var data = JSON.parse(content);
            res.json({
                id: id_1,
                filePath: filePath,
                fileName: files[0],
                data: data,
                source: 'regular'
            });
        }
    }
    catch (error) {
        console.error('ガイド詳細取得エラー:', error);
        res.status(500).json({ error: 'ガイド詳細の取得に失敗しました' });
    }
});
// ガイドデータを更新するエンドポイント
router.post('/update/:id', function (req, res) {
    var _a, _b;
    try {
        var id_2 = req.params.id;
        var data = req.body.data;
        if (!data) {
            return res.status(400).json({ error: 'データが提供されていません' });
        }
        // トラブルシューティングファイルかどうかをチェック
        if (id_2.startsWith('ts_')) {
            // トラブルシューティングファイルの場合
            var troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
            var tsId = id_2.replace('ts_', ''); // プレフィックスを削除
            var filePath = path.join(troubleshootingDir, "".concat(tsId, ".json"));
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'トラブルシューティングファイルが見つかりません' });
            }
            // 元のデータを読み込む
            var content = fs.readFileSync(filePath, 'utf8');
            var originalData = JSON.parse(content);
            // 元データを完全に置き換える新しいデータを構築
            var updatedTsData = {
                id: originalData.id || tsId,
                title: ((_a = data.metadata) === null || _a === void 0 ? void 0 : _a.タイトル) || originalData.title || tsId,
                description: ((_b = data.metadata) === null || _b === void 0 ? void 0 : _b.説明) || originalData.description || '',
                triggerKeywords: originalData.triggerKeywords || [],
                steps: [],
                updatedAt: new Date().toISOString()
            };
            // スライドからステップに完全変換
            if (data.slides && Array.isArray(data.slides)) {
                updatedTsData.steps = data.slides.map(function (slide, index) { return ({
                    id: slide.id || "step".concat(index + 1),
                    title: slide.タイトル || "\u30B9\u30C6\u30C3\u30D7 ".concat(index + 1),
                    description: Array.isArray(slide.本文) ? slide.本文.join('\n') : (slide.本文 || ''),
                    message: Array.isArray(slide.本文) ? slide.本文.join('\n') : (slide.本文 || ''),
                    imageUrl: slide.imageUrl || '',
                    type: slide.type || 'step',
                    options: slide.options || []
                }); });
            }
            else {
                // 既存のステップ構造を保持
                updatedTsData.steps = originalData.steps || [];
            }
            // 更新日時を設定
            updatedTsData.updatedAt = new Date().toISOString();
            // 既存ファイルを削除してから完全に新しいデータで置き換え
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            // 新しいデータで完全上書き
            fs.writeFileSync(filePath, JSON.stringify(updatedTsData, null, 2), 'utf8');
            // 通常のJSONとしても保存（バックアップ）
            if (data.metadata) {
                data.metadata.修正日 = new Date().toISOString();
            }
            // メモリキャッシュがあれば削除
            if (typeof global !== 'undefined' && global.fileCache) {
                delete global.fileCache[filePath];
            }
            // トラブルシューティングファイルの対応するメタデータファイルを取得
            var guideFileName = "ts_".concat(tsId, "_metadata.json");
            var guideFilePath = path.join(jsonDir, guideFileName);
            // メタデータファイルが存在する場合は更新
            if (fs.existsSync(guideFilePath)) {
                fs.writeFileSync(guideFilePath, JSON.stringify(data, null, 2));
            }
            res.json({
                success: true,
                message: 'トラブルシューティングデータが更新されました',
                id: id_2
            });
        }
        else {
            // 通常のガイドファイルの場合
            var files = fs.readdirSync(jsonDir)
                .filter(function (file) { return file.startsWith(id_2) && file.endsWith('_metadata.json'); });
            if (files.length === 0) {
                return res.status(404).json({ error: 'ガイドが見つかりません' });
            }
            var filePath = path.join(jsonDir, files[0]);
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
    }
    catch (error) {
        console.error('ガイド更新エラー:', error);
        res.status(500).json({ error: 'ガイドの更新に失敗しました' });
    }
});
// ガイドデータを削除するエンドポイント
router.delete('/delete/:id', function (req, res) {
    try {
        var id_3 = req.params.id;
        // トラブルシューティングファイルかどうかをチェック
        if (id_3.startsWith('ts_')) {
            // トラブルシューティングファイルの場合
            var troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
            var tsId = id_3.replace('ts_', ''); // プレフィックスを削除
            var filePath = path.join(troubleshootingDir, "".concat(tsId, ".json"));
            if (fs.existsSync(filePath)) {
                // ファイルを削除
                fs.unlinkSync(filePath);
                console.log("\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(filePath));
            }
            // 対応するメタデータファイルも削除
            var guideFileName = "ts_".concat(tsId, "_metadata.json");
            var guideFilePath = path.join(jsonDir, guideFileName);
            if (fs.existsSync(guideFilePath)) {
                fs.unlinkSync(guideFilePath);
                console.log("\u30E1\u30BF\u30C7\u30FC\u30BF\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(guideFilePath));
            }
        }
        else {
            // 通常のガイドファイルの場合
            var files = fs.readdirSync(jsonDir)
                .filter(function (file) { return file.startsWith(id_3) && file.endsWith('_metadata.json'); });
            if (files.length === 0) {
                return res.status(404).json({ error: 'ガイドが見つかりません' });
            }
            var filePath = path.join(jsonDir, files[0]);
            if (fs.existsSync(filePath)) {
                // ファイルを削除
                fs.unlinkSync(filePath);
                console.log("\u30AC\u30A4\u30C9\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(filePath));
            }
        }
        res.json({
            success: true,
            message: 'ガイドデータが削除されました',
            id: id_3
        });
    }
    catch (error) {
        console.error('ガイド削除エラー:', error);
        res.status(500).json({ error: 'ガイドの削除に失敗しました' });
    }
});
// チャットに応急処置ガイドを送信するエンドポイント
router.post('/send-to-chat/:guideId/:chatId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, guideId_1, chatId, files, filePath, content, guideData, response, result, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                _a = req.params, guideId_1 = _a.guideId, chatId = _a.chatId;
                files = fs.readdirSync(jsonDir)
                    .filter(function (file) { return file.startsWith(guideId_1) && file.endsWith('_metadata.json'); });
                if (files.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'ガイドが見つかりません' })];
                }
                filePath = path.join(jsonDir, files[0]);
                content = fs.readFileSync(filePath, 'utf8');
                guideData = JSON.parse(content);
                return [4 /*yield*/, fetch("http://localhost:".concat(process.env.PORT || 3000, "/api/chats/").concat(chatId, "/messages/system"), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            content: "\u5FDC\u6025\u51E6\u7F6E\u30D5\u30ED\u30FC\u300C".concat(guideData.metadata.タイトル, "\u300D\u304C\u5171\u6709\u3055\u308C\u307E\u3057\u305F\u3002\n\n").concat(guideData.metadata.説明),
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
                    message: '応急処置フローがチャットに送信されました',
                    messageId: result.id
                });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _b.sent();
                console.error('フロー送信エラー:', error_2);
                res.status(500).json({ error: '応急処置フローのチャットへの送信に失敗しました' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
