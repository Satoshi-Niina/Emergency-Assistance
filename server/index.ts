// ① 環境変数読み込み
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js'; // Express app の本体（中でCORSやルート設定がされている想定）

// ② ポート設定：Azureは環境変数PORTを渡す（ローカルでは3001）
const port = process.env.PORT || 3001;

// ③ サーバー起動
try {
  app.listen(port, () => {
    console.log('✅ SERVER IS RUNNING');
    console.log(`🌐 URL: http://localhost:${port}`);
    console.log(`🔧 MODE: ${process.env.NODE_ENV || 'development'}`);
  });
} catch (err) {
  console.error('❌ SERVER START FAILED:', err);
}

// ④ 安全なシャットダウン処理（SIGTERMなどに対応）
function gracefulShutdown() {
  console.log('🛑 Server is shutting down...');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown);
