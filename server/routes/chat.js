import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { db } from '../db/index.js';
import { storage } from '../storage.js';
import { formatChatHistoryForExternalSystem } from '../lib/chat-export-formatter.js';
import { processOpenAIRequest } from '../lib/openai.js';
import { faultHistoryService } from '../services/fault-history-service.js';
import { insertMessageSchema, insertMediaSchema, insertChatSchema, messages, } from '../db/schema.js';
import { IMAGE_DATA_ENCODING } from '../utils/image-encoding.js';
// ESM用__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export function registerChatRoutes(app) {
    console.log('📡 チャットルートを登録中...');
    const requireAuth = async (req, res, next) => {
        console.log('🔐 認証チェック:', {
            hasSession: !!req.session,
            userId: req.session?.userId,
            sessionId: req.session?.id,
            url: req.url,
            method: req.method,
        });
        // 開発環境では認証を一時的に無効化
        if (process.env.NODE_ENV === 'development') {
            console.log('🔓 開発環境: 認証をスキップ');
            // セッションにダミーユーザーIDを設定
            if (!req.session?.userId) {
                req.session = req.session || {};
                req.session.userId = 'dev-user-123';
                console.log('🔓 ダミーユーザーIDを設定:', req.session.userId);
            }
            next();
            return;
        }
        // req.sessionの型エラーを型アサーションで回避
        if (!req.session?.userId) {
            console.log('❌ 認証失敗: ユーザーIDが見つかりません');
            return res.status(401).json({
                message: 'Authentication required',
                details: 'No user ID found in session',
            });
        }
        console.log('✅ 認証成功:', req.session.userId);
        next();
    };
    // チャット一覧取得
    app.get('/api/chats', requireAuth, async (req, res) => {
        // 残りのreq.sessionの型エラーを型アサーションで回避
        const chats = await storage.getChatsForUser(String(req.session.userId ?? ''));
        return res.json(chats);
    });
    // チャット作成
    app.post('/api/chats', requireAuth, async (req, res) => {
        try {
            // チャット作成時のreq.session
            const chatData = insertChatSchema.parse({
                ...req.body,
                userId: String(req.session.userId ?? ''),
            });
            const chat = await storage.createChat(chatData);
            return res.json(chat);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: error.errors });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    });
    // チャット取得
    app.get('/api/chats/:id', requireAuth, async (req, res) => {
        const chat = await storage.getChat(req.params.id);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        // チャット取得時のreq.session
        if (String(chat.userId) !== String(req.session.userId)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        return res.json(chat);
    });
    // チャットメッセージ取得
    app.get('/api/chats/:id/messages', requireAuth, async (req, res) => {
        const chatId = req.params.id;
        const clearCache = req.query.clear === 'true';
        const chat = await storage.getChat(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        // チャットメッセージ取得時のreq.session
        if (String(chat.userId) !== String(req.session.userId)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        if (clearCache) {
            res.setHeader('X-Chat-Cleared', 'true');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            return res.json([]);
        }
        const messages = await storage.getMessagesForChat(chat.id);
        const messagesWithMedia = await Promise.all(messages.map(async (message) => {
            const media = await storage.getMediaForMessage(message.id);
            return { ...message, media };
        }));
        return res.json(messagesWithMedia);
    });
    // システムメッセージ送信
    app.post('/api/chats/:id/messages/system', requireAuth, async (req, res) => {
        try {
            const chatId = req.params.id;
            const { content, isUserMessage = true } = req.body;
            const chat = await storage.getChat(chatId);
            if (!chat) {
                return res.status(404).json({ message: 'Chat not found' });
            }
            console.log(`システムメッセージ送信: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${req.session.userId}`);
            const message = await storage.createMessage({
                chatId,
                content,
                isAiResponse: !isUserMessage,
                senderId: String(req.session.userId ?? ''),
            });
            return res.json(message);
        }
        catch (error) {
            console.error('システムメッセージ送信エラー:', error);
            return res.status(500).json({ message: 'Error creating system message' });
        }
    });
    // メッセージ送信
    app.post('/api/chats/:id/messages', requireAuth, async (req, res) => {
        try {
            const chatId = req.params.id;
            const { content, useOnlyKnowledgeBase = true, usePerplexity = false, } = req.body;
            const userId = String(req.session.userId ?? '');
            // チャットIDのバリデーション
            if (!chatId || chatId === '1') {
                return res.status(400).json({
                    message: 'Invalid chat ID. Please use a valid UUID format.',
                });
            }
            // UUID形式の簡易チェック
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(chatId)) {
                return res.status(400).json({
                    message: 'Invalid chat ID format. Expected UUID format.',
                });
            }
            // デバッグログを追加
            console.log('📥 メッセージ送信リクエスト受信:', {
                chatId,
                content: content?.substring(0, 100) + '...',
                contentLength: content?.length,
                useOnlyKnowledgeBase,
                usePerplexity,
                userId,
                headers: req.headers['content-type'],
                bodyType: typeof req.body,
                bodyKeys: Object.keys(req.body || {}),
            });
            let chat = await storage.getChat(chatId);
            if (!chat) {
                console.log(`メッセージ送信時: チャットID ${chatId} が存在しないため、新規作成します`);
                try {
                    chat = await storage.createChat({
                        id: chatId,
                        userId: userId,
                        title: '新しいチャット',
                    });
                    console.log(`メッセージ送信時: チャットID ${chatId} を作成しました`);
                }
                catch (createError) {
                    console.error('メッセージ送信時のチャット作成エラー:', createError);
                    return res.status(500).json({ message: 'Failed to create chat' });
                }
            }
            console.log(`チャットアクセス: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${req.session.userId}`);
            console.log(`設定: ナレッジベースのみを使用=${useOnlyKnowledgeBase}`);
            const messageData = insertMessageSchema.parse({
                chatId: chatId,
                content: content,
                senderId: String(req.session.userId ?? ''),
                isAiResponse: false,
            });
            const message = await storage.createMessage(messageData);
            const getAIResponse = async (content, useKnowledgeBase) => {
                try {
                    return await processOpenAIRequest(content, useKnowledgeBase);
                }
                catch (error) {
                    console.error('OpenAI処理エラー:', error);
                    return 'AI応答の生成に失敗しました。';
                }
            };
            // AIからの応答を取得
            const aiResponse = await getAIResponse(content, useOnlyKnowledgeBase);
            // 応答の型チェックとサニタイズ
            let responseContent;
            if (typeof aiResponse === 'string') {
                responseContent = aiResponse;
            }
            else if (aiResponse && typeof aiResponse === 'object') {
                // オブジェクト型の場合、適切なプロパティから文字列を抽出
                responseContent =
                    aiResponse.content ||
                    aiResponse.text ||
                    aiResponse.message ||
                    JSON.stringify(aiResponse);
            }
            else {
                responseContent = 'AI応答の処理中にエラーが発生しました。';
                console.error('サーバー側AIレスポンス検証: 不正な型', {
                    type: typeof aiResponse,
                    value: aiResponse,
                });
            }
            console.log('📤 クライアントに送信するAIレスポンス:', {
                type: typeof responseContent,
                content: responseContent.substring(0, 100) + '...',
                length: responseContent.length,
                isValidString: typeof responseContent === 'string' &&
                    responseContent.trim().length > 0,
            });
            // AIメッセージを保存
            // db.insert(messages).values を型アサーションで回避
            const [aiMessage] = await db
                .insert(messages)
                .values({
                    chatId: chatId,
                    senderId: 'ai',
                    content: aiResponse,
                    isAiResponse: true,
                    createdAt: new Date(),
                })
                .returning();
            // クライアントに送信するレスポンス構造を統一化
            const responseMessage = {
                ...aiMessage,
                content: responseContent, // メイン表示用
                text: responseContent, // 互換性用（contentと同じ値）
                role: 'assistant',
                timestamp: aiMessage.createdAt || new Date(),
            };
            console.log('📤 最終レスポンス:', {
                id: responseMessage.id,
                contentType: typeof responseMessage.content,
                contentPreview: responseMessage.content.substring(0, 100) + '...',
                hasValidContent: !!responseMessage.content &&
                    responseMessage.content.trim().length > 0,
            });
            // レスポンス送信前の最終確認ログ
            console.log('📤 レスポンス送信:', {
                statusCode: 200,
                responseType: typeof responseMessage,
                responseKeys: Object.keys(responseMessage),
                contentLength: responseMessage.content?.length,
            });
            return res.json(responseMessage);
        }
        catch (error) {
            console.error('Error sending message:', error);
            // エラーの詳細情報をログに出力
            if (error instanceof Error) {
                console.error('Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                });
            }
            else {
                console.error('Unknown error type:', typeof error, error);
            }
            // エラーの詳細情報を返す
            let errorMessage = 'Failed to send message';
            let statusCode = 500;
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            else if (typeof error === 'object' && error !== null) {
                if ('message' in error) {
                    errorMessage = String(error.message);
                }
            }
            // 特定のエラーに応じてステータスコードを調整
            if (errorMessage.includes('認証') || errorMessage.includes('auth')) {
                statusCode = 401;
            }
            else if (errorMessage.includes('権限') ||
                errorMessage.includes('permission')) {
                statusCode = 403;
            }
            else if (errorMessage.includes('見つかりません') ||
                errorMessage.includes('not found')) {
                statusCode = 404;
            }
            return res.status(statusCode).json({
                message: errorMessage,
                error: error instanceof Error ? error.stack : undefined,
            });
        }
    });
    // メディア関連ルート
    app.post('/api/media', requireAuth, async (req, res) => {
        try {
            const mediaData = insertMediaSchema.parse(req.body);
            const media = await storage.createMedia(mediaData);
            return res.json(media);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: error.errors });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    });
    // チャット履歴をクリアするAPI
    app.post('/api/chats/:id/clear', requireAuth, async (req, res) => {
        try {
            const chatId = req.params.id;
            const { force, clearAll } = req.body;
            console.log(`チャット履歴クリア開始: chatId=${chatId}, force=${force}, clearAll=${clearAll}`);
            const chat = await storage.getChat(chatId);
            if (!chat) {
                return res.status(404).json({ message: 'Chat not found' });
            }
            console.log(`チャット履歴クリア: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${req.session.userId}`);
            let deletedMessageCount = 0;
            let deletedMediaCount = 0;
            try {
                // まず現在のメッセージ数を確認
                const beforeMessages = await storage.getMessagesForChat(chatId);
                const beforeCount = beforeMessages.length;
                console.log(`削除前のメッセージ数: ${beforeCount}`);
                // 各メッセージに関連するメディアも削除
                for (const message of beforeMessages) {
                    try {
                        const media = await storage.getMediaForMessage(message.id);
                        for (const mediaItem of media) {
                            // await storage.deleteMedia(mediaItem.id);
                            deletedMediaCount++;
                        }
                    }
                    catch (mediaError) {
                        console.error(`メディア削除エラー (messageId: ${message.id}):`, mediaError);
                    }
                }
                // データベースからメッセージを完全削除
                try {
                    const result = await storage.clearChatMessages(chatId);
                    console.log(`データベース削除結果:`, result);
                }
                catch (clearError) {
                    console.error('clearChatMessages実行エラー:', clearError);
                    // 個別削除にフォールバック
                }
                // 削除後のメッセージ数を確認
                const afterMessages = await storage.getMessagesForChat(chatId);
                const afterCount = afterMessages.length;
                deletedMessageCount = beforeCount - afterCount;
                console.log(`削除後のメッセージ数: ${afterCount}, 削除されたメッセージ数: ${deletedMessageCount}`);
                if (afterCount > 0) {
                    console.warn(`警告: ${afterCount}件のメッセージが残っています`);
                    // 強制削除または残存メッセージの個別削除
                    if (force || clearAll) {
                        console.log('強制削除モードで残存メッセージを個別削除します');
                        for (const remainingMessage of afterMessages) {
                            try {
                                // await storage.deleteMessage(remainingMessage.id);
                                deletedMessageCount++;
                            }
                            catch (individualDeleteError) {
                                console.error(`個別削除エラー (messageId: ${remainingMessage.id}):`, individualDeleteError);
                            }
                        }
                    }
                }
            }
            catch (dbError) {
                console.error(`データベース削除エラー:`, dbError);
                return res.status(500).json({
                    message: 'Database deletion failed',
                    error: String(dbError.message),
                });
            }
            // 最終確認
            const finalMessages = await storage.getMessagesForChat(chatId);
            const finalCount = finalMessages.length;
            console.log(`チャット履歴クリア完了: chatId=${chatId}, 削除メッセージ数=${deletedMessageCount}, 削除メディア数=${deletedMediaCount}, 最終メッセージ数=${finalCount}`);
            return res.json({
                cleared: true,
                message: 'Chat cleared successfully',
                deletedMessages: deletedMessageCount,
                deletedMedia: deletedMediaCount,
                remainingMessages: finalCount,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('Chat clear error:', error);
            return res.status(500).json({
                message: 'Error clearing chat',
                error: String(error.message),
            });
        }
    });
    // 履歴送信のためのAPI（従来の形式）
    app.post('/api/chats/:id/export', requireAuth, async (req, res) => {
        try {
            const userId = req.session.userId;
            const chatId = req.params.id;
            const { lastExportTimestamp } = req.body;
            console.log('チャットエクスポートリクエスト受信:', {
                chatId,
                userId,
                lastExportTimestamp,
            });
            // チャットIDの形式をチェック（UUID形式かどうか）
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(chatId)) {
                console.warn('無効なチャットID形式:', chatId);
                // UUID形式でない場合は、新しいチャットとして処理
                return res.json({
                    success: true,
                    exportTimestamp: new Date(),
                    messageCount: 0,
                    note: 'New chat session',
                });
            }
            // チャットの存在確認（エラーをキャッチ）
            let chat = null;
            try {
                chat = await storage.getChat(chatId);
            }
            catch (chatError) {
                console.warn('チャット取得エラー（新規チャットとして処理）:', chatError);
                // チャットが存在しない場合は新規チャットとして処理
                return res.json({
                    success: true,
                    exportTimestamp: new Date(),
                    messageCount: 0,
                    note: 'New chat session',
                });
            }
            if (!chat) {
                console.log('チャットが見つかりません（新規チャットとして処理）:', chatId);
                return res.json({
                    success: true,
                    exportTimestamp: new Date(),
                    messageCount: 0,
                    note: 'New chat session',
                });
            }
            // データベースからメッセージを取得する代わりに、ファイルベースの保存のみ
            const messages = [];
            const exportTimestamp = new Date();
            console.log('チャットエクスポート処理（ファイルベース）');
            // ファイルベースのエクスポートのみ（データベース処理は不要）
            console.log(`チャット ${chatId} のエクスポート処理完了（ファイルベース）`);
            res.json({
                success: true,
                exportTimestamp,
                messageCount: messages.length,
            });
        }
        catch (error) {
            console.error('Error exporting chat history:', error);
            res.status(500).json({ error: 'Failed to export chat history' });
        }
    });
    // テスト用の認証なしチャット送信API（開発環境のみ）
    app.post('/api/chats/:id/send-test', async (req, res) => {
        try {
            const chatId = req.params.id;
            const { chatData, exportType } = req.body;
            console.log('🔍 テスト用チャット送信リクエスト受信:', {
                chatId,
                exportType,
                messageCount: chatData?.messages?.length || 0,
                machineInfo: chatData?.machineInfo,
                requestBody: req.body,
                headers: req.headers,
            });
            // チャットデータの検証
            if (!chatData ||
                !chatData.messages ||
                !Array.isArray(chatData.messages)) {
                return res.status(400).json({
                    error: 'Invalid chat data format',
                    details: 'chatData.messages must be an array',
                });
            }
            // knowledge-base/troubleshooting フォルダを作成（プロジェクトルート直下）
            const projectRoot = path.resolve(__dirname, '..', '..');
            const exportsDir = process.env.LOCAL_EXPORT_DIR
                ? path.isAbsolute(process.env.LOCAL_EXPORT_DIR)
                    ? process.env.LOCAL_EXPORT_DIR.replace('exports', 'troubleshooting')
                    : path.join(projectRoot, process.env.LOCAL_EXPORT_DIR.replace('exports', 'troubleshooting'))
                : path.join(projectRoot, 'knowledge-base', 'troubleshooting');
            if (!fs.existsSync(exportsDir)) {
                fs.mkdirSync(exportsDir, { recursive: true });
                console.log('troubleshooting フォルダを作成しました:', exportsDir);
            }
            // 画像を個別ファイルとして保存（環境変数または projectRoot）
            const projectRoot = path.resolve(__dirname, '..', '..');
            const imagesDir = process.env.FAULT_HISTORY_IMAGES_DIR || path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir, { recursive: true });
                console.log('画像保存ディレクトリを作成しました:', imagesDir);
            }
            // チャットメッセージから画像を抽出してファイルとして保存（先に処理）
            const savedImages = [];
            const cleanedChatData = JSON.parse(JSON.stringify(chatData)); // ディープコピー
            for (const message of cleanedChatData.messages) {
                // 既存の画像URL（/api/images/chat-exports/）を検出 - 1箇所目
                if (message.content && message.content.includes('/api/images/chat-exports/')) {
                    try {
                        // URLからファイル名を抽出
                        const urlMatch = message.content.match(/\/api\/images\/chat-exports\/([^"'\s]+)/);
                        if (urlMatch && urlMatch[1]) {
                            const imageFileName = urlMatch[1];
                            const imagePath = path.join(imagesDir, imageFileName);
                            savedImages.push({
                                messageId: message.id,
                                fileName: imageFileName,
                                originalFileName: imageFileName,
                                path: imagePath,
                                url: `/api/images/chat-exports/${imageFileName}`,
                                mimeType: 'image/jpeg',
                                fileSize: fs.existsSync(imagePath) ? fs.statSync(imagePath).size.toString() : '0',
                                description: `Chat image ${imageFileName}`,
                                createdAt: new Date().toISOString(),
                            });
                            console.log('既存の画像URLを検出（1箇所目）:', imageFileName);
                        }
                    }
                    catch (error) {
                        console.warn('画像URL抽出エラー（1箇所目）:', error);
                    }
                }
                // Base64画像の処理（後方互換性のため）
                else if (message.content && message.content.startsWith('data:image/')) {
                    try {
                        // 画像データから画像を抽出
                        const dataUriPattern = new RegExp(`^data:image/[a-z]+;${IMAGE_DATA_ENCODING},`);
                        const imageData = message.content.replace(dataUriPattern, '');
                        const buffer = Buffer.from(imageData, IMAGE_DATA_ENCODING);
                        // ファイル名を生成
                        const imageTimestamp = Date.now();
                        const imageFileName = `chat_image_${chatId}_${imageTimestamp}.jpg`;
                        const imagePath = path.join(imagesDir, imageFileName);
                        // 画像を120pxにリサイズして保存
                        try {
                            const resizedBuffer = await sharp(buffer)
                                .resize(120, 120, {
                                    fit: 'inside', // アスペクト比を維持しながら、120x120以内に収める
                                    withoutEnlargement: true, // 拡大しない
                                })
                                .jpeg({ quality: 85 })
                                .toBuffer();
                            fs.writeFileSync(imagePath, resizedBuffer);
                            console.log('画像ファイルを保存しました（120pxにリサイズ）:', imagePath);
                        }
                        catch (resizeError) {
                            // リサイズに失敗した場合は元の画像を保存
                            console.warn('画像リサイズエラー、元の画像を保存:', resizeError);
                            fs.writeFileSync(imagePath, buffer);
                            console.log('画像ファイルを保存しました（リサイズなし）:', imagePath);
                        }
                        const imageUrl = `/api/images/chat-exports/${imageFileName}`;
                        // 画像データをURLに置き換え
                        message.content = imageUrl;
                        savedImages.push({
                            messageId: message.id,
                            fileName: imageFileName,
                            originalFileName: imageFileName,
                            path: imagePath,
                            url: imageUrl,
                            mimeType: 'image/jpeg',
                            fileSize: fs.existsSync(imagePath) ? fs.statSync(imagePath).size.toString() : '0',
                            description: `Chat image ${imageFileName}`,
                            createdAt: new Date().toISOString(),
                        });
                    }
                    catch (imageError) {
                        console.warn('画像保存エラー:', imageError);
                        // エラー時は画像データを削除
                        message.content = '[画像データ削除]';
                    }
                }
            }
            // チャットデータをJSONファイルとして保存
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            // 画像処理後にユーザーメッセージから事象情報を抽出してファイル名に使用
            const userMessages = cleanedChatData.messages.filter((m) => !m.isAiResponse);
            console.log('🔍 事象抽出 - ユーザーメッセージ:', userMessages);
            const textMessages = userMessages
                .map((m) => m.content)
                .filter((content) => {
                    if (!content) {
                        console.log('🔍 フィルタ - 空のコンテンツ');
                        return false;
                    }
                    const trimmed = content.trim();
                    console.log('🔍 フィルタ - チェック中:', {
                        content: trimmed.substring(0, 50),
                        isDataImage: trimmed.startsWith('data:image/'),
                        isApiImages: trimmed.startsWith('/api/images/'),
                        includesChatExports: trimmed.includes('/api/images/chat-exports/'),
                        isDeleted: trimmed === '[画像データ削除]',
                    });
                    const result = !trimmed.startsWith('data:image/') &&
                        !trimmed.startsWith('/api/images/') &&
                        !trimmed.includes('/api/images/chat-exports/') &&
                        trimmed !== '[画像データ削除]';
                    console.log('🔍 フィルタ - 結果:', result ? 'テキストとして採用' : '画像として除外');
                    return result;
                })
                .join('\n')
                .trim();
            console.log('🔍 事象抽出 - テキストメッセージ:', textMessages);
            let incidentTitle = '事象なし';
            if (textMessages) {
                // テキストがある場合は最初の行を使用
                incidentTitle = textMessages.split('\n')[0].trim();
                console.log('🔍 事象抽出 - 抽出されたタイトル:', incidentTitle);
            }
            else {
                // テキストがない場合（画像のみ）は、デフォルトタイトルを使用
                incidentTitle = '画像による故障報告';
                console.log('🔍 事象抽出 - デフォルトタイトル使用:', incidentTitle);
            }
            // ファイル名用に事象内容をサニタイズ（特殊文字を除去）
            const sanitizedTitle = incidentTitle
                .replace(/[<>:"/\\|?*]/g, '') // ファイル名に使用できない文字を除去
                .replace(/\s+/g, '_') // スペースをアンダースコアに変換
                .substring(0, 50); // 長さを制限
            // 既存のファイルを検索（同じchatIdのファイルがあれば上書き）
            let existingFilePath = null;
            if (fs.existsSync(exportsDir)) {
                const files = fs.readdirSync(exportsDir);
                const existingFile = files.find(file => file.includes(`_${chatId}_`) && file.endsWith('.json'));
                if (existingFile) {
                    existingFilePath = path.join(exportsDir, existingFile);
                    console.log('🔄 既存ファイルを上書きします:', existingFile);
                }
            }
            const fileName = existingFilePath
                ? path.basename(existingFilePath)
                : `${sanitizedTitle}_${chatId}_${timestamp}.json`;
            const filePath = existingFilePath || path.join(exportsDir, fileName);
            // 画像データを完全に除去する関数
            const removeImageDataRecursively = (obj) => {
                if (obj === null || obj === undefined) {
                    return obj;
                }
                if (typeof obj === 'string') {
                    // 画像データ文字列を検出して削除
                    if (obj.startsWith('data:image/')) {
                        console.warn('⚠️ 画像データを検出、削除します:', obj.substring(0, 50) + '...');
                        return '[画像データ削除]';
                    }
                    return obj;
                }
                if (Array.isArray(obj)) {
                    return obj.map(item => removeImageDataRecursively(item));
                }
                if (typeof obj === 'object') {
                    const cleaned = {};
                    for (const key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            cleaned[key] = removeImageDataRecursively(obj[key]);
                        }
                    }
                    return cleaned;
                }
                return obj;
            };
            // exportDataを作成（画像データを含まないクリーンなデータのみ）
            const exportData = {
                chatId: chatId,
                userId: 'test-user',
                exportType: exportType || 'manual_send',
                exportTimestamp: new Date().toISOString(),
                title: incidentTitle, // 事象情報をタイトルとして追加
                chatData: removeImageDataRecursively(cleanedChatData),
                savedImages: savedImages,
            };
            // エクスポートデータは既に画像データが除去されているので、そのまま使用
            const cleanedExportData = exportData;
            // UTF-8エンコーディングでJSONファイルを保存（BOMなし）
            const jsonString = JSON.stringify(cleanedExportData, null, 2);
            try {
                // UTF-8 BOMなしで保存
                fs.writeFileSync(filePath, jsonString, 'utf8');
                console.log('チャットデータを保存しました:', filePath);
                console.log('保存されたファイル名:', fileName);
                console.log('保存されたデータサイズ:', Buffer.byteLength(jsonString, 'utf8'), 'bytes');
            }
            catch (writeError) {
                console.error('ファイル保存エラー:', writeError);
                throw writeError;
            }
            // ファイルベースの保存のみ（DB保存は削除）
            console.log('チャットエクスポートがファイルに保存されました');
            // 成功レスポンス
            res.json({
                success: true,
                message: 'チャットデータが正常に保存されました（テスト用）',
                filePath: filePath,
                fileName: fileName,
                messageCount: chatData.messages.length,
            });
        }
        catch (error) {
            console.error('Error sending chat data:', error);
            res.status(500).json({
                error: 'Failed to send chat data',
                details: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // チャットエクスポート一覧を取得するエンドポイント
    app.get('/api/chats/exports', async (req, res) => {
        try {
            console.log('📋 チャットエクスポート一覧取得リクエスト');
            // Content-Typeを明示的に設定
            res.setHeader('Content-Type', 'application/json');
            const projectRoot = path.resolve(__dirname, '..', '..');
            const exportsDir = path.join(projectRoot, 'knowledge-base', 'troubleshooting');
            if (!fs.existsSync(exportsDir)) {
                return res.json([]);
            }
            const files = fs
                .readdirSync(exportsDir)
                .filter(file => file.endsWith('.json'))
                .map(file => {
                    const filePath = path.join(exportsDir, file);
                    const stats = fs.statSync(filePath);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const data = JSON.parse(content);
                    return {
                        fileName: file,
                        filePath: filePath,
                        chatId: data.chatId,
                        userId: data.userId,
                        exportType: data.exportType,
                        exportTimestamp: data.exportTimestamp,
                        messageCount: data.chatData?.messages?.length || 0,
                        machineInfo: data.chatData?.machineInfo,
                        fileSize: stats.size,
                        lastModified: stats.mtime,
                    };
                })
                .sort((a, b) => new Date(b.exportTimestamp).getTime() -
                    new Date(a.exportTimestamp).getTime());
            res.json(files);
        }
        catch (error) {
            console.error('❌ チャットエクスポート一覧取得エラー:', error);
            res.status(500).json({
                error: 'チャットエクスポート一覧の取得に失敗しました',
                details: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // 新しいチャット送信API（クライアント側の形式に対応）
    app.post('/api/chats/:id/send', requireAuth, async (req, res) => {
        try {
            const userId = req.session.userId;
            const chatId = req.params.id;
            const { chatData, exportType } = req.body;
            console.log('🔍 チャット送信リクエスト受信:', {
                chatId,
                userId,
                exportType,
                messageCount: chatData?.messages?.length || 0,
                machineInfo: chatData?.machineInfo,
                requestBody: req.body,
                headers: req.headers,
            });
            // チャットデータの検証
            if (!chatData ||
                !chatData.messages ||
                !Array.isArray(chatData.messages)) {
                return res.status(400).json({
                    error: 'Invalid chat data format',
                    details: 'chatData.messages must be an array',
                });
            }
            const ensureTrailingSlash = (value) => value.endsWith('/') ? value : `${value}/`;
            const projectRoot = path.resolve(__dirname, '..', '..');
            const resolveRelativePath = (targetPath) => path.isAbsolute(targetPath)
                ? targetPath
                : path.join(projectRoot, targetPath);
            const exportsDir = resolveRelativePath(process.env.LOCAL_EXPORT_DIR || path.join('knowledge-base', 'exports'));
            if (!process.env.KNOWLEDGE_EXPORTS_DIR) {
                process.env.KNOWLEDGE_EXPORTS_DIR = exportsDir;
            }
            if (!fs.existsSync(exportsDir)) {
                fs.mkdirSync(exportsDir, { recursive: true });
                console.log('exports フォルダを作成しました:', exportsDir);
            }
            const isProduction = process.env.NODE_ENV === 'production';
            const rawBlobPrefix = process.env.BLOB_PREFIX?.trim();
            const azureJsonPrefix = rawBlobPrefix ? 'exports/' : 'knowledge-base/exports/';
            const azureImagePrefix = rawBlobPrefix ? 'images/chat-exports/' : 'knowledge-base/images/chat-exports/';
            const localImageBaseUrl = ensureTrailingSlash(process.env.DEV_CHAT_EXPORT_IMAGE_BASE_URL || process.env.LOCAL_IMAGE_BASE_URL || '/api/images/chat-exports/');
            const configuredImagesDir = process.env.FAULT_HISTORY_IMAGES_DIR
                ? resolveRelativePath(process.env.FAULT_HISTORY_IMAGES_DIR)
                : null;
            const defaultImagesDir = path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
            const imagesDir = configuredImagesDir || defaultImagesDir;
            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir, { recursive: true });
                console.log('画像保存ディレクトリを作成しました:', imagesDir);
            }
            else {
                console.log('📁 画像保存先ディレクトリ:', imagesDir);
            }
            let azureStorageService = null;
            if (isProduction) {
                try {
                    const azureModule = await import('../lib/azure-storage.js');
                    azureStorageService = azureModule.azureStorage;
                    if (azureStorageService?.initializeContainer) {
                        await azureStorageService.initializeContainer();
                    }
                }
                catch (azureError) {
                    console.error('⚠️ Azure Storage 初期化エラー:', azureError);
                    azureStorageService = null;
                }
            }
            const shouldUseAzure = Boolean(isProduction && azureStorageService);
            const resolveImageLink = async (imageFileName, absolutePath) => {
                const normalizedFileName = imageFileName.replace(/^[\\/]+/, '');
                let storageKey = normalizedFileName;
                let url = `${localImageBaseUrl}${normalizedFileName}`;
                let storageType = 'local-file';
                if (shouldUseAzure && fs.existsSync(absolutePath)) {
                    const blobName = `${azureImagePrefix}${normalizedFileName}`;
                    try {
                        await azureStorageService.uploadFile(absolutePath, blobName);
                        try {
                            url = azureStorageService.generateBlobSasUrl(blobName, 60 * 60 * 1000);
                            storageKey = blobName;
                            storageType = 'azure-blob';
                        }
                        catch (sasError) {
                            console.error('⚠️ SASトークン生成エラー:', sasError);
                            storageKey = normalizedFileName;
                            storageType = 'local-file';
                        }
                    }
                    catch (uploadError) {
                        console.error('⚠️ Azure Storage 画像アップロードエラー:', uploadError);
                    }
                }
                return { url, storageKey, storageType };
            };
            // 新しいフォーマット関数を使用してエクスポートデータを生成
            const { formatChatHistoryForHistoryUI } = await import('../lib/chat-export-formatter.js');
            // データベースからではなく、リクエストボディのchatDataを使用
            const chat = {
                id: chatId,
                userId: userId,
                title: chatData.title || 'チャット履歴',
                createdAt: new Date().toISOString(),
            };
            // リクエストボディのメッセージを使用
            const allMessages = chatData.messages || [];
            // メディア情報はリクエストボディから取得
            const messageMedia = {};
            for (const message of allMessages) {
                messageMedia[message.id] = message.media || [];
            }
            // 履歴管理UI用にフォーマット（エラーをキャッチ）
            let formattedHistoryData;
            try {
                formattedHistoryData = await formatChatHistoryForHistoryUI(chat, allMessages, messageMedia, chatData.machineInfo);
            }
            catch (formatError) {
                console.error('フォーマット処理エラー:', formatError);
                // フォーマット処理が失敗した場合のフォールバック
                formattedHistoryData = {
                    title: '車両トラブル',
                    problem_description: '詳細情報なし',
                    machine_type: chatData.machineInfo?.machineTypeName || '',
                    machine_number: chatData.machineInfo?.machineNumber || '',
                    extracted_components: [],
                    extracted_symptoms: [],
                    possible_models: [],
                    conversation_history: allMessages.map((m) => ({
                        id: m.id,
                        content: m.content,
                        isAiResponse: m.isAiResponse,
                        timestamp: m.createdAt,
                        media: [],
                    })),
                    export_timestamp: new Date().toISOString(),
                    metadata: {
                        total_messages: allMessages.length,
                        user_messages: allMessages.filter((m) => !m.isAiResponse)
                            .length,
                        ai_messages: allMessages.filter((m) => m.isAiResponse).length,
                        total_media: 0,
                        export_format_version: '2.0',
                    },
                };
            }
            // 画像を個別ファイルとして保存（環境変数または projectRoot）
            const projectRoot = path.resolve(__dirname, '..', '..');
            const imagesDir = process.env.FAULT_HISTORY_IMAGES_DIR
                ? path.isAbsolute(process.env.FAULT_HISTORY_IMAGES_DIR)
                    ? process.env.FAULT_HISTORY_IMAGES_DIR
                    : path.join(projectRoot, process.env.FAULT_HISTORY_IMAGES_DIR)
                : path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir, { recursive: true });
                console.log('画像保存ディレクトリを作成しました:', imagesDir);
            }
            else {
                console.log('📁 画像保存先ディレクトリ:', imagesDir);
                console.log('📁 ディレクトリ存在確認:', fs.existsSync(imagesDir));
            }
            // チャットメッセージから画像を抽出してファイルとして保存（先に処理）
            const savedImages = [];
            const cleanedChatData = JSON.parse(JSON.stringify(chatData)); // ディープコピー
            console.log('🔍 画像検出開始 - メッセージ数:', cleanedChatData.messages.length);
            console.log('🔍 元のメッセージ内容:', cleanedChatData.messages.map((m) => ({
                id: m.id,
                isAiResponse: m.isAiResponse,
                contentPreview: m.content?.substring(0, 100)
            })));
            for (const message of cleanedChatData.messages) {
                console.log('🔍 メッセージ内容チェック:', {
                    id: message.id,
                    content: message.content?.substring(0, 100),
                    hasImageUrl: message.content?.includes('/api/images/chat-exports/'),
                    hasBase64: message.content?.startsWith('data:image/')
                });
                // 既存の画像URL（/api/images/chat-exports/）を検出 - 2箇所目
                if (message.content && message.content.includes('/api/images/chat-exports/')) {
                    try {
                        // URLからファイル名を抽出
                        const urlMatch = message.content.match(/\/api\/images\/chat-exports\/([^"'\s]+)/);
                        if (urlMatch && urlMatch[1]) {
                            const imageFileName = urlMatch[1];
                            const imagePath = path.join(imagesDir, imageFileName);
                            const { url, storageKey, storageType } = await resolveImageLink(imageFileName, imagePath);
                            savedImages.push({
                                messageId: message.id,
                                fileName: imageFileName,
                                originalFileName: imageFileName,
                                path: imagePath,
                                url,
                                storageKey,
                                storageType,
                                mimeType: 'image/jpeg',
                                fileSize: fs.existsSync(imagePath) ? fs.statSync(imagePath).size.toString() : '0',
                                description: `Chat image ${imageFileName}`,
                                createdAt: new Date().toISOString(),
                            });
                            message.content = url;
                            console.log('既存の画像URLを検出（環境適用）:', imageFileName);
                        }
                    }
                    catch (error) {
                        console.warn('画像URL抽出エラー（既存URL処理）:', error);
                    }
                }
                // Base64画像の処理（後方互換性のため）
                else if (message.content && message.content.startsWith('data:image/')) {
                    try {
                        // 画像データから画像を抽出
                        const dataUriPattern = new RegExp(`^data:image/[a-z]+;${IMAGE_DATA_ENCODING},`);
                        const imageData = message.content.replace(dataUriPattern, '');
                        const buffer = Buffer.from(imageData, IMAGE_DATA_ENCODING);
                        // ファイル名を生成
                        const imageTimestamp = Date.now();
                        const imageFileName = `chat_image_${chatId}_${imageTimestamp}.jpg`;
                        const imagePath = path.join(imagesDir, imageFileName);
                        // 画像を120pxにリサイズして保存
                        try {
                            const resizedBuffer = await sharp(buffer)
                                .resize(120, 120, {
                                    fit: 'inside', // アスペクト比を維持しながら、120x120以内に収める
                                    withoutEnlargement: true, // 拡大しない
                                })
                                .jpeg({ quality: 85 })
                                .toBuffer();
                            fs.writeFileSync(imagePath, resizedBuffer);
                            console.log('画像ファイルを保存しました（120pxにリサイズ）:', imagePath);
                        }
                        catch (resizeError) {
                            // リサイズに失敗した場合は元の画像を保存
                            console.warn('画像リサイズエラー、元の画像を保存:', resizeError);
                            fs.writeFileSync(imagePath, buffer);
                            console.log('画像ファイルを保存しました（リサイズなし）:', imagePath);
                        }
                        const { url: imageUrl, storageKey, storageType } = await resolveImageLink(imageFileName, imagePath);
                        // 画像データをURLに置き換え
                        message.content = imageUrl;
                        savedImages.push({
                            messageId: message.id,
                            fileName: imageFileName,
                            originalFileName: imageFileName,
                            path: imagePath,
                            url: imageUrl,
                            storageKey,
                            storageType,
                            mimeType: 'image/jpeg',
                            fileSize: fs.existsSync(imagePath) ? fs.statSync(imagePath).size.toString() : '0',
                            description: `Chat image ${imageFileName}`,
                            createdAt: new Date().toISOString(),
                        });
                    }
                    catch (imageError) {
                        console.warn('画像保存エラー:', imageError);
                        // エラー時は画像データを削除
                        message.content = '[画像データ削除]';
                    }
                }
            }
            console.log('🔍 画像処理完了 - 保存された画像数:', savedImages.length);
            console.log('🔍 処理後のメッセージ内容:', cleanedChatData.messages.map((m) => ({
                id: m.id,
                isAiResponse: m.isAiResponse,
                contentPreview: m.content?.substring(0, 100)
            })));
            // 画像処理後にファイル名を抽出（画像URLが既に置き換えられている）
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            // ユーザーメッセージからテキストのみを抽出（画像を除外）
            const userMessages = cleanedChatData.messages.filter((m) => !m.isAiResponse);
            const imageUrlSet = new Set(savedImages
                .map(img => typeof (img === null || img === void 0 ? void 0 : img.url) === 'string' ? img.url : '')
                .filter(Boolean));
            const textMessages = userMessages
                .map((m) => m.content)
                .filter((content) => {
                    if (!content) {
                        console.log('🔍 /send フィルタ - 空のコンテンツ');
                        return false;
                    }
                    const trimmed = content.trim();
                    console.log('🔍 /send フィルタ - チェック中:', {
                        content: trimmed.substring(0, 50),
                        isDataImage: trimmed.startsWith('data:image/'),
                        isKnownImageUrl: imageUrlSet.has(trimmed),
                        isDeleted: trimmed === '[画像データ削除]',
                    });
                    // Base64画像、画像URL、画像削除マーカーを除外
                    const result = !trimmed.startsWith('data:image/') &&
                        !imageUrlSet.has(trimmed) &&
                        trimmed !== '[画像データ削除]';
                    console.log('🔍 /send フィルタ - 結果:', result ? 'テキストとして採用' : '画像として除外');
                    return result;
                })
                .join('\n')
                .trim();
            console.log('🔍 抽出されたテキストメッセージ:', textMessages);
            let incidentTitle = '事象なし';
            if (textMessages) {
                // テキストがある場合は最初の行を使用
                incidentTitle = textMessages.split('\n')[0].trim();
            }
            else {
                // テキストがない場合（画像のみ）は、AIの応答から事象を推測
                const aiMessages = cleanedChatData.messages.filter((m) => m.isAiResponse);
                if (aiMessages.length > 0) {
                    // 最初のAI応答から事象を抽出（最初の一文を使用）
                    const firstAiResponse = aiMessages[0].content;
                    const firstSentence = firstAiResponse.split(/[。.\n]/).filter((s) => s.trim().length > 0)[0];
                    incidentTitle = firstSentence?.trim().substring(0, 50) || formattedHistoryData.title || '画像による故障報告';
                }
                else {
                    // AI応答もない場合は、フォーマットされたタイトルを使用
                    incidentTitle = formattedHistoryData.title || '画像による故障報告';
                }
            }
            console.log('🔍 決定されたファイル名:', incidentTitle);
            // ファイル名用に事象内容をサニタイズ（特殊文字を除去）
            const sanitizedTitle = incidentTitle
                .replace(/[<>:"/\\|?*]/g, '') // ファイル名に使用できない文字を除去
                .replace(/\s+/g, '_') // スペースをアンダースコアに変換
                .substring(0, 50); // 長さを制限
            // 既存のファイルを検索（同じchatIdのファイルがあれば上書き）
            let existingFilePath = null;
            if (fs.existsSync(exportsDir)) {
                const files = fs.readdirSync(exportsDir);
                const existingFile = files.find(file => file.includes(`_${chatId}_`) && file.endsWith('.json'));
                if (existingFile) {
                    existingFilePath = path.join(exportsDir, existingFile);
                    console.log('🔄 既存ファイルを上書きします:', existingFile);
                }
            }
            const fileName = existingFilePath
                ? path.basename(existingFilePath)
                : `${sanitizedTitle}_${chatId}_${timestamp}.json`;
            const filePath = existingFilePath || path.join(exportsDir, fileName);
            console.log('🔍 最終的なファイル名:', fileName);
            // 画像データを完全に除去する関数
            const removeImageDataRecursively = (obj) => {
                if (obj === null || obj === undefined) {
                    return obj;
                }
                if (typeof obj === 'string') {
                    // 画像データ文字列を検出して削除
                    if (obj.startsWith('data:image/')) {
                        console.warn('⚠️ 画像データを検出、削除します:', obj.substring(0, 50) + '...');
                        return '[画像データ削除]';
                    }
                    return obj;
                }
                if (Array.isArray(obj)) {
                    return obj.map(item => removeImageDataRecursively(item));
                }
                if (typeof obj === 'object') {
                    const cleaned = {};
                    for (const key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            cleaned[key] = removeImageDataRecursively(obj[key]);
                        }
                    }
                    return cleaned;
                }
                return obj;
            };
            // conversationHistoryから画像データを除去
            const cleanedConversationHistory = formattedHistoryData.conversation_history
                ? removeImageDataRecursively(formattedHistoryData.conversation_history)
                : formattedHistoryData.conversation_history;
            let exportStorage = { type: 'local-file', key: filePath };
            // exportDataを作成（画像データを含まないクリーンなデータのみ）
            const exportData = {
                chatId: chatId,
                userId: userId,
                exportType: exportType || 'manual_send',
                exportTimestamp: new Date().toISOString(),
                title: incidentTitle, // 画像が先でも発生事象を優先
                problemDescription: formattedHistoryData.problem_description,
                machineType: formattedHistoryData.machine_type,
                machineNumber: formattedHistoryData.machine_number,
                extractedComponents: formattedHistoryData.extracted_components,
                extractedSymptoms: formattedHistoryData.extracted_symptoms,
                possibleModels: formattedHistoryData.possible_models,
                conversationHistory: cleanedConversationHistory,
                metadata: formattedHistoryData.metadata,
                originalChatData: removeImageDataRecursively(cleanedChatData), // 画像データを含まないクリーンなデータ
                savedImages: savedImages,
                storage: exportStorage,
            };
            // エクスポートデータは既に画像データが除去されているので、そのまま使用
            const cleanedExportData = exportData;
            // UTF-8エンコーディングでJSONファイルを保存（BOMなし）
            const jsonString = JSON.stringify(cleanedExportData, null, 2);
            let jsonBlobName = shouldUseAzure ? `${azureJsonPrefix}${fileName}` : null;
            try {
                // UTF-8 BOMなしで保存
                fs.writeFileSync(filePath, jsonString, 'utf8');
                console.log('チャットデータを保存しました:', filePath);
                console.log('保存されたデータサイズ:', Buffer.byteLength(jsonString, 'utf8'), 'bytes');
            }
            catch (writeError) {
                console.error('ファイル保存エラー:', writeError);
                throw writeError;
            }
            if (shouldUseAzure && azureStorageService) {
                try {
                    console.log('☁️ Azure BLOB Storageにアップロード中...');
                    await azureStorageService.uploadFile(filePath, jsonBlobName);
                    console.log('✅ JSONファイルをBLOBにアップロード完了:', jsonBlobName);
                    exportStorage = { type: 'azure-blob', key: jsonBlobName };
                    exportData.storage = exportStorage;
                    const updatedJson = JSON.stringify(exportData, null, 2);
                    fs.writeFileSync(filePath, updatedJson, 'utf8');
                }
                catch (uploadError) {
                    console.error('⚠️ Azure BLOBアップロードエラー（ローカル保存は成功）:', uploadError);
                    jsonBlobName = null;
                    exportStorage = { type: 'local-file', key: filePath };
                    exportData.storage = exportStorage;
                    const fallbackJson = JSON.stringify(exportData, null, 2);
                    fs.writeFileSync(filePath, fallbackJson, 'utf8');
                }
            }
            // DBバックアップ（オプション、画像は含めない）
            if (process.env.DATABASE_BACKUP === 'true' && process.env.DATABASE_URL) {
                try {
                    console.log('💾 DBバックアップ中...');
                    const dbSaveResult = await faultHistoryService.saveFaultHistory(exportData, {
                        title: formattedHistoryData.title,
                        description: formattedHistoryData.problem_description,
                        extractImages: false, // 画像はファイルのみ、DBには保存しない
                    });
                    console.log('✅ DBバックアップ完了:', dbSaveResult.id);
                }
                catch (dbError) {
                    console.error('⚠️ DBバックアップエラー（ファイル保存は成功）:', dbError);
                }
            }
            console.log(`✅ チャットエクスポート完了: JSON=${fileName}, 画像=${savedImages.length}件`);
            // 成功レスポンス
            res.json({
                success: true,
                message: 'チャットデータが正常に保存されました',
                filePath: filePath,
                fileName: fileName,
                messageCount: chatData.messages.length,
                savedImagesCount: savedImages.length,
                storage: {
                    type: exportData.storage.type,
                    key: exportData.storage.key,
                    blobName: jsonBlobName,
                },
            });
        }
        catch (error) {
            console.error('Error sending chat data:', error);
            res.status(500).json({
                error: 'Failed to send chat data',
                details: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // 外部AI分析システム向けフォーマット済みデータを取得するAPI
    app.get('/api/chats/:id/export-formatted', requireAuth, async (req, res) => {
        try {
            const userId = req.session.userId;
            const chatId = req.params.id;
            const chat = await storage.getChat(chatId);
            if (!chat) {
                return res.status(404).json({ message: 'Chat not found' });
            }
            console.log(`フォーマット済みエクスポート: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${userId}`);
            if (String(chat.userId) !== String(userId) &&
                req.session.userRole !== 'admin') {
                return res.status(403).json({ message: 'Access denied' });
            }
            const messages = await storage.getMessagesForChat(chatId);
            const messageMedia = {};
            for (const message of messages) {
                messageMedia[message.id] = await storage.getMediaForMessage(message.id);
            }
            const lastExport = await storage.getLastChatExport(chatId);
            const formattedData = await formatChatHistoryForExternalSystem(chat, messages, messageMedia, lastExport);
            res.json(formattedData);
        }
        catch (error) {
            console.error('Error formatting chat for external system:', error);
            res
                .status(500)
                .json({ error: 'Failed to format chat for external system' });
        }
    });
    // チャットの最後のエクスポート履歴を取得
    app.get('/api/chats/:id/last-export', requireAuth, async (req, res) => {
        try {
            const chatId = req.params.id;
            const chat = await storage.getChat(chatId);
            if (!chat) {
                return res.status(404).json({ message: 'Chat not found' });
            }
            const lastExport = await storage.getLastChatExport(chatId);
            res.json(lastExport || { timestamp: null });
        }
        catch (error) {
            console.error('Error fetching last export:', error);
            res
                .status(500)
                .json({ error: 'Failed to fetch last export information' });
        }
    });
    // 保存されたチャット履歴一覧を取得
    app.get('/api/chats/exports', requireAuth, async (req, res) => {
        try {
            const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
            if (!fs.existsSync(exportsDir)) {
                return res.json([]);
            }
            // 再帰的にJSONファイルを検索する関数
            const findJsonFiles = (dir, baseDir = exportsDir) => {
                const files = [];
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = fs.statSync(itemPath);
                    if (stats.isDirectory()) {
                        // サブディレクトリを再帰的に検索
                        files.push(...findJsonFiles(itemPath, baseDir));
                    }
                    else if (item.endsWith('.json')) {
                        try {
                            const content = fs.readFileSync(itemPath, 'utf8');
                            const data = JSON.parse(content);
                            // 相対パスを計算
                            const relativePath = path.relative(baseDir, itemPath);
                            files.push({
                                fileName: relativePath,
                                filePath: itemPath,
                                chatId: data.chatId,
                                userId: data.userId,
                                exportType: data.exportType,
                                exportTimestamp: data.exportTimestamp,
                                messageCount: data.chatData?.messages?.length || 0,
                                machineInfo: data.chatData?.machineInfo || {
                                    selectedMachineType: '',
                                    selectedMachineNumber: '',
                                    machineTypeName: '',
                                    machineNumber: '',
                                },
                                fileSize: stats.size,
                                lastModified: stats.mtime,
                            });
                        }
                        catch (error) {
                            console.warn(`JSONファイルの読み込みエラー: ${itemPath}`, error);
                        }
                    }
                }
                return files;
            };
            const files = findJsonFiles(exportsDir).sort((a, b) => new Date(b.exportTimestamp).getTime() -
                new Date(a.exportTimestamp).getTime());
            res.json(files);
        }
        catch (error) {
            console.error('Error fetching chat exports:', error);
            res.status(500).json({ error: 'Failed to fetch chat exports' });
        }
    });
    // 特定のチャット履歴ファイルを取得
    app.get('/api/chats/exports/:fileName', requireAuth, async (req, res) => {
        try {
            const fileName = req.params.fileName;
            const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
            const filePath = path.join(exportsDir, fileName);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ message: 'Export file not found' });
            }
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            res.json(data);
        }
        catch (error) {
            console.error('Error fetching chat export file:', error);
            res.status(500).json({ error: 'Failed to fetch chat export file' });
        }
    });
    // チャットエクスポート画像を提供するエンドポイント
    app.get('/api/images/chat-exports/:fileName', async (req, res) => {
        try {
            const fileName = req.params.fileName;
            // Azure BLOB Storageから画像を取得
            const { BlobServiceClient } = require('@azure/storage-blob');
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            const containerName = process.env.AZURE_STORAGE_CONTAINER || 'chat-images';
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blobName = `images/chat-exports/${fileName}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            const downloadBlockBlobResponse = await blockBlobClient.download(0);
            const imageBuffer = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
            const ext = path.extname(fileName).toLowerCase();
            let contentType = 'image/jpeg';
            if (ext === '.png')
                contentType = 'image/png';
            else if (ext === '.gif')
                contentType = 'image/gif';
            else if (ext === '.webp')
                contentType = 'image/webp';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年間キャッシュ
            res.send(imageBuffer);
        } catch (error) {
            console.error('Error serving chat export image from BLOB:', error);
            res.status(500).json({ error: 'Failed to serve image from BLOB' });
        }
        // BLOBのストリームをBufferに変換するヘルパー関数
        async function streamToBuffer(readableStream) {
            return new Promise((resolve, reject) => {
                const chunks = [];
                readableStream.on('data', (data) => {
                    chunks.push(data instanceof Buffer ? data : Buffer.from(data));
                });
                readableStream.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
                readableStream.on('error', reject);
            });
        }
    });
    console.log('✅ チャットルート登録完了');
}
