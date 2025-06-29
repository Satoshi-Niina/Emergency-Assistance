import { Express } from "express";
import { registerSyncRoutes } from "./sync-routes";
import emergencyFlowRouter from "./emergency-flow";
import emergencyGuideRouter from "./emergency-guide";
import techSupportRouter from "./tech-support";
import { registerDataProcessorRoutes } from "./data-processor";
import { troubleshootingRouter } from "./troubleshooting";
import { registerKnowledgeBaseRoutes } from "./knowledge-base";
import { registerSearchRoutes } from "./search";
import fileRouter from "./file";
import { flowGeneratorRouter } from "./flow-generator";
import { registerChatRoutes } from "./chat";
import { authRouter } from "./auth";

export function registerRoutes(app: Express): void {
  app.use("/api/auth", authRouter);
  registerSyncRoutes(app);
  app.use("/api/emergency-flow", emergencyFlowRouter);
  app.use("/api/emergency-guide", emergencyGuideRouter);
  app.use("/api/tech-support", techSupportRouter);
  registerDataProcessorRoutes(app);
  app.use("/api/troubleshooting", troubleshootingRouter);
  registerKnowledgeBaseRoutes(app);
  registerSearchRoutes(app);
  app.use("/api/files", fileRouter);
  app.use("/api/flow-generator", flowGeneratorRouter);
  registerChatRoutes(app);
} 