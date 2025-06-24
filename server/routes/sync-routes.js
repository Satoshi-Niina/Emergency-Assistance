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
exports.registerSyncRoutes = registerSyncRoutes;
var fs_1 = require("fs");
var path_1 = require("path");
var multer_1 = require("multer");
var storage_1 = require("../storage");
// 知識ベースディレクトリを使用
var mediaDir = path_1.default.join(process.cwd(), 'knowledge-base', 'media');
if (!fs_1.default.existsSync(mediaDir)) {
    fs_1.default.mkdirSync(mediaDir, { recursive: true });
}
// multerストレージ設定
var mediaStorage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, mediaDir);
    },
    filename: function (req, file, cb) {
        var timestamp = Date.now();
        var originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        var ext = path_1.default.extname(originalName) || '.jpg';
        var filename = "media_".concat(timestamp).concat(ext);
        cb(null, filename);
    }
});
// アップロードハンドラ
var upload = (0, multer_1.default)({
    storage: mediaStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB制限
    },
    fileFilter: function (req, file, cb) {
        // 許可するMIMEタイプ
        var allowedMimes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/svg+xml',
            'video/mp4',
            'video/webm',
            'audio/mpeg',
            'audio/ogg',
            'audio/wav'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("\u30B5\u30DD\u30FC\u30C8\u3055\u308C\u3066\u3044\u306A\u3044\u30D5\u30A1\u30A4\u30EB\u5F62\u5F0F\u3067\u3059: ".concat(file.mimetype)));
        }
    }
});
function registerSyncRoutes(app) {
    var _this = this;
    // メディアアップロードAPI
    app.post('/api/media/upload', upload.single('file'), function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var mediaUrl, mediaType;
        return __generator(this, function (_a) {
            try {
                if (!req.file) {
                    return [2 /*return*/, res.status(400).json({ error: 'ファイルがアップロードされていません' })];
                }
                mediaUrl = "/knowledge-base/media/".concat(req.file.filename);
                mediaType = 'image';
                if (req.file.mimetype.startsWith('video/')) {
                    mediaType = 'video';
                }
                else if (req.file.mimetype.startsWith('audio/')) {
                    mediaType = 'audio';
                }
                // サムネイル生成などの処理はここに追加（必要に応じて）
                res.json({
                    success: true,
                    url: mediaUrl,
                    type: mediaType,
                    size: req.file.size
                });
            }
            catch (error) {
                console.error('メディアアップロードエラー:', error);
                res.status(500).json({ error: 'メディアのアップロードに失敗しました' });
            }
            return [2 /*return*/];
        });
    }); });
    // チャットメッセージの同期API
    app.post('/api/chats/:id/sync-messages', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var userId, chatId, messages, chat, processedMessages, _i, messages_1, message, savedMessage, _a, _b, mediaItem, mediaUrl, messageError_1, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 13, , 14]);
                    if (!req.session.userId) {
                        return [2 /*return*/, res.status(401).json({ error: '認証されていません' })];
                    }
                    userId = req.session.userId;
                    chatId = parseInt(req.params.id);
                    messages = req.body.messages;
                    return [4 /*yield*/, storage_1.storage.getChat(String(chatId))];
                case 1:
                    chat = _c.sent();
                    if (!chat) {
                        return [2 /*return*/, res.status(404).json({ error: 'チャットが見つかりません' })];
                    }
                    processedMessages = [];
                    _i = 0, messages_1 = messages;
                    _c.label = 2;
                case 2:
                    if (!(_i < messages_1.length)) return [3 /*break*/, 11];
                    message = messages_1[_i];
                    _c.label = 3;
                case 3:
                    _c.trys.push([3, 9, , 10]);
                    return [4 /*yield*/, storage_1.storage.createMessage({
                            chatId: String(chatId),
                            content: message.content,
                            senderId: String(userId),
                            isAiResponse: message.role === 'assistant'
                        })];
                case 4:
                    savedMessage = _c.sent();
                    if (!(message.media && Array.isArray(message.media))) return [3 /*break*/, 8];
                    _a = 0, _b = message.media;
                    _c.label = 5;
                case 5:
                    if (!(_a < _b.length)) return [3 /*break*/, 8];
                    mediaItem = _b[_a];
                    mediaUrl = mediaItem.url;
                    // データベースにメディア情報を保存
                    return [4 /*yield*/, storage_1.storage.createMedia({
                            messageId: savedMessage.id,
                            type: mediaItem.type || 'image',
                            url: mediaUrl,
                            // thumbnail: mediaItem.thumbnail
                        })];
                case 6:
                    // データベースにメディア情報を保存
                    _c.sent();
                    _c.label = 7;
                case 7:
                    _a++;
                    return [3 /*break*/, 5];
                case 8:
                    processedMessages.push(savedMessage.id);
                    return [3 /*break*/, 10];
                case 9:
                    messageError_1 = _c.sent();
                    console.error("\u30E1\u30C3\u30BB\u30FC\u30B8\u51E6\u7406\u30A8\u30E9\u30FC:", messageError_1);
                    return [3 /*break*/, 10];
                case 10:
                    _i++;
                    return [3 /*break*/, 2];
                case 11: 
                // チャットエクスポートレコードを更新
                return [4 /*yield*/, storage_1.storage.saveChatExport(String(chatId), String(userId), new Date())];
                case 12:
                    // チャットエクスポートレコードを更新
                    _c.sent();
                    res.json({
                        success: true,
                        syncedCount: processedMessages.length,
                        messageIds: processedMessages
                    });
                    return [3 /*break*/, 14];
                case 13:
                    error_1 = _c.sent();
                    console.error('メッセージ同期エラー:', error_1);
                    res.status(500).json({ error: 'メッセージの同期に失敗しました' });
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/];
            }
        });
    }); });
    // チャットの最終エクスポート情報を取得するAPI
    app.get('/api/chats/:id/last-exp', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var chatId, lastExport, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    chatId = req.params.id;
                    return [4 /*yield*/, storage_1.storage.getLastChatExport(String(chatId))];
                case 1:
                    lastExport = _a.sent();
                    if (!lastExport) {
                        return [2 /*return*/, res.json({
                                success: true,
                                lastExport: null
                            })];
                    }
                    res.json({
                        success: true,
                        lastExport: {
                            timestamp: lastExport.timestamp,
                            userId: lastExport.userId
                        }
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    console.error('最終エクスポート情報取得エラー:', error_2);
                    res.status(500).json({ error: '最終エクスポート情報の取得に失敗しました' });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
}
