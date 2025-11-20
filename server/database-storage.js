import * as schema from './db/schema.js';
import { eq, like } from 'drizzle-orm';
import { db } from './db/index.js';
import session from 'express-session';
import memorystore from 'memorystore';
// Create a memory store for session that is compatible with express-session
const MemoryStore = memorystore(session);
export class DatabaseStorage {
    constructor() {
        this.seedInitialUsers = async () => {
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
        };
        // User methods
        this.getUser = async (id) => {
            const user = (await db.select().from(schema.users).where(eq(schema.users.id, id)))[0];
            return user;
        };
        this.getUserByUsername = async (username) => {
            const user = (await db
                .select()
                .from(schema.users)
                .where(eq(schema.users.username, username))
                .limit(1))[0];
            return user;
        };
        this.getAllUsers = async () => {
            return await db.select().from(schema.users);
        };
        this.createUser = async (insertUser) => {
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
            const user = (await db.insert(schema.users).values(userData).returning())[0];
            return user;
        };
        this.updateUser = async (id, userData) => {
            const user = (await db
                .update(schema.users)
                .set(userData)
                .where(eq(schema.users.id, id))
                .returning())[0];
            return user;
        };
        this.deleteUser = async (id) => {
            try {
                const userChats = await db
                    .select()
                    .from(schema.chats)
                    .where(eq(schema.chats.userId, id));
                for (const chat of userChats) {
                    await db
                        .delete(schema.chatExports)
                        .where(eq(schema.chatExports.chatId, chat.id));
                    const chatMessages = await db
                        .select()
                        .from(schema.messages)
                        .where(eq(schema.messages.chatId, chat.id));
                    for (const message of chatMessages) {
                        await db
                            .delete(schema.media)
                            .where(eq(schema.media.messageId, message.id));
                    }
                    await db
                        .delete(schema.messages)
                        .where(eq(schema.messages.chatId, chat.id));
                }
                await db.delete(schema.chats).where(eq(schema.chats.userId, id));
                // Get user messages through chats or sender_id
                const userMessages = await db
                    .select()
                    .from(schema.messages)
                    .where(eq(schema.messages.senderId, id));
                for (const message of userMessages) {
                    await db
                        .delete(schema.media)
                        .where(eq(schema.media.messageId, message.id));
                }
                await db.delete(schema.messages).where(eq(schema.messages.senderId, id));
                const userDocuments = await db
                    .select()
                    .from(schema.documents)
                    .where(eq(schema.documents.userId, id));
                for (const document of userDocuments) {
                    await db
                        .delete(schema.keywords)
                        .where(eq(schema.keywords.documentId, document.id));
                }
                await db.delete(schema.documents).where(eq(schema.documents.userId, id));
                await db.delete(schema.users).where(eq(schema.users.id, id));
                return true;
            }
            catch (error) {
                console.error('ユーザー削除時のエラー', error);
                return false;
            }
        };
        // Chat methods
        this.getChat = async (id) => {
            const chat = (await db.select().from(schema.chats).where(eq(schema.chats.id, id)))[0];
            return chat;
        };
        this.getChatsForUser = async (userId) => {
            return await db
                .select()
                .from(schema.chats)
                .where(eq(schema.chats.userId, userId));
        };
        this.createChat = async (chat) => {
            const newChat = (await db.insert(schema.chats).values(chat).returning())[0];
            return newChat;
        };
        // Message methods
        this.getMessage = async (id) => {
            const message = (await db.select().from(schema.messages).where(eq(schema.messages.id, id)))[0];
            return message ? { ...message, text: message.content } : undefined;
        };
        this.getMessagesForChat = async (chatId) => {
            const result = await db
                .select()
                .from(schema.messages)
                .where(eq(schema.messages.chatId, chatId));
            const sortedMessages = result.sort((a, b) => {
                const aTime = a.createdAt ? a.createdAt.getTime() : 0;
                const bTime = b.createdAt ? b.createdAt.getTime() : 0;
                return aTime - bTime;
            });
            if (sortedMessages.length === 0) {
                console.log(`チャットID ${chatId} にはメッセージがありません`);
            }
            return sortedMessages.map((msg) => ({ ...msg, text: msg.content }));
        };
        this.createMessage = async (message) => {
            const insertData = {
                chatId: message.chatId,
                content: message.content,
                isAiResponse: message.isAiResponse,
                userId: message.userId,
            };
            const newMessage = (await db.insert(schema.messages).values(insertData).returning())[0];
            return { ...newMessage, text: newMessage.content };
        };
        this.clearChatMessages = async (chatId) => {
            console.log(`チャットメッセージをクリア開始: chatId=${chatId}`);
            const chatMessages = await this.getMessagesForChat(chatId);
            const messageIds = chatMessages.map((message) => message.id);
            console.log(`削除対象メッセージ数: ${messageIds.length}`);
            let deletedMediaCount = 0;
            if (messageIds.length > 0) {
                for (const messageId of messageIds) {
                    try {
                        await db
                            .delete(schema.media)
                            .where(eq(schema.media.messageId, messageId));
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
                    await db
                        .delete(schema.messages)
                        .where(eq(schema.messages.chatId, chatId));
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
                                await db
                                    .delete(schema.messages)
                                    .where(eq(schema.messages.id, msg.id));
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
        };
        // Media methods
        this.getMedia = async (id) => {
            const mediaItem = (await db.select().from(schema.media).where(eq(schema.media.id, id)))[0];
            return mediaItem;
        };
        this.getMediaForMessage = async (messageId) => {
            return await db
                .select()
                .from(schema.media)
                .where(eq(schema.media.messageId, messageId));
        };
        this.createMedia = async (mediaItem) => {
            const newMedia = (await db.insert(schema.media).values(mediaItem).returning())[0];
            return newMedia;
        };
        // Keyword methods
        this.getKeywordsForDocument = async (documentId) => {
            return await db
                .select()
                .from(schema.keywords)
                .where(eq(schema.keywords.documentId, documentId));
        };
        this.createKeyword = async (keyword) => {
            const newKeyword = (await db.insert(schema.keywords).values(keyword).returning())[0];
            return newKeyword;
        };
        this.searchDocumentsByKeyword = async (keyword) => {
            const matchingKeywords = await db
                .select()
                .from(schema.keywords)
                .where(like(schema.keywords.word, `%${keyword}%`));
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
        };
        // チャットエクスポート関連のメソッド
        this.getMessagesForChatAfterTimestamp = async (chatId, timestamp) => {
            const allMessages = await db
                .select()
                .from(schema.messages)
                .where(eq(schema.messages.chatId, chatId));
            return allMessages
                .filter((msg) => msg.createdAt && msg.createdAt > timestamp)
                .map((msg) => ({ ...msg, text: msg.content }))
                .sort((a, b) => {
                const aTime = a.createdAt ? a.createdAt.getTime() : 0;
                const bTime = b.createdAt ? b.createdAt.getTime() : 0;
                return aTime - bTime;
            });
        };
        this.saveChatExport = async (chatId, userId, timestamp) => {
            await db.insert(schema.chatExports).values({
                chatId: chatId,
                userId: userId,
                exportPath: `exports/chat-${chatId}-${timestamp}.json`,
                exportType: 'json',
                timestamp: new Date(timestamp),
            });
        };
        this.getLastChatExport = async (chatId) => {
            const exports = await db
                .select()
                .from(schema.chatExports)
                .where(eq(schema.chatExports.chatId, chatId));
            if (exports.length === 0) {
                return null;
            }
            return exports.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
        };
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
export default DatabaseStorage;
