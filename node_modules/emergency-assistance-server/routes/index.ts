import emergencyFlowRoutes from './emergency-flow.js';
import { registerChatRoutes } from './chat.js';
import { techSupportRouter } from './tech-support.js';
import troubleshootingRouter from './troubleshooting.js';
import { usersRouter } from './users.js';
import { registerKnowledgeBaseRoutes } from './knowledge-base.js';
import { registerSyncRoutes } from './sync-routes.js';
import dataProcessorRouter from './data-processor.js';
import flowGeneratorRoutes from './flow-generator.js';
import { registerSearchRoutes } from './search.js';
import authRouter from './auth.js';
import settingsRouter from './settings.js';
// machinesRouterはapp.tsで直接マウントされているため、ここでは除外
import imageStorageRouter from './image-storage.js';
import systemCheckRouter from './system-check.js';
import machinesRouter from './machines.js';
import { flowsRouter } from './flows.js';
import filesRouter from './files.js';
import reportsRouter from './reports.js';
import storageUnifiedRouter from './storage-unified.js';
import { healthRouter } from './health.js';
import pingRouter from './ping.js';
import mountDiag from './_diag.js';
import { historyRouter } from './history.js';

export default function registerRoutes(app: any) {
  // API routes
  app.use('/api/health', healthRouter);
  app.use('/api/ping', pingRouter);
  app.use('/api/storage', storageUnifiedRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/history', historyRouter);
  
  // 診断用エンドポイント
  mountDiag(app);
  
  // registerChatRoutes(app); // 一時的に無効化
  registerChatRoutes(app);
  app.use('/api/flows', flowsRouter);
  app.use('/api/emergency-flow', emergencyFlowRoutes);
  app.use('/api/tech-support', techSupportRouter);
  app.use('/api/troubleshooting', troubleshootingRouter);
  app.use('/api/users', usersRouter);

  // Register other route modules
  registerKnowledgeBaseRoutes(app);
  registerSyncRoutes(app);
  app.use('/api/data-processor', dataProcessorRouter);
  app.use('/api/flow-generator', flowGeneratorRoutes);
  registerSearchRoutes(app);
  // machinesRouterはapp.tsで直接マウントされているため、ここでは除外
  app.use('/api/images', imageStorageRouter);
  app.use('/api/system-check', systemCheckRouter);
  app.use('/api/machines', machinesRouter);
  app.use('/api/files', filesRouter);
  app.use('/api/reports', reportsRouter);
  
  console.log('[BOOT] routes mounted');
}
