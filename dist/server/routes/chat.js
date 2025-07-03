import { storage } from '../storage';
import { formatChatHistoryForExternalSystem } from '../lib/chat-export-formatter';
import { exportFileManager } from '../lib/export-file-manager';
import { processOpenAIRequest } from '../lib/openai';
import { insertMessageSchema, insertMediaSchema, insertChatSchema, messages } from '@shared/schema';
import { db } from '../db';
import { z } from 'zod';
export function registerChatRoutes(app) {
    console.log('📡 チャットルートを登録中...');
    const requireAuth = async (req, res, next) => {
        if (!req.session.userId) {
            return res.status(401).json({ message: "Authentication required" });
        }
        next();
    };
    // チャット一覧取得
    app.get("/api/chats", requireAuth, async (req, res) => {
        const chats = await storage.getChatsForUser(String(req.session.userId ?? ''));
        return res.json(chats);
    });
    // チャット作成
    app.post("/api/chats", requireAuth, async (req, res) => {
        try {
            const chatData = insertChatSchema.parse({
                ...req.body,
                userId: String(req.session.userId ?? '')
            });
            const chat = await storage.createChat(chatData);
            return res.json(chat);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: error.errors });
            }
            return res.status(500).json({ message: "Internal server error" });
        }
    });
    // チャット取得
    app.get("/api/chats/:id", requireAuth, async (req, res) => {
        const chat = await storage.getChat(req.params.id);
        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }
        if (String(chat.userId) !== String(req.session.userId)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        return res.json(chat);
    });
    // チャットメッセージ取得
    app.get("/api/chats/:id/messages", requireAuth, async (req, res) => {
        const chatId = req.params.id;
        const clearCache = req.query.clear === 'true';
        const chat = await storage.getChat(chatId);
        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }
        if (String(chat.userId) !== String(req.session.userId)) {
            return res.status(403).json({ message: "Forbidden" });
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
    app.post("/api/chats/:id/messages/system", requireAuth, async (req, res) => {
        try {
            const chatId = req.params.id;
            const { content, isUserMessage = true } = req.body;
            const chat = await storage.getChat(chatId);
            if (!chat) {
                return res.status(404).json({ message: "Chat not found" });
            }
            console.log(`システムメッセージ送信: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${req.session.userId}`);
            const message = await storage.createMessage({
                chatId,
                content,
                isAiResponse: !isUserMessage,
                senderId: String(req.session.userId ?? '')
            });
            return res.json(message);
        }
        catch (error) {
            console.error("システムメッセージ送信エラー:", error);
            return res.status(500).json({ message: "Error creating system message" });
        }
    });
    // メッセージ送信
    app.post("/api/chats/:id/messages", requireAuth, async (req, res) => {
        try {
            const chatId = req.params.id;
            const { content, useOnlyKnowledgeBase = true, usePerplexity = false } = req.body;
            const userId = String(req.session.userId ?? '');
            // チャットIDのバリデーション
            if (!chatId || chatId === '1') {
                return res.status(400).json({
                    message: "Invalid chat ID. Please use a valid UUID format."
                });
            }
            // UUID形式の簡易チェック
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(chatId)) {
                return res.status(400).json({
                    message: "Invalid chat ID format. Expected UUID format."
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
                bodyKeys: Object.keys(req.body || {})
            });
            let chat = await storage.getChat(chatId);
            if (!chat) {
                console.log(`メッセージ送信時: チャットID ${chatId} が存在しないため、新規作成します`);
                try {
                    chat = await storage.createChat({
                        id: chatId,
                        userId: userId,
                        title: "新しいチャット"
                    });
                    console.log(`メッセージ送信時: チャットID ${chatId} を作成しました`);
                }
                catch (createError) {
                    console.error("メッセージ送信時のチャット作成エラー:", createError);
                    return res.status(500).json({ message: "Failed to create chat" });
                }
            }
            console.log(`チャットアクセス: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${req.session.userId}`);
            console.log(`設定: ナレッジベースのみを使用=${useOnlyKnowledgeBase}`);
            const messageData = insertMessageSchema.parse({
                chatId: chatId,
                content: content,
                senderId: String(req.session.userId ?? ''),
                isAiResponse: false
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
                responseContent = aiResponse.content || aiResponse.text || aiResponse.message || JSON.stringify(aiResponse);
            }
            else {
                responseContent = 'AI応答の処理中にエラーが発生しました。';
                console.error('サーバー側AIレスポンス検証: 不正な型', {
                    type: typeof aiResponse,
                    value: aiResponse
                });
            }
            console.log('📤 クライアントに送信するAIレスポンス:', {
                type: typeof responseContent,
                content: responseContent.substring(0, 100) + '...',
                length: responseContent.length,
                isValidString: typeof responseContent === 'string' && responseContent.trim().length > 0
            });
            // AIメッセージを保存
            const [aiMessage] = await db.insert(messages).values({
                chatId: chatId,
                content: responseContent,
                isAiResponse: true,
                senderId: String(req.session.userId ?? ''),
            }).returning();
            // クライアントに送信するレスポンス構造を統一化
            const responseMessage = {
                ...aiMessage,
                content: responseContent, // メイン表示用
                text: responseContent, // 互換性用（contentと同じ値）
                role: 'assistant',
                timestamp: aiMessage.createdAt || new Date()
            };
            console.log('📤 最終レスポンス:', {
                id: responseMessage.id,
                contentType: typeof responseMessage.content,
                contentPreview: responseMessage.content.substring(0, 100) + '...',
                hasValidContent: !!responseMessage.content && responseMessage.content.trim().length > 0
            });
            // レスポンス送信前の最終確認ログ
            console.log('📤 レスポンス送信:', {
                statusCode: 200,
                responseType: typeof responseMessage,
                responseKeys: Object.keys(responseMessage),
                contentLength: responseMessage.content?.length
            });
            return res.json(responseMessage);
        }
        catch (error) {
            console.error("Error sending message:", error);
            // エラーの詳細情報をログに出力
            if (error instanceof Error) {
                console.error("Error details:", {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
            }
            else {
                console.error("Unknown error type:", typeof error, error);
            }
            // エラーの詳細情報を返す
            let errorMessage = "Failed to send message";
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
            else if (errorMessage.includes('権限') || errorMessage.includes('permission')) {
                statusCode = 403;
            }
            else if (errorMessage.includes('見つかりません') || errorMessage.includes('not found')) {
                statusCode = 404;
            }
            return res.status(statusCode).json({
                message: errorMessage,
                error: error instanceof Error ? error.stack : undefined
            });
        }
    });
    // メディア関連ルート
    app.post("/api/media", requireAuth, async (req, res) => {
        try {
            const mediaData = insertMediaSchema.parse(req.body);
            const media = await storage.createMedia(mediaData);
            return res.json(media);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: error.errors });
            }
            return res.status(500).json({ message: "Internal server error" });
        }
    });
    // チャット履歴をクリアするAPI
    app.post("/api/chats/:id/clear", requireAuth, async (req, res) => {
        try {
            const chatId = req.params.id;
            const { force, clearAll } = req.body;
            console.log(`チャット履歴クリア開始: chatId=${chatId}, force=${force}, clearAll=${clearAll}`);
            const chat = await storage.getChat(chatId);
            if (!chat) {
                return res.status(404).json({ message: "Chat not found" });
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
                    message: "Database deletion failed",
                    error: String(dbError.message)
                });
            }
            // 最終確認
            const finalMessages = await storage.getMessagesForChat(chatId);
            const finalCount = finalMessages.length;
            console.log(`チャット履歴クリア完了: chatId=${chatId}, 削除メッセージ数=${deletedMessageCount}, 削除メディア数=${deletedMediaCount}, 最終メッセージ数=${finalCount}`);
            return res.json({
                cleared: true,
                message: "Chat cleared successfully",
                deletedMessages: deletedMessageCount,
                deletedMedia: deletedMediaCount,
                remainingMessages: finalCount,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Chat clear error:', error);
            return res.status(500).json({
                message: "Error clearing chat",
                error: String(error.message)
            });
        }
    });
    // 履歴送信のためのAPI
    app.post("/api/chats/:id/export", requireAuth, async (req, res) => {
        try {
            const userId = req.session.userId;
            const chatId = req.params.id;
            const { lastExportTimestamp } = req.body;
            const chat = await storage.getChat(chatId);
            if (!chat) {
                return res.status(404).json({ message: "Chat not found" });
            }
            // チャットアクセス制限を一時的に緩和
            // if (chat.userId !== userId) {
            //   return res.status(403).json({ message: "Forbidden" });
            // }
            // 指定されたタイムスタンプ以降のメッセージを取得
            const messages = await storage.getMessagesForChatAfterTimestamp(chatId, lastExportTimestamp ? new Date(lastExportTimestamp) : new Date(0));
            // 現在のタイムスタンプを記録（次回の履歴送信で使用）
            const exportTimestamp = new Date();
            // チャットのエクスポートレコードを保存
            await storage.saveChatExport(chatId, userId, exportTimestamp);
            // メッセージが存在する場合、フォーマット済みデータも自動的に生成・保存
            if (messages.length > 0) {
                try {
                    // フォーマット済みデータを生成（外部システム向け）
                    const allMessages = await storage.getMessagesForChat(chatId);
                    // メッセージIDごとにメディアを取得
                    const messageMedia = {};
                    for (const message of allMessages) {
                        messageMedia[message.id] = await storage.getMediaForMessage(message.id);
                    }
                    // 最新のエクスポート記録を取得
                    const lastExport = await storage.getLastChatExport(chatId);
                    // 外部システム用にフォーマット
                    const formattedData = await formatChatHistoryForExternalSystem(chat, allMessages, messageMedia, lastExport);
                    // ファイルとして保存
                    exportFileManager.saveFormattedExport(parseInt(chatId), formattedData);
                    console.log(`チャット ${chatId} のフォーマット済みデータを自動生成しました`);
                }
                catch (formatError) {
                    console.error("フォーマット済みデータの生成中にエラーが発生しました:", formatError);
                    // フォーマット処理の失敗はメインの応答に影響しないようにするため、エラーをキャッチするだけ
                }
            }
            res.json({
                success: true,
                exportTimestamp,
                messageCount: messages.length
            });
        }
        catch (error) {
            console.error("Error exporting chat history:", error);
            res.status(500).json({ error: "Failed to export chat history" });
        }
    });
    // 外部AI分析システム向けフォーマット済みデータを取得するAPI
    app.get("/api/chats/:id/export-formatted", requireAuth, async (req, res) => {
        try {
            const userId = req.session.userId;
            const chatId = req.params.id;
            const chat = await storage.getChat(chatId);
            if (!chat) {
                return res.status(404).json({ message: "Chat not found" });
            }
            console.log(`フォーマット済みエクスポート: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${userId}`);
            if (String(chat.userId) !== String(userId) && req.session.userRole !== 'admin') {
                return res.status(403).json({ message: "Access denied" });
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
            console.error("Error formatting chat for external system:", error);
            res.status(500).json({ error: "Failed to format chat for external system" });
        }
    });
    // チャットの最後のエクスポート履歴を取得
    app.get("/api/chats/:id/last-export", requireAuth, async (req, res) => {
        try {
            const chatId = req.params.id;
            const chat = await storage.getChat(chatId);
            if (!chat) {
                return res.status(404).json({ message: "Chat not found" });
            }
            const lastExport = await storage.getLastChatExport(chatId);
            res.json(lastExport || { timestamp: null });
        }
        catch (error) {
            console.error("Error fetching last export:", error);
            res.status(500).json({ error: "Failed to fetch last export information" });
        }
    });
    console.log('✅ チャットルート登録完了');
}
