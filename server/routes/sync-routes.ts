import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { db } from '../db/schema.js';
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
    // メディアアップロードAPI
    app.post('/api/media/upload', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'ファイルがアップロードされていません' });
            }
            // アップロードされたメディアのメタデータを返す
            const mediaUrl = `/knowledge-base/media/${req.file.filename}`;
            // メディアの種類（画像/動画/音声）を判定
            let mediaType = 'image';
            if (req.file.mimetype.startsWith('video/')) {
                mediaType = 'video';
            }
            else if (req.file.mimetype.startsWith('audio/')) {
                mediaType = 'audio';
            }
            // サムネイル生成などの処理はここに追加（必要に応じて）
            res.json({
                success: true,
                url: mediaUrl,
                type: mediaType,
                size: req.file.size
            });
        }
        catch (error) {
            console.error('メディアアップロードエラー:', error);
            res.status(500).json({ error: 'メディアのアップロードに失敗しました' });
        }
    });
    // チャットメッセージの同期API
    app.post('/api/chats/:id/sync-messages', async (req, res) => {
        try {
            if (!req.session.userId) {
                return res.status(401).json({ error: '認証されていません' });
            }
            const userId: any = req.session.userId;
            const chatId: any = parseInt(req.params.id);
            const { messages } = req.body;
            // チャットの存在確認
            const chat: any = await storage.getChat(String(chatId));
            if (!chat) {
                return res.status(404).json({ error: 'チャットが見つかりません' });
            }
            // チャットアクセス権限（コメントアウトで全ユーザーに解放）
            // if (chat.userId !== userId) {
            //   return res.status(403).json({ error: 'アクセス権限がありません' });
            // }
            // メッセージを処理
            const processedMessages = [];
            for (const message of messages) {
                try {
                    // メッセージを保存（timestampはサーバー側で設定される）
                    const savedMessage: any = await storage.createMessage({
                        chatId: String(chatId),
                        content: message.content,
                        senderId: String(userId),
                        isAiResponse: message.role === 'assistant'
                    });
                    // メディアを処理
                    if (message.media && Array.isArray(message.media)) {
                        for (const mediaItem of message.media) {
                            // URLからファイル名を抽出
                            const mediaUrl: any = mediaItem.url;
                            // データベースにメディア情報を保存
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
                    console.error(`メッセージ処理エラー:`, messageError);
                    // 1件のメッセージエラーで全体を失敗させないよう続行
                }
            }
            // チャットエクスポートレコードを更新
            await storage.saveChatExport(String(chatId), String(userId), new Date().getTime());
            res.json({
                success: true,
                syncedCount: processedMessages.length,
                messageIds: processedMessages
            });
        }
        catch (error) {
            console.error('メッセージ同期エラー:', error);
            res.status(500).json({ error: 'メッセージの同期に失敗しました' });
        }
    });
    // チャットの最終エクスポート情報を取得するAPI
    app.get('/api/chats/:id/last-exp', async (req, res) => {
        try {
            const chatId: any = req.params.id;
            // 最終エクスポート情報を取得
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
            console.error('最終エクスポート情報取得エラー:', error);
            res.status(500).json({ error: '最終エクスポート情報の取得に失敗しました' });
        }
    });
}

// Routerは使っていないが、importエラー回避のためダミーエクスポート
export const syncRoutesRouter = undefined;
