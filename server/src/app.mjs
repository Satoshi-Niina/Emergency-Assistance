import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import compression from 'compression';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { NODE_ENV, PORT } from './config/env.mjs';
import { corsOptions } from './config/cors.mjs';
import { createSessionMiddleware } from './config/session.mjs';
import { createSecurityMiddleware } from './config/security.mjs';

import registerAuthRoutes from './routes/auth.mjs';
import registerHealthRoutes from './routes/health.mjs';
import registerDiagRoutes from './routes/diag.mjs';
import registerHistoryRoutes from './routes/history.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp() {
  const app = express();

  // Basic Middleware
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  
  app.use(createSecurityMiddleware());
  app.use(compression());
  app.use(morgan(NODE_ENV === 'production' ? 'tiny' : 'dev'));
  
  // CORS
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // Body Parser
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // Session
  app.use(createSessionMiddleware());

  // Session Debug
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      // console.log('[Session Debug]', { path: req.path, sessionID: req.sessionID });
    }
    next();
  });

  // Register Manual Routes
  registerHealthRoutes(app); // /live, /ready, /api/health
  registerAuthRoutes(app);   // /api/auth
  registerDiagRoutes(app);   // /api/_diag
  registerHistoryRoutes(app); // /api/history

  // Auto Routing (src/api)
  await loadApiRoutes(app);

  // Static Files (Client)
  const clientDistPaths = [
    path.join(__dirname, '../client/dist'),
    path.join(__dirname, '../../client/dist'),
    path.join(process.cwd(), 'client/dist')
  ];

  let clientDistPath = null;
  for (const testPath of clientDistPaths) {
    if (fs.existsSync(path.join(testPath, 'index.html'))) {
      clientDistPath = testPath;
      break;
    }
  }

  if (clientDistPath) {
    console.log('[App] Serving client from:', clientDistPath);
    app.use(express.static(clientDistPath, {
      maxAge: '7d', etag: true, lastModified: true, immutable: true
    }));

    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  } else {
    console.warn('[App] Client dist not found. Running in API-only mode.');
  }

  // 404 Handler
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.warn('[404] API endpoint not found:', req.path);
    }
    res.status(404).json({
      error: 'not_found',
      message: 'Endpoint not found',
      path: req.path
    });
  });

  // Error Handler
  app.use((err, req, res, next) => {
    console.error('[Error] Unhandled error:', err);
    // Temporary: Always show error details for debugging
    res.status(500).json({
      error: 'internal_error',
      message: err.message,
      stack: NODE_ENV === 'development' ? err.stack : undefined,
      details: 'Check server logs for more info'
    });
  });

  return app;
}

async function loadApiRoutes(app) {
  console.log('[App] Loading API routes dynamically...');
  const apiDir = path.join(__dirname, 'api');
  
  if (!fs.existsSync(apiDir)) {
    console.warn('[App] API directory not found:', apiDir);
    return;
  }

  const excludedDirs = ['db', 'shared', 'middleware', 'utils', 'types', 'config', 'lib', 'auth', 'history']; // auth, history are handled manually

  try {
    const entries = fs.readdirSync(apiDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const moduleName = entry.name;
      if (excludedDirs.includes(moduleName)) continue;

      const moduleDir = path.join(apiDir, moduleName);
      let indexPath = path.join(moduleDir, 'index.mjs');
      if (!fs.existsSync(indexPath)) {
        indexPath = path.join(moduleDir, 'index.js');
      }
      
      if (!fs.existsSync(indexPath)) continue;
      
      try {
        const moduleUrl = pathToFileURL(indexPath).href;
        const module = await import(moduleUrl);
        
        if (!module.default) continue;
        
        const routePath = `/api/${moduleName}`;
        const methods = module.methods || ['get', 'post', 'put', 'delete'];
        
        for (const method of methods) {
          if (typeof app[method] === 'function') {
            app[method](routePath, module.default);
            
            // Wildcard support for all modules to handle sub-paths
            // e.g. /api/machines/machine-types
            app[method](`${routePath}/*`, module.default);
          }
        }
        console.log(`[App] Loaded route: ${routePath}`);
      } catch (err) {
        console.error(`[App] Failed to load ${moduleName}:`, err.message);
      }
    }
  } catch (error) {
    console.error('[App] Auto-routing failed:', error);
  }
}
