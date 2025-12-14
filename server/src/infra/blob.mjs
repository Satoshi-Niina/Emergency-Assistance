import { BlobServiceClient } from '@azure/storage-blob';
import { createRequire } from 'module';
import { AZURE_STORAGE_CONNECTION_STRING, AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_CONTAINER_NAME, BLOB_PREFIX } from '../config/env.mjs';
import multer from 'multer';

const require = createRequire(import.meta.url);

export const containerName = AZURE_STORAGE_CONTAINER_NAME;

export const getBlobServiceClient = () => {
  const isLocalMode = process.env.STORAGE_MODE === 'local';
  
  if (!isLocalMode) {
    console.log('[Blob] Initializing BLOB service client...', {
      hasConnectionString: !!(AZURE_STORAGE_CONNECTION_STRING && AZURE_STORAGE_CONNECTION_STRING.trim()),
      hasAccountName: !!(AZURE_STORAGE_ACCOUNT_NAME && AZURE_STORAGE_ACCOUNT_NAME.trim()),
      containerName: AZURE_STORAGE_CONTAINER_NAME,
      connectionStringPrefix: AZURE_STORAGE_CONNECTION_STRING ? AZURE_STORAGE_CONNECTION_STRING.substring(0, 30) + '...' : 'N/A'
    });
  }

  if (AZURE_STORAGE_CONNECTION_STRING && AZURE_STORAGE_CONNECTION_STRING.trim()) {
    const connStr = AZURE_STORAGE_CONNECTION_STRING.trim();
    
    // 接続文字列の基本的な検証
    if (!connStr.includes('AccountName=') || !connStr.includes('AccountKey=')) {
      console.error('[Blob] ❌ Invalid connection string format. Missing AccountName or AccountKey');
      console.error('[Blob] Connection string should contain: AccountName=xxx;AccountKey=xxx');
      return null;
    }
    
    try {
      console.log('[Blob] Using connection string authentication');
      const client = BlobServiceClient.fromConnectionString(connStr);
      console.log('[Blob] ✅ BLOB service client created successfully');
      return client;
    } catch (error) {
      console.error('[Blob] ❌ Client initialization failed:', error.message);
      console.error('[Blob] Error name:', error.name);
      console.error('[Blob] Error code:', error.code);
      console.error('[Blob] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      return null;
    }
  }

  if (AZURE_STORAGE_ACCOUNT_NAME && AZURE_STORAGE_ACCOUNT_NAME.trim()) {
    console.log('[Blob] Trying Managed Identity authentication...');
    try {
      const { DefaultAzureCredential } = require('@azure/identity');
      const credential = new DefaultAzureCredential();
      const client = new BlobServiceClient(
        `https://${AZURE_STORAGE_ACCOUNT_NAME.trim()}.blob.core.windows.net`,
        credential
      );
      console.log('[Blob] ✅ BLOB service client created with Managed Identity');
      return client;
    } catch (error) {
      console.error('[Blob] ❌ Managed Identity initialization failed:', error.message);
      console.error('[Blob] Error details:', error);
      return null;
    }
  }

  if (isLocalMode) {
    console.log('[Blob] ℹ️ Local mode - BLOB client not required');
    return null;
  }

  // エラー詳細を収集してログに出力
  const errors = [];
  
  if (!AZURE_STORAGE_CONNECTION_STRING && !AZURE_STORAGE_ACCOUNT_NAME) {
    errors.push('No connection string or account name provided');
  }

  console.error('[Blob] ❌ Failed to initialize Blob Service Client');
  console.error('[Blob] Reasons:', errors.join(', '));
  console.error('[Blob] Environment Status:', {
    NODE_ENV: process.env.NODE_ENV,
    STORAGE_MODE: process.env.STORAGE_MODE,
    HAS_CONN_STRING: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
    HAS_ACCOUNT_NAME: !!process.env.AZURE_STORAGE_ACCOUNT_NAME
  });
  
  return null;
};

// ローカル環境以外で設定ログを出力
if (process.env.STORAGE_MODE !== 'local') {
  console.log(`[Blob] Configuration: Container=${containerName}, BlobPrefix='${BLOB_PREFIX}'`);
}

export const norm = (p) => {
  const path = [BLOB_PREFIX, String(p || '')]
    .filter(Boolean)
    .join('/')
    .replace(/\\+/g, '/')
    .replace(/\/+/g, '/');
  
  // ローカル環境以外でログ出力
  if (process.env.STORAGE_MODE !== 'local') {
    console.log(`[Blob] Normalized path: ${p} -> ${path}`);
  }
  
  return path;
};

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

export async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}
