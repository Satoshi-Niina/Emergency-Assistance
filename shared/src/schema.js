"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = exports.chatExports = exports.keywords = exports.documents = exports.images = exports.emergencyFlows = exports.media = exports.messages = exports.chats = exports.users = void 0;
// データベースに必要なdrizzle-ormの型とヘルパーをインポート
var pg_core_1 = require("drizzle-orm/pg-core");
var drizzle_orm_1 = require("drizzle-orm");
// ユーザーテーブルの定義
// システムのユーザー情報を管理
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    username: (0, pg_core_1.text)('username').notNull().unique(),
    password: (0, pg_core_1.text)('password').notNull(),
    display_name: (0, pg_core_1.text)('display_name').notNull(),
    role: (0, pg_core_1.text)('role').notNull().default('employee'),
    department: (0, pg_core_1.text)('department'),
    description: (0, pg_core_1.text)('description'),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// チャットテーブルの定義
// チャットセッション情報を管理
exports.chats = (0, pg_core_1.pgTable)('chats', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))), // UUIDを自動生成
    userId: (0, pg_core_1.text)('user_id').notNull(), // チャットを開始したユーザーのID
    title: (0, pg_core_1.text)('title'), // チャットのタイトル（オプション）
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull() // 作成日時
});
// メッセージテーブルの定義
// チャット内のメッセージを管理
exports.messages = (0, pg_core_1.pgTable)('messages', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))), // UUIDを自動生成
    chatId: (0, pg_core_1.text)('chat_id').notNull(), // 関連するチャットのID
    senderId: (0, pg_core_1.text)('sender_id').notNull(), // 送信者のID
    content: (0, pg_core_1.text)('content').notNull(), // メッセージの内容
    isAiResponse: (0, pg_core_1.boolean)('is_ai_response').notNull().default(false), // AIの応答かどうか
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull() // 送信日時
});
// メディアテーブルの定義
// 画像や動画などのメディアファイルを管理
exports.media = (0, pg_core_1.pgTable)('media', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))), // UUIDを自動生成
    messageId: (0, pg_core_1.text)('message_id').notNull(), // 関連するメッセージのID
    type: (0, pg_core_1.text)('type').notNull(), // メディアの種類（画像、動画など）
    url: (0, pg_core_1.text)('url').notNull(), // メディアファイルのURL
    description: (0, pg_core_1.text)('description'), // メディアの説明（オプション）
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull() // 作成日時
});
// 緊急フローテーブルの定義
// 緊急時の対応手順を管理
exports.emergencyFlows = (0, pg_core_1.pgTable)('emergency_flows', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))), // UUIDを自動生成
    title: (0, pg_core_1.text)('title').notNull(), // フローのタイトル
    description: (0, pg_core_1.text)('description'), // フローの説明
    steps: (0, pg_core_1.jsonb)('steps').notNull(), // 手順のステップ（JSON形式）
    keyword: (0, pg_core_1.text)('keyword').notNull(), // 検索用キーワード
    category: (0, pg_core_1.text)('category').notNull().default(''), // カテゴリ
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull() // 作成日時
});
// 画像テーブルの定義
// システムで使用する画像とその説明を管理
exports.images = (0, pg_core_1.pgTable)('images', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))), // UUIDを自動生成
    url: (0, pg_core_1.text)('url').notNull(), // 画像のURL
    description: (0, pg_core_1.text)('description').notNull(), // 画像の説明
    embedding: (0, pg_core_1.jsonb)('embedding').notNull(), // 画像の特徴ベクトル（AI検索用）
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull() // 作成日時
});
// ドキュメントテーブルの定義
// システムで管理する文書を管理
exports.documents = (0, pg_core_1.pgTable)('documents', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_7 || (templateObject_7 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))), // UUIDを自動生成
    title: (0, pg_core_1.text)('title').notNull(), // ドキュメントのタイトル
    content: (0, pg_core_1.text)('content').notNull(), // ドキュメントの内容
    userId: (0, pg_core_1.text)('user_id').notNull(), // 作成者のユーザーID
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull() // 作成日時
});
// キーワードテーブルの定義
// ドキュメント検索用のキーワードを管理
exports.keywords = (0, pg_core_1.pgTable)('keywords', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_8 || (templateObject_8 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))), // UUIDを自動生成
    documentId: (0, pg_core_1.text)('document_id'), // 関連するドキュメントのID
    word: (0, pg_core_1.text)('word').notNull(), // キーワード
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull() // 作成日時
});
// チャットエクスポートテーブルの定義
// チャット履歴のエクスポート記録を管理
exports.chatExports = (0, pg_core_1.pgTable)('chat_exports', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_9 || (templateObject_9 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))), // UUIDを自動生成
    chatId: (0, pg_core_1.text)('chat_id').notNull(), // 関連するチャットのID
    userId: (0, pg_core_1.text)('user_id').notNull(), // エクスポートを実行したユーザーのID
    timestamp: (0, pg_core_1.timestamp)('timestamp').defaultNow().notNull() // エクスポート実行日時
});
// スキーマの統合エクスポート
exports.schema = {
    users: exports.users,
    chats: exports.chats,
    messages: exports.messages,
    media: exports.media,
    documents: exports.documents,
    keywords: exports.keywords,
    emergencyFlows: exports.emergencyFlows,
    images: exports.images,
    chatExports: exports.chatExports,
};
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9;
