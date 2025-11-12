"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = void 0;
const database_storage_js_1 = require("./database-storage.js");
const index_js_1 = require("./db/index.js");
const schema_js_1 = require("./db/schema.js");
// データベース接続テスト
const testDatabaseConnection = async () => {
    try {
        await index_js_1.db.select().from(schema_js_1.schema.users).limit(1);
        console.log('データベース接続OK');
        return true;
    }
    catch (error) {
        console.error('データベース接続エラー:', error);
        return false;
    }
};
const dbStorage = new database_storage_js_1.DatabaseStorage();
exports.storage = {
    testConnection: testDatabaseConnection,
    // Session store
    sessionStore: dbStorage.sessionStore,
    // User methods
    getUser: async (id) => dbStorage.getUser(id),
    getUserByUsername: async (username) => dbStorage.getUserByUsername(username),
    createUser: async (user) => dbStorage.createUser(user),
    updateUser: async (id, user) => dbStorage.updateUser(id, user),
    deleteUser: async (id) => dbStorage.deleteUser(id),
    // Chat methods
    getChat: async (id) => dbStorage.getChat(id),
    getChatsForUser: async (userId) => dbStorage.getChatsForUser(userId),
    createChat: async (chat) => dbStorage.createChat(chat),
    // Message methods
    getMessage: async (id) => dbStorage.getMessage(id),
    getMessagesForChat: async (chatId) => dbStorage.getMessagesForChat(chatId),
    getMessagesForChatAfterTimestamp: async (chatId, timestamp) => dbStorage.getMessagesForChatAfterTimestamp(chatId, timestamp),
    createMessage: async (message) => dbStorage.createMessage(message),
    clearChatMessages: async (chatId) => dbStorage.clearChatMessages(chatId),
    // Media methods
    getMedia: async (id) => dbStorage.getMedia(id),
    getMediaForMessage: async (messageId) => dbStorage.getMediaForMessage(messageId),
    createMedia: async (media) => dbStorage.createMedia(media),
    // Keyword methods
    getKeywordsForDocument: async (documentId) => dbStorage.getKeywordsForDocument(documentId),
    createKeyword: async (keyword) => dbStorage.createKeyword(keyword),
    searchDocumentsByKeyword: async (keyword) => dbStorage.searchDocumentsByKeyword(keyword),
    // Chat export methods
    saveChatExport: async (chatId, userId, timestamp) => dbStorage.saveChatExport(chatId, userId, timestamp),
    getLastChatExport: async (chatId) => dbStorage.getLastChatExport(chatId),
};
