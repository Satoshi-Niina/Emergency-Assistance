
import 'dotenv/config';
import { createApp } from './app.js';

async function boot() {
  const port = Number(process.env.PORT) || 3001;
  const host = '0.0.0.0';
  const helloOnly = process.env.HELLO_ONLY === 'true';

  // アプリケーションを作成
  const app = await createApp();

  // 最小モード：I/Oなしのヘルスのみ
  if (helloOnly) {
    console.log('🚀 [HELLO_ONLY] Minimal mode - health endpoints are already registered in app.ts');
  } else {
    console.log('✅ [NORMAL] All routes registered successfully');
  }

  app.listen(port, host, () => {
    console.log(`[boot] listening on http://${host}:${port} (HELLO_ONLY=${helloOnly})`);
  });

  // 起動時の落下を可視化
  process.on('unhandledRejection', (e) => {
    console.error('[unhandledRejection]', e);
  });
  process.on('uncaughtException', (e) => {
    console.error('[uncaughtException]', e);
  });
}

boot().catch(err => {
  console.error('[boot:error]', err);
  process.exit(1);
});
