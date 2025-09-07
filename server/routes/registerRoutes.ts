import type { Express } from 'express';

export async function registerRoutes(app: Express) {
  console.log('🔄 [registerRoutes] Starting lazy route registration...');
  
  try {
    // 既存のルート登録関数を遅延ロード
    const { registerRoutes: oldRegisterRoutes } = await import('../routes.js');
    console.log('✅ [registerRoutes] Legacy routes module loaded');
    
    // 既存のルート登録を実行
    oldRegisterRoutes(app);
    
    console.log('✅ [registerRoutes] All routes registered successfully');
  } catch (error) {
    console.error('❌ [registerRoutes] Route registration failed:', error);
    
    // 最低限のエラーハンドリング: 既にヘルスチェックエンドポイントは登録されているので
    // アプリケーションは動作可能な状態を維持
    app.use('/api/*', (req, res) => {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Route registration failed - server is in degraded mode',
        timestamp: new Date().toISOString()
      });
    });
    
    throw error;
  }
}
