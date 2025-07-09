import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { pgTable, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ユーザーテーブル
export const users = pgTable('users', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    username: text('username').notNull().unique(),
    password: text('password').notNull(),
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

// 緊急フローテーブル
export const emergencyFlows = pgTable('emergency_flows', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    title: text('title').notNull(),
    description: text('description'),
    steps: jsonb('steps').notNull(),
    keyword: text('keyword').notNull(),
    category: text('category').notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 画像テーブル
export const images = pgTable('images', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    url: text('url').notNull(),
    description: text('description').notNull(),
    embedding: jsonb('embedding').notNull(),
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

// スキーマエクスポート
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

// データベース接続
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/emergency_assistance';

console.log("🔍 DEBUG server/db/schema.ts: DATABASE_URL =", process.env.DATABASE_URL);
console.log("🔍 DEBUG server/db/schema.ts: connectionString =", connectionString);

const client = postgres(connectionString);
export const db = drizzle<typeof schema>(client, { schema });

// マイグレーション実行
export async function runMigrations() {
    try {
        await migrate(db, { migrationsFolder: './migrations' });
        console.log('Migrations completed successfully');
    } catch (error) {
        console.error('Migration error:', error);
        throw error;
    }
}