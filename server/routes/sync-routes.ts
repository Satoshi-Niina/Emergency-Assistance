import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { db } from '../db/index.js';
import { chats, messages, media } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { storage } from '../storage.js';

const router = express.Router();

// Multer configuration
const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'images');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: multerStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

export function registerSyncRoutes(app) {
    // 繝｡繝・ぅ繧｢繧｢繝・・繝ｭ繝ｼ繝陰PI
    app.post('/api/media/upload', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: '繝輔ぃ繧､繝ｫ縺後い繝・・繝ｭ繝ｼ繝峨＆繧後※縺・∪縺帙ｓ' });
            }
            // 繧｢繝・・繝ｭ繝ｼ繝峨＆繧後◆繝｡繝・ぅ繧｢縺ｮ繝｡繧ｿ繝・・繧ｿ繧定ｿ斐☆
            const mediaUrl = `/knowledge-base/media/${req.file.filename}`;
            // 繝｡繝・ぅ繧｢縺ｮ遞ｮ鬘橸ｼ育判蜒・蜍慕判/髻ｳ螢ｰ・峨ｒ蛻､螳・
            let mediaType = 'image';
            if (req.file.mimetype.startsWith('video/')) {
                mediaType = 'video';
            }
            else if (req.file.mimetype.startsWith('audio/')) {
                mediaType = 'audio';
            }
            // 繧ｵ繝繝阪う繝ｫ逕滓・縺ｪ縺ｩ縺ｮ蜃ｦ逅・・縺薙％縺ｫ霑ｽ蜉・亥ｿ・ｦ√↓蠢懊§縺ｦ・・
            res.json({
                success: true,
                url: mediaUrl,
                type: mediaType,
                size: req.file.size
            });
        }
        catch (error) {
            console.error('繝｡繝・ぅ繧｢繧｢繝・・繝ｭ繝ｼ繝峨お繝ｩ繝ｼ:', error);
            res.status(500).json({ error: '繝｡繝・ぅ繧｢縺ｮ繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆' });
        }
    });
    // 繝√Ε繝・ヨ繝｡繝・そ繝ｼ繧ｸ縺ｮ蜷梧悄API
    app.post('/api/chats/:id/sync-messages', async (req, res) => {
        try {
            if (!req.session.userId) {
                return res.status(401).json({ error: '隱崎ｨｼ縺輔ｌ縺ｦ縺・∪縺帙ｓ' });
            }
            const userId: any = req.session.userId;
            const chatId: any = parseInt(req.params.id);
            const { messages } = req.body;
            // 繝√Ε繝・ヨ縺ｮ蟄伜惠遒ｺ隱・
            const chat: any = await storage.getChat(String(chatId));
            if (!chat) {
                return res.status(404).json({ error: '繝√Ε繝・ヨ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
            }
            // 繝√Ε繝・ヨ繧｢繧ｯ繧ｻ繧ｹ讓ｩ髯撰ｼ医さ繝｡繝ｳ繝医い繧ｦ繝医〒蜈ｨ繝ｦ繝ｼ繧ｶ繝ｼ縺ｫ隗｣謾ｾ・・
            // if (chat.userId !== userId) {
            //   return res.status(403).json({ error: '繧｢繧ｯ繧ｻ繧ｹ讓ｩ髯舌′縺ゅｊ縺ｾ縺帙ｓ' });
            // }
            // 繝｡繝・そ繝ｼ繧ｸ繧貞・逅・
            const processedMessages = [];
            for (const message of messages) {
                try {
                    // 繝｡繝・そ繝ｼ繧ｸ繧剃ｿ晏ｭ假ｼ・imestamp縺ｯ繧ｵ繝ｼ繝舌・蛛ｴ縺ｧ險ｭ螳壹＆繧後ｋ・・
                    const savedMessage: any = await storage.createMessage({
                        chatId: String(chatId),
                        content: message.content,
                        senderId: String(userId),
                        isAiResponse: message.role === 'assistant'
                    });
                    // 繝｡繝・ぅ繧｢繧貞・逅・
                    if (message.media && Array.isArray(message.media)) {
                        for (const mediaItem of message.media) {
                            // URL縺九ｉ繝輔ぃ繧､繝ｫ蜷阪ｒ謚ｽ蜃ｺ
                            const mediaUrl: any = mediaItem.url;
                            // 繝・・繧ｿ繝吶・繧ｹ縺ｫ繝｡繝・ぅ繧｢諠・ｱ繧剃ｿ晏ｭ・
                            await storage.createMedia({
                                messageId: savedMessage.id,
                                type: mediaItem.type || 'image',
                                url: mediaUrl,
                                // thumbnail: mediaItem.thumbnail
                            });
                        }
                    }
                    processedMessages.push(savedMessage.id);
                }
                catch (messageError) {
                    console.error(`繝｡繝・そ繝ｼ繧ｸ蜃ｦ逅・お繝ｩ繝ｼ:`, messageError);
                    // 1莉ｶ縺ｮ繝｡繝・そ繝ｼ繧ｸ繧ｨ繝ｩ繝ｼ縺ｧ蜈ｨ菴薙ｒ螟ｱ謨励＆縺帙↑縺・ｈ縺・ｶ夊｡・
                }
            }
            // 繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝医Ξ繧ｳ繝ｼ繝峨ｒ譖ｴ譁ｰ
            await storage.saveChatExport(String(chatId), String(userId), new Date().getTime());
            res.json({
                success: true,
                syncedCount: processedMessages.length,
                messageIds: processedMessages
            });
        }
        catch (error) {
            console.error('繝｡繝・そ繝ｼ繧ｸ蜷梧悄繧ｨ繝ｩ繝ｼ:', error);
            res.status(500).json({ error: '繝｡繝・そ繝ｼ繧ｸ縺ｮ蜷梧悄縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
        }
    });
    // 繝√Ε繝・ヨ縺ｮ譛邨ゅお繧ｯ繧ｹ繝昴・繝域ュ蝣ｱ繧貞叙蠕励☆繧帰PI
    app.get('/api/chats/:id/last-exp', async (req, res) => {
        try {
            const chatId: any = req.params.id;
            // 譛邨ゅお繧ｯ繧ｹ繝昴・繝域ュ蝣ｱ繧貞叙蠕・
            const lastExport: any = await storage.getLastChatExport(String(chatId));
            if (!lastExport) {
                return res.json({
                    success: true,
                    lastExport: null
                });
            }
            res.json({
                success: true,
                lastExport: {
                    timestamp: lastExport.timestamp,
                    userId: lastExport.userId
                }
            });
        }
        catch (error) {
            console.error('譛邨ゅお繧ｯ繧ｹ繝昴・繝域ュ蝣ｱ蜿門ｾ励お繝ｩ繝ｼ:', error);
            res.status(500).json({ error: '譛邨ゅお繧ｯ繧ｹ繝昴・繝域ュ蝣ｱ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' });
        }
    });
}

// Router縺ｯ菴ｿ縺｣縺ｦ縺・↑縺・′縲（mport繧ｨ繝ｩ繝ｼ蝗樣∩縺ｮ縺溘ａ繝繝溘・繧ｨ繧ｯ繧ｹ繝昴・繝・
export const syncRoutesRouter = undefined;
