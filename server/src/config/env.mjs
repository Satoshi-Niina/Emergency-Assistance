import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../'); // server root

// 環境変数の読み込み
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';
const envPath = path.join(rootDir, envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`[Config] Loaded environment from ${envFile}`);
} else {
  const fallbackPath = path.join(rootDir, '.env');
  if (fs.existsSync(fallbackPath)) {
    dotenv.config({ path: fallbackPath });
    console.log(`[Config] Loaded environment from .env (fallback)`);
  } else {
    console.warn(`[Config] No environment file found.`);
  }
}

// 定数定義
const cleanEnvValue = (value) => {
  if (!value) return null;
  return value.trim().replace(/^["']|["']$/g, '').trim();
};

export const FRONTEND_URL = cleanEnvValue(
  process.env.FRONTEND_URL ||
  process.env.STATIC_WEB_APP_URL ||
  'http://localhost:5173'
) || 'http://localhost:5173';

export const STATIC_WEB_APP_URL = cleanEnvValue(
  process.env.STATIC_WEB_APP_URL ||
  process.env.FRONTEND_URL ||
  'http://localhost:5173'
) || 'http://localhost:5173';

export const PORT = Number(process.env.PORT || 8080);
export const HEALTH_TOKEN = process.env.HEALTH_TOKEN || '';
export const NODE_ENV = process.env.NODE_ENV || 'production';
export const VERSION = '2025-12-05T12:00:00+09:00'; // Updated

export const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
export const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
export const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';

// BLOBパスのプレフィックス（実際のBLOB構造に合わせる）
// Azure環境変数: BLOB_PREFIX または AZURE_KNOWLEDGE_BASE_PATH
// デフォルト: 空文字列（knowledge-base/プレフィックスなし）
export const BLOB_PREFIX = (process.env.BLOB_PREFIX ?? process.env.AZURE_KNOWLEDGE_BASE_PATH ?? '')
  .replace(/^[\\/]+|[\\/]+$/g, ''); // 前後のスラッシュとバックスラッシュを削除

console.log(`[Config] BLOB_PREFIX='${BLOB_PREFIX}' (length: ${BLOB_PREFIX.length})`);

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const DATABASE_URL = process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.AZURE_POSTGRESQL_CONNECTIONSTRING;

export const PG_SSL = process.env.PG_SSL;

export const SESSION_SECRET = process.env.SESSION_SECRET || 'azure-production-fallback-secret-key-2025';

if (!process.env.SESSION_SECRET) {
  console.warn('[Config] ⚠️ SESSION_SECRET is not set in environment variables. Using fallback secret.');
}

// チャットエクスポートを自動でナレッジに取り込むか（デフォルト: false）
export const AUTO_INGEST_CHAT_EXPORTS =
  (process.env.AUTO_INGEST_CHAT_EXPORTS || '').toLowerCase() === 'true';

// ストレージモード判定
export const STORAGE_MODE = process.env.STORAGE_MODE || 'auto';

// Azure環境かどうかを判定する統一関数
export function isAzureEnvironment() {
  if (STORAGE_MODE === 'azure' || STORAGE_MODE === 'blob') {
    return true;
  }
  if (STORAGE_MODE === 'local') {
    return false;
  }
  return false;
}
