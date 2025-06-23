import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // 環境変数でViteを完全無効化
  if (process.env.DISABLE_VITE === 'true') {
    console.log('🚫 Vite completely disabled by environment variable');
    // 静的ファイル配信のみ設定
    const clientDistPath = path.resolve(process.cwd(), 'client', 'dist');
    if (fs.existsSync(clientDistPath)) {
      app.use(express.static(clientDistPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(clientDistPath, 'index.html'));
      });
    }
    return;
  }

  // 複数レベルでの重複初期化防止
  const VITE_LOCK_KEY = '__VITE_SERVER_LOCK__';
  const PROCESS_VITE_KEY = `__VITE_PROCESS_${process.pid}__`;
  
  // 同一プロセス内での重複チェック
  if ((global as any)[VITE_LOCK_KEY] || (global as any)[PROCESS_VITE_KEY]) {
    console.log('⚠️ Vite server already running in this process, aborting...');
    return;
  }
  
  // プロセスレベルでのロック（二重ロック）
  (global as any)[VITE_LOCK_KEY] = true;
  (global as any)[PROCESS_VITE_KEY] = {
    pid: process.pid,
    timestamp: Date.now()
  };

  console.log(`🔧 Setting up Vite server (PID: ${process.pid})`);

  const serverOptions = {
    middlewareMode: true,
    hmr: false, // HMR完全無効化
    host: '0.0.0.0',
    allowedHosts: undefined,
    watch: null, // ファイル監視も無効化
    fs: {
      strict: false
    },
    cors: false
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        // 致命的でないエラーは無視
        if (msg.includes('ECONNRESET') || msg.includes('WebSocket')) {
          return;
        }
        viteLogger.error(msg, options);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
