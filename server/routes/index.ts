import emergencyFlowRoutes from './emergency-flow';
import { registerChatRoutes } from './chat';
import { techSupportRouter } from './tech-support';
import troubleshootingRouter from './troubleshooting';
import { usersRouter } from './users';
import { registerKnowledgeBaseRoutes } from './knowledge-base';
import { registerSyncRoutes } from './sync-routes';
import { registerDataProcessorRoutes } from './data-processor';
import flowGeneratorRoutes from './flow-generator';
import { registerSearchRoutes } from './search';
import authRouter from './auth';
import settingsRouter from './settings';
// machinesRouterはapp.tsで直接マウントされているため、ここでは除外
import imageStorageRouter from './image-storage';
import systemCheckRouter from './system-check';
import { flowsRouter } from './flows';
import filesRouter from './files';
import reportsRouter from './reports';

export function registerRoutes(app: any) {
  // Ping endpoint（最小応答で生存確認）
  app.get('/api/ping', (req: any, res: any) => {
    console.log('🏓 /api/ping 呼び出し');
    try {
      res.json({
        ping: 'pong',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ /api/ping エラー:', error);
      res.status(500).json({
        ping: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Health check（暫定実装）
  app.get('/api/health', (req: any, res: any) => {
    console.log('🔍 /api/health 呼び出し');

    // 詳細なリクエスト情報をログ出力
    console.log('📊 Request details:', {
      method: req.method,
      path: req.path,
      headers: {
        host: req.headers.host,
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
      ip: req.ip,
      ips: req.ips,
      timestamp: new Date().toISOString(),
    });

    try {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        server: {
          port: process.env.PORT,
          trustProxy: req.app.get('trust proxy'),
          nodeVersion: process.version,
        },
      });
    } catch (error) {
      console.error('❌ /api/health エラー:', error);
      console.error('❌ Stack trace:', error.stack);
      res.status(500).json({
        status: 'error',
        error: 'health_check_failed',
        message: 'ヘルスチェックでエラーが発生しました',
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  });

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/settings', settingsRouter);
  registerChatRoutes(app);
  app.use('/api/emergency-flow', emergencyFlowRoutes);
  app.use('/api/tech-support', techSupportRouter);
  app.use('/api/troubleshooting', troubleshootingRouter);
  app.use('/api/users', usersRouter);

  // Register other route modules
  registerKnowledgeBaseRoutes(app);
  registerSyncRoutes(app);
  registerDataProcessorRoutes(app);
  app.use('/api/flow-generator', flowGeneratorRoutes);
  registerSearchRoutes(app);
  // machinesRouterはapp.tsで直接マウントされているため、ここでは除外
  app.use('/api/images', imageStorageRouter);
  app.use('/api/system-check', systemCheckRouter);
  app.use('/api/flows', flowsRouter);
  app.use('/api/files', filesRouter);
  app.use('/api/reports', reportsRouter);
}
