import type { Express, Request, Response } from "express";
import { storage } from "./storage.js";
import { users } from "./db/schema.js";
import session from "express-session";
import MemoryStore from 'memorystore';

// Request繧ｿ繧､繝励・諡｡蠑ｵ
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
import { processOpenAIRequest } from "./lib/openai.js";
import { processPerplexityRequest } from "./lib/perplexity.js";
import fs from "fs";
import path from "path";
import { db } from "./db/index.js";
import { schema } from "../shared/schema.js";
import { upload } from './lib/multer-config.js';
import { 
  addDocumentToKnowledgeBase, 
  listKnowledgeBaseDocuments, 
  removeDocumentFromKnowledgeBase 
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
import { NextFunction } from "connect";
import authRouter from './routes/auth.js';
import { fileURLToPath } from 'url';
import { eq } from 'drizzle-orm';
import machinesRouter from './routes/machines.js';
import { historyRouter } from './routes/history.js';
import { baseDataRouter } from './routes/base-data.js';
import filesRouter from './routes/files.js';
import knowledgeBaseRouter from './routes/knowledge-base.js';
import qaLearningRouter from './routes/qa-learning.js';
import { registerKnowledgeBaseRoutes } from "./routes/knowledge-base.js";

// ESM逕ｨ__dirname螳夂ｾｩ
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
  // 髱咏噪繝輔ぃ繧､繝ｫ驟堺ｿ｡縺ｮ險ｭ螳夲ｼ域怙蜆ｪ蜈医〒逋ｻ骭ｲ・・
  app.use('/images', express.static(path.join(__dirname, '../../public/images')));
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

  // Add a health check endpoint for testing
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // 繝・・繧ｿ繝吶・繧ｹ謗･邯夂｢ｺ隱阪お繝ｳ繝峨・繧､繝ｳ繝・
  app.get('/api/debug/database', async (req, res) => {
    try {
      // 繝・・繧ｿ繝吶・繧ｹ謗･邯壹ユ繧ｹ繝・
      const testQuery = await db.select().from(users).limit(1);
      
      res.json({
        status: 'connected',
        database: 'PostgreSQL',
        connectionTest: 'success',
        userCount: testQuery.length,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      console.error('繝・・繧ｿ繝吶・繧ｹ謗･邯壹お繝ｩ繝ｼ:', error);
      res.status(500).json({
        status: 'error',
        database: 'PostgreSQL',
        connectionTest: 'failed',
        error: error instanceof Error ? error.message : 'Unknown database error',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        recommendations: [
          "DATABASE_URL迺ｰ蠅・､画焚繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞",
          "PostgreSQL繧ｵ繝ｼ繝舌・縺瑚ｵｷ蜍輔＠縺ｦ縺・ｋ縺狗｢ｺ隱阪＠縺ｦ縺上□縺輔＞",
          "繝・・繧ｿ繝吶・繧ｹ縺ｮ謗･邯壽ュ蝣ｱ繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞"
        ]
      });
    }
  });

  // OpenAI API繧ｭ繝ｼ縺ｮ險ｭ螳夂憾豕√ｒ遒ｺ隱阪☆繧九お繝ｳ繝峨・繧､繝ｳ繝・
  app.get('/api/debug/openai', (req, res) => {
    const apiKey = process.env.OPENAI_API_KEY;
    const hasApiKey = !!apiKey && apiKey !== 'dev-mock-key';
    
    res.json({
      openaiApiKey: hasApiKey ? "SET" : "NOT SET",
      apiKeyPrefix: hasApiKey ? apiKey.substring(0, 10) + "..." : "NOT FOUND",
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      recommendations: hasApiKey ? [] : [
        "OPENAI_API_KEY迺ｰ蠅・､画焚繧定ｨｭ螳壹＠縺ｦ縺上□縺輔＞",
        "env.example繝輔ぃ繧､繝ｫ繧貞盾閠・↓.env繝輔ぃ繧､繝ｫ繧剃ｽ懈・縺励※縺上□縺輔＞",
        "髢狗匱迺ｰ蠅・〒縺ｯ'dev-mock-key'繧剃ｽｿ逕ｨ縺ｧ縺阪∪縺・
      ]
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
      const { content, citations } = await processPerplexityRequest(query);

      return res.json({ content, citations });
    } catch (error) {
      console.error("Error in /api/perplexity:", error);
      return res.status(500).json({ 
        message: "Error processing Perplexity request", 
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
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
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: '繝ｭ繧ｰ繧､繝ｳ縺悟ｿ・ｦ√〒縺・
        });
      }

      // 繝・・繧ｿ繝吶・繧ｹ縺九ｉ繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ繧堤｢ｺ隱・
      const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
      if (user.length === 0) {
        return res.status(401).json({ 
          error: 'User not found',
          message: '繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
        });
      }

      // 繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ繧偵Μ繧ｯ繧ｨ繧ｹ繝医↓霑ｽ蜉
      req.user = user[0];
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ 
        error: 'Authentication error',
        message: '隱崎ｨｼ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
      });
    }
  };

  // Admin middleware
  const requireAdmin = async (req: Request, res: Response, next: Function) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: '繝ｭ繧ｰ繧､繝ｳ縺悟ｿ・ｦ√〒縺・
        });
      }

      // 繝・・繧ｿ繝吶・繧ｹ縺九ｉ繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ繧堤｢ｺ隱・
      const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
      if (user.length === 0) {
        return res.status(401).json({ 
          error: 'User not found',
          message: '繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
        });
      }

      // 邂｡逅・・ｨｩ髯舌メ繧ｧ繝・け
      if (user[0].role !== 'admin') {
        return res.status(403).json({ 
          error: 'Admin access required',
          message: '邂｡逅・・ｨｩ髯舌′蠢・ｦ√〒縺・
        });
      }

      // 繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ繧偵Μ繧ｯ繧ｨ繧ｹ繝医↓霑ｽ蜉
      req.user = user[0];
      next();
    } catch (error) {
      console.error('Admin middleware error:', error);
      return res.status(500).json({ 
        error: 'Authentication error',
        message: '隱崎ｨｼ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
      });
    }
  };

  // Auth routes - JSON Content-Type繧定ｨｭ螳・
  app.use("/api/auth", (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  }, authRouter);

  // 繝倥Ν繧ｹ繝√ぉ繝・け繧ｨ繝ｳ繝峨・繧､繝ｳ繝茨ｼ医ョ繝舌ャ繧ｰ逕ｨ・・
  app.get("/api/health", (req, res) => {
    console.log('唱 繝倥Ν繧ｹ繝√ぉ繝・け繝ｪ繧ｯ繧ｨ繧ｹ繝亥女菫｡');
    res.setHeader('Content-Type', 'application/json');
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

  // 繝・ヰ繝・げ逕ｨ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
  app.get("/api/debug", (req, res) => {
    console.log('剥 繝・ヰ繝・げ繝ｪ繧ｯ繧ｨ繧ｹ繝亥女菫｡');
    res.status(200).json({
      success: true,
      message: 'Debug endpoint working',
      headers: req.headers,
      session: req.session,
      environment: process.env.NODE_ENV
    });
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

  // 繝峨く繝･繝｡繝ｳ繝医い繝・・繝ｭ繝ｼ繝・
  app.post('/api/knowledge/upload', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: '繝輔ぃ繧､繝ｫ縺後≠繧翫∪縺帙ｓ' });
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
          message: '繝峨く繝･繝｡繝ｳ繝医′豁｣蟶ｸ縺ｫ霑ｽ蜉縺輔ｌ縺ｾ縺励◆'
        });
      } catch (err) {
        // 繧ｨ繝ｩ繝ｼ逋ｺ逕滓凾縺ｫ繧｢繝・・繝ｭ繝ｼ繝峨ヵ繧｡繧､繝ｫ繧貞炎髯､
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        throw err;
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      const errorMessage = error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ';
      res.status(500).json({ error: '遏･隴倥・繝ｼ繧ｹ縺ｸ縺ｮ霑ｽ蜉縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ' + errorMessage });
    }
  });

  // 繝峨く繝･繝｡繝ｳ繝亥炎髯､
  app.delete('/api/knowledge/:docId', requireAuth, requireAdmin, (req, res) => {
    try {
      const docId = req.params.docId;
      console.log(`Document deletion request: ID=${docId}`);

      // 繝峨く繝･繝｡繝ｳ繝医→縺昴・髢｢騾｣繝輔ぃ繧､繝ｫ繧貞炎髯､
      const success = removeDocumentFromKnowledgeBase(docId);

      if (success){
        // 逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ繧貞・蛻晄悄蛹・
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

  // 繝峨く繝･繝｡繝ｳ繝亥・蜃ｦ逅・
  app.post('/api/knowledge/:docId/process', requireAuth, requireAdmin, async (req, res) => {
    try {
      const docId = req.params.docId;
      // 繝翫Ξ繝・ず繝吶・繧ｹ縺九ｉ繝峨く繝･繝｡繝ｳ繝域ュ蝣ｱ繧貞叙蠕・
      const documents = listKnowledgeBaseDocuments();
      if (documents.success && documents.documents) {
        const document = documents.documents.find((doc) => doc.id === docId);

        if (!document) {
          return res.status(404).json({ error: 'Document not found' });
        }

        // 繝峨く繝･繝｡繝ｳ繝医・繝代せ繧貞叙蠕・
        const docPath = path.join(__dirname, '../../knowledge-base', document.title);

        if (!fs.existsSync(docPath)) {
          return res.status(404).json({ error: 'Document file not found: ' + docPath });
        }

        console.log(`Starting document reprocessing: ${docPath}`);

        // 蜀榊・逅・ｒ螳溯｡・
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

      console.log(`ChatGPT API蜻ｼ縺ｳ蜃ｺ縺・ 繝翫Ξ繝・ず繝吶・繧ｹ縺ｮ縺ｿ繧剃ｽｿ逕ｨ=${useOnlyKnowledgeBase}`);
      const response = await processOpenAIRequest(text, useOnlyKnowledgeBase);

      // Check for specific error messages returned from OpenAI
      if (response.includes("OpenAI API繧ｭ繝ｼ縺檎┌蜉ｹ")) {
        return res.status(401).json({ message: response });
      }

      if (response.includes("OpenAI API縺ｮ繝ｪ繧ｯ繧ｨ繧ｹ繝亥宛髯・)) {
        return res.status(429).json({ message: response });
      }

      return res.json({ response });
    } catch (error) {
      console.error("Error in /api/chatgpt:", error);
      return res.status(500).json({ 
        message: "Error processing request", 
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Knowledge base routes
  registerKnowledgeBaseRoutes(app);
}