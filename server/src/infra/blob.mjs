import { AZURE_STORAGE_CONTAINER_NAME, BLOB_PREFIX } from '../config/env.mjs';
import multer from 'multer';

export const containerName = AZURE_STORAGE_CONTAINER_NAME;

export const getBlobServiceClient = () => {
  console.log('[Blob] Azure blob storage is disabled in this Cloud Run deployment.');
  return null;
};

export const norm = (p) => {
  const path = [BLOB_PREFIX, String(p || '')]
    .filter(Boolean)
    .join('/')
    .replace(/\\+/g, '/')
    .replace(/\/+/g, '/');
  return path;
};

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB制限
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
