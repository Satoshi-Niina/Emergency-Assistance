import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';

const router = express.Router();

/**
 * POST /api/logs/backup
 * ログファイルをzip圧縮してbackupsディレクトリへ保存
 * body: { files: string[] }
 */
router.post('/backup', async (_req, res) => {
  try {
    const { files } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, error: 'ファイルリストが空です' });
    }
    const logsDir = path.resolve(__dirname, '../../logs');
    const backupDir = path.resolve(logsDir, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipName = `logs-backup-${timestamp}.zip`;
    const zipPath = path.join(backupDir, zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);
    for (const file of files) {
      const filePath = path.join(logsDir, file);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file });
      }
    }
    await archive.finalize();
    output.on('close', () => {
      res.json({ success: true, backup: zipName, size: archive.pointer() });
    });
    output.on('error', err => {
      res.status(500).json({ success: false, error: err.message });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
