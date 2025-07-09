// データベースに必要なdrizzle-ormの型とヘルパーをインポート
import { pgTable, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

// ユーザーテーブルの定義
// システムのユーザー情報を管理
export const users: any = pgTable('users', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`),
    username: text('username').notNull().unique(),
    password: text('password').notNull(),
    display_name: text('display_name').notNull(),
    role: text('role').notNull().default('employee'),
    department: text('department'),
    description: text('description'),
    created_at: timestamp('created_at').defaultNow().notNull()
});

// チャットテーブルの定義
// チャットセッション情報を管理
export const chats: any = pgTable('chats', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`), // UUIDを自動生成
    userId: text('user_id').notNull(), // チャットを開始したユーザーのID
    title: text('title'), // チャットのタイトル（オプション）
    createdAt: timestamp('created_at').defaultNow().notNull() // 作成日時
});

// メッセージテーブルの定義
// チャット内のメッセージを管理
export const messages: any = pgTable('messages', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`), // UUIDを自動生成
    chatId: text('chat_id').notNull(), // 関連するチャットのID
    senderId: text('sender_id').notNull(), // 送信者のID
    content: text('content').notNull(), // メッセージの内容
    isAiResponse: boolean('is_ai_response').notNull().default(false), // AIの応答かどうか
    createdAt: timestamp('created_at').defaultNow().notNull() // 送信日時
});

// メディアテーブルの定義
// 画像や動画などのメディアファイルを管理
export const media: any = pgTable('media', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`), // UUIDを自動生成
    messageId: text('message_id').notNull(), // 関連するメッセージのID
    type: text('type').notNull(), // メディアの種類（画像、動画など）
    url: text('url').notNull(), // メディアファイルのURL
    description: text('description'), // メディアの説明（オプション）
    createdAt: timestamp('created_at').defaultNow().notNull() // 作成日時
});

// 緊急フローテーブルの定義
// 緊急時の対応手順を管理
export const emergencyFlows: any = pgTable('emergency_flows', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`), // UUIDを自動生成
    title: text('title').notNull(), // フローのタイトル
    description: text('description'), // フローの説明
    steps: jsonb('steps').notNull(), // 手順のステップ（JSON形式）
    keyword: text('keyword').notNull(), // 検索用キーワード
    category: text('category').notNull().default(''), // カテゴリ
    createdAt: timestamp('created_at').defaultNow().notNull() // 作成日時
});

// 画像テーブルの定義
// システムで使用する画像とその説明を管理
export const images: any = pgTable('images', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`), // UUIDを自動生成
    url: text('url').notNull(), // 画像のURL
    description: text('description').notNull(), // 画像の説明
    embedding: jsonb('embedding').notNull(), // 画像の特徴ベクトル（AI検索用）
    createdAt: timestamp('created_at').defaultNow().notNull() // 作成日時
});

// ドキュメントテーブルの定義
// システムで管理する文書を管理
export const documents: any = pgTable('documents', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`), // UUIDを自動生成
    title: text('title').notNull(), // ドキュメントのタイトル
    content: text('content').notNull(), // ドキュメントの内容
    userId: text('user_id').notNull(), // 作成者のユーザーID
    createdAt: timestamp('created_at').defaultNow().notNull() // 作成日時
});

// キーワードテーブルの定義
// ドキュメント検索用のキーワードを管理
export const keywords: any = pgTable('keywords', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`), // UUIDを自動生成
    documentId: text('document_id'), // 関連するドキュメントのID
    word: text('word').notNull(), // キーワード
    createdAt: timestamp('created_at').defaultNow().notNull() // 作成日時
});

// チャットエクスポートテーブルの定義
// チャット履歴のエクスポート記録を管理
export const chatExports: any = pgTable('chat_exports', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`), // UUIDを自動生成
    chatId: text('chat_id').notNull(), // 関連するチャットのID
    userId: text('user_id').notNull(), // エクスポートを実行したユーザーのID
    timestamp: timestamp('timestamp').defaultNow().notNull() // エクスポート実行日時
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
