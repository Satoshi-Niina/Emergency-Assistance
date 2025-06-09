import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import fs from "fs";
import cors from 'cors';
import { storage } from "./storage";
import dotenv from 'dotenv';

// Environment setup
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

console.log(`🚀 Starting Express server (NODE_ENV: ${process.env.NODE_ENV})`);

const app = express();
const port = parseInt(process.env.PORT || '5000', 10);

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Force disable Vite and serve static files only
process.env.DISABLE_VITE = 'true';
process.env.NODE_ENV = 'production';

const distPath = path.join(process.cwd(), 'client', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log('✅ Serving static files from:', distPath);
} else {
  console.log('⚠️ Dist directory not found, creating minimal fallback');
}

// Knowledge base static files
app.use('/knowledge-base/images', express.static(path.join(process.cwd(), 'knowledge-base', 'images')));
app.use('/knowledge-base/data', express.static(path.join(process.cwd(), 'knowledge-base', 'data')));
app.use('/knowledge-base/json', express.static(path.join(process.cwd(), 'knowledge-base', 'json')));

(async () => {
  try {
    console.log('📦 Initializing storage...');
    app.locals.storage = storage;

    console.log('🛣️ Registering routes...');
    const server = await registerRoutes(app);

    // SPA routing - serve index.html for all non-API routes
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/knowledge-base/')) {
        return res.status(404).json({ message: 'Not found' });
      }

      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(503).send('<h1>Application not built</h1><p>Run: cd client && npm run build</p>');
      }
    });

    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${port}`);
      console.log(`📱 External access: https://${process.env.REPL_SLUG || 'your-repl'}.${process.env.REPL_OWNER || 'username'}.replit.dev`);
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
})();