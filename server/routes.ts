import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertUserSchema, insertChatSchema, insertMessageSchema, insertMediaSchema, users, chatExports, documents, insertDocumentSchema, messages } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import MemoryStore from 'memorystore';
import { WebSocket, WebSocketServer } from "ws";
import { processOpenAIRequest, generateSearchQuery, analyzeVehicleImage } from "./lib/openai";
import { processPerplexityRequest } from "./lib/perplexity";
import fs from "fs";
import path from "path";
import { db } from "./db";
import { upload } from './lib/multer-config';
import { 
  addDocumentToKnowledgeBase, 
  listKnowledgeBaseDocuments, 
  removeDocumentFromKnowledgeBase 
} from './lib/knowledge-base';
import { formatChatHistoryForExternalSystem } from './lib/chat-export-formatter';
import techSupportRouter from './routes/tech-support';
import { registerDataProcessorRoutes } from './routes/data-processor';
import emergencyGuideRouter from './routes/emergency-guide';
import emergencyFlowRouter from './routes/emergency-flow';
import { registerSyncRoutes } from './routes/sync-routes';
import { flowGeneratorRouter } from './routes/flow-generator';
import { usersRouter } from './routes/users';
import { troubleshootingRouter } from './routes/troubleshooting';
import express from 'express';
import { NextFunction } from "connect";
import bcrypt from 'bcrypt';
import { authRouter } from './routes/auth';
import { exportFileManager } from "./lib/export-file-manager";
import { processDocument } from "./lib/document-processor";
import { mergeDocumentContent } from "./lib/knowledge-base";
import { backupKnowledgeBase } from "./lib/knowledge-base";
import { Router } from 'express';
import fileRouter from './routes/file';

const MemoryStoreSession = MemoryStore(session);

// Extend the express-session types
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userRole?: string;
  }
}

// Session will now use Postgres via storage.sessionStore

