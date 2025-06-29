import { registerSyncRoutes } from "./sync-routes.js";
import emergencyFlowRouter from "./emergency-flow.js";
import emergencyGuideRouter from "./emergency-guide.js";
import techSupportRouter from "./tech-support.js";
import { registerDataProcessorRoutes } from "./data-processor.js";
import { troubleshootingRouter } from "./troubleshooting.js";
import { registerKnowledgeBaseRoutes } from "./knowledge-base.js";
import { registerSearchRoutes } from "./search.js";
import fileRouter from "./file.js";
import { flowGeneratorRouter } from "./flow-generator.js";
import { registerChatRoutes } from "./chat.js";
import { authRouter } from "./auth.js";
export function registerRoutes(app) {
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
