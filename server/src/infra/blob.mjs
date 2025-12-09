import { BlobServiceClient } from '@azure/storage-blob';
import { createRequire } from 'module';
import { AZURE_STORAGE_CONNECTION_STRING, AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_CONTAINER_NAME } from '../config/env.mjs';
import multer from 'multer';

const require = createRequire(import.meta.url);

export const containerName = AZURE_STORAGE_CONTAINER_NAME;

export const getBlobServiceClient = () => {
  console.log('[Blob] Initializing BLOB service client...', {
    hasConnectionString: !!(AZURE_STORAGE_CONNECTION_STRING && AZURE_STORAGE_CONNECTION_STRING.trim()),
    hasAccountName: !!(AZURE_STORAGE_ACCOUNT_NAME && AZURE_STORAGE_ACCOUNT_NAME.trim()),
    containerName: AZURE_STORAGE_CONTAINER_NAME,
    connectionStringPrefix: AZURE_STORAGE_CONNECTION_STRING ? AZURE_STORAGE_CONNECTION_STRING.substring(0, 30) + '...' : 'N/A'
  });

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

  console.error('[Blob] ❌ No connection string or account name provided.');
  console.error('[Blob] Please set AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_NAME');
  return null;
};

const BASE = (process.env.AZURE_KNOWLEDGE_BASE_PATH ?? 'knowledge-base')
  .replace(/^[\\/]+|[\\/]+$/g, '');

console.log(`[Blob] Configuration: Container=${containerName}, BasePath=${BASE}`);

export const norm = (p) => {
  const path = [BASE, String(p || '')]
    .filter(Boolean)
    .join('/')
    .replace(/\\+/g, '/')
    .replace(/\/+/g, '/');
  // console.log(`[Blob] Normalized path: ${p} -> ${path}`);
  return path;
};

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
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
