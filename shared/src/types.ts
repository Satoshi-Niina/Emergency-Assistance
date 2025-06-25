import type { 
  users, 
  chats, 
  messages, 
  media, 
  documents, 
  keywords, 
  emergencyFlows, 
  images, 
  chatExports 
} from './schema';

// Type exports for better TypeScript support
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Chat = typeof chats.$inferSelect;
export type InsertChat = typeof chats.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export type Media = typeof media.$inferSelect;
export type InsertMedia = typeof media.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

export type Keyword = typeof keywords.$inferSelect;
export type InsertKeyword = typeof keywords.$inferInsert;

export type EmergencyFlow = typeof emergencyFlows.$inferSelect;
export type InsertEmergencyFlow = typeof emergencyFlows.$inferInsert;

export type Image = typeof images.$inferSelect;
export type InsertImage = typeof images.$inferInsert;

export type ChatExport = typeof chatExports.$inferSelect;
export type InsertChatExport = typeof chatExports.$inferInsert;

// 統一されたChatMessage型定義
export interface ChatMessage {
  id: string;
  chatId: string;
  content: string;  // メイン表示用（テキストまたは画像URL）
  text: string;     // 互換性用（contentと同じ値）
  isAiResponse: boolean;
  senderId: string | null;
  createdAt: Date;
  timestamp?: Date;
  role?: 'user' | 'assistant';
  media?: { type: string, url: string, thumbnail?: string }[];
}

// 既存のMessage型はChatMessageのエイリアスとして維持（互換性のため）
export interface MessageInterface extends ChatMessage {}

// 緊急フローのステップ型定義
export interface EmergencyFlowStep {
  id: string;
  title: string;
  description?: string;
  type: 'action' | 'decision' | 'end';
  nextStepId?: string;
  conditions?: {
    condition: string;
    nextStepId: string;
  }[];
  actions?: string[];
  imageUrl?: string;
}

// 緊急フロー全体の型定義
export interface EmergencyFlowData {
  id: string;
  title: string;
  description?: string;
  steps: EmergencyFlowStep[];
  keyword: string;
  category: string;
  createdAt: Date;
}

// ユーザーセッション型定義
export interface UserSession {
  id: string;
  username: string;
  displayName: string;
  role: string;
  department?: string;
}

// APIレスポンス型定義
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 検索結果型定義
export interface SearchResult<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ファイルアップロード型定義
export interface FileUpload {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

// システム設定型定義
export interface SystemConfig {
  version: string;
  environment: 'development' | 'production' | 'staging';
  features: {
    chat: boolean;
    emergencyGuide: boolean;
    troubleshooting: boolean;
    knowledgeBase: boolean;
    voiceAssistant: boolean;
  };
  limits: {
    maxFileSize: number;
    maxUploadFiles: number;
    maxChatHistory: number;
  };
} 