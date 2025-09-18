// Blob Storage 設定の共通取得・バリデーション
// 使用例: const { BLOB_CONTAINER, BLOB_PREFIX } = require('./blob-config');

function getEnvOrDefault(key, defaultValue) {
  const val = process.env[key];
  if (!val) {
    console.warn(`[BLOB_CONFIG] 環境変数 ${key} が未定義です。デフォルト値を使用します: ${defaultValue}`);
    return defaultValue;
  }
  return val;
}

const BLOB_CONTAINER = getEnvOrDefault('BLOB_CONTAINER_NAME', 'knowledge');
let BLOB_PREFIX = getEnvOrDefault('BLOB_PREFIX', '');
if (!BLOB_PREFIX.endsWith('/')) {
  BLOB_PREFIX += '/';
}

module.exports = {
  BLOB_CONTAINER,
  BLOB_PREFIX,
};
