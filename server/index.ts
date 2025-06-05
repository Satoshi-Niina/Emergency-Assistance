import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { initializeKnowledgeBase } from "./lib/knowledge-base";
import fs from "fs";
import axios from "axios";
import { storage } from "./storage";
import dotenv from 'dotenv';
import { runCleanup } from '../scripts/scheduled-cleanup.js';
import { fileURLToPath } from 'url';

// __dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .envファイルの読み込み
dotenv.config({ path: path.resolve(__dirname, '.env') });

// 環境変数の確認（最小限のログ）
if (!process.env.OPENAI_API_KEY) {
  console.log("Warning: OPENAI_API_KEY not set");
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from public directory
app.use('/static', express.static(path.join(process.cwd(), 'public')));

// 知識ベースディレクトリへのアクセスを一元化
app.use('/knowledge-base/images', express.static(path.join(process.cwd(), 'knowledge-base', 'images')));
app.use('/knowledge-base/data', express.static(path.join(process.cwd(), 'knowledge-base', 'data')));
app.use('/knowledge-base/json', express.static(path.join(process.cwd(), 'knowledge-base', 'json')));
app.use('/knowledge-base/media', express.static(path.join(process.cwd(), 'knowledge-base', 'media')));

// 完全に/knowledge-baseに一元化、/uploadsへのリクエストを全て/knowledge-baseに転送
app.use('/uploads/:dir', (req, res) => {
  const dir = req.params.dir;
  // 許可されたディレクトリのみリダイレクト
  if (['images', 'data', 'json', 'media', 'ppt'].includes(dir)) {
    const redirectPath = `/knowledge-base/${dir}${req.path}`;
    console.log(`リダイレクト: ${req.path} -> ${redirectPath}`);
    res.redirect(redirectPath);
  } else {
    res.status(404).send('Not found');
  }
});

// Add a test route to serve our HTML test page
app.get('/test', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'api-test.html'));
});

// Minimal request logging
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});



(async () => {
  try {
    // Initialize application
    app.locals.storage = storage;
    initializeKnowledgeBase();

    // Test database connection with retry logic
    let dbConnected = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (!dbConnected && retryCount < maxRetries) {
      try {
        const { checkDatabaseConnection } = await import('./db.js');
        dbConnected = await checkDatabaseConnection();
        if (!dbConnected) {
          retryCount++;
          console.log(`Database connection attempt ${retryCount}/${maxRetries} failed, retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (dbError) {
        retryCount++;
        console.log(`Database connection attempt ${retryCount}/${maxRetries} failed:`, dbError.message);
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!dbConnected) {
      console.log('Warning: Could not establish database connection. Server will continue but database operations may fail.');
    } else {
      console.log('Database connection established successfully');
    }

    // Create required directories
    const dirs = [
      'knowledge-base/images',
      'knowledge-base/json', 
      'knowledge-base/data',
      'knowledge-base/media',
      'knowledge-base/ppt'
    ];

    for (const dir of dirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // Sync uploads to knowledge-base (silent)
    setTimeout(async () => {
      try {
        await axios.post('http://localhost:5000/api/tech-support/sync-knowledge-base?direction=uploads-to-kb');
      } catch (syncErr) {
        // Silent sync - no console output
      }
    }, 3000);
  } catch (err) {
    console.error('知識ベースの初期化中にエラーが発生しました:', err);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // Handle specific database connection errors silently
    if (err.code === '57P01' || err.message?.includes('terminating connection due to administrator command')) {
      message = "Database connection was reset. Please try again.";
      // Silent handling - no console output
    } else if (err.code === 'ECONNRESET' || err.message?.includes('connection') || err.severity === 'FATAL') {
      message = "Database connection error. Please try again.";
      // Silent handling - no console output
    } else {
      // Only log non-database errors
      console.error('Server error:', err.message);
    }

    res.status(status).json({ message });

    // Don't throw the error for database connection issues - let the app continue
    if (err.code !== '57P01' && err.code !== 'ECONNRESET') {
      throw err;
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;

  // Use a fixed port and handle errors properly
  server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  }).on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Exiting.`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
    }
  });
})();