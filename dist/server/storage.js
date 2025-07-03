import { users } from "@shared/schema";
import { DatabaseStorage } from "./database-storage";
import { db } from './db';
// データベース接続テスト
const testDatabaseConnection = async () => {
    try {
        await db.select().from(users).limit(1);
        console.log('データベース接続OK');
        return true;
    }
    catch (error) {
        console.error('データベース接続エラー:', error);
        return false;
    }
};
export const storage = {
    testConnection: testDatabaseConnection,
    // Session store
    sessionStore: new DatabaseStorage().sessionStore,
    // User methods
    getUser: async (id) => {
        return new DatabaseStorage().getUser(id);
    },
    getUserByUsername: async (username) => {
        return new DatabaseStorage().getUserByUsername(username);
    },
    createUser: async (user) => {
        return new DatabaseStorage().createUser(user);
    },
    updateUser: async (id, user) => {
        return new DatabaseStorage().updateUser(id, user);
    },
    deleteUser: async (id) => {
        return new DatabaseStorage().deleteUser(id);
    },
    // Chat methods
    getChat: async (id) => {
        return new DatabaseStorage().getChat(id);
    },
    getChatsForUser: async (userId) => {
        return new DatabaseStorage().getChatsForUser(userId);
    },
    createChat: async (chat) => {
        return new DatabaseStorage().createChat(chat);
    },
    // Message methods
    getMessage: async (id) => {
        return new DatabaseStorage().getMessage(id);
    },
    getMessagesForChat: async (chatId) => {
        return new DatabaseStorage().getMessagesForChat(chatId);
    },
    getMessagesForChatAfterTimestamp: async (chatId, timestamp) => {
        return new DatabaseStorage().getMessagesForChatAfterTimestamp(chatId, timestamp);
    },
    createMessage: async (message) => {
        return new DatabaseStorage().createMessage(message);
    },
    clearChatMessages: async (chatId) => {
        return new DatabaseStorage().clearChatMessages(chatId);
    },
    // Media methods
    getMedia: async (id) => {
        return new DatabaseStorage().getMedia(id);
    },
    getMediaForMessage: async (messageId) => {
        return new DatabaseStorage().getMediaForMessage(messageId);
    },
    createMedia: async (media) => {
        return new DatabaseStorage().createMedia(media);
    },
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
    getKeywordsForDocument: async (documentId) => {
        return new DatabaseStorage().getKeywordsForDocument(documentId);
    },
    createKeyword: async (keyword) => {
        return new DatabaseStorage().createKeyword(keyword);
    },
    searchDocumentsByKeyword: async (keyword) => {
        return new DatabaseStorage().searchDocumentsByKeyword(keyword);
    },
    // Chat export methods
    saveChatExport: async (chatId, userId, timestamp) => {
        return new DatabaseStorage().saveChatExport(chatId, userId, timestamp);
    },
    getLastChatExport: async (chatId) => {
        return new DatabaseStorage().getLastChatExport(chatId);
    }
};
