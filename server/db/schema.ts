
import { pgTable, text, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ユーザーテーブル - 暗号化対応
export const users = pgTable('users', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  username: text('username').notNull().unique(),
  password: text('password').notNull(), // bcryptで暗号化
  display_name: text('display_name').notNull(),
  role: text('role').notNull().default('employee'),
  department: text('department'),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// チャットテーブル
export const chats = pgTable('chats', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull(),
  title: text('title'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// メッセージテーブル - センシティブデータの暗号化対応
export const messages = pgTable('messages', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  chatId: text('chat_id').notNull(),
  senderId: text('sender_id'), // nullable for AI messages
  content: text('content').notNull(), // 必要に応じて暗号化
  isAiResponse: boolean('is_ai_response').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// メディアテーブル
export const media = pgTable('media', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  messageId: text('message_id').notNull(),
  type: text('type').notNull(),
  url: text('url').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 緊急フローテーブル
export const emergencyFlows = pgTable('emergency_flows', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  steps: jsonb('steps').notNull(), // JSON暗号化対応
  keyword: text('keyword').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 画像テーブル - 埋め込みベクトルの暗号化
export const images = pgTable('images', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  url: text('url').notNull(),
  description: text('description').notNull(),
  embedding: jsonb('embedding').notNull(), // 暗号化されたベクトルデータ
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// ドキュメントテーブル
export const documents = pgTable('documents', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  content: text('content').notNull(), // 大きなテキストは暗号化対象
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// キーワードテーブル
export const keywords = pgTable('keywords', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  documentId: text('document_id'),
  word: text('word').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// チャットエクスポートテーブル
export const chatExports = pgTable('chat_exports', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  chatId: text('chat_id').notNull(),
  userId: text('user_id').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

// スキーマエクスポート
export const schema = {
  users,
  chats,
  messages,
  media,
  emergencyFlows,
  images,
  documents,
  keywords,
  chatExports
};
