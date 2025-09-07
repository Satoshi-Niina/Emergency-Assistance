
import 'dotenv/config';
import app from './app.js';

async function boot() {
  const port = Number(process.env.PORT) || 3001;
  const host = '0.0.0.0';
  const helloOnly = process.env.HELLO_ONLY === 'true';

  // 最小モード：I/Oなしのヘルスのみ
  if (helloOnly) {
    app.get('/', (_req, res) => res.status(200).send('hello'));
    app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', mode: 'hello' }));
    console.log('🚀 [HELLO_ONLY] Minimal mode - only / and /health endpoints');
  } else {
    // 通常モード：重い処理は遅延ロード
    try {
      const { registerRoutes } = await import('./routes/registerRoutes.js');
      await registerRoutes(app);
      console.log('✅ [NORMAL] All routes registered successfully');
    } catch (error) {
      console.error('❌ [NORMAL] Route registration error:', error);
      // 通常モードでエラーが発生した場合もサーバーは起動する（デグレード運用）
    }
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
