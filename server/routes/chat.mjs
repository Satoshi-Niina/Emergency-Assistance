import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { createRequire } from 'module';

// requireを作成（CommonJSモジュール読み込み用）
const require = createRequire(import.meta.url);

// 動的インポートを使用
const loadModules = async () => {
  try {
    const { faultHistoryService } = await import('../services/fault-history-service.js');
    return { faultHistoryService };
  } catch (error) {
    console.error('モジュール読み込みエラー:', error);
    return { faultHistoryService: null };
  }
};

export async function registerChatRoutes(app) {
  console.log('📡 チャットルートを登録中...');
  
  const modules = await loadModules();
  const { faultHistoryService } = modules;

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
        '..',
        'knowledge-base',
        'exports'
      );
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
        console.log('exports フォルダを作成しました:', exportsDir);
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
        // テキストがない場合（画像のみ）は、デフォルトタイトルを使用
        incidentTitle = '画像による故障報告';
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
        title: incidentTitle,
        problemDescription: '詳細情報なし',
        machineType: chatData.machineInfo?.machineTypeName || '',
        machineNumber: chatData.machineInfo?.machineNumber || '',
        extractedComponents: [],
        extractedSymptoms: [],
        possibleModels: [],
        conversationHistory: chatData.messages.map(m => ({
          id: m.id,
          content: m.content,
          isAiResponse: m.isAiResponse,
          timestamp: m.createdAt,
          media: [],
        })),
        metadata: {
          total_messages: chatData.messages.length,
          user_messages: chatData.messages.filter(m => !m.isAiResponse).length,
          ai_messages: chatData.messages.filter(m => m.isAiResponse).length,
          total_media: 0,
          export_format_version: '2.0',
        },
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

      // チャットメッセージから画像を抽出して保存（バッファデータのみ対応）
      const savedImages = [];
      for (const message of chatData.messages) {
        if (message.content && Buffer.isBuffer(message.content)) {
          try {
            const ts = Date.now();
            const imageFileName = `chat_image_${chatId}_${ts}.png`;
            const imagePath = path.join(imagesDir, imageFileName);
            fs.writeFileSync(imagePath, message.content);
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
      } catch (writeError) {
        console.error('ファイル保存エラー:', writeError);
        throw writeError;
      }

      // DBにも保存（故障履歴サービス使用）
      try {
        console.log('📊 故障履歴をDBに保存中...');
        const dbSaveResult = await faultHistoryService.saveFaultHistory(exportData, {
          title: exportData.title,
          description: exportData.problemDescription,
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

      // knowledge-base/exports フォルダを作成（ルートディレクトリ）
      const exportsDir = path.join(
        process.cwd(),
        '..',
        'knowledge-base',
        'exports'
      );
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
        console.log('exports フォルダを作成しました:', exportsDir);
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
      } else {
        // テキストがない場合（画像のみ）は、デフォルトタイトルを使用
        incidentTitle = '画像による故障報告';
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
        userId: 'test-user',
        exportType: exportType || 'manual_send',
        exportTimestamp: new Date().toISOString(),
        title: incidentTitle,
        problemDescription: '詳細情報なし',
        machineType: chatData.machineInfo?.machineTypeName || '',
        machineNumber: chatData.machineInfo?.machineNumber || '',
        extractedComponents: [],
        extractedSymptoms: [],
        possibleModels: [],
        conversationHistory: chatData.messages.map((m) => ({
          id: m.id,
          content: m.content,
          isAiResponse: m.isAiResponse,
          timestamp: m.createdAt,
          media: [],
        })),
        metadata: {
          total_messages: chatData.messages.length,
          user_messages: chatData.messages.filter((m) => !m.isAiResponse).length,
          ai_messages: chatData.messages.filter((m) => m.isAiResponse).length,
          total_media: 0,
          export_format_version: '2.0',
        },
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

      // チャットメッセージから画像を抽出して保存（バッファデータのみ対応）
      const savedImages = [];
      for (const message of chatData.messages) {
        if (message.content && Buffer.isBuffer(message.content)) {
          try {
            const ts = Date.now();
            const imageFileName = `chat_image_${chatId}_${ts}.png`;
            const imagePath = path.join(imagesDir, imageFileName);
            fs.writeFileSync(imagePath, message.content);
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
      } catch (writeError) {
        console.error('ファイル保存エラー:', writeError);
        throw writeError;
      }

      // DBにも保存（故障履歴サービス使用）
      try {
        console.log('📊 故障履歴をDBに保存中...');
        const dbSaveResult = await faultHistoryService.saveFaultHistory(exportData, {
          title: exportData.title,
          description: exportData.problemDescription,
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
        message: 'チャットデータが正常に保存されました（テスト用）',
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

  console.log('✅ チャットルート登録完了');
}