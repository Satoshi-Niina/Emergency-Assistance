"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = exports.supportHistory = exports.historyImages = exports.historyItems = exports.baseDocuments = exports.machines = exports.machineTypes = exports.messages = exports.chats = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// ユーザーテーブル
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    username: (0, pg_core_1.text)('username').notNull().unique(),
    password: (0, pg_core_1.text)('password').notNull(),
    displayName: (0, pg_core_1.text)('display_name').notNull(),
    role: (0, pg_core_1.text)('role').notNull().default('employee'),
    department: (0, pg_core_1.text)('department'),
    description: (0, pg_core_1.text)('description'),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// チャットテーブル
exports.chats = (0, pg_core_1.pgTable)('chats', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.text)('user_id').notNull(),
    title: (0, pg_core_1.text)('title'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// メッセージテーブル
exports.messages = (0, pg_core_1.pgTable)('messages', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    chatId: (0, pg_core_1.text)('chat_id').notNull(),
    senderId: (0, pg_core_1.text)('sender_id').notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    isAiResponse: (0, pg_core_1.boolean)('is_ai_response').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// 機種テーブル
exports.machineTypes = (0, pg_core_1.pgTable)('machine_types', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    machineTypeName: (0, pg_core_1.text)('machine_type_name').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// 機械テーブル
exports.machines = (0, pg_core_1.pgTable)('machines', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    machineNumber: (0, pg_core_1.text)('machine_number').notNull(),
    machineTypeId: (0, pg_core_1.text)('machine_type_id').notNull().references(() => exports.machineTypes.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// 基礎データ（文書）テーブル
exports.baseDocuments = (0, pg_core_1.pgTable)('base_documents', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    title: (0, pg_core_1.text)('title').notNull(),
    filePath: (0, pg_core_1.text)('file_path').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// 履歴管理テーブル
exports.historyItems = (0, pg_core_1.pgTable)('history_items', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    chatId: (0, pg_core_1.text)('chat_id').notNull(),
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description').notNull(),
    machineModel: (0, pg_core_1.text)('machine_model'),
    office: (0, pg_core_1.text)('office'),
    category: (0, pg_core_1.text)('category'),
    emergencyGuideTitle: (0, pg_core_1.text)('emergency_guide_title'),
    emergencyGuideContent: (0, pg_core_1.text)('emergency_guide_content'),
    keywords: (0, pg_core_1.jsonb)('keywords'), // string[]
    metadata: (0, pg_core_1.jsonb)('metadata'), // 追加のメタデータ用
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
});
// 履歴に関連する画像テーブル
exports.historyImages = (0, pg_core_1.pgTable)('history_images', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    historyItemId: (0, pg_core_1.text)('history_item_id').notNull(),
    url: (0, pg_core_1.text)('url').notNull(),
    description: (0, pg_core_1.text)('description'),
    originalFileName: (0, pg_core_1.text)('original_file_name'),
    fileSize: (0, pg_core_1.text)('file_size'),
    mimeType: (0, pg_core_1.text)('mime_type'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// 応急処置サポート履歴テーブル
exports.supportHistory = (0, pg_core_1.pgTable)('support_history', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    machineType: (0, pg_core_1.text)('machine_type').notNull(),
    machineNumber: (0, pg_core_1.text)('machine_number').notNull(),
    machineTypeId: (0, pg_core_1.text)('machine_type_id').references(() => exports.machineTypes.id),
    machineId: (0, pg_core_1.text)('machine_id').references(() => exports.machines.id),
    jsonData: (0, pg_core_1.jsonb)('json_data').notNull(),
    imagePath: (0, pg_core_1.text)('image_path'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// スキーマエクスポート
exports.schema = {
    users: exports.users,
    chats: exports.chats,
    messages: exports.messages,
    machineTypes: exports.machineTypes,
    machines: exports.machines,
    baseDocuments: exports.baseDocuments,
    historyItems: exports.historyItems,
    historyImages: exports.historyImages,
    supportHistory: exports.supportHistory,
};
