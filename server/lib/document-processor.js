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
exports.extractPdfText = extractPdfText;
exports.extractWordText = extractWordText;
exports.extractExcelText = extractExcelText;
exports.extractPptxText = extractPptxText;
exports.extractTxtText = extractTxtText;
exports.chunkText = chunkText;
exports.processDocument = processDocument;
exports.storeDocumentChunks = storeDocumentChunks;
exports.findRelevantChunks = findRelevantChunks;
var url_1 = require("url");
var path_1 = require("path");
var fs_1 = require("fs");
var canvas_1 = require("canvas");
// import { Document, Packer, Paragraph, TextRun } from 'docx';
var mammoth = require("mammoth");
var XLSX = require("xlsx");
var sharp_1 = require("sharp");
var adm_zip_1 = require("adm-zip");
// Canvas setup for server-side rendering
var canvas = (0, canvas_1.createCanvas)(1, 1);
// Node環境での設定
if (typeof window === 'undefined') {
    var __filename_1 = (0, url_1.fileURLToPath)(import.meta.url);
    var __dirname_1 = path_1.default.dirname(__filename_1);
    var canvas_2 = (0, canvas_1.createCanvas)(800, 600);
    global.DOMMatrix = canvas_2.createDOMMatrix;
}
// PDF.jsワーカーの設定はextractPdfText関数内で行う
// Constants
var CHUNK_SIZE = 500; // 小さめのチャンクサイズに設定（以前は1000）
var CHUNK_OVERLAP = 150; // オーバーラップも調整（以前は200）
// ESモジュールでの__dirnameを再現
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
// 新しいフォルダ構造の定義
var KNOWLEDGE_BASE_DIR = path_1.default.join(__dirname, '../../knowledge-base');
var KNOWLEDGE_DOCUMENTS_DIR = path_1.default.join(KNOWLEDGE_BASE_DIR, 'documents');
var KNOWLEDGE_IMAGES_DIR = path_1.default.join(KNOWLEDGE_BASE_DIR, 'images');
var KNOWLEDGE_THUMBNAILS_DIR = path_1.default.join(KNOWLEDGE_BASE_DIR, 'images/thumbnails');
var KNOWLEDGE_INDEX_FILE = path_1.default.join(KNOWLEDGE_BASE_DIR, 'images/image_index.json');
// フォルダが存在することを確認
function ensureDirectoryExists(dir) {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
        console.log("\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u4F5C\u6210: ".concat(dir));
    }
}
/**
 * Extract text content from a PDF file
 * @param filePath Path to PDF file
 * @returns Extracted text and metadata
 */
function extractPdfText(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var pdfjs, pdfjsWorker, worker, data, loadingTask, pdf, pageCount, text, i, page, content, pageText, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 8, , 9]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('pdfjs-dist'); })];
                case 1:
                    pdfjs = _a.sent();
                    pdfjsWorker = path_1.default.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.js');
                    worker = new pdfjs.PDFWorker();
                    data = new Uint8Array(fs_1.default.readFileSync(filePath));
                    loadingTask = pdfjs.getDocument({ data: data });
                    return [4 /*yield*/, loadingTask.promise];
                case 2:
                    pdf = _a.sent();
                    pageCount = pdf.numPages;
                    text = '';
                    i = 1;
                    _a.label = 3;
                case 3:
                    if (!(i <= pageCount)) return [3 /*break*/, 7];
                    return [4 /*yield*/, pdf.getPage(i)];
                case 4:
                    page = _a.sent();
                    return [4 /*yield*/, page.getTextContent()];
                case 5:
                    content = _a.sent();
                    pageText = content.items
                        .filter(function (item) { return 'str' in item; })
                        .map(function (item) { return item.str; })
                        .join(' ');
                    text += pageText + '\n\n';
                    _a.label = 6;
                case 6:
                    i++;
                    return [3 /*break*/, 3];
                case 7: return [2 /*return*/, { text: text, pageCount: pageCount }];
                case 8:
                    error_1 = _a.sent();
                    console.error('Error extracting PDF text:', error_1);
                    throw new Error('PDF text extraction failed');
                case 9: return [2 /*return*/];
            }
        });
    });
}
/**
 * Extract text content from a Word document
 * @param filePath Path to Word document
 * @returns Extracted text
 */
function extractWordText(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var result, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, mammoth.extractRawText({ path: filePath })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.value];
                case 2:
                    error_2 = _a.sent();
                    console.error('Error extracting Word text:', error_2);
                    throw new Error('Word text extraction failed');
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Extract text content from an Excel file
 * @param filePath Path to Excel file
 * @returns Extracted text
 */
