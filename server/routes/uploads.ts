import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
console.log('[routes][uploads] module loaded');

const router = express.Router();

// 保存ディレクトリ設定
const uploadRoot = path.join(process.cwd(), 'uploads');
const chatDir = path.join(uploadRoot, 'chat');

function ensureDirs() {
  if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });
  if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir, { recursive: true });
}

ensureDirs();

// Multer ストレージ
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDirs();
    cb(null, chatDir);
  },
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safeOriginal = file.originalname.replace(/[^A-Za-z0-9_.-]/g, '_');
    cb(null, `${ts}_${safeOriginal}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 制限（必要なら調整）
  },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype) || /^video\//.test(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('許可されていないファイルタイプです'));
  }
});

// GET /api/uploads/ping (存在確認用)
router.get('/ping', (_req, res) => {
  res.json({ ok: true, route: 'uploads', ts: new Date().toISOString() });
});

// POST /api/uploads/image 画像・動画アップロード
router.post('/image', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'ファイルがありません' });
    }
    const relPath = path.posix.join('/api/uploads/image', req.file.filename); // 取得用エンドポイント
    return res.json({
      success: true,
      fileName: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype,
      url: relPath
    });
  } catch (e) {
    console.error('アップロードエラー:', e);
    return res.status(500).json({ success: false, message: 'アップロードに失敗しました' });
  }
});

// GET /api/uploads/image/:fileName 取得
router.get('/image/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(chatDir, fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'ファイルが見つかりません' });
  }
  res.sendFile(filePath);
});

// デバッグ用: 一覧表示 (ファイル名のみ)
router.get('/list', (_req, res) => {
  try {
    ensureDirs();
    const files = fs.readdirSync(chatDir).filter(f => !f.startsWith('.'));
    res.json({ success: true, count: files.length, files });
  } catch (e) {
    res.status(500).json({ success: false, message: 'list失敗' });
  }
});

export default router;
