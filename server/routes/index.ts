import emergencyFlowRoutes from "./emergency-flow";
import { registerChatRoutes } from "./chat";
import { techSupportRouter } from "./tech-support";
import troubleshootingRouter from "./troubleshooting";
import { usersRouter } from "./users";
import { registerKnowledgeBaseRoutes } from "./knowledge-base";
import { registerSyncRoutes } from "./sync-routes";
import { registerDataProcessorRoutes } from "./data-processor";
import flowGeneratorRoutes from "./flow-generator";
import { registerSearchRoutes } from "./search";
import authRouter from "./auth";
// machinesRouterはapp.tsで直接マウントされているため、ここでは除外
import imageStorageRouter from "./image-storage";
import systemCheckRouter from "./system-check";
import { flowsRouter } from "./flows";
import filesRouter from "./files";

export function registerRoutes(app: any) {
  // Health check
  app.get('/api/health', (_req: any, res: any) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/auth', authRouter);
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
}