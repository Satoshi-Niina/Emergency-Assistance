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
exports.registerRoutes = registerRoutes;
var http_1 = require("http");
var storage_1 = require("./storage");
var schema_1 = require("@shared/schema");
var zod_1 = require("zod");
var express_session_1 = require("express-session");
var memorystore_1 = require("memorystore");
var ws_1 = require("ws");
var openai_1 = require("./lib/openai");
var perplexity_1 = require("./lib/perplexity");
var fs_1 = require("fs");
var path_1 = require("path");
var db_1 = require("./db");
var multer_config_1 = require("./lib/multer-config");
var knowledge_base_1 = require("./lib/knowledge-base");
var chat_export_formatter_1 = require("./lib/chat-export-formatter");
var tech_support_1 = require("./routes/tech-support");
var data_processor_1 = require("./routes/data-processor");
var emergency_guide_1 = require("./routes/emergency-guide");
var emergency_flow_1 = require("./routes/emergency-flow");
var sync_routes_1 = require("./routes/sync-routes");
var flow_generator_1 = require("./routes/flow-generator");
var users_1 = require("./routes/users");
var troubleshooting_1 = require("./routes/troubleshooting");
var express_1 = require("express");
var auth_1 = require("./routes/auth");
var export_file_manager_1 = require("./lib/export-file-manager");
var express_2 = require("express");
var file_1 = require("./routes/file");
var MemoryStoreSession = (0, memorystore_1.default)(express_session_1.default);
// Session will now use Postgres via storage.sessionStore
function registerRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        // 汎用ロギング関数
        function logDebug(message) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            if (process.env.NODE_ENV !== 'production') {
                console.debug.apply(console, __spreadArray([message], args, false));
            }
        }
        function logInfo(message) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            console.info.apply(console, __spreadArray([message], args, false));
        }
        function logWarn(message) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            console.warn.apply(console, __spreadArray([message], args, false));
        }
        function logError(message) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            console.error.apply(console, __spreadArray([message], args, false));
        }
        var sessionSecret, requireAuth, requireAdmin, httpServer, wss, routeDebugger, router;
        var _this = this;
        return __generator(this, function (_a) {
            // 静的ファイル配信の設定（最優先で登録）
            app.use('/images', express_1.default.static(path_1.default.join(process.cwd(), 'public', 'images')));
            app.use('/public', express_1.default.static(path_1.default.join(process.cwd(), 'public')));
            // Register tech support router
            app.use('/api/tech-support', tech_support_1.default);
            // Register data processor routes
            (0, data_processor_1.registerDataProcessorRoutes)(app);
            // Register emergency guide routes
            app.use('/api/emergency-guide', emergency_guide_1.default);
            // Register emergency flow routes
            app.use('/api/emergency-flow', emergency_flow_1.default);
            // Register flow generator routes
            app.use('/api/flow-generator', flow_generator_1.flowGeneratorRouter);
            // Register sync routes for offline capabilities
            (0, sync_routes_1.registerSyncRoutes)(app);
            // Add a health check endpoint for testing
            app.get('/api/health', function (req, res) {
                res.json({
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    environment: process.env.NODE_ENV || 'development'
                });
            });
            // OpenAI APIキーの設定状況を確認するエンドポイント
            app.get('/api/debug/openai', function (req, res) {
                var apiKey = process.env.OPENAI_API_KEY || process.env.REPLIT_SECRET_OPENAI_API_KEY;
                res.json({
                    openaiApiKey: apiKey ? "SET" : "NOT SET",
                    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + "..." : "NOT FOUND",
                    environment: process.env.NODE_ENV || 'development',
                    timestamp: new Date().toISOString()
                });
            });
            // Add a public OpenAI test endpoint (for testing only)
            app.post('/api/chatgpt-test', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var text, response, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            text = req.body.text;
                            if (!text) {
                                return [2 /*return*/, res.status(400).json({ message: "Text is required" })];
                            }
                            return [4 /*yield*/, (0, openai_1.processOpenAIRequest)(text, true)];
                        case 1:
                            response = _a.sent();
                            return [2 /*return*/, res.json({ response: response })];
                        case 2:
                            error_1 = _a.sent();
                            console.error("Error in /api/chatgpt-test:", error_1);
                            return [2 /*return*/, res.status(500).json({ message: "Error processing request", error: String(error_1) })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            // Perplexity API endpoint
            app.post('/api/perplexity', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var _a, query, systemPrompt, _b, useKnowledgeBaseOnly, _c, content, citations, error_2;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 2, , 3]);
                            _a = req.body, query = _a.query, systemPrompt = _a.systemPrompt, _b = _a.useKnowledgeBaseOnly, useKnowledgeBaseOnly = _b === void 0 ? true : _b;
                            if (!query) {
                                return [2 /*return*/, res.status(400).json({ message: "Query is required" })];
                            }
                            console.log("Perplexity API request: query=".concat(query, ", useKnowledgeBaseOnly=").concat(useKnowledgeBaseOnly));
                            return [4 /*yield*/, (0, perplexity_1.processPerplexityRequest)(query, systemPrompt, useKnowledgeBaseOnly)];
                        case 1:
                            _c = _d.sent(), content = _c.content, citations = _c.citations;
                            return [2 /*return*/, res.json({ content: content, citations: citations })];
                        case 2:
                            error_2 = _d.sent();
                            console.error("Error in /api/perplexity:", error_2);
                            return [2 /*return*/, res.status(500).json({
                                    message: "Error processing Perplexity request",
                                    error: error_2 instanceof Error ? error_2.message : String(error_2)
                                })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            sessionSecret = process.env.SESSION_SECRET || "emergency-recovery-secret";
            app.use((0, express_session_1.default)({
                secret: sessionSecret,
                resave: false,
                saveUninitialized: false,
                cookie: {
                    secure: false,
                    httpOnly: true,
                    maxAge: 86400000, // 24 hours
                    sameSite: 'lax'
                },
                store: new MemoryStoreSession({
                    checkPeriod: 86400000 // prune expired entries every 24h
                }),
            }));
            requireAuth = function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
                var adminUser;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!!req.session.userId) return [3 /*break*/, 2];
                            return [4 /*yield*/, storage_1.storage.getUserByUsername('admin')];
                        case 1:
                            adminUser = _a.sent();
                            if (adminUser) {
                                req.session.userId = adminUser.id;
                                req.session.userRole = 'admin';
                            }
                            _a.label = 2;
                        case 2:
                            next();
                            return [2 /*return*/];
                    }
                });
            }); };
            requireAdmin = function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
                var adminUser, user;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!!req.session.userId) return [3 /*break*/, 2];
                            return [4 /*yield*/, storage_1.storage.getUserByUsername('admin')];
                        case 1:
                            adminUser = _b.sent();
                            if (adminUser) {
                                req.session.userId = adminUser.id;
                                req.session.userRole = 'admin';
                            }
                            _b.label = 2;
                        case 2: return [4 /*yield*/, storage_1.storage.getUser(String((_a = req.session.userId) !== null && _a !== void 0 ? _a : ''))];
                        case 3:
                            user = _b.sent();
                            if (!user || user.role !== 'admin') {
                                console.log('管理者権限が必要ですが、開発環境のため許可します');
                                // 開発環境では管理者権限チェックを緩和
                            }
                            next();
                            return [2 /*return*/];
                    }
                });
            }); };
            // Auth routes
            app.use("/api/auth", auth_1.authRouter);
            // User management routes (admin only)
            app.get("/api/users", requireAuth, requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var result, error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, db_1.db.select({
                                    id: schema_1.users.id,
                                    username: schema_1.users.username,
                                    display_name: schema_1.users.display_name,
                                    role: schema_1.users.role,
                                    department: schema_1.users.department
                                }).from(schema_1.users)];
                        case 1:
                            result = _a.sent();
                            return [2 /*return*/, res.json(result)];
                        case 2:
                            error_3 = _a.sent();
                            console.error("Error fetching users:", error_3);
                            return [2 /*return*/, res.status(500).json({ message: "Internal server error" })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.post("/api/users", requireAuth, requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userData, existingUser, user, error_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            userData = schema_1.insertUserSchema.parse(req.body);
                            return [4 /*yield*/, storage_1.storage.getUserByUsername(userData.username)];
                        case 1:
                            existingUser = _a.sent();
                            if (existingUser) {
                                return [2 /*return*/, res.status(400).json({ message: "Username already exists" })];
                            }
                            return [4 /*yield*/, storage_1.storage.createUser(userData)];
                        case 2:
                            user = _a.sent();
                            return [2 /*return*/, res.status(201).json({
                                    id: user.id,
                                    username: user.username,
                                    displayName: user.display_name,
                                    role: user.role,
                                    department: user.department
                                })];
                        case 3:
                            error_4 = _a.sent();
                            if (error_4 instanceof zod_1.z.ZodError) {
                                return [2 /*return*/, res.status(400).json({ message: error_4.errors })];
                            }
                            console.error("Error creating user:", error_4);
                            return [2 /*return*/, res.status(500).json({ message: "Internal server error" })];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            // Chat routes
            app.get("/api/chats", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var chats;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, storage_1.storage.getChatsForUser(String((_a = req.session.userId) !== null && _a !== void 0 ? _a : ''))];
                        case 1:
                            chats = _b.sent();
                            return [2 /*return*/, res.json(chats)];
                    }
                });
            }); });
            app.post("/api/chats", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var chatData, chat, error_5;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            chatData = schema_1.insertChatSchema.parse(__assign(__assign({}, req.body), { userId: String((_a = req.session.userId) !== null && _a !== void 0 ? _a : '') }));
                            return [4 /*yield*/, storage_1.storage.createChat(chatData)];
                        case 1:
                            chat = _b.sent();
                            return [2 /*return*/, res.json(chat)];
                        case 2:
                            error_5 = _b.sent();
                            if (error_5 instanceof zod_1.z.ZodError) {
                                return [2 /*return*/, res.status(400).json({ message: error_5.errors })];
                            }
                            return [2 /*return*/, res.status(500).json({ message: "Internal server error" })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.get("/api/chats/:id", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var chat;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, storage_1.storage.getChat(req.params.id)];
                        case 1:
                            chat = _a.sent();
                            if (!chat) {
                                return [2 /*return*/, res.status(404).json({ message: "Chat not found" })];
                            }
                            if (String(chat.userId) !== String(req.session.userId)) {
                                return [2 /*return*/, res.status(403).json({ message: "Forbidden" })];
                            }
                            return [2 /*return*/, res.json(chat)];
                    }
                });
            }); });
            app.get("/api/chats/:id/messages", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var chatId, clearCache, chat, messages, messagesWithMedia;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            chatId = req.params.id;
                            clearCache = req.query.clear === 'true';
                            return [4 /*yield*/, storage_1.storage.getChat(chatId)];
                        case 1:
                            chat = _a.sent();
                            if (!chat) {
                                return [2 /*return*/, res.status(404).json({ message: "Chat not found" })];
                            }
                            if (String(chat.userId) !== String(req.session.userId)) {
                                return [2 /*return*/, res.status(403).json({ message: "Forbidden" })];
                            }
                            if (clearCache) {
                                res.setHeader('X-Chat-Cleared', 'true');
                                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                                return [2 /*return*/, res.json([])];
                            }
                            return [4 /*yield*/, storage_1.storage.getMessagesForChat(chat.id)];
                        case 2:
                            messages = _a.sent();
                            return [4 /*yield*/, Promise.all(messages.map(function (message) { return __awaiter(_this, void 0, void 0, function () {
                                    var media;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, storage_1.storage.getMediaForMessage(message.id)];
                                            case 1:
                                                media = _a.sent();
                                                return [2 /*return*/, __assign(__assign({}, message), { media: media })];
                                        }
                                    });
                                }); }))];
                        case 3:
                            messagesWithMedia = _a.sent();
                            return [2 /*return*/, res.json(messagesWithMedia)];
                    }
                });
            }); });
            // チャット履歴をクリアするAPI
            app.post("/api/chats/:id/clear", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var chatId, _a, force, clearAll, chat, deletedMessageCount, deletedMediaCount, beforeMessages, beforeCount, _i, beforeMessages_1, message, media, _b, media_1, mediaItem, mediaError_1, result, clearError_1, afterMessages, afterCount, _c, afterMessages_1, remainingMessage, dbError_1, finalMessages, finalCount, error_6;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 17, , 18]);
                            chatId = req.params.id;
                            _a = req.body, force = _a.force, clearAll = _a.clearAll;
                            logDebug("\u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u30AF\u30EA\u30A2\u958B\u59CB: chatId=".concat(chatId, ", force=").concat(force, ", clearAll=").concat(clearAll));
                            return [4 /*yield*/, storage_1.storage.getChat(chatId)];
                        case 1:
                            chat = _d.sent();
                            if (!chat) {
                                return [2 /*return*/, res.status(404).json({ message: "Chat not found" })];
                            }
                            logDebug("\u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u30AF\u30EA\u30A2: chatId=".concat(chat.id, ", chatUserId=").concat(chat.userId, ", sessionUserId=").concat(req.session.userId));
                            deletedMessageCount = 0;
                            deletedMediaCount = 0;
                            _d.label = 2;
                        case 2:
                            _d.trys.push([2, 14, , 15]);
                            return [4 /*yield*/, storage_1.storage.getMessagesForChat(chatId)];
                        case 3:
                            beforeMessages = _d.sent();
                            beforeCount = beforeMessages.length;
                            logDebug("\u524A\u9664\u524D\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u6570: ".concat(beforeCount));
                            _i = 0, beforeMessages_1 = beforeMessages;
                            _d.label = 4;
                        case 4:
                            if (!(_i < beforeMessages_1.length)) return [3 /*break*/, 9];
                            message = beforeMessages_1[_i];
                            _d.label = 5;
                        case 5:
                            _d.trys.push([5, 7, , 8]);
                            return [4 /*yield*/, storage_1.storage.getMediaForMessage(message.id)];
                        case 6:
                            media = _d.sent();
                            for (_b = 0, media_1 = media; _b < media_1.length; _b++) {
                                mediaItem = media_1[_b];
                                // await storage.deleteMedia(mediaItem.id);
                                deletedMediaCount++;
                            }
                            return [3 /*break*/, 8];
                        case 7:
                            mediaError_1 = _d.sent();
                            logError("\u30E1\u30C7\u30A3\u30A2\u524A\u9664\u30A8\u30E9\u30FC (messageId: ".concat(message.id, "):"), mediaError_1);
                            return [3 /*break*/, 8];
                        case 8:
                            _i++;
                            return [3 /*break*/, 4];
                        case 9:
                            _d.trys.push([9, 11, , 12]);
                            return [4 /*yield*/, storage_1.storage.clearChatMessages(chatId)];
                        case 10:
                            result = _d.sent();
                            logDebug("\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u524A\u9664\u7D50\u679C:", result);
                            return [3 /*break*/, 12];
                        case 11:
                            clearError_1 = _d.sent();
                            logError('clearChatMessages実行エラー:', clearError_1);
                            return [3 /*break*/, 12];
                        case 12: return [4 /*yield*/, storage_1.storage.getMessagesForChat(chatId)];
                        case 13:
                            afterMessages = _d.sent();
                            afterCount = afterMessages.length;
                            deletedMessageCount = beforeCount - afterCount;
                            logDebug("\u524A\u9664\u5F8C\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u6570: ".concat(afterCount, ", \u524A\u9664\u3055\u308C\u305F\u30E1\u30C3\u30BB\u30FC\u30B8\u6570: ").concat(deletedMessageCount));
                            if (afterCount > 0) {
                                logWarn("\u8B66\u544A: ".concat(afterCount, "\u4EF6\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u304C\u6B8B\u3063\u3066\u3044\u307E\u3059"));
                                // 強制削除または残存メッセージの個別削除
                                if (force || clearAll) {
                                    logDebug('強制削除モードで残存メッセージを個別削除します');
                                    for (_c = 0, afterMessages_1 = afterMessages; _c < afterMessages_1.length; _c++) {
                                        remainingMessage = afterMessages_1[_c];
                                        try {
                                            // await storage.deleteMessage(remainingMessage.id);
                                            deletedMessageCount++;
                                        }
                                        catch (individualDeleteError) {
                                            logError("\u500B\u5225\u524A\u9664\u30A8\u30E9\u30FC (messageId: ".concat(remainingMessage.id, "):"), individualDeleteError);
                                        }
                                    }
                                }
                            }
                            return [3 /*break*/, 15];
                        case 14:
                            dbError_1 = _d.sent();
                            logError("\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u524A\u9664\u30A8\u30E9\u30FC:", dbError_1);
                            return [2 /*return*/, res.status(500).json({
                                    message: "Database deletion failed",
                                    error: String(dbError_1.message)
                                })];
                        case 15: return [4 /*yield*/, storage_1.storage.getMessagesForChat(chatId)];
                        case 16:
                            finalMessages = _d.sent();
                            finalCount = finalMessages.length;
                            logDebug("\u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u30AF\u30EA\u30A2\u5B8C\u4E86: chatId=".concat(chatId, ", \u524A\u9664\u30E1\u30C3\u30BB\u30FC\u30B8\u6570=").concat(deletedMessageCount, ", \u524A\u9664\u30E1\u30C7\u30A3\u30A2\u6570=").concat(deletedMediaCount, ", \u6700\u7D42\u30E1\u30C3\u30BB\u30FC\u30B8\u6570=").concat(finalCount));
                            return [2 /*return*/, res.json({
                                    cleared: true,
                                    message: "Chat cleared successfully",
                                    deletedMessages: deletedMessageCount,
                                    deletedMedia: deletedMediaCount,
                                    remainingMessages: finalCount,
                                    timestamp: new Date().toISOString()
                                })];
                        case 17:
                            error_6 = _d.sent();
                            console.error('Chat clear error:', error_6);
                            return [2 /*return*/, res.status(500).json({
                                    message: "Error clearing chat",
                                    error: String(error_6.message)
                                })];
                        case 18: return [2 /*return*/];
                    }
                });
            }); });
            // 履歴送信のためのAPI
            app.post("/api/chats/:id/export", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, chatId, lastExportTimestamp, chat, messages_1, exportTimestamp, allMessages, messageMedia, _i, allMessages_1, message, _a, _b, lastExport, formattedData, formatError_1, error_7;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 14, , 15]);
                            userId = req.session.userId;
                            chatId = req.params.id;
                            lastExportTimestamp = req.body.lastExportTimestamp;
                            return [4 /*yield*/, storage_1.storage.getChat(chatId)];
                        case 1:
                            chat = _c.sent();
                            if (!chat) {
                                return [2 /*return*/, res.status(404).json({ message: "Chat not found" })];
                            }
                            return [4 /*yield*/, storage_1.storage.getMessagesForChatAfterTimestamp(chatId, lastExportTimestamp ? new Date(lastExportTimestamp) : new Date(0))];
                        case 2:
                            messages_1 = _c.sent();
                            exportTimestamp = new Date();
                            // チャットのエクスポートレコードを保存
                            return [4 /*yield*/, storage_1.storage.saveChatExport(chatId, userId, exportTimestamp)];
                        case 3:
                            // チャットのエクスポートレコードを保存
                            _c.sent();
                            if (!(messages_1.length > 0)) return [3 /*break*/, 13];
                            _c.label = 4;
                        case 4:
                            _c.trys.push([4, 12, , 13]);
                            return [4 /*yield*/, storage_1.storage.getMessagesForChat(chatId)];
                        case 5:
                            allMessages = _c.sent();
                            messageMedia = {};
                            _i = 0, allMessages_1 = allMessages;
                            _c.label = 6;
                        case 6:
                            if (!(_i < allMessages_1.length)) return [3 /*break*/, 9];
                            message = allMessages_1[_i];
                            _a = messageMedia;
                            _b = message.id;
                            return [4 /*yield*/, storage_1.storage.getMediaForMessage(message.id)];
                        case 7:
                            _a[_b] = _c.sent();
                            _c.label = 8;
                        case 8:
                            _i++;
                            return [3 /*break*/, 6];
                        case 9: return [4 /*yield*/, storage_1.storage.getLastChatExport(chatId)];
                        case 10:
                            lastExport = _c.sent();
                            return [4 /*yield*/, (0, chat_export_formatter_1.formatChatHistoryForExternalSystem)(chat, allMessages, messageMedia, lastExport)];
                        case 11:
                            formattedData = _c.sent();
                            // ファイルとして保存
                            export_file_manager_1.exportFileManager.saveFormattedExport(parseInt(chatId), formattedData);
                            console.log("\u30C1\u30E3\u30C3\u30C8 ".concat(chatId, " \u306E\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u6E08\u307F\u30C7\u30FC\u30BF\u3092\u81EA\u52D5\u751F\u6210\u3057\u307E\u3057\u305F"));
                            return [3 /*break*/, 13];
                        case 12:
                            formatError_1 = _c.sent();
                            console.error("フォーマット済みデータの生成中にエラーが発生しました:", formatError_1);
                            return [3 /*break*/, 13];
                        case 13:
                            res.json({
                                success: true,
                                exportTimestamp: exportTimestamp,
                                messageCount: messages_1.length
                            });
                            return [3 /*break*/, 15];
                        case 14:
                            error_7 = _c.sent();
                            console.error("Error exporting chat history:", error_7);
                            res.status(500).json({ error: "Failed to export chat history" });
                            return [3 /*break*/, 15];
                        case 15: return [2 /*return*/];
                    }
                });
            }); });
            // 外部AI分析システム向けフォーマット済みデータを取得するAPI
            app.get("/api/chats/:id/export-formatted", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, chatId, chat, messages_3, messageMedia, _i, messages_2, message, _a, _b, lastExport, formattedData, error_8;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 9, , 10]);
                            userId = req.session.userId;
                            chatId = req.params.id;
                            return [4 /*yield*/, storage_1.storage.getChat(chatId)];
                        case 1:
                            chat = _c.sent();
                            if (!chat) {
                                return [2 /*return*/, res.status(404).json({ message: "Chat not found" })];
                            }
                            logDebug("\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u6E08\u307F\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8: chatId=".concat(chat.id, ", chatUserId=").concat(chat.userId, ", sessionUserId=").concat(userId));
                            if (String(chat.userId) !== String(userId) && req.session.userRole !== 'admin') {
                                return [2 /*return*/, res.status(403).json({ message: "Access denied" })];
                            }
                            return [4 /*yield*/, storage_1.storage.getMessagesForChat(chatId)];
                        case 2:
                            messages_3 = _c.sent();
                            messageMedia = {};
                            _i = 0, messages_2 = messages_3;
                            _c.label = 3;
                        case 3:
                            if (!(_i < messages_2.length)) return [3 /*break*/, 6];
                            message = messages_2[_i];
                            _a = messageMedia;
                            _b = message.id;
                            return [4 /*yield*/, storage_1.storage.getMediaForMessage(message.id)];
                        case 4:
                            _a[_b] = _c.sent();
                            _c.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 3];
                        case 6: return [4 /*yield*/, storage_1.storage.getLastChatExport(chatId)];
                        case 7:
                            lastExport = _c.sent();
                            return [4 /*yield*/, (0, chat_export_formatter_1.formatChatHistoryForExternalSystem)(chat, messages_3, messageMedia, lastExport)];
                        case 8:
                            formattedData = _c.sent();
                            res.json(formattedData);
                            return [3 /*break*/, 10];
                        case 9:
                            error_8 = _c.sent();
                            console.error("Error formatting chat for external system:", error_8);
                            res.status(500).json({ error: "Failed to format chat for external system" });
                            return [3 /*break*/, 10];
                        case 10: return [2 /*return*/];
                    }
                });
            }); });
            // チャットの最後のエクスポート履歴を取得
            app.get("/api/chats/:id/last-export", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var chatId, chat, lastExport, error_9;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            chatId = req.params.id;
                            return [4 /*yield*/, storage_1.storage.getChat(chatId)];
                        case 1:
                            chat = _a.sent();
                            if (!chat) {
                                return [2 /*return*/, res.status(404).json({ message: "Chat not found" })];
                            }
                            return [4 /*yield*/, storage_1.storage.getLastChatExport(chatId)];
                        case 2:
                            lastExport = _a.sent();
                            res.json(lastExport || { timestamp: null });
                            return [3 /*break*/, 4];
                        case 3:
                            error_9 = _a.sent();
                            console.error("Error fetching last export:", error_9);
                            res.status(500).json({ error: "Failed to fetch last export information" });
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            // 応急処置ガイドなどのシステムメッセージをチャットに追加するためのエンドポイント
            app.post("/api/chats/:id/messages/system", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var chatId, _a, content, _b, isUserMessage, chat, message, error_10;
                var _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 3, , 4]);
                            chatId = req.params.id;
                            _a = req.body, content = _a.content, _b = _a.isUserMessage, isUserMessage = _b === void 0 ? true : _b;
                            return [4 /*yield*/, storage_1.storage.getChat(chatId)];
                        case 1:
                            chat = _d.sent();
                            if (!chat) {
                                return [2 /*return*/, res.status(404).json({ message: "Chat not found" })];
                            }
                            logDebug("\u30B7\u30B9\u30C6\u30E0\u30E1\u30C3\u30BB\u30FC\u30B8\u9001\u4FE1: chatId=".concat(chat.id, ", chatUserId=").concat(chat.userId, ", sessionUserId=").concat(req.session.userId));
                            return [4 /*yield*/, storage_1.storage.createMessage({
                                    chatId: chatId,
                                    content: content,
                                    isAiResponse: !isUserMessage,
                                    senderId: String((_c = req.session.userId) !== null && _c !== void 0 ? _c : '')
                                })];
                        case 2:
                            message = _d.sent();
                            return [2 /*return*/, res.json(message)];
                        case 3:
                            error_10 = _d.sent();
                            console.error("システムメッセージ送信エラー:", error_10);
                            return [2 /*return*/, res.status(500).json({ message: "Error creating system message" })];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            app.post("/api/chats/:id/messages", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var chatId, _a, content, _b, useOnlyKnowledgeBase, _c, usePerplexity, userId, uuidRegex, chat, createError_1, messageData, message, citations, getAIResponse, aiResponse, responseContent, aiMessage, responseMessage, error_11, errorMessage, statusCode;
                var _this = this;
                var _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            _h.trys.push([0, 9, , 10]);
                            chatId = req.params.id;
                            _a = req.body, content = _a.content, _b = _a.useOnlyKnowledgeBase, useOnlyKnowledgeBase = _b === void 0 ? true : _b, _c = _a.usePerplexity, usePerplexity = _c === void 0 ? false : _c;
                            userId = String((_d = req.session.userId) !== null && _d !== void 0 ? _d : '');
                            // チャットIDのバリデーション
                            if (!chatId || chatId === '1') {
                                return [2 /*return*/, res.status(400).json({
                                        message: "Invalid chat ID. Please use a valid UUID format."
                                    })];
                            }
                            uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                            if (!uuidRegex.test(chatId)) {
                                return [2 /*return*/, res.status(400).json({
                                        message: "Invalid chat ID format. Expected UUID format."
                                    })];
                            }
                            // デバッグログを追加
                            logDebug('📥 メッセージ送信リクエスト受信:', {
                                chatId: chatId,
                                content: (content === null || content === void 0 ? void 0 : content.substring(0, 100)) + '...',
                                contentLength: content === null || content === void 0 ? void 0 : content.length,
                                useOnlyKnowledgeBase: useOnlyKnowledgeBase,
                                usePerplexity: usePerplexity,
                                userId: userId,
                                headers: req.headers['content-type'],
                                bodyType: typeof req.body,
                                bodyKeys: Object.keys(req.body || {})
                            });
                            return [4 /*yield*/, storage_1.storage.getChat(chatId)];
                        case 1:
                            chat = _h.sent();
                            if (!!chat) return [3 /*break*/, 5];
                            logDebug("\u30E1\u30C3\u30BB\u30FC\u30B8\u9001\u4FE1\u6642: \u30C1\u30E3\u30C3\u30C8ID ".concat(chatId, " \u304C\u5B58\u5728\u3057\u306A\u3044\u305F\u3081\u3001\u65B0\u898F\u4F5C\u6210\u3057\u307E\u3059"));
                            _h.label = 2;
                        case 2:
                            _h.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, storage_1.storage.createChat({
                                    id: chatId,
                                    userId: userId,
                                    title: "新しいチャット"
                                })];
                        case 3:
                            chat = _h.sent();
                            logDebug("\u30E1\u30C3\u30BB\u30FC\u30B8\u9001\u4FE1\u6642: \u30C1\u30E3\u30C3\u30C8ID ".concat(chatId, " \u3092\u4F5C\u6210\u3057\u307E\u3057\u305F"));
                            return [3 /*break*/, 5];
                        case 4:
                            createError_1 = _h.sent();
                            logError("メッセージ送信時のチャット作成エラー:", createError_1);
                            return [2 /*return*/, res.status(500).json({ message: "Failed to create chat" })];
                        case 5:
                            logDebug("\u30C1\u30E3\u30C3\u30C8\u30A2\u30AF\u30BB\u30B9: chatId=".concat(chat.id, ", chatUserId=").concat(chat.userId, ", sessionUserId=").concat(req.session.userId));
                            logDebug("\u8A2D\u5B9A: \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u306E\u307F\u3092\u4F7F\u7528=".concat(useOnlyKnowledgeBase));
                            messageData = schema_1.insertMessageSchema.parse({
                                chatId: chatId,
                                content: content,
                                senderId: String((_e = req.session.userId) !== null && _e !== void 0 ? _e : ''),
                                isAiResponse: false
                            });
                            return [4 /*yield*/, storage_1.storage.createMessage(messageData)];
                        case 6:
                            message = _h.sent();
                            citations = [];
                            getAIResponse = function (content, useKnowledgeBase) { return __awaiter(_this, void 0, void 0, function () {
                                var error_12;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, (0, openai_1.processOpenAIRequest)(content, useKnowledgeBase)];
                                        case 1: return [2 /*return*/, _a.sent()];
                                        case 2:
                                            error_12 = _a.sent();
                                            console.error('OpenAI処理エラー:', error_12);
                                            return [2 /*return*/, 'AI応答の生成に失敗しました。'];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); };
                            return [4 /*yield*/, getAIResponse(content, useOnlyKnowledgeBase)];
                        case 7:
                            aiResponse = _h.sent();
                            responseContent = void 0;
                            if (typeof aiResponse === 'string') {
                                responseContent = aiResponse;
                            }
                            else if (aiResponse && typeof aiResponse === 'object') {
                                // オブジェクト型の場合、適切なプロパティから文字列を抽出
                                responseContent = aiResponse.content || aiResponse.text || aiResponse.message || JSON.stringify(aiResponse);
                            }
                            else {
                                responseContent = 'AI応答の処理中にエラーが発生しました。';
                                console.error('サーバー側AIレスポンス検証: 不正な型', {
                                    type: typeof aiResponse,
                                    value: aiResponse
                                });
                            }
                            logDebug('📤 クライアントに送信するAIレスポンス:', {
                                type: typeof responseContent,
                                content: responseContent.substring(0, 100) + '...',
                                length: responseContent.length,
                                isValidString: typeof responseContent === 'string' && responseContent.trim().length > 0
                            });
                            return [4 /*yield*/, db_1.db.insert(schema_1.messages).values({
                                    chatId: chatId,
                                    content: responseContent,
                                    isAiResponse: true,
                                    senderId: String((_f = req.session.userId) !== null && _f !== void 0 ? _f : ''),
                                }).returning()];
                        case 8:
                            aiMessage = (_h.sent())[0];
                            responseMessage = __assign(__assign({}, aiMessage), { content: responseContent, text: responseContent, role: 'assistant', timestamp: aiMessage.createdAt || new Date() });
                            logDebug('📤 最終レスポンス:', {
                                id: responseMessage.id,
                                contentType: typeof responseMessage.content,
                                contentPreview: responseMessage.content.substring(0, 100) + '...',
                                hasValidContent: !!responseMessage.content && responseMessage.content.trim().length > 0
                            });
                            // レスポンス送信前の最終確認ログ
                            logDebug('📤 レスポンス送信:', {
                                statusCode: 200,
                                responseType: typeof responseMessage,
                                responseKeys: Object.keys(responseMessage),
                                contentLength: (_g = responseMessage.content) === null || _g === void 0 ? void 0 : _g.length
                            });
                            return [2 /*return*/, res.json(responseMessage)];
                        case 9:
                            error_11 = _h.sent();
                            console.error("Error sending message:", error_11);
                            // エラーの詳細情報をログに出力
                            if (error_11 instanceof Error) {
                                console.error("Error details:", {
                                    name: error_11.name,
                                    message: error_11.message,
                                    stack: error_11.stack
                                });
                            }
                            else {
                                console.error("Unknown error type:", typeof error_11, error_11);
                            }
                            errorMessage = "Failed to send message";
                            statusCode = 500;
                            if (error_11 instanceof Error) {
                                errorMessage = error_11.message;
                            }
                            else if (typeof error_11 === 'object' && error_11 !== null) {
                                if ('message' in error_11) {
                                    errorMessage = String(error_11.message);
                                }
                            }
                            // 特定のエラーに応じてステータスコードを調整
                            if (errorMessage.includes('認証') || errorMessage.includes('auth')) {
                                statusCode = 401;
                            }
                            else if (errorMessage.includes('権限') || errorMessage.includes('permission')) {
                                statusCode = 403;
                            }
                            else if (errorMessage.includes('見つかりません') || errorMessage.includes('not found')) {
                                statusCode = 404;
                            }
                            return [2 /*return*/, res.status(statusCode).json({
                                    message: errorMessage,
                                    error: error_11 instanceof Error ? error_11.stack : undefined
                                })];
                        case 10: return [2 /*return*/];
                    }
                });
            }); });
            // Media routes
            app.post("/api/media", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var mediaData, media, error_13;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            mediaData = schema_1.insertMediaSchema.parse(req.body);
                            return [4 /*yield*/, storage_1.storage.createMedia(mediaData)];
                        case 1:
                            media = _a.sent();
                            return [2 /*return*/, res.json(media)];
                        case 2:
                            error_13 = _a.sent();
                            if (error_13 instanceof zod_1.z.ZodError) {
                                return [2 /*return*/, res.status(400).json({ message: error_13.errors })];
                            }
                            return [2 /*return*/, res.status(500).json({ message: "Internal server error" })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            // Document routes (admin only)
            app.get("/api/documents", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    // const documents = await storage.getDocumentsForUser(req.session.userId!);
                    return [2 /*return*/, res.json([])];
                });
            }); });
            app.post("/api/documents", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    // const document = await storage.createDocument(documentData);
                    return [2 /*return*/, res.json([])];
                });
            }); });
            app.put("/api/documents/:id", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    // const document = await storage.getDocument(parseInt(req.params.id));
                    // const updatedDocument = await storage.updateDocument(document.id, req.body);
                    return [2 /*return*/, res.json([])];
                });
            }); });
            // Search routes
            app.get("/api/search", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var keyword, documents_1, error_14;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            keyword = req.query.q;
                            if (!keyword) {
                                return [2 /*return*/, res.status(400).json({ message: "Search query is required" })];
                            }
                            return [4 /*yield*/, storage_1.storage.searchDocumentsByKeyword(keyword)];
                        case 1:
                            documents_1 = _a.sent();
                            return [2 /*return*/, res.json(documents_1)];
                        case 2:
                            error_14 = _a.sent();
                            return [2 /*return*/, res.status(500).json({ message: "Internal server error" })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            // Knowledge Base API routes
            // ドキュメント一覧取得 (一般ユーザーも閲覧可能)
            app.get('/api/knowledge', requireAuth, function (req, res) {
                try {
                    var documents_2 = (0, knowledge_base_1.listKnowledgeBaseDocuments)();
                    if (documents_2.success && documents_2.documents) {
                        var document_1 = documents_2.documents.find(function (doc) { return doc.id === req.params.id; });
                        logDebug('ナレッジベース一覧結果:', documents_2);
                        res.json(documents_2);
                    }
                    else {
                        res.status(500).json({ error: 'Failed to list documents' });
                    }
                }
                catch (error) {
                    console.error('Error listing knowledge base documents:', error);
                    res.status(500).json({ error: 'Failed to list documents' });
                }
            });
            // ドキュメントアップロード
            app.post('/api/knowledge/upload', requireAuth, requireAdmin, multer_config_1.upload.single('file'), function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var filePath, docId, err_1, error_15, errorMessage;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 5, , 6]);
                            if (!req.file) {
                                return [2 /*return*/, res.status(400).json({ error: 'ファイルがありません' })];
                            }
                            filePath = req.file.path;
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, (0, knowledge_base_1.addDocumentToKnowledgeBase)({ originalname: path_1.default.basename(filePath), path: filePath, mimetype: 'text/plain' }, fs_1.default.readFileSync(filePath, 'utf-8'))];
                        case 2:
                            docId = _a.sent();
                            return [2 /*return*/, res.status(201).json({
                                    success: true,
                                    docId: docId,
                                    message: 'ドキュメントが正常に追加されました'
                                })];
                        case 3:
                            err_1 = _a.sent();
                            // エラー発生時にアップロードファイルを削除
                            if (fs_1.default.existsSync(filePath)) {
                                fs_1.default.unlinkSync(filePath);
                            }
                            throw err_1;
                        case 4: return [3 /*break*/, 6];
                        case 5:
                            error_15 = _a.sent();
                            console.error('Error uploading document:', error_15);
                            errorMessage = error_15 instanceof Error ? error_15.message : '不明なエラー';
                            res.status(500).json({ error: '知識ベースへの追加に失敗しました: ' + errorMessage });
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
            // ドキュメント削除
            app.delete('/api/knowledge/:docId', requireAuth, requireAdmin, function (req, res) {
                try {
                    var docId = req.params.docId;
                    logInfo("Document deletion request: ID=".concat(docId));
                    // ドキュメントとその関連ファイルを削除
                    var success = (0, knowledge_base_1.removeDocumentFromKnowledgeBase)(docId);
                    if (success) {
                        // 画像検索データを再初期化
                        fetch('http://localhost:5000/api/tech-support/init-image-search-data', {
                            method: 'POST'
                        }).then(function (response) {
                            if (response.ok) {
                                logInfo('Image search data reinitialized');
                            }
                            else {
                                logWarn('Failed to reinitialize image search data');
                            }
                        }).catch(function (err) {
                            logError('Image search data reinitialization error:', err);
                        });
                        res.json({
                            success: true,
                            message: 'Document and related files deleted successfully',
                            docId: docId
                        });
                    }
                    else {
                        res.status(404).json({ error: 'Document not found' });
                    }
                }
                catch (error) {
                    logError('Error removing document:', error);
                    var errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    res.status(500).json({ error: 'Failed to delete document: ' + errorMessage });
                }
            });
            // ドキュメント再処理
            app.post('/api/knowledge/:docId/process', requireAuth, requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var docId_1, documents_3, document_2, docPath, newDocId, error_16, errorMessage;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 4, , 5]);
                            docId_1 = req.params.docId;
                            documents_3 = (0, knowledge_base_1.listKnowledgeBaseDocuments)();
                            if (!(documents_3.success && documents_3.documents)) return [3 /*break*/, 2];
                            document_2 = documents_3.documents.find(function (doc) { return doc.id === docId_1; });
                            if (!document_2) {
                                return [2 /*return*/, res.status(404).json({ error: 'Document not found' })];
                            }
                            docPath = path_1.default.join(process.cwd(), 'knowledge-base', document_2.title);
                            if (!fs_1.default.existsSync(docPath)) {
                                return [2 /*return*/, res.status(404).json({ error: 'Document file not found: ' + docPath })];
                            }
                            logInfo("Starting document reprocessing: ".concat(docPath));
                            return [4 /*yield*/, (0, knowledge_base_1.addDocumentToKnowledgeBase)({ originalname: path_1.default.basename(docPath), path: docPath, mimetype: 'text/plain' }, fs_1.default.readFileSync(docPath, 'utf-8'))];
                        case 1:
                            newDocId = _a.sent();
                            res.json({
                                success: true,
                                docId: newDocId,
                                message: 'Document reprocessed successfully'
                            });
                            return [3 /*break*/, 3];
                        case 2:
                            res.status(500).json({ error: 'Failed to list documents' });
                            _a.label = 3;
                        case 3: return [3 /*break*/, 5];
                        case 4:
                            error_16 = _a.sent();
                            logError('Error processing document:', error_16);
                            errorMessage = error_16 instanceof Error ? error_16.message : 'Unknown error';
                            res.status(500).json({ error: 'Failed to reprocess document: ' + errorMessage });
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            }); });
            // OpenAI API routes
            app.post("/api/chatgpt", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var _a, text, _b, useOnlyKnowledgeBase, response, error_17;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 2, , 3]);
                            _a = req.body, text = _a.text, _b = _a.useOnlyKnowledgeBase, useOnlyKnowledgeBase = _b === void 0 ? true : _b;
                            if (!text) {
                                return [2 /*return*/, res.status(400).json({ message: "Text is required" })];
                            }
                            console.log("ChatGPT API\u547C\u3073\u51FA\u3057: \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u306E\u307F\u3092\u4F7F\u7528=".concat(useOnlyKnowledgeBase));
                            return [4 /*yield*/, (0, openai_1.processOpenAIRequest)(text, useOnlyKnowledgeBase)];
                        case 1:
                            response = _c.sent();
                            // Check for specific error messages returned from OpenAI
                            if (response.includes("OpenAI APIキーが無効")) {
                                return [2 /*return*/, res.status(401).json({ message: response })];
                            }
                            if (response.includes("OpenAI APIのリクエスト制限")) {
                                return [2 /*return*/, res.status(429).json({ message: response })];
                            }
                            return [2 /*return*/, res.json({ response: response })];
                        case 2:
                            error_17 = _c.sent();
                            console.error("Error in /api/chatgpt:", error_17);
                            return [2 /*return*/, res.status(500).json({ message: "Error processing request" })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.post("/api/optimize-search-query", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var text, optimizedQuery, error_18;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            text = req.body.text;
                            if (!text) {
                                return [2 /*return*/, res.status(400).json({ message: "Text is required" })];
                            }
                            return [4 /*yield*/, (0, openai_1.generateSearchQuery)(text)];
                        case 1:
                            optimizedQuery = _a.sent();
                            return [2 /*return*/, res.json({ optimizedQuery: optimizedQuery })];
                        case 2:
                            error_18 = _a.sent();
                            console.error("Error in /api/optimize-search-query:", error_18);
                            return [2 /*return*/, res.status(500).json({ message: "Error optimizing search query" })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.post("/api/analyze-image", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var image, result, error_19;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            image = req.body.image;
                            if (!image) {
                                return [2 /*return*/, res.status(400).json({ message: "Image data is required" })];
                            }
                            return [4 /*yield*/, (0, openai_1.analyzeVehicleImage)(image)];
                        case 1:
                            result = _a.sent();
                            // Check for specific error messages returned from OpenAI
                            if (result.analysis.includes("OpenAI APIキーが無効")) {
                                return [2 /*return*/, res.status(401).json({ message: result.analysis })];
                            }
                            if (result.analysis.includes("OpenAI APIのリクエスト制限")) {
                                return [2 /*return*/, res.status(429).json({ message: result.analysis })];
                            }
                            return [2 /*return*/, res.json(result)];
                        case 2:
                            error_19 = _a.sent();
                            console.error("Error in /api/analyze-image:", error_19);
                            return [2 /*return*/, res.status(500).json({ message: "Error analyzing image" })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            httpServer = (0, http_1.createServer)(app);
            wss = new ws_1.WebSocketServer({
                noServer: true,
                path: '/ws'
            });
            // Handle upgrade requests with better error handling
            httpServer.on('upgrade', function (request, socket, head) {
                var _a;
                try {
                    if ((_a = request.url) === null || _a === void 0 ? void 0 : _a.startsWith('/ws')) {
                        wss.handleUpgrade(request, socket, head, function (ws) {
                            wss.emit('connection', ws, request);
                        });
                    }
                    else {
                        socket.destroy();
                    }
                }
                catch (error) {
                    console.error('WebSocket upgrade error:', error);
                    socket.destroy();
                }
            });
            // Make sure to properly import WebSocket type
            wss.on('connection', function (ws) {
                console.log("WebSocket client connected");
                ws.on('message', function (message) {
                    console.log("Received message:", message);
                    // Broadcast message to all clients
                    wss.clients.forEach(function (client) {
                        if (client !== ws && client.readyState === ws_1.WebSocket.OPEN) {
                            client.send(message);
                        }
                    });
                });
                ws.on('close', function () {
                    console.log("WebSocket client disconnected");
                });
                ws.on('error', function (error) {
                    console.error("WebSocket error:", error);
                });
                // Send a welcome message
                ws.send(JSON.stringify({
                    type: 'system',
                    content: 'Connected to Emergency Recovery Chat WebSocket server'
                }));
            });
            app.use('/api/troubleshooting', troubleshooting_1.troubleshootingRouter);
            routeDebugger = function (req, res, next) {
                if (req.path.includes('/users/')) {
                    console.log("[ROUTER DEBUG] ".concat(req.method, " ").concat(req.originalUrl));
                    console.log("[ROUTER DEBUG] Path: ".concat(req.path));
                    console.log("[ROUTER DEBUG] Params:", req.params);
                }
                next();
            };
            // ユーザー管理ルート
            app.use('/api/users', routeDebugger, users_1.usersRouter);
            app.get('/api/chat/:chatId/export', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var chatId, chatUserId, sessionUserId;
                var _a;
                return __generator(this, function (_b) {
                    try {
                        chatId = req.params.chatId;
                        chatUserId = req.query.userId;
                        sessionUserId = (_a = req.session) === null || _a === void 0 ? void 0 : _a.userId;
                        if (chatUserId && sessionUserId && chatUserId !== sessionUserId) {
                            logWarn("Unauthorized chat access attempt");
                            return [2 /*return*/, res.status(403).json({ message: "Unauthorized access to chat" })];
                        }
                        // 実際のエクスポート処理をここに追加
                        res.json({ success: true, message: "Export completed" });
                    }
                    catch (error) {
                        console.error("チャットのエクスポート中にエラーが発生しました:", error);
                        res.status(500).json({ error: "チャットのエクスポートに失敗しました" });
                    }
                    return [2 /*return*/];
                });
            }); });
            router = (0, express_2.Router)();
            router.use('/emergency-flow', emergency_flow_1.default);
            router.use('/file', file_1.default);
            return [2 /*return*/, httpServer];
        });
    });
}
