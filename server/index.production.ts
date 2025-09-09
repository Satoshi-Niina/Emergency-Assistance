// Production Server Entry Point
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// PostgreSQL接続確認関数
async function dbCheck(): Promise<{ success: boolean; message: string }> {
  try {
    const { db } = await import('./db/index.js');
    
    console.log('🔍 データベース接続確認中...');
    const result = await db.execute('SELECT 1 as test');
    
    if (result) {
      console.log('✅ データベース接続成功: PostgreSQL接続が正常に動作しています');
      return { success: true, message: 'PostgreSQL接続が正常に動作しています' };
    } else {
      console.log('⚠️ データベース接続警告: クエリは実行されましたが結果が空です');
      return { success: false, message: 'データベースクエリの結果が空です' };
    }
  } catch (error) {
    console.error('❌ データベース接続エラー:', error);
    const errorMessage = error instanceof Error ? error.message : 'データベース接続に失敗しました';
    return { success: false, message: errorMessage };
  }
}

async function startServer() {
  // 環境変数の確認
  const PORT = Number(process.env.PORT) || 8080;
  const NODE_ENV = process.env.NODE_ENV || 'production';

  console.log('🔧 本番サーバー設定:', {
    NODE_ENV,
    PORT,
    DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
    CORS_ORIGINS: process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '[NOT SET]'
  });

  // Knowledge Base パスの自動調整（routes import 前に設定）
  try {
    if (!process.env.KNOWLEDGE_BASE_PATH) {
      const candidates = [
        path.resolve(process.cwd(), '..', 'knowledge-base'),
        path.resolve(process.cwd(), 'knowledge-base')
      ];
      const found = candidates.find(p => fs.existsSync(p));
      if (found) {
        process.env.KNOWLEDGE_BASE_PATH = found;
        console.log('🧠 KNOWLEDGE_BASE_PATH set to', found);
      } else {
        // まだ存在しない場合でも第一候補を設定（後続のAzure同期で作成される）
        process.env.KNOWLEDGE_BASE_PATH = candidates[0];
        console.log('🧠 KNOWLEDGE_BASE_PATH preset to', candidates[0]);
      }
    }
  } catch (e) {
    console.warn('🧠 Failed to preset KNOWLEDGE_BASE_PATH:', (e as Error)?.message);
  }

  // アプリケーションを作成（環境変数設定後に動的 import）
  const { createApp } = await import('./app.js');
  const app = await createApp();

  // 起動時に Knowledge Base を Azure から同期（可能な場合）
  try {
    const { knowledgeBaseAzure } = await import('./lib/knowledge-base-azure.js');
    if (knowledgeBaseAzure && typeof knowledgeBaseAzure.initialize === 'function') {
      console.log('🧠 Initializing Knowledge Base (Azure sync)...');
      await knowledgeBaseAzure.initialize();
    } else {
      console.warn('🧠 Knowledge Base Azure service is not available or has no initialize().');
    }
  } catch (e) {
    console.warn('🧠 Knowledge Base Azure sync skipped:', (e as Error)?.message);
  }

  // グレースフルシャットダウン
  const gracefulShutdown = () => {
    console.log('🔄 本番サーバーをシャットダウン中...');
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  // 本番サーバーの起動
  app.listen(PORT, '0.0.0.0', async () => {
    console.log('🚀 本番サーバー起動完了');
    console.log(`📍 URL: http://0.0.0.0:${PORT}`);
    console.log(`🔧 環境: ${NODE_ENV}`);
    console.log(`📊 ヘルスチェック: /api/health`);
    console.log(`🔐 Azure用ヘルスチェック: /healthz`);
    
    // 起動時にデータベース接続確認を実行
    const dbCheckResult = await dbCheck();
    if (dbCheckResult.success) {
      console.log('🎉 本番サーバー準備完了: バックエンドとデータベースの疎通確認済み');
    } else {
      console.warn('⚠️ 警告: データベース接続に問題があります -', dbCheckResult.message);
    }
  });
}

startServer().catch(err => {
  console.error('❌ 本番サーバー起動失敗:', err);
  process.exit(1);
});
