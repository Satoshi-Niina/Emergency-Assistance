// Azure App Service 用ローダー (CommonJS) - dist/app.js を動的インポートして本体を起動
console.log('🔥 Loader start -', new Date().toISOString());
console.log('📍 NODE_VERSION:', process.version);
console.log('📍 PLATFORM:', process.platform);
console.log('📍 ENV - PORT:', process.env.PORT, 'NODE_ENV:', process.env.NODE_ENV);

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  try {
    const distDir = __dirname; // このファイルは dist/index.js として配置される想定
    const appUrl = pathToFileURL(path.join(distDir, 'app.js')).href;
    console.log('� Importing app from', appUrl);
  const mod = await import(appUrl);
    const app = mod.default || mod.app || mod;
    const port = Number(process.env.PORT) || 8080;

    // 念のため favicon を 204 で返す薄いハンドラ
    if (app && app.get) {
      app.get('/favicon.ico', (_req, res) => res.status(204).end());
    }

    app.listen(port, '0.0.0.0', () => {
      console.log('🚀 Full app started');
      console.log(`🌐 Port: ${port}`);
      console.log('📊 Health: /api/health');
    }).on('error', (error) => {
      console.error('❌ Listen error:', error);
    });
  } catch (err) {
    console.error('❌ Loader failed to start app:', err);
    process.exit(1);
  }
})();
