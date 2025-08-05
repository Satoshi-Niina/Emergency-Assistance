
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { pgTable, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ユーザーテーブル
export const users = pgTable('users', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    username: text('username').notNull().unique(),
    password: text('password').notNull(),
    displayName: text('display_name').notNull(),
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

// メッセージテーブル
export const messages = pgTable('messages', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    chatId: text('chat_id').notNull(),
    senderId: text('sender_id').notNull(),
    content: text('content').notNull(),
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

// 緊急フローテーブル（削除予定 - JSONファイルに移行）
// export const emergencyFlows = pgTable('emergency_flows', {
//     id: text('id').primaryKey().default(sql`gen_random_uuid()`),
//     title: text('title').notNull(),
//     description: text('description'),
//     steps: jsonb('steps').notNull(),
//     keyword: text('keyword'), // オプショナルに変更
//     category: text('category').notNull().default(''),
//     createdAt: timestamp('created_at').defaultNow().notNull()
// });

// 画像テーブル
export const images = pgTable('images', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    url: text('url').notNull(),
    description: text('description').notNull(),
    embedding: jsonb('embedding').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 画像データテーブル（PostgreSQLに保存）
export const imageData = pgTable('image_data', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    fileName: text('file_name').notNull(),
    originalFileName: text('original_file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSize: text('file_size').notNull(),
    data: text('data').notNull(), // Base64エンコードされた画像データ
    category: text('category'), // emergency-flows, knowledge-base, etc.
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// ドキュメントテーブル
export const documents = pgTable('documents', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    title: text('title').notNull(),
    content: text('content').notNull(),
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

// 履歴管理テーブル
export const historyItems = pgTable('history_items', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    chatId: text('chat_id').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    machineModel: text('machine_model'),
    office: text('office'),
    category: text('category'),
    emergencyGuideTitle: text('emergency_guide_title'),
    emergencyGuideContent: text('emergency_guide_content'),
    keywords: jsonb('keywords'), // string[]
    metadata: jsonb('metadata'), // 追加のメタデータ用
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// 履歴に関連する画像テーブル
export const historyImages = pgTable('history_images', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    historyItemId: text('history_item_id').notNull(),
    url: text('url').notNull(),
    description: text('description'),
    originalFileName: text('original_file_name'),
    fileSize: text('file_size'),
    mimeType: text('mime_type'),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 応急処置サポート履歴テーブル
export const supportHistory = pgTable('support_history', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    machineType: text('machine_type').notNull(),
    machineNumber: text('machine_number').notNull(),
    machineTypeId: text('machine_type_id').references(() => machineTypes.id),
    machineId: text('machine_id').references(() => machines.id),
    jsonData: jsonb('json_data').notNull(),
    imagePath: text('image_path'),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 基礎データ（文書）テーブル
export const baseDocuments = pgTable('base_documents', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    title: text('title').notNull(),
    filePath: text('file_path').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 応急処置フローテーブル（削除予定 - JSONファイルに移行）
// export const supportFlows = pgTable('support_flows', {
//     id: text('id').primaryKey().default(sql`gen_random_uuid()`),
//     title: text('title').notNull(),
//     jsonData: jsonb('json_data').notNull().default('{}'),
//     createdAt: timestamp('created_at').defaultNow().notNull()
// });

// 機種テーブル
export const machineTypes = pgTable('machine_types', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    machineTypeName: text('machine_type_name').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 機械テーブル
export const machines = pgTable('machines', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    machineNumber: text('machine_number').notNull(),
    machineTypeId: text('machine_type_id').notNull().references(() => machineTypes.id),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// スキーマエクスポート
export const schema = {
    users,
    chats,
    messages,
    media,
    documents,
    keywords,
    // emergencyFlows, // 削除 - JSONファイルに移行
    images,
    imageData,
    chatExports,
    historyItems,
    historyImages,
    supportHistory,
    baseDocuments,
    // supportFlows, // 削除 - JSONファイルに移行
    machineTypes,
    machines,
};