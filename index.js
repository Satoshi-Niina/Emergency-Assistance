// Azure App Service用の最もシンプルな起動ファイル
console.log('🚀 Azure App Service起動開始');
console.log('📁 現在のディレクトリ:', __dirname);
console.log('📁 ファイル一覧:', require('fs').readdirSync(__dirname));

// 環境変数の設定
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || 8080;

console.log('🔧 環境設定:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  NODE_VERSION: process.version
});

// server.jsを直接実行
try {
  console.log('🚀 server.jsを読み込み中...');
  require('./server.js');
  console.log('✅ server.jsの読み込み完了');
} catch (error) {
  console.error('❌ server.jsの読み込みエラー:', error);
  process.exit(1);
}
