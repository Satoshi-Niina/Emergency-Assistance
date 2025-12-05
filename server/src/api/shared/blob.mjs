import { BlobServiceClient } from '@azure/storage-blob';
import { BLOB_CONTAINER, BLOB_PREFIX } from '../blob-config.mjs';

// Blob Service Clientを取得する関数
export function getBlobServiceClient() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    console.warn('AZURE_STORAGE_CONNECTION_STRING is not set');
    return null;
  }
  return BlobServiceClient.fromConnectionString(connectionString);
}

// パスを正規化する関数
export function norm(p) {
  return p.replace(/\\/g, '/');
}

// コンテナ名のエクスポート
export const containerName = BLOB_CONTAINER;

// アップロードミドルウェアのモック (必要なら実装)
// MulterはESMで直接使うのが難しいため、ここではプレースホルダー
export const upload = {
  single: (fieldName) => (req, res, next) => {
    console.warn('Upload middleware not fully implemented in ESM shared module');
    next();
  }
};
