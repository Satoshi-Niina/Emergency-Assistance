import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数ファイルの読み込み（優先順位順）
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../.env'),
];

console.log('🔧 開発環境起動 - 環境変数読み込み開始');
console.log('📁 現在のディレクトリ:', process.cwd());
console.log('📁 __dirname:', __dirname);

// 各パスで.envファイルを読み込み
let loadedEnvFile = null;
for (const envPath of envPaths) {
  try {
    const result = await import('dotenv').then(dotenv => dotenv.config({ path: envPath }));
    if (result.parsed && Object.keys(result.parsed).length > 0) {
      loadedEnvFile = envPath;
      console.log('✅ 環境変数ファイル読み込み成功:', envPath);
      break;
    }
  } catch (error) {
    console.log('⚠️ 環境変数ファイル読み込み失敗:', envPath, error.message);
  }
}

if (!loadedEnvFile) {
  console.log('⚠️ 環境変数ファイルが見つかりません。デフォルト値を使用します。');
  console.log('🔍 試行したパス:', envPaths);
}

// 重要な環境変数の確認
console.log('🔧 環境変数確認:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
  SESSION_SECRET: process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]',
  loadedEnvFile
});

// DATABASE_URLが設定されていない場合はエラーで停止
if (!process.env.DATABASE_URL) {
  console.error('❌ 致命的エラー: DATABASE_URLが設定されていません');
  console.error('🔧 解決方法: .envファイルを作成し、DATABASE_URLを設定してください');
  console.error('📝 例: DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance');
  process.exit(1);
}

// アプリケーションを起動
import app from './app.js';

const PORT = Number(process.env.PORT) || 3001;
const isDevelopment = process.env.NODE_ENV !== 'production';

console.log('🚀 開発サーバー起動中...');
console.log('🔧 環境設定:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: PORT,
  isDevelopment: isDevelopment
});

// サーバーを起動
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ 開発サーバーが正常に起動しました');
  console.log('🌐 サーバーURL:', `http://localhost:${PORT}`);
  console.log('🔧 開発環境:', isDevelopment ? '有効' : '無効');
  console.log('📊 ヘルスチェック:', `http://localhost:${PORT}/api/health`);
  console.log('🔐 認証デバッグ:', `http://localhost:${PORT}/api/auth/debug/env`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM受信 - サーバーをシャットダウン中...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT受信 - サーバーをシャットダウン中...');
  process.exit(0);
});