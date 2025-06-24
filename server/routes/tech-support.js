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
var express_1 = require("express");
var multer_1 = require("multer");
var fs_1 = require("fs");
var path_1 = require("path");
var sharp_1 = require("sharp");
var url_1 = require("url");
// ESモジュール用の__dirname代替
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
var fuse_js_1 = require("fuse.js");
var document_processor_1 = require("../lib/document-processor");
var knowledge_base_1 = require("../lib/knowledge-base");
// Logging function to control debug output
function logDebug(message) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    // セキュリティのためデバッグ情報を非表示
    if (process.env.NODE_ENV === 'development' && process.env.SHOW_DEBUG_LOGS === 'true') {
        console.debug.apply(console, __spreadArray([message], args, false));
    }
}
function logInfo(message) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    // 本番環境では重要な情報のみ表示
    if (process.env.NODE_ENV !== 'production') {
        console.info.apply(console, __spreadArray([message], args, false));
    }
}
function logPath(message, path) {
    // パス情報は非表示
    if (process.env.SHOW_PATH_LOGS === 'true') {
        console.log(message, path ? '***' : '');
    }
}
// ディレクトリ作成用ヘルパー関数
function ensureDirectoryExists(directory) {
    if (!fs_1.default.existsSync(directory)) {
        fs_1.default.mkdirSync(directory, { recursive: true });
    }
}
// ファイルクリーンアップユーティリティ
function cleanupTempDirectory(dirPath) {
    if (!fs_1.default.existsSync(dirPath))
        return;
    try {
        var files = fs_1.default.readdirSync(dirPath);
        for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
            var file = files_1[_i];
            var filePath = path_1.default.join(dirPath, file);
            var stat = fs_1.default.statSync(filePath);
            if (stat.isDirectory()) {
                // 再帰的にディレクトリを削除
                cleanupTempDirectory(filePath);
                fs_1.default.rmdirSync(filePath);
            }
            else {
                // ファイルを削除
                fs_1.default.unlinkSync(filePath);
            }
        }
        console.log("\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u3057\u307E\u3057\u305F: ".concat(dirPath));
    }
    catch (error) {
        console.error("\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306E\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(dirPath), error);
        // クリーンアップに失敗しても処理は続行
    }
}
// 一時ディレクトリのクリーンアップ（知識ベースディレクトリとuploadsディレクトリ）
function cleanupTempDirectories() {
    return __awaiter(this, void 0, void 0, function () {
        var rootDir, knowledgeBaseDir, publicImagesDir, publicUploadsDir, uploadsDir, tempDirs, _i, tempDirs_1, dirPath, files, _a, files_2, file, filePath, stat, error_1, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    rootDir = process.cwd();
                    knowledgeBaseDir = path_1.default.join(rootDir, 'knowledge-base');
                    publicImagesDir = path_1.default.join(rootDir, 'public/images');
                    publicUploadsDir = path_1.default.join(rootDir, 'public/uploads');
                    uploadsDir = path_1.default.join(rootDir, 'uploads');
                    tempDirs = [
                        path_1.default.join(knowledgeBaseDir, 'temp'),
                        path_1.default.join(uploadsDir, 'temp'),
                        path_1.default.join(publicUploadsDir, 'temp')
                    ];
                    _i = 0, tempDirs_1 = tempDirs;
                    _b.label = 1;
                case 1:
                    if (!(_i < tempDirs_1.length)) return [3 /*break*/, 11];
                    dirPath = tempDirs_1[_i];
                    if (!fs_1.default.existsSync(dirPath))
                        return [3 /*break*/, 10];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 9, , 10]);
                    files = fs_1.default.readdirSync(dirPath);
                    _a = 0, files_2 = files;
                    _b.label = 3;
                case 3:
                    if (!(_a < files_2.length)) return [3 /*break*/, 8];
                    file = files_2[_a];
                    filePath = path_1.default.join(dirPath, file);
                    stat = fs_1.default.statSync(filePath);
                    if (!stat.isDirectory()) return [3 /*break*/, 5];
                    // ディレクトリの場合は再帰的に処理
                    return [4 /*yield*/, verifyAndCleanupDirectory(filePath)];
                case 4:
                    // ディレクトリの場合は再帰的に処理
                    _b.sent();
                    return [3 /*break*/, 7];
                case 5: 
                // ファイルの場合は検証して削除
                return [4 /*yield*/, verifyAndCleanupFile(filePath, path_1.default.basename(dirPath))];
                case 6:
                    // ファイルの場合は検証して削除
                    _b.sent();
                    _b.label = 7;
                case 7:
                    _a++;
                    return [3 /*break*/, 3];
                case 8:
                    console.log("\u4E00\u6642\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u3057\u307E\u3057\u305F: ".concat(dirPath));
                    return [3 /*break*/, 10];
                case 9:
                    error_1 = _b.sent();
                    console.error("\u4E00\u6642\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306E\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: ".concat(dirPath), error_1);
                    return [3 /*break*/, 10];
                case 10:
                    _i++;
                    return [3 /*break*/, 1];
                case 11:
                    _b.trys.push([11, 13, , 14]);
                    return [4 /*yield*/, cleanupRedundantFiles()];
                case 12:
                    _b.sent();
                    return [3 /*break*/, 14];
                case 13:
                    error_2 = _b.sent();
                    console.error('重複ファイルのクリーンアップ中にエラーが発生しました:', error_2);
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/];
            }
        });
    });
}
// 画像ファイルのハッシュ値を計算する関数（内容の一致を検出するため）
function calculateImageHash(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var fileContent, hash;
        return __generator(this, function (_a) {
            try {
                fileContent = fs_1.default.readFileSync(filePath);
                hash = require('crypto').createHash('md5').update(fileContent).digest('hex');
                return [2 /*return*/, hash];
            }
            catch (error) {
                console.error("\u30D5\u30A1\u30A4\u30EB\u306E\u30CF\u30C3\u30B7\u30E5\u8A08\u7B97\u306B\u5931\u6557: ".concat(filePath), error);
                return [2 /*return*/, ''];
            }
            return [2 /*return*/];
        });
    });
}
// 知識ベース内の画像ファイルの重複を検出して削除する
function detectAndRemoveDuplicateImages() {
    return __awaiter(this, void 0, void 0, function () {
        var knowledgeImagesDir, removedCount, errorCount, imageFiles, prefixPattern, fileHashes, prefixGroups, _i, imageFiles_1, file, match, prefix, _a, _b, entry, prefix, files, _c, files_3, file, filePath, hash, _d, _e, entry, hash, filePaths, timestamps, latestFileIndex, i, error_3;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    knowledgeImagesDir = path_1.default.join(process.cwd(), 'knowledge-base/images');
                    removedCount = 0;
                    errorCount = 0;
                    if (!fs_1.default.existsSync(knowledgeImagesDir)) {
                        console.log("\u753B\u50CF\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u304C\u5B58\u5728\u3057\u307E\u305B\u3093: ".concat(knowledgeImagesDir));
                        return [2 /*return*/, { removed: 0, errors: 0 }];
                    }
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 8, , 9]);
                    imageFiles = fs_1.default.readdirSync(knowledgeImagesDir)
                        .filter(function (file) { return file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'); });
                    console.log("knowledge-base/images\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u5185\u306E\u753B\u50CF\u30D5\u30A1\u30A4\u30EB\u6570: ".concat(imageFiles.length, "\u4EF6"));
                    if (imageFiles.length <= 1)
                        return [2 /*return*/, { removed: 0, errors: 0 }];
                    prefixPattern = /^(mc_\d+)_/;
                    fileHashes = new Map();
                    prefixGroups = new Map();
                    // まずファイル名のプレフィックスでグループ化（タイムスタンプ違いの可能性がある同名ファイルを見つける）
                    for (_i = 0, imageFiles_1 = imageFiles; _i < imageFiles_1.length; _i++) {
                        file = imageFiles_1[_i];
                        match = file.match(prefixPattern);
                        if (match) {
                            prefix = match[1];
                            if (!prefixGroups.has(prefix)) {
                                prefixGroups.set(prefix, []);
                            }
                            prefixGroups.get(prefix).push(file);
                        }
                    }
                    _a = 0, _b = Array.from(prefixGroups.entries());
                    _f.label = 2;
                case 2:
                    if (!(_a < _b.length)) return [3 /*break*/, 7];
                    entry = _b[_a];
                    prefix = entry[0], files = entry[1];
                    if (!(files.length > 1)) return [3 /*break*/, 6];
                    console.log("\u30D7\u30EC\u30D5\u30A3\u30C3\u30AF\u30B9 \"".concat(prefix, "\" \u3067 ").concat(files.length, "\u4EF6\u306E\u6F5C\u5728\u7684\u306A\u91CD\u8907\u30D5\u30A1\u30A4\u30EB\u3092\u691C\u51FA"));
                    _c = 0, files_3 = files;
                    _f.label = 3;
                case 3:
                    if (!(_c < files_3.length)) return [3 /*break*/, 6];
                    file = files_3[_c];
                    filePath = path_1.default.join(knowledgeImagesDir, file);
                    return [4 /*yield*/, calculateImageHash(filePath)];
                case 4:
                    hash = _f.sent();
                    if (hash) {
                        if (!fileHashes.has(hash)) {
                            fileHashes.set(hash, []);
                        }
                        fileHashes.get(hash).push(filePath);
                    }
                    _f.label = 5;
                case 5:
                    _c++;
                    return [3 /*break*/, 3];
                case 6:
                    _a++;
                    return [3 /*break*/, 2];
                case 7:
                    // 重複ファイルを削除（最も新しいタイムスタンプのファイル以外）
                    for (_d = 0, _e = Array.from(fileHashes.entries()); _d < _e.length; _d++) {
                        entry = _e[_d];
                        hash = entry[0], filePaths = entry[1];
                        if (filePaths.length > 1) {
                            console.log("\u30CF\u30C3\u30B7\u30E5\u5024 ".concat(hash, " \u3067 ").concat(filePaths.length, "\u4EF6\u306E\u91CD\u8907\u30D5\u30A1\u30A4\u30EB\u3092\u691C\u51FA"));
                            timestamps = filePaths.map(function (filePath) {
                                var fileName = path_1.default.basename(filePath);
                                var match = fileName.match(/mc_(\d+)/);
                                return match ? parseInt(match[1]) : 0;
                            });
                            latestFileIndex = timestamps.indexOf(Math.max.apply(Math, timestamps));
                            // 最新以外のファイルを削除
                            for (i = 0; i < filePaths.length; i++) {
                                if (i !== latestFileIndex) {
                                    try {
                                        fs_1.default.unlinkSync(filePaths[i]);
                                        console.log("\u91CD\u8907\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(filePaths[i]));
                                        removedCount++;
                                    }
                                    catch (error) {
                                        console.error("\u91CD\u8907\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u30A8\u30E9\u30FC: ".concat(filePaths[i]), error);
                                        errorCount++;
                                    }
                                }
                            }
                        }
                    }
                    return [2 /*return*/, { removed: removedCount, errors: errorCount }];
                case 8:
                    error_3 = _f.sent();
                    console.error('重複画像検出処理でエラーが発生しました:', error_3);
                    return [2 /*return*/, { removed: removedCount, errors: errorCount + 1 }];
                case 9: return [2 /*return*/];
            }
        });
    });
}
// knowledge-baseに存在するファイルと重複するファイルを一時ディレクトリから削除
function cleanupRedundantFiles() {
    return __awaiter(this, void 0, void 0, function () {
        var rootDir, knowledgeImagesDir, uploadsDirs, removedCount, errorCount, knowledgeImages, _i, uploadsDirs_1, dir, uploadedFiles, _a, uploadedFiles_1, file;
        return __generator(this, function (_b) {
            rootDir = process.cwd();
            knowledgeImagesDir = path_1.default.join(rootDir, 'knowledge-base/images');
            uploadsDirs = [
                path_1.default.join(rootDir, 'uploads/images'),
                path_1.default.join(rootDir, 'public/uploads/images'),
                path_1.default.join(rootDir, 'public/images')
            ];
            removedCount = 0;
            errorCount = 0;
            try {
                // knowledge-base/imagesのファイル一覧を取得
                if (!fs_1.default.existsSync(knowledgeImagesDir)) {
                    console.log("\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u304C\u5B58\u5728\u3057\u307E\u305B\u3093: ".concat(knowledgeImagesDir));
                    return [2 /*return*/, { removed: 0, errors: 0 }];
                }
                knowledgeImages = fs_1.default.readdirSync(knowledgeImagesDir);
                console.log("\u77E5\u8B58\u30D9\u30FC\u30B9\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u5185\u306E\u30D5\u30A1\u30A4\u30EB\u6570: ".concat(knowledgeImages.length, "\u4EF6"));
                // 各アップロードディレクトリをチェック
                for (_i = 0, uploadsDirs_1 = uploadsDirs; _i < uploadsDirs_1.length; _i++) {
                    dir = uploadsDirs_1[_i];
                    if (!fs_1.default.existsSync(dir)) {
                        console.log("\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u304C\u5B58\u5728\u3057\u307E\u305B\u3093: ".concat(dir));
                        // ディレクトリが存在しない場合は作成する（一時ファイル用）
                        fs_1.default.mkdirSync(dir, { recursive: true });
                        console.log("\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F: ".concat(dir));
                        continue;
                    }
                    uploadedFiles = fs_1.default.readdirSync(dir);
                    console.log("\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u5185\u306E\u30D5\u30A1\u30A4\u30EB\u6570: ".concat(dir, " - ").concat(uploadedFiles.length, "\u4EF6"));
                    for (_a = 0, uploadedFiles_1 = uploadedFiles; _a < uploadedFiles_1.length; _a++) {
                        file = uploadedFiles_1[_a];
                        // knowledge-baseに同名のファイルが存在する場合は削除
                        if (knowledgeImages.includes(file)) {
                            try {
                                fs_1.default.unlinkSync(path_1.default.join(dir, file));
                                console.log("\u91CD\u8907\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(path_1.default.join(dir, file)));
                                removedCount++;
                            }
                            catch (error) {
                                console.error("\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u30A8\u30E9\u30FC: ".concat(path_1.default.join(dir, file)), error);
                                errorCount++;
                            }
                        }
                    }
                }
                console.log("\u91CD\u8907\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u7D50\u679C: \u6210\u529F=".concat(removedCount, "\u4EF6, \u5931\u6557=").concat(errorCount, "\u4EF6"));
                return [2 /*return*/, { removed: removedCount, errors: errorCount }];
            }
            catch (error) {
                console.error('重複ファイル削除処理でエラーが発生しました:', error);
                return [2 /*return*/, { removed: removedCount, errors: errorCount + 1 }];
            }
            return [2 /*return*/];
        });
    });
}
// ファイルがknowledge-baseに存在するか確認してから削除
function verifyAndCleanupFile(filePath, subDir) {
    return __awaiter(this, void 0, void 0, function () {
        var fileName, fileExt, baseNameWithoutExt, kbTargetDir, kbTargetPath;
        return __generator(this, function (_a) {
            try {
                fileName = path_1.default.basename(filePath);
                fileExt = path_1.default.extname(fileName);
                baseNameWithoutExt = path_1.default.basename(fileName, fileExt);
                kbTargetDir = '';
                if (subDir === 'images') {
                    kbTargetDir = path_1.default.join(process.cwd(), 'knowledge-base', 'images');
                }
                else if (subDir === 'json') {
                    kbTargetDir = path_1.default.join(process.cwd(), 'knowledge-base', 'json');
                }
                else if (subDir === 'data') {
                    kbTargetDir = path_1.default.join(process.cwd(), 'knowledge-base', 'data');
                }
                else {
                    // pptやtempなどはknowledge-baseに対応しないので直接削除
                    fs_1.default.unlinkSync(filePath);
                    console.log("\u4E00\u6642\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(filePath));
                    return [2 /*return*/];
                }
                kbTargetPath = path_1.default.join(kbTargetDir, fileName);
                if (fs_1.default.existsSync(kbTargetPath)) {
                    // knowledge-baseに存在する場合は安全に削除
                    fs_1.default.unlinkSync(filePath);
                    console.log("uploads\u5185\u306E\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F (knowledge-base\u306B\u5B58\u5728\u78BA\u8A8D\u6E08\u307F): ".concat(filePath));
                }
                else {
                    console.log("\u8B66\u544A: knowledge-base\u306B\u5BFE\u5FDC\u3059\u308B\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u3089\u306A\u3044\u305F\u3081\u3001\u524A\u9664\u3092\u30B9\u30AD\u30C3\u30D7\u3057\u307E\u3059: ".concat(filePath));
                }
            }
            catch (error) {
                console.error("\u30D5\u30A1\u30A4\u30EB\u306E\u691C\u8A3C\u30FB\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(filePath), error);
            }
            return [2 /*return*/];
        });
    });
}
// ディレクトリを再帰的に検証して削除
function verifyAndCleanupDirectory(dirPath) {
    return __awaiter(this, void 0, void 0, function () {
        var files, _i, files_4, file, filePath, stat, relPath, topDir, remainingFiles, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!fs_1.default.existsSync(dirPath))
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 9]);
                    files = fs_1.default.readdirSync(dirPath);
                    _i = 0, files_4 = files;
                    _a.label = 2;
                case 2:
                    if (!(_i < files_4.length)) return [3 /*break*/, 7];
                    file = files_4[_i];
                    filePath = path_1.default.join(dirPath, file);
                    stat = fs_1.default.statSync(filePath);
                    if (!stat.isDirectory()) return [3 /*break*/, 4];
                    return [4 /*yield*/, verifyAndCleanupDirectory(filePath)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    relPath = path_1.default.relative(path_1.default.join(process.cwd(), 'uploads'), dirPath);
                    topDir = relPath.split(path_1.default.sep)[0];
                    return [4 /*yield*/, verifyAndCleanupFile(filePath, topDir)];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7:
                    remainingFiles = fs_1.default.readdirSync(dirPath);
                    if (remainingFiles.length === 0) {
                        fs_1.default.rmdirSync(dirPath);
                        console.log("\u7A7A\u306E\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(dirPath));
                    }
                    return [3 /*break*/, 9];
                case 8:
                    error_4 = _a.sent();
                    console.error("\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306E\u691C\u8A3C\u30FB\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(dirPath), error_4);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
// ディレクトリ構造の整理：知識ベース用、画像検索用、一時アップロード用に分離
var knowledgeBaseDir = path_1.default.join(process.cwd(), 'knowledge-base');
var knowledgeBaseDataDir = path_1.default.join(knowledgeBaseDir, 'data');
var knowledgeBaseImagesDir = path_1.default.join(knowledgeBaseDir, 'images');
// knowledge-base/imagesディレクトリを画像用に使用 (一元化)
var publicImagesDir = path_1.default.join(process.cwd(), 'knowledge-base', 'images');
// 知識ベース一時ディレクトリのパス
var knowledgeBaseTempDir = path_1.default.join(knowledgeBaseDir, 'temp');
// ディレクトリが存在することを確認
ensureDirectoryExists(knowledgeBaseDir);
ensureDirectoryExists(knowledgeBaseDataDir);
ensureDirectoryExists(knowledgeBaseImagesDir);
ensureDirectoryExists(knowledgeBaseTempDir);
ensureDirectoryExists(publicImagesDir);
// Multerストレージ設定
var storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        // 処理タイプによって保存先を変更
        var processingType = req.body.processingType || 'document';
        if (file.mimetype.includes('svg') || file.mimetype.includes('image')) {
            // 画像ファイルはすべてknowledge-baseのimagesディレクトリに直接保存
            cb(null, knowledgeBaseImagesDir);
        }
        else {
            // 文書ファイルはknowledge-baseの一時保存用tempディレクトリに保存
            var knowledgeBaseTempDir_1 = path_1.default.join(knowledgeBaseDir, 'temp');
            ensureDirectoryExists(knowledgeBaseTempDir_1);
            cb(null, knowledgeBaseTempDir_1);
        }
    },
    filename: function (req, file, cb) {
        // 一意のファイル名を生成
        var uniqueId = Date.now().toString();
        var extname = path_1.default.extname(file.originalname);
        // バッファからUTF-8でファイル名をデコードし、日本語ファイル名に対応
        var originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        // ファイル名に使用できない文字を除去し、スペースをアンダースコアに変換
        var sanitizedName = originalName.split('.')[0]
            .replace(/[\/\\:*?"<>|]/g, '')
            .replace(/\s+/g, '_');
        // MC + 日本語部分を含む名前を保持しつつ、一意性を確保
        cb(null, "".concat(sanitizedName, "_").concat(uniqueId).concat(extname));
    }
});
var upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // 許可する拡張子
        var allowedExtensions = ['.pdf', '.docx', '.xlsx', '.pptx', '.svg', '.png', '.jpg', '.jpeg', '.gif'];
        var ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error("\u30B5\u30DD\u30FC\u30C8\u3055\u308C\u3066\u3044\u306A\u3044\u30D5\u30A1\u30A4\u30EB\u5F62\u5F0F\u3067\u3059\u3002\u30B5\u30DD\u30FC\u30C8\u5F62\u5F0F: ".concat(allowedExtensions.join(', '))));
        }
    }
});
var router = express_1.default.Router();
/**
 * 画像検索APIエンドポイント
 * クライアントからのFuse.js検索リクエストを処理
 */
