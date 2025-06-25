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
exports.knowledgeBaseAzure = exports.KnowledgeBaseAzureService = void 0;
var azure_storage_js_1 = require("./azure-storage.js");
var fs = require("fs-extra");
var path = require("path");
var KnowledgeBaseAzureService = /** @class */ (function () {
    function KnowledgeBaseAzureService() {
        this.localKnowledgeBasePath = path.join(process.cwd(), 'knowledge-base');
        this.remotePrefix = 'knowledge-base';
    }
    // Azure StorageからKnowledge Baseを同期
    KnowledgeBaseAzureService.prototype.syncFromAzure = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log('🔄 Syncing knowledge base from Azure Storage...');
                        // Azure Storageからダウンロード
                        return [4 /*yield*/, azure_storage_js_1.azureStorage.downloadDirectory(this.remotePrefix, this.localKnowledgeBasePath)];
                    case 1:
                        // Azure Storageからダウンロード
                        _a.sent();
                        console.log('✅ Knowledge base synced from Azure Storage');
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error('❌ Failed to sync knowledge base from Azure:', error_1);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Knowledge BaseをAzure Storageに同期
    KnowledgeBaseAzureService.prototype.syncToAzure = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        console.log('🔄 Syncing knowledge base to Azure Storage...');
                        return [4 /*yield*/, fs.pathExists(this.localKnowledgeBasePath)];
                    case 1:
                        if (!!(_a.sent())) return [3 /*break*/, 3];
                        console.log('📁 Creating local knowledge base directory...');
                        return [4 /*yield*/, fs.ensureDir(this.localKnowledgeBasePath)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: 
                    // Azure Storageにアップロード
                    return [4 /*yield*/, azure_storage_js_1.azureStorage.uploadDirectory(this.localKnowledgeBasePath, this.remotePrefix)];
                    case 4:
                        // Azure Storageにアップロード
                        _a.sent();
                        console.log('✅ Knowledge base synced to Azure Storage');
                        return [3 /*break*/, 6];
                    case 5:
                        error_2 = _a.sent();
                        console.error('❌ Failed to sync knowledge base to Azure:', error_2);
                        throw error_2;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // 特定のファイルをAzure Storageにアップロード
    KnowledgeBaseAzureService.prototype.uploadFile = function (localFilePath) {
        return __awaiter(this, void 0, void 0, function () {
            var relativePath, blobName, url, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        relativePath = path.relative(this.localKnowledgeBasePath, localFilePath);
                        blobName = "".concat(this.remotePrefix, "/").concat(relativePath);
                        return [4 /*yield*/, azure_storage_js_1.azureStorage.uploadFile(localFilePath, blobName)];
                    case 1:
                        url = _a.sent();
                        console.log("\u2705 File uploaded to Azure: ".concat(relativePath));
                        return [2 /*return*/, url];
                    case 2:
                        error_3 = _a.sent();
                        console.error("\u274C Failed to upload file to Azure: ".concat(localFilePath), error_3);
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 特定のファイルをAzure Storageからダウンロード
    KnowledgeBaseAzureService.prototype.downloadFile = function (blobName) {
        return __awaiter(this, void 0, void 0, function () {
            var localFilePath, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        localFilePath = path.join(this.localKnowledgeBasePath, blobName.replace("".concat(this.remotePrefix, "/"), ''));
                        return [4 /*yield*/, azure_storage_js_1.azureStorage.downloadFile(blobName, localFilePath)];
                    case 1:
                        _a.sent();
                        console.log("\u2705 File downloaded from Azure: ".concat(blobName));
                        return [2 /*return*/, localFilePath];
                    case 2:
                        error_4 = _a.sent();
                        console.error("\u274C Failed to download file from Azure: ".concat(blobName), error_4);
                        throw error_4;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // ファイルの存在確認（Azure Storage）
    KnowledgeBaseAzureService.prototype.fileExistsInAzure = function (relativePath) {
        return __awaiter(this, void 0, void 0, function () {
            var blobName;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        blobName = "".concat(this.remotePrefix, "/").concat(relativePath);
                        return [4 /*yield*/, azure_storage_js_1.azureStorage.fileExists(blobName)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // ファイルのURLを取得（Azure Storage）
    KnowledgeBaseAzureService.prototype.getFileUrl = function (relativePath) {
        var blobName = "".concat(this.remotePrefix, "/").concat(relativePath);
        return azure_storage_js_1.azureStorage.getFileUrl(blobName);
    };
    // Knowledge Baseの初期化
    KnowledgeBaseAzureService.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        console.log('🚀 Initializing Knowledge Base Azure integration...');
                        // Azure Storageコンテナを初期化
                        return [4 /*yield*/, azure_storage_js_1.azureStorage.initializeContainer()];
                    case 1:
                        // Azure Storageコンテナを初期化
                        _a.sent();
                        // ローカルディレクトリを作成
                        return [4 /*yield*/, fs.ensureDir(this.localKnowledgeBasePath)];
                    case 2:
                        // ローカルディレクトリを作成
                        _a.sent();
                        // Azure Storageから同期
                        return [4 /*yield*/, this.syncFromAzure()];
                    case 3:
                        // Azure Storageから同期
                        _a.sent();
                        console.log('✅ Knowledge Base Azure integration initialized');
                        return [3 /*break*/, 5];
                    case 4:
                        error_5 = _a.sent();
                        console.error('❌ Failed to initialize Knowledge Base Azure integration:', error_5);
                        throw error_5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // バックアップを作成
    KnowledgeBaseAzureService.prototype.createBackup = function () {
        return __awaiter(this, void 0, void 0, function () {
            var timestamp, backupPrefix, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        backupPrefix = "backups/".concat(timestamp);
                        console.log("\uD83D\uDD04 Creating backup: ".concat(backupPrefix));
                        return [4 /*yield*/, azure_storage_js_1.azureStorage.uploadDirectory(this.localKnowledgeBasePath, backupPrefix)];
                    case 1:
                        _a.sent();
                        console.log("\u2705 Backup created: ".concat(backupPrefix));
                        return [3 /*break*/, 3];
                    case 2:
                        error_6 = _a.sent();
                        console.error('❌ Failed to create backup:', error_6);
                        throw error_6;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // バックアップから復元
    KnowledgeBaseAzureService.prototype.restoreFromBackup = function (backupPrefix) {
        return __awaiter(this, void 0, void 0, function () {
            var timestamp, currentBackupPrefix, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        console.log("\uD83D\uDD04 Restoring from backup: ".concat(backupPrefix));
                        timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        currentBackupPrefix = "backups/restore-".concat(timestamp);
                        return [4 /*yield*/, azure_storage_js_1.azureStorage.uploadDirectory(this.localKnowledgeBasePath, currentBackupPrefix)];
                    case 1:
                        _a.sent();
                        // バックアップから復元
                        return [4 /*yield*/, azure_storage_js_1.azureStorage.downloadDirectory(backupPrefix, this.localKnowledgeBasePath)];
                    case 2:
                        // バックアップから復元
                        _a.sent();
                        console.log("\u2705 Restored from backup: ".concat(backupPrefix));
                        return [3 /*break*/, 4];
                    case 3:
                        error_7 = _a.sent();
                        console.error("\u274C Failed to restore from backup: ".concat(backupPrefix), error_7);
                        throw error_7;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // バックアップ一覧を取得
    KnowledgeBaseAzureService.prototype.listBackups = function () {
        return __awaiter(this, void 0, void 0, function () {
            var files, backups, _i, files_1, file, parts, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, azure_storage_js_1.azureStorage.listFiles('backups/')];
                    case 1:
                        files = _a.sent();
                        backups = new Set();
                        for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                            file = files_1[_i];
                            parts = file.split('/');
                            if (parts.length >= 2) {
                                backups.add(parts[1]); // backups/[timestamp] の部分を取得
                            }
                        }
                        return [2 /*return*/, Array.from(backups).sort().reverse()]; // 新しい順
                    case 2:
                        error_8 = _a.sent();
                        console.error('❌ Failed to list backups:', error_8);
                        throw error_8;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // ファイル変更を監視して自動同期
    KnowledgeBaseAzureService.prototype.watchAndSync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var watcher, syncTimeout_1;
            var _this = this;
            return __generator(this, function (_a) {
                try {
                    console.log('👀 Starting file watch for auto-sync...');
                    watcher = fs.watch(this.localKnowledgeBasePath, { recursive: true });
                    watcher.on('change', function (eventType, filename) {
                        if (filename && !filename.includes('node_modules') && !filename.includes('.git')) {
                            console.log("\uD83D\uDCDD File changed: ".concat(filename));
                            // デバウンス処理（1秒後に同期）
                            clearTimeout(syncTimeout_1);
                            syncTimeout_1 = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                                var error_9;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, this.syncToAzure()];
                                        case 1:
                                            _a.sent();
                                            return [3 /*break*/, 3];
                                        case 2:
                                            error_9 = _a.sent();
                                            console.error('❌ Auto-sync failed:', error_9);
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); }, 1000);
                        }
                    });
                    console.log('✅ File watch started');
                }
                catch (error) {
                    console.error('❌ Failed to start file watch:', error);
                    throw error;
                }
                return [2 /*return*/];
            });
        });
    };
    return KnowledgeBaseAzureService;
}());
exports.KnowledgeBaseAzureService = KnowledgeBaseAzureService;
// シングルトンインスタンス
exports.knowledgeBaseAzure = new KnowledgeBaseAzureService();
