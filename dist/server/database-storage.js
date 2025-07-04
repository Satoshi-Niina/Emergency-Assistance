import { users, messages, media, chats, documents, keywords, chatExports } from '../shared/schema.js';
import { eq, like } from "drizzle-orm";
import { db } from './db.js';
import session from "express-session";
import memorystore from "memorystore";
// Create a memory store for session that is compatible with express-session
const MemoryStore = memorystore(session);
export class DatabaseStorage {
    constructor() {
        // Initialize session store with memory store
        this.sessionStore = new MemoryStore({
            checkPeriod: 86400000, // prune expired entries every 24h
        });
        // Seed initial users if not present
        this.seedInitialUsers();
    }
    async seedInitialUsers() {
        // Check if admin user exists
        const adminUser = await this.getUserByUsername("niina");
        if (!adminUser) {
            await this.createUser({
                username: "niina",
                password: "0077", // In a real app, this would be hashed
                display_name: "新名 管理者", // Fix: changed displayName to display_name to match schema
                role: "admin"
            });
        }
        // Check if employee user exists
        const employeeUser = await this.getUserByUsername("employee");
        if (!employeeUser) {
            await this.createUser({
                username: "employee",
                password: "employee123", // In a real app, this would be hashed
                display_name: "山田太郎", // Fix: changed displayName to display_name to match schema
                role: "employee"
            });
        }
    }
    // User methods
    async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
    }
    async getUserByUsername(username) {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        return user;
    }
    async getAllUsers() {
        return await db.select().from(users);
    }
    async createUser(insertUser) {
        const [user] = await db.insert(users).values(insertUser).returning();
        return user;
    }
    async updateUser(id, userData) {
        const [user] = await db
            .update(users)
            .set(userData)
            .where(eq(users.id, id))
            .returning();
        return user;
    }
    async deleteUser(id) {
        try {
            // 関連するデータを削除する順序が重要
            // 1. ユーザーに関連するチャットを検索
            const userChats = await db.select().from(chats).where(eq(chats.userId, id));
            // 2. 各チャットとその関連データを削除
            for (const chat of userChats) {
                // 2.1 チャットのエクスポート履歴を削除
                await db.delete(chatExports).where(eq(chatExports.chatId, chat.id));
                // 2.2 チャットのメッセージを検索
                const chatMessages = await db.select().from(messages).where(eq(messages.chatId, chat.id));
                // 2.3 各メッセージのメディアを削除
                for (const message of chatMessages) {
                    await db.delete(media).where(eq(media.messageId, message.id));
                }
                // 2.4 チャットのメッセージを削除
                await db.delete(messages).where(eq(messages.chatId, chat.id));
                // 2.5 チャット自体を削除
                await db.delete(chats).where(eq(chats.id, chat.id));
            }
            // 3. ユーザーが送信者のメッセージを検索
            const userMessages = await db.select().from(messages).where(eq(messages.senderId, id));
            // 4. 各メッセージとそのメディアを削除
            for (const message of userMessages) {
                await db.delete(media).where(eq(media.messageId, message.id));
                await db.delete(messages).where(eq(messages.id, message.id));
            }
            // 5. ユーザーに関連するドキュメントを検索
            const userDocuments = await db.select().from(documents).where(eq(documents.userId, id));
            // 6. 各ドキュメントとそのキーワードを削除
            for (const document of userDocuments) {
                await db.delete(keywords).where(eq(keywords.documentId, document.id));
                await db.delete(documents).where(eq(documents.id, document.id));
            }
            // 7. ユーザーのエクスポート履歴を削除
            await db.delete(chatExports).where(eq(chatExports.userId, id));
            // 8. 最後にユーザーを削除
            await db.delete(users).where(eq(users.id, id));
            console.log(`[INFO] ユーザー(ID: ${id})とその関連データが正常に削除されました`);
        }
        catch (error) {
            console.error(`[ERROR] ユーザー削除中にエラーが発生しました(ID: ${id}):`, error);
            throw error;
        }
    }
    // Chat methods
    async getChat(id) {
        const [chat] = await db.select().from(chats).where(eq(chats.id, id));
        return chat;
    }
    async getChatsForUser(userId) {
        return db.select().from(chats).where(eq(chats.userId, userId));
    }
    async createChat(chat) {
        const [newChat] = await db.insert(chats).values(chat).returning();
        return newChat;
    }
    // Message methods
    async getMessage(id) {
        const [message] = await db.select().from(messages).where(eq(messages.id, id));
        return message ? { ...message, text: message.content } : undefined;
    }
    async getMessagesForChat(chatId) {
        const result = await db.select()
            .from(messages)
            .where(eq(messages.chatId, chatId));
        // resultをtimestampで昇順にソート（undefinedチェックを追加）
        const sortedMessages = result.sort((a, b) => {
            const aTime = a.createdAt ? a.createdAt.getTime() : 0;
            const bTime = b.createdAt ? b.createdAt.getTime() : 0;
            return aTime - bTime;
        });
        // 明示的にメッセージが空の場合はログ出力
        if (sortedMessages.length === 0) {
            console.log(`[INFO] チャットID ${chatId} にはメッセージがありません（クリア済みまたは新規チャット）`);
        }
        // textフィールドを必ずセット
        return sortedMessages.map(msg => ({ ...msg, text: msg.content }));
    }
    async createMessage(message) {
        const insertData = {
            chatId: message.chatId,
            content: message.content,
            isAiResponse: message.isAiResponse
        };
        // senderIdが存在する場合のみ追加
        if (message.senderId) {
            insertData.senderId = message.senderId;
        }
        const [newMessage] = await db.insert(messages).values(insertData).returning();
        return { ...newMessage, text: newMessage.content };
    }
    // チャットメッセージをクリアする関数
    async clearChatMessages(chatId) {
        try {
            console.log(`[INFO] チャット履歴削除開始: chatId=${chatId}`);
            // このチャットに関連するメディアを先に削除する
            const chatMessages = await this.getMessagesForChat(chatId);
            const messageIds = chatMessages.map(message => message.id);
            console.log(`[INFO] 削除対象メッセージ数: ${messageIds.length}`);
            // メディアの削除（存在する場合）
            let deletedMediaCount = 0;
            if (messageIds.length > 0) {
                for (const messageId of messageIds) {
                    try {
                        const result = await db.delete(media).where(eq(media.messageId, messageId));
                        console.log(`[DEBUG] メディア削除: messageId=${messageId}`);
                        deletedMediaCount++;
                    }
                    catch (mediaError) {
                        console.error(`[ERROR] メディア削除エラー (messageId: ${messageId}):`, mediaError);
                    }
                }
            }
            // メッセージの削除（複数回試行）
            let deletedMessageCount = 0;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const result = await db.delete(messages).where(eq(messages.chatId, chatId));
                    console.log(`[INFO] メッセージ削除試行 ${attempt + 1}: 完了`);
                    // 削除確認
                    const remainingMessages = await this.getMessagesForChat(chatId);
                    if (remainingMessages.length === 0) {
                        console.log(`[SUCCESS] 全メッセージ削除完了: chatId=${chatId}`);
                        break;
                    }
                    else {
                        console.warn(`[WARNING] 試行 ${attempt + 1} 後も ${remainingMessages.length} 件のメッセージが残存`);
                        if (attempt === 2) {
                            for (const msg of remainingMessages) {
                                try {
                                    await db.delete(messages).where(eq(messages.id, msg.id));
                                    deletedMessageCount++;
                                }
                                catch (individualError) {
                                    console.error(`[ERROR] 個別削除エラー (id: ${msg.id}):`, individualError);
                                }
                            }
                        }
                    }
                }
                catch (deleteError) {
                    console.error(`[ERROR] メッセージ削除試行 ${attempt + 1} エラー:`, deleteError);
                    if (attempt === 2)
                        throw deleteError;
                }
            }
            console.log(`[SUCCESS] チャット履歴削除完了: chatId=${chatId}, 削除メディア=${deletedMediaCount}, 削除メッセージ=${deletedMessageCount}`);
        }
        catch (error) {
            console.error(`[ERROR] チャット履歴削除失敗: chatId=${chatId}:`, error);
            throw error;
        }
    }
    // Media methods
    async getMedia(id) {
        const [mediaItem] = await db.select().from(media).where(eq(media.id, id));
        return mediaItem;
    }
    async getMediaForMessage(messageId) {
        return db.select().from(media).where(eq(media.messageId, messageId));
    }
    async createMedia(mediaItem) {
        const [newMedia] = await db.insert(media).values(mediaItem).returning();
        return newMedia;
    }
    // Keyword methods
    async getKeywordsForDocument(documentId) {
        return db.select().from(keywords).where(eq(keywords.documentId, documentId));
    }
    async createKeyword(keyword) {
        const [newKeyword] = await db.insert(keywords).values(keyword).returning();
        return newKeyword;
    }
    async searchDocumentsByKeyword(keyword) {
        // Find matching keywords
        const matchingKeywords = await db
            .select()
            .from(keywords)
            .where(like(keywords.word, `%${keyword}%`));
        if (matchingKeywords.length === 0) {
            return [];
        }
        // Get unique document IDs
        const documentIds = Array.from(new Set(matchingKeywords.map(k => k.documentId)));
        // Fetch documents by IDs
        const matchingDocuments = [];
        for (const docId of documentIds) {
            if (docId === null)
                continue;
            // const doc = await this.getDocument(docId);
            if (docId) {
                matchingDocuments.push({ id: docId, userId: '', title: '', createdAt: new Date(), content: '' });
            }
        }
        return matchingDocuments;
    }
    // チャットエクスポート関連のメソッド
    async getMessagesForChatAfterTimestamp(chatId, timestamp) {
        // 基準日時より後のメッセージを取得
        const allMessages = await db.select()
            .from(messages)
            .where(eq(messages.chatId, chatId));
        // JSでフィルタリング（undefinedチェックを追加）
        return allMessages
            .filter(msg => msg.createdAt && msg.createdAt > timestamp)
            .map(msg => ({ ...msg, text: msg.content }))
            .sort((a, b) => {
            const aTime = a.createdAt ? a.createdAt.getTime() : 0;
            const bTime = b.createdAt ? b.createdAt.getTime() : 0;
            return aTime - bTime;
        });
    }
    async saveChatExport(chatId, userId, timestamp) {
        await db.insert(chatExports).values({
            chatId,
            userId,
            timestamp
        });
    }
    async getLastChatExport(chatId) {
        const exports = await db.select()
            .from(chatExports)
            .where(eq(chatExports.chatId, chatId));
        if (exports.length === 0) {
            return null;
        }
        // タイムスタンプの降順でソートし、最初の要素を返す
        return exports.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    }
}
