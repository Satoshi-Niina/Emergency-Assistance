import type { users, chats, messages, media, documents, keywords, emergencyFlows, images, chatExports } from './schema';
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
export interface ChatMessage {
    id: string;
    chatId: string;
    content: string;
    text: string;
    isAiResponse: boolean;
    senderId: string | null;
    createdAt: Date;
    timestamp?: Date;
    role?: 'user' | 'assistant';
    media?: {
        type: string;
        url: string;
        thumbnail?: string;
    }[];
}
export interface MessageInterface extends ChatMessage {
}
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
export interface EmergencyFlowData {
    id: string;
    title: string;
    description?: string;
    steps: EmergencyFlowStep[];
    keyword: string;
    category: string;
    createdAt: Date;
}
export interface UserSession {
    id: string;
    username: string;
    displayName: string;
    role: string;
    department?: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface SearchResult<T = any> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
export interface FileUpload {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    uploadedAt: Date;
}
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
//# sourceMappingURL=types.d.ts.map