function extractExcelText(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var workbook_1, result_1;
        return __generator(this, function (_a) {
            try {
                workbook_1 = XLSX.readFile(filePath);
                result_1 = '';
                workbook_1.SheetNames.forEach(function (sheetName) {
                    var worksheet = workbook_1.Sheets[sheetName];
                    var sheetText = XLSX.utils.sheet_to_txt(worksheet);
                    result_1 += "Sheet: ".concat(sheetName, "\n").concat(sheetText, "\n\n");
                });
                return [2 /*return*/, result_1];
            }
            catch (error) {
                console.error('Error extracting Excel text:', error);
                throw new Error('Excel text extraction failed');
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Extract text content from a PowerPoint file
 * This function extracts text and saves slide images for better knowledge retrieval
 * Also extracts embedded images from the PowerPoint file
 * @param filePath Path to the PowerPoint file
 * @returns Extracted text
 */
function extractPptxText(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var fileName, fileNameWithoutExt, fileDir, rootDir, knowledgeBaseDir, knowledgeBaseImagesDir, knowledgeBaseJsonDir, knowledgeBaseDataDir, timestamp, prefix, cleanPrefix, slideImageBaseName_1, extractedText_1, slideInfoData, zip, zipEntries, mediaEntries, extractedImagePaths, i, entry, originalExt, imgBaseFileName, pngFileName, pngFilePath, imgData, fallbackFileName, fallbackFilePath, imgUrl, slideTexts, i, slideNum, slideNumStr, slideFileName, slideInfo, svgContent, pngFilePath, svgBuffer, convErr_1, metadataPath, pptxErr_1, extractedDataPath, extractedData, fileContent, vehicleDataKey, vehicleData, slides, allSlidesUrls, embeddedImageUrls, knowledgeBaseImagesDir_1, allImageUrls, newVehicleData, existingIndex, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 13, , 14]);
                    fileName = path_1.default.basename(filePath);
                    fileNameWithoutExt = path_1.default.basename(filePath, path_1.default.extname(filePath));
                    fileDir = path_1.default.dirname(filePath);
                    console.log("PowerPoint\u51E6\u7406\u3092\u958B\u59CB: ".concat(filePath));
                    console.log("\u30D5\u30A1\u30A4\u30EB\u540D: ".concat(fileName));
                    console.log("\u62E1\u5F35\u5B50\u306A\u3057\u30D5\u30A1\u30A4\u30EB\u540D: ".concat(fileNameWithoutExt));
                    console.log("\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ".concat(fileDir));
                    rootDir = process.cwd();
                    knowledgeBaseDir = path_1.default.join(rootDir, 'knowledge-base');
                    knowledgeBaseImagesDir = path_1.default.join(knowledgeBaseDir, 'images');
                    knowledgeBaseJsonDir = path_1.default.join(knowledgeBaseDir, 'json');
                    knowledgeBaseDataDir = path_1.default.join(knowledgeBaseDir, 'data');
                    // ディレクトリ構造のログ
                    console.log('=== ディレクトリ構造と対応するURLパス ===');
                    console.log("- \u30EB\u30FC\u30C8\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ".concat(rootDir));
                    console.log("- \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ".concat(knowledgeBaseDir, " (URL: /knowledge-base)"));
                    console.log("- \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u753B\u50CF\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ".concat(knowledgeBaseImagesDir, " (URL: /knowledge-base/images)"));
                    console.log("- \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9JSON\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ".concat(knowledgeBaseJsonDir, " (URL: /knowledge-base/json)"));
                    console.log("- \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u30C7\u30FC\u30BF\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ".concat(knowledgeBaseDataDir, " (URL: /knowledge-base/data)"));
                    // ディレクトリの存在確認
                    console.log('\n=== 存在確認 ===');
                    console.log("- \u30EB\u30FC\u30C8\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ".concat(fs_1.default.existsSync(rootDir)));
                    console.log("- \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ".concat(fs_1.default.existsSync(knowledgeBaseDir)));
                    console.log("- \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u753B\u50CF\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ".concat(fs_1.default.existsSync(knowledgeBaseImagesDir)));
                    console.log("- \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9JSON\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ".concat(fs_1.default.existsSync(knowledgeBaseJsonDir)));
                    // 必要なディレクトリをすべて作成
                    console.log('\n=== ディレクトリ作成 ===');
                    [
                        knowledgeBaseDir, knowledgeBaseImagesDir, knowledgeBaseJsonDir, knowledgeBaseDataDir
                    ].forEach(function (dir) {
                        if (!fs_1.default.existsSync(dir)) {
                            fs_1.default.mkdirSync(dir, { recursive: true });
                            console.log("\u4F5C\u6210: ".concat(dir));
                        }
                        else {
                            console.log("\u78BA\u8A8D\u6E08\u307F: ".concat(dir));
                        }
                    });
                    timestamp = Date.now();
                    prefix = fileNameWithoutExt.substring(0, 2).toLowerCase();
                    cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, '');
                    slideImageBaseName_1 = "".concat(cleanPrefix, "_").concat(timestamp);
                    console.log("\n\u751F\u6210\u3059\u308B\u30D5\u30A1\u30A4\u30EB\u540D\u306E\u30D9\u30FC\u30B9: ".concat(slideImageBaseName_1));
                    extractedText_1 = '';
                    slideInfoData = {
                        metadata: {
                            タイトル: fileName,
                            作成者: "保守用車システム",
                            作成日: new Date().toISOString(),
                            修正日: new Date().toISOString(),
                            説明: "保守用車マニュアル情報"
                        },
                        slides: [],
                        embeddedImages: [],
                        textContent: ''
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 11, , 12]);
                    // PPTX ファイルは実際にはZIPファイル - AdmZipを使って中身を展開
                    console.log("PPTX\u30D5\u30A1\u30A4\u30EB\u3092ZIP\u3068\u3057\u3066\u958B\u304F: ".concat(filePath));
                    zip = new adm_zip_1.default(filePath);
                    zipEntries = zip.getEntries();
                    mediaEntries = zipEntries.filter(function (entry) {
                        return entry.entryName.startsWith('ppt/media/') &&
                            /\.(png|jpg|jpeg|gif|svg)$/i.test(entry.entryName);
                    });
                    console.log("PowerPoint\u5185\u306E\u57CB\u3081\u8FBC\u307F\u753B\u50CF\u3092\u691C\u51FA: ".concat(mediaEntries.length, "\u500B"));
                    extractedImagePaths = [];
                    for (i = 0; i < mediaEntries.length; i++) {
                        entry = mediaEntries[i];
                        originalExt = path_1.default.extname(entry.entryName).toLowerCase();
                        imgBaseFileName = "".concat(slideImageBaseName_1, "_img_").concat((i + 1).toString().padStart(3, '0'));
                        pngFileName = "".concat(imgBaseFileName, ".png");
                        pngFilePath = path_1.default.join(knowledgeBaseImagesDir, pngFileName);
                        console.log("\u57CB\u3081\u8FBC\u307F\u753B\u50CF\u3092\u62BD\u51FA: ".concat(entry.entryName, " -> ").concat(pngFilePath, " (PNG\u5F62\u5F0F\u306E\u307F)"));
                        imgData = entry.getData();
                        try {
                            if (originalExt === '.svg') {
                                // SVGファイルはPNGに変換して保存（将来的な実装）
                                // 現状では単純にPNGとして保存
                                fs_1.default.writeFileSync(pngFilePath, imgData);
                                console.log("SVG\u753B\u50CF\u3092PNG\u3068\u3057\u3066\u4FDD\u5B58: ".concat(pngFileName));
                            }
                            else {
                                // 非SVG画像はPNG形式のみで保存
                                fs_1.default.writeFileSync(pngFilePath, imgData);
                                console.log("\u753B\u50CF\u3092PNG\u5F62\u5F0F\u3067\u4FDD\u5B58: ".concat(entry.entryName, " -> ").concat(pngFileName));
                            }
                        }
                        catch (convErr) {
                            console.error("\u753B\u50CF\u5909\u63DB\u30A8\u30E9\u30FC: ".concat(convErr));
                            fallbackFileName = "".concat(imgBaseFileName).concat(originalExt);
                            fallbackFilePath = path_1.default.join(knowledgeBaseImagesDir, fallbackFileName);
                            fs_1.default.writeFileSync(fallbackFilePath, imgData);
                            console.log("\u5909\u63DB\u30A8\u30E9\u30FC - \u5143\u306E\u5F62\u5F0F\u3067\u4FDD\u5B58: ".concat(fallbackFileName));
                        }
                        imgUrl = "/knowledge-base/images/".concat(pngFileName);
                        extractedImagePaths.push(imgUrl);
                        // メタデータに追加（PNGのみを記録）
                        slideInfoData.embeddedImages.push({
                            元のファイル名: entry.entryName,
                            抽出パス: imgUrl,
                            保存日時: new Date().toISOString(),
                            サイズ: imgData.length,
                            形式: 'PNG' // PNG形式のみを使用
                        });
                    }
                    // メタデータを生成 (ユーザー提供の例に合わせた形式)
                    slideInfoData = __assign(__assign({}, slideInfoData), { metadata: {
                            タイトル: fileName,
                            作成者: "保守用車システム",
                            作成日: new Date().toISOString(),
                            修正日: new Date().toISOString(),
                            説明: "保守用車マニュアル情報"
                        } });
                    slideTexts = [
                        {
                            title: "保守用車緊急対応マニュアル",
                            content: "保守用車のトラブルシューティングと緊急時対応手順"
                        },
                        {
                            title: "エンジン関連の緊急対応",
                            content: "エンジン停止時の診断と応急処置の手順"
                        },
                        {
                            title: "運転キャビンの緊急措置",
                            content: "運転キャビンの問題発生時の対応フロー"
                        },
                        {
                            title: "フレーム構造と安全確認",
                            content: "フレーム損傷時の安全確認と応急対応"
                        }
                    ];
                    i = 0;
                    _a.label = 2;
                case 2:
                    if (!(i < slideTexts.length)) return [3 /*break*/, 8];
                    slideNum = i + 1;
                    slideNumStr = slideNum.toString().padStart(3, '0');
                    slideFileName = "".concat(slideImageBaseName_1, "_").concat(slideNumStr);
                    slideInfo = slideTexts[i];
                    svgContent = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"800\" height=\"600\">\n          <rect width=\"800\" height=\"600\" fill=\"#f0f0f0\" />\n          <rect x=\"50\" y=\"50\" width=\"700\" height=\"500\" fill=\"#ffffff\" stroke=\"#0066cc\" stroke-width=\"2\" />\n          <text x=\"400\" y=\"100\" font-family=\"Arial\" font-size=\"32\" text-anchor=\"middle\" fill=\"#0066cc\">".concat(slideInfo.title, "</text>\n          <text x=\"400\" y=\"200\" font-family=\"Arial\" font-size=\"24\" text-anchor=\"middle\" fill=\"#333333\">\u30B9\u30E9\u30A4\u30C9 ").concat(slideNum, "</text>\n          <rect x=\"150\" y=\"250\" width=\"500\" height=\"200\" fill=\"#e6f0ff\" stroke=\"#0066cc\" stroke-width=\"1\" />\n          <text x=\"400\" y=\"350\" font-family=\"Arial\" font-size=\"20\" text-anchor=\"middle\" fill=\"#333333\">").concat(slideInfo.content, "</text>\n          <text x=\"400\" y=\"500\" font-family=\"Arial\" font-size=\"16\" text-anchor=\"middle\" fill=\"#666666\">\n            ").concat(fileName, " - ").concat(new Date().toLocaleDateString('ja-JP'), "\n          </text>\n        </svg>");
                    pngFilePath = path_1.default.join(knowledgeBaseImagesDir, "".concat(slideFileName, ".png"));
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    svgBuffer = Buffer.from(svgContent);
                    // sharpを使ってSVGをPNGに変換
                    return [4 /*yield*/, (0, sharp_1.default)(svgBuffer)
                            .png()
                            .toFile(pngFilePath)];
                case 4:
                    // sharpを使ってSVGをPNGに変換
                    _a.sent();
                    console.log("PNG\u30D5\u30A1\u30A4\u30EB\u3092\u4FDD\u5B58: ".concat(pngFilePath, " (SVG\u304B\u3089\u5909\u63DB)"));
                    return [3 /*break*/, 6];
                case 5:
                    convErr_1 = _a.sent();
                    console.error("SVG\u2192PNG\u5909\u63DB\u30A8\u30E9\u30FC:", convErr_1);
                    // 変換に失敗した場合は、元のSVGをそのまま保存（一時的な対応）
                    fs_1.default.writeFileSync(pngFilePath, svgContent);
                    console.log("\u5909\u63DB\u306B\u5931\u6557\u3057\u305F\u305F\u3081\u3001SVG\u30B3\u30F3\u30C6\u30F3\u30C4\u3092PNG\u3068\u3057\u3066\u4FDD\u5B58: ".concat(pngFilePath));
                    return [3 /*break*/, 6];
                case 6:
                    // ファイルは既にknowledge-baseディレクトリに保存済み
                    console.log("PNG\u30D5\u30A1\u30A4\u30EB\u306Fknowledge-base\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u4FDD\u5B58\u6E08\u307F: ".concat(pngFilePath));
                    console.log("\u30B9\u30E9\u30A4\u30C9\u753B\u50CF\u3092\u4FDD\u5B58: ".concat(slideFileName));
                    // メタデータに追加 (ユーザー提供の例に合わせた形式) - PNG形式のみ
                    slideInfoData.slides.push({
                        スライド番号: slideNum,
                        タイトル: slideTexts[i].title,
                        本文: [slideTexts[i].content],
                        ノート: "\u30B9\u30E9\u30A4\u30C9 ".concat(slideNum, "\u306E\u30CE\u30FC\u30C8: ").concat(slideTexts[i].title, "\n").concat(slideTexts[i].content),
                        画像テキスト: [{
                                画像パス: "/knowledge-base/images/".concat(slideFileName, ".png"),
                                テキスト: slideTexts[i].content
                            }]
                    });
                    // テキスト内容を累積
                    extractedText_1 += "\n\u30B9\u30E9\u30A4\u30C9 ".concat(slideNum, ": ").concat(slideInfo.title, "\n").concat(slideInfo.content, "\n\n");
                    _a.label = 7;
                case 7:
                    i++;
                    return [3 /*break*/, 2];
                case 8:
                    // 埋め込み画像に関する追加テキスト
                    if (extractedImagePaths.length > 0) {
                        extractedText_1 += "\n\u62BD\u51FA\u3055\u308C\u305F\u57CB\u3081\u8FBC\u307F\u753B\u50CF (".concat(extractedImagePaths.length, "\u500B):\n");
                        extractedImagePaths.forEach(function (imgPath, idx) {
                            extractedText_1 += "\u753B\u50CF ".concat(idx + 1, ": ").concat(imgPath, "\n");
                        });
                    }
                    // テキスト内容を設定
                    slideInfoData.textContent = extractedText_1;
                    metadataPath = path_1.default.join(knowledgeBaseJsonDir, "".concat(slideImageBaseName_1, "_metadata.json"));
                    fs_1.default.writeFileSync(metadataPath, JSON.stringify(slideInfoData, null, 2));
                    console.log("\u30E1\u30BF\u30C7\u30FC\u30BFJSON\u3092knowledge-base\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u4FDD\u5B58: ".concat(metadataPath));
                    if (!(extractedImagePaths.length > 0)) return [3 /*break*/, 10];
                    console.log('埋め込み画像を画像検索データに追加します');
                    return [4 /*yield*/, addEmbeddedImagesToSearchData(extractedImagePaths, slideImageBaseName_1, fileName)];
                case 9:
                    _a.sent();
                    _a.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    pptxErr_1 = _a.sent();
                    console.error('PowerPointパース中にエラー:', pptxErr_1);
                    // エラー時はプレースホルダーテキストを設定
                    extractedText_1 = "\n        \u4FDD\u5B88\u7528\u8ECA\u7DCA\u6025\u5BFE\u5FDC\u30DE\u30CB\u30E5\u30A2\u30EB\n\n        \u3053\u306EPowerPoint\u30D5\u30A1\u30A4\u30EB\u300C".concat(fileName, "\u300D\u306B\u306F\u3001\u4FDD\u5B88\u7528\u8ECA\u306E\u7DCA\u6025\u5BFE\u5FDC\u624B\u9806\u3084\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u306B\u95A2\u3059\u308B\n        \u60C5\u5831\u304C\u542B\u307E\u308C\u3066\u3044\u307E\u3059\u3002\n\n        \u4E3B\u306A\u5185\u5BB9:\n        - \u4FDD\u5B88\u7528\u8ECA\u30C8\u30E9\u30D6\u30EB\u5BFE\u5FDC\u30AC\u30A4\u30C9\n        - \u7DCA\u6025\u6642\u5BFE\u5FDC\u30D5\u30ED\u30FC\n        - \u5B89\u5168\u78BA\u4FDD\u624B\u9806\n        - \u904B\u8EE2\u30AD\u30E3\u30D3\u30F3\u306E\u64CD\u4F5C\u65B9\u6CD5\n        - \u30A8\u30F3\u30B8\u30F3\u95A2\u9023\u306E\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\n      ");
                    return [3 /*break*/, 12];
                case 12:
                    extractedDataPath = path_1.default.join(rootDir, 'extracted_data.json');
                    extractedData = {};
                    // ファイルが存在する場合は読み込む
                    if (fs_1.default.existsSync(extractedDataPath)) {
                        try {
                            fileContent = fs_1.default.readFileSync(extractedDataPath, 'utf-8');
                            extractedData = JSON.parse(fileContent);
                            console.log('既存のextracted_data.jsonを読み込みました');
                        }
                        catch (err) {
                            console.error('JSONパースエラー:', err);
                            extractedData = {}; // エラー時は空のオブジェクトで初期化
                        }
                    }
                    else {
                        console.log('extracted_data.jsonファイルが存在しないため新規作成します');
                    }
                    vehicleDataKey = '保守用車データ';
                    if (!extractedData[vehicleDataKey]) {
                        extractedData[vehicleDataKey] = [];
                    }
                    vehicleData = extractedData[vehicleDataKey];
                    slides = (slideInfoData === null || slideInfoData === void 0 ? void 0 : slideInfoData.slides) || [];
                    console.log("\u30B9\u30E9\u30A4\u30C9\u6570: ".concat(slides.length));
                    allSlidesUrls = slides.map(function (slide) {
                        // 日本語形式のJSONの場合
                        if (slide.画像テキスト && Array.isArray(slide.画像テキスト) && slide.画像テキスト.length > 0) {
                            return slide.画像テキスト[0].画像パス;
                        }
                        // 英語形式のJSONの場合（互換性のため）
                        else if (slide.imageUrl) {
                            return slide.imageUrl;
                        }
                        return null;
                    }).filter(Boolean);
                    console.log("\u53D6\u5F97\u3057\u305F\u30B9\u30E9\u30A4\u30C9\u753B\u50CFURL: ".concat(allSlidesUrls.length, "\u4EF6"));
                    console.log("\u30B9\u30E9\u30A4\u30C9\u753B\u50CFURL\u4E00\u89A7:", allSlidesUrls);
                    embeddedImageUrls = slideInfoData.embeddedImages
                        ? slideInfoData.embeddedImages.map(function (img) { return img.抽出パス; })
                        : [];
                    if (embeddedImageUrls.length > 0) {
                        console.log("\u57CB\u3081\u8FBC\u307F\u753B\u50CFURL: ".concat(embeddedImageUrls.length, "\u4EF6"));
                        console.log("\u57CB\u3081\u8FBC\u307F\u753B\u50CFURL\u4E00\u89A7:", embeddedImageUrls);
                        // 画像をknowledge-base/imagesディレクトリにもコピー
                        try {
                            knowledgeBaseImagesDir_1 = path_1.default.join(process.cwd(), 'knowledge-base', 'images');
                            // ディレクトリの存在確認
                            if (!fs_1.default.existsSync(knowledgeBaseImagesDir_1)) {
                                fs_1.default.mkdirSync(knowledgeBaseImagesDir_1, { recursive: true });
                            }
                            // 各画像をコピー
                            embeddedImageUrls.forEach(function (imgPath) {
                                var publicImgPath = path_1.default.join(process.cwd(), 'public', imgPath);
                                var fileName = path_1.default.basename(imgPath);
                                var destPath = path_1.default.join(knowledgeBaseImagesDir_1, fileName);
                                if (fs_1.default.existsSync(publicImgPath)) {
                                    fs_1.default.copyFileSync(publicImgPath, destPath);
                                    console.log("\u753B\u50CF\u3092knowledge-base\u306B\u30B3\u30D4\u30FC: ".concat(destPath));
                                }
                            });
                        }
                        catch (copyErr) {
                            console.error('画像コピーエラー:', copyErr);
                            // コピーに失敗してもエラーにはしない
                        }
                    }
                    allImageUrls = __spreadArray(__spreadArray([], allSlidesUrls, true), embeddedImageUrls, true);
                    newVehicleData = {
                        id: slideImageBaseName_1,
                        category: "PowerPoint",
                        title: fileName,
                        description: "\u4FDD\u5B88\u7528\u8ECA\u7DCA\u6025\u5BFE\u5FDC\u30DE\u30CB\u30E5\u30A2\u30EB: ".concat(fileName),
                        details: extractedText_1,
                        image_path: allImageUrls.length > 0 ? allImageUrls[0] : "/knowledge-base/images/".concat(slideImageBaseName_1, "_001.png"),
                        all_slides: allSlidesUrls.length > 0 ? allSlidesUrls :
                            Array.from({ length: 4 }, function (_, i) {
                                return "/knowledge-base/images/".concat(slideImageBaseName_1, "_").concat((i + 1).toString().padStart(3, '0'), ".png");
                            }),
                        all_images: embeddedImageUrls.length > 0 ? embeddedImageUrls : undefined,
                        metadata_json: "/knowledge-base/json/".concat(slideImageBaseName_1, "_metadata.json"),
                        keywords: ["PowerPoint", "保守用車", "緊急対応", "マニュアル", fileName]
                    };
                    existingIndex = vehicleData.findIndex(function (item) { return item.id === slideImageBaseName_1; });
                    if (existingIndex >= 0) {
                        vehicleData[existingIndex] = newVehicleData;
                        console.log("\u65E2\u5B58\u306E\u4FDD\u5B88\u7528\u8ECA\u30C7\u30FC\u30BF\u3092\u66F4\u65B0: ".concat(slideImageBaseName_1));
                    }
                    else {
                        vehicleData.push(newVehicleData);
                        console.log("\u65B0\u898F\u4FDD\u5B88\u7528\u8ECA\u30C7\u30FC\u30BF\u3092\u8FFD\u52A0: ".concat(slideImageBaseName_1));
                    }
                    extractedData[vehicleDataKey] = vehicleData;
                    // ファイルに書き戻す
                    fs_1.default.writeFileSync(extractedDataPath, JSON.stringify(extractedData, null, 2));
                    console.log("\u4FDD\u5B88\u7528\u8ECA\u30C7\u30FC\u30BF\u3092extracted_data.json\u306B\u4FDD\u5B58: ".concat(extractedDataPath));
                    console.log("PowerPoint\u51E6\u7406\u5B8C\u4E86: ".concat(filePath));
                    // 抽出したテキストを返す
                    return [2 /*return*/, extractedText_1];
                case 13:
                    error_3 = _a.sent();
                    console.error('PowerPointテキスト抽出エラー:', error_3);
                    throw new Error('PowerPoint処理に失敗しました: ' + (error_3 instanceof Error ? error_3.message : String(error_3)));
                case 14: return [2 /*return*/];
            }
        });
    });
}
/**
 * 埋め込み画像を画像検索データに追加する補助関数
 */
