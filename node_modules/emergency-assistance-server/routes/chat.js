const express = require('express');
const OpenAI = require('openai');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');
const { db } = require('../db/index.js');
const { findRelevantImages } = require('../utils/image-matcher.js');
const { upload } = require('../utils/image-uploader.js');
const { storage } = require('../storage.js');
const { formatChatHistoryForExternalSystem } = require('../lib/chat-export-formatter.js');
const { exportFileManager } = require('../lib/export-file-manager.js');
const { processOpenAIRequest } = require('../lib/openai.js');
const { faultHistoryService } = require('../services/fault-history-service.js');
const {
  insertMessageSchema,
  insertMediaSchema,
  insertChatSchema,
  messages,
} = require('../db/schema.js');

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
    const chats = await storage.getChatsForUser(
      String(req.session.userId ?? '')
    );
    return res.json(chats);
  });

  // チャット作成
  app.post('/api/chats', requireAuth, async (req, res) => {
    try {
      const chatData = insertChatSchema.parse({
        ...req.body,
        userId: String(req.session.userId ?? ''),
      });
      const chat = await storage.createChat(chatData);
      return res.json(chat);
    } catch (error) {
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
    if (String(chat.userId) !== String(req.session.userId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (clearCache) {
      res.setHeader('X-Chat-Cleared', 'true');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.json([]);
    }
    const messages = await storage.getMessagesForChat(chat.id);
    const messagesWithMedia = await Promise.all(
      messages.map(async message => {
        const media = await storage.getMediaForMessage(message.id);
        return { ...message, media };
      })
    );
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
      console.log(
        `システムメッセージ送信: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${req.session.userId}`
      );
      const message = await storage.createMessage({
        chatId,
        content,
        isAiResponse: !isUserMessage,
        senderId: String(req.session.userId ?? ''),
      });
      return res.json(message);
    } catch (error) {
      console.error('システムメッセージ送信エラー:', error);
      return res.status(500).json({ message: 'Error creating system message' });
    }
  });

  // メッセージ送信
  app.post('/api/chats/:id/messages', requireAuth, async (req, res) => {
    try {
      const chatId = req.params.id;
      const {
        content,
        useOnlyKnowledgeBase = true,
        usePerplexity = false,
      } = req.body;
      const userId = String(req.session.userId ?? '');

      // チャットIDのバリデーション
      if (!chatId || chatId === '1') {
        return res.status(400).json({
          message: 'Invalid chat ID. Please use a valid UUID format.',
        });
      }

      // UUID形式の簡易チェック
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
        console.log(
          `メッセージ送信時: チャットID ${chatId} が存在しないため、新規作成します`
        );
        try {
          chat = await storage.createChat({
            id: chatId,
            userId: userId,
            title: '新しいチャット',
          });
          console.log(`メッセージ送信時: チャットID ${chatId} を作成しました`);
        } catch (createError) {
          console.error('メッセージ送信時のチャット作成エラー:', createError);
          return res.status(500).json({ message: 'Failed to create chat' });
        }
      }
      console.log(
        `チャットアクセス: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${req.session.userId}`
      );
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
        } catch (error) {
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
      } else if (aiResponse && typeof aiResponse === 'object') {
        // オブジェクト型の場合、適切なプロパティから文字列を抽出
        responseContent =
          aiResponse.content ||
          aiResponse.text ||
          aiResponse.message ||
          JSON.stringify(aiResponse);
      } else {
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
        isValidString:
          typeof responseContent === 'string' &&
          responseContent.trim().length > 0,
      });

      // AIメッセージを保存
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
        hasValidContent:
          !!responseMessage.content &&
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
    } catch (error) {
      console.error('Error sending message:', error);

      // エラーの詳細情報をログに出力
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      } else {
        console.error('Unknown error type:', typeof error, error);
      }

      // エラーの詳細情報を返す
      let errorMessage = 'Failed to send message';
      let statusCode = 500;

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        if ('message' in error) {
          errorMessage = String(error.message);
        }
      }

      // 特定のエラーに応じてステータスコードを調整
      if (errorMessage.includes('認証') || errorMessage.includes('auth')) {
        statusCode = 401;
      } else if (
        errorMessage.includes('権限') ||
        errorMessage.includes('permission')
      ) {
        statusCode = 403;
      } else if (
        errorMessage.includes('見つかりません') ||
        errorMessage.includes('not found')
      ) {
        statusCode = 404;
      }

      return res.status(statusCode).json({
        message: errorMessage,
        error: error instanceof Error ? error.stack : undefined,
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
      if (
        !chatData ||
        !chatData.messages ||
        !Array.isArray(chatData.messages)
      ) {
        return res.status(400).json({
          error: 'Invalid chat data format',
          details: 'chatData.messages must be an array',
        });
      }

      // knowledge-base/exports フォルダを作成（プロジェクトルート）
      const exportsDir = path.join(
        process.cwd(),
        'knowledge-base',
        'exports'
      );
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
        console.log('exports フォルダを作成しました:', exportsDir);
      }

      // 新しいフォーマット関数を使用してエクスポートデータを生成
      const { formatChatHistoryForHistoryUI } = require('../lib/chat-export-formatter.js');

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
        formattedHistoryData = await formatChatHistoryForHistoryUI(
          chat,
          allMessages,
          messageMedia,
          chatData.machineInfo
        );
      } catch (formatError) {
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
          conversation_history: allMessages.map(m => ({
            id: m.id,
            content: m.content,
            isAiResponse: m.isAiResponse,
            timestamp: m.createdAt,
            media: [],
          })),
          export_timestamp: new Date().toISOString(),
          metadata: {
            total_messages: allMessages.length,
            user_messages: allMessages.filter(m => !m.isAiResponse).length,
            ai_messages: allMessages.filter(m => m.isAiResponse).length,
            total_media: 0,
            export_format_version: '2.0',
          },
        };
      }

      // 事象内容をファイル名に含める（画像が先でも発生事象を優先）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      // ユーザーメッセージからテキストのみを抽出（画像を除外）
      const userMessages = chatData.messages.filter(m => !m.isAiResponse);
      const textMessages = userMessages
        .map(m => m.content)
        .filter(content => !content.trim().startsWith('data:image/'))
        .join('\n')
        .trim();

      let incidentTitle = '事象なし';

      if (textMessages) {
        // テキストがある場合は最初の行を使用
        incidentTitle = textMessages.split('\n')[0].trim();
      } else {
        // テキストがない場合（画像のみ）は、フォーマットされたタイトルを使用
        incidentTitle = formattedHistoryData.title || '画像による故障報告';
      }

      // ファイル名用に事象内容をサニタイズ（特殊文字を除去）
      const sanitizedTitle = incidentTitle
        .replace(/[<>:"/\\|?*]/g, '') // ファイル名に使用できない文字を除去
        .replace(/\s+/g, '_') // スペースをアンダースコアに変換
        .substring(0, 50); // 長さを制限

      const fileName = `${sanitizedTitle}_${chatId}_${timestamp}.json`;
      const filePath = path.join(exportsDir, fileName);

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
        conversationHistory: formattedHistoryData.conversation_history,
        metadata: formattedHistoryData.metadata,
        originalChatData: chatData, // 元のデータも保持
      };

      // 画像を個別ファイルとして保存
      const imagesDir = path.join(
        process.cwd(),
        '..',
        'knowledge-base',
        'images',
        'chat-exports'
      );
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
        console.log('画像保存ディレクトリを作成しました:', imagesDir);
      }

      // チャットメッセージから画像を抽出して保存
      const savedImages = [];
      for (const message of chatData.messages) {
        if (message.content && message.content.startsWith('data:image/')) {
          try {
            // Base64データから画像を抽出
            const base64Data = message.content.replace(
              /^data:image\/[a-z]+;base64,/,
              ''
            );
            const buffer = Buffer.from(base64Data, 'base64');

            // ファイル名を生成
            const timestamp = Date.now();
            const imageFileName = `chat_image_${chatId}_${timestamp}.jpg`;
            const imagePath = path.join(imagesDir, imageFileName);

            // 画像ファイルを保存
            fs.writeFileSync(imagePath, buffer);
            console.log('画像ファイルを保存しました:', imagePath);

            savedImages.push({
              messageId: message.id,
              fileName: imageFileName,
              path: imagePath,
              url: `/api/images/chat-exports/${imageFileName}`,
            });
          } catch (imageError) {
            console.warn('画像保存エラー:', imageError);
          }
        }
      }

      // 保存した画像情報をエクスポートデータに追加
      exportData.savedImages = savedImages;

      // UTF-8エンコーディングでJSONファイルを保存（BOMなし）
      const jsonString = JSON.stringify(exportData, null, 2);
      try {
        // UTF-8 BOMなしで保存
        fs.writeFileSync(filePath, jsonString, 'utf8');
        console.log('チャットデータを保存しました:', filePath);
        console.log('保存されたデータサイズ:', Buffer.byteLength(jsonString, 'utf8'), 'bytes');
      } catch (writeError) {
        console.error('ファイル保存エラー:', writeError);
        throw writeError;
      }

      // DBにも保存（故障履歴サービス使用）
      try {
        console.log('📊 故障履歴をDBに保存中...');
        const dbSaveResult = await faultHistoryService.saveFaultHistory(exportData, {
          title: formattedHistoryData.title,
          description: formattedHistoryData.problem_description,
          extractImages: true, // 画像も抽出・保存
        });
        console.log('✅ 故障履歴をDBに保存完了:', dbSaveResult.id);
      } catch (dbError) {
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
    } catch (error) {
      console.error('Error sending chat data:', error);
      res.status(500).json({
        error: 'Failed to send chat data',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // その他のエンドポイント...（簡略化）

  console.log('✅ チャットルート登録完了');
}

module.exports = { registerChatRoutes };
module.exports.default = { registerChatRoutes };