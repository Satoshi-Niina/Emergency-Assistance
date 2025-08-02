import { schema } from "../shared/schema.js";
import { eq, like } from "drizzle-orm";
import { storage } from "./storage.js";
import { db } from "./db/index.js";
import session from "express-session";
import memorystore from "memorystore";

// Create a memory store for session that is compatible with express-session
const MemoryStore = memorystore(session);

export class DatabaseStorage {
    sessionStore: any;
    constructor() {
        // Initialize session store with memory store
        this.sessionStore = new MemoryStore({
            checkPeriod: 86400000, // prune expired entries every 24h
        });
        // Seed initial users if not present
        this.seedInitialUsers();
    }
    seedInitialUsers = async (): Promise<void> => {
        const adminUser = await this.getUserByUsername("niina");
        if (!adminUser) {
            await this.createUser({
                username: "niina",
                password: "0077", // In a real app, this would be hashed
                displayName: "新納",
                role: "システム管理者"
            });
        }
        const employeeUser = await this.getUserByUsername("employee");
        if (!employeeUser) {
            await this.createUser({
                username: "employee",
                password: "employee123", // In a real app, this would be hashed
                displayName: "山田太郎",
                role: "employee"
            });
        }
    };
    // User methods
    getUser = async (id: string): Promise<any> => {
        const user = (await db.select().from(schema.users).where(eq(schema.users.id, id)))[0];
        return user;
    };
    getUserByUsername = async (username: string): Promise<any> => {
        const user = (await db.select().from(schema.users).where(eq(schema.users.username, username)))[0];
        return user;
    };
    getAllUsers = async (): Promise<any[]> => {
        return await db.select().from(schema.users);
    };
    createUser = async (insertUser: any): Promise<any> => {
        const userData = {
            username: insertUser.username,
            password: insertUser.password,
            displayName: insertUser.displayName || insertUser.username, // デフォルト値を設定
            role: insertUser.role || 'employee',
            department: insertUser.department,
            description: insertUser.description
        };
        const user = (await db.insert(schema.users).values(userData).returning())[0];
        return user;
    };
    updateUser = async (id: string, userData: any): Promise<any> => {
        const user = (await db
            .update(schema.users)
                            .set(userData)
            .where(eq(schema.users.id, id))
            .returning())[0];
        return user;
    };
    deleteUser = async (id: string): Promise<boolean> => {
        try {
            const userChats = await db.select().from(schema.chats).where(eq(schema.chats.userId, id));
            for (const chat of userChats) {
                await db.delete(schema.chatExports).where(eq(schema.chatExports.chatId, chat.id));
                const chatMessages = await db.select().from(schema.messages).where(eq(schema.messages.chatId, chat.id));
                for (const message of chatMessages) {
                    await db.delete(schema.media).where(eq(schema.media.messageId, message.id));
                }
                await db.delete(schema.messages).where(eq(schema.messages.chatId, chat.id));
            }
            await db.delete(schema.chats).where(eq(schema.chats.userId, id));
            const userMessages = await db.select().from(schema.messages).where(eq(schema.messages.userId, id));
            for (const message of userMessages) {
                await db.delete(schema.media).where(eq(schema.media.messageId, message.id));
            }
            await db.delete(schema.messages).where(eq(schema.messages.userId, id));
            const userDocuments = await db.select().from(schema.documents).where(eq(schema.documents.userId, id));
            for (const document of userDocuments) {
                await db.delete(schema.keywords).where(eq(schema.keywords.documentId, document.id));
            }
            await db.delete(schema.documents).where(eq(schema.documents.userId, id));
            await db.delete(schema.users).where(eq(schema.users.id, id));
            return true;
        } catch (error) {
            console.error("ユーザー削除時のエラー", error);
            return false;
                }
    };
    // Chat methods
    getChat = async (id: string): Promise<any> => {
        const chat = (await db.select().from(schema.chats).where(eq(schema.chats.id, id)))[0];
        return chat;
    };
    getChatsForUser = async (userId: string): Promise<any[]> => {
        return await db.select().from(schema.chats).where(eq(schema.chats.userId, userId));
    };
    createChat = async (chat: any): Promise<any> => {
        const newChat = (await db.insert(schema.chats).values(chat).returning())[0];
        return newChat;
    };
    // Message methods
    getMessage = async (id: string): Promise<any> => {
        const message = (await db.select().from(schema.messages).where(eq(schema.messages.id, id)))[0];
        return message ? { ...message, text: message.content } : undefined;
    };
    getMessagesForChat = async (chatId: string): Promise<any[]> => {
        const result = await db.select().from(schema.messages).where(eq(schema.messages.chatId, chatId));
        const sortedMessages = result.sort((a: any, b: any) => {
            const aTime = a.createdAt ? a.createdAt.getTime() : 0;
            const bTime = b.createdAt ? b.createdAt.getTime() : 0;
                            return aTime - bTime;
                        });
                        if (sortedMessages.length === 0) {
            console.log(`チャットID ${chatId} にはメッセージがありません`);
                        }
        return sortedMessages.map((msg: any) => ({ ...msg, text: msg.content }));
    };
    createMessage = async (message: any): Promise<any> => {
        const insertData: any = {
                            chatId: message.chatId,
                            content: message.content,
            isAiResponse: message.isAiResponse,
            userId: message.userId
        };
        const newMessage = (await db.insert(schema.messages).values(insertData).returning())[0];
        return { ...newMessage, text: newMessage.content };
    };
    clearChatMessages = async (chatId: string): Promise<void> => {
        console.log(`チャットメッセージをクリア開始: chatId=${chatId}`);
        const chatMessages = await this.getMessagesForChat(chatId);
        const messageIds = chatMessages.map((message: any) => message.id);
        console.log(`削除対象メッセージ数: ${messageIds.length}`);
        let deletedMediaCount = 0;
        if (messageIds.length > 0) {
            for (const messageId of messageIds) {
                try {
                    await db.delete(schema.media).where(eq(schema.media.messageId, messageId));
                    console.log(`メディア削除: messageId=${messageId}`);
                        deletedMediaCount++;
                } catch (error) {
                    console.error(`メディア削除エラー (messageId: ${messageId}):`, error);
                }
            }
        }
        let deletedMessageCount = 0;
        let attempt = 0;
        while (attempt < 3) {
            try {
                await db.delete(schema.messages).where(eq(schema.messages.chatId, chatId));
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
                            await db.delete(schema.messages).where(eq(schema.messages.id, msg.id));
                        deletedMessageCount++;
                        } catch (error) {
                            console.error(`個別メッセージ削除エラー (id: ${msg.id}):`, error);
                        }
                    }
                }
                        attempt++;
            } catch (error) {
                console.error(`メッセージ削除試行 ${attempt + 1} エラー:`, error);
                if (attempt === 2) {
                    throw error;
                }
                attempt++;
            }
        }
        console.log(`チャットメッセージクリア完了: chatId=${chatId}, 削除メディア=${deletedMediaCount}, 削除メッセージ=${deletedMessageCount}`);
    };
    // Media methods
    getMedia = async (id: string): Promise<any> => {
        const mediaItem = (await db.select().from(schema.media).where(eq(schema.media.id, id)))[0];
        return mediaItem;
    };
    getMediaForMessage = async (messageId: string): Promise<any[]> => {
        return await db.select().from(schema.media).where(eq(schema.media.messageId, messageId));
    };
    createMedia = async (mediaItem: any): Promise<any> => {
        const newMedia = (await db.insert(schema.media).values(mediaItem).returning())[0];
        return newMedia;
    };
    // Keyword methods
    getKeywordsForDocument = async (documentId: string): Promise<any[]> => {
        return await db.select().from(schema.keywords).where(eq(schema.keywords.documentId, documentId));
    };
    createKeyword = async (keyword: any): Promise<any> => {
        const newKeyword = (await db.insert(schema.keywords).values(keyword).returning())[0];
        return newKeyword;
    };
    searchDocumentsByKeyword = async (keyword: string): Promise<any[]> => {
        const matchingKeywords = await db
                            .select()
            .from(schema.keywords)
            .where(like(schema.keywords.word, `%${keyword}%`));
                        if (matchingKeywords.length === 0) {
            return [];
                        }
        const documentIds = Array.from(new Set(matchingKeywords.map((k: any) => k.documentId)));
        const matchingDocuments = [];
        for (const docId of documentIds) {
            if (docId === null) continue;
            // ここで必要に応じてドキュメント取得処理を追加
                        }
        return matchingDocuments;
    };
    // チャットエクスポート関連のメソッド
    getMessagesForChatAfterTimestamp = async (chatId: string, timestamp: number): Promise<any[]> => {
        const allMessages = await db.select().from(schema.messages).where(eq(schema.messages.chatId, chatId));
        return allMessages
            .filter((msg: any) => msg.createdAt && msg.createdAt > timestamp)
            .map((msg: any) => ({ ...msg, text: msg.content }))
            .sort((a: any, b: any) => {
                const aTime = a.createdAt ? a.createdAt.getTime() : 0;
                const bTime = b.createdAt ? b.createdAt.getTime() : 0;
                                return aTime - bTime;
        });
    };
    saveChatExport = async (chatId: string, userId: string, timestamp: number): Promise<void> => {
        await db.insert(schema.chatExports).values({
                            chatId: chatId,
                            userId: userId,
                            timestamp: timestamp
        });
    };
    getLastChatExport = async (chatId: string): Promise<any> => {
        const exports = await db.select().from(schema.chatExports).where(eq(schema.chatExports.chatId, chatId));
        if (exports.length === 0) {
            return null;
                        }
        return exports.sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    };
}

export default DatabaseStorage;
