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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.azureStorage = exports.AzureStorageService = void 0;
var storage_blob_1 = require("@azure/storage-blob");
var identity_1 = require("@azure/identity");
var fs = require("fs-extra");
var path = require("path");
var AzureStorageService = /** @class */ (function () {
    function AzureStorageService() {
        var connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        var accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        var accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge-base';
        if (connectionString) {
            this.blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
        }
        else if (accountName && accountKey) {
            this.blobServiceClient = new storage_blob_1.BlobServiceClient("https://".concat(accountName, ".blob.core.windows.net"), { accountName: accountName, accountKey: accountKey });
        }
        else {
            // Managed Identityを使用（Azure App Service上で動作）
            var credential = new identity_1.DefaultAzureCredential();
            this.blobServiceClient = new storage_blob_1.BlobServiceClient("https://".concat(accountName || 'your-storage-account', ".blob.core.windows.net"), credential);
        }
        this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    }
    // コンテナの初期化
    AzureStorageService.prototype.initializeContainer = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.containerClient.createIfNotExists()];
                    case 1:
                        _a.sent();
                        console.log("\u2705 Azure Storage container '".concat(this.containerName, "' initialized"));
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error('❌ Failed to initialize Azure Storage container:', error_1);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // ファイルをアップロード
    AzureStorageService.prototype.uploadFile = function (localPath, blobName) {
        return __awaiter(this, void 0, void 0, function () {
            var blockBlobClient, fileBuffer, url, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
                        return [4 /*yield*/, fs.readFile(localPath)];
                    case 1:
                        fileBuffer = _a.sent();
                        return [4 /*yield*/, blockBlobClient.upload(fileBuffer, fileBuffer.length, {
                                blobHTTPHeaders: {
                                    blobContentType: this.getContentType(blobName)
                                }
                            })];
                    case 2:
                        _a.sent();
                        url = blockBlobClient.url;
                        console.log("\u2705 File uploaded: ".concat(blobName, " -> ").concat(url));
                        return [2 /*return*/, url];
                    case 3:
                        error_2 = _a.sent();
                        console.error("\u274C Failed to upload file ".concat(blobName, ":"), error_2);
                        throw error_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // ファイルをダウンロード
    AzureStorageService.prototype.downloadFile = function (blobName, localPath) {
        return __awaiter(this, void 0, void 0, function () {
            var blockBlobClient, downloadResponse, writeStream_1, error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
                        return [4 /*yield*/, blockBlobClient.download()];
                    case 1:
                        downloadResponse = _b.sent();
                        // ディレクトリを作成
                        return [4 /*yield*/, fs.ensureDir(path.dirname(localPath))];
                    case 2:
                        // ディレクトリを作成
                        _b.sent();
                        writeStream_1 = fs.createWriteStream(localPath);
                        (_a = downloadResponse.readableStreamBody) === null || _a === void 0 ? void 0 : _a.pipe(writeStream_1);
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                writeStream_1.on('finish', resolve);
                                writeStream_1.on('error', reject);
                            })];
                    case 3:
                        error_3 = _b.sent();
                        console.error("\u274C Failed to download file ".concat(blobName, ":"), error_3);
                        throw error_3;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // ファイルの存在確認
    AzureStorageService.prototype.fileExists = function (blobName) {
        return __awaiter(this, void 0, void 0, function () {
            var blockBlobClient, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
                        return [4 /*yield*/, blockBlobClient.getProperties()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 2:
                        error_4 = _a.sent();
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // ファイルを削除
    AzureStorageService.prototype.deleteFile = function (blobName) {
        return __awaiter(this, void 0, void 0, function () {
            var blockBlobClient, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
                        return [4 /*yield*/, blockBlobClient.delete()];
                    case 1:
                        _a.sent();
                        console.log("\u2705 File deleted: ".concat(blobName));
                        return [3 /*break*/, 3];
                    case 2:
                        error_5 = _a.sent();
                        console.error("\u274C Failed to delete file ".concat(blobName, ":"), error_5);
                        throw error_5;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // ディレクトリ内のファイル一覧を取得
    AzureStorageService.prototype.listFiles = function (prefix) {
        return __awaiter(this, void 0, void 0, function () {
            var files, listOptions, _a, _b, _c, blob, e_1_1, error_6;
            var _d, e_1, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        _g.trys.push([0, 13, , 14]);
                        files = [];
                        listOptions = prefix ? { prefix: prefix } : {};
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 6, 7, 12]);
                        _a = true, _b = __asyncValues(this.containerClient.listBlobsFlat(listOptions));
                        _g.label = 2;
                    case 2: return [4 /*yield*/, _b.next()];
                    case 3:
                        if (!(_c = _g.sent(), _d = _c.done, !_d)) return [3 /*break*/, 5];
                        _f = _c.value;
                        _a = false;
                        blob = _f;
                        files.push(blob.name);
                        _g.label = 4;
                    case 4:
                        _a = true;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 12];
                    case 6:
                        e_1_1 = _g.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 12];
                    case 7:
                        _g.trys.push([7, , 10, 11]);
                        if (!(!_a && !_d && (_e = _b.return))) return [3 /*break*/, 9];
                        return [4 /*yield*/, _e.call(_b)];
                    case 8:
                        _g.sent();
                        _g.label = 9;
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 11: return [7 /*endfinally*/];
                    case 12: return [2 /*return*/, files];
                    case 13:
                        error_6 = _g.sent();
                        console.error('❌ Failed to list files:', error_6);
                        throw error_6;
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    // ファイルのURLを取得
    AzureStorageService.prototype.getFileUrl = function (blobName) {
        var blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
        return blockBlobClient.url;
    };
    // ローカルディレクトリ全体をアップロード
    AzureStorageService.prototype.uploadDirectory = function (localDir_1) {
        return __awaiter(this, arguments, void 0, function (localDir, remotePrefix) {
            var files, _i, files_1, file, relativePath, blobName, error_7;
            if (remotePrefix === void 0) { remotePrefix = ''; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, this.getAllFiles(localDir)];
                    case 1:
                        files = _a.sent();
                        _i = 0, files_1 = files;
                        _a.label = 2;
                    case 2:
                        if (!(_i < files_1.length)) return [3 /*break*/, 5];
                        file = files_1[_i];
                        relativePath = path.relative(localDir, file);
                        blobName = remotePrefix ? "".concat(remotePrefix, "/").concat(relativePath) : relativePath;
                        return [4 /*yield*/, this.uploadFile(file, blobName)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        console.log("\u2705 Directory uploaded: ".concat(localDir, " -> ").concat(remotePrefix));
                        return [3 /*break*/, 7];
                    case 6:
                        error_7 = _a.sent();
                        console.error("\u274C Failed to upload directory ".concat(localDir, ":"), error_7);
                        throw error_7;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    // ディレクトリ全体をダウンロード
    AzureStorageService.prototype.downloadDirectory = function (remotePrefix, localDir) {
        return __awaiter(this, void 0, void 0, function () {
            var files, _i, files_2, blobName, relativePath, localPath, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, this.listFiles(remotePrefix)];
                    case 1:
                        files = _a.sent();
                        _i = 0, files_2 = files;
                        _a.label = 2;
                    case 2:
                        if (!(_i < files_2.length)) return [3 /*break*/, 5];
                        blobName = files_2[_i];
                        relativePath = blobName.replace(remotePrefix + '/', '');
                        localPath = path.join(localDir, relativePath);
                        return [4 /*yield*/, this.downloadFile(blobName, localPath)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        console.log("\u2705 Directory downloaded: ".concat(remotePrefix, " -> ").concat(localDir));
                        return [3 /*break*/, 7];
                    case 6:
                        error_8 = _a.sent();
                        console.error("\u274C Failed to download directory ".concat(remotePrefix, ":"), error_8);
                        throw error_8;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    // 再帰的にファイル一覧を取得
    AzureStorageService.prototype.getAllFiles = function (dir) {
        return __awaiter(this, void 0, void 0, function () {
            var files, items, _i, items_1, item, fullPath, stat, _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        files = [];
                        return [4 /*yield*/, fs.readdir(dir)];
                    case 1:
                        items = _d.sent();
                        _i = 0, items_1 = items;
                        _d.label = 2;
                    case 2:
                        if (!(_i < items_1.length)) return [3 /*break*/, 7];
                        item = items_1[_i];
                        fullPath = path.join(dir, item);
                        return [4 /*yield*/, fs.stat(fullPath)];
                    case 3:
                        stat = _d.sent();
                        if (!stat.isDirectory()) return [3 /*break*/, 5];
                        _b = (_a = files.push).apply;
                        _c = [files];
                        return [4 /*yield*/, this.getAllFiles(fullPath)];
                    case 4:
                        _b.apply(_a, _c.concat([_d.sent()]));
                        return [3 /*break*/, 6];
                    case 5:
                        files.push(fullPath);
                        _d.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/, files];
                }
            });
        });
    };
    // コンテンツタイプを取得
    AzureStorageService.prototype.getContentType = function (filename) {
        var ext = path.extname(filename).toLowerCase();
        var contentTypes = {
            '.json': 'application/json',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        };
        return contentTypes[ext] || 'application/octet-stream';
    };
    return AzureStorageService;
}());
exports.AzureStorageService = AzureStorageService;
// シングルトンインスタンス
exports.azureStorage = new AzureStorageService();
