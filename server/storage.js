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
exports.storage = void 0;
var schema_1 = require("@shared/schema");
var database_storage_1 = require("./database-storage");
var db_1 = require("./db");
// データベース接続テスト
var testDatabaseConnection = function () { return __awaiter(void 0, void 0, void 0, function () {
    var error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1.db.select().from(schema_1.users).limit(1)];
            case 1:
                _a.sent();
                console.log('データベース接続OK');
                return [2 /*return*/, true];
            case 2:
                error_1 = _a.sent();
                console.error('データベース接続エラー:', error_1);
                return [2 /*return*/, false];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.storage = {
    testConnection: testDatabaseConnection,
    // Session store
    sessionStore: new database_storage_1.DatabaseStorage().sessionStore,
    // User methods
    getUser: function (id) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().getUser(id)];
        });
    }); },
    getUserByUsername: function (username) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().getUserByUsername(username)];
        });
    }); },
    createUser: function (user) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().createUser(user)];
        });
    }); },
    updateUser: function (id, user) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().updateUser(id, user)];
        });
    }); },
    deleteUser: function (id) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().deleteUser(id)];
        });
    }); },
    // Chat methods
    getChat: function (id) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().getChat(id)];
        });
    }); },
    getChatsForUser: function (userId) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().getChatsForUser(userId)];
        });
    }); },
    createChat: function (chat) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().createChat(chat)];
        });
    }); },
    // Message methods
    getMessage: function (id) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().getMessage(id)];
        });
    }); },
    getMessagesForChat: function (chatId) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().getMessagesForChat(chatId)];
        });
    }); },
    getMessagesForChatAfterTimestamp: function (chatId, timestamp) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().getMessagesForChatAfterTimestamp(chatId, timestamp)];
        });
    }); },
    createMessage: function (message) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().createMessage(message)];
        });
    }); },
    clearChatMessages: function (chatId) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().clearChatMessages(chatId)];
        });
    }); },
    // Media methods
    getMedia: function (id) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().getMedia(id)];
        });
    }); },
    getMediaForMessage: function (messageId) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().getMediaForMessage(messageId)];
        });
    }); },
    createMedia: function (media) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().createMedia(media)];
        });
    }); },
    // Document methods
    // getDocument: async (id: string): Promise<Document | undefined> => {
    //   return new DatabaseStorage().getDocument(id);
    // },
    // getDocumentsForUser: async (userId: string): Promise<Document[]> => {
    //   return new DatabaseStorage().getDocumentsForUser(userId);
    // },
    // createDocument: async (document: InsertDocument): Promise<Document> => {
    //   return new DatabaseStorage().createDocument(document);
    // },
    // updateDocument: async (id: string, updates: Partial<Document>): Promise<Document | undefined> => {
    //   return new DatabaseStorage().updateDocument(id, updates);
    // },
    // deleteMessage: async (messageId: string) => {
    //   return new DatabaseStorage().deleteMessage(messageId);
    // },
    // deleteMedia: async (mediaId: string) => {
    //   return new DatabaseStorage().deleteMedia(mediaId);
    // },
    // Keyword methods
    getKeywordsForDocument: function (documentId) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().getKeywordsForDocument(documentId)];
        });
    }); },
    createKeyword: function (keyword) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().createKeyword(keyword)];
        });
    }); },
    searchDocumentsByKeyword: function (keyword) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().searchDocumentsByKeyword(keyword)];
        });
    }); },
    // Chat export methods
    saveChatExport: function (chatId, userId, timestamp) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().saveChatExport(chatId, userId, timestamp)];
        });
    }); },
    getLastChatExport: function (chatId) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new database_storage_1.DatabaseStorage().getLastChatExport(chatId)];
        });
    }); }
};
