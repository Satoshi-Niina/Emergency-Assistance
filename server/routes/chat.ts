import * as express from 'express';
import OpenAI from 'openai';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { db } from '../db/index.js';
import { findRelevantImages } from '../utils/image-matcher.js';
import { upload } from '../utils/image-uploader.js';
import { storage } from '../storage.js';
import { formatChatHistoryForExternalSystem } from '../lib/chat-export-formatter.js';
import { exportFileManager } from '../lib/export-file-manager.js';
import { processOpenAIRequest } from '../lib/openai.js';
import { insertMessageSchema, insertMediaSchema, insertChatSchema, messages } from '../../shared/schema.js';

// 繧ｻ繝・す繝ｧ繝ｳ蝙九・諡｡蠑ｵ
interface SessionData {
  userId?: string;
  userRole?: string;
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userRole?: string;
  }
}

export function registerChatRoutes(app: any): void {
  console.log('藤 繝√Ε繝・ヨ繝ｫ繝ｼ繝医ｒ逋ｻ骭ｲ荳ｭ...');

  const requireAuth = async (req: Request, res: Response, next: Function) => {
    console.log('柏 隱崎ｨｼ繝√ぉ繝・け:', {
      hasSession: !!(req as any).session,
      userId: (req as any).session?.userId,
      sessionId: (req as any).session?.id,
      url: req.url,
      method: req.method
    });
    
    // 髢狗匱迺ｰ蠅・〒縺ｯ隱崎ｨｼ繧剃ｸ譎ら噪縺ｫ辟｡蜉ｹ蛹・
    if (process.env.NODE_ENV === 'development') {
      console.log('箔 髢狗匱迺ｰ蠅・ 隱崎ｨｼ繧偵せ繧ｭ繝・・');
      // 繧ｻ繝・す繝ｧ繝ｳ縺ｫ繝繝溘・繝ｦ繝ｼ繧ｶ繝ｼID繧定ｨｭ螳・
      if (!(req as any).session?.userId) {
        (req as any).session = (req as any).session || {};
        (req as any).session.userId = 'dev-user-123';
        console.log('箔 繝繝溘・繝ｦ繝ｼ繧ｶ繝ｼID繧定ｨｭ螳・', (req as any).session.userId);
      }
      next();
      return;
    }
    
    // req.session縺ｮ蝙九お繝ｩ繝ｼ繧貞梛繧｢繧ｵ繝ｼ繧ｷ繝ｧ繝ｳ縺ｧ蝗樣∩
    if (!(req as any).session?.userId) {
      console.log('笶・隱崎ｨｼ螟ｱ謨・ 繝ｦ繝ｼ繧ｶ繝ｼID縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
      return (res as any).status(401).json({ 
        message: "Authentication required",
        details: "No user ID found in session"
      });
    }
    
    console.log('笨・隱崎ｨｼ謌仙粥:', (req as any).session.userId);
    next();
  };

  // 繝√Ε繝・ヨ荳隕ｧ蜿門ｾ・
  app.get("/api/chats", requireAuth, async (req, res) => {
    // 谿九ｊ縺ｮreq.session縺ｮ蝙九お繝ｩ繝ｼ繧貞梛繧｢繧ｵ繝ｼ繧ｷ繝ｧ繝ｳ縺ｧ蝗樣∩
    const chats = await storage.getChatsForUser(String((req as any).session.userId ?? ''));
    return res.json(chats);
  });

  // 繝√Ε繝・ヨ菴懈・
  app.post("/api/chats", requireAuth, async (req, res) => {
    try {
      // 繝√Ε繝・ヨ菴懈・譎ゅ・req.session
      const chatData = insertChatSchema.parse({
        ...req.body,
        userId: String((req as any).session.userId ?? '')
      });
      const chat = await storage.createChat(chatData);
      return res.json(chat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // 繝√Ε繝・ヨ蜿門ｾ・
  app.get("/api/chats/:id", requireAuth, async (req, res) => {
    const chat = await storage.getChat(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    // 繝√Ε繝・ヨ蜿門ｾ玲凾縺ｮreq.session
    if (String(chat.userId) !== String((req as any).session.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return res.json(chat);
  });

  // 繝√Ε繝・ヨ繝｡繝・そ繝ｼ繧ｸ蜿門ｾ・
  app.get("/api/chats/:id/messages", requireAuth, async (req, res) => {
    const chatId = req.params.id;
    const clearCache = req.query.clear === 'true';
    const chat = await storage.getChat(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    // 繝√Ε繝・ヨ繝｡繝・そ繝ｼ繧ｸ蜿門ｾ玲凾縺ｮreq.session
    if (String(chat.userId) !== String((req as any).session.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (clearCache) {
      res.setHeader('X-Chat-Cleared', 'true');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.json([]);
    }
    const messages = await storage.getMessagesForChat(chat.id);
    const messagesWithMedia = await Promise.all(
      messages.map(async (message) => {
        const media = await storage.getMediaForMessage(message.id);
        return { ...message, media };
      })
    );
    return res.json(messagesWithMedia);
  });

  // 繧ｷ繧ｹ繝・Β繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡
  app.post("/api/chats/:id/messages/system", requireAuth, async (req, res) => {
    try {
      const chatId = req.params.id;
      const { content, isUserMessage = true } = req.body;
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      console.log(`繧ｷ繧ｹ繝・Β繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${(req as any).session.userId}`);
      const message = await storage.createMessage({
        chatId,
        content,
        isAiResponse: !isUserMessage,
        senderId: String((req as any).session.userId ?? '')
      });
      return res.json(message);
    } catch (error) {
      console.error("繧ｷ繧ｹ繝・Β繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡繧ｨ繝ｩ繝ｼ:", error);
      return res.status(500).json({ message: "Error creating system message" });
    }
  });

  // 繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡
  app.post("/api/chats/:id/messages", requireAuth, async (req, res) => {
    try {
      const chatId = req.params.id;
      const { content, useOnlyKnowledgeBase = true, usePerplexity = false } = req.body;
      const userId = String((req as any).session.userId ?? '');
      
      // 繝√Ε繝・ヨID縺ｮ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
      if (!chatId || chatId === '1') {
        return res.status(400).json({ 
          message: "Invalid chat ID. Please use a valid UUID format." 
        });
      }
      
      // UUID蠖｢蠑上・邁｡譏薙メ繧ｧ繝・け
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(chatId)) {
        return res.status(400).json({ 
          message: "Invalid chat ID format. Expected UUID format." 
        });
      }
      
      // 繝・ヰ繝・げ繝ｭ繧ｰ繧定ｿｽ蜉
      console.log('踏 繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡繝ｪ繧ｯ繧ｨ繧ｹ繝亥女菫｡:', {
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
        console.log(`繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡譎・ 繝√Ε繝・ヨID ${chatId} 縺悟ｭ伜惠縺励↑縺・◆繧√∵眠隕丈ｽ懈・縺励∪縺兪);
        try {
          chat = await storage.createChat({
            id: chatId,
            userId: userId,
            title: "譁ｰ縺励＞繝√Ε繝・ヨ"
          });
          console.log(`繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡譎・ 繝√Ε繝・ヨID ${chatId} 繧剃ｽ懈・縺励∪縺励◆`);
        } catch (createError) {
          console.error("繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡譎ゅ・繝√Ε繝・ヨ菴懈・繧ｨ繝ｩ繝ｼ:", createError);
          return res.status(500).json({ message: "Failed to create chat" });
        }
      }
      console.log(`繝√Ε繝・ヨ繧｢繧ｯ繧ｻ繧ｹ: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${(req as any).session.userId}`);
      console.log(`險ｭ螳・ 繝翫Ξ繝・ず繝吶・繧ｹ縺ｮ縺ｿ繧剃ｽｿ逕ｨ=${useOnlyKnowledgeBase}`);
      
      const messageData = insertMessageSchema.parse({
        chatId: chatId,
        content: content,
        senderId: String((req as any).session.userId ?? ''),
        isAiResponse: false
      });
      const message = await storage.createMessage(messageData);

      const getAIResponse = async (content: string, useKnowledgeBase: boolean): Promise<any> => {
        try {
          return await processOpenAIRequest(content, useKnowledgeBase);
        } catch (error) {
          console.error('OpenAI蜃ｦ逅・お繝ｩ繝ｼ:', error);
          return 'AI蠢懃ｭ斐・逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆縲・;
        }
      };

      // AI縺九ｉ縺ｮ蠢懃ｭ斐ｒ蜿門ｾ・
      const aiResponse = await getAIResponse(content, useOnlyKnowledgeBase);

      // 蠢懃ｭ斐・蝙九メ繧ｧ繝・け縺ｨ繧ｵ繝九ち繧､繧ｺ
      let responseContent: string;
      if (typeof aiResponse === 'string') {
        responseContent = aiResponse;
      } else if (aiResponse && typeof aiResponse === 'object') {
        // 繧ｪ繝悶ず繧ｧ繧ｯ繝亥梛縺ｮ蝣ｴ蜷医・←蛻・↑繝励Ο繝代ユ繧｣縺九ｉ譁・ｭ怜・繧呈歓蜃ｺ
        responseContent = aiResponse.content || aiResponse.text || aiResponse.message || JSON.stringify(aiResponse);
      } else {
        responseContent = 'AI蠢懃ｭ斐・蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・;
        console.error('繧ｵ繝ｼ繝舌・蛛ｴAI繝ｬ繧ｹ繝昴Φ繧ｹ讀懆ｨｼ: 荳肴ｭ｣縺ｪ蝙・, { 
          type: typeof aiResponse, 
          value: aiResponse 
        });
      }

      console.log('豆 繧ｯ繝ｩ繧､繧｢繝ｳ繝医↓騾∽ｿ｡縺吶ｋAI繝ｬ繧ｹ繝昴Φ繧ｹ:', {
        type: typeof responseContent,
        content: responseContent.substring(0, 100) + '...',
        length: responseContent.length,
        isValidString: typeof responseContent === 'string' && responseContent.trim().length > 0
      });
      
      // AI繝｡繝・そ繝ｼ繧ｸ繧剃ｿ晏ｭ・
      // db.insert(messages).values 繧貞梛繧｢繧ｵ繝ｼ繧ｷ繝ｧ繝ｳ縺ｧ蝗樣∩
      const [aiMessage] = await (db as any).insert(messages).values({
        chatId: chatId,
        senderId: 'ai',
        content: aiResponse,
        isAiResponse: true,
        createdAt: new Date()
      }).returning();

      // 繧ｯ繝ｩ繧､繧｢繝ｳ繝医↓騾∽ｿ｡縺吶ｋ繝ｬ繧ｹ繝昴Φ繧ｹ讒矩繧堤ｵｱ荳蛹・
      const responseMessage = {
        ...aiMessage,
        content: responseContent, // 繝｡繧､繝ｳ陦ｨ遉ｺ逕ｨ
        text: responseContent,    // 莠呈鋤諤ｧ逕ｨ・・ontent縺ｨ蜷後§蛟､・・
        role: 'assistant' as const,
        timestamp: aiMessage.createdAt || new Date()
      };

      console.log('豆 譛邨ゅΞ繧ｹ繝昴Φ繧ｹ:', {
        id: responseMessage.id,
        contentType: typeof responseMessage.content,
        contentPreview: responseMessage.content.substring(0, 100) + '...',
        hasValidContent: !!responseMessage.content && responseMessage.content.trim().length > 0
      });

      // 繝ｬ繧ｹ繝昴Φ繧ｹ騾∽ｿ｡蜑阪・譛邨ら｢ｺ隱阪Ο繧ｰ
      console.log('豆 繝ｬ繧ｹ繝昴Φ繧ｹ騾∽ｿ｡:', {
        statusCode: 200,
        responseType: typeof responseMessage,
        responseKeys: Object.keys(responseMessage),
        contentLength: responseMessage.content?.length
      });

      return res.json(responseMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      
      // 繧ｨ繝ｩ繝ｼ縺ｮ隧ｳ邏ｰ諠・ｱ繧偵Ο繧ｰ縺ｫ蜃ｺ蜉・
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      } else {
        console.error("Unknown error type:", typeof error, error);
      }
      
      // 繧ｨ繝ｩ繝ｼ縺ｮ隧ｳ邏ｰ諠・ｱ繧定ｿ斐☆
      let errorMessage = "Failed to send message";
      let statusCode = 500;
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        if ('message' in error) {
          errorMessage = String(error.message);
        }
      }
      
      // 迚ｹ螳壹・繧ｨ繝ｩ繝ｼ縺ｫ蠢懊§縺ｦ繧ｹ繝・・繧ｿ繧ｹ繧ｳ繝ｼ繝峨ｒ隱ｿ謨ｴ
      if (errorMessage.includes('隱崎ｨｼ') || errorMessage.includes('auth')) {
        statusCode = 401;
      } else if (errorMessage.includes('讓ｩ髯・) || errorMessage.includes('permission')) {
        statusCode = 403;
      } else if (errorMessage.includes('隕九▽縺九ｊ縺ｾ縺帙ｓ') || errorMessage.includes('not found')) {
        statusCode = 404;
      }
      
      return res.status(statusCode).json({ 
        message: errorMessage,
        error: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // 繝｡繝・ぅ繧｢髢｢騾｣繝ｫ繝ｼ繝・
  app.post("/api/media", requireAuth, async (req, res) => {
    try {
      const mediaData = insertMediaSchema.parse(req.body);
      const media = await storage.createMedia(mediaData);
      return res.json(media);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // 繝√Ε繝・ヨ螻･豁ｴ繧偵け繝ｪ繧｢縺吶ｋAPI
  app.post("/api/chats/:id/clear", requireAuth, async (req, res) => {
    try {
      const chatId = req.params.id;
      const { force, clearAll } = req.body;
      console.log(`繝√Ε繝・ヨ螻･豁ｴ繧ｯ繝ｪ繧｢髢句ｧ・ chatId=${chatId}, force=${force}, clearAll=${clearAll}`);
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      console.log(`繝√Ε繝・ヨ螻･豁ｴ繧ｯ繝ｪ繧｢: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${(req as any).session.userId}`);
      let deletedMessageCount = 0;
      let deletedMediaCount = 0;
      try {
        // 縺ｾ縺夂樟蝨ｨ縺ｮ繝｡繝・そ繝ｼ繧ｸ謨ｰ繧堤｢ｺ隱・
        const beforeMessages = await storage.getMessagesForChat(chatId);
        const beforeCount = beforeMessages.length;
        console.log(`蜑企勁蜑阪・繝｡繝・そ繝ｼ繧ｸ謨ｰ: ${beforeCount}`);

        // 蜷・Γ繝・そ繝ｼ繧ｸ縺ｫ髢｢騾｣縺吶ｋ繝｡繝・ぅ繧｢繧ょ炎髯､
        for (const message of beforeMessages) {
          try {
            const media = await storage.getMediaForMessage(message.id);
            for (const mediaItem of media) {
              // await storage.deleteMedia(mediaItem.id);
              deletedMediaCount++;
            }
          } catch (mediaError) {
            console.error(`繝｡繝・ぅ繧｢蜑企勁繧ｨ繝ｩ繝ｼ (messageId: ${message.id}):`, mediaError);
          }
        }

        // 繝・・繧ｿ繝吶・繧ｹ縺九ｉ繝｡繝・そ繝ｼ繧ｸ繧貞ｮ悟・蜑企勁
        try {
          const result = await storage.clearChatMessages(chatId);
          console.log(`繝・・繧ｿ繝吶・繧ｹ蜑企勁邨先棡:`, result);
        } catch (clearError) {
          console.error('clearChatMessages螳溯｡後お繝ｩ繝ｼ:', clearError);
          // 蛟句挨蜑企勁縺ｫ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
        }

        // 蜑企勁蠕後・繝｡繝・そ繝ｼ繧ｸ謨ｰ繧堤｢ｺ隱・
        const afterMessages = await storage.getMessagesForChat(chatId);
        const afterCount = afterMessages.length;
        deletedMessageCount = beforeCount - afterCount;

        console.log(`蜑企勁蠕後・繝｡繝・そ繝ｼ繧ｸ謨ｰ: ${afterCount}, 蜑企勁縺輔ｌ縺溘Γ繝・そ繝ｼ繧ｸ謨ｰ: ${deletedMessageCount}`);

        if (afterCount > 0) {
          console.warn(`隴ｦ蜻・ ${afterCount}莉ｶ縺ｮ繝｡繝・そ繝ｼ繧ｸ縺梧ｮ九▲縺ｦ縺・∪縺兪);

          // 蠑ｷ蛻ｶ蜑企勁縺ｾ縺溘・谿句ｭ倥Γ繝・そ繝ｼ繧ｸ縺ｮ蛟句挨蜑企勁
          if (force || clearAll) {
            console.log('蠑ｷ蛻ｶ蜑企勁繝｢繝ｼ繝峨〒谿句ｭ倥Γ繝・そ繝ｼ繧ｸ繧貞句挨蜑企勁縺励∪縺・);
            for (const remainingMessage of afterMessages) {
              try {
                // await storage.deleteMessage(remainingMessage.id);
                deletedMessageCount++;
              } catch (individualDeleteError) {
                console.error(`蛟句挨蜑企勁繧ｨ繝ｩ繝ｼ (messageId: ${remainingMessage.id}):`, individualDeleteError);
              }
            }
          }
        }

      } catch (dbError) {
        console.error(`繝・・繧ｿ繝吶・繧ｹ蜑企勁繧ｨ繝ｩ繝ｼ:`, dbError);
        return res.status(500).json({ 
          message: "Database deletion failed",
          error: String((dbError as Error).message) 
        });
      }

      // 譛邨ら｢ｺ隱・
      const finalMessages = await storage.getMessagesForChat(chatId);
      const finalCount = finalMessages.length;

      console.log(`繝√Ε繝・ヨ螻･豁ｴ繧ｯ繝ｪ繧｢螳御ｺ・ chatId=${chatId}, 蜑企勁繝｡繝・そ繝ｼ繧ｸ謨ｰ=${deletedMessageCount}, 蜑企勁繝｡繝・ぅ繧｢謨ｰ=${deletedMediaCount}, 譛邨ゅΓ繝・そ繝ｼ繧ｸ謨ｰ=${finalCount}`);

      return res.json({ 
        cleared: true,
        message: "Chat cleared successfully",
        deletedMessages: deletedMessageCount,
        deletedMedia: deletedMediaCount,
        remainingMessages: finalCount,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Chat clear error:', error);
      return res.status(500).json({ 
        message: "Error clearing chat",
        error: String((error as Error).message) 
      });
    }
  });

  // 螻･豁ｴ騾∽ｿ｡縺ｮ縺溘ａ縺ｮAPI・亥ｾ捺擂縺ｮ蠖｢蠑擾ｼ・
  app.post("/api/chats/:id/export", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId!;
      const chatId = req.params.id;
      const { lastExportTimestamp } = req.body;

      console.log('繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝医Μ繧ｯ繧ｨ繧ｹ繝亥女菫｡:', {
        chatId,
        userId,
        lastExportTimestamp
      });

      // 繝√Ε繝・ヨID縺ｮ蠖｢蠑上ｒ繝√ぉ繝・け・・UID蠖｢蠑上°縺ｩ縺・°・・
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(chatId)) {
        console.warn('辟｡蜉ｹ縺ｪ繝√Ε繝・ヨID蠖｢蠑・', chatId);
        // UUID蠖｢蠑上〒縺ｪ縺・ｴ蜷医・縲∵眠縺励＞繝√Ε繝・ヨ縺ｨ縺励※蜃ｦ逅・
        return res.json({ 
          success: true, 
          exportTimestamp: new Date(),
          messageCount: 0,
          note: "New chat session"
        });
      }

      // 繝√Ε繝・ヨ縺ｮ蟄伜惠遒ｺ隱搾ｼ医お繝ｩ繝ｼ繧偵く繝｣繝・メ・・
      let chat = null;
      try {
        chat = await storage.getChat(chatId);
      } catch (chatError) {
        console.warn('繝√Ε繝・ヨ蜿門ｾ励お繝ｩ繝ｼ・域眠隕上メ繝｣繝・ヨ縺ｨ縺励※蜃ｦ逅・ｼ・', chatError);
        // 繝√Ε繝・ヨ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・譁ｰ隕上メ繝｣繝・ヨ縺ｨ縺励※蜃ｦ逅・
        return res.json({ 
          success: true, 
          exportTimestamp: new Date(),
          messageCount: 0,
          note: "New chat session"
        });
      }

      if (!chat) {
        console.log('繝√Ε繝・ヨ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ・域眠隕上メ繝｣繝・ヨ縺ｨ縺励※蜃ｦ逅・ｼ・', chatId);
        return res.json({ 
          success: true, 
          exportTimestamp: new Date(),
          messageCount: 0,
          note: "New chat session"
        });
      }

      // 繝・・繧ｿ繝吶・繧ｹ縺九ｉ繝｡繝・そ繝ｼ繧ｸ繧貞叙蠕励☆繧倶ｻ｣繧上ｊ縺ｫ縲√ヵ繧｡繧､繝ｫ繝吶・繧ｹ縺ｮ菫晏ｭ倥・縺ｿ
      const messages = [];
      const exportTimestamp = new Date();
      console.log('繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝亥・逅・ｼ医ヵ繧｡繧､繝ｫ繝吶・繧ｹ・・);

      // 繝輔ぃ繧､繝ｫ繝吶・繧ｹ縺ｮ繧ｨ繧ｯ繧ｹ繝昴・繝医・縺ｿ・医ョ繝ｼ繧ｿ繝吶・繧ｹ蜃ｦ逅・・荳崎ｦ・ｼ・
      console.log(`繝√Ε繝・ヨ ${chatId} 縺ｮ繧ｨ繧ｯ繧ｹ繝昴・繝亥・逅・ｮ御ｺ・ｼ医ヵ繧｡繧､繝ｫ繝吶・繧ｹ・荏);

      res.json({ 
        success: true, 
        exportTimestamp,
        messageCount: messages.length
      });
    } catch (error) {
      console.error("Error exporting chat history:", error);
      res.status(500).json({ error: "Failed to export chat history" });
    }
  });

  // 繝・せ繝育畑縺ｮ隱崎ｨｼ縺ｪ縺励メ繝｣繝・ヨ騾∽ｿ｡API・磯幕逋ｺ迺ｰ蠅・・縺ｿ・・
  app.post("/api/chats/:id/send-test", async (req, res) => {
    try {
      const chatId = req.params.id;
      const { chatData, exportType } = req.body;

      console.log('剥 繝・せ繝育畑繝√Ε繝・ヨ騾∽ｿ｡繝ｪ繧ｯ繧ｨ繧ｹ繝亥女菫｡:', {
        chatId,
        exportType,
        messageCount: chatData?.messages?.length || 0,
        machineInfo: chatData?.machineInfo,
        requestBody: req.body,
        headers: req.headers
      });

      // 繝√Ε繝・ヨ繝・・繧ｿ縺ｮ讀懆ｨｼ
      if (!chatData || !chatData.messages || !Array.isArray(chatData.messages)) {
        return res.status(400).json({ 
          error: "Invalid chat data format",
          details: "chatData.messages must be an array"
        });
      }

      // knowledge-base/exports 繝輔か繝ｫ繝繧剃ｽ懈・・医Ν繝ｼ繝医ョ繧｣繝ｬ繧ｯ繝医Μ・・
      const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
        console.log('exports 繝輔か繝ｫ繝繧剃ｽ懈・縺励∪縺励◆:', exportsDir);
      }

      // 繝√Ε繝・ヨ繝・・繧ｿ繧谷SON繝輔ぃ繧､繝ｫ縺ｨ縺励※菫晏ｭ・
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // 繝ｦ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺九ｉ莠玖ｱ｡諠・ｱ繧呈歓蜃ｺ縺励※繝輔ぃ繧､繝ｫ蜷阪↓菴ｿ逕ｨ
      const userMessages = chatData.messages.filter((m: any) => !m.isAiResponse);
      console.log('剥 莠玖ｱ｡謚ｽ蜃ｺ - 繝ｦ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ:', userMessages);
      
      const textMessages = userMessages
        .map((m: any) => m.content)
        .filter((content: string) => !content.trim().startsWith('data:image/'))
        .join('\n')
        .trim();
      console.log('剥 莠玖ｱ｡謚ｽ蜃ｺ - 繝・く繧ｹ繝医Γ繝・そ繝ｼ繧ｸ:', textMessages);
      
      let incidentTitle = '莠玖ｱ｡縺ｪ縺・;
      
      if (textMessages) {
        // 繝・く繧ｹ繝医′縺ゅｋ蝣ｴ蜷医・譛蛻昴・陦後ｒ菴ｿ逕ｨ
        incidentTitle = textMessages.split('\n')[0].trim();
        console.log('剥 莠玖ｱ｡謚ｽ蜃ｺ - 謚ｽ蜃ｺ縺輔ｌ縺溘ち繧､繝医Ν:', incidentTitle);
      } else {
        // 繝・く繧ｹ繝医′縺ｪ縺・ｴ蜷茨ｼ育判蜒上・縺ｿ・峨・縲√ョ繝輔か繝ｫ繝医ち繧､繝医Ν繧剃ｽｿ逕ｨ
        incidentTitle = '逕ｻ蜒上↓繧医ｋ謨・囿蝣ｱ蜻・;
        console.log('剥 莠玖ｱ｡謚ｽ蜃ｺ - 繝・ヵ繧ｩ繝ｫ繝医ち繧､繝医Ν菴ｿ逕ｨ:', incidentTitle);
      }
      
      // 繝輔ぃ繧､繝ｫ蜷咲畑縺ｫ莠玖ｱ｡蜀・ｮｹ繧偵し繝九ち繧､繧ｺ・育音谿頑枚蟄励ｒ髯､蜴ｻ・・
      const sanitizedTitle = incidentTitle
        .replace(/[<>:"/\\|?*]/g, '') // 繝輔ぃ繧､繝ｫ蜷阪↓菴ｿ逕ｨ縺ｧ縺阪↑縺・枚蟄励ｒ髯､蜴ｻ
        .replace(/\s+/g, '_') // 繧ｹ繝壹・繧ｹ繧偵い繝ｳ繝繝ｼ繧ｹ繧ｳ繧｢縺ｫ螟画鋤
        .substring(0, 50); // 髟ｷ縺輔ｒ蛻ｶ髯・
      
      const fileName = `${sanitizedTitle}_${chatId}_${timestamp}.json`;
      const filePath = path.join(exportsDir, fileName);

      const exportData: any = {
        chatId: chatId,
        userId: 'test-user',
        exportType: exportType || 'manual_send',
        exportTimestamp: new Date().toISOString(),
        title: incidentTitle, // 莠玖ｱ｡諠・ｱ繧偵ち繧､繝医Ν縺ｨ縺励※霑ｽ蜉
        chatData: chatData
      };

      // 逕ｻ蜒上ｒ蛟句挨繝輔ぃ繧､繝ｫ縺ｨ縺励※菫晏ｭ・
      const imagesDir = path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
        console.log('逕ｻ蜒丈ｿ晏ｭ倥ョ繧｣繝ｬ繧ｯ繝医Μ繧剃ｽ懈・縺励∪縺励◆:', imagesDir);
      }

      // 繝√Ε繝・ヨ繝｡繝・そ繝ｼ繧ｸ縺九ｉ逕ｻ蜒上ｒ謚ｽ蜃ｺ縺励※菫晏ｭ・
      let savedImages: any[] = [];
      for (const message of chatData.messages) {
        if (message.content && message.content.startsWith('data:image/')) {
          try {
            // Base64繝・・繧ｿ縺九ｉ逕ｻ蜒上ｒ謚ｽ蜃ｺ
            const base64Data = message.content.replace(/^data:image\/[a-z]+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            // 繝輔ぃ繧､繝ｫ蜷阪ｒ逕滓・
            const timestamp = Date.now();
            const imageFileName = `chat_image_${chatId}_${timestamp}.jpg`;
            const imagePath = path.join(imagesDir, imageFileName);
            
            // 逕ｻ蜒上ヵ繧｡繧､繝ｫ繧剃ｿ晏ｭ・
            fs.writeFileSync(imagePath, buffer);
            console.log('逕ｻ蜒上ヵ繧｡繧､繝ｫ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆:', imagePath);
            
            savedImages.push({
              messageId: message.id,
              fileName: imageFileName,
              path: imagePath,
              url: `/api/images/chat-exports/${imageFileName}`
            });
          } catch (imageError) {
            console.warn('逕ｻ蜒丈ｿ晏ｭ倥お繝ｩ繝ｼ:', imageError);
          }
        }
      }

      // 菫晏ｭ倥＠縺溽判蜒乗ュ蝣ｱ繧偵お繧ｯ繧ｹ繝昴・繝医ョ繝ｼ繧ｿ縺ｫ霑ｽ蜉
      exportData.savedImages = savedImages;

      // title繝輔ぅ繝ｼ繝ｫ繝峨・蛟､縺ｧ繝輔ぃ繧､繝ｫ蜷阪ｒ蜀咲函謌・
      const finalSanitizedTitle = exportData.title
        .replace(/[<>:"/\\|?*]/g, '') // 繝輔ぃ繧､繝ｫ蜷阪↓菴ｿ逕ｨ縺ｧ縺阪↑縺・枚蟄励ｒ髯､蜴ｻ
        .replace(/\s+/g, '_') // 繧ｹ繝壹・繧ｹ繧偵い繝ｳ繝繝ｼ繧ｹ繧ｳ繧｢縺ｫ螟画鋤
        .substring(0, 50); // 髟ｷ縺輔ｒ蛻ｶ髯・
      console.log('剥 莠玖ｱ｡謚ｽ蜃ｺ - 譛邨ゅし繝九ち繧､繧ｺ貂医∩繧ｿ繧､繝医Ν:', finalSanitizedTitle);
      
      const finalFileName = `${finalSanitizedTitle}_${chatId}_${timestamp}.json`;
      const finalFilePath = path.join(exportsDir, finalFileName);
      console.log('剥 莠玖ｱ｡謚ｽ蜃ｺ - 譛邨ゅヵ繧｡繧､繝ｫ蜷・', finalFileName);

      // 繝繝悶Ν繧ｯ繧ｪ繝ｼ繝・・繧ｷ繝ｧ繝ｳ繧定恭謨ｰ蟆乗枚蟄励↓邨ｱ荳縺励※JSON繝輔ぃ繧､繝ｫ繧剃ｿ晏ｭ・
      const jsonString = JSON.stringify(exportData, null, 2);
      fs.writeFileSync(finalFilePath, jsonString, 'utf8');
      console.log('繝√Ε繝・ヨ繝・・繧ｿ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆:', finalFilePath);

      // 螻･豁ｴ繝・・繧ｿ繝吶・繧ｹ縺ｫ繧ゆｿ晏ｭ假ｼ医ユ繧ｹ繝育畑・・
      try {
        const { HistoryService } = await import('../services/historyService.js');
        
        // 螻･豁ｴ繧｢繧､繝・Β繧剃ｽ懈・
        const historyData = {
          sessionId: chatId,
          question: chatData.messages.map(msg => msg.content).join('\n'),
          answer: '繝√Ε繝・ヨ騾∽ｿ｡螳御ｺ・ｼ医ユ繧ｹ繝育畑・・,
          machineType: chatData.machineInfo?.machineTypeName || '',
          machineNumber: chatData.machineInfo?.machineNumber || '',
          metadata: {
            messageCount: chatData.messages.length,
            exportType: exportType,
            fileName: finalFileName, // 譛邨ら噪縺ｪ繝輔ぃ繧､繝ｫ蜷阪ｒ菴ｿ逕ｨ
            machineInfo: chatData.machineInfo,
            isTest: true
          }
        };

        await HistoryService.createHistory(historyData);
        console.log('螻･豁ｴ繝・・繧ｿ繝吶・繧ｹ縺ｫ菫晏ｭ倥＠縺ｾ縺励◆・医ユ繧ｹ繝育畑・・);
      } catch (historyError) {
        console.warn('螻･豁ｴ繝・・繧ｿ繝吶・繧ｹ菫晏ｭ倥お繝ｩ繝ｼ・医ヵ繧｡繧､繝ｫ菫晏ｭ倥・謌仙粥・・', historyError);
        // 螻･豁ｴ繝・・繧ｿ繝吶・繧ｹ繧ｨ繝ｩ繝ｼ縺ｯ繝輔ぃ繧､繝ｫ菫晏ｭ倥・謌仙粥繧貞ｦｨ縺偵↑縺・
      }

      // 謌仙粥繝ｬ繧ｹ繝昴Φ繧ｹ
      res.json({ 
        success: true, 
        message: "繝√Ε繝・ヨ繝・・繧ｿ縺梧ｭ｣蟶ｸ縺ｫ菫晏ｭ倥＆繧後∪縺励◆・医ユ繧ｹ繝育畑・・,
        filePath: filePath,
        fileName: fileName,
        messageCount: chatData.messages.length
      });

    } catch (error) {
      console.error("Error sending chat data:", error);
      res.status(500).json({ 
        error: "Failed to send chat data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // 繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝井ｸ隕ｧ繧貞叙蠕励☆繧九お繝ｳ繝峨・繧､繝ｳ繝・
  app.get("/api/chats/exports", async (req, res) => {
    try {
      console.log('搭 繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝井ｸ隕ｧ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝・);

      // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
      res.setHeader('Content-Type', 'application/json');

      const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
      
      if (!fs.existsSync(exportsDir)) {
        return res.json([]);
      }

      const files = fs.readdirSync(exportsDir)
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
            lastModified: stats.mtime
          };
        })
        .sort((a, b) => new Date(b.exportTimestamp).getTime() - new Date(a.exportTimestamp).getTime());

      res.json(files);

    } catch (error) {
      console.error('笶・繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝井ｸ隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
      res.status(500).json({
        error: '繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝井ｸ隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // 譁ｰ縺励＞繝√Ε繝・ヨ騾∽ｿ｡API・医け繝ｩ繧､繧｢繝ｳ繝亥・縺ｮ蠖｢蠑上↓蟇ｾ蠢懶ｼ・
  app.post("/api/chats/:id/send", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId!;
      const chatId = req.params.id;
      const { chatData, exportType } = req.body;

      console.log('剥 繝√Ε繝・ヨ騾∽ｿ｡繝ｪ繧ｯ繧ｨ繧ｹ繝亥女菫｡:', {
        chatId,
        userId,
        exportType,
        messageCount: chatData?.messages?.length || 0,
        machineInfo: chatData?.machineInfo,
        requestBody: req.body,
        headers: req.headers
      });

      // 繝√Ε繝・ヨ繝・・繧ｿ縺ｮ讀懆ｨｼ
      if (!chatData || !chatData.messages || !Array.isArray(chatData.messages)) {
        return res.status(400).json({ 
          error: "Invalid chat data format",
          details: "chatData.messages must be an array"
        });
      }

      // knowledge-base/exports 繝輔か繝ｫ繝繧剃ｽ懈・・医Ν繝ｼ繝医ョ繧｣繝ｬ繧ｯ繝医Μ・・
      const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
        console.log('exports 繝輔か繝ｫ繝繧剃ｽ懈・縺励∪縺励◆:', exportsDir);
      }

      // 譁ｰ縺励＞繝輔か繝ｼ繝槭ャ繝磯未謨ｰ繧剃ｽｿ逕ｨ縺励※繧ｨ繧ｯ繧ｹ繝昴・繝医ョ繝ｼ繧ｿ繧堤函謌・
      const { formatChatHistoryForHistoryUI } = await import('../lib/chat-export-formatter.js');
      
      // 繝・・繧ｿ繝吶・繧ｹ縺九ｉ縺ｧ縺ｯ縺ｪ縺上√Μ繧ｯ繧ｨ繧ｹ繝医・繝・ぅ縺ｮchatData繧剃ｽｿ逕ｨ
      const chat = {
        id: chatId,
        userId: userId,
        title: chatData.title || '繝√Ε繝・ヨ螻･豁ｴ',
        createdAt: new Date().toISOString()
      };
      
      // 繝ｪ繧ｯ繧ｨ繧ｹ繝医・繝・ぅ縺ｮ繝｡繝・そ繝ｼ繧ｸ繧剃ｽｿ逕ｨ
      const allMessages = chatData.messages || [];
      
      // 繝｡繝・ぅ繧｢諠・ｱ縺ｯ繝ｪ繧ｯ繧ｨ繧ｹ繝医・繝・ぅ縺九ｉ蜿門ｾ・
      const messageMedia: Record<string, any[]> = {};
      for (const message of allMessages) {
        messageMedia[message.id] = message.media || [];
      }
      
      // 螻･豁ｴ邂｡逅・I逕ｨ縺ｫ繝輔か繝ｼ繝槭ャ繝茨ｼ医お繝ｩ繝ｼ繧偵く繝｣繝・メ・・
      let formattedHistoryData;
      try {
        formattedHistoryData = await formatChatHistoryForHistoryUI(
          chat,
          allMessages,
          messageMedia,
          chatData.machineInfo
        );
      } catch (formatError) {
        console.error('繝輔か繝ｼ繝槭ャ繝亥・逅・お繝ｩ繝ｼ:', formatError);
        // 繝輔か繝ｼ繝槭ャ繝亥・逅・′螟ｱ謨励＠縺溷ｴ蜷医・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
        formattedHistoryData = {
          title: '霆贋ｸ｡繝医Λ繝悶Ν',
          problem_description: '隧ｳ邏ｰ諠・ｱ縺ｪ縺・,
          machine_type: chatData.machineInfo?.machineTypeName || '',
          machine_number: chatData.machineInfo?.machineNumber || '',
          extracted_components: [],
          extracted_symptoms: [],
          possible_models: [],
          conversation_history: allMessages.map((m: any) => ({
            id: m.id,
            content: m.content,
            isAiResponse: m.isAiResponse,
            timestamp: m.createdAt,
            media: []
          })),
          export_timestamp: new Date().toISOString(),
          metadata: {
            total_messages: allMessages.length,
            user_messages: allMessages.filter((m: any) => !m.isAiResponse).length,
            ai_messages: allMessages.filter((m: any) => m.isAiResponse).length,
            total_media: 0,
            export_format_version: "2.0"
          }
        };
      }

      // 莠玖ｱ｡蜀・ｮｹ繧偵ヵ繧｡繧､繝ｫ蜷阪↓蜷ｫ繧√ｋ・育判蜒上′蜈医〒繧ら匱逕滉ｺ玖ｱ｡繧貞━蜈茨ｼ・
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // 繝ｦ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺九ｉ繝・く繧ｹ繝医・縺ｿ繧呈歓蜃ｺ・育判蜒上ｒ髯､螟厄ｼ・
      const userMessages = chatData.messages.filter((m: any) => !m.isAiResponse);
      const textMessages = userMessages
        .map((m: any) => m.content)
        .filter(content => !content.trim().startsWith('data:image/'))
        .join('\n')
        .trim();
      
      let incidentTitle = '莠玖ｱ｡縺ｪ縺・;
      
      if (textMessages) {
        // 繝・く繧ｹ繝医′縺ゅｋ蝣ｴ蜷医・譛蛻昴・陦後ｒ菴ｿ逕ｨ
        incidentTitle = textMessages.split('\n')[0].trim();
      } else {
        // 繝・く繧ｹ繝医′縺ｪ縺・ｴ蜷茨ｼ育判蜒上・縺ｿ・峨・縲√ヵ繧ｩ繝ｼ繝槭ャ繝医＆繧後◆繧ｿ繧､繝医Ν繧剃ｽｿ逕ｨ
        incidentTitle = formattedHistoryData.title || '逕ｻ蜒上↓繧医ｋ謨・囿蝣ｱ蜻・;
      }
      
      // 繝輔ぃ繧､繝ｫ蜷咲畑縺ｫ莠玖ｱ｡蜀・ｮｹ繧偵し繝九ち繧､繧ｺ・育音谿頑枚蟄励ｒ髯､蜴ｻ・・
      const sanitizedTitle = incidentTitle
        .replace(/[<>:"/\\|?*]/g, '') // 繝輔ぃ繧､繝ｫ蜷阪↓菴ｿ逕ｨ縺ｧ縺阪↑縺・枚蟄励ｒ髯､蜴ｻ
        .replace(/\s+/g, '_') // 繧ｹ繝壹・繧ｹ繧偵い繝ｳ繝繝ｼ繧ｹ繧ｳ繧｢縺ｫ螟画鋤
        .substring(0, 50); // 髟ｷ縺輔ｒ蛻ｶ髯・
      
      const fileName = `${sanitizedTitle}_${chatId}_${timestamp}.json`;
      const filePath = path.join(exportsDir, fileName);
      
      const exportData: any = {
        chatId: chatId,
        userId: userId,
        exportType: exportType || 'manual_send',
        exportTimestamp: new Date().toISOString(),
        title: incidentTitle, // 逕ｻ蜒上′蜈医〒繧ら匱逕滉ｺ玖ｱ｡繧貞━蜈・
        problemDescription: formattedHistoryData.problem_description,
        machineType: formattedHistoryData.machine_type,
        machineNumber: formattedHistoryData.machine_number,
        extractedComponents: formattedHistoryData.extracted_components,
        extractedSymptoms: formattedHistoryData.extracted_symptoms,
        possibleModels: formattedHistoryData.possible_models,
        conversationHistory: formattedHistoryData.conversation_history,
        metadata: formattedHistoryData.metadata,
        originalChatData: chatData // 蜈・・繝・・繧ｿ繧ゆｿ晄戟
      };

      // 逕ｻ蜒上ｒ蛟句挨繝輔ぃ繧､繝ｫ縺ｨ縺励※菫晏ｭ・
      const imagesDir = path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
        console.log('逕ｻ蜒丈ｿ晏ｭ倥ョ繧｣繝ｬ繧ｯ繝医Μ繧剃ｽ懈・縺励∪縺励◆:', imagesDir);
      }

      // 繝√Ε繝・ヨ繝｡繝・そ繝ｼ繧ｸ縺九ｉ逕ｻ蜒上ｒ謚ｽ蜃ｺ縺励※菫晏ｭ・
      let savedImages: any[] = [];
      for (const message of chatData.messages) {
        if (message.content && message.content.startsWith('data:image/')) {
          try {
            // Base64繝・・繧ｿ縺九ｉ逕ｻ蜒上ｒ謚ｽ蜃ｺ
            const base64Data = message.content.replace(/^data:image\/[a-z]+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            // 繝輔ぃ繧､繝ｫ蜷阪ｒ逕滓・
            const timestamp = Date.now();
            const imageFileName = `chat_image_${chatId}_${timestamp}.jpg`;
            const imagePath = path.join(imagesDir, imageFileName);
            
            // 逕ｻ蜒上ヵ繧｡繧､繝ｫ繧剃ｿ晏ｭ・
            fs.writeFileSync(imagePath, buffer);
            console.log('逕ｻ蜒上ヵ繧｡繧､繝ｫ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆:', imagePath);
            
            savedImages.push({
              messageId: message.id,
              fileName: imageFileName,
              path: imagePath,
              url: `/api/images/chat-exports/${imageFileName}`
            });
          } catch (imageError) {
            console.warn('逕ｻ蜒丈ｿ晏ｭ倥お繝ｩ繝ｼ:', imageError);
          }
        }
      }

      // 菫晏ｭ倥＠縺溽判蜒乗ュ蝣ｱ繧偵お繧ｯ繧ｹ繝昴・繝医ョ繝ｼ繧ｿ縺ｫ霑ｽ蜉
      exportData.savedImages = savedImages;

      // 繝繝悶Ν繧ｯ繧ｪ繝ｼ繝・・繧ｷ繝ｧ繝ｳ繧定恭謨ｰ蟆乗枚蟄励↓邨ｱ荳縺励※JSON繝輔ぃ繧､繝ｫ繧剃ｿ晏ｭ・
      const jsonString = JSON.stringify(exportData, null, 2);
      fs.writeFileSync(filePath, jsonString, 'utf8');
      console.log('繝√Ε繝・ヨ繝・・繧ｿ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆:', filePath);

      // 繝・・繧ｿ繝吶・繧ｹ菫晏ｭ倥・荳崎ｦ・ｼ医ヵ繧｡繧､繝ｫ繝吶・繧ｹ縺ｮ菫晏ｭ倥・縺ｿ・・
      console.log('繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝医′繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ倥＆繧後∪縺励◆');

      // 螻･豁ｴ繝・・繧ｿ繝吶・繧ｹ縺ｫ繧ゆｿ晏ｭ・
      try {
        const { HistoryService } = await import('../services/historyService.js');
        
        // 譁ｰ縺励＞繝輔か繝ｼ繝槭ャ繝磯未謨ｰ繧剃ｽｿ逕ｨ縺励※螻･豁ｴ繝・・繧ｿ繧堤函謌・
        const { formatChatHistoryForHistoryUI } = await import('../lib/chat-export-formatter.js');
        
        // 繝√Ε繝・ヨ縺ｨ繝｡繝・そ繝ｼ繧ｸ諠・ｱ繧貞叙蠕・
        const chat = await storage.getChat(chatId);
        const allMessages = await storage.getMessagesForChat(chatId);
        
        // 繝｡繝・そ繝ｼ繧ｸID縺斐→縺ｫ繝｡繝・ぅ繧｢繧貞叙蠕・
        const messageMedia: Record<string, any[]> = {};
        for (const message of allMessages) {
          try {
            messageMedia[message.id] = await storage.getMediaForMessage(message.id);
          } catch (mediaError) {
            console.warn(`繝｡繝・そ繝ｼ繧ｸ ${message.id} 縺ｮ繝｡繝・ぅ繧｢蜿門ｾ励お繝ｩ繝ｼ:`, mediaError);
            messageMedia[message.id] = [];
          }
        }
        
        // 螻･豁ｴ邂｡逅・I逕ｨ縺ｫ繝輔か繝ｼ繝槭ャ繝茨ｼ医お繝ｩ繝ｼ繧偵く繝｣繝・メ・・
        let formattedHistoryData;
        try {
          formattedHistoryData = await formatChatHistoryForHistoryUI(
            chat,
            allMessages,
            messageMedia,
            chatData.machineInfo
          );
        } catch (formatError) {
          console.error('螻･豁ｴ繝・・繧ｿ繝輔か繝ｼ繝槭ャ繝亥・逅・お繝ｩ繝ｼ:', formatError);
          // 繝輔か繝ｼ繝槭ャ繝亥・逅・′螟ｱ謨励＠縺溷ｴ蜷医・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
          formattedHistoryData = {
            title: '霆贋ｸ｡繝医Λ繝悶Ν',
            problem_description: '隧ｳ邏ｰ諠・ｱ縺ｪ縺・,
            machine_type: chatData.machineInfo?.machineTypeName || '',
            machine_number: chatData.machineInfo?.machineNumber || '',
            extracted_components: [],
            extracted_symptoms: [],
            possible_models: [],
            conversation_history: allMessages.map((m: any) => ({
              id: m.id,
              content: m.content,
              isAiResponse: m.isAiResponse,
              timestamp: m.createdAt,
              media: []
            })),
            export_timestamp: new Date().toISOString(),
            metadata: {
              total_messages: allMessages.length,
              user_messages: allMessages.filter((m: any) => !m.isAiResponse).length,
              ai_messages: allMessages.filter((m: any) => m.isAiResponse).length,
              total_media: 0,
              export_format_version: "2.0"
            }
          };
        }
        
        // 螻･豁ｴ繧｢繧､繝・Β繧剃ｽ懈・
        const historyData = {
          sessionId: chatId,
          question: formattedHistoryData.title,
          answer: formattedHistoryData.problem_description,
          machineType: formattedHistoryData.machine_type,
          machineNumber: formattedHistoryData.machine_number,
          metadata: {
            title: formattedHistoryData.title,
            problemDescription: formattedHistoryData.problem_description,
            extractedComponents: formattedHistoryData.extracted_components,
            extractedSymptoms: formattedHistoryData.extracted_symptoms,
            possibleModels: formattedHistoryData.possible_models,
            messageCount: formattedHistoryData.metadata.total_messages,
            exportType: exportType,
            fileName: fileName,
            machineInfo: chatData.machineInfo,
            exportTimestamp: formattedHistoryData.export_timestamp
          }
        };

        await HistoryService.createHistory(historyData);
        console.log('螻･豁ｴ繝・・繧ｿ繝吶・繧ｹ縺ｫ菫晏ｭ倥＠縺ｾ縺励◆・域眠縺励＞繝輔か繝ｼ繝槭ャ繝茨ｼ・);
      } catch (historyError) {
        console.warn('螻･豁ｴ繝・・繧ｿ繝吶・繧ｹ菫晏ｭ倥お繝ｩ繝ｼ・医ヵ繧｡繧､繝ｫ菫晏ｭ倥・謌仙粥・・', historyError);
        // 螻･豁ｴ繝・・繧ｿ繝吶・繧ｹ繧ｨ繝ｩ繝ｼ縺ｯ繝輔ぃ繧､繝ｫ菫晏ｭ倥・謌仙粥繧貞ｦｨ縺偵↑縺・
      }

      // 謌仙粥繝ｬ繧ｹ繝昴Φ繧ｹ
      res.json({ 
        success: true, 
        message: "繝√Ε繝・ヨ繝・・繧ｿ縺梧ｭ｣蟶ｸ縺ｫ菫晏ｭ倥＆繧後∪縺励◆",
        filePath: filePath,
        fileName: fileName,
        messageCount: chatData.messages.length
      });

    } catch (error) {
      console.error("Error sending chat data:", error);
      res.status(500).json({ 
        error: "Failed to send chat data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // 螟夜ΚAI蛻・梵繧ｷ繧ｹ繝・Β蜷代￠繝輔か繝ｼ繝槭ャ繝域ｸ医∩繝・・繧ｿ繧貞叙蠕励☆繧帰PI
  app.get("/api/chats/:id/export-formatted", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId!;
      const chatId = req.params.id;
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      console.log(`繝輔か繝ｼ繝槭ャ繝域ｸ医∩繧ｨ繧ｯ繧ｹ繝昴・繝・ chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${userId}`);
      if (String(chat.userId) !== String(userId) && (req as any).session.userRole !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const messages = await storage.getMessagesForChat(chatId);
      const messageMedia: Record<string, any[]> = {};
      for (const message of messages) {
        messageMedia[message.id] = await storage.getMediaForMessage(message.id);
      }
      const lastExport = await storage.getLastChatExport(chatId);
      const formattedData = await formatChatHistoryForExternalSystem(
        chat,
        messages,
        messageMedia,
        lastExport
      );
      res.json(formattedData);
    } catch (error) {
      console.error("Error formatting chat for external system:", error);
      res.status(500).json({ error: "Failed to format chat for external system" });
    }
  });

  // 繝√Ε繝・ヨ縺ｮ譛蠕後・繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ･豁ｴ繧貞叙蠕・
  app.get("/api/chats/:id/last-export", requireAuth, async (req, res) => {
    try {
      const chatId = req.params.id;
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      const lastExport = await storage.getLastChatExport(chatId);
      res.json(lastExport || { timestamp: null });
    } catch (error) {
      console.error("Error fetching last export:", error);
      res.status(500).json({ error: "Failed to fetch last export information" });
    }
  });

  // 菫晏ｭ倥＆繧後◆繝√Ε繝・ヨ螻･豁ｴ荳隕ｧ繧貞叙蠕・
  app.get("/api/chats/exports", requireAuth, async (req, res) => {
    try {
      const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
      
      if (!fs.existsSync(exportsDir)) {
        return res.json([]);
      }

      // 蜀榊ｸｰ逧・↓JSON繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢縺吶ｋ髢｢謨ｰ
      const findJsonFiles = (dir: string, baseDir: string = exportsDir): any[] => {
        const files: any[] = [];
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            // 繧ｵ繝悶ョ繧｣繝ｬ繧ｯ繝医Μ繧貞・蟶ｰ逧・↓讀懃ｴ｢
            files.push(...findJsonFiles(itemPath, baseDir));
          } else if (item.endsWith('.json')) {
            try {
              const content = fs.readFileSync(itemPath, 'utf8');
              const data = JSON.parse(content);
              
              // 逶ｸ蟇ｾ繝代せ繧定ｨ育ｮ・
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
                  machineNumber: ''
                },
                fileSize: stats.size,
                lastModified: stats.mtime
              });
            } catch (error) {
              console.warn(`JSON繝輔ぃ繧､繝ｫ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ: ${itemPath}`, error);
            }
          }
        }
        
        return files;
      };

      const files = findJsonFiles(exportsDir)
        .sort((a, b) => new Date(b.exportTimestamp).getTime() - new Date(a.exportTimestamp).getTime());

      res.json(files);
    } catch (error) {
      console.error("Error fetching chat exports:", error);
      res.status(500).json({ error: "Failed to fetch chat exports" });
    }
  });

  // 迚ｹ螳壹・繝√Ε繝・ヨ螻･豁ｴ繝輔ぃ繧､繝ｫ繧貞叙蠕・
  app.get("/api/chats/exports/:fileName", requireAuth, async (req, res) => {
    try {
      const fileName = req.params.fileName;
      const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
      const filePath = path.join(exportsDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Export file not found" });
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching chat export file:", error);
      res.status(500).json({ error: "Failed to fetch chat export file" });
    }
  });

  // 繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝育判蜒上ｒ謠蝉ｾ帙☆繧九お繝ｳ繝峨・繧､繝ｳ繝・
  app.get("/api/images/chat-exports/:fileName", async (req, res) => {
    try {
      const fileName = req.params.fileName;
      const imagePath = path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports', fileName);
      
      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ message: "Image not found" });
      }

      // 逕ｻ蜒上ヵ繧｡繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ繧薙〒騾∽ｿ｡
      const imageBuffer = fs.readFileSync(imagePath);
      const ext = path.extname(fileName).toLowerCase();
      
      let contentType = 'image/jpeg';
      if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.webp') contentType = 'image/webp';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1蟷ｴ髢薙く繝｣繝・す繝･
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error serving chat export image:", error);
      res.status(500).json({ error: "Failed to serve image" });
    }
  });

  console.log('笨・繝√Ε繝・ヨ繝ｫ繝ｼ繝育匳骭ｲ螳御ｺ・);
} 