router.post('/image-search', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, query, _b, count, searchDataPath, rawData, searchData, fuse, results, partialMatches, images_1, images;
    return __generator(this, function (_c) {
        _a = req.body, query = _a.query, _b = _a.count, count = _b === void 0 ? 10 : _b;
        try {
            console.log('画像検索APIリクエスト:', "query=\"".concat(query, "\", count=").concat(count));
            searchDataPath = path_1.default.join(process.cwd(), 'knowledge-base', 'data', 'image_search_data.json');
            rawData = fs_1.default.readFileSync(searchDataPath, 'utf-8');
            searchData = JSON.parse(rawData);
            console.log('画像検索データを読み込み:', "".concat(searchData.length, "\u4EF6"));
            // デバッグ: 最初の数件のデータ内容を確認
            console.log('検索データサンプル (最初の3件):');
            searchData.slice(0, 3).forEach(function (item, index) {
                var _a;
                console.log("  ".concat(index + 1, ". title: \"").concat(item.title, "\", keywords: [").concat((_a = item.keywords) === null || _a === void 0 ? void 0 : _a.join(', '), "], searchText: \"").concat(item.searchText || '', "\""));
            });
            fuse = new fuse_js_1.default(searchData, {
                keys: [
                    { name: 'title', weight: 1.0 },
                    { name: 'description', weight: 0.8 },
                    { name: 'keywords', weight: 1.2 }, // キーワードの重みを増加
                    { name: 'searchText', weight: 0.6 }
                ],
                threshold: 0.6, // より柔軟な検索（0.4から0.6に変更）
                includeScore: true,
                ignoreLocation: true,
                useExtendedSearch: true,
                minMatchCharLength: 1, // 最小マッチ文字数を1に変更（短い検索語にも対応）
                distance: 100, // 検索距離を制限
                shouldSort: true,
                findAllMatches: false // すべてではなく、より良いマッチのみ
            });
            results = fuse.search(query);
            console.log('Fuse.js検索結果:', "".concat(results.length, "\u4EF6\u898B\u3064\u304B\u308A\u307E\u3057\u305F"));
            // 結果が少ない場合は部分一致も試行
            if (results.length === 0) {
                console.log('Fuse.jsで結果が見つからないため、部分一致検索を実行します');
                partialMatches = searchData.filter(function (item) {
                    var searchableText = __spreadArray(__spreadArray([
                        item.title || '',
                        item.description || ''
                    ], (item.keywords || []), true), [
                        item.searchText || ''
                    ], false).join(' ').toLowerCase();
                    return searchableText.includes(query.toLowerCase());
                });
                console.log('部分一致検索結果:', "".concat(partialMatches.length, "\u4EF6\u898B\u3064\u304B\u308A\u307E\u3057\u305F"));
                images_1 = partialMatches.slice(0, count).map(function (item, index) { return ({
                    id: item.id,
                    url: item.file,
                    file: item.file,
                    title: item.title,
                    type: 'image',
                    relevance: 0.5 // 部分一致は中程度のrelevance
                }); });
                return [2 /*return*/, res.json({ images: images_1 })];
            }
            images = results.slice(0, count).map(function (result) { return ({
                id: result.item.id,
                url: result.item.file,
                file: result.item.file,
                title: result.item.title,
                type: 'image',
                relevance: 1 - (result.score || 0)
            }); });
            res.json({ images: images });
        }
        catch (err) {
            console.error('Image search error:', err);
            res.status(500).json({ error: 'Image search failed' });
        }
        return [2 /*return*/];
    });
}); });
/**
 * キャッシュをクリアするエンドポイント
 * 削除操作後にクライアントがこれを呼び出すことで、最新情報を確実に取得
 */
