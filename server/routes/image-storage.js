"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
// 画像データをアップロード
router.post('/upload', async (_req, res) => {
    try {
        const { fileName, originalFileName, mimeType, fileSize, data, category, description, } = req.body;
        if (!fileName || !originalFileName || !mimeType || !fileSize || !data) {
            return res
                .status(400)
                .json({ error: '必要なフィールドが不足しています' });
        }
        const result = await index_js_1.db
            .insert(schema_js_1.imageData)
            .values({
            fileName,
            originalFileName,
            filePath: `uploads/images/${fileName}`,
            mimeType,
            fileSize: fileSize.toString(),
            data,
            category,
            description,
        })
            .returning();
        res.json({ success: true, imageId: result[0].id });
    }
    catch (error) {
        console.error('画像アップロードエラー:', error);
        res.status(500).json({ error: '画像のアップロードに失敗しました' });
    }
});
// 画像データを取得
router.get('/:id', async (_req, res) => {
    try {
        const { id } = req.params;
        const result = await index_js_1.db
            .select()
            .from(schema_js_1.imageData)
            .where((0, drizzle_orm_1.eq)(schema_js_1.imageData.id, id));
        if (result.length === 0) {
            return res.status(404).json({ error: '画像が見つかりません' });
        }
        const image = result[0];
        res.setHeader('Content-Type', image.mimeType);
        res.setHeader('Content-Length', image.fileSize);
        res.send(Buffer.from(image.data, 'base64'));
    }
    catch (error) {
        console.error('画像取得エラー:', error);
        res.status(500).json({ error: '画像の取得に失敗しました' });
    }
});
// カテゴリ別の画像一覧を取得
router.get('/category/:category', async (_req, res) => {
    try {
        const { category } = req.params;
        const result = await index_js_1.db
            .select({
            id: schema_js_1.imageData.id,
            fileName: schema_js_1.imageData.fileName,
            originalFileName: schema_js_1.imageData.originalFileName,
            mimeType: schema_js_1.imageData.mimeType,
            fileSize: schema_js_1.imageData.fileSize,
            category: schema_js_1.imageData.category,
            description: schema_js_1.imageData.description,
            createdAt: schema_js_1.imageData.createdAt,
        })
            .from(schema_js_1.imageData)
            .where((0, drizzle_orm_1.eq)(schema_js_1.imageData.category, category));
        res.json(result);
    }
    catch (error) {
        console.error('画像一覧取得エラー:', error);
        res.status(500).json({ error: '画像一覧の取得に失敗しました' });
    }
});
// 画像データを削除
router.delete('/:id', async (_req, res) => {
    try {
        const { id } = req.params;
        const result = await index_js_1.db
            .delete(schema_js_1.imageData)
            .where((0, drizzle_orm_1.eq)(schema_js_1.imageData.id, id))
            .returning();
        if (result.length === 0) {
            return res.status(404).json({ error: '画像が見つかりません' });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('画像削除エラー:', error);
        res.status(500).json({ error: '画像の削除に失敗しました' });
    }
});
// 画像ファイルを提供（knowledge-base/images/chat-exports/から）
router.get('/chat-exports/:filename', async (_req, res) => {
    try {
        const { filename } = req.params;
        const imagePath = path_1.default.join(__dirname, '../../knowledge-base/images/chat-exports', filename);
        // ファイルの存在確認
        if (!fs_1.default.existsSync(imagePath)) {
            console.log('画像ファイルが見つかりません:', imagePath);
            return res.status(404).json({ error: '画像ファイルが見つかりません' });
        }
        // ファイルの拡張子からMIMEタイプを判定
        const ext = path_1.default.extname(filename).toLowerCase();
        let mimeType = 'image/jpeg'; // デフォルト
        if (ext === '.png')
            mimeType = 'image/png';
        else if (ext === '.gif')
            mimeType = 'image/gif';
        else if (ext === '.webp')
            mimeType = 'image/webp';
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年間キャッシュ
        // ファイルをストリーミングで送信
        const fileStream = fs_1.default.createReadStream(imagePath);
        fileStream.pipe(res);
    }
    catch (error) {
        console.error('画像ファイル提供エラー:', error);
        res.status(500).json({ error: '画像ファイルの提供に失敗しました' });
    }
});
// 画像データを検索
router.get('/search/:query', async (_req, res) => {
    try {
        const { query } = req.params;
        const result = await index_js_1.db
            .select({
            id: schema_js_1.imageData.id,
            fileName: schema_js_1.imageData.fileName,
            originalFileName: schema_js_1.imageData.originalFileName,
            mimeType: schema_js_1.imageData.mimeType,
            fileSize: schema_js_1.imageData.fileSize,
            category: schema_js_1.imageData.category,
            description: schema_js_1.imageData.description,
            createdAt: schema_js_1.imageData.createdAt,
        })
            .from(schema_js_1.imageData)
            .where((0, drizzle_orm_1.like)(schema_js_1.imageData.originalFileName, `%${query}%`));
        res.json(result);
    }
    catch (error) {
        console.error('画像検索エラー:', error);
        res.status(500).json({ error: '画像の検索に失敗しました' });
    }
});
exports.default = router;
