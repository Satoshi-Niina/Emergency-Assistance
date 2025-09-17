// Blob Storage 設定の共通取得・バリデーション
// 使用例: const { BLOB_CONTAINER, BLOB_PREFIX } = require('./blob-config');

function getEnvOrThrow(key) {
  const val = process.env[key];
  if (!val) {
    throw new Error(`[BLOB_CONFIG] 環境変数 ${key} が未定義です`);
  }
  return val;
}

const BLOB_CONTAINER = getEnvOrThrow('BLOB_CONTAINER_NAME');
let BLOB_PREFIX = getEnvOrThrow('BLOB_PREFIX');
if (!BLOB_PREFIX.endsWith('/')) {
  BLOB_PREFIX += '/';
}

module.exports = {
  BLOB_CONTAINER,
  BLOB_PREFIX,
};