router.post('/clear-cache', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var jsonDir, files, _i, files_5, file, fullPath, indexJsonPath, jsonFiles, indexData, blacklistFiles_1, validFiles, _a, validFiles_1, file, content, data, id, title;
    return __generator(this, function (_b) {
        try {
            console.log('サーバーキャッシュクリア要求を受信しました');
            jsonDir = path_1.default.join(process.cwd(), 'knowledge-base', 'json');
            if (fs_1.default.existsSync(jsonDir)) {
                try {
                    files = fs_1.default.readdirSync(jsonDir);
                    logDebug("JSON\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u5185\u30D5\u30A1\u30A4\u30EB\u6570: ".concat(files.length));
                    // キャッシュからファイルの実在性を再チェック
                    for (_i = 0, files_5 = files; _i < files_5.length; _i++) {
                        file = files_5[_i];
                        fullPath = path_1.default.join(jsonDir, file);
                        try {
                            // ファイルの存在を確認し、アクセス可能かチェック
                            fs_1.default.accessSync(fullPath, fs_1.default.constants.F_OK | fs_1.default.constants.R_OK);
                        }
                        catch (err) {
                            // アクセスできない場合は警告を出す
                            logDebug('ファイルアクセス警告', err);
                        }
                    }
                }
                catch (readErr) {
                    logDebug('ディレクトリ読み取りエラー:', readErr);
                }
            }
            indexJsonPath = path_1.default.join(process.cwd(), 'knowledge-base', 'index.json');
            try {
                jsonFiles = fs_1.default.existsSync(jsonDir) ? fs_1.default.readdirSync(jsonDir) : [];
                indexData = {
                    lastUpdated: new Date().toISOString(),
                    guides: [],
                    fileCount: jsonFiles.length
                };
                blacklistFiles_1 = ['guide_1744876440009_metadata.json'];
                validFiles = jsonFiles.filter(function (file) {
                    return file.endsWith('_metadata.json') &&
                        !blacklistFiles_1.includes(file);
                });
                console.log('有効なJSONファイル:', validFiles);
                // インデックスに追加
                for (_a = 0, validFiles_1 = validFiles; _a < validFiles_1.length; _a++) {
                    file = validFiles_1[_a];
                    try {
                        content = fs_1.default.readFileSync(path_1.default.join(jsonDir, file), 'utf8');
                        data = JSON.parse(content);
                        id = file.replace('_metadata.json', '');
                        title = id;
                        if (data.metadata && data.metadata.タイトル) {
                            title = data.metadata.タイトル;
                        }
                        else if (data.title) {
                            title = data.title;
                        }
                        indexData.guides.push({
                            id: id,
                            title: title,
                            filePath: path_1.default.join(jsonDir, file),
                            fileName: file
                        });
                    }
                    catch (parseErr) {
                        console.error("\u30D5\u30A1\u30A4\u30EB\u306E\u89E3\u6790\u30A8\u30E9\u30FC ".concat(file, ":"), parseErr);
                    }
                }
                // インデックスを保存
                fs_1.default.writeFileSync(indexJsonPath, JSON.stringify(indexData, null, 2), 'utf8');
                console.log('index.jsonファイルを更新しました');
            }
            catch (indexErr) {
                console.error('index.json更新エラー:', indexErr);
            }
            return [2 /*return*/, res.json({
                    success: true,
                    message: 'サーバーキャッシュをクリアしました',
                    timestamp: new Date().toISOString()
                })];
        }
        catch (error) {
            console.error('キャッシュクリアエラー:', error);
            return [2 /*return*/, res.status(500).json({
                    error: 'キャッシュクリアに失敗しました',
                    details: error instanceof Error ? error.message : String(error)
                })];
        }
        return [2 /*return*/];
    });
}); });
/**
 * JSON ファイル一覧を取得するエンドポイント
 * 最新のJSONファイルを優先的に取得
 */
