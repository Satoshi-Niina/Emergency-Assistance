import app from './app';
import { createServer } from "node:http";
import { registerRoutes } from './routes';
import { setupAuth } from './auth';

async function main() {
  // app is already configured, no need to createApp

  // Azure Storage統合の初期化
  if (process.env.NODE_ENV === 'production' && process.env.AZURE_STORAGE_CONNECTION_STRING) {
    try {
      console.log('🚀 Azure Storage統合を初期化中...');
      const { knowledgeBaseAzure } = await import('./lib/knowledge-base-azure.js');
      await knowledgeBaseAzure.initialize();
      console.log('✅ Azure Storage統合初期化完了');
    } catch (azureError) {
      console.error('❌ Azure Storage統合初期化エラー:', azureError);
      console.log('⚠️ Azure Storage統合なしで続行します');
    }
  }

  registerRoutes(app);
  setupAuth(app);

  const server = createServer(app);
  const PORT = process.env.PORT || 8080;
  
  server.listen(PORT, () => {
    console.log(`🚀 [BUILD] Server running at http://localhost:${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 Health check: /api/health`);
  });

  // グレースフルシャットダウン
  const gracefulShutdown = () => {
    console.log('🔄 Graceful shutdown initiated...');
    server.close(() => {
      console.log('✅ Server closed successfully');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

main().catch((err) => {
  console.error("❌ [BUILD] Failed to start server:");
  console.error(err);
});
