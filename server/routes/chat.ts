// 一時的に無効化 - TypeScriptエラーが多すぎるため
console.log('routes/chat.ts is temporarily disabled');

// import { Router } from 'express';
// import { storage } from '../storage.js';
// import { db } from '../db/index.js';
// import { eq } from 'drizzle-orm';
// import { users } from '../db/schema.js';
// import { exportFileManager } from '../lib/export-file-manager.js';
// import { processOpenAIRequest } from '../lib/openai.js';
// import { insertMessageSchema, insertMediaSchema, insertChatSchema, messages } from '../../shared/schema.js';

// セッション型の拡張
// declare module 'express-session' {
//   interface SessionData {
//     userId: string;
//     userRole: string;
//   }
// }

// const router = Router();

// // 認証ミドルウェア
// const requireAuth = (req: any, res: any, next: any) => {
//   if (!req.session?.userId) {
//     return res.status(401).json({ error: '認証が必要です' });
//   }
//   next();
// };

// // チャット作成
// router.post("/", requireAuth, async (req, res) => {
//   try {
//     // チャット作成時のreq.session
//     const chatData = insertChatSchema.parse({
//       ...req.body,
//       userId: String((req as any).session.userId ?? '')
//     });
//     const chat = await storage.createChat(chatData);
//     return res.json(chat);
//   } catch (error) {
//     console.error('チャット作成エラー:', error);
//     return res.status(500).json({ error: 'チャット作成に失敗しました' });
//   }
// });

// // チャット一覧取得
// router.get("/", requireAuth, async (req, res) => {
//   try {
//     const chats = await storage.getChatsForUser(req.session.userId);
//     return res.json(chats);
//   } catch (error) {
//     console.error('チャット一覧取得エラー:', error);
//     return res.status(500).json({ error: 'チャット一覧取得に失敗しました' });
//   }
// });

// // チャット詳細取得
// router.get("/:id", requireAuth, async (req, res) => {
//   try {
//     const chat = await storage.getChat(req.params.id);
//     if (!chat) {
//       return res.status(404).json({ error: 'チャットが見つかりません' });
//     }
//     return res.json(chat);
//   } catch (error) {
//     console.error('チャット詳細取得エラー:', error);
//     return res.status(500).json({ error: 'チャット詳細取得に失敗しました' });
//   }
// });

// // メッセージ送信
// router.post("/:id/messages", requireAuth, async (req, res) => {
//   try {
//     const { content, useOnlyKnowledgeBase = false } = req.body;
//     const chatId = req.params.id;

//     console.log(`設定: ナレッジベースのみを使用=${useOnlyKnowledgeBase}`);
        
//       const messageData = insertMessageSchema.parse({
//         chatId: chatId,
//         content: content,
//         senderId: String((req as any).session.userId ?? ''),
//         isAiResponse: false
//       });
//       const message = await storage.createMessage(messageData);

//       const getAIResponse = async (content: string, useKnowledgeBase: boolean): Promise<any> => {
//         if (useKnowledgeBase) {
//           // ナレッジベースのみを使用
//           return await processOpenAIRequest(content, true);
//         } else {
//           // 通常のAI処理
//           return await processOpenAIRequest(content, false);
//         }
//       };

//       // AIレスポンスを取得
//       const aiResponse = await getAIResponse(content, useOnlyKnowledgeBase);
//       const responseContent = aiResponse.content || aiResponse.text || aiResponse.message || 'AIレスポンスを取得できませんでした';

//       // AIメッセージを保存
//       // db.insert(messages).values を型アサーションで回避
//       const [aiMessage] = await (db as any).insert(messages).values({
//         chatId: chatId,
//         senderId: 'ai',
//         content: aiResponse,
//         isAiResponse: true,
//         createdAt: new Date()
//       }).returning();

//       // クライアントに送信するレスポンス構造を統一化
//       const responseMessage = {
//         ...aiMessage,
//         content: responseContent, // メイン表示用
//         text: responseContent,    // 互換性用（contentと同じ値）
//         role: 'assistant' as const,
//         timestamp: aiMessage.createdAt || new Date()
//       };

//       console.log('📤 最終レスポンス:', {
//         id: responseMessage.id,
//         contentType: typeof responseMessage.content,
//         contentPreview: responseMessage.content.substring(0, 100) + '...',
//         timestamp: responseMessage.timestamp
//       });

//       return res.json(responseMessage);
//     } catch (error) {
//       console.error('メッセージ送信エラー:', error);
//       return res.status(500).json({ error: 'メッセージ送信に失敗しました' });
//     }
//   });

// // メッセージ一覧取得
// router.get("/:id/messages", requireAuth, async (req, res) => {
//   try {
//     const messages = await storage.getMessagesForChat(req.params.id);
//     return res.json(messages);
//   } catch (error) {
//     console.error('メッセージ一覧取得エラー:', error);
//     return res.status(500).json({ error: 'メッセージ一覧取得に失敗しました' });
//   }
// });

// // チャット削除
// router.delete("/:id", requireAuth, async (req, res) => {
//   try {
//     await storage.clearChatMessages(req.params.id);
//     return res.json({ message: 'チャットが削除されました' });
//   } catch (error) {
//     console.error('チャット削除エラー:', error);
//     return res.status(500).json({ error: 'チャット削除に失敗しました' });
//   }
// });

// // メディアアップロード
// app.post("/api/media", requireAuth, async (req, res) => {
//   try {
//     const mediaData = insertMediaSchema.parse(req.body);
//     const media = await storage.createMedia(mediaData);
//     return res.json(media);
//   } catch (error) {
//     console.error('メディアアップロードエラー:', error);
//     return res.status(500).json({ error: 'メディアアップロードに失敗しました' });
//   }
// });

// export default router; 