router.get('/list-json-files', function (req, res) {
    try {
        console.log('JSONファイル一覧取得リクエストを受信...');
        // ファイルは知識ベースディレクトリに一元化
        var jsonDirs = [
            path_1.default.join(process.cwd(), 'knowledge-base', 'json') // メインの場所
        ];
        var allJsonFiles = [];
        // 問題が発生しているファイルのブラックリスト
        var blacklistedFiles_1 = [
            'guide_1744876404679_metadata.json', // 問題が発生しているファイル
            'guide_metadata.json' // 別の問題が報告されているファイル
        ];
        console.log("\u30D6\u30E9\u30C3\u30AF\u30EA\u30B9\u30C8\u30D5\u30A1\u30A4\u30EB: ".concat(blacklistedFiles_1.join(', ')));
        var _loop_1 = function (jsonDir) {
            if (fs_1.default.existsSync(jsonDir)) {
                // ディレクトリの内容を確認し、すべてのファイルをログ出力
                var allFiles = fs_1.default.readdirSync(jsonDir);
                console.log("".concat(jsonDir, "\u5185\u306E\u3059\u3079\u3066\u306E\u30D5\u30A1\u30A4\u30EB:"), allFiles);
                // 実在するJSONファイルのみフィルタリング
                var files = allFiles
                    .filter(function (file) { return file.endsWith('_metadata.json'); })
                    .filter(function (file) {
                    // ブラックリストにあるファイルを除外
                    if (blacklistedFiles_1.includes(file)) {
                        console.log("\u30D6\u30E9\u30C3\u30AF\u30EA\u30B9\u30C8\u306E\u305F\u3081\u9664\u5916: ".concat(file));
                        return false;
                    }
                    // 実際にファイルが存在するか確認
                    var filePath = path_1.default.join(jsonDir, file);
                    var exists = fs_1.default.existsSync(filePath);
                    if (!exists) {
                        console.log("\u30D5\u30A1\u30A4\u30EB\u304C\u5B9F\u969B\u306B\u306F\u5B58\u5728\u3057\u306A\u3044\u305F\u3081\u9664\u5916: ".concat(filePath));
                        return false;
                    }
                    return true;
                });
                console.log("".concat(jsonDir, "\u5185\u306E\u6709\u52B9\u306A\u30E1\u30BF\u30C7\u30FC\u30BF\u30D5\u30A1\u30A4\u30EB: ").concat(files.length, "\u4EF6"));
                allJsonFiles = __spreadArray(__spreadArray([], allJsonFiles, true), files, true);
            }
            else {
                // ディレクトリが存在しない場合は作成
                fs_1.default.mkdirSync(jsonDir, { recursive: true });
                console.log("\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F: ".concat(jsonDir));
            }
        };
        // 各ディレクトリからメタデータJSONファイルを収集
        for (var _i = 0, jsonDirs_1 = jsonDirs; _i < jsonDirs_1.length; _i++) {
            var jsonDir = jsonDirs_1[_i];
            _loop_1(jsonDir);
        }
        // 重複を排除して一意のファイル名リストにする
        var uniqueJsonFiles = Array.from(new Set(allJsonFiles));
        console.log("\u91CD\u8907\u9664\u5916\u5F8C\u306E\u30D5\u30A1\u30A4\u30EB\u6570: ".concat(uniqueJsonFiles.length, "\u4EF6"));
        // タイムスタンプでソート（新しい順）
        var sortedFiles = uniqueJsonFiles.sort(function (a, b) {
            // ファイル名からタイムスタンプを抽出: mc_1744105287121_metadata.json -> 1744105287121
            var timestampA = a.split('_')[1] || '0';
            var timestampB = b.split('_')[1] || '0';
            return parseInt(timestampB) - parseInt(timestampA);
        });
        // 応答ヘッダーを設定して、キャッシュを無効化
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        // ファイル一覧をJSONで返す
        return res.json(sortedFiles);
    }
    catch (error) {
        console.error('JSONファイル一覧取得エラー:', error);
        return res.status(500).json({
            error: 'JSONファイル一覧の取得に失敗しました',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * 技術サポート文書のアップロードと処理を行うエンドポイント
 */
// ユーティリティ関数：フォールバック画像検索データを生成
function generateFallbackImageSearchData() {
    return [
        {
            id: "fallback_image_1",
            file: "/knowledge-base/images/fallback_image_1.png",
            title: "フォールバック画像1",
            category: "一般",
            keywords: ["フォールバック", "画像", "一般"],
            description: "システムが初期化されていない場合のフォールバック画像です。",
            searchText: "フォールバック 画像 一般 システム 初期化",
        },
        {
            id: "fallback_image_2",
            file: "/knowledge-base/images/fallback_image_2.png",
            title: "フォールバック画像2",
            category: "警告",
            keywords: ["フォールバック", "画像", "警告"],
            description: "データが利用できないことを示すフォールバック画像です。",
            searchText: "フォールバック 画像 警告 データ 利用不可",
        },
    ];
}
// 画像検索データの初期化用エンドポイント
router.post('/init-image-search-data', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var imagesDir, jsonDir, existingImageFiles_1, existingDataPath, existingData, existingContent, rawData, newData_1, jsonFiles, _i, jsonFiles_1, jsonFile, jsonPath, metadata, combinedData_1, newCount_1, validData;
    return __generator(this, function (_a) {
        try {
            logInfo('Image search data initialization started');
            imagesDir = path_1.default.join(knowledgeBaseDir, 'images');
            jsonDir = path_1.default.join(process.cwd(), 'knowledge-base', 'json');
            logPath('Images directory:', imagesDir);
            logPath('JSON directory:', jsonDir);
            existingImageFiles_1 = [];
            if (fs_1.default.existsSync(imagesDir)) {
                existingImageFiles_1 = fs_1.default.readdirSync(imagesDir)
                    .filter(function (file) { return file.toLowerCase().endsWith('.png'); })
                    .map(function (file) { return "/knowledge-base/images/".concat(file); });
                console.log("\u5B9F\u969B\u306B\u5B58\u5728\u3059\u308B\u753B\u50CF\u30D5\u30A1\u30A4\u30EB: ".concat(existingImageFiles_1.length, "\u4EF6"));
            }
            existingDataPath = path_1.default.join(knowledgeBaseDataDir, 'image_search_data.json');
            existingData = [];
            if (fs_1.default.existsSync(existingDataPath)) {
                try {
                    existingContent = fs_1.default.readFileSync(existingDataPath, 'utf-8');
                    rawData = JSON.parse(existingContent);
                    // 実際に存在するファイルのみをフィルタリング
                    existingData = rawData.filter(function (item) {
                        return item.file && existingImageFiles_1.includes(item.file);
                    });
                    console.log("\u65E2\u5B58\u306E\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F: ".concat(existingData.length, "\u4EF6\uFF08\u5B9F\u5728\u30D5\u30A1\u30A4\u30EB\u306E\u307F\uFF09"));
                }
                catch (error) {
                    console.warn('既存データの読み込みに失敗:', error);
                    existingData = [];
                }
            }
            newData_1 = [];
            if (fs_1.default.existsSync(jsonDir)) {
                jsonFiles = fs_1.default.readdirSync(jsonDir).filter(function (file) {
                    return file.endsWith('_metadata.json') && !file.includes('guide_');
                });
                for (_i = 0, jsonFiles_1 = jsonFiles; _i < jsonFiles_1.length; _i++) {
                    jsonFile = jsonFiles_1[_i];
                    jsonPath = path_1.default.join(jsonDir, jsonFile);
                    try {
                        metadata = JSON.parse(fs_1.default.readFileSync(jsonPath, 'utf-8'));
                        // スライドから画像データを生成（実在ファイルのみ）
                        if (metadata.slides && Array.isArray(metadata.slides)) {
                            metadata.slides.forEach(function (slide, index) {
                                if (slide['画像テキスト'] && Array.isArray(slide['画像テキスト']) && slide['画像テキスト'].length > 0) {
                                    var imageText = slide['画像テキスト'][0];
                                    if (imageText && imageText['画像パス']) {
                                        var fileName = path_1.default.basename(imageText['画像パス']);
                                        var imagePath = "/knowledge-base/images/".concat(fileName);
                                        // 実際にファイルが存在する場合のみ追加
                                        if (existingImageFiles_1.includes(imagePath)) {
                                            // 詳細な説明文を生成
                                            var slideTitle = slide['タイトル'] || "\u30B9\u30E9\u30A4\u30C9 ".concat(index + 1);
                                            var slideContent = slide['本文'] ? slide['本文'].join('。') : '';
                                            var slideNotes = slide['ノート'] || '';
                                            var description = [
                                                "".concat(slideTitle, "\u306E\u8A73\u7D30\u56F3"),
                                                slideContent,
                                                slideNotes.length > 0 ? "\u88DC\u8DB3\uFF1A".concat(slideNotes) : ''
                                            ].filter(Boolean).join('。');
                                            var slideData = {
                                                id: "slide_".concat(slide['スライド番号'] || index + 1),
                                                file: imagePath,
                                                title: slideTitle,
                                                category: "保守用車マニュアル",
                                                keywords: __spreadArray(__spreadArray([
                                                    slideTitle
                                                ], (slide['本文'] || []), true), [
                                                    "保守用車", "マニュアル", "エンジン", "整備", "修理", "部品"
                                                ], false).filter(Boolean),
                                                description: description,
                                                searchText: __spreadArray(__spreadArray([
                                                    slideTitle
                                                ], (slide['本文'] || []), true), [
                                                    "保守用車マニュアル", "エンジン", "整備", "修理", "部品", "車両", "動力"
                                                ], false).filter(Boolean).join(' ')
                                            };
                                            newData_1.push(slideData);
                                        }
                                    }
                                }
                            });
                        }
                        // 埋め込み画像から画像データを生成（実在ファイルのみ）
                        if (metadata.embeddedImages && Array.isArray(metadata.embeddedImages)) {
                            metadata.embeddedImages.forEach(function (img, index) {
                                if (img['抽出パス']) {
                                    var filename = path_1.default.basename(img['抽出パス']);
                                    var imagePath = "/knowledge-base/images/".concat(filename);
                                    // 実際にファイルが存在する場合のみ追加
                                    if (existingImageFiles_1.includes(imagePath)) {
                                        // 元のファイル名から詳細情報を抽出
                                        var originalName = img['元のファイル名'] || '';
                                        var category = "部品写真";
                                        var description = "\u4FDD\u5B88\u7528\u8ECA\u306E\u90E8\u54C1\u753B\u50CF\u3067\u3059\u3002";
                                        var keywords = ["保守用車", "部品", "写真"];
                                        // ファイル名に基づいてカテゴリと説明を設定
                                        if (originalName.includes('engine') || originalName.includes('エンジン')) {
                                            category = "エンジン部品";
                                            description = "保守用車のエンジン関連部品の詳細画像です。エンジンの構造や部品配置を確認できます。";
                                            keywords = ["保守用車", "エンジン", "動力系", "部品"];
                                        }
                                        else if (originalName.includes('brake') || originalName.includes('ブレーキ')) {
                                            category = "ブレーキ系統";
                                            description = "保守用車のブレーキ系統部品の詳細画像です。制動装置の構造や配置を確認できます。";
                                            keywords = ["保守用車", "ブレーキ", "制動装置", "部品"];
                                        }
                                        else if (originalName.includes('wheel') || originalName.includes('車輪')) {
                                            category = "足回り";
                                            description = "保守用車の足回り部品の詳細画像です。車輪やサスペンション部品を確認できます。";
                                            keywords = ["保守用車", "車輪", "足回り", "部品"];
                                        }
                                        var imageData = {
                                            id: "img_".concat(index + 1),
                                            file: imagePath,
                                            title: "".concat(category, " ").concat(index + 1),
                                            category: category,
                                            keywords: __spreadArray(__spreadArray([], keywords, true), ["エンジン", "整備", "修理", "部品"], false),
                                            description: description,
                                            searchText: "".concat(category, " ").concat(index + 1, " ").concat(keywords.join(' '), " \u30A8\u30F3\u30B8\u30F3 \u6574\u5099 \u4FEE\u7406 \u90E8\u54C1 \u4FDD\u5B88\u7528\u8ECA \u30DE\u30CB\u30E5\u30A2\u30EB")
                                        };
                                        newData_1.push(imageData);
                                    }
                                }
                            });
                        }
                    }
                    catch (error) {
                        console.error("\u30E1\u30BF\u30C7\u30FC\u30BF\u30D5\u30A1\u30A4\u30EB\u51E6\u7406\u30A8\u30E9\u30FC: ".concat(jsonFile), error);
                    }
                }
            }
            combinedData_1 = __spreadArray([], existingData, true);
            newCount_1 = 0;
            newData_1.forEach(function (newItem) {
                var exists = combinedData_1.some(function (existing) { return existing.id === newItem.id; });
                if (!exists) {
                    combinedData_1.push(newItem);
                    newCount_1++;
                }
            });
            validData = combinedData_1.filter(function (item) {
                return item.file && existingImageFiles_1.includes(item.file);
            });
            // データをファイルに保存
            fs_1.default.writeFileSync(existingDataPath, JSON.stringify(validData, null, 2), 'utf-8');
            console.log('データをknowledge-base/dataに保存しました');
            res.json({
                success: true,
                count: validData.length,
                message: "\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u521D\u671F\u5316\u3057\u307E\u3057\u305F: ".concat(validData.length, "\u4EF6")
            });
            console.log("\u30C7\u30FC\u30BF\u3092\u7D71\u5408\u3057\u307E\u3057\u305F: ".concat(validData.length, "\u4EF6\uFF08\u65B0\u898F: ").concat(newCount_1, "\u4EF6\uFF09"));
            console.log("\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u521D\u671F\u5316\u3057\u307E\u3057\u305F: ".concat(validData.length, "\u4EF6"));
        }
        catch (error) {
            console.error('画像検索データ初期化エラー:', error);
            res.status(500).json({
                success: false,
                message: '画像検索データの初期化に失敗しました'
            });
        }
        return [2 /*return*/];
    });
}); });
// 技術文書アップロードエンドポイント
router.post('/upload', upload.single('file'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var file, keepOriginalFile, filePath_1, fileExt, fileBaseName, filesDir, processingType, fileId_1, pngFilePath, originalFilePath, updatedFilePath, updatedFileExt, origFilePath, svgContent, svgBuffer, convErr_1, knowledgeBaseDataDir_1, imageSearchDataPath, imageSearchData, jsonContent, fileName, title, category, keywords, additionalKeywords, allKeywords, searchText, details, newImageItem, existingIndex, imgError_1, extractedText, pageCount, metadata, _a, pdfResult, knowledgeBaseDataDir_2, extractedDataPath, extractedData, vehicleDataKey, vehicleData, timestamp, prefix, metadataFileName, jsonDir, metadataFilePath, newData_2, metadataContent, existingIndex, kbError_1, processingError_1, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 27, , 28]);
                file = req.file;
                if (!file)
                    return [2 /*return*/, res.status(400).json({ error: "ファイルがアップロードされていません" })];
                console.log("\u30D5\u30A1\u30A4\u30EB\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u51E6\u7406\u958B\u59CB: ".concat(file.originalname));
                keepOriginalFile = req.body.keepOriginalFile === 'true';
                console.log("\u5143\u30D5\u30A1\u30A4\u30EB\u4FDD\u5B58: ".concat(keepOriginalFile ? '有効' : '無効（デフォルト）'));
                // アップロード開始時に一時ディレクトリのクリーンアップを実行
                try {
                    // 知識ベース一時ディレクトリをクリーンアップ
                    cleanupTempDirectory(knowledgeBaseTempDir);
                    console.log('一時ディレクトリをクリーンアップしました');
                }
                catch (cleanupError) {
                    console.error('一時ディレクトリのクリーンアップに失敗しました:', cleanupError);
                    // クリーンアップの失敗は無視して処理を続行
                }
                filePath_1 = file.path;
                fileExt = path_1.default.extname(file.originalname).toLowerCase();
                fileBaseName = path_1.default.basename(file.path);
                filesDir = path_1.default.dirname(file.path);
                processingType = req.body.processingType || 'document';
                console.log("\u51E6\u7406\u30BF\u30A4\u30D7: ".concat(processingType));
                console.log("\u30D5\u30A1\u30A4\u30EB\u30D1\u30B9: ".concat(filePath_1));
                console.log("\u30D5\u30A1\u30A4\u30EB\u62E1\u5F35\u5B50: ".concat(fileExt));
                if (!(processingType === 'image_search' && ['.svg', '.png', '.jpg', '.jpeg', '.gif'].includes(fileExt))) return [3 /*break*/, 10];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 9, , 10]);
                console.log("画像検索用データ処理を開始します");
                fileId_1 = path_1.default.basename(filePath_1, fileExt).toLowerCase().replace(/\s+/g, '_');
                pngFilePath = '';
                originalFilePath = filePath_1;
                updatedFilePath = filePath_1;
                updatedFileExt = fileExt;
                if (!(fileExt !== '.png')) return [3 /*break*/, 8];
                _b.label = 2;
            case 2:
                _b.trys.push([2, 7, , 8]);
                origFilePath = filePath_1;
                // PNGファイルパスを生成
                pngFilePath = path_1.default.join(publicImagesDir, "".concat(path_1.default.basename(filePath_1, fileExt), ".png"));
                console.log("".concat(fileExt, "\u5F62\u5F0F\u304B\u3089PNG\u5F62\u5F0F\u306B\u5909\u63DB: ").concat(pngFilePath));
                if (!(fileExt === '.svg')) return [3 /*break*/, 4];
                svgContent = fs_1.default.readFileSync(origFilePath, 'utf8');
                svgBuffer = Buffer.from(svgContent);
                return [4 /*yield*/, (0, sharp_1.default)(svgBuffer)
                        .png()
                        .toFile(pngFilePath)];
            case 3:
                _b.sent();
                return [3 /*break*/, 6];
            case 4: 
            // その他の画像形式はそのままsharpで変換
            return [4 /*yield*/, (0, sharp_1.default)(origFilePath)
                    .png()
                    .toFile(pngFilePath)];
            case 5:
                // その他の画像形式はそのままsharpで変換
                _b.sent();
                _b.label = 6;
            case 6:
                console.log("PNG\u5F62\u5F0F\u306B\u5909\u63DB\u5B8C\u4E86: ".concat(pngFilePath));
                // 以降の処理では変換したPNGファイルを使用
                originalFilePath = origFilePath; // 元のパスを記録
                updatedFilePath = pngFilePath; // 処理中のファイルパスを更新
                updatedFileExt = '.png'; // 拡張子を更新
                return [3 /*break*/, 8];
            case 7:
                convErr_1 = _b.sent();
                console.error("".concat(fileExt, "\u304B\u3089PNG\u3078\u306E\u5909\u63DB\u30A8\u30E9\u30FC:"), convErr_1);
                // 変換に失敗した場合は元のファイルパスを使用
                pngFilePath = '';
                return [3 /*break*/, 8];
            case 8:
                knowledgeBaseDataDir_1 = path_1.default.join(process.cwd(), 'knowledge-base', 'data');
                if (!fs_1.default.existsSync(knowledgeBaseDataDir_1)) {
                    fs_1.default.mkdirSync(knowledgeBaseDataDir_1, { recursive: true });
                }
                imageSearchDataPath = path_1.default.join(knowledgeBaseDataDir_1, 'image_search_data.json');
                imageSearchData = [];
                if (fs_1.default.existsSync(imageSearchDataPath)) {
                    try {
                        jsonContent = fs_1.default.readFileSync(imageSearchDataPath, 'utf8');
                        imageSearchData = JSON.parse(jsonContent);
                        console.log("\u65E2\u5B58\u306E\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F: ".concat(imageSearchData.length, "\u4EF6"));
                    }
                    catch (jsonErr) {
                        console.error("JSON読み込みエラー:", jsonErr);
                        // 読み込みエラーの場合は新規作成
                        imageSearchData = [];
                    }
                }
                fileName = path_1.default.basename(file.originalname, fileExt);
                title = fileName.replace(/_/g, ' ').replace(/\b\w/g, function (l) { return l.toUpperCase(); });
                category = '';
                keywords = [];
                if (fileName.includes('engine') || fileName.includes('motor')) {
                    category = 'エンジン';
                    keywords = ["エンジン", "モーター", "動力系"];
                }
                else if (fileName.includes('cooling') || fileName.includes('radiator')) {
                    category = '冷却系統';
                    keywords = ["冷却", "ラジエーター", "水漏れ"];
                }
                else if (fileName.includes('frame') || fileName.includes('chassis')) {
                    category = '車体';
                    keywords = ["フレーム", "シャーシ", "車体"];
                }
                else if (fileName.includes('cabin') || fileName.includes('cockpit')) {
                    category = '運転室';
                    keywords = ["キャビン", "運転室", "操作パネル"];
                }
                else {
                    category = '保守用車パーツ';
                    keywords = ["保守", "部品", "修理"];
                }
                additionalKeywords = fileName
                    .replace(/[0-9_\-\.]/g, ' ')
                    .split(/\s+/)
                    .filter(function (word) { return word.length > 1; })
                    .map(function (word) { return word.toLowerCase(); });
                allKeywords = __spreadArray(["保守用車", "部品", "写真", "エンジン", "整備", "修理"], additionalKeywords, true);
                searchText = __spreadArray(__spreadArray([title, category], allKeywords, true), ["動力", "機械", "運転"], false).join(' ');
                details = [
                    "\u4FDD\u5B88\u7528\u8ECA\u306E".concat(category, "\u306B\u95A2\u3059\u308B\u6280\u8853\u56F3\u9762"),
                    "".concat(title, "\u306E\u8A73\u7D30\u56F3"),
                    "\u6574\u5099\u30FB\u70B9\u691C\u30FB\u4FEE\u7406\u306B\u4F7F\u7528",
                    "\u6280\u8853\u30DE\u30CB\u30E5\u30A2\u30EB\u53C2\u7167\u8CC7\u6599"
                ];
                newImageItem = {
                    id: fileId_1,
                    file: "/knowledge-base/images/".concat(path_1.default.basename(updatedFilePath || filePath_1)),
                    // 全てPNG形式に統一するため、pngFallbackは不要になりました
                    pngFallback: '',
                    title: title,
                    category: category,
                    keywords: allKeywords,
                    description: "\u4FDD\u5B88\u7528\u8ECA\u306E".concat(category, "\u306B\u95A2\u3059\u308B\u56F3\u9762\u307E\u305F\u306F\u5199\u771F\u3067\u3059\u3002").concat(title, "\u306E\u8A73\u7D30\u3092\u793A\u3057\u3066\u3044\u307E\u3059\u3002"),
                    details: details.join('. '),
                    searchText: "".concat(title, " ").concat(category, " ").concat(allKeywords.join(' '), " \u4FDD\u5B88\u7528\u8ECA \u6280\u8853\u56F3\u9762 \u6574\u5099 \u70B9\u691C \u4FEE\u7406"),
                    metadata: {
                        uploadDate: new Date().toISOString(),
                        fileSize: file.size,
                        fileType: 'PNG', // 全てPNG形式に統一
                        originalFileType: fileExt !== '.png' ? fileExt.substring(1).toUpperCase() : 'PNG',
                        sourcePath: updatedFilePath || filePath_1,
                        originalPath: originalFilePath !== updatedFilePath ? originalFilePath : '',
                        documentId: fileId_1.split('_')[0] // ドキュメントIDの関連付け
                    }
                };
                existingIndex = imageSearchData.findIndex(function (item) { return item.id === fileId_1; });
                if (existingIndex >= 0) {
                    imageSearchData[existingIndex] = newImageItem;
                }
                else {
                    imageSearchData.push(newImageItem);
                }
                // 更新したデータを知識ベースに書き込み
                fs_1.default.writeFileSync(imageSearchDataPath, JSON.stringify(imageSearchData, null, 2));
                console.log("\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u77E5\u8B58\u30D9\u30FC\u30B9\u306B\u66F4\u65B0\u3057\u307E\u3057\u305F: ".concat(imageSearchData.length, "\u4EF6"));
                // 元ファイルを保存するオプションがオフの場合、元ファイルを削除
                if (!keepOriginalFile) {
                    try {
                        if (fs_1.default.existsSync(filePath_1)) {
                            fs_1.default.unlinkSync(filePath_1);
                            console.log("\u5143\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(filePath_1));
                        }
                    }
                    catch (deleteErr) {
                        console.error("\u5143\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u30A8\u30E9\u30FC: ".concat(deleteErr));
                        // ファイル削除に失敗しても処理は続行
                    }
                }
                // 結果を返す
                return [2 /*return*/, res.json({
                        success: true,
                        message: "画像検索用データが正常に処理されました",
                        file: {
                            id: fileId_1,
                            name: file.originalname,
                            path: "/knowledge-base/images/".concat(path_1.default.basename(updatedFilePath || filePath_1)),
                            // pngFallbackPathは不要になりました（全てPNG形式に統一）
                            pngFallbackPath: '',
                            size: file.size,
                        },
                        imageSearchData: {
                            totalItems: imageSearchData.length,
                            newItem: newImageItem
                        }
                    })];
            case 9:
                imgError_1 = _b.sent();
                console.error("画像検索データ処理エラー:", imgError_1);
                return [2 /*return*/, res.status(500).json({
                        error: "画像検索データの処理中にエラーが発生しました",
                        details: imgError_1 instanceof Error ? imgError_1.message : String(imgError_1)
                    })];
            case 10:
                extractedText = "";
                pageCount = 0;
                metadata = {};
                _b.label = 11;
            case 11:
                _b.trys.push([11, 25, , 26]);
                _a = fileExt;
                switch (_a) {
                    case '.pdf': return [3 /*break*/, 12];
                    case '.docx': return [3 /*break*/, 14];
                    case '.xlsx': return [3 /*break*/, 16];
                    case '.pptx': return [3 /*break*/, 18];
                }
                return [3 /*break*/, 20];
            case 12: return [4 /*yield*/, (0, document_processor_1.extractPdfText)(filePath_1)];
            case 13:
                pdfResult = _b.sent();
                extractedText = pdfResult.text;
                pageCount = pdfResult.pageCount;
                metadata = { pageCount: pageCount, type: 'pdf' };
                return [3 /*break*/, 20];
            case 14: return [4 /*yield*/, (0, document_processor_1.extractWordText)(filePath_1)];
            case 15:
                extractedText = _b.sent();
                metadata = { type: 'docx' };
                return [3 /*break*/, 20];
            case 16: return [4 /*yield*/, (0, document_processor_1.extractExcelText)(filePath_1)];
            case 17:
                extractedText = _b.sent();
                metadata = { type: 'xlsx' };
                return [3 /*break*/, 20];
            case 18: return [4 /*yield*/, (0, document_processor_1.extractPptxText)(filePath_1)];
            case 19:
                extractedText = _b.sent();
                // PPTXの場合は画像も抽出済み
                metadata = {
                    type: 'pptx',
                    // スライド画像へのパスをメタデータに追加（knowledge-baseディレクトリに一元化）
                    slideImages: Array.from({ length: 4 }, function (_, i) {
                        return "/knowledge-base/images/".concat(path_1.default.basename(filePath_1, path_1.default.extname(filePath_1)), "_").concat((i + 1).toString().padStart(3, '0'), ".png");
                    })
                };
                return [3 /*break*/, 20];
            case 20:
                knowledgeBaseDataDir_2 = path_1.default.join(process.cwd(), 'knowledge-base', 'data');
                if (!fs_1.default.existsSync(knowledgeBaseDataDir_2)) {
                    fs_1.default.mkdirSync(knowledgeBaseDataDir_2, { recursive: true });
                }
                extractedDataPath = path_1.default.join(knowledgeBaseDataDir_2, 'extracted_data.json');
                // ファイルが存在するか確認し、存在しない場合は空のJSONを作成
                if (!fs_1.default.existsSync(extractedDataPath)) {
                    fs_1.default.writeFileSync(extractedDataPath, JSON.stringify({ vehicleData: [] }, null, 2));
                }
                extractedData = JSON.parse(fs_1.default.readFileSync(extractedDataPath, 'utf-8'));
                vehicleDataKey = 'vehicleData';
                if (!extractedData[vehicleDataKey]) {
                    extractedData[vehicleDataKey] = [];
                }
                vehicleData = extractedData[vehicleDataKey];
                timestamp = Date.now();
                prefix = path_1.default.basename(filePath_1, path_1.default.extname(filePath_1)).substring(0, 2).toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
                metadataFileName = "".concat(prefix, "_").concat(timestamp, "_metadata.json");
                jsonDir = path_1.default.join(process.cwd(), 'knowledge-base', 'json');
                if (!fs_1.default.existsSync(jsonDir)) {
                    fs_1.default.mkdirSync(jsonDir, { recursive: true });
                }
                metadataFilePath = path_1.default.join(jsonDir, metadataFileName);
                newData_2 = {
                    id: path_1.default.basename(filePath_1, path_1.default.extname(filePath_1)),
                    category: fileExt.substring(1).toUpperCase(),
                    title: file.originalname,
                    description: "\u6280\u8853\u30B5\u30DD\u30FC\u30C8\u6587\u66F8: ".concat(file.originalname),
                    details: extractedText.substring(0, 200) + "...", // 概要のみ格納
                    image_path: metadata.type === 'pptx' ? metadata.slideImages[0] : null,
                    all_slides: metadata.type === 'pptx' ? metadata.slideImages : null,
                    metadata_json: "/knowledge-base/json/".concat(metadataFileName),
                    keywords: [fileExt.substring(1).toUpperCase(), "技術文書", "サポート", file.originalname]
                };
                metadataContent = __assign({ filename: file.originalname, filePath: filePath_1, uploadDate: new Date().toISOString(), fileSize: file.size, mimeType: file.mimetype, extractedText: extractedText }, metadata);
                fs_1.default.writeFileSync(metadataFilePath, JSON.stringify(metadataContent, null, 2));
                console.log("\u30E1\u30BF\u30C7\u30FC\u30BFJSON\u3092\u4FDD\u5B58: ".concat(metadataFilePath));
                // 後方互換性のために元の場所にも保存
                fs_1.default.writeFileSync("".concat(filePath_1, "_metadata.json"), JSON.stringify(metadataContent, null, 2));
                existingIndex = vehicleData.findIndex(function (item) { return item.id === newData_2.id; });
                if (existingIndex >= 0) {
                    vehicleData[existingIndex] = newData_2;
                }
                else {
                    vehicleData.push(newData_2);
                }
                // 更新したデータを書き込み
                fs_1.default.writeFileSync(extractedDataPath, JSON.stringify(extractedData, null, 2));
                _b.label = 21;
            case 21:
                _b.trys.push([21, 23, , 24]);
                return [4 /*yield*/, (0, knowledge_base_1.addDocumentToKnowledgeBase)({ originalname: path_1.default.basename(filePath_1), path: filePath_1, mimetype: 'text/plain' }, fs_1.default.readFileSync(filePath_1, 'utf-8'))];
            case 22:
                _b.sent();
                return [3 /*break*/, 24];
            case 23:
                kbError_1 = _b.sent();
                console.error("ナレッジベースへの追加エラー:", kbError_1);
                return [3 /*break*/, 24];
            case 24:
                // 元ファイルを保存するオプションがオフの場合、元ファイルを削除
                if (!keepOriginalFile) {
                    try {
                        if (fs_1.default.existsSync(filePath_1)) {
                            fs_1.default.unlinkSync(filePath_1);
                            console.log("\u5143\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(filePath_1));
                        }
                    }
                    catch (deleteErr) {
                        console.error("\u5143\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u30A8\u30E9\u30FC: ".concat(deleteErr));
                        // ファイル削除に失敗しても処理は続行
                    }
                }
                return [2 /*return*/, res.json({
                        success: true,
                        file: {
                            id: newData_2.id,
                            name: file.originalname,
                            path: filePath_1,
                            size: file.size,
                        },
                        extractedTextPreview: extractedText.substring(0, 200) + "...",
                        metadata: metadata
                    })];
            case 25:
                processingError_1 = _b.sent();
                console.error("ファイル処理エラー:", processingError_1);
                return [2 /*return*/, res.status(500).json({
                        error: "ファイル処理中にエラーが発生しました",
                        details: processingError_1 instanceof Error ? processingError_1.message : String(processingError_1)
                    })];
            case 26: return [3 /*break*/, 28];
            case 27:
                error_5 = _b.sent();
                console.error("アップロードエラー:", error_5);
                return [2 /*return*/, res.status(500).json({
                        error: "ファイルのアップロードに失敗しました",
                        details: error_5 instanceof Error ? error_5.message : String(error_5)
                    })];
            case 28: return [2 /*return*/];
        }
    });
}); });
/**
 * ログファイルをクリーンアップするエンドポイント
 */
