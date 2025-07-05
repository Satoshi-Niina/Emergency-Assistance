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
Object.defineProperty(exports, "__esModule", { value: true });
export const DatabaseStorage: any = void 0;
import schema_1 from "@shared/schema";
import drizzle_orm_1 from "drizzle-orm";
import db_1 from "./db";
import express_session_1 from "express-session";
import memorystore_1 from "memorystore";
// Create a memory store for session that is compatible with express-session
var MemoryStore = (0, memorystore_1.default)(express_session_1.default);
var DatabaseStorage = /** @class */ (function () {
    function DatabaseStorage() {
        // Initialize session store with memory store
        this.sessionStore = new MemoryStore({
            checkPeriod: 86400000, // prune expired entries every 24h
        });
        // Seed initial users if not present
        this.seedInitialUsers();
    }
    DatabaseStorage.prototype.seedInitialUsers = function () {
        return __awaiter(this, void 0, void 0, function () {
            var adminUser, employeeUser;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUserByUsername("niina")];
                    case 1:
                        adminUser = _a.sent();
                        if (!!adminUser) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.createUser({
                                username: "niina",
                                password: "0077", // In a real app, this would be hashed
                                display_name: "新名 管理者", // Fix: changed displayName to display_name to match schema
                                role: "admin"
                            })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [4 /*yield*/, this.getUserByUsername("employee")];
                    case 4:
                        employeeUser = _a.sent();
                        if (!!employeeUser) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.createUser({
                                username: "employee",
                                password: "employee123", // In a real app, this would be hashed
                                display_name: "山田太郎", // Fix: changed displayName to display_name to match schema
                                role: "employee"
                            })];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // User methods
    DatabaseStorage.prototype.getUser = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id))];
                    case 1:
                        user = (_a.sent())[0];
                        return [2 /*return*/, user];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserByUsername = function (username) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.username, username))];
                    case 1:
                        user = (_a.sent())[0];
                        return [2 /*return*/, user];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAllUsers = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.users)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.createUser = function (insertUser) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.insert(schema_1.users).values(insertUser).returning()];
                    case 1:
                        user = (_a.sent())[0];
                        return [2 /*return*/, user];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateUser = function (id, userData) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.users)
                            .set(userData)
                            .where((0, drizzle_orm_1.eq)(schema_1.users.id, id))
                            .returning()];
                    case 1:
                        user = (_a.sent())[0];
                        return [2 /*return*/, user];
                }
            });
        });
    };
    DatabaseStorage.prototype.deleteUser = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var userChats, _i, userChats_1, chat, chatMessages, _a, chatMessages_1, message, userMessages, _b, userMessages_1, message, userDocuments, _c, userDocuments_1, document_1, error_1;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 27, , 28]);
                        return [4 /*yield*/, db_1.db.select().from(schema_1.chats).where((0, drizzle_orm_1.eq)(schema_1.chats.userId, id))];
                    case 1:
                        userChats = _d.sent();
                        _i = 0, userChats_1 = userChats;
                        _d.label = 2;
                    case 2:
                        if (!(_i < userChats_1.length)) return [3 /*break*/, 12];
                        chat = userChats_1[_i];
                        // 2.1 チャットのエクスポート履歴を削除
                        return [4 /*yield*/, db_1.db.delete(schema_1.chatExports).where((0, drizzle_orm_1.eq)(schema_1.chatExports.chatId, chat.id))];
                    case 3:
                        // 2.1 チャットのエクスポート履歴を削除
                        _d.sent();
                        return [4 /*yield*/, db_1.db.select().from(schema_1.messages).where((0, drizzle_orm_1.eq)(schema_1.messages.chatId, chat.id))];
                    case 4:
                        chatMessages = _d.sent();
                        _a = 0, chatMessages_1 = chatMessages;
                        _d.label = 5;
                    case 5:
                        if (!(_a < chatMessages_1.length)) return [3 /*break*/, 8];
                        message = chatMessages_1[_a];
                        return [4 /*yield*/, db_1.db.delete(schema_1.media).where((0, drizzle_orm_1.eq)(schema_1.media.messageId, message.id))];
                    case 6:
                        _d.sent();
                        _d.label = 7;
                    case 7:
                        _a++;
                        return [3 /*break*/, 5];
                    case 8: 
                    // 2.4 チャットのメッセージを削除
                    return [4 /*yield*/, db_1.db.delete(schema_1.messages).where((0, drizzle_orm_1.eq)(schema_1.messages.chatId, chat.id))];
                    case 9:
                        // 2.4 チャットのメッセージを削除
                        _d.sent();
                        // 2.5 チャット自体を削除
                        return [4 /*yield*/, db_1.db.delete(schema_1.chats).where((0, drizzle_orm_1.eq)(schema_1.chats.id, chat.id))];
                    case 10:
                        // 2.5 チャット自体を削除
                        _d.sent();
                        _d.label = 11;
                    case 11:
                        _i++;
                        return [3 /*break*/, 2];
                    case 12: return [4 /*yield*/, db_1.db.select().from(schema_1.messages).where((0, drizzle_orm_1.eq)(schema_1.messages.senderId, id))];
                    case 13:
                        userMessages = _d.sent();
                        _b = 0, userMessages_1 = userMessages;
                        _d.label = 14;
                    case 14:
                        if (!(_b < userMessages_1.length)) return [3 /*break*/, 18];
                        message = userMessages_1[_b];
                        return [4 /*yield*/, db_1.db.delete(schema_1.media).where((0, drizzle_orm_1.eq)(schema_1.media.messageId, message.id))];
                    case 15:
                        _d.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.messages).where((0, drizzle_orm_1.eq)(schema_1.messages.id, message.id))];
                    case 16:
                        _d.sent();
                        _d.label = 17;
                    case 17:
                        _b++;
                        return [3 /*break*/, 14];
                    case 18: return [4 /*yield*/, db_1.db.select().from(schema_1.documents).where((0, drizzle_orm_1.eq)(schema_1.documents.userId, id))];
                    case 19:
                        userDocuments = _d.sent();
                        _c = 0, userDocuments_1 = userDocuments;
                        _d.label = 20;
                    case 20:
                        if (!(_c < userDocuments_1.length)) return [3 /*break*/, 24];
                        document_1 = userDocuments_1[_c];
                        return [4 /*yield*/, db_1.db.delete(schema_1.keywords).where((0, drizzle_orm_1.eq)(schema_1.keywords.documentId, document_1.id))];
                    case 21:
                        _d.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.documents).where((0, drizzle_orm_1.eq)(schema_1.documents.id, document_1.id))];
                    case 22:
                        _d.sent();
                        _d.label = 23;
                    case 23:
                        _c++;
                        return [3 /*break*/, 20];
                    case 24: 
                    // 7. ユーザーのエクスポート履歴を削除
                    return [4 /*yield*/, db_1.db.delete(schema_1.chatExports).where((0, drizzle_orm_1.eq)(schema_1.chatExports.userId, id))];
                    case 25:
                        // 7. ユーザーのエクスポート履歴を削除
                        _d.sent();
                        // 8. 最後にユーザーを削除
                        return [4 /*yield*/, db_1.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id))];
                    case 26:
                        // 8. 最後にユーザーを削除
                        _d.sent();
                        console.log("[INFO] \u30E6\u30FC\u30B6\u30FC(ID: ".concat(id, ")\u3068\u305D\u306E\u95A2\u9023\u30C7\u30FC\u30BF\u304C\u6B63\u5E38\u306B\u524A\u9664\u3055\u308C\u307E\u3057\u305F"));
                        return [3 /*break*/, 28];
                    case 27:
                        error_1 = _d.sent();
                        console.error("[ERROR] \u30E6\u30FC\u30B6\u30FC\u524A\u9664\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F(ID: ".concat(id, "):"), error_1);
                        throw error_1;
                    case 28: return [2 /*return*/];
                }
            });
        });
    };
    // Chat methods
    DatabaseStorage.prototype.getChat = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var chat;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.chats).where((0, drizzle_orm_1.eq)(schema_1.chats.id, id))];
                    case 1:
                        chat = (_a.sent())[0];
                        return [2 /*return*/, chat];
                }
            });
        });
    };
    DatabaseStorage.prototype.getChatsForUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, db_1.db.select().from(schema_1.chats).where((0, drizzle_orm_1.eq)(schema_1.chats.userId, userId))];
            });
        });
    };
    DatabaseStorage.prototype.createChat = function (chat) {
        return __awaiter(this, void 0, void 0, function () {
            var newChat;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.insert(schema_1.chats).values(chat).returning()];
                    case 1:
                        newChat = (_a.sent())[0];
                        return [2 /*return*/, newChat];
                }
            });
        });
    };
    // Message methods
    DatabaseStorage.prototype.getMessage = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var message;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.messages).where((0, drizzle_orm_1.eq)(schema_1.messages.id, id))];
                    case 1:
                        message = (_a.sent())[0];
                        return [2 /*return*/, message ? __assign(__assign({}, message), { text: message.content }) : undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.getMessagesForChat = function (chatId) {
        return __awaiter(this, void 0, void 0, function () {
            var result, sortedMessages;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select()
                            .from(schema_1.messages)
                            .where((0, drizzle_orm_1.eq)(schema_1.messages.chatId, chatId))];
                    case 1:
                        result = _a.sent();
                        sortedMessages = result.sort(function (a, b) {
                            var aTime = a.createdAt ? a.createdAt.getTime() : 0;
                            var bTime = b.createdAt ? b.createdAt.getTime() : 0;
                            return aTime - bTime;
                        });
                        // 明示的にメッセージが空の場合はログ出力
                        if (sortedMessages.length === 0) {
                            console.log("[INFO] \u30C1\u30E3\u30C3\u30C8ID ".concat(chatId, " \u306B\u306F\u30E1\u30C3\u30BB\u30FC\u30B8\u304C\u3042\u308A\u307E\u305B\u3093\uFF08\u30AF\u30EA\u30A2\u6E08\u307F\u307E\u305F\u306F\u65B0\u898F\u30C1\u30E3\u30C3\u30C8\uFF09"));
                        }
                        // textフィールドを必ずセット
                        return [2 /*return*/, sortedMessages.map(function (msg) { return (__assign(__assign({}, msg), { text: msg.content })); })];
                }
            });
        });
    };
    DatabaseStorage.prototype.createMessage = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var insertData, newMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        insertData = {
                            chatId: message.chatId,
                            content: message.content,
                            isAiResponse: message.isAiResponse
                        };
                        // senderIdが存在する場合のみ追加
                        if (message.senderId) {
                            insertData.senderId = message.senderId;
                        }
                        return [4 /*yield*/, db_1.db.insert(schema_1.messages).values(insertData).returning()];
                    case 1:
                        newMessage = (_a.sent())[0];
                        return [2 /*return*/, __assign(__assign({}, newMessage), { text: newMessage.content })];
                }
            });
        });
    };
    // チャットメッセージをクリアする関数
    DatabaseStorage.prototype.clearChatMessages = function (chatId) {
        return __awaiter(this, void 0, void 0, function () {
            var chatMessages, messageIds, deletedMediaCount, _i, messageIds_1, messageId, result, mediaError_1, deletedMessageCount, attempt, result, remainingMessages, _a, remainingMessages_1, msg, individualError_1, deleteError_1, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 22, , 23]);
                        console.log("[INFO] \u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u524A\u9664\u958B\u59CB: chatId=".concat(chatId));
                        return [4 /*yield*/, this.getMessagesForChat(chatId)];
                    case 1:
                        chatMessages = _b.sent();
                        messageIds = chatMessages.map(function (message) { return message.id; });
                        console.log("[INFO] \u524A\u9664\u5BFE\u8C61\u30E1\u30C3\u30BB\u30FC\u30B8\u6570: ".concat(messageIds.length));
                        deletedMediaCount = 0;
                        if (!(messageIds.length > 0)) return [3 /*break*/, 7];
                        _i = 0, messageIds_1 = messageIds;
                        _b.label = 2;
                    case 2:
                        if (!(_i < messageIds_1.length)) return [3 /*break*/, 7];
                        messageId = messageIds_1[_i];
                        _b.label = 3;
                    case 3:
                        _b.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, db_1.db.delete(schema_1.media).where((0, drizzle_orm_1.eq)(schema_1.media.messageId, messageId))];
                    case 4:
                        result = _b.sent();
                        console.log("[DEBUG] \u30E1\u30C7\u30A3\u30A2\u524A\u9664: messageId=".concat(messageId));
                        deletedMediaCount++;
                        return [3 /*break*/, 6];
                    case 5:
                        mediaError_1 = _b.sent();
                        console.error("[ERROR] \u30E1\u30C7\u30A3\u30A2\u524A\u9664\u30A8\u30E9\u30FC (messageId: ".concat(messageId, "):"), mediaError_1);
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7:
                        deletedMessageCount = 0;
                        attempt = 0;
                        _b.label = 8;
                    case 8:
                        if (!(attempt < 3)) return [3 /*break*/, 21];
                        _b.label = 9;
                    case 9:
                        _b.trys.push([9, 19, , 20]);
                        return [4 /*yield*/, db_1.db.delete(schema_1.messages).where((0, drizzle_orm_1.eq)(schema_1.messages.chatId, chatId))];
                    case 10:
                        result = _b.sent();
                        console.log("[INFO] \u30E1\u30C3\u30BB\u30FC\u30B8\u524A\u9664\u8A66\u884C ".concat(attempt + 1, ": \u5B8C\u4E86"));
                        return [4 /*yield*/, this.getMessagesForChat(chatId)];
                    case 11:
                        remainingMessages = _b.sent();
                        if (!(remainingMessages.length === 0)) return [3 /*break*/, 12];
                        console.log("[SUCCESS] \u5168\u30E1\u30C3\u30BB\u30FC\u30B8\u524A\u9664\u5B8C\u4E86: chatId=".concat(chatId));
                        return [3 /*break*/, 21];
                    case 12:
                        console.warn("[WARNING] \u8A66\u884C ".concat(attempt + 1, " \u5F8C\u3082 ").concat(remainingMessages.length, " \u4EF6\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u304C\u6B8B\u5B58"));
                        if (!(attempt === 2)) return [3 /*break*/, 18];
                        _a = 0, remainingMessages_1 = remainingMessages;
                        _b.label = 13;
                    case 13:
                        if (!(_a < remainingMessages_1.length)) return [3 /*break*/, 18];
                        msg = remainingMessages_1[_a];
                        _b.label = 14;
                    case 14:
                        _b.trys.push([14, 16, , 17]);
                        return [4 /*yield*/, db_1.db.delete(schema_1.messages).where((0, drizzle_orm_1.eq)(schema_1.messages.id, msg.id))];
                    case 15:
                        _b.sent();
                        deletedMessageCount++;
                        return [3 /*break*/, 17];
                    case 16:
                        individualError_1 = _b.sent();
                        console.error("[ERROR] \u500B\u5225\u524A\u9664\u30A8\u30E9\u30FC (id: ".concat(msg.id, "):"), individualError_1);
                        return [3 /*break*/, 17];
                    case 17:
                        _a++;
                        return [3 /*break*/, 13];
                    case 18: return [3 /*break*/, 20];
                    case 19:
                        deleteError_1 = _b.sent();
                        console.error("[ERROR] \u30E1\u30C3\u30BB\u30FC\u30B8\u524A\u9664\u8A66\u884C ".concat(attempt + 1, " \u30A8\u30E9\u30FC:"), deleteError_1);
                        if (attempt === 2)
                            throw deleteError_1;
                        return [3 /*break*/, 20];
                    case 20:
                        attempt++;
                        return [3 /*break*/, 8];
                    case 21:
                        console.log("[SUCCESS] \u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u524A\u9664\u5B8C\u4E86: chatId=".concat(chatId, ", \u524A\u9664\u30E1\u30C7\u30A3\u30A2=").concat(deletedMediaCount, ", \u524A\u9664\u30E1\u30C3\u30BB\u30FC\u30B8=").concat(deletedMessageCount));
                        return [3 /*break*/, 23];
                    case 22:
                        error_2 = _b.sent();
                        console.error("[ERROR] \u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u524A\u9664\u5931\u6557: chatId=".concat(chatId, ":"), error_2);
                        throw error_2;
                    case 23: return [2 /*return*/];
                }
            });
        });
    };
    // Media methods
    DatabaseStorage.prototype.getMedia = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var mediaItem;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.media).where((0, drizzle_orm_1.eq)(schema_1.media.id, id))];
                    case 1:
                        mediaItem = (_a.sent())[0];
                        return [2 /*return*/, mediaItem];
                }
            });
        });
    };
    DatabaseStorage.prototype.getMediaForMessage = function (messageId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, db_1.db.select().from(schema_1.media).where((0, drizzle_orm_1.eq)(schema_1.media.messageId, messageId))];
            });
        });
    };
    DatabaseStorage.prototype.createMedia = function (mediaItem) {
        return __awaiter(this, void 0, void 0, function () {
            var newMedia;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.insert(schema_1.media).values(mediaItem).returning()];
                    case 1:
                        newMedia = (_a.sent())[0];
                        return [2 /*return*/, newMedia];
                }
            });
        });
    };
    // Keyword methods
    DatabaseStorage.prototype.getKeywordsForDocument = function (documentId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, db_1.db.select().from(schema_1.keywords).where((0, drizzle_orm_1.eq)(schema_1.keywords.documentId, documentId))];
            });
        });
    };
    DatabaseStorage.prototype.createKeyword = function (keyword) {
        return __awaiter(this, void 0, void 0, function () {
            var newKeyword;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.insert(schema_1.keywords).values(keyword).returning()];
                    case 1:
                        newKeyword = (_a.sent())[0];
                        return [2 /*return*/, newKeyword];
                }
            });
        });
    };
    DatabaseStorage.prototype.searchDocumentsByKeyword = function (keyword) {
        return __awaiter(this, void 0, void 0, function () {
            var matchingKeywords, documentIds, matchingDocuments, _i, documentIds_1, docId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.keywords)
                            .where((0, drizzle_orm_1.like)(schema_1.keywords.word, "%".concat(keyword, "%")))];
                    case 1:
                        matchingKeywords = _a.sent();
                        if (matchingKeywords.length === 0) {
                            return [2 /*return*/, []];
                        }
                        documentIds = Array.from(new Set(matchingKeywords.map(function (k) { return k.documentId; })));
                        matchingDocuments = [];
                        for (_i = 0, documentIds_1 = documentIds; _i < documentIds_1.length; _i++) {
                            docId = documentIds_1[_i];
                            if (docId === null)
                                continue;
                            // const doc: any = await this.getDocument(docId);
                            if (docId) {
                                matchingDocuments.push({ id: docId, userId: '', title: '', createdAt: new Date(), content: '' });
                            }
                        }
                        return [2 /*return*/, matchingDocuments];
                }
            });
        });
    };
    // チャットエクスポート関連のメソッド
    DatabaseStorage.prototype.getMessagesForChatAfterTimestamp = function (chatId, timestamp) {
        return __awaiter(this, void 0, void 0, function () {
            var allMessages;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select()
                            .from(schema_1.messages)
                            .where((0, drizzle_orm_1.eq)(schema_1.messages.chatId, chatId))];
                    case 1:
                        allMessages = _a.sent();
                        // JSでフィルタリング（undefinedチェックを追加）
                        return [2 /*return*/, allMessages
                                .filter(function (msg) { return msg.createdAt && msg.createdAt > timestamp; })
                                .map(function (msg) { return (__assign(__assign({}, msg), { text: msg.content })); })
                                .sort(function (a, b) {
                                var aTime = a.createdAt ? a.createdAt.getTime() : 0;
                                var bTime = b.createdAt ? b.createdAt.getTime() : 0;
                                return aTime - bTime;
                            })];
                }
            });
        });
    };
    DatabaseStorage.prototype.saveChatExport = function (chatId, userId, timestamp) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.insert(schema_1.chatExports).values({
                            chatId: chatId,
                            userId: userId,
                            timestamp: timestamp
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.getLastChatExport = function (chatId) {
        return __awaiter(this, void 0, void 0, function () {
            var exports;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select()
                            .from(schema_1.chatExports)
                            .where((0, drizzle_orm_1.eq)(schema_1.chatExports.chatId, chatId))];
                    case 1:
                        exports = _a.sent();
                        if (length == 0) {
                            return [2 /*return*/, null];
                        }
                        // タイムスタンプの降順でソートし、最初の要素を返す
                        return [2 /*return*/, exports.sort(function (a, b) { return b.timestamp.getTime() - a.timestamp.getTime(); })[0]];
                }
            });
        });
    };
    return DatabaseStorage;
}());
export const DatabaseStorage: any = DatabaseStorage;
