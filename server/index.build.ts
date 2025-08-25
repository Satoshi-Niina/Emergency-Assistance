import app from "./app.js";
import { createServer } from "node:http";
import { registerRoutes } from "./routes.js";
import { setupAuth } from "./auth.js";

async function main() {
  // Azure Storage邨ｱ蜷医・蛻晄悄蛹・
  if (process.env.NODE_ENV === 'production' && process.env.AZURE_STORAGE_CONNECTION_STRING) {
    try {
      console.log('噫 Azure Storage邨ｱ蜷医ｒ蛻晄悄蛹紋ｸｭ...');
      const { knowledgeBaseAzure } = await import('./lib/knowledge-base-azure.js');
      await knowledgeBaseAzure.initialize();
      console.log('笨・Azure Storage邨ｱ蜷亥・譛溷喧螳御ｺ・);
    } catch (azureError) {
      console.error('笶・Azure Storage邨ｱ蜷亥・譛溷喧繧ｨ繝ｩ繝ｼ:', azureError);
      console.log('笞・・Azure Storage邨ｱ蜷医↑縺励〒邯夊｡後＠縺ｾ縺・);
    }
  }

  const server = createServer(app);
  const PORT = process.env.PORT || 8080;
  
  server.listen(PORT, () => {
    console.log(`噫 [BUILD] Server running at http://localhost:${PORT}`);
    console.log(`倹 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`藤 Health check: /api/health`);
  });

  // 繧ｰ繝ｬ繝ｼ繧ｹ繝輔Ν繧ｷ繝｣繝・ヨ繝繧ｦ繝ｳ
  const gracefulShutdown = () => {
    console.log('売 Graceful shutdown initiated...');
    server.close(() => {
      console.log('笨・Server closed successfully');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

main().catch((err) => {
  console.error("笶・[BUILD] Failed to start server:");
  console.error(err);
});
