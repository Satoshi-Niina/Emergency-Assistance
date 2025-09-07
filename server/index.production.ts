// Production Server Entry Point
import 'dotenv/config';
import { createApp } from './app.js';

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

  // アプリケーションを作成
  const app = await createApp();

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
