import { 
  users, type User, type InsertUser,
  messages, type Message, type InsertMessage,
  media, type Media, type InsertMedia,
  chats, type Chat, type InsertChat,
  documents, type Document, type InsertDocument,
  keywords, type Keyword, type InsertKeyword,
  chatExports, type ChatExport, type InsertChatExport
} from "@shared/schema";
import session from "express-session";
import { DatabaseStorage } from "./database-storage";
import { db } from './db';
import { eq, and, gt } from 'drizzle-orm';

// データベース接続テスト
const testDatabaseConnection = async () => {
  try {
    await db.select().from(users).limit(1);
    console.log('データベース接続OK');
    return true;
  } catch (error) {
    console.error('データベース接続エラー:', error);
    return false;
  }
};

export const storage = {
  testConnection: testDatabaseConnection,
  // Session store
  sessionStore: new DatabaseStorage().sessionStore,

  // User methods
  getUser: async (id: string): Promise<User | undefined> => {
    return new DatabaseStorage().getUser(id);
  },
  getUserByUsername: async (username: string): Promise<User | undefined> => {
    return new DatabaseStorage().getUserByUsername(username);
  },
  createUser: async (user: InsertUser): Promise<User> => {
    return new DatabaseStorage().createUser(user);
  },
  updateUser: async (id: string, user: Partial<User>): Promise<User> => {
    return new DatabaseStorage().updateUser(id, user);
  },
  deleteUser: async (id: string): Promise<void> => {
    return new DatabaseStorage().deleteUser(id);
  },

  // Chat methods
  getChat: async (id: string): Promise<Chat | undefined> => {
    const [chat] = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
    return chat;
  },
  getChatsForUser: async (userId: string): Promise<Chat[]> => {
    return new DatabaseStorage().getChatsForUser(userId);
  },
  createChat: async (chat: InsertChat): Promise<Chat> => {
    // UUIDが指定されていない場合は生成
    if (!chat.id) {
      const { v4: uuidv4 } = await import('uuid');
      chat.id = uuidv4();
    }

    const [newChat] = await db.insert(chats).values(chat).returning();
    return newChat;
  },

  // Message methods
  getMessage: async (id: string): Promise<Message | undefined> => {
    return new DatabaseStorage().getMessage(id);
  },
  getMessagesForChat: async (chatId: string): Promise<Message[]> => {
    return db.select().from(messages).where(eq(messages.chatId, chatId));
  },
  getMessagesForChatAfterTimestamp: async (chatId: string, timestamp: Date): Promise<Message[]> => {
    return db.select().from(messages).where(
      and(eq(messages.chatId, chatId), gt(messages.createdAt, timestamp))
    );
  },
  async saveMessage(message: {
    chatId: string;
    senderId: string;
    content: string;
    isAiResponse?: boolean;
    media?: Array<{
      type: string;
      url: string;
      description?: string;
    }>;
  }) {
    // トランザクション内で実行して原子性を保証
    return await db.transaction(async (tx) => {
      try {
        console.log('メッセージ保存開始:', { chatId: message.chatId, senderId: message.senderId, hasContent: !!message.content });

        // 必須フィールドの厳密な検証
        if (!message.chatId || typeof message.chatId !== 'string' || message.chatId.trim().length === 0) {
          throw new Error('chatIdが無効です');
        }
        if (!message.senderId || typeof message.senderId !== 'string' || message.senderId.trim().length === 0) {
          throw new Error('senderIdが無効です');
        }
        if (!message.content || typeof message.content !== 'string' || message.content.trim().length === 0) {
          throw new Error('contentが無効です');
        }

        // chatIdとsenderIdの存在確認
        const chatExists = await tx.select().from(chats).where(eq(chats.id, message.chatId)).limit(1);
        if (!chatExists || chatExists.length === 0) {
          throw new Error(`チャットID ${message.chatId} が存在しません`);
        }

        const userExists = await tx.select().from(users).where(eq(users.id, message.senderId)).limit(1);
        if (!userExists || userExists.length === 0) {
          throw new Error(`ユーザーID ${message.senderId} が存在しません`);
        }

        // UUIDを生成
        const messageId = generateId();

        // メッセージデータの完全性を保証
        const messageData = {
          id: messageId,
          chatId: message.chatId.trim(),
          senderId: message.senderId.trim(),
          content: message.content.trim(),
          isAiResponse: Boolean(message.isAiResponse), // 明示的にboolean化
          createdAt: new Date()
        };

        console.log('保存するメッセージデータ:', messageData);

        // メッセージを保存
        const savedMessage = await tx.insert(messages).values(messageData).returning();

        if (!savedMessage || savedMessage.length === 0) {
          throw new Error('メッセージの保存に失敗しました');
        }

        console.log('メッセージ保存成功:', savedMessage[0].id);

        // メディアがある場合の処理
        if (message.media && Array.isArray(message.media) && message.media.length > 0) {
          console.log(`${message.media.length}件のメディアを保存中...`);
          
          const mediaDataList = [];
          for (const mediaItem of message.media) {
            // メディアアイテムの検証
            if (!mediaItem.type || !mediaItem.url || typeof mediaItem.type !== 'string' || typeof mediaItem.url !== 'string') {
              console.warn('無効なメディアアイテムをスキップ:', mediaItem);
              continue;
            }

            mediaDataList.push({
              id: generateId(),
              messageId: savedMessage[0].id,
              type: mediaItem.type.trim(),
              url: mediaItem.url.trim(),
              description: mediaItem.description?.trim() || null,
              createdAt: new Date()
            });
          }

          // 全メディアを一括保存
          if (mediaDataList.length > 0) {
            await tx.insert(media).values(mediaDataList);
            console.log(`メディア一括保存成功: ${mediaDataList.length}件`);
          }
        }

        // 保存されたメッセージを再取得して整合性を確認
        const verifyMessage = await tx.select().from(messages).where(eq(messages.id, savedMessage[0].id)).limit(1);
        if (!verifyMessage || verifyMessage.length === 0) {
          throw new Error('保存されたメッセージの検証に失敗しました');
        }

        return verifyMessage[0];
      } catch (error) {
        console.error('メッセージ保存エラー:', error);
        // トランザクションが自動的にロールバックされる
        throw error;
      }
    });
  },
  clearChatMessages: async (chatId: string): Promise<void> => {
    // UUIDのためstring型で処理
    const result = await db.select().from(messages).where(eq(messages.chatId, chatId));
    const messageIds = result.map(message => message.id);

    // メディアの削除
    if (messageIds.length > 0) {
      for (const messageId of messageIds) {
        await db.delete(media).where(eq(media.messageId, messageId));
      }
    }

    // メッセージの削除
    await db.delete(messages).where(eq(messages.chatId, chatId));
    console.log(`[INFO] Cleared all messages for chat ID: ${chatId}`);
  },

  // Media methods
  getMedia: async (id: string): Promise<Media | undefined> => {
    return new DatabaseStorage().getMedia(id);
  },
  getMediaForMessage: async (messageId: string): Promise<Media[]> => {
    return new DatabaseStorage().getMediaForMessage(messageId);
  },
  createMedia: async (media: InsertMedia): Promise<Media> => {
    return new DatabaseStorage().createMedia(media);
  },

  // Document methods
  getDocument: async (id: string): Promise<Document | undefined> => {
    return new DatabaseStorage().getDocument(id);
  },
  getDocumentsForUser: async (userId: string): Promise<Document[]> => {
    return new DatabaseStorage().getDocumentsForUser(userId);
  },
  createDocument: async (document: InsertDocument): Promise<Document> => {
    return new DatabaseStorage().createDocument(document);
  },
  updateDocument: async (id: string, updates: Partial<Document>): Promise<Document | undefined> => {
    return new DatabaseStorage().updateDocument(id, updates);
  },

  // Keyword methods
  getKeywordsForDocument: async (documentId: string): Promise<Keyword[]> => {
    return new DatabaseStorage().getKeywordsForDocument(documentId);
  },
  createKeyword: async (keyword: InsertKeyword): Promise<Keyword> => {
    return new DatabaseStorage().createKeyword(keyword);
  },
  searchDocumentsByKeyword: async (keyword: string): Promise<Document[]> => {
    return new DatabaseStorage().searchDocumentsByKeyword(keyword);
  },

  // Chat history methods (using existing chats/messages schema)
  getChatHistory: async (chatId: string): Promise<any[]> => {
    try {
      const chatMessages = await db.select()
        .from(messages)
        .where(eq(messages.chatId, chatId))
        .orderBy(messages.createdAt);

      return chatMessages;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }
  },

  getChatById: async (chatId: string): Promise<any | null> => {
    try {
      const chat = await db.select()
        .from(chats)
        .where(eq(chats.id, chatId))
        .limit(1);

      return chat.length > 0 ? chat[0] : null;
    } catch (error) {
      console.error('Error fetching chat by ID:', error);
      return null;
    }
  },

  // Chat export methods
  saveChatExport: async (chatId: string, userId: string, timestamp: Date): Promise<void> => {
    await db.insert(chatExports).values({
      chatId,
      userId,
      timestamp
    });
  },
  getLastChatExport: async (chatId: string): Promise<ChatExport | null> => {
    const exports = await db.select()
      .from(chatExports)
      .where(eq(chatExports.chatId, chatId));

    if (exports.length === 0) {
      return null;
    }

    // タイムスタンプの降順でソートし、最初の要素を返す
    return exports.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }
};

