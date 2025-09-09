// tech-support.ts
// 技術サポート関連ユーティリティエンドポイント
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';

// Blob ストレージ (任意)
// 動的ロードのため型は unknown で保持し、使用時に安全にチェック
// eslint-disable-next-line @typescript-eslint/ban-types
let BlobStorageDriver: (new () => { initialize?: () => Promise<void>; write: (key: string, data: Buffer) => Promise<void> }) | null = null;
try {
  // transpile後の ts -> js 解決も許容 (ts-node/tsx 実行時は .ts 可)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../blob-storage');
  BlobStorageDriver = (mod.BlobStorageDriver as typeof BlobStorageDriver) || null;
} catch (_) {
  BlobStorageDriver = null;
}

const router = Router();

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ============================= 一時ファイルクリーンアップ =============================
interface CleanupResult {
  removedFiles: number;
  removedDirs: number;
  bytes: number;
  details: Array<{ type: 'file' | 'dir'; path: string; error?: string }>;
}

function collectTemporaryTargets(root: string) {
  const targets: { files: string[]; dirs: string[] } = { files: [], dirs: [] };
  if (!fs.existsSync(root)) return targets;
  const now = Date.now();
  const THRESHOLD_MS = 72 * 60 * 60 * 1000; // 72h
  const walk = (dir: string) => {
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (/tmp|temp/i.test(ent.name)) {
          targets.dirs.push(full);
        } else {
          walk(full);
        }
      } else if (ent.isFile()) {
        const lower = ent.name.toLowerCase();
        let stat: fs.Stats;
        try { stat = fs.statSync(full); } catch { continue; }
        const ageOk = (now - stat.mtimeMs) > THRESHOLD_MS && /(\.part|\.upload|\.incomplete)$/.test(lower);
        if (/\.tmp$/.test(lower) || ageOk) {
          targets.files.push(full);
        }
      }
    }
  };
  walk(root);
  return targets;
}

async function cleanupUploads(): Promise<CleanupResult> {
  const rootCandidates = [
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'public', 'uploads'),
  ];
  const details: CleanupResult['details'] = [];
  let removedFiles = 0; let removedDirs = 0; let bytes = 0;
  for (const root of rootCandidates) {
    if (!fs.existsSync(root)) continue;
    const targets = collectTemporaryTargets(root);
    for (const f of targets.files) {
      try { bytes += fs.statSync(f).size; fs.unlinkSync(f); removedFiles++; details.push({ type: 'file', path: f }); } catch (e) { details.push({ type: 'file', path: f, error: String(e) }); }
    }
    for (const d of targets.dirs.sort((a,b)=>b.length-a.length)) { // 深い順
      try { fs.rmSync(d, { recursive: true, force: true }); removedDirs++; details.push({ type: 'dir', path: d }); } catch (e) { details.push({ type: 'dir', path: d, error: String(e) }); }
    }
  }
  return { removedFiles, removedDirs, bytes, details };
}

router.post('/cleanup-uploads', async (_req, res) => {
  try {
    const result = await cleanupUploads();
    // ターゲットが0でも成功扱い
    return res.json({
      success: true,
      message: result.removedFiles + result.removedDirs > 0
        ? '一時アップロードファイルをクリーンアップしました'
        : '削除対象はありません (クリーンな状態です)',
      result
    });
  } catch (error) {
    console.error('[cleanup-uploads] error', error);
    return res.status(500).json({ success: false, error: 'クリーンアップに失敗しました', details: String(error) });
  }
});

// ============================= ログファイル バックアップ =============================
interface BackupResult {
  backupDir: string;            // 実際に今回格納した月次フォルダ
  monthKey: string;             // YYYY-MM
  count: number;                // コピー成功ファイル数
  totalSize: number;            // 合計バイト
  copied: Array<{ source: string; dest?: string; bytes?: number; deleted?: boolean; error?: string }>;
  blob: { enabled: boolean; uploaded: number; errors: string[] };
  retention: { kept: string[]; removed: string[]; configuredMonths: number };
}

function listLogFiles(): string[] {
  const roots = [
    path.join(process.cwd(), 'logs'),
    path.join(process.cwd(), 'server', 'logs'),
    path.join(process.cwd(), 'server', 'iisnode'),
    process.cwd(),
  ];
  const seen = new Set<string>();
  const files: string[] = [];
  const pattern = /(\.log(\.json)?|\.out|\.err)$/i;
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(r, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      if (!pattern.test(ent.name)) continue;
      const full = path.join(r, ent.name);
      if (seen.has(full)) continue;
      seen.add(full);
      files.push(full);
    }
  }
  return files;
}

