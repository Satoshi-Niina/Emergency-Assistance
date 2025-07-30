import emergencyFlowRoutes from "./emergency-flow.js";
import { registerChatRoutes } from "./chat.js";
import { techSupportRouter } from "./tech-support.js";
import { troubleshootingRouter } from "./troubleshooting.js";
import { usersRouter } from "./users.js";
import { registerKnowledgeBaseRoutes } from "./knowledge-base.js";
import { registerSyncRoutes } from "./sync-routes.js";
import { registerDataProcessorRoutes } from "./data-processor.js";
import flowGeneratorRoutes from "./flow-generator.js";
import { registerSearchRoutes } from "./search.js";

export function registerRoutes(app: any) {
  // Health check
  app.get('/api/health', (_req: any, res: any) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
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
}