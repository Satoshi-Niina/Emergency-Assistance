import { Router } from 'express';
import { db } from '../db';
import { imageData } from '../db/schema';
import { eq, like } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

const router = Router();

// 逕ｻ蜒上ョ繝ｼ繧ｿ繧偵い繝・・繝ｭ繝ｼ繝・
router.post('/upload', async (req, res) => {
    try {
        const { fileName, originalFileName, mimeType, fileSize, data, category, description } = req.body;

        if (!fileName || !originalFileName || !mimeType || !fileSize || !data) {
            return res.status(400).json({ error: '蠢・ｦ√↑繝輔ぅ繝ｼ繝ｫ繝峨′荳崎ｶｳ縺励※縺・∪縺・ });
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
        console.error('逕ｻ蜒上い繝・・繝ｭ繝ｼ繝峨お繝ｩ繝ｼ:', error);
        res.status(500).json({ error: '逕ｻ蜒上・繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆' });
    }
});

// 逕ｻ蜒上ョ繝ｼ繧ｿ繧貞叙蠕・
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.select().from(imageData).where(eq(imageData.id, id));

        if (result.length === 0) {
            return res.status(404).json({ error: '逕ｻ蜒上′隕九▽縺九ｊ縺ｾ縺帙ｓ' });
        }

        const image = result[0];
        res.setHeader('Content-Type', image.mimeType);
        res.setHeader('Content-Length', image.fileSize);
        res.send(Buffer.from(image.data, 'base64'));
    } catch (error) {
        console.error('逕ｻ蜒丞叙蠕励お繝ｩ繝ｼ:', error);
        res.status(500).json({ error: '逕ｻ蜒上・蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' });
    }
});

// 繧ｫ繝・ざ繝ｪ蛻･縺ｮ逕ｻ蜒丈ｸ隕ｧ繧貞叙蠕・
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
        console.error('逕ｻ蜒丈ｸ隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
        res.status(500).json({ error: '逕ｻ蜒丈ｸ隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' });
    }
});

// 逕ｻ蜒上ョ繝ｼ繧ｿ繧貞炎髯､
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.delete(imageData).where(eq(imageData.id, id)).returning();

        if (result.length === 0) {
            return res.status(404).json({ error: '逕ｻ蜒上′隕九▽縺九ｊ縺ｾ縺帙ｓ' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('逕ｻ蜒丞炎髯､繧ｨ繝ｩ繝ｼ:', error);
        res.status(500).json({ error: '逕ｻ蜒上・蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
    }
});

// 逕ｻ蜒上ヵ繧｡繧､繝ｫ繧呈署萓幢ｼ・nowledge-base/images/chat-exports/縺九ｉ・・
router.get('/chat-exports/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const imagePath = path.join(__dirname, '../../knowledge-base/images/chat-exports', filename);
        
        // 繝輔ぃ繧､繝ｫ縺ｮ蟄伜惠遒ｺ隱・
        if (!fs.existsSync(imagePath)) {
            console.log('逕ｻ蜒上ヵ繧｡繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ:', imagePath);
            return res.status(404).json({ error: '逕ｻ蜒上ヵ繧｡繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
        }
        
        // 繝輔ぃ繧､繝ｫ縺ｮ諡｡蠑ｵ蟄舌°繧窺IME繧ｿ繧､繝励ｒ蛻､螳・
        const ext = path.extname(filename).toLowerCase();
        let mimeType = 'image/jpeg'; // 繝・ヵ繧ｩ繝ｫ繝・
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.webp') mimeType = 'image/webp';
        
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1蟷ｴ髢薙く繝｣繝・す繝･
        
        // 繝輔ぃ繧､繝ｫ繧偵せ繝医Μ繝ｼ繝溘Φ繧ｰ縺ｧ騾∽ｿ｡
        const fileStream = fs.createReadStream(imagePath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('逕ｻ蜒上ヵ繧｡繧､繝ｫ謠蝉ｾ帙お繝ｩ繝ｼ:', error);
        res.status(500).json({ error: '逕ｻ蜒上ヵ繧｡繧､繝ｫ縺ｮ謠蝉ｾ帙↓螟ｱ謨励＠縺ｾ縺励◆' });
    }
});

// 逕ｻ蜒上ョ繝ｼ繧ｿ繧呈､懃ｴ｢
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
        console.error('逕ｻ蜒乗､懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
        res.status(500).json({ error: '逕ｻ蜒上・讀懃ｴ｢縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
    }
});

export default router; 