// エントリーポイント: ESMサーバーにリダイレクト
import('./server/index.js').catch(error => {
  console.error('❌ Failed to import server:', error);
  process.exit(1);
});
