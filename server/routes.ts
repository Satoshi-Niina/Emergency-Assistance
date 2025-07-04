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

  // ヘルスチェックエンドポイント（デバッグ用）
  app.get("/api/health", (req, res) => {
    console.log('🏥 ヘルスチェックリクエスト受信');
    res.status(200).json({
      success: true,
      message: 'Emergency Assistance Backend is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      session: {
        hasSession: !!req.session,
        userId: req.session?.userId || null
      }
    });
  });

  // デバッグ用エンドポイント
  app.get("/api/debug", (req, res) => {
    console.log('🔍 デバッグリクエスト受信');
    res.status(200).json({
      success: true,
      message: 'Debug endpoint working',
      headers: req.headers,
      session: req.session,
      environment: process.env.NODE_ENV
    });
  });

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
        console.log('ナレッジベース一覧結果:', documents);
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
      console.log(`Document deletion request: ID=${docId}`);

      // ドキュメントとその関連ファイルを削除
      const success = removeDocumentFromKnowledgeBase(docId);

      if (success){
        // 画像検索データを再初期化
        fetch('http://localhost:5000/api/tech-support/init-image-search-data', {
          method: 'POST'
        }).then(response => {
          if (response.ok) {
            console.log('Image search data reinitialized');
          } else {
            console.warn('Failed to reinitialize image search data');
          }
        }).catch(err => {
          console.error('Image search data reinitialization error:', err);
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
      console.error('Error removing document:', error);
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

        console.log(`Starting document reprocessing: ${docPath}`);

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
      console.error('Error processing document:', error);
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
      return res.status(500).json({ message: "Error processing request", error: String(error) });
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

  return httpServer;
}