// Assuming this is the correct place to put the saveMessage function based on the context.
import { v4 as uuidv4 } from 'uuid';
import { media as messageMedia } from '@shared/schema';

const generateId = () => uuidv4();

export async function saveMessage(chatId: string, content: string, isAiResponse: boolean, senderId?: string, media?: { type: string; url: string; thumbnail?: string }[]): Promise<InsertMessage> {
  try {
    console.log(`メッセージ保存開始: chatId=${chatId}, isAiResponse=${isAiResponse}`);

    const now = new Date();
    const messageData: InsertMessage = {
      id: generateId(),
      chatId,
      content,
      isAiResponse,
      senderId: senderId || null,
      // createdAtを明示的に設定し、確実に有効な値にする
      createdAt: now
    };

    console.log('保存するメッセージデータ（createdAt確認）:', {
      ...messageData,
      createdAt: messageData.createdAt?.toISOString()
    });

    const [savedMessage] = await db.insert(messages).values(messageData).returning();

    // 保存されたメッセージのcreatedAtを確認
    console.log('メッセージ保存完了（createdAt確認）:', {
      ...savedMessage,
      createdAt: savedMessage.createdAt?.toISOString()
    });

    // メディアがある場合は保存
    if (media && media.length > 0) {
      console.log(`${media.length}件のメディアを保存中...`);
      for (const mediaItem of media) {
        await db.insert(messageMedia).values({
          id: generateId(),
          messageId: savedMessage.id,
          type: mediaItem.type,
          url: mediaItem.url,
          thumbnail: mediaItem.thumbnail
        });
      }
    }

    return savedMessage;
  } catch (error) {
    console.error('メッセージ保存エラー:', error);
    throw error;
  }
}
// The code has been modified to ensure that the createdAt field is always set when saving messages, addressing the reported issue of missing createdAt values.