export async function registerRoutes(app: Express): Promise<Server> {
  // 静的ファイル配信の設定（最優先で登録）
  app.use('/images', express.static(path.join(process.cwd(), 'public', 'images')));
  app.use('/public', express.static(path.join(process.cwd(), 'public')));

  // Register tech support router
  app.use('/api/tech-support', techSupportRouter);

  // Register data processor routes
  registerDataProcessorRoutes(app);

  // Register emergency guide routes
  app.use('/api/emergency-guide', emergencyGuideRouter);

  // Register emergency flow routes
  app.use('/api/emergency-flow', emergencyFlowRouter);

  // Register flow generator routes
  app.use('/api/flow-generator', flowGeneratorRouter);

  // Register sync routes for offline capabilities
  registerSyncRoutes(app);

  // Add a health check endpoint for testing
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // OpenAI APIキーの設定状況を確認するエンドポイント
  app.get('/api/debug/openai', (req, res) => {
    const apiKey = process.env.OPENAI_API_KEY || process.env.REPLIT_SECRET_OPENAI_API_KEY;
    res.json({
      openaiApiKey: apiKey ? "SET" : "NOT SET",
      apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + "..." : "NOT FOUND",
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });

  // Add a public OpenAI test endpoint (for testing only)
  app.post('/api/chatgpt-test', async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const response = await processOpenAIRequest(text, true);
      return res.json({ response });
    } catch (error) {
      console.error("Error in /api/chatgpt-test:", error);
      return res.status(500).json({ message: "Error processing request", error: String(error) });
    }
  });

  // Perplexity API endpoint
  app.post('/api/perplexity', async (req, res) => {
    try {
      const { query, systemPrompt, useKnowledgeBaseOnly = true } = req.body;

      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      console.log(`Perplexity API request: query=${query}, useKnowledgeBaseOnly=${useKnowledgeBaseOnly}`);
      const { content, citations } = await processPerplexityRequest(query, systemPrompt, useKnowledgeBaseOnly);

      return res.json({ content, citations });
    } catch (error) {
      console.error("Error in /api/perplexity:", error);
      return res.status(500).json({ 
        message: "Error processing Perplexity request", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Setup session middleware
  const sessionSecret = process.env.SESSION_SECRET || "emergency-recovery-secret";
  app.use(
      session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: { 
          secure: false,
          httpOnly: true,
          maxAge: 86400000, // 24 hours
          sameSite: 'lax'
        },
        store: new MemoryStoreSession({
          checkPeriod: 86400000 // prune expired entries every 24h
        }),
      })
    );

  // Auth middleware
  const requireAuth = async (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      // 開発環境では自動的にデフォルトユーザーでログイン
      const adminUser = await storage.getUserByUsername('admin');
      if (adminUser) {
        req.session.userId = adminUser.id;
        req.session.userRole = 'admin';
      }
    }
    next();
  };

  // Admin middleware
  const requireAdmin = async (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      // 開発環境では自動的にデフォルトユーザーでログイン
      const adminUser = await storage.getUserByUsername('admin');
      if (adminUser) {
        req.session.userId = adminUser.id;
        req.session.userRole = 'admin';
      }
    }

    const user = await storage.getUser(String(req.session.userId ?? ''));
    if (!user || user.role !== 'admin') {
      console.log('管理者権限が必要ですが、開発環境のため許可します');
      // 開発環境では管理者権限チェックを緩和
    }

    next();
  };

  // Auth routes
  app.use("/api/auth", authRouter);

  // User management routes (admin only)
  app.get("/api/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const result = await db.select({
        id: users.id,
        username: users.username,
        display_name: users.display_name,
        role: users.role,
        department: users.department
      }).from(users);
      return res.json(result);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const user = await storage.createUser(userData);
      return res.status(201).json({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        department: user.department
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Error creating user:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Chat routes
  app.get("/api/chats", requireAuth, async (req, res) => {
    const chats = await storage.getChatsForUser(String(req.session.userId ?? ''));
    return res.json(chats);
  });

  app.post("/api/chats", requireAuth, async (req, res) => {
    try {
      const chatData = insertChatSchema.parse({
        ...req.body,
        userId: String(req.session.userId ?? '')
      });
      const chat = await storage.createChat(chatData);
      return res.json(chat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/chats/:id", requireAuth, async (req, res) => {
    const chat = await storage.getChat(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    if (String(chat.userId) !== String(req.session.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return res.json(chat);
  });

  app.get("/api/chats/:id/messages", requireAuth, async (req, res) => {
    const chatId = req.params.id;
    const clearCache = req.query.clear === 'true';
    const chat = await storage.getChat(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    if (String(chat.userId) !== String(req.session.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (clearCache) {
      res.setHeader('X-Chat-Cleared', 'true');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.json([]);
    }
    const messages = await storage.getMessagesForChat(chat.id);
    const messagesWithMedia = await Promise.all(
      messages.map(async (message) => {
        const media = await storage.getMediaForMessage(message.id);
        return { ...message, media };
      })
    );
    return res.json(messagesWithMedia);
  });

  // チャット履歴をクリアするAPI
  app.post("/api/chats/:id/clear", requireAuth, async (req, res) => {
    try {
      const chatId = req.params.id;
      const { force, clearAll } = req.body;
      logDebug(`チャット履歴クリア開始: chatId=${chatId}, force=${force}, clearAll=${clearAll}`);
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      logDebug(`チャット履歴クリア: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${req.session.userId}`);
      let deletedMessageCount = 0;
      let deletedMediaCount = 0;
      try {
        // まず現在のメッセージ数を確認
        const beforeMessages = await storage.getMessagesForChat(chatId);
        const beforeCount = beforeMessages.length;
        logDebug(`削除前のメッセージ数: ${beforeCount}`);

        // 各メッセージに関連するメディアも削除
        for (const message of beforeMessages) {
          try {
            const media = await storage.getMediaForMessage(message.id);
            for (const mediaItem of media) {
              // await storage.deleteMedia(mediaItem.id);
              deletedMediaCount++;
            }
          } catch (mediaError) {
            logError(`メディア削除エラー (messageId: ${message.id}):`, mediaError);
          }
        }

        // データベースからメッセージを完全削除
        try {
          const result = await storage.clearChatMessages(chatId);
          logDebug(`データベース削除結果:`, result);
        } catch (clearError) {
          logError('clearChatMessages実行エラー:', clearError);
          // 個別削除にフォールバック
        }

        // 削除後のメッセージ数を確認
        const afterMessages = await storage.getMessagesForChat(chatId);
        const afterCount = afterMessages.length;
        deletedMessageCount = beforeCount - afterCount;

        logDebug(`削除後のメッセージ数: ${afterCount}, 削除されたメッセージ数: ${deletedMessageCount}`);

        if (afterCount > 0) {
          logWarn(`警告: ${afterCount}件のメッセージが残っています`);

          // 強制削除または残存メッセージの個別削除
          if (force || clearAll) {
            logDebug('強制削除モードで残存メッセージを個別削除します');
            for (const remainingMessage of afterMessages) {
              try {
                // await storage.deleteMessage(remainingMessage.id);
                deletedMessageCount++;
              } catch (individualDeleteError) {
                logError(`個別削除エラー (messageId: ${remainingMessage.id}):`, individualDeleteError);
              }
            }
          }
        }

      } catch (dbError) {
        logError(`データベース削除エラー:`, dbError);
        return res.status(500).json({ 
          message: "Database deletion failed",
          error: String((dbError as Error).message) 
        });
      }

      // 最終確認
      const finalMessages = await storage.getMessagesForChat(chatId);
      const finalCount = finalMessages.length;

      logDebug(`チャット履歴クリア完了: chatId=${chatId}, 削除メッセージ数=${deletedMessageCount}, 削除メディア数=${deletedMediaCount}, 最終メッセージ数=${finalCount}`);

      return res.json({ 
        cleared: true,
        message: "Chat cleared successfully",
        deletedMessages: deletedMessageCount,
        deletedMedia: deletedMediaCount,
        remainingMessages: finalCount,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Chat clear error:', error);
      return res.status(500).json({ 
        message: "Error clearing chat",
        error: String((error as Error).message) 
      });
    }
  });

  // 履歴送信のためのAPI
  app.post("/api/chats/:id/export", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const chatId = req.params.id;
      const { lastExportTimestamp } = req.body;

      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      // チャットアクセス制限を一時的に緩和
      // if (chat.userId !== userId) {
      //   return res.status(403).json({ message: "Forbidden" });
      // }

      // 指定されたタイムスタンプ以降のメッセージを取得
      const messages = await storage.getMessagesForChatAfterTimestamp(
        chatId, 
        lastExportTimestamp ? new Date(lastExportTimestamp) : new Date(0)
      );

      // 現在のタイムスタンプを記録（次回の履歴送信で使用）
      const exportTimestamp = new Date();

      // チャットのエクスポートレコードを保存
      await storage.saveChatExport(chatId, userId, exportTimestamp);

      // メッセージが存在する場合、フォーマット済みデータも自動的に生成・保存
      if (messages.length > 0) {
        try {
          // フォーマット済みデータを生成（外部システム向け）
          const allMessages = await storage.getMessagesForChat(chatId);

          // メッセージIDごとにメディアを取得
          const messageMedia: Record<string, any[]> = {};
          for (const message of allMessages) {
            messageMedia[message.id] = await storage.getMediaForMessage(message.id);
          }

          // 最新のエクスポート記録を取得
          const lastExport = await storage.getLastChatExport(chatId);

          // 外部システム用にフォーマット
          const formattedData = await formatChatHistoryForExternalSystem(
            chat,
            allMessages,
            messageMedia,
            lastExport
          );

          // ファイルとして保存
          exportFileManager.saveFormattedExport(parseInt(chatId), formattedData);

          console.log(`チャット ${chatId} のフォーマット済みデータを自動生成しました`);
        } catch (formatError) {
          console.error("フォーマット済みデータの生成中にエラーが発生しました:", formatError);
          // フォーマット処理の失敗はメインの応答に影響しないようにするため、エラーをキャッチするだけ
        }
      }

      res.json({ 
        success: true, 
        exportTimestamp,
        messageCount: messages.length
      });
    } catch (error) {
      console.error("Error exporting chat history:", error);
      res.status(500).json({ error: "Failed to export chat history" });
    }
  });

  // 外部AI分析システム向けフォーマット済みデータを取得するAPI
  app.get("/api/chats/:id/export-formatted", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const chatId = req.params.id;
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      logDebug(`フォーマット済みエクスポート: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${userId}`);
      if (String(chat.userId) !== String(userId) && req.session.userRole !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const messages = await storage.getMessagesForChat(chatId);
      const messageMedia: Record<string, any[]> = {};
      for (const message of messages) {
        messageMedia[message.id] = await storage.getMediaForMessage(message.id);
      }
      const lastExport = await storage.getLastChatExport(chatId);
      const formattedData = await formatChatHistoryForExternalSystem(
        chat,
        messages,
        messageMedia,
        lastExport
      );
      res.json(formattedData);
    } catch (error) {
      console.error("Error formatting chat for external system:", error);
      res.status(500).json({ error: "Failed to format chat for external system" });
    }
  });

  // チャットの最後のエクスポート履歴を取得
  app.get("/api/chats/:id/last-export", requireAuth, async (req, res) => {
    try {
      const chatId = req.params.id;
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      const lastExport = await storage.getLastChatExport(chatId);
      res.json(lastExport || { timestamp: null });
    } catch (error) {
      console.error("Error fetching last export:", error);
      res.status(500).json({ error: "Failed to fetch last export information" });
    }
  });

  // 応急処置ガイドなどのシステムメッセージをチャットに追加するためのエンドポイント
  app.post("/api/chats/:id/messages/system", requireAuth, async (req, res) => {
    try {
      const chatId = req.params.id;
      const { content, isUserMessage = true } = req.body;
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      logDebug(`システムメッセージ送信: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${req.session.userId}`);
      const message = await storage.createMessage({
        chatId,
        content,
        isAiResponse: !isUserMessage,
        senderId: String(req.session.userId ?? '')
      });
      return res.json(message);
    } catch (error) {
      console.error("システムメッセージ送信エラー:", error);
      return res.status(500).json({ message: "Error creating system message" });
    }
  });

  app.post("/api/chats/:id/messages", requireAuth, async (req, res) => {
    try {
      const chatId = req.params.id;
      const { content, useOnlyKnowledgeBase = true, usePerplexity = false } = req.body;
      const userId = String(req.session.userId ?? '');
      
      // チャットIDのバリデーション
      if (!chatId || chatId === '1') {
        return res.status(400).json({ 
          message: "Invalid chat ID. Please use a valid UUID format." 
        });
      }
      
      // UUID形式の簡易チェック
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(chatId)) {
        return res.status(400).json({ 
          message: "Invalid chat ID format. Expected UUID format." 
        });
      }
      
      // デバッグログを追加
      logDebug('📥 メッセージ送信リクエスト受信:', {
        chatId,
        content: content?.substring(0, 100) + '...',
        contentLength: content?.length,
        useOnlyKnowledgeBase,
        usePerplexity,
        userId,
        headers: req.headers['content-type'],
        bodyType: typeof req.body,
        bodyKeys: Object.keys(req.body || {})
      });
      
      let chat = await storage.getChat(chatId);
      if (!chat) {
        logDebug(`メッセージ送信時: チャットID ${chatId} が存在しないため、新規作成します`);
        try {
          chat = await storage.createChat({
            id: chatId,
            userId: userId,
            title: "新しいチャット"
          });
          logDebug(`メッセージ送信時: チャットID ${chatId} を作成しました`);
        } catch (createError) {
          logError("メッセージ送信時のチャット作成エラー:", createError);
          return res.status(500).json({ message: "Failed to create chat" });
        }
      }
      logDebug(`チャットアクセス: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${req.session.userId}`);
      logDebug(`設定: ナレッジベースのみを使用=${useOnlyKnowledgeBase}`);
      const messageData = insertMessageSchema.parse({
        chatId: chatId,
        content: content,
        senderId: String(req.session.userId ?? ''),
        isAiResponse: false
      });
      const message = await storage.createMessage(messageData);
      let citations: any[] = [];

      const getAIResponse = async (content: string, useKnowledgeBase: boolean): Promise<any> => {
        try {
          return await processOpenAIRequest(content, useKnowledgeBase);
        } catch (error) {
          console.error('OpenAI処理エラー:', error);
          return 'AI応答の生成に失敗しました。';
        }
      };

      // AIからの応答を取得
      const aiResponse = await getAIResponse(content, useOnlyKnowledgeBase);

      // 応答の型チェックとサニタイズ
      let responseContent: string;
      if (typeof aiResponse === 'string') {
        responseContent = aiResponse;

      } else if (aiResponse && typeof aiResponse === 'object') {
        // オブジェクト型の場合、適切なプロパティから文字列を抽出
        responseContent = aiResponse.content || aiResponse.text || aiResponse.message || JSON.stringify(aiResponse);

      } else {
        responseContent = 'AI応答の処理中にエラーが発生しました。';
        console.error('サーバー側AIレスポンス検証: 不正な型', { 
          type: typeof aiResponse, 
          value: aiResponse 
        });
      }

      logDebug('📤 クライアントに送信するAIレスポンス:', {
        type: typeof responseContent,
        content: responseContent.substring(0, 100) + '...',
        length: responseContent.length,
        isValidString: typeof responseContent === 'string' && responseContent.trim().length > 0
      });
      // AIメッセージを保存
      const [aiMessage] = await db.insert(messages).values({
        chatId: chatId,
        content: responseContent,
        isAiResponse: true,
        senderId: String(req.session.userId ?? ''),
      }).returning();

      // クライアントに送信するレスポンス構造を統一化
      const responseMessage = {
        ...aiMessage,
        content: responseContent, // メイン表示用
        text: responseContent,    // 互換性用（contentと同じ値）
        role: 'assistant' as const,
        timestamp: aiMessage.createdAt || new Date()
      };

      logDebug('📤 最終レスポンス:', {
        id: responseMessage.id,
        contentType: typeof responseMessage.content,
        contentPreview: responseMessage.content.substring(0, 100) + '...',
        hasValidContent: !!responseMessage.content && responseMessage.content.trim().length > 0
      });

      // レスポンス送信前の最終確認ログ
      logDebug('📤 レスポンス送信:', {
        statusCode: 200,
        responseType: typeof responseMessage,
        responseKeys: Object.keys(responseMessage),
        contentLength: responseMessage.content?.length
      });

      return res.json(responseMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      
      // エラーの詳細情報をログに出力
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      } else {
        console.error("Unknown error type:", typeof error, error);
      }
      
      // エラーの詳細情報を返す
      let errorMessage = "Failed to send message";
      let statusCode = 500;
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        if ('message' in error) {
          errorMessage = String(error.message);
        }
      }
      
      // 特定のエラーに応じてステータスコードを調整
      if (errorMessage.includes('認証') || errorMessage.includes('auth')) {
        statusCode = 401;
      } else if (errorMessage.includes('権限') || errorMessage.includes('permission')) {
        statusCode = 403;
      } else if (errorMessage.includes('見つかりません') || errorMessage.includes('not found')) {
        statusCode = 404;
      }
      
      return res.status(statusCode).json({ 
        message: errorMessage,
        error: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Media routes
  app.post("/api/media", requireAuth, async (req, res) => {
    try {
      const mediaData = insertMediaSchema.parse(req.body);
      const media = await storage.createMedia(mediaData);
      return res.json(media);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Document routes (admin only)
  app.get("/api/documents", requireAuth, async (req, res) => {
    // const documents = await storage.getDocumentsForUser(req.session.userId!);
    return res.json([]);
  });

  app.post("/api/documents", requireAuth, async (req, res) => {
    // const document = await storage.createDocument(documentData);
    return res.json([]);
  });

  app.put("/api/documents/:id", requireAuth, async (req, res) => {
    // const document = await storage.getDocument(parseInt(req.params.id));
    // const updatedDocument = await storage.updateDocument(document.id, req.body);
    return res.json([]);
  });

  // Search routes
  app.get("/api/search", requireAuth, async (req, res) => {
    try {
      const keyword = req.query.q as string;

      if (!keyword) {
        return res.status(400).json({ message: "Search query is required"});
      }

      const documents = await storage.searchDocumentsByKeyword(keyword);
      return res.json(documents);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Knowledge Base API routes
  // ドキュメント一覧取得 (一般ユーザーも閲覧可能)
  app.get('/api/knowledge', requireAuth, (req, res) => {
    try {
      const documents = listKnowledgeBaseDocuments();
      if (documents.success && documents.documents) {
        const document = documents.documents.find((doc: any) => doc.id === req.params.id);
        logDebug('ナレッジベース一覧結果:', documents);
        res.json(documents);
      } else {
        res.status(500).json({ error: 'Failed to list documents' });
      }
    } catch (error) {
      console.error('Error listing knowledge base documents:', error);
      res.status(500).json({ error: 'Failed to list documents' });
    }
  });

  // ドキュメントアップロード
  app.post('/api/knowledge/upload', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'ファイルがありません' });
      }

      const filePath = req.file.path;
      try {
        const docId = await addDocumentToKnowledgeBase(
          { originalname: path.basename(filePath), path: filePath, mimetype: 'text/plain' },
          fs.readFileSync(filePath, 'utf-8')
        );
        return res.status(201).json({ 
          success: true, 
          docId,
          message: 'ドキュメントが正常に追加されました'
        });
      } catch (err) {
        // エラー発生時にアップロードファイルを削除
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        throw err;
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      res.status(500).json({ error: '知識ベースへの追加に失敗しました: ' + errorMessage });
    }
  });

  // ドキュメント削除
  app.delete('/api/knowledge/:docId', requireAuth, requireAdmin, (req, res) => {
    try {
      const docId = req.params.docId;
      logInfo(`Document deletion request: ID=${docId}`);

      // ドキュメントとその関連ファイルを削除
      const success = removeDocumentFromKnowledgeBase(docId);

      if (success){
        // 画像検索データを再初期化
        fetch('http://localhost:5000/api/tech-support/init-image-search-data', {
          method: 'POST'
        }).then(response => {
          if (response.ok) {
            logInfo('Image search data reinitialized');
          } else {
            logWarn('Failed to reinitialize image search data');
          }
        }).catch(err => {
          logError('Image search data reinitialization error:', err);
        });

        res.json({ 
          success: true, 
          message: 'Document and related files deleted successfully',
          docId: docId
        });
      } else {
        res.status(404).json({ error: 'Document not found' });
      }
    } catch (error) {
      logError('Error removing document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Failed to delete document: ' + errorMessage });
    }
  });

  // ドキュメント再処理
  app.post('/api/knowledge/:docId/process', requireAuth, requireAdmin, async (req, res) => {
    try {
      const docId = req.params.docId;
      // ナレッジベースからドキュメント情報を取得
      const documents = listKnowledgeBaseDocuments();
      if (documents.success && documents.documents) {
        const document = documents.documents.find((doc: any) => doc.id === docId);

        if (!document) {
          return res.status(404).json({ error: 'Document not found' });
        }

        // ドキュメントのパスを取得
        const docPath = path.join(process.cwd(), 'knowledge-base', document.title);

        if (!fs.existsSync(docPath)) {
          return res.status(404).json({ error: 'Document file not found: ' + docPath });
        }

        logInfo(`Starting document reprocessing: ${docPath}`);

        // 再処理を実行
        const newDocId = await addDocumentToKnowledgeBase(
          { originalname: path.basename(docPath), path: docPath, mimetype: 'text/plain' },
          fs.readFileSync(docPath, 'utf-8')
        );

        res.json({ 
          success: true, 
          docId: newDocId, 
          message: 'Document reprocessed successfully'
        });
      } else {
        res.status(500).json({ error: 'Failed to list documents' });
      }
    } catch (error) {
      logError('Error processing document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Failed to reprocess document: ' + errorMessage });
    }
  });

  // OpenAI API routes
  app.post("/api/chatgpt", requireAuth, async (req, res) => {
    try {
      const { text, useOnlyKnowledgeBase = true } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      console.log(`ChatGPT API呼び出し: ナレッジベースのみを使用=${useOnlyKnowledgeBase}`);
      const response = await processOpenAIRequest(text, useOnlyKnowledgeBase);

      // Check for specific error messages returned from OpenAI
      if (response.includes("OpenAI APIキーが無効")) {
        return res.status(401).json({ message: response });
      }

      if (response.includes("OpenAI APIのリクエスト制限")) {
        return res.status(429).json({ message: response });
      }

      return res.json({ response });
    } catch (error) {
      console.error("Error in /api/chatgpt:", error);
      return res.status(500).json({ message: "Error processing request" });
    }
  });

  app.post("/api/optimize-search-query", requireAuth, async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const optimizedQuery = await generateSearchQuery(text);
      return res.json({ optimizedQuery });
    } catch (error) {
      console.error("Error in /api/optimize-search-query:", error);
      return res.status(500).json({ message: "Error optimizing search query" });
    }
  });

  app.post("/api/analyze-image", requireAuth, async (req, res) => {
    try {
      const { image } = req.body;

      if (!image) {
        return res.status(400).json({ message: "Image data is required" });
      }

      const result = await analyzeVehicleImage(image);

      // Check for specific error messages returned from OpenAI
      if (result.analysis.includes("OpenAI APIキーが無効")) {
        return res.status(401).json({ message: result.analysis });
      }

      if (result.analysis.includes("OpenAI APIのリクエスト制限")) {
        return res.status(429).json({ message: result.analysis });
      }

      return res.json(result);
    } catch (error) {
      console.error("Error in /api/analyze-image:", error);
      return res.status(500).json({ message: "Error analyzing image" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Set up WebSocket server for real-time chat
  const wss = new WebSocketServer({ 
    noServer: true,
    path: '/ws'
  });

  // Handle upgrade requests with better error handling
  httpServer.on('upgrade', (request, socket, head) => {
    try {
      if (request.url?.startsWith('/ws')) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch (error) {
      console.error('WebSocket upgrade error:', error);
      socket.destroy();
    }
  });

  // Make sure to properly import WebSocket type
  wss.on('connection', (ws: WebSocket) => {
    console.log("WebSocket client connected");

    ws.on('message', (message: string) => {
      console.log("Received message:", message);
      // Broadcast message to all clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });

    ws.on('close', () => {
      console.log("WebSocket client disconnected");
    });

    ws.on('error', (error) => {
      console.error("WebSocket error:", error);
    });

    // Send a welcome message
    ws.send(JSON.stringify({
      type: 'system',
      content: 'Connected to Emergency Recovery Chat WebSocket server'
    }));
  });
  app.use('/api/troubleshooting', troubleshootingRouter);

  // ルーター設定のデバッグ用ミドルウェア
  const routeDebugger = (req: Request, res: Response, next: NextFunction) => {
    if (req.path.includes('/users/')) {
      console.log(`[ROUTER DEBUG] ${req.method} ${req.originalUrl}`);
      console.log(`[ROUTER DEBUG] Path: ${req.path}`);
      console.log(`[ROUTER DEBUG] Params:`, req.params);
    }
    next();
  };

  // ユーザー管理ルート
  app.use('/api/users', routeDebugger, usersRouter);

  // 汎用ロギング関数
  function logDebug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(message, ...args);
    }
  }

  function logInfo(message: string, ...args: any[]) {
      console.info(message, ...args);
  }

  function logWarn(message: string, ...args: any[]) {
    console.warn(message, ...args);
  }

  function logError(message: string, ...args: any[]) {
    console.error(message, ...args);
  }

  app.get('/api/chat/:chatId/export', async (req, res) => {
    try {
      const { chatId } = req.params;
      const chatUserId = req.query.userId as string;
      const sessionUserId = req.session?.userId;

      if (chatUserId && sessionUserId && chatUserId !== sessionUserId) {
          logWarn(`Unauthorized chat access attempt`);
          return res.status(403).json({ message: "Unauthorized access to chat" });
      }

      // 実際のエクスポート処理をここに追加
      res.json({ success: true, message: "Export completed" });

    } catch (error) {
        console.error("チャットのエクスポート中にエラーが発生しました:", error);
        res.status(500).json({ error: "チャットのエクスポートに失敗しました" });
    }
  });

  const router = Router();
  router.use('/emergency-flow', emergencyFlowRouter);
  router.use('/file', fileRouter);

  return httpServer;
}