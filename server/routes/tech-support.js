// tech-support.js
// 技術サポート関連ユーティリティエンドポイント
// 目的:
//  - 一時/不要アップロードファイルのクリーンアップ
//  - ログファイルのバックアップ (削除ではなく knowledge-base/backups へ保存 + 可能なら Blob へアップロード)

const express = require('express');
const fs = require('fs');
const path = require('path');

// Blob ストレージ (存在しない場合は無視できるように try/catch)
let BlobStorageDriver = null;
try {
  // TypeScript 実装を参照 (transpile 済み想定)。無ければスキップ。
  BlobStorageDriver = require('../blob-storage.ts').BlobStorageDriver || null;
} catch (_) {
  try {
    BlobStorageDriver = require('../blob-storage.js').BlobStorageDriver || null;
  } catch (_) {
    BlobStorageDriver = null;
  }
}

const router = express.Router();

// 共通: ディレクトリ存在確保
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ============================= 一時ファイルクリーンアップ =============================
// ポリシー: uploads/ 以下で以下に該当するものを削除
//  - ディレクトリ名に temp / tmp を含む
//  - ファイル名が .tmp で終わる
//  - 72時間より前に更新された raw 一時ファイル (拡張子 .part / .upload / .incomplete)
function collectTemporaryTargets(root) {
  const targets = { files: [], dirs: [] };
  if (!fs.existsSync(root)) return targets;

  const now = Date.now();
  const THRESHOLD_MS = 72 * 60 * 60 * 1000; // 72h
  const walk = (dir) => {
    let entries = [];
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
        const stat = fs.statSync(full);
        const ageOk = (now - stat.mtimeMs) > THRESHOLD_MS && /(\.part|\.upload|\.incomplete)$/.test(lower);
        if (/(\.tmp)$/.test(lower) || ageOk) {
          targets.files.push(full);
        }
      }
    }
  };
  walk(root);
  return targets;
}

async function cleanupUploads() {
  const rootCandidates = [
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'public', 'uploads'),
  ];
  const details = [];
  let removedFiles = 0; let removedDirs = 0; let bytes = 0;
  for (const root of rootCandidates) {
    if (!fs.existsSync(root)) continue;
    const targets = collectTemporaryTargets(root);
    for (const f of targets.files) {
      try { bytes += fs.statSync(f).size; fs.unlinkSync(f); removedFiles++; details.push({ type: 'file', path: f }); } catch (e) { details.push({ type: 'file', path: f, error: String(e) }); }
    }
    for (const d of targets.dirs.sort((a,b)=>b.length-a.length)) { // 深い順
      try {
        fs.rmSync(d, { recursive: true, force: true });
        removedDirs++; details.push({ type: 'dir', path: d });
      } catch (e) {
        details.push({ type: 'dir', path: d, error: String(e) });
      }
    }
  }
  return { removedFiles, removedDirs, bytes, details };
}

router.post('/cleanup-uploads', async (_req, res) => {
  try {
    const result = await cleanupUploads();
    return res.json({ success: true, message: '一時アップロードファイルをクリーンアップしました', result });
  } catch (error) {
    console.error('[cleanup-uploads] error', error);
    return res.status(500).json({ success: false, error: 'クリーンアップに失敗しました' });
  }
});

// ============================= ログファイル バックアップ =============================
// 対象: 以下ディレクトリ配下の *.log / *.log.json / *.out / *.err
//  - ./logs
//  - ./server/logs
//  - ./server/iisnode (Azure iisnode ログディレクトリ設定)
//  - ルート直下の *.log
// 保存先: knowledge-base/backups/logs-YYYYMMDD-HHmmss/
// Blob: backups/logs-YYYYMMDD-HHmmss/<filename>

function listLogFiles() {
  const roots = [
    path.join(process.cwd(), 'logs'),
    path.join(process.cwd(), 'server', 'logs'),
    path.join(process.cwd(), 'server', 'iisnode'),
    process.cwd(),
  ];
  const seen = new Set();
  const files = [];
  const pattern = /(\.log(\.json)?|\.out|\.err)$/i;
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    let entries = [];
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

async function backupLogs() {
  const files = listLogFiles();
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').replace(/\..+/, '').slice(0, 14); // YYYYMMDDHHMMSS
  const backupBase = path.join(process.cwd(), 'knowledge-base', 'backups');
  ensureDir(backupBase);
  const backupDirName = `logs-${timestamp}`;
  const backupDir = path.join(backupBase, backupDirName);
  ensureDir(backupDir);

  let totalSize = 0; const copied = [];
  for (const f of files) {
    try {
      const stat = fs.statSync(f);
      const dest = path.join(backupDir, path.basename(f));
      fs.copyFileSync(f, dest);
      totalSize += stat.size;
      copied.push({ source: f, dest, bytes: stat.size });
    } catch (e) {
      copied.push({ source: f, error: String(e) });
    }
  }

  // Blob へアップロード (任意)
  let blob = { enabled: false, uploaded: 0, errors: [] };
  if (BlobStorageDriver) {
    try {
      const driver = new BlobStorageDriver();
      await driver.initialize?.();
      blob.enabled = true;
      for (const c of copied.filter(c => !c.error)) {
        try {
          const data = fs.readFileSync(c.dest);
            // パス: backups/logs-<timestamp>/<filename>
          const key = path.posix.join('backups', backupDirName, path.basename(c.dest));
          await driver.write(key, data);
          blob.uploaded++;
        } catch (e) {
          blob.errors.push(String(e));
        }
      }
    } catch (e) {
      blob.errors.push('Blob init failed: ' + String(e));
    }
  }

  return { backupDir, backupDirName, count: copied.filter(c => !c.error).length, totalSize, copied, blob };
}

router.post('/cleanup-logs', async (_req, res) => { // 旧エンドポイント名を維持
  try {
    const result = await backupLogs();
    return res.json({
      success: true,
      mode: 'backup',
      backupCount: result.count,
      totalSize: result.totalSize,
      backupDir: path.relative(process.cwd(), result.backupDir),
      blob: result.blob,
      details: result.copied,
    });
  } catch (error) {
    console.error('[backup-logs] error', error);
    return res.status(500).json({ success: false, error: 'ログバックアップに失敗しました' });
  }
});

module.exports = router;
