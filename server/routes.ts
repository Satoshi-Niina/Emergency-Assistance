// DEPRECATED: routes.ts は registerRoutes.ts に移行中です。
// FS依存を回避するため、このファイルは無効化されています。
// app.ts は既に registerRoutes.ts の registerRoutes() を使用しています。

import type { Express } from "express";

export function registerRoutes(app: Express): void {
  console.warn('[routes.ts] このファイルは非推奨です。registerRoutes.ts の registerRoutes() 関数を使用してください。');
  
  // 最小限のヘルスチェックのみ提供（後方互換性のため）
  app.get('/api/legacy-health', (req, res) => {
    res.status(200).json({ 
      status: 'deprecated',
      message: 'This endpoint is deprecated. Use /health instead.',
      timestamp: new Date().toISOString()
    });
  });
}

// 以下はFS依存のため全てコメントアウト
/*
import { storage } from "./storage.js";
import { users } from "./db/schema.js";
import session from "express-session";
import MemoryStore from 'memorystore';
import { processOpenAIRequest } from "./lib/openai.js";
import { processPerplexityRequest } from "./lib/perplexity.js";
import fs from "fs";
import path from "path";
import { db } from "./db/index.js";
import { upload } from './lib/multer-config.js';
import { 
  addDocumentToKnowledgeBase, 
  listKnowledgeBaseDocuments, 
  removeDocumentFromKnowledgeBase 
} from './lib/knowledge-base.js';
... 全てコメントアウト
*/