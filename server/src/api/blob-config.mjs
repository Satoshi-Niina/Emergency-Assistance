// Blob Storage 設定の共通取得・バリデーション
// 使用例: import { BLOB_CONTAINER, BLOB_PREFIX } from './blob-config.mjs';

function getEnvOrDefault(key, defaultValue) {
  const val = process.env[key];
  if (!val) {
    console.warn(
      `[BLOB_CONFIG] 環境変数 ${key} が未定義です。デフォルト値を使用します: ${defaultValue}`
    );
    return defaultValue;
  }
  return val;
}

export const BLOB_CONTAINER = getEnvOrDefault('BLOB_CONTAINER_NAME', 'knowledge');
let prefix = getEnvOrDefault('BLOB_PREFIX', '');
if (prefix && !prefix.endsWith('/')) {
  prefix += '/';
}
export const BLOB_PREFIX = prefix;
