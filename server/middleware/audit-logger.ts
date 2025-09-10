import type { Request, Response, NextFunction } from 'express';
import { trackAuditEvent } from '../telemetry/insights.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// シンプルなキュー & バッチ書き込み
const queue: string[] = [];
let flushing = false;
// Azure App Service環境ではログはコンソールに出力するか、利用可能な一時ディレクトリを使用
const logDir = process.env.NODE_ENV === 'production' && process.env.AZURE_APP_SERVICE 
  ? path.join('/tmp', 'logs') 
  : path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'audit.log');

function ensureDir() {
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  } catch (err) {
    console.warn('Cannot create log directory, using console logging:', err);
    return false;
  }
  return true;
}

async function flush() {
  if (flushing || queue.length === 0) return;
  flushing = true;
  
  const batch = queue.splice(0, queue.length).join('');
  
  // Azure環境ではログをファイルに書き込めない場合、コンソール出力にフォールバック
  if (!ensureDir()) {
    console.log('[AUDIT]', batch);
    flushing = false;
    return;
  }
  
  try {
    await fs.promises.appendFile(logFile, batch, 'utf8');
  } catch (err) {
    console.error('Audit log write failed, falling back to console:', err);
    console.log('[AUDIT]', batch);
  } finally {
    flushing = false;
  }
}

setInterval(flush, 2000).unref();

// 外部からフラッシュ要求可能にする
export async function forceAuditFlush(): Promise<void> {
  await flush();
}

export interface AuditOptions {
  tag?: string;
  maskBodyKeys?: string[];
}

export function auditLogger(options: AuditOptions = {}) {
  const { tag = 'api', maskBodyKeys = ['password', 'token'] } = options;
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    const sessionUser: string | undefined = (req.session as unknown as { userId?: string })?.userId;
    const role: string | undefined = (req.session as unknown as { userRole?: string })?.userRole;
    const xff = req.headers['x-forwarded-for'];
    const ip = (typeof xff === 'string' ? xff.split(',')[0].trim() : Array.isArray(xff) ? xff[0] : undefined) || req.socket.remoteAddress || '';
    const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : '';

    // body のコピー & マスク
    let rawBody: Record<string, unknown> | undefined;
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      rawBody = { ...(req.body as Record<string, unknown>) };
      for (const k of maskBodyKeys) if (k in rawBody) rawBody[k] = '***';
    }

  const originalJson = res.json.bind(res);
  const requestId = req.headers['x-request-id']?.toString() || randomUUID();
  res.setHeader('x-request-id', requestId);
    // 型拡張: json をラップ
    (res as Response).json = function jsonOverride(body: unknown): Response {
      const statusCode = res.statusCode;
      const duration = Date.now() - start;
      const lineObj = {
        ts: new Date().toISOString(),
        tag,
        method: req.method,
        path: req.originalUrl,
        status: statusCode,
        ms: duration,
        userId: sessionUser || null,
        role: role || null,
        ip,
        ua,
        body: rawBody || null,
        requestId,
        correlationId: req.headers['x-correlation-id'] || null
      };
  queue.push(JSON.stringify(lineObj) + '\n');
  trackAuditEvent(lineObj);
      flush();
      return originalJson(body);
    } as typeof res.json;

    next();
  };
}
