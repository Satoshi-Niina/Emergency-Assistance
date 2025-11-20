import type { Express, Request, Response } from 'express';
import { storage } from './storage.js';
import { users } from './db/schema.js';
import session from 'express-session';
import MemoryStore from 'memorystore';

// Requestタイプの拡張
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
import { processOpenAIRequest } from './lib/openai.js';
import { processPerplexityRequest } from './lib/perplexity.js';
import fs from 'fs';
import path from 'path';
import { db } from './db/index.js';
import { schema } from './db/schema.js';
import { upload } from './lib/multer-config.js';
import {
  addDocumentToKnowledgeBase,
  listKnowledgeBaseDocuments,
  removeDocumentFromKnowledgeBase,
} from './lib/knowledge-base.js';
import { techSupportRouter } from './routes/tech-support.js';
import { registerDataProcessorRoutes } from './routes/data-processor.js';
import emergencyGuideRouter from './routes/emergency-guide.js';
import emergencyFlowRoutes from './routes/emergency-flow.js';
import flowGeneratorRoutes from './routes/flow-generator.js';
import { registerSyncRoutes } from './routes/sync-routes.js';
import { usersRouter } from './routes/users.js';
import troubleshootingRouter from './routes/troubleshooting.js';
import { supportHistoryRouter } from './routes/support-history.js';
import maintenanceRouter from './routes/maintenance.js';
import express from 'express';
import { NextFunction } from 'connect';
import authRouter from './routes/auth.js';
import { fileURLToPath } from 'url';
import { eq } from 'drizzle-orm';
import machinesRouter from './routes/machines.js';
import { historyRouter } from './routes/history.js';
import { baseDataRouter } from './routes/base-data.js';
import filesRouter from './routes/files.js';
import knowledgeBaseRouter from './routes/knowledge-base.js';
import qaLearningRouter from './routes/qa-learning.js';
import { registerKnowledgeBaseRoutes } from './routes/knowledge-base.js';
import settingsRouter from './routes/settings.js';

// ESM用__dirname定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MemoryStoreSession = MemoryStore(session);

// Extend the express-session types
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userRole?: string;
  }
}

// Session will now use Postgres via storage.sessionStore

