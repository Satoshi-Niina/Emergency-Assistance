/**
 * 監査ログローテーション + Azure Blob へのアップロード
 * 環境変数:
 *  AUDIT_LOG_ROTATE_MAX_BYTES (デフォルト 5_000_000)
 *  AUDIT_LOG_ROTATE_INTERVAL_SEC (デフォルト 300)
 *  AUDIT_LOG_CONTAINER (デフォルト 'audit-logs')
 *  AUDIT_LOG_ROTATION_ENABLED ('false' で無効)
 */
import fs from 'fs';
import path from 'path';
import { BlobServiceClient } from '@azure/storage-blob';
import { forceAuditFlush } from '../middleware/audit-logger.js';
import zlib from 'zlib';

const baseDir = path.join(process.cwd(), 'logs');
const auditFile = path.join(baseDir, 'audit.log');
let rotating = false;

function getConfig() {
  const container = process.env.AUDIT_LOG_CONTAINER || 'audit-logs';
  // パスプリフィックス: 明示指定 > knowledge コンテナ特別扱い > 既定(空)
  let prefix = process.env.AUDIT_LOG_PATH_PREFIX;
  if (!prefix) {
    if (container === 'knowledge') {
      prefix = 'userlog/';
    } else {
      prefix = '';
    }
  }
  if (prefix && !prefix.endsWith('/')) prefix += '/';
  return {
    maxBytes: Number(process.env.AUDIT_LOG_ROTATE_MAX_BYTES || 5_000_000),
    intervalSec: Number(process.env.AUDIT_LOG_ROTATE_INTERVAL_SEC || 300),
    container,
    pathPrefix: prefix,
    enabled: process.env.AUDIT_LOG_ROTATION_ENABLED !== 'false',
    compress: process.env.AUDIT_LOG_COMPRESS !== 'false'
  } as const;
}

async function uploadToBlob(filePath: string, blobName: string) {
  if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
    return; // Azure 未設定ならスキップ
  }
  try {
  const cfg = getConfig();
  const service = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = service.getContainerClient(cfg.container);
    await containerClient.createIfNotExists({ access: 'container' });
  const fullName = `${cfg.pathPrefix}${blobName}`;
  const client = containerClient.getBlockBlobClient(fullName);
    await client.uploadFile(filePath, {
      blobHTTPHeaders: { blobContentType: 'text/plain' }
    });
  console.log(`☁️  Rotated audit log uploaded to blob: ${cfg.container}/${fullName}`);
  } catch (e) {
    console.warn('⚠️  Audit log upload failed:', (e as Error).message);
  }
}

async function rotateIfNeeded() {
  const { maxBytes, enabled } = getConfig();
  if (!enabled) return;
  if (rotating) return;
  try {
    const stat = fs.existsSync(auditFile) ? fs.statSync(auditFile) : null;
    if (!stat) return;
    if (stat.size < maxBytes) return; // 閾値未満
    rotating = true;
    await forceAuditFlush();
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedName = `audit-${ts}.log`;
    const rotatedPath = path.join(baseDir, rotatedName);
    fs.renameSync(auditFile, rotatedPath);
    console.log(`🔄 Audit log rotated: ${rotatedName}`);
    const cfg = getConfig();
    if (cfg.compress) {
      const gzPath = rotatedPath + '.gz';
      await new Promise<void>((resolve, reject) => {
        const src = fs.createReadStream(rotatedPath);
        const dest = fs.createWriteStream(gzPath);
        const gzip = zlib.createGzip();
        src.pipe(gzip).pipe(dest).on('finish', resolve).on('error', reject);
      });
      console.log(`🗜  Compressed audit log: ${path.basename(gzPath)}`);
      await uploadToBlob(gzPath, rotatedName + '.gz');
      // 元ファイル削除
      try { fs.unlinkSync(rotatedPath); } catch {}
    } else {
      await uploadToBlob(rotatedPath, rotatedName);
    }
  } catch (e) {
    console.error('Audit rotation error:', e);
  } finally {
    rotating = false;
  }
}

export function startAuditRotation() {
  const { intervalSec, enabled } = getConfig();
  if (!enabled) {
    console.log('ℹ️  Audit log rotation disabled');
    return;
  }
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
  console.log(`🗂  Audit log rotation started (every ${intervalSec}s)`);
  setInterval(rotateIfNeeded, intervalSec * 1000).unref();
}
