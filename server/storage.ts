import { DatabaseStorage } from "./database-storage.js";
import { db } from "./db/index.js";
import { schema } from "../shared/schema.js";

// 繝・・繧ｿ繝吶・繧ｹ謗･邯壹ユ繧ｹ繝・
const testDatabaseConnection = async (): Promise<boolean> => {
    try {
        await db.select().from(schema.users).limit(1);
        console.log('繝・・繧ｿ繝吶・繧ｹ謗･邯唹K');
        return true;
    } catch (error) {
        console.error('繝・・繧ｿ繝吶・繧ｹ謗･邯壹お繝ｩ繝ｼ:', error);
        return false;
    }
};

const dbStorage = new DatabaseStorage();

export const storage = {
    testConnection: testDatabaseConnection,
    // Session store
    sessionStore: dbStorage.sessionStore,
    // User methods
    getUser: async (id: string) => dbStorage.getUser(id),
    getUserByUsername: async (username: string) => dbStorage.getUserByUsername(username),
    createUser: async (user: any) => dbStorage.createUser(user),
    updateUser: async (id: string, user: any) => dbStorage.updateUser(id, user),
    deleteUser: async (id: string) => dbStorage.deleteUser(id),
    // Chat methods
    getChat: async (id: string) => dbStorage.getChat(id),
    getChatsForUser: async (userId: string) => dbStorage.getChatsForUser(userId),
    createChat: async (chat: any) => dbStorage.createChat(chat),
    // Message methods
    getMessage: async (id: string) => dbStorage.getMessage(id),
    getMessagesForChat: async (chatId: string) => dbStorage.getMessagesForChat(chatId),
    getMessagesForChatAfterTimestamp: async (chatId: string, timestamp: number) => dbStorage.getMessagesForChatAfterTimestamp(chatId, timestamp),
    createMessage: async (message: any) => dbStorage.createMessage(message),
    clearChatMessages: async (chatId: string) => dbStorage.clearChatMessages(chatId),
    // Media methods
    getMedia: async (id: string) => dbStorage.getMedia(id),
    getMediaForMessage: async (messageId: string) => dbStorage.getMediaForMessage(messageId),
    createMedia: async (media: any) => dbStorage.createMedia(media),
    // Keyword methods
    getKeywordsForDocument: async (documentId: string) => dbStorage.getKeywordsForDocument(documentId),
    createKeyword: async (keyword: any) => dbStorage.createKeyword(keyword),
    searchDocumentsByKeyword: async (keyword: string) => dbStorage.searchDocumentsByKeyword(keyword),
    // Chat export methods
    saveChatExport: async (chatId: string, userId: string, timestamp: number) => dbStorage.saveChatExport(chatId, userId, timestamp),
    getLastChatExport: async (chatId: string) => dbStorage.getLastChatExport(chatId)
}; 