router.post('/cleanup-logs', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var cleanupLogFiles, result, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require('../../scripts/cleanup-logs.js'); })];
            case 1:
                cleanupLogFiles = (_a.sent()).cleanupLogFiles;
                return [4 /*yield*/, cleanupLogFiles()];
            case 2:
                result = _a.sent();
                return [2 /*return*/, res.json({
                        success: true,
                        message: 'ログファイルのクリーンアップが完了しました',
                        deletedCount: result.deletedCount,
                        totalSize: result.totalSize
                    })];
            case 3:
                error_6 = _a.sent();
                console.error('ログクリーンアップエラー:', error_6);
                return [2 /*return*/, res.status(500).json({
                        error: 'ログクリーンアップに失敗しました',
                        details: error_6 instanceof Error ? error_6.message : String(error_6)
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * uploads内のファイルをクリーンアップするエンドポイント
 * knowledge-baseに存在しないファイルは削除されない
 */
router.post('/cleanup-uploads', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                // クリーンアップ処理を実行
                return [4 /*yield*/, cleanupTempDirectories()];
            case 1:
                // クリーンアップ処理を実行
                _a.sent();
                return [2 /*return*/, res.json({
                        success: true,
                        message: 'uploadsディレクトリのクリーンアップを実行しました'
                    })];
            case 2:
                error_7 = _a.sent();
                console.error('クリーンアップエラー:', error_7);
                return [2 /*return*/, res.status(500).json({
                        error: 'クリーンアップ処理中にエラーが発生しました',
                        details: error_7 instanceof Error ? error_7.message : String(error_7)
                    })];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * knowledge-baseとuploadsのデータを双方向に同期するエンドポイント
 */
router.post('/sync-knowledge-base', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var knowledgeBaseDirs, _i, _a, _b, dirType, kbDir, syncResults;
    return __generator(this, function (_c) {
        try {
            knowledgeBaseDirs = {
                images: path_1.default.join(process.cwd(), 'knowledge-base', 'images'),
                json: path_1.default.join(process.cwd(), 'knowledge-base', 'json'),
                data: path_1.default.join(process.cwd(), 'knowledge-base', 'data')
            };
            // ディレクトリが存在することだけ確認
            for (_i = 0, _a = Object.entries(knowledgeBaseDirs); _i < _a.length; _i++) {
                _b = _a[_i], dirType = _b[0], kbDir = _b[1];
                // ディレクトリが存在しない場合は作成
                ensureDirectoryExists(kbDir);
            }
            syncResults = {
                images: {
                    from: '/home/runner/workspace/knowledge-base/images',
                    to: knowledgeBaseDirs.images,
                    fileCount: 0,
                    copiedCount: 0
                },
                json: {
                    from: '/home/runner/workspace/knowledge-base/json',
                    to: knowledgeBaseDirs.json,
                    fileCount: 0,
                    copiedCount: 0
                },
                data: {
                    from: '/home/runner/workspace/knowledge-base/data',
                    to: knowledgeBaseDirs.data,
                    fileCount: 0,
                    copiedCount: 0
                }
            };
            // 方向パラメータは使わないが、互換性のためにコメントに残す
            // const direction = req.query.direction || 'kb-to-uploads';
            return [2 /*return*/, res.json({
                    success: true,
                    message: 'データを同期しました (knowledge-base)',
                    results: syncResults
                })];
        }
        catch (error) {
            console.error('同期エラー:', error);
            return [2 /*return*/, res.status(500).json({
                    error: 'データ同期中にエラーが発生しました',
                    details: error instanceof Error ? error.message : String(error)
                })];
        }
        return [2 /*return*/];
    });
}); });
/**
 * 重複画像ファイルを検出して削除するエンドポイント
 * knowledge-base/images内の重複画像を削除（同一ハッシュの画像で最新タイムスタンプのもののみ残す）
 */
router.post('/detect-duplicate-images', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                console.log('重複画像検出リクエストを受信...');
                return [4 /*yield*/, detectAndRemoveDuplicateImages()];
            case 1:
                result = _a.sent();
                return [2 /*return*/, res.json({
                        success: true,
                        message: '重複画像の検出と削除が完了しました',
                        details: {
                            removedFiles: result.removed,
                            errors: result.errors
                        }
                    })];
            case 2:
                error_8 = _a.sent();
                console.error('重複画像検出エラー:', error_8);
                return [2 /*return*/, res.status(500).json({
                        error: '重複画像の検出と削除に失敗しました',
                        details: error_8 instanceof Error ? error_8.message : String(error_8)
                    })];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * knowledge-baseとuploadsのデータを双方向に同期するエンドポイント
 */
router.post('/sync-directories', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rootDir, knowledgeBaseImagesDir_1, tempImageDirs, _i, tempImageDirs_1, dir, syncResults, _a, tempImageDirs_2, sourceDir, files, _b, files_6, file, sourcePath, targetPath, kbFiles, _c, kbFiles_1, file, sourcePath, _d, tempImageDirs_3, targetDir, targetPath, error_9;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                console.log('ディレクトリ同期リクエストを受信...');
                rootDir = process.cwd();
                knowledgeBaseImagesDir_1 = path_1.default.join(rootDir, 'knowledge-base/images');
                tempImageDirs = [
                    path_1.default.join(rootDir, 'uploads/images'),
                    path_1.default.join(rootDir, 'public/uploads/images'),
                    path_1.default.join(rootDir, 'public/images')
                ];
                // 各ディレクトリが存在することを確認
                ensureDirectoryExists(knowledgeBaseImagesDir_1);
                for (_i = 0, tempImageDirs_1 = tempImageDirs; _i < tempImageDirs_1.length; _i++) {
                    dir = tempImageDirs_1[_i];
                    ensureDirectoryExists(dir);
                }
                syncResults = {
                    toKnowledgeBase: 0,
                    fromKnowledgeBase: 0,
                    errors: 0
                };
                // knowledge-baseにファイルをコピー（アップロードディレクトリから）
                for (_a = 0, tempImageDirs_2 = tempImageDirs; _a < tempImageDirs_2.length; _a++) {
                    sourceDir = tempImageDirs_2[_a];
                    if (!fs_1.default.existsSync(sourceDir))
                        continue;
                    files = fs_1.default.readdirSync(sourceDir);
                    for (_b = 0, files_6 = files; _b < files_6.length; _b++) {
                        file = files_6[_b];
                        sourcePath = path_1.default.join(sourceDir, file);
                        targetPath = path_1.default.join(knowledgeBaseImagesDir_1, file);
                        // knowledge-baseに存在しない場合のみコピー
                        if (!fs_1.default.existsSync(targetPath)) {
                            try {
                                // ファイルをコピー
                                fs_1.default.copyFileSync(sourcePath, targetPath);
                                console.log("\u30D5\u30A1\u30A4\u30EB\u3092knowledge-base\u306B\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F: ".concat(sourcePath, " -> ").concat(targetPath));
                                syncResults.toKnowledgeBase++;
                            }
                            catch (error) {
                                console.error("\u30D5\u30A1\u30A4\u30EB\u30B3\u30D4\u30FC\u30A8\u30E9\u30FC: ".concat(sourcePath), error);
                                syncResults.errors++;
                            }
                        }
                    }
                }
                kbFiles = fs_1.default.readdirSync(knowledgeBaseImagesDir_1);
                for (_c = 0, kbFiles_1 = kbFiles; _c < kbFiles_1.length; _c++) {
                    file = kbFiles_1[_c];
                    sourcePath = path_1.default.join(knowledgeBaseImagesDir_1, file);
                    for (_d = 0, tempImageDirs_3 = tempImageDirs; _d < tempImageDirs_3.length; _d++) {
                        targetDir = tempImageDirs_3[_d];
                        targetPath = path_1.default.join(targetDir, file);
                        // 一時ディレクトリに存在しない場合のみコピー
                        if (!fs_1.default.existsSync(targetPath)) {
                            try {
                                // ファイルをコピー
                                fs_1.default.copyFileSync(sourcePath, targetPath);
                                console.log("\u30D5\u30A1\u30A4\u30EB\u3092\u4E00\u6642\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F: ".concat(sourcePath, " -> ").concat(targetPath));
                                syncResults.fromKnowledgeBase++;
                            }
                            catch (error) {
                                console.error("\u30D5\u30A1\u30A4\u30EB\u30B3\u30D4\u30FC\u30A8\u30E9\u30FC: ".concat(targetPath), error);
                                syncResults.errors++;
                            }
                        }
                    }
                }
                // クリーンアップ（重複ファイルの削除）
                return [4 /*yield*/, cleanupRedundantFiles()];
            case 1:
                // クリーンアップ（重複ファイルの削除）
                _e.sent();
                return [2 /*return*/, res.json({
                        success: true,
                        message: 'ディレクトリ同期が完了しました',
                        details: syncResults
                    })];
            case 2:
                error_9 = _e.sent();
                console.error('ディレクトリ同期エラー:', error_9);
                return [2 /*return*/, res.status(500).json({
                        error: 'ディレクトリ同期に失敗しました',
                        details: error_9 instanceof Error ? error_9.message : String(error_9)
                    })];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * knowledge-base内の全てのファイル一覧を取得するエンドポイント
 */
router.get('/knowledge-base-files', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var knowledgeBaseDirs, files, _loop_2, _i, _a, _b, dirType, dir;
    return __generator(this, function (_c) {
        try {
            knowledgeBaseDirs = {
                images: path_1.default.join(process.cwd(), 'knowledge-base', 'images'),
                json: path_1.default.join(process.cwd(), 'knowledge-base', 'json'),
                data: path_1.default.join(process.cwd(), 'knowledge-base', 'data')
            };
            files = {};
            _loop_2 = function (dirType, dir) {
                if (fs_1.default.existsSync(dir)) {
                    files[dirType] = fs_1.default.readdirSync(dir).filter(function (file) {
                        var filePath = path_1.default.join(dir, file);
                        return fs_1.default.statSync(filePath).isFile();
                    });
                }
                else {
                    files[dirType] = [];
                }
            };
            for (_i = 0, _a = Object.entries(knowledgeBaseDirs); _i < _a.length; _i++) {
                _b = _a[_i], dirType = _b[0], dir = _b[1];
                _loop_2(dirType, dir);
            }
            return [2 /*return*/, res.json({
                    success: true,
                    files: files
                })];
        }
        catch (error) {
            console.error('ファイル一覧取得エラー:', error);
            return [2 /*return*/, res.status(500).json({
                    error: 'ファイル一覧の取得中にエラーが発生しました',
                    details: error instanceof Error ? error.message : String(error)
                })];
        }
        return [2 /*return*/];
    });
}); });
/**
 * 削除されたドキュメントに関連する孤立JSONファイルを検出して削除する関数
 * ドキュメント削除後に実行することで、残存しているJSONデータを完全に削除する
 */
