import { Router } from 'express';
import { db } from '../db/index.js';
import { imageData } from '../db/schema.js';
import { eq, like } from 'drizzle-orm';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();

// 画像データをアップロード
// multipart/form-data対応の画像アップロード
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('image'), async (_req, res) => {
  try {
    if (!_req.file) {
      return res.status(400).json({ error: '画像ファイルがありません' });
    }
    const imagesDir = process.env.CHAT_IMAGES_PATH
      ? path.resolve(process.cwd(), process.env.CHAT_IMAGES_PATH)
      : path.join(__dirname, '../../knowledge-base/images/chat-exports');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    const fileName = `chat_image_${Date.now()}.png`;
    const filePath = path.join(imagesDir, fileName);
    fs.writeFileSync(filePath, _req.file.buffer);
    const imageUrl = `/api/images/chat-exports/${fileName}`;
    res.json({ success: true, url: imageUrl, fileName });
  } catch (error) {
    res.status(500).json({ error: '画像のアップロードに失敗しました' });
  }
});

// 画像データを取得
router.get('/:id', async (_req, res) => {
  try {
    const { id } = _req.params;
    const result = await db
      .select()
      .from(imageData)
      .where(eq(imageData.id, id));

    if (result.length === 0) {
      return res.status(404).json({ error: '画像が見つかりません' });
    }

    const image = result[0];
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Content-Length', image.fileSize);
    res.send(Buffer.from(image.data, 'base64'));
  } catch (error) {
    res.status(500).json({ error: '画像の取得に失敗しました' });
  }
});

// カテゴリ別の画像一覧を取得
router.get('/category/:category', async (_req, res) => {
  try {
    const { category } = _req.params;
    const result = await db
      .select({
        id: imageData.id,
        fileName: imageData.fileName,
        originalFileName: imageData.originalFileName,
        mimeType: imageData.mimeType,
        fileSize: imageData.fileSize,
        category: imageData.category,
        description: imageData.description,
        createdAt: imageData.createdAt,
      })
      .from(imageData)
      .where(eq(imageData.category, category));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '画像一覧の取得に失敗しました' });
  }
});

// 画像データを削除
router.delete('/:id', async (_req, res) => {
  try {
    const { id } = _req.params;
    const result = await db
      .delete(imageData)
      .where(eq(imageData.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: '画像が見つかりません' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '画像の削除に失敗しました' });
  }
});

// 画像ファイルを提供（knowledge-base/images/chat-exports/から）
router.get('/chat-exports/:filename', async (_req, res) => {
  try {
    const { filename } = _req.params;
    const imagesDir = process.env.CHAT_IMAGES_PATH
      ? path.resolve(process.cwd(), process.env.CHAT_IMAGES_PATH)
      : path.join(__dirname, '../../knowledge-base/images/chat-exports');
    const imagePath = path.join(imagesDir, filename);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: '画像ファイルが見つかりません' });
    }

    const ext = path.extname(filename).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    const fileStream = fs.createReadStream(imagePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: '画像ファイルの提供に失敗しました' });
  }
});

// 画像データを検索
router.get('/search/:query', async (_req, res) => {
  try {
    const { query } = _req.params;
    const result = await db
      .select({
        id: imageData.id,
        fileName: imageData.fileName,
        originalFileName: imageData.originalFileName,
        mimeType: imageData.mimeType,
        fileSize: imageData.fileSize,
        category: imageData.category,
        description: imageData.description,
        createdAt: imageData.createdAt,
      })
      .from(imageData)
      .where(like(imageData.originalFileName, `%${query}%`));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '画像の検索に失敗しました' });
  }
});

export default router;
module.exports = router;
