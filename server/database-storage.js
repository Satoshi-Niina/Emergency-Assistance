"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseStorage = void 0;
const schema = __importStar(require("./db/schema.js"));
const drizzle_orm_1 = require("drizzle-orm");
const index_js_1 = require("./db/index.js");
const express_session_1 = __importDefault(require("express-session"));
const memorystore_1 = __importDefault(require("memorystore"));
// Create a memory store for session that is compatible with express-session
const MemoryStore = (0, memorystore_1.default)(express_session_1.default);
class DatabaseStorage {
    constructor() {
        Object.defineProperty(this, "sessionStore", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "seedInitialUsers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async () => {
                try {
                    const adminUser = await this.getUserByUsername('niina');
                    if (!adminUser) {
                        await this.createUser({
                            username: 'niina',
                            // password: "0077", // 未使用のため削除
                            displayName: '新納',
                            role: 'システム管理者',
                        });
                        console.log('✅ niinaユーザーを作成しました');
                    }
                    else {
                        console.log('✅ niinaユーザーは既に存在します');
                    }
                    const employeeUser = await this.getUserByUsername('employee');
                    if (!employeeUser) {
                        const userData = {
                            username: 'employee',
                            // password: "employee123", // 未使用のため削除
                            displayName: '山田太郎',
                            role: 'employee',
                        };
                        console.log('🔍 employeeユーザー作成データ:', userData);
                        await this.createUser(userData);
                        console.log('✅ employeeユーザーを作成しました');
                    }
                    else {
                        console.log('✅ employeeユーザーは既に存在します');
                    }
                }
                catch (error) {
                    console.error('❌ 初期ユーザー作成エラー:', error);
                    // エラーが発生してもサーバーは起動を続行
                }
            }
        });
        // User methods
        Object.defineProperty(this, "getUser", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (id) => {
                const user = (await index_js_1.db.select().from(schema.users).where((0, drizzle_orm_1.eq)(schema.users.id, id)))[0];
                return user;
            }
        });
        Object.defineProperty(this, "getUserByUsername", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (username) => {
                const user = (await index_js_1.db
                    .select()
                    .from(schema.users)
                    .where((0, drizzle_orm_1.eq)(schema.users.username, username))
                    .limit(1))[0];
                return user;
            }
        });
        Object.defineProperty(this, "getAllUsers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async () => {
                return await index_js_1.db.select().from(schema.users);
            }
        });
        Object.defineProperty(this, "createUser", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (insertUser) => {
                const userData = {
                    username: insertUser.username,
                    password: insertUser.password,
                    displayName: insertUser.displayName || insertUser.username, // デフォルト値を設定
                    role: insertUser.role || 'employee',
                    department: insertUser.department,
                    description: insertUser.description,
                };
                console.log('🔍 createUser入力データ:', insertUser);
                console.log('🔍 createUser変換後データ:', userData);
                const user = (await index_js_1.db.insert(schema.users).values(userData).returning())[0];
                return user;
            }
        });
        Object.defineProperty(this, "updateUser", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (id, userData) => {
                const user = (await index_js_1.db
                    .update(schema.users)
                    .set(userData)
                    .where((0, drizzle_orm_1.eq)(schema.users.id, id))
                    .returning())[0];
                return user;
            }
        });
        Object.defineProperty(this, "deleteUser", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (id) => {
                try {
                    const userChats = await index_js_1.db
                        .select()
                        .from(schema.chats)
                        .where((0, drizzle_orm_1.eq)(schema.chats.userId, id));
                    for (const chat of userChats) {
                        await index_js_1.db
                            .delete(schema.chatExports)
                            .where((0, drizzle_orm_1.eq)(schema.chatExports.chatId, chat.id));
                        const chatMessages = await index_js_1.db
                            .select()
                            .from(schema.messages)
                            .where((0, drizzle_orm_1.eq)(schema.messages.chatId, chat.id));
                        for (const message of chatMessages) {
                            await index_js_1.db
                                .delete(schema.media)
                                .where((0, drizzle_orm_1.eq)(schema.media.messageId, message.id));
                        }
                        await index_js_1.db
                            .delete(schema.messages)
                            .where((0, drizzle_orm_1.eq)(schema.messages.chatId, chat.id));
                    }
                    await index_js_1.db.delete(schema.chats).where((0, drizzle_orm_1.eq)(schema.chats.userId, id));
                    // Get user messages through chats or sender_id
                    const userMessages = await index_js_1.db
                        .select()
                        .from(schema.messages)
                        .where((0, drizzle_orm_1.eq)(schema.messages.senderId, id));
                    for (const message of userMessages) {
                        await index_js_1.db
                            .delete(schema.media)
                            .where((0, drizzle_orm_1.eq)(schema.media.messageId, message.id));
                    }
                    await index_js_1.db.delete(schema.messages).where((0, drizzle_orm_1.eq)(schema.messages.senderId, id));
                    const userDocuments = await index_js_1.db
                        .select()
                        .from(schema.documents)
                        .where((0, drizzle_orm_1.eq)(schema.documents.userId, id));
                    for (const document of userDocuments) {
                        await index_js_1.db
                            .delete(schema.keywords)
                            .where((0, drizzle_orm_1.eq)(schema.keywords.documentId, document.id));
                    }
                    await index_js_1.db.delete(schema.documents).where((0, drizzle_orm_1.eq)(schema.documents.userId, id));
                    await index_js_1.db.delete(schema.users).where((0, drizzle_orm_1.eq)(schema.users.id, id));
                    return true;
                }
                catch (error) {
                    console.error('ユーザー削除時のエラー', error);
                    return false;
                }
            }
        });
        // Chat methods
        Object.defineProperty(this, "getChat", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (id) => {
                const chat = (await index_js_1.db.select().from(schema.chats).where((0, drizzle_orm_1.eq)(schema.chats.id, id)))[0];
                return chat;
            }
        });
        Object.defineProperty(this, "getChatsForUser", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (userId) => {
                return await index_js_1.db
                    .select()
                    .from(schema.chats)
                    .where((0, drizzle_orm_1.eq)(schema.chats.userId, userId));
            }
        });
        Object.defineProperty(this, "createChat", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (chat) => {
                const newChat = (await index_js_1.db.insert(schema.chats).values(chat).returning())[0];
                return newChat;
            }
        });
        // Message methods
        Object.defineProperty(this, "getMessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (id) => {
                const message = (await index_js_1.db.select().from(schema.messages).where((0, drizzle_orm_1.eq)(schema.messages.id, id)))[0];
                return message ? { ...message, text: message.content } : undefined;
            }
        });
        Object.defineProperty(this, "getMessagesForChat", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (chatId) => {
                const result = await index_js_1.db
                    .select()
                    .from(schema.messages)
                    .where((0, drizzle_orm_1.eq)(schema.messages.chatId, chatId));
                const sortedMessages = result.sort((a, b) => {
                    const aTime = a.createdAt ? a.createdAt.getTime() : 0;
                    const bTime = b.createdAt ? b.createdAt.getTime() : 0;
                    return aTime - bTime;
                });
                if (sortedMessages.length === 0) {
                    console.log(`チャットID ${chatId} にはメッセージがありません`);
                }
                return sortedMessages.map((msg) => ({ ...msg, text: msg.content }));
            }
        });
        Object.defineProperty(this, "createMessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (message) => {
                const insertData = {
                    chatId: message.chatId,
                    content: message.content,
                    isAiResponse: message.isAiResponse,
                    userId: message.userId,
                };
                const newMessage = (await index_js_1.db.insert(schema.messages).values(insertData).returning())[0];
                return { ...newMessage, text: newMessage.content };
            }
        });
        Object.defineProperty(this, "clearChatMessages", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (chatId) => {
                console.log(`チャットメッセージをクリア開始: chatId=${chatId}`);
                const chatMessages = await this.getMessagesForChat(chatId);
                const messageIds = chatMessages.map((message) => message.id);
                console.log(`削除対象メッセージ数: ${messageIds.length}`);
                let deletedMediaCount = 0;
                if (messageIds.length > 0) {
                    for (const messageId of messageIds) {
                        try {
                            await index_js_1.db
                                .delete(schema.media)
                                .where((0, drizzle_orm_1.eq)(schema.media.messageId, messageId));
                            console.log(`メディア削除: messageId=${messageId}`);
                            deletedMediaCount++;
                        }
                        catch (error) {
                            console.error(`メディア削除エラー (messageId: ${messageId}):`, error);
                        }
                    }
                }
                let deletedMessageCount = 0;
                let attempt = 0;
                while (attempt < 3) {
                    try {
                        await index_js_1.db
                            .delete(schema.messages)
                            .where((0, drizzle_orm_1.eq)(schema.messages.chatId, chatId));
                        console.log(`メッセージ削除試行 ${attempt + 1}: 完了`);
                        const remainingMessages = await this.getMessagesForChat(chatId);
                        if (remainingMessages.length === 0) {
                            console.log(`チャットメッセージクリア完了: chatId=${chatId}, 削除メディア=${deletedMediaCount}, 削除メッセージ=${deletedMessageCount}`);
                            break;
                        }
                        console.warn(`試行 ${attempt + 1} 後に ${remainingMessages.length} 件のメッセージが残っています`);
                        if (attempt === 2) {
                            for (const msg of remainingMessages) {
                                try {
                                    await index_js_1.db
                                        .delete(schema.messages)
                                        .where((0, drizzle_orm_1.eq)(schema.messages.id, msg.id));
                                    deletedMessageCount++;
                                }
                                catch (error) {
                                    console.error(`個別メッセージ削除エラー (id: ${msg.id}):`, error);
                                }
                            }
                        }
                        attempt++;
                    }
                    catch (error) {
                        console.error(`メッセージ削除試行 ${attempt + 1} エラー:`, error);
                        if (attempt === 2) {
                            throw error;
                        }
                        attempt++;
                    }
                }
                console.log(`チャットメッセージクリア完了: chatId=${chatId}, 削除メディア=${deletedMediaCount}, 削除メッセージ=${deletedMessageCount}`);
            }
        });
        // Media methods
        Object.defineProperty(this, "getMedia", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (id) => {
                const mediaItem = (await index_js_1.db.select().from(schema.media).where((0, drizzle_orm_1.eq)(schema.media.id, id)))[0];
                return mediaItem;
            }
        });
        Object.defineProperty(this, "getMediaForMessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (messageId) => {
                return await index_js_1.db
                    .select()
                    .from(schema.media)
                    .where((0, drizzle_orm_1.eq)(schema.media.messageId, messageId));
            }
        });
        Object.defineProperty(this, "createMedia", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (mediaItem) => {
                const newMedia = (await index_js_1.db.insert(schema.media).values(mediaItem).returning())[0];
                return newMedia;
            }
        });
        // Keyword methods
        Object.defineProperty(this, "getKeywordsForDocument", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (documentId) => {
                return await index_js_1.db
                    .select()
                    .from(schema.keywords)
                    .where((0, drizzle_orm_1.eq)(schema.keywords.documentId, documentId));
            }
        });
        Object.defineProperty(this, "createKeyword", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (keyword) => {
                const newKeyword = (await index_js_1.db.insert(schema.keywords).values(keyword).returning())[0];
                return newKeyword;
            }
        });
        Object.defineProperty(this, "searchDocumentsByKeyword", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (keyword) => {
                const matchingKeywords = await index_js_1.db
                    .select()
                    .from(schema.keywords)
                    .where((0, drizzle_orm_1.like)(schema.keywords.word, `%${keyword}%`));
                if (matchingKeywords.length === 0) {
                    return [];
                }
                const documentIds = Array.from(new Set(matchingKeywords.map((k) => k.documentId)));
                const matchingDocuments = [];
                for (const docId of documentIds) {
                    if (docId === null)
                        continue;
                    // ここで必要に応じてドキュメント取得処理を追加
                }
                return matchingDocuments;
            }
        });
        // チャットエクスポート関連のメソッド
        Object.defineProperty(this, "getMessagesForChatAfterTimestamp", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (chatId, timestamp) => {
                const allMessages = await index_js_1.db
                    .select()
                    .from(schema.messages)
                    .where((0, drizzle_orm_1.eq)(schema.messages.chatId, chatId));
                return allMessages
                    .filter((msg) => msg.createdAt && msg.createdAt > timestamp)
                    .map((msg) => ({ ...msg, text: msg.content }))
                    .sort((a, b) => {
                    const aTime = a.createdAt ? a.createdAt.getTime() : 0;
                    const bTime = b.createdAt ? b.createdAt.getTime() : 0;
                    return aTime - bTime;
                });
            }
        });
        Object.defineProperty(this, "saveChatExport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (chatId, userId, timestamp) => {
                await index_js_1.db.insert(schema.chatExports).values({
                    chatId: chatId,
                    userId: userId,
                    exportPath: `exports/chat-${chatId}-${timestamp}.json`,
                    exportType: 'json',
                    timestamp: new Date(timestamp),
                });
            }
        });
        Object.defineProperty(this, "getLastChatExport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (chatId) => {
                const exports = await index_js_1.db
                    .select()
                    .from(schema.chatExports)
                    .where((0, drizzle_orm_1.eq)(schema.chatExports.chatId, chatId));
                if (exports.length === 0) {
                    return null;
                }
                return exports.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
            }
        });
        // Initialize session store with memory store
        this.sessionStore = new MemoryStore({
            checkPeriod: 86400000, // prune expired entries every 24h
        });
        // Seed initial users if not present
        this.seedInitialUsers().catch(error => {
            console.error('初期ユーザー作成エラー:', error);
        });
    }
}
exports.DatabaseStorage = DatabaseStorage;
exports.default = DatabaseStorage;
