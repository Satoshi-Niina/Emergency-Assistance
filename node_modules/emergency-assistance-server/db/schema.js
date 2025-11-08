import { pgTable, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
// ユーザーテーブル
export const users = pgTable('users', {
    id: text('id')
        .primaryKey()
        .default(sql `gen_random_uuid()`),
    username: text('username').notNull().unique(),
    password: text('password').notNull(),
    displayName: text('display_name').notNull(),
    role: text('role').notNull().default('employee'),
    department: text('department'),
    description: text('description'),
    created_at: timestamp('created_at').defaultNow().notNull(),
});
// チャットテーブル
export const chats = pgTable('chats', {
    id: text('id')
        .primaryKey()
        .default(sql `gen_random_uuid()`),
    userId: text('user_id').notNull(),
    title: text('title'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// メッセージテーブル
export const messages = pgTable('messages', {
    id: text('id')
        .primaryKey()
        .default(sql `gen_random_uuid()`),
    chatId: text('chat_id').notNull(),
    senderId: text('sender_id').notNull(),
    content: text('content').notNull(),
    isAiResponse: boolean('is_ai_response').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// 機種テーブル
export const machineTypes = pgTable('machine_types', {
    id: text('id')
        .primaryKey()
        .default(sql `gen_random_uuid()`),
    machineTypeName: text('machine_type_name').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// 機械テーブル
export const machines = pgTable('machines', {
    id: text('id')
        .primaryKey()
        .default(sql `gen_random_uuid()`),
    machineNumber: text('machine_number').notNull(),
    machineTypeId: text('machine_type_id')
        .notNull()
        .references(() => machineTypes.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// 基礎データ（文書）テーブル
export const baseDocuments = pgTable('base_documents', {
    id: text('id')
        .primaryKey()
        .default(sql `gen_random_uuid()`),
    title: text('title').notNull(),
    filePath: text('file_path').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// 履歴管理テーブル
export const historyItems = pgTable('history_items', {
    id: text('id')
        .primaryKey()
        .default(sql `gen_random_uuid()`),
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
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
// 履歴に関連する画像テーブル
export const historyImages = pgTable('history_images', {
    id: text('id')
        .primaryKey()
        .default(sql `gen_random_uuid()`),
    historyItemId: text('history_item_id').notNull(),
    url: text('url').notNull(),
    description: text('description'),
    originalFileName: text('original_file_name'),
    fileSize: text('file_size'),
    mimeType: text('mime_type'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// 応急処置サポート履歴テーブル
export const supportHistory = pgTable('support_history', {
    id: text('id')
        .primaryKey()
        .default(sql `gen_random_uuid()`),
    machineType: text('machine_type').notNull(),
    machineNumber: text('machine_number').notNull(),
    machineTypeId: text('machine_type_id').references(() => machineTypes.id),
    machineId: text('machine_id').references(() => machines.id),
    jsonData: jsonb('json_data').notNull(),
    imagePath: text('image_path'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// メディアテーブル
export const media = pgTable('media', {
    id: text('id')
        .primaryKey()
        .default(sql `gen_random_uuid()`),
    messageId: text('message_id')
        .notNull()
        .references(() => messages.id),
    fileName: text('file_name').notNull(),
    filePath: text('file_path').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSize: text('file_size'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// ドキュメントテーブル
export const documents = pgTable('documents', {
    id: text('id')
        .primaryKey()
        .default(sql `gen_random_uuid()`),
    userId: text('user_id')
        .notNull()
        .references(() => users.id),
    title: text('title').notNull(),
    content: text('content'),
    filePath: text('file_path'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// キーワードテーブル
export const keywords = pgTable('keywords', {
    id: text('id')
        .primaryKey()
        .default(sql `gen_random_uuid()`),
    documentId: text('document_id')
        .notNull()
        .references(() => documents.id),
    word: text('word').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// チャットエクスポートテーブル
export const chatExports = pgTable('chat_exports', {
    id: text('id')
        .primaryKey()
        .default(sql `gen_random_uuid()`),
    chatId: text('chat_id')
        .notNull()
        .references(() => chats.id),
    userId: text('user_id')
        .notNull()
        .references(() => users.id),
    exportPath: text('export_path').notNull(),
    exportType: text('export_type').notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// 画像データテーブル
export const images = pgTable('images', {
    id: text('id')
        .primaryKey()
        .default(sql `gen_random_uuid()`),
    fileName: text('file_name').notNull(),
    originalFileName: text('original_file_name'),
    filePath: text('file_path').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSize: text('file_size'),
    category: text('category'),
    description: text('description'),
    data: text('data'),
    embedding: jsonb('embedding'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// 故障履歴テーブル（JSON形式データを含む）
export const faultHistory = pgTable('fault_history', {
    id: text('id')
        .primaryKey()
        .default(sql `gen_random_uuid()`),
    title: text('title').notNull(),
    description: text('description'),
    machineType: text('machine_type'),
    machineNumber: text('machine_number'),
    office: text('office'),
    category: text('category'),
    keywords: jsonb('keywords'), // string[]
    emergencyGuideTitle: text('emergency_guide_title'),
    emergencyGuideContent: text('emergency_guide_content'),
    jsonData: jsonb('json_data').notNull(), // 元のJSONデータを保存
    metadata: jsonb('metadata'), // 追加のメタデータ
    storageMode: text('storage_mode').notNull().default('database'), // 'database' または 'file'
    filePath: text('file_path'), // ファイルモード時のパス
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
// 故障履歴に関連する画像テーブル
export const faultHistoryImages = pgTable('fault_history_images', {
    id: text('id')
        .primaryKey()
        .default(sql `gen_random_uuid()`),
    faultHistoryId: text('fault_history_id')
        .notNull()
        .references(() => faultHistory.id, { onDelete: 'cascade' }),
    originalFileName: text('original_file_name'),
    fileName: text('file_name').notNull(),
    filePath: text('file_path').notNull(), // knowledge-base/images/chat-exports/ 内のパス
    relativePath: text('relative_path'), // JSONデータ内の相対パス
    mimeType: text('mime_type'),
    fileSize: text('file_size'),
    description: text('description'),
    imageData: text('image_data'), // base64形式のデータ（必要に応じて）
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// 画像データ（別名）
export const imageData = images;
// スキーマエクスポート
export const schema = {
    users,
    chats,
    messages,
    machineTypes,
    machines,
    baseDocuments,
    historyItems,
    historyImages,
    supportHistory,
    media,
    documents,
    keywords,
    chatExports,
    images,
    imageData,
    faultHistory,
    faultHistoryImages,
};