function cleanupOrphanedJsonFiles() {
    return __awaiter(this, void 0, void 0, function () {
        var jsonDir, removedCount, errorCount, blacklistFiles_2, allFiles, metadataFiles, knowledgeBaseDir_1, docDirs, documentsDir, moreDocs, _loop_3, _i, metadataFiles_1, file;
        return __generator(this, function (_a) {
            jsonDir = path_1.default.join(process.cwd(), 'knowledge-base', 'json');
            removedCount = 0;
            errorCount = 0;
            try {
                if (!fs_1.default.existsSync(jsonDir)) {
                    console.log("JSON\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u304C\u5B58\u5728\u3057\u307E\u305B\u3093: ".concat(jsonDir));
                    return [2 /*return*/, { removed: 0, errors: 0 }];
                }
                blacklistFiles_2 = ['guide_1744876404679_metadata.json', 'guide_metadata.json'];
                allFiles = fs_1.default.readdirSync(jsonDir);
                metadataFiles = allFiles.filter(function (file) {
                    return file.endsWith('_metadata.json') &&
                        !blacklistFiles_2.includes(file);
                });
                console.log("JSON\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u5185\u306E\u30E1\u30BF\u30C7\u30FC\u30BF\u30D5\u30A1\u30A4\u30EB: ".concat(metadataFiles.length, "\u4EF6"));
                knowledgeBaseDir_1 = path_1.default.join(process.cwd(), 'knowledge-base');
                docDirs = fs_1.default.readdirSync(knowledgeBaseDir_1)
                    .filter(function (dir) { return dir.startsWith('doc_'); })
                    .map(function (dir) {
                    // doc_1745233987839_645 からプレフィックスを抽出: mc_1745233987839
                    var match = dir.match(/doc_(\d+)_/);
                    return match ? "mc_".concat(match[1]) : '';
                })
                    .filter(Boolean);
                documentsDir = path_1.default.join(knowledgeBaseDir_1, 'documents');
                if (fs_1.default.existsSync(documentsDir)) {
                    moreDocs = fs_1.default.readdirSync(documentsDir)
                        .filter(function (dir) { return dir.startsWith('doc_'); })
                        .map(function (dir) {
                        var match = dir.match(/doc_(\d+)_/);
                        return match ? "mc_".concat(match[1]) : '';
                    })
                        .filter(Boolean);
                    // 配列を結合
                    docDirs.push.apply(docDirs, moreDocs);
                }
                console.log("\u77E5\u8B58\u30D9\u30FC\u30B9\u5185\u306E\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u30D7\u30EC\u30D5\u30A3\u30C3\u30AF\u30B9: ".concat(docDirs.length, "\u4EF6"));
                _loop_3 = function (file) {
                    // ファイル名のプレフィックスを抽出（例: mc_1744105287766_metadata.jsonからmc_1744105287766）
                    var prefix = file.split('_metadata.json')[0];
                    // 対応するドキュメントが存在するかチェック
                    var hasMatchingDocument = docDirs.some(function (docPrefix) { return docPrefix === prefix; });
                    if (!hasMatchingDocument) {
                        // 対応するドキュメントが存在しない場合は孤立したJSONファイルと判断して削除
                        try {
                            var filePath = path_1.default.join(jsonDir, file);
                            fs_1.default.unlinkSync(filePath);
                            console.log("\u5B64\u7ACB\u3057\u305FJSON\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(file));
                            removedCount++;
                        }
                        catch (error) {
                            console.error("JSON\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u30A8\u30E9\u30FC: ".concat(file), error);
                            errorCount++;
                        }
                    }
                };
                // 各メタデータファイルをチェック
                for (_i = 0, metadataFiles_1 = metadataFiles; _i < metadataFiles_1.length; _i++) {
                    file = metadataFiles_1[_i];
                    _loop_3(file);
                }
                console.log("\u5B64\u7ACB\u3057\u305FJSON\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u7D50\u679C: \u6210\u529F=".concat(removedCount, "\u4EF6, \u5931\u6557=").concat(errorCount, "\u4EF6"));
                return [2 /*return*/, { removed: removedCount, errors: errorCount }];
            }
            catch (error) {
                console.error('孤立したJSONファイルのクリーンアップ中にエラーが発生しました:', error);
                return [2 /*return*/, { removed: removedCount, errors: errorCount + 1 }];
            }
            return [2 /*return*/];
        });
    });
}
/**
 * 孤立したJSONファイルを削除するエンドポイント
 * 管理機能として実装し、明示的に呼び出すことでメンテナンスを実行
 */
router.post('/cleanup-json', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                console.log('孤立JSONファイルクリーンアップリクエスト受信');
                return [4 /*yield*/, cleanupOrphanedJsonFiles()];
            case 1:
                result = _a.sent();
                return [2 /*return*/, res.json({
                        success: true,
                        removed: result.removed,
                        errors: result.errors,
                        message: "".concat(result.removed, "\u4EF6\u306E\u5B64\u7ACBJSON\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F")
                    })];
            case 2:
                error_10 = _a.sent();
                console.error('孤立JSONファイルクリーンアップエラー:', error_10);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: '孤立JSONファイルのクリーンアップ中にエラーが発生しました'
                    })];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
