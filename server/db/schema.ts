
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { pgTable, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 繝ｦ繝ｼ繧ｶ繝ｼ繝・・繝悶Ν
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

// 繝√Ε繝・ヨ繝・・繝悶Ν
export const chats = pgTable('chats', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: text('user_id').notNull(),
    title: text('title'),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 繝｡繝・そ繝ｼ繧ｸ繝・・繝悶Ν
export const messages = pgTable('messages', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    chatId: text('chat_id').notNull(),
    senderId: text('sender_id').notNull(),
    content: text('content').notNull(),
    isAiResponse: boolean('is_ai_response').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 繝｡繝・ぅ繧｢繝・・繝悶Ν
export const media = pgTable('media', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    messageId: text('message_id').notNull(),
    type: text('type').notNull(),
    url: text('url').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 邱頑･繝輔Ο繝ｼ繝・・繝悶Ν・亥炎髯､莠亥ｮ・- JSON繝輔ぃ繧､繝ｫ縺ｫ遘ｻ陦鯉ｼ・
// export const emergencyFlows = pgTable('emergency_flows', {
//     id: text('id').primaryKey().default(sql`gen_random_uuid()`),
//     title: text('title').notNull(),
//     description: text('description'),
//     steps: jsonb('steps').notNull(),
//     keyword: text('keyword'), // 繧ｪ繝励す繝ｧ繝翫Ν縺ｫ螟画峩
//     category: text('category').notNull().default(''),
//     createdAt: timestamp('created_at').defaultNow().notNull()
// });

// 逕ｻ蜒上ユ繝ｼ繝悶Ν
export const images = pgTable('images', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    url: text('url').notNull(),
    description: text('description').notNull(),
    embedding: jsonb('embedding').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 逕ｻ蜒上ョ繝ｼ繧ｿ繝・・繝悶Ν・・ostgreSQL縺ｫ菫晏ｭ假ｼ・
export const imageData = pgTable('image_data', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    fileName: text('file_name').notNull(),
    originalFileName: text('original_file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSize: text('file_size').notNull(),
    data: text('data').notNull(), // Base64繧ｨ繝ｳ繧ｳ繝ｼ繝峨＆繧後◆逕ｻ蜒上ョ繝ｼ繧ｿ
    category: text('category'), // emergency-flows, knowledge-base, etc.
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 繝峨く繝･繝｡繝ｳ繝医ユ繝ｼ繝悶Ν
export const documents = pgTable('documents', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    title: text('title').notNull(),
    content: text('content').notNull(),
    userId: text('user_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 繧ｭ繝ｼ繝ｯ繝ｼ繝峨ユ繝ｼ繝悶Ν
export const keywords = pgTable('keywords', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    documentId: text('document_id'),
    word: text('word').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝医ユ繝ｼ繝悶Ν
export const chatExports = pgTable('chat_exports', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    chatId: text('chat_id').notNull(),
    userId: text('user_id').notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull()
});

// 螻･豁ｴ邂｡逅・ユ繝ｼ繝悶Ν
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
    metadata: jsonb('metadata'), // 霑ｽ蜉縺ｮ繝｡繧ｿ繝・・繧ｿ逕ｨ
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// 螻･豁ｴ縺ｫ髢｢騾｣縺吶ｋ逕ｻ蜒上ユ繝ｼ繝悶Ν
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

// 蠢懈･蜃ｦ鄂ｮ繧ｵ繝昴・繝亥ｱ･豁ｴ繝・・繝悶Ν
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

// 蝓ｺ遉弱ョ繝ｼ繧ｿ・域枚譖ｸ・峨ユ繝ｼ繝悶Ν
export const baseDocuments = pgTable('base_documents', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    title: text('title').notNull(),
    filePath: text('file_path').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繝・・繝悶Ν・亥炎髯､莠亥ｮ・- JSON繝輔ぃ繧､繝ｫ縺ｫ遘ｻ陦鯉ｼ・
// export const supportFlows = pgTable('support_flows', {
//     id: text('id').primaryKey().default(sql`gen_random_uuid()`),
//     title: text('title').notNull(),
//     jsonData: jsonb('json_data').notNull().default('{}'),
//     createdAt: timestamp('created_at').defaultNow().notNull()
// });

// 讖溽ｨｮ繝・・繝悶Ν
export const machineTypes = pgTable('machine_types', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    machineTypeName: text('machine_type_name').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 讖滓｢ｰ繝・・繝悶Ν
export const machines = pgTable('machines', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    machineNumber: text('machine_number').notNull(),
    machineTypeId: text('machine_type_id').notNull().references(() => machineTypes.id),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 繧ｹ繧ｭ繝ｼ繝槭お繧ｯ繧ｹ繝昴・繝・
export const schema = {
    users,
    chats,
    messages,
    media,
    documents,
    keywords,
    // emergencyFlows, // 蜑企勁 - JSON繝輔ぃ繧､繝ｫ縺ｫ遘ｻ陦・
    images,
    imageData,
    chatExports,
    historyItems,
    historyImages,
    supportHistory,
    baseDocuments,
    // supportFlows, // 蜑企勁 - JSON繝輔ぃ繧､繝ｫ縺ｫ遘ｻ陦・
    machineTypes,
    machines,
};