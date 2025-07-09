// データベースに必要なdrizzle-ormの型とヘルパーをインポート
import { pgTable, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
// ユーザーテーブルの定義
export const users = pgTable('users', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`),
    username: text('username').notNull().unique(),
    password: text('password').notNull(),
    display_name: text('display_name').notNull(),
    role: text('role').notNull().default('employee'),
    department: text('department'),
    description: text('description'),
    created_at: timestamp('created_at').defaultNow().notNull()
});
export const chats = pgTable('chats', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`),
    userId: text('user_id').notNull(),
    title: text('title'),
    createdAt: timestamp('created_at').defaultNow().notNull()
});
export const messages = pgTable('messages', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`),
    chatId: text('chat_id').notNull(),
    senderId: text('sender_id').notNull(),
    content: text('content').notNull(),
    isAiResponse: boolean('is_ai_response').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull()
});
export const media = pgTable('media', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`),
    messageId: text('message_id').notNull(),
    type: text('type').notNull(),
    url: text('url').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull()
});
export const emergencyFlows = pgTable('emergency_flows', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`),
    title: text('title').notNull(),
    description: text('description'),
    steps: jsonb('steps').notNull(),
    keyword: text('keyword').notNull(),
    category: text('category').notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull()
});
export const images = pgTable('images', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`),
    url: text('url').notNull(),
    description: text('description').notNull(),
    embedding: jsonb('embedding').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});
export const documents = pgTable('documents', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`),
    title: text('title').notNull(),
    content: text('content').notNull(),
    userId: text('user_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});
export const keywords = pgTable('keywords', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`),
    documentId: text('document_id'),
    word: text('word').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});
export const chatExports = pgTable('chat_exports', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`),
    chatId: text('chat_id').notNull(),
    userId: text('user_id').notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull()
});
// Zodスキーマの定義
export const insertUserSchema = z.object({
    username: z.string(),
    password: z.string(),
    display_name: z.string(),
    role: z.string().default('employee'),
    department: z.string().optional(),
    description: z.string().optional()
});
export const insertChatSchema = z.object({
    userId: z.string(),
    title: z.string().optional()
});
export const insertMessageSchema = z.object({
    chatId: z.string(),
    senderId: z.string(),
    content: z.string(),
    isAiResponse: z.boolean().default(false)
});
export const insertMediaSchema = z.object({
    messageId: z.string(),
    type: z.string(),
    url: z.string(),
    description: z.string().optional()
});
export const insertDocumentSchema = z.object({
    title: z.string(),
    content: z.string(),
    userId: z.string()
});
// スキーマの統合エクスポート
export const schema = {
    users,
    chats,
    messages,
    media,
    documents,
    keywords,
    emergencyFlows,
    images,
    chatExports,
};
