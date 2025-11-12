"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChatRoutes = registerChatRoutes;
const zod_1 = require("zod");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const sharp_1 = __importDefault(require("sharp"));
const index_js_1 = require("../db/index.js");
const storage_js_1 = require("../storage.js");
const chat_export_formatter_js_1 = require("../lib/chat-export-formatter.js");
const openai_js_1 = require("../lib/openai.js");
const fault_history_service_js_1 = require("../services/fault-history-service.js");
const schema_js_1 = require("../db/schema.js");
const image_encoding_js_1 = require("../utils/image-encoding.js");
// ESM用__dirname
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
function registerChatRoutes(app) {
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
        const chats = await storage_js_1.storage.getChatsForUser(String(req.session.userId ?? ''));
        return res.json(chats);
    });
    // チャット作成
    app.post('/api/chats', requireAuth, async (req, res) => {
        try {
            // チャット作成時のreq.session
            const chatData = schema_js_1.insertChatSchema.parse({
                ...req.body,
                userId: String(req.session.userId ?? ''),
            });
            const chat = await storage_js_1.storage.createChat(chatData);
            return res.json(chat);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: error.errors });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    });
    // チャット取得
    app.get('/api/chats/:id', requireAuth, async (req, res) => {
        const chat = await storage_js_1.storage.getChat(req.params.id);
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
        const chat = await storage_js_1.storage.getChat(chatId);
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
        const messages = await storage_js_1.storage.getMessagesForChat(chat.id);
        const messagesWithMedia = await Promise.all(messages.map(async (message) => {
            const media = await storage_js_1.storage.getMediaForMessage(message.id);
            return { ...message, media };
        }));
        return res.json(messagesWithMedia);
    });
    // システムメッセージ送信
    app.post('/api/chats/:id/messages/system', requireAuth, async (req, res) => {
        try {
            const chatId = req.params.id;
            const { content, isUserMessage = true } = req.body;
            const chat = await storage_js_1.storage.getChat(chatId);
            if (!chat) {
                return res.status(404).json({ message: 'Chat not found' });
            }
            console.log(`システムメッセージ送信: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${req.session.userId}`);
            const message = await storage_js_1.storage.createMessage({
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
            let chat = await storage_js_1.storage.getChat(chatId);
            if (!chat) {
                console.log(`メッセージ送信時: チャットID ${chatId} が存在しないため、新規作成します`);
                try {
                    chat = await storage_js_1.storage.createChat({
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
            const messageData = schema_js_1.insertMessageSchema.parse({
                chatId: chatId,
                content: content,
                senderId: String(req.session.userId ?? ''),
                isAiResponse: false,
            });
            const message = await storage_js_1.storage.createMessage(messageData);
            const getAIResponse = async (content, useKnowledgeBase) => {
                try {
                    return await (0, openai_js_1.processOpenAIRequest)(content, useKnowledgeBase);
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
            const [aiMessage] = await index_js_1.db
                .insert(schema_js_1.messages)
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
            const mediaData = schema_js_1.insertMediaSchema.parse(req.body);
            const media = await storage_js_1.storage.createMedia(mediaData);
            return res.json(media);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
            const chat = await storage_js_1.storage.getChat(chatId);
            if (!chat) {
                return res.status(404).json({ message: 'Chat not found' });
            }
            console.log(`チャット履歴クリア: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${req.session.userId}`);
            let deletedMessageCount = 0;
            let deletedMediaCount = 0;
            try {
                // まず現在のメッセージ数を確認
                const beforeMessages = await storage_js_1.storage.getMessagesForChat(chatId);
                const beforeCount = beforeMessages.length;
                console.log(`削除前のメッセージ数: ${beforeCount}`);
                // 各メッセージに関連するメディアも削除
                for (const message of beforeMessages) {
                    try {
                        const media = await storage_js_1.storage.getMediaForMessage(message.id);
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
                    const result = await storage_js_1.storage.clearChatMessages(chatId);
                    console.log(`データベース削除結果:`, result);
                }
                catch (clearError) {
                    console.error('clearChatMessages実行エラー:', clearError);
                    // 個別削除にフォールバック
                }
                // 削除後のメッセージ数を確認
                const afterMessages = await storage_js_1.storage.getMessagesForChat(chatId);
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
            const finalMessages = await storage_js_1.storage.getMessagesForChat(chatId);
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
                chat = await storage_js_1.storage.getChat(chatId);
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
            // knowledge-base/exports フォルダを作成（ルートディレクトリ）
            const exportsDir = path_1.default.join(process.cwd(), '..', 'knowledge-base', 'exports');
            if (!fs_1.default.existsSync(exportsDir)) {
                fs_1.default.mkdirSync(exportsDir, { recursive: true });
                console.log('exports フォルダを作成しました:', exportsDir);
            }
            // チャットデータをJSONファイルとして保存
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            // ユーザーメッセージから事象情報を抽出してファイル名に使用
            const userMessages = chatData.messages.filter((m) => !m.isAiResponse);
            console.log('🔍 事象抽出 - ユーザーメッセージ:', userMessages);
            const textMessages = userMessages
                .map((m) => m.content)
                .filter((content) => !content.trim().startsWith('data:image/'))
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
            const fileName = `${sanitizedTitle}_${chatId}_${timestamp}.json`;
            const filePath = path_1.default.join(exportsDir, fileName);
            // 画像を個別ファイルとして保存
            // パス解決（複数の可能性を試す）
            const projectRoot = path_1.default.resolve(__dirname, '..', '..');
            const possibleImagesDirs = [
                path_1.default.join(projectRoot, 'knowledge-base', 'images', 'chat-exports'),
                path_1.default.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports'),
                path_1.default.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports'),
                path_1.default.join(__dirname, '..', '..', 'knowledge-base', 'images', 'chat-exports'),
            ];
            let imagesDir = null;
            for (const testDir of possibleImagesDirs) {
                if (!fs_1.default.existsSync(testDir)) {
                    try {
                        fs_1.default.mkdirSync(testDir, { recursive: true });
                        imagesDir = testDir;
                        console.log('画像保存ディレクトリを作成しました:', imagesDir);
                        break;
                    }
                    catch (err) {
                        continue;
                    }
                }
                else {
                    imagesDir = testDir;
                    break;
                }
            }
            if (!imagesDir) {
                // 最後の手段として、プロジェクトルートを使用
                imagesDir = path_1.default.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
                fs_1.default.mkdirSync(imagesDir, { recursive: true });
                console.log('画像保存ディレクトリを作成しました（フォールバック）:', imagesDir);
            }
            // チャットメッセージから画像を抽出してファイルとして保存
            const savedImages = [];
            const cleanedChatData = JSON.parse(JSON.stringify(chatData)); // ディープコピー
            for (const message of cleanedChatData.messages) {
                if (message.content && message.content.startsWith('data:image/')) {
                    try {
                        // 画像データから画像を抽出
                        const dataUriPattern = new RegExp(`^data:image/[a-z]+;${image_encoding_js_1.IMAGE_DATA_ENCODING},`);
                        const imageData = message.content.replace(dataUriPattern, '');
                        const buffer = Buffer.from(imageData, image_encoding_js_1.IMAGE_DATA_ENCODING);
                        // ファイル名を生成
                        const imageTimestamp = Date.now();
                        const imageFileName = `chat_image_${chatId}_${imageTimestamp}.jpg`;
                        const imagePath = path_1.default.join(imagesDir, imageFileName);
                        // 画像を120pxにリサイズして保存
                        try {
                            const resizedBuffer = await (0, sharp_1.default)(buffer)
                                .resize(120, 120, {
                                fit: 'inside', // アスペクト比を維持しながら、120x120以内に収める
                                withoutEnlargement: true, // 拡大しない
                            })
                                .jpeg({ quality: 85 })
                                .toBuffer();
                            fs_1.default.writeFileSync(imagePath, resizedBuffer);
                            console.log('画像ファイルを保存しました（120pxにリサイズ）:', imagePath);
                        }
                        catch (resizeError) {
                            // リサイズに失敗した場合は元の画像を保存
                            console.warn('画像リサイズエラー、元の画像を保存:', resizeError);
                            fs_1.default.writeFileSync(imagePath, buffer);
                            console.log('画像ファイルを保存しました（リサイズなし）:', imagePath);
                        }
                        const imageUrl = `/api/images/chat-exports/${imageFileName}`;
                        // 画像データをURLに置き換え
                        message.content = imageUrl;
                        savedImages.push({
                            messageId: message.id,
                            fileName: imageFileName,
                            path: imagePath,
                            url: imageUrl,
                        });
                    }
                    catch (imageError) {
                        console.warn('画像保存エラー:', imageError);
                        // エラー時は画像データを削除
                        message.content = '[画像データ削除]';
                    }
                }
            }
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
            // titleフィールドの値でファイル名を再生成
            const finalSanitizedTitle = exportData.title
                .replace(/[<>:"/\\|?*]/g, '') // ファイル名に使用できない文字を除去
                .replace(/\s+/g, '_') // スペースをアンダースコアに変換
                .substring(0, 50); // 長さを制限
            console.log('🔍 事象抽出 - 最終サニタイズ済みタイトル:', finalSanitizedTitle);
            const finalFileName = `${finalSanitizedTitle}_${chatId}_${timestamp}.json`;
            const finalFilePath = path_1.default.join(exportsDir, finalFileName);
            console.log('🔍 事象抽出 - 最終ファイル名:', finalFileName);
            // エクスポートデータは既に画像データが除去されているので、そのまま使用
            const cleanedExportData = exportData;
            // UTF-8エンコーディングでJSONファイルを保存（BOMなし）
            const jsonString = JSON.stringify(cleanedExportData, null, 2);
            try {
                // UTF-8 BOMなしで保存
                fs_1.default.writeFileSync(finalFilePath, jsonString, 'utf8');
                console.log('チャットデータを保存しました:', finalFilePath);
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
            const exportsDir = path_1.default.join(process.cwd(), '..', 'knowledge-base', 'exports');
            if (!fs_1.default.existsSync(exportsDir)) {
                return res.json([]);
            }
            const files = fs_1.default
                .readdirSync(exportsDir)
                .filter(file => file.endsWith('.json'))
                .map(file => {
                const filePath = path_1.default.join(exportsDir, file);
                const stats = fs_1.default.statSync(filePath);
                const content = fs_1.default.readFileSync(filePath, 'utf8');
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
            // knowledge-base/exports フォルダを作成（プロジェクトルート）
            const exportsDir = path_1.default.join(process.cwd(), 'knowledge-base', 'exports');
            if (!fs_1.default.existsSync(exportsDir)) {
                fs_1.default.mkdirSync(exportsDir, { recursive: true });
                console.log('exports フォルダを作成しました:', exportsDir);
            }
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
            // 事象内容をファイル名に含める（画像が先でも発生事象を優先）
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            // ユーザーメッセージからテキストのみを抽出（画像を除外）
            const userMessages = chatData.messages.filter((m) => !m.isAiResponse);
            const textMessages = userMessages
                .map((m) => m.content)
                .filter(content => !content.trim().startsWith('data:image/'))
                .join('\n')
                .trim();
            let incidentTitle = '事象なし';
            if (textMessages) {
                // テキストがある場合は最初の行を使用
                incidentTitle = textMessages.split('\n')[0].trim();
            }
            else {
                // テキストがない場合（画像のみ）は、フォーマットされたタイトルを使用
                incidentTitle = formattedHistoryData.title || '画像による故障報告';
            }
            // ファイル名用に事象内容をサニタイズ（特殊文字を除去）
            const sanitizedTitle = incidentTitle
                .replace(/[<>:"/\\|?*]/g, '') // ファイル名に使用できない文字を除去
                .replace(/\s+/g, '_') // スペースをアンダースコアに変換
                .substring(0, 50); // 長さを制限
            const fileName = `${sanitizedTitle}_${chatId}_${timestamp}.json`;
            const filePath = path_1.default.join(exportsDir, fileName);
            // 画像を個別ファイルとして保存
            // パス解決（複数の可能性を試す）
            const projectRoot = path_1.default.resolve(__dirname, '..', '..');
            const possibleImagesDirs = [
                path_1.default.join(projectRoot, 'knowledge-base', 'images', 'chat-exports'),
                path_1.default.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports'),
                path_1.default.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports'),
                path_1.default.join(__dirname, '..', '..', 'knowledge-base', 'images', 'chat-exports'),
            ];
            let imagesDir = null;
            for (const testDir of possibleImagesDirs) {
                if (!fs_1.default.existsSync(testDir)) {
                    try {
                        fs_1.default.mkdirSync(testDir, { recursive: true });
                        imagesDir = testDir;
                        console.log('画像保存ディレクトリを作成しました:', imagesDir);
                        break;
                    }
                    catch (err) {
                        continue;
                    }
                }
                else {
                    imagesDir = testDir;
                    break;
                }
            }
            if (!imagesDir) {
                // 最後の手段として、プロジェクトルートを使用
                imagesDir = path_1.default.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
                fs_1.default.mkdirSync(imagesDir, { recursive: true });
                console.log('画像保存ディレクトリを作成しました（フォールバック）:', imagesDir);
            }
            // チャットメッセージから画像を抽出してファイルとして保存
            const savedImages = [];
            const cleanedChatData = JSON.parse(JSON.stringify(chatData)); // ディープコピー
            for (const message of cleanedChatData.messages) {
                if (message.content && message.content.startsWith('data:image/')) {
                    try {
                        // 画像データから画像を抽出
                        const dataUriPattern = new RegExp(`^data:image/[a-z]+;${image_encoding_js_1.IMAGE_DATA_ENCODING},`);
                        const imageData = message.content.replace(dataUriPattern, '');
                        const buffer = Buffer.from(imageData, image_encoding_js_1.IMAGE_DATA_ENCODING);
                        // ファイル名を生成
                        const imageTimestamp = Date.now();
                        const imageFileName = `chat_image_${chatId}_${imageTimestamp}.jpg`;
                        const imagePath = path_1.default.join(imagesDir, imageFileName);
                        // 画像を120pxにリサイズして保存
                        try {
                            const resizedBuffer = await (0, sharp_1.default)(buffer)
                                .resize(120, 120, {
                                fit: 'inside', // アスペクト比を維持しながら、120x120以内に収める
                                withoutEnlargement: true, // 拡大しない
                            })
                                .jpeg({ quality: 85 })
                                .toBuffer();
                            fs_1.default.writeFileSync(imagePath, resizedBuffer);
                            console.log('画像ファイルを保存しました（120pxにリサイズ）:', imagePath);
                        }
                        catch (resizeError) {
                            // リサイズに失敗した場合は元の画像を保存
                            console.warn('画像リサイズエラー、元の画像を保存:', resizeError);
                            fs_1.default.writeFileSync(imagePath, buffer);
                            console.log('画像ファイルを保存しました（リサイズなし）:', imagePath);
                        }
                        const imageUrl = `/api/images/chat-exports/${imageFileName}`;
                        // 画像データをURLに置き換え
                        message.content = imageUrl;
                        savedImages.push({
                            messageId: message.id,
                            fileName: imageFileName,
                            path: imagePath,
                            url: imageUrl,
                        });
                    }
                    catch (imageError) {
                        console.warn('画像保存エラー:', imageError);
                        // エラー時は画像データを削除
                        message.content = '[画像データ削除]';
                    }
                }
            }
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
            };
            // エクスポートデータは既に画像データが除去されているので、そのまま使用
            const cleanedExportData = exportData;
            // UTF-8エンコーディングでJSONファイルを保存（BOMなし）
            const jsonString = JSON.stringify(cleanedExportData, null, 2);
            try {
                // UTF-8 BOMなしで保存
                fs_1.default.writeFileSync(filePath, jsonString, 'utf8');
                console.log('チャットデータを保存しました:', filePath);
                console.log('保存されたデータサイズ:', Buffer.byteLength(jsonString, 'utf8'), 'bytes');
            }
            catch (writeError) {
                console.error('ファイル保存エラー:', writeError);
                throw writeError;
            }
            // DBにも保存（故障履歴サービス使用）
            try {
                console.log('📊 故障履歴をDBに保存中...');
                const dbSaveResult = await fault_history_service_js_1.faultHistoryService.saveFaultHistory(exportData, {
                    title: formattedHistoryData.title,
                    description: formattedHistoryData.problem_description,
                    extractImages: true, // 画像も抽出・保存
                });
                console.log('✅ 故障履歴をDBに保存完了:', dbSaveResult.id);
            }
            catch (dbError) {
                console.error('❌ DB保存エラー（ファイル保存は成功）:', dbError);
                // ファイル保存は成功しているので、エラーにはしない
            }
            console.log('チャットエクスポートがファイルとDBに保存されました');
            // 成功レスポンス
            res.json({
                success: true,
                message: 'チャットデータが正常に保存されました',
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
    // 外部AI分析システム向けフォーマット済みデータを取得するAPI
    app.get('/api/chats/:id/export-formatted', requireAuth, async (req, res) => {
        try {
            const userId = req.session.userId;
            const chatId = req.params.id;
            const chat = await storage_js_1.storage.getChat(chatId);
            if (!chat) {
                return res.status(404).json({ message: 'Chat not found' });
            }
            console.log(`フォーマット済みエクスポート: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${userId}`);
            if (String(chat.userId) !== String(userId) &&
                req.session.userRole !== 'admin') {
                return res.status(403).json({ message: 'Access denied' });
            }
            const messages = await storage_js_1.storage.getMessagesForChat(chatId);
            const messageMedia = {};
            for (const message of messages) {
                messageMedia[message.id] = await storage_js_1.storage.getMediaForMessage(message.id);
            }
            const lastExport = await storage_js_1.storage.getLastChatExport(chatId);
            const formattedData = await (0, chat_export_formatter_js_1.formatChatHistoryForExternalSystem)(chat, messages, messageMedia, lastExport);
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
            const chat = await storage_js_1.storage.getChat(chatId);
            if (!chat) {
                return res.status(404).json({ message: 'Chat not found' });
            }
            const lastExport = await storage_js_1.storage.getLastChatExport(chatId);
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
            const exportsDir = path_1.default.join(process.cwd(), '..', 'knowledge-base', 'exports');
            if (!fs_1.default.existsSync(exportsDir)) {
                return res.json([]);
            }
            // 再帰的にJSONファイルを検索する関数
            const findJsonFiles = (dir, baseDir = exportsDir) => {
                const files = [];
                const items = fs_1.default.readdirSync(dir);
                for (const item of items) {
                    const itemPath = path_1.default.join(dir, item);
                    const stats = fs_1.default.statSync(itemPath);
                    if (stats.isDirectory()) {
                        // サブディレクトリを再帰的に検索
                        files.push(...findJsonFiles(itemPath, baseDir));
                    }
                    else if (item.endsWith('.json')) {
                        try {
                            const content = fs_1.default.readFileSync(itemPath, 'utf8');
                            const data = JSON.parse(content);
                            // 相対パスを計算
                            const relativePath = path_1.default.relative(baseDir, itemPath);
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
            const exportsDir = path_1.default.join(process.cwd(), '..', 'knowledge-base', 'exports');
            const filePath = path_1.default.join(exportsDir, fileName);
            if (!fs_1.default.existsSync(filePath)) {
                return res.status(404).json({ message: 'Export file not found' });
            }
            const content = fs_1.default.readFileSync(filePath, 'utf8');
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
            const imagePath = path_1.default.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports', fileName);
            if (!fs_1.default.existsSync(imagePath)) {
                return res.status(404).json({ message: 'Image not found' });
            }
            // 画像ファイルを読み込んで送信
            const imageBuffer = fs_1.default.readFileSync(imagePath);
            const ext = path_1.default.extname(fileName).toLowerCase();
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
        }
        catch (error) {
            console.error('Error serving chat export image:', error);
            res.status(500).json({ error: 'Failed to serve image' });
        }
    });
    console.log('✅ チャットルート登録完了');
}
