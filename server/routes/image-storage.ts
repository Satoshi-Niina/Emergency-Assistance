import { Router } from 'express';
import { db } from '../db';
import { imageData } from '../db/schema';
import { eq, like } from 'drizzle-orm';

const router = Router();

// 画像データをアップロード
router.post('/upload', async (req, res) => {
    try {
        const { fileName, originalFileName, mimeType, fileSize, data, category, description } = req.body;

        if (!fileName || !originalFileName || !mimeType || !fileSize || !data) {
            return res.status(400).json({ error: '必要なフィールドが不足しています' });
        }

        const result = await db.insert(imageData).values({
            fileName,
            originalFileName,
            mimeType,
            fileSize: fileSize.toString(),
            data,
            category,
            description
        }).returning();

        res.json({ success: true, imageId: result[0].id });
    } catch (error) {
        console.error('画像アップロードエラー:', error);
        res.status(500).json({ error: '画像のアップロードに失敗しました' });
    }
});

// 画像データを取得
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.select().from(imageData).where(eq(imageData.id, id));

        if (result.length === 0) {
            return res.status(404).json({ error: '画像が見つかりません' });
        }

        const image = result[0];
        res.setHeader('Content-Type', image.mimeType);
        res.setHeader('Content-Length', image.fileSize);
        res.send(Buffer.from(image.data, 'base64'));
    } catch (error) {
        console.error('画像取得エラー:', error);
        res.status(500).json({ error: '画像の取得に失敗しました' });
    }
});

// カテゴリ別の画像一覧を取得
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const result = await db.select({
            id: imageData.id,
            fileName: imageData.fileName,
            originalFileName: imageData.originalFileName,
            mimeType: imageData.mimeType,
            fileSize: imageData.fileSize,
            category: imageData.category,
            description: imageData.description,
            createdAt: imageData.createdAt
        }).from(imageData).where(eq(imageData.category, category));

        res.json(result);
    } catch (error) {
        console.error('画像一覧取得エラー:', error);
        res.status(500).json({ error: '画像一覧の取得に失敗しました' });
    }
});

// 画像データを削除
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.delete(imageData).where(eq(imageData.id, id)).returning();

        if (result.length === 0) {
            return res.status(404).json({ error: '画像が見つかりません' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('画像削除エラー:', error);
        res.status(500).json({ error: '画像の削除に失敗しました' });
    }
});

// 画像データを検索
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const result = await db.select({
            id: imageData.id,
            fileName: imageData.fileName,
            originalFileName: imageData.originalFileName,
            mimeType: imageData.mimeType,
            fileSize: imageData.fileSize,
            category: imageData.category,
            description: imageData.description,
            createdAt: imageData.createdAt
        }).from(imageData).where(
            like(imageData.originalFileName, `%${query}%`)
        );

        res.json(result);
    } catch (error) {
        console.error('画像検索エラー:', error);
        res.status(500).json({ error: '画像の検索に失敗しました' });
    }
});

export default router; 