async function backupLogs(): Promise<BackupResult> {
  const files = listLogFiles();
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`; // YYYY-MM
  const timestamp = now.toISOString().replace(/[-:T]/g, '').replace(/\..+/, '').slice(0, 14);
  const backupsRoot = path.join(process.cwd(), 'knowledge-base', 'backups');
  const logRoot = path.join(backupsRoot, 'log'); // 指定: log フォルダ固定
  ensureDir(logRoot);
  const monthDir = path.join(logRoot, monthKey);
  ensureDir(monthDir);
  let totalSize = 0; const copied: BackupResult['copied'] = [];

  for (const f of files) {
    try {
      const stat = fs.statSync(f);
      const originalName = path.basename(f);
      const baseName = `${timestamp}__${originalName}`;
      const zipPath = path.join(monthDir, baseName + '.zip');

      // ハッシュ計算 (元ファイル)
      const rawBuffer = fs.readFileSync(f);
      const sourceHash = crypto.createHash('sha256').update(rawBuffer).digest('hex');

      // ZIP 作成
      const zip = new AdmZip();
      zip.addFile(originalName, rawBuffer, undefined, 0o644);
      zip.writeZip(zipPath);

      // ZIP 展開せず内容確認: エントリ抽出してハッシュ再計算
      let verified = false;
      try {
        const checkZip = new AdmZip(zipPath);
        const entry = checkZip.getEntry(originalName);
        if (entry) {
          const extracted = entry.getData();
          const extractedHash = crypto.createHash('sha256').update(extracted).digest('hex');
            verified = extractedHash === sourceHash;
        }
      } catch (verErr) {
        copied.push({ source: f, dest: zipPath, bytes: stat.size, deleted: false, error: '検証失敗: ' + String(verErr) });
        continue;
      }

      if (!verified) {
        copied.push({ source: f, dest: zipPath, bytes: stat.size, deleted: false, error: 'ハッシュ不一致のためスキップ' });
        continue;
      }

      totalSize += stat.size;
      // 検証成功後に元ログ削除
      try {
        fs.unlinkSync(f);
        copied.push({ source: f, dest: zipPath, bytes: stat.size, deleted: true });
      } catch (delErr) {
        copied.push({ source: f, dest: zipPath, bytes: stat.size, deleted: false, error: '削除失敗: ' + String(delErr) });
      }
    } catch (e) {
      copied.push({ source: f, error: String(e) });
    }
  }

  // Retention: keep last N months
  const retentionMonths = Number(process.env.LOG_BACKUP_RETENTION_MONTHS || '6');
  const monthsDirs = (fs.existsSync(logRoot) ? fs.readdirSync(logRoot, { withFileTypes: true }) : [])
    .filter(d => d.isDirectory() && /^\d{4}-\d{2}$/.test(d.name))
    .map(d => d.name)
    .sort();
  const toRemove = monthsDirs.slice(0, Math.max(0, monthsDirs.length - retentionMonths));
  const removed: string[] = [];
  for (const m of toRemove) {
    const target = path.join(logRoot, m);
    try { fs.rmSync(target, { recursive: true, force: true }); removed.push(m); } catch (e) { /* ignore */ }
  }
  const kept = monthsDirs.filter(m => !removed.includes(m));

  const blob: BackupResult['blob'] = { enabled: false, uploaded: 0, errors: [] };
  if (BlobStorageDriver) {
    try {
      const driver = new BlobStorageDriver();
      await driver.initialize?.();
      blob.enabled = true;
      const uploadWithRetry = async (key: string, data: Buffer, max = 3) => {
        let lastErr: unknown;
        for (let attempt = 1; attempt <= max; attempt++) {
          try { await driver.write(key, data); return true; } catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 250 * attempt)); }
        }
        blob.errors.push(`upload failed (${key}): ${String(lastErr)}`);
        return false;
      };
      for (const c of copied.filter(c => !c.error && c.dest)) {
        try {
          const data = fs.readFileSync(c.dest!);
          const relative = path.relative(backupsRoot, c.dest!).split(path.sep).join('/');
          const ok = await uploadWithRetry(relative, data);
          if (ok) blob.uploaded++;
        } catch (e) {
          blob.errors.push(String(e));
        }
      }
    } catch (e) {
      blob.errors.push('Blob init failed: ' + String(e));
    }
  }

  return {
    backupDir: monthDir,
    monthKey,
    count: copied.filter(c => !c.error).length,
    totalSize,
    copied,
    blob,
    retention: { kept, removed, configuredMonths: retentionMonths }
  };
}

router.post('/cleanup-logs', async (_req, res) => {
  try {
    const result = await backupLogs();
    return res.json({
      success: true,
      mode: 'monthly-backup',
      backupCount: result.count,
      month: result.monthKey,
      totalSize: result.totalSize,
      backupDir: path.relative(process.cwd(), result.backupDir),
      blob: result.blob,
      retention: result.retention,
      details: result.copied,
    });
  } catch (error) {
    console.error('[backup-logs] error', error);
    return res.status(500).json({ success: false, error: 'ログバックアップに失敗しました' });
  }
});

export default router;