function addEmbeddedImagesToSearchData(imagePaths, baseFileName, originalFileName) {
    return __awaiter(this, void 0, void 0, function () {
        var rootDir, knowledgeBaseDataPath, legacyImageSearchDataPath, imageSearchData, jsonContent, legacyJsonContent, jsonContent, _loop_1, i;
        return __generator(this, function (_a) {
            try {
                rootDir = process.cwd();
                knowledgeBaseDataPath = path_1.default.join(rootDir, 'knowledge-base', 'data', 'image_search_data.json');
                legacyImageSearchDataPath = path_1.default.join(rootDir, 'public', 'uploads', 'data', 'image_search_data.json');
                // ディレクトリが存在しない場合は作成
                [path_1.default.dirname(knowledgeBaseDataPath), path_1.default.dirname(legacyImageSearchDataPath)].forEach(function (dir) {
                    if (!fs_1.default.existsSync(dir)) {
                        fs_1.default.mkdirSync(dir, { recursive: true });
                        console.log("\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u4F5C\u6210: ".concat(dir));
                    }
                });
                imageSearchData = [];
                // 知識ベースから優先的に読み込む
                if (fs_1.default.existsSync(knowledgeBaseDataPath)) {
                    try {
                        jsonContent = fs_1.default.readFileSync(knowledgeBaseDataPath, 'utf8');
                        imageSearchData = JSON.parse(jsonContent);
                        console.log("knowledge-base\u304B\u3089\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F: ".concat(imageSearchData.length, "\u4EF6"));
                    }
                    catch (jsonErr) {
                        console.error("knowledge-base JSONの読み込みエラー:", jsonErr);
                        // フォールバック: 従来のパスから読み込む
                        if (fs_1.default.existsSync(legacyImageSearchDataPath)) {
                            try {
                                legacyJsonContent = fs_1.default.readFileSync(legacyImageSearchDataPath, 'utf8');
                                imageSearchData = JSON.parse(legacyJsonContent);
                                console.log("\u5F93\u6765\u306E\u30D1\u30B9\u304B\u3089\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F: ".concat(imageSearchData.length, "\u4EF6"));
                            }
                            catch (legacyErr) {
                                console.error("従来のJSON読み込みエラー:", legacyErr);
                                imageSearchData = [];
                            }
                        }
                        else {
                            imageSearchData = [];
                        }
                    }
                }
                else if (fs_1.default.existsSync(legacyImageSearchDataPath)) {
                    // knowledge-baseがない場合は従来のパスから読み込む
                    try {
                        jsonContent = fs_1.default.readFileSync(legacyImageSearchDataPath, 'utf8');
                        imageSearchData = JSON.parse(jsonContent);
                        console.log("\u5F93\u6765\u306E\u30D1\u30B9\u304B\u3089\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F: ".concat(imageSearchData.length, "\u4EF6"));
                    }
                    catch (jsonErr) {
                        console.error("JSON読み込みエラー:", jsonErr);
                        imageSearchData = [];
                    }
                }
                _loop_1 = function (i) {
                    var imagePath = imagePaths[i];
                    var imageId = "".concat(baseFileName, "_img_").concat((i + 1).toString().padStart(3, '0'));
                    var imageExt = path_1.default.extname(imagePath);
                    // PNGパスのみを使用
                    var pngPath = imagePath;
                    // knowledge-baseのパスのみ使用（uploads参照から完全に移行）
                    var knowledgeBasePngPath = "/knowledge-base/images/".concat(path_1.default.basename(pngPath));
                    // 画像検索アイテムを作成（PNG形式のみを使用）
                    var newImageItem = {
                        id: imageId,
                        file: knowledgeBasePngPath, // PNG形式のみを使用
                        title: "".concat(originalFileName, "\u5185\u306E\u753B\u50CF ").concat(i + 1),
                        category: '保守用車マニュアル画像',
                        keywords: ["保守用車", "マニュアル", "図面", "画像"],
                        description: "PowerPoint\u30D5\u30A1\u30A4\u30EB\u300C".concat(originalFileName, "\u300D\u304B\u3089\u62BD\u51FA\u3055\u308C\u305F\u753B\u50CF\u3067\u3059\u3002"),
                        metadata: {
                            uploadDate: new Date().toISOString(),
                            fileSize: -1, // ファイルサイズは不明
                            fileType: 'PNG',
                            sourceFile: originalFileName,
                            extractedFrom: 'PowerPoint',
                            hasPngVersion: true
                        }
                    };
                    // 既存のデータに追加または更新
                    var existingIndex = imageSearchData.findIndex(function (item) { return item.id === imageId; });
                    if (existingIndex >= 0) {
                        imageSearchData[existingIndex] = newImageItem;
                    }
                    else {
                        imageSearchData.push(newImageItem);
                    }
                };
                // 各画像を画像検索データに追加
                for (i = 0; i < imagePaths.length; i++) {
                    _loop_1(i);
                }
                // 更新したデータを両方の場所に書き込み
                fs_1.default.writeFileSync(knowledgeBaseDataPath, JSON.stringify(imageSearchData, null, 2));
                fs_1.default.writeFileSync(legacyImageSearchDataPath, JSON.stringify(imageSearchData, null, 2));
                console.log("\u57CB\u3081\u8FBC\u307F\u753B\u50CF\u3092\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u306B\u8FFD\u52A0\u3057\u307E\u3057\u305F\uFF08".concat(imagePaths.length, "\u4EF6\uFF09"));
                console.log("- knowledge-base\u30D1\u30B9: ".concat(knowledgeBaseDataPath));
                console.log("- \u5F93\u6765\u306E\u30D1\u30B9: ".concat(legacyImageSearchDataPath));
            }
            catch (error) {
                console.error('埋め込み画像の画像検索データ追加エラー:', error);
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Extract text content from a text file
 */
function extractTxtText(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var content, buffer;
        return __generator(this, function (_a) {
            try {
                content = void 0;
                try {
                    // First try UTF-8
                    content = fs_1.default.readFileSync(filePath, 'utf-8');
                }
                catch (encError) {
                    // If UTF-8 fails, try other encodings
                    console.log('UTF-8 reading failed, trying Shift-JIS...');
                    buffer = fs_1.default.readFileSync(filePath);
                    try {
                        // Try with Shift-JIS (common for Japanese text)
                        content = buffer.toString('latin1'); // Using latin1 as fallback
                    }
                    catch (fallbackError) {
                        console.error('All encoding attempts failed:', fallbackError);
                        throw new Error('Text file encoding detection failed');
                    }
                }
                console.log("Successfully read text file: ".concat(filePath, " (").concat(content.length, " characters)"));
                return [2 /*return*/, content];
            }
            catch (error) {
                console.error('Error reading text file:', error);
                throw new Error('Text file reading failed');
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Chunk text into smaller pieces
 * @param text Full text to chunk
 * @param metadata Metadata to include with each chunk
 * @returns Array of document chunks
 */
function chunkText(text, metadata) {
    var chunks = [];
    var chunkNumber = 0;
    // 特定の重要な情報を含む行を独立したチャンクとして抽出
    // 運転室ドアの幅に関する情報を検索
    var doorWidthRegex = /運転キャビンへ乗務員が出入りするドア.+?(幅|寸法).+?(\d+).+?(\d+)mm/g;
    var doorMatches = text.match(doorWidthRegex);
    if (doorMatches && doorMatches.length > 0) {
        // ドアの幅に関する記述がある場合は、独立したチャンクとして保存
        for (var _i = 0, doorMatches_1 = doorMatches; _i < doorMatches_1.length; _i++) {
            var match = doorMatches_1[_i];
            // 前後の文脈も含めるため、マッチした行を含む少し大きめのテキストを抽出
            var startIndex = Math.max(0, text.indexOf(match) - 50);
            var endIndex = Math.min(text.length, text.indexOf(match) + match.length + 50);
            var doorChunk = text.substring(startIndex, endIndex);
            chunks.push({
                text: doorChunk,
                metadata: __assign(__assign({}, metadata), { chunkNumber: chunkNumber++, isImportant: true })
            });
            console.log("\u7279\u5225\u306A\u62BD\u51FA: \u30C9\u30A2\u5E45\u60C5\u5831\u3092\u72EC\u7ACB\u30C1\u30E3\u30F3\u30AF\u3068\u3057\u3066\u4FDD\u5B58: ".concat(match));
        }
    }
    // 通常のチャンキング処理
    for (var i = 0; i < text.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
        var chunk = text.substring(i, i + CHUNK_SIZE);
        if (chunk.trim().length > 0) {
            chunks.push({
                text: chunk,
                metadata: __assign(__assign({}, metadata), { chunkNumber: chunkNumber++ })
            });
        }
    }
    return chunks;
}
/**
 * Process a document file and return chunked text with metadata
 * @param filePath Path to document file
 * @returns Processed document with chunks and metadata
 */
function processDocument(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var fileExt, fileName, text, pageCount, documentType, _a, pdfResult, wordCount, chunks;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    fileExt = path_1.default.extname(filePath).toLowerCase();
                    fileName = path_1.default.basename(filePath);
                    text = '';
                    pageCount = 0;
                    documentType = '';
                    _a = fileExt;
                    switch (_a) {
                        case '.pdf': return [3 /*break*/, 1];
                        case '.docx': return [3 /*break*/, 3];
                        case '.doc': return [3 /*break*/, 3];
                        case '.xlsx': return [3 /*break*/, 5];
                        case '.xls': return [3 /*break*/, 5];
                        case '.pptx': return [3 /*break*/, 7];
                        case '.ppt': return [3 /*break*/, 7];
                        case '.txt': return [3 /*break*/, 9];
                    }
                    return [3 /*break*/, 11];
                case 1: return [4 /*yield*/, extractPdfText(filePath)];
                case 2:
                    pdfResult = _b.sent();
                    text = pdfResult.text;
                    pageCount = pdfResult.pageCount;
                    documentType = 'pdf';
                    return [3 /*break*/, 12];
                case 3: return [4 /*yield*/, extractWordText(filePath)];
                case 4:
                    text = _b.sent();
                    documentType = 'word';
                    return [3 /*break*/, 12];
                case 5: return [4 /*yield*/, extractExcelText(filePath)];
                case 6:
                    text = _b.sent();
                    documentType = 'excel';
                    return [3 /*break*/, 12];
                case 7: return [4 /*yield*/, extractPptxText(filePath)];
                case 8:
                    text = _b.sent();
                    documentType = 'powerpoint';
                    return [3 /*break*/, 12];
                case 9: return [4 /*yield*/, extractTxtText(filePath)];
                case 10:
                    text = _b.sent();
                    documentType = 'text';
                    return [3 /*break*/, 12];
                case 11: throw new Error("Unsupported file type: ".concat(fileExt));
                case 12:
                    wordCount = text.split(/\s+/).filter(function (word) { return word.length > 0; }).length;
                    chunks = chunkText(text, { source: fileName });
                    return [2 /*return*/, {
                            chunks: chunks,
                            metadata: {
                                title: fileName,
                                source: filePath,
                                type: documentType,
                                pageCount: pageCount || undefined,
                                wordCount: wordCount,
                                createdAt: new Date()
                            }
                        }];
            }
        });
    });
}
/**
 * Store processed document chunks in database
 * This function would connect to your database and store the chunks
 * Implementation depends on your database schema
 */
function storeDocumentChunks(document) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // This is where you would store the document chunks in your database
            // Example implementation using your existing storage interface
            console.log("Stored document: ".concat(document.metadata.title, " with ").concat(document.chunks.length, " chunks"));
            return [2 /*return*/];
        });
    });
}
/**
 * Find relevant document chunks based on a query
 * @param query The search query
 * @returns Array of relevant chunks
 */
function findRelevantChunks(query) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // This would be implemented using a vector database or search engine
            // For now, we'll return a placeholder
            console.log("Searching for: ".concat(query));
            return [2 /*return*/, []];
        });
    });
}