export function registerRoutes(app: Express): void {
  // 静的ファイル配信の設定（最優先で登録）
  app.use(
    '/images',
    express.static(path.join(__dirname, '../../public/images'))
  );
  app.use('/public', express.static(path.join(__dirname, '../../public')));

  // Register tech support router
  app.use('/api/tech-support', techSupportRouter);

  // Register data processor routes
  registerDataProcessorRoutes(app);

  // Register emergency guide routes
  app.use('/api/emergency-guide', emergencyGuideRouter);

  // Register emergency flow routes
  app.use('/api/emergency-flow', emergencyFlowRoutes);

  // Register flow generator routes
  app.use('/api/flow-generator', flowGeneratorRoutes);

  // Register sync routes for offline capabilities
  registerSyncRoutes(app);

  // Register API routers
  app.use('/api/users', usersRouter);
  app.use('/api/machines', machinesRouter);
  app.use('/api/history', historyRouter);
  app.use('/api/base-data', baseDataRouter);
  app.use('/api/files', filesRouter);
  app.use('/api/knowledge-base', knowledgeBaseRouter);
  app.use('/api/qa-learning', qaLearningRouter);
  app.use('/api/maintenance', maintenanceRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/ai-assist/settings', settingsRouter); // AI assist settings endpoint

  // Health check endpoints
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  app.get('/api/healthz', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  app.get('/ping', (req, res) => {
    res.json({
      ping: 'pong',
      timestamp: new Date().toISOString(),
    });
  });

  // データベース接続確認エンドポイント
  app.get('/api/debug/database', async (req, res) => {
    try {
      // データベース接続テスト
      const testQuery = await db.select().from(users).limit(1);

      res.json({
        status: 'connected',
        database: 'PostgreSQL',
        connectionTest: 'success',
        userCount: testQuery.length,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      });
    } catch (error) {
      console.error('データベース接続エラー:', error);
      res.status(500).json({
        status: 'error',
        database: 'PostgreSQL',
        connectionTest: 'failed',
        error:
          error instanceof Error ? error.message : 'Unknown database error',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        recommendations: [
          'DATABASE_URL環境変数を確認してください',
          'PostgreSQLサーバーが起動しているか確認してください',
          'データベースの接続情報を確認してください',
        ],
      });
    }
  });

  // OpenAI APIキーの設定状況を確認するエンドポイント
  app.get('/api/debug/openai', (req, res) => {
    const apiKey = process.env.OPENAI_API_KEY;
    const hasApiKey = !!apiKey && apiKey !== 'dev-mock-key';

    res.json({
      openaiApiKey: hasApiKey ? 'SET' : 'NOT SET',
      apiKeyPrefix: hasApiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      recommendations: hasApiKey
        ? []
        : [
            'OPENAI_API_KEY環境変数を設定してください',
            'env.exampleファイルを参考に.envファイルを作成してください',
            "開発環境では'dev-mock-key'を使用できます",
          ],
    });
  });

  // Add a public OpenAI test endpoint (for testing only)
  app.post('/api/chatgpt-test', async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ message: 'Text is required' });
      }

      const response = await processOpenAIRequest(text, true);
      return res.json({ response });
    } catch (error) {
      console.error('Error in /api/chatgpt-test:', error);
      return res
        .status(500)
        .json({ message: 'Error processing request', error: String(error) });
    }
  });

  // Perplexity API endpoint
  app.post('/api/perplexity', async (req, res) => {
    try {
      const { query, systemPrompt, useKnowledgeBaseOnly = true } = req.body;

      if (!query) {
        return res.status(400).json({ message: 'Query is required' });
      }

      console.log(
        `Perplexity API request: query=${query}, useKnowledgeBaseOnly=${useKnowledgeBaseOnly}`
      );
      const { content, citations } = await processPerplexityRequest(query);

      return res.json({ content, citations });
    } catch (error) {
      console.error('Error in /api/perplexity:', error);
      return res.status(500).json({
        message: 'Error processing Perplexity request',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Setup session middleware
  const sessionSecret =
    process.env.SESSION_SECRET || 'emergency-recovery-secret';
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 86400000, // 24 hours
        sameSite: 'lax',
      },
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Auth middleware
  const requireAuth = async (req: Request, res: Response, next: Function) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'ログインが必要です',
        });
      }

      // データベースからユーザー情報を確認
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId))
        .limit(1);
      if (user.length === 0) {
        return res.status(401).json({
          error: 'User not found',
          message: 'ユーザーが見つかりません',
        });
      }

      // ユーザー情報をリクエストに追加
      req.user = user[0];
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        error: 'Authentication error',
        message: '認証エラーが発生しました',
      });
    }
  };

  // Admin middleware
  const requireAdmin = async (req: Request, res: Response, next: Function) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'ログインが必要です',
        });
      }

      // データベースからユーザー情報を確認
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId))
        .limit(1);
      if (user.length === 0) {
        return res.status(401).json({
          error: 'User not found',
          message: 'ユーザーが見つかりません',
        });
      }

      // 管理者権限チェック
      if (user[0].role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          message: '管理者権限が必要です',
        });
      }

      // ユーザー情報をリクエストに追加
      req.user = user[0];
      next();
    } catch (error) {
      console.error('Admin middleware error:', error);
      return res.status(500).json({
        error: 'Authentication error',
        message: '認証エラーが発生しました',
      });
    }
  };

  // Auth routes - JSON Content-Typeを設定
  app.use(
    '/api/auth',
    (req, res, next) => {
      res.setHeader('Content-Type', 'application/json');
      next();
    },
    authRouter
  );


  // デバッグ用エンドポイント
  app.get('/api/debug', (req, res) => {
    console.log('🔍 デバッグリクエスト受信');
    res.status(200).json({
      success: true,
      message: 'Debug endpoint working',
      headers: req.headers,
      session: req.session,
      environment: process.env.NODE_ENV,
    });
  });

  // Document routes (admin only)
  app.get('/api/documents', requireAuth, async (req, res) => {
    // const documents = await storage.getDocumentsForUser(req.session.userId!);
    return res.json([]);
  });

  app.post('/api/documents', requireAuth, async (req, res) => {
    // const document = await storage.createDocument(documentData);
    return res.json([]);
  });

  app.put('/api/documents/:id', requireAuth, async (req, res) => {
    // const document = await storage.getDocument(parseInt(req.params.id));
    // const updatedDocument = await storage.updateDocument(document.id, req.body);
    return res.json([]);
  });

  // Search routes
  app.get('/api/search', requireAuth, async (req, res) => {
    try {
      const keyword = req.query.q as string;

      if (!keyword) {
        return res.status(400).json({ message: 'Search query is required' });
      }

      const documents = await storage.searchDocumentsByKeyword(keyword);
      return res.json(documents);
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Knowledge Base API routes

  // ドキュメントアップロード
  app.post(
    '/api/knowledge/upload',
    requireAuth,
    requireAdmin,
    upload.single('file'),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'ファイルがありません' });
        }

        const filePath = req.file.path;
        try {
          const docId = await addDocumentToKnowledgeBase(
            {
              originalname: path.basename(filePath),
              path: filePath,
              mimetype: 'text/plain',
            },
            fs.readFileSync(filePath, 'utf-8')
          );
          return res.status(201).json({
            success: true,
            docId,
            message: 'ドキュメントが正常に追加されました',
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
        const errorMessage =
          error instanceof Error ? error.message : '不明なエラー';
        res
          .status(500)
          .json({ error: '知識ベースへの追加に失敗しました: ' + errorMessage });
      }
    }
  );

  // ドキュメント削除
  app.delete('/api/knowledge/:docId', requireAuth, requireAdmin, (req, res) => {
    try {
      const docId = req.params.docId;
      console.log(`Document deletion request: ID=${docId}`);

      // ドキュメントとその関連ファイルを削除
      const success = removeDocumentFromKnowledgeBase(docId);

      if (success) {
        // 画像検索データを再初期化
        const techSupportApiUrl = process.env.TECH_SUPPORT_API_URL || 'http://localhost:5000';
        fetch(`${techSupportApiUrl}/api/tech-support/init-image-search-data`, {
          method: 'POST',
        })
          .then(response => {
            if (response.ok) {
              console.log('Image search data reinitialized');
            } else {
              console.warn('Failed to reinitialize image search data');
            }
          })
          .catch(err => {
            console.error('Image search data reinitialization error:', err);
          });

        res.json({
          success: true,
          message: 'Document and related files deleted successfully',
          docId: docId,
        });
      } else {
        res.status(404).json({ error: 'Document not found' });
      }
    } catch (error) {
      console.error('Error removing document:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      res
        .status(500)
        .json({ error: 'Failed to delete document: ' + errorMessage });
    }
  });

  // ドキュメント再処理
  app.post(
    '/api/knowledge/:docId/process',
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const docId = req.params.docId;
        // ナレッジベースからドキュメント情報を取得
        const documents = listKnowledgeBaseDocuments();
        if (documents.success && documents.documents) {
          const document = documents.documents.find(doc => doc.id === docId);

          if (!document) {
            return res.status(404).json({ error: 'Document not found' });
          }

          // ドキュメントのパスを取得
          const docPath = path.join(
            __dirname,
            '../../knowledge-base',
            document.title
          );

          if (!fs.existsSync(docPath)) {
            return res
              .status(404)
              .json({ error: 'Document file not found: ' + docPath });
          }

          console.log(`Starting document reprocessing: ${docPath}`);

          // 再処理を実行
          const newDocId = await addDocumentToKnowledgeBase(
            {
              originalname: path.basename(docPath),
              path: docPath,
              mimetype: 'text/plain',
            },
            fs.readFileSync(docPath, 'utf-8')
          );

          res.json({
            success: true,
            docId: newDocId,
            message: 'Document reprocessed successfully',
          });
        } else {
          res.status(500).json({ error: 'Failed to list documents' });
        }
      } catch (error) {
        console.error('Error processing document:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        res
          .status(500)
          .json({ error: 'Failed to reprocess document: ' + errorMessage });
      }
    }
  );

  // OpenAI API routes
  app.post('/api/chatgpt', requireAuth, async (req, res) => {
    try {
      const { text, useOnlyKnowledgeBase = true } = req.body;

      if (!text) {
        return res.status(400).json({ message: 'Text is required' });
      }

      console.log(
        `ChatGPT API呼び出し: ナレッジベースのみを使用=${useOnlyKnowledgeBase}`
      );
      const response = await processOpenAIRequest(text, useOnlyKnowledgeBase);

      // Check for specific error messages returned from OpenAI
      if (response.includes('OpenAI APIキーが無効')) {
        return res.status(401).json({ message: response });
      }

      if (response.includes('OpenAI APIのリクエスト制限')) {
        return res.status(429).json({ message: response });
      }

      return res.json({ response });
    } catch (error) {
      console.error('Error in /api/chatgpt:', error);
      return res.status(500).json({
        message: 'Error processing request',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Knowledge base routes
  registerKnowledgeBaseRoutes(app);
}
