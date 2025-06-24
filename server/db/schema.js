"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = exports.chatExports = exports.keywords = exports.documents = exports.images = exports.emergencyFlows = exports.media = exports.messages = exports.chats = exports.users = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var drizzle_orm_1 = require("drizzle-orm");
// ユーザーテーブル - 暗号化対応
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    username: (0, pg_core_1.text)('username').notNull().unique(),
    password: (0, pg_core_1.text)('password').notNull(), // bcryptで暗号化
    display_name: (0, pg_core_1.text)('display_name').notNull(),
    role: (0, pg_core_1.text)('role').notNull().default('employee'),
    department: (0, pg_core_1.text)('department'),
    description: (0, pg_core_1.text)('description'),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// チャットテーブル
exports.chats = (0, pg_core_1.pgTable)('chats', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.text)('user_id').notNull(),
    title: (0, pg_core_1.text)('title'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// メッセージテーブル - センシティブデータの暗号化対応
exports.messages = (0, pg_core_1.pgTable)('messages', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    chatId: (0, pg_core_1.text)('chat_id').notNull(),
    senderId: (0, pg_core_1.text)('sender_id'), // nullable for AI messages
    content: (0, pg_core_1.text)('content').notNull(), // 必要に応じて暗号化
    isAiResponse: (0, pg_core_1.boolean)('is_ai_response').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// メディアテーブル
exports.media = (0, pg_core_1.pgTable)('media', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    messageId: (0, pg_core_1.text)('message_id').notNull(),
    type: (0, pg_core_1.text)('type').notNull(),
    url: (0, pg_core_1.text)('url').notNull(),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// 緊急フローテーブル
exports.emergencyFlows = (0, pg_core_1.pgTable)('emergency_flows', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    keyword: (0, pg_core_1.text)('keyword'),
    category: (0, pg_core_1.text)('category'),
    steps: (0, pg_core_1.jsonb)('steps').$type().notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
});
// 画像テーブル - 埋め込みベクトルの暗号化
exports.images = (0, pg_core_1.pgTable)('images', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    url: (0, pg_core_1.text)('url').notNull(),
    description: (0, pg_core_1.text)('description').notNull(),
    embedding: (0, pg_core_1.jsonb)('embedding').notNull(), // 暗号化されたベクトルデータ
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// ドキュメントテーブル
exports.documents = (0, pg_core_1.pgTable)('documents', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    title: (0, pg_core_1.text)('title').notNull(),
    content: (0, pg_core_1.text)('content').notNull(), // 大きなテキストは暗号化対象
    userId: (0, pg_core_1.text)('user_id').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// キーワードテーブル
exports.keywords = (0, pg_core_1.pgTable)('keywords', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    documentId: (0, pg_core_1.text)('document_id'),
    word: (0, pg_core_1.text)('word').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// チャットエクスポートテーブル
exports.chatExports = (0, pg_core_1.pgTable)('chat_exports', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_7 || (templateObject_7 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    chatId: (0, pg_core_1.text)('chat_id').notNull(),
    userId: (0, pg_core_1.text)('user_id').notNull(),
    timestamp: (0, pg_core_1.timestamp)('timestamp').defaultNow().notNull()
});
// スキーマエクスポート - 重複を排除
exports.schema = {
    users: exports.users,
    chats: exports.chats,
    messages: exports.messages,
    media: exports.media,
    emergencyFlows: exports.emergencyFlows,
    images: exports.images,
    documents: exports.documents,
    keywords: exports.keywords,
    chatExports: exports.chatExports
};
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7;
