// 繝・・繧ｿ繝吶・繧ｹ縺ｫ蠢・ｦ√↑drizzle-orm縺ｮ蝙九→繝倥Ν繝代・繧偵う繝ｳ繝昴・繝・
import { pgTable, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

// 繝ｦ繝ｼ繧ｶ繝ｼ繝・・繝悶Ν縺ｮ螳夂ｾｩ
// 繧ｷ繧ｹ繝・Β縺ｮ繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ繧堤ｮ｡逅・
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

// 繝√Ε繝・ヨ繝・・繝悶Ν縺ｮ螳夂ｾｩ
// 繝√Ε繝・ヨ繧ｻ繝・す繝ｧ繝ｳ諠・ｱ繧堤ｮ｡逅・
export const chats: any = pgTable('chats', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`), // UUID繧定・蜍慕函謌・
    userId: text('user_id').notNull(), // 繝√Ε繝・ヨ繧帝幕蟋九＠縺溘Θ繝ｼ繧ｶ繝ｼ縺ｮID
    title: text('title'), // 繝√Ε繝・ヨ縺ｮ繧ｿ繧､繝医Ν・医が繝励す繝ｧ繝ｳ・・
    createdAt: timestamp('created_at').defaultNow().notNull() // 菴懈・譌･譎・
});

// 繝｡繝・そ繝ｼ繧ｸ繝・・繝悶Ν縺ｮ螳夂ｾｩ
// 繝√Ε繝・ヨ蜀・・繝｡繝・そ繝ｼ繧ｸ繧堤ｮ｡逅・
export const messages: any = pgTable('messages', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`), // UUID繧定・蜍慕函謌・
    chatId: text('chat_id').notNull(), // 髢｢騾｣縺吶ｋ繝√Ε繝・ヨ縺ｮID
    senderId: text('sender_id').notNull(), // 騾∽ｿ｡閠・・ID
    content: text('content').notNull(), // 繝｡繝・そ繝ｼ繧ｸ縺ｮ蜀・ｮｹ
    isAiResponse: boolean('is_ai_response').notNull().default(false), // AI縺ｮ蠢懃ｭ斐°縺ｩ縺・°
    createdAt: timestamp('created_at').defaultNow().notNull() // 騾∽ｿ｡譌･譎・
});

// 繝｡繝・ぅ繧｢繝・・繝悶Ν縺ｮ螳夂ｾｩ
// 逕ｻ蜒上ｄ蜍慕判縺ｪ縺ｩ縺ｮ繝｡繝・ぅ繧｢繝輔ぃ繧､繝ｫ繧堤ｮ｡逅・
export const media: any = pgTable('media', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`), // UUID繧定・蜍慕函謌・
    messageId: text('message_id').notNull(), // 髢｢騾｣縺吶ｋ繝｡繝・そ繝ｼ繧ｸ縺ｮID
    type: text('type').notNull(), // 繝｡繝・ぅ繧｢縺ｮ遞ｮ鬘橸ｼ育判蜒上∝虚逕ｻ縺ｪ縺ｩ・・
    url: text('url').notNull(), // 繝｡繝・ぅ繧｢繝輔ぃ繧､繝ｫ縺ｮURL
    description: text('description'), // 繝｡繝・ぅ繧｢縺ｮ隱ｬ譏趣ｼ医が繝励す繝ｧ繝ｳ・・
    createdAt: timestamp('created_at').defaultNow().notNull() // 菴懈・譌･譎・
});

// 邱頑･繝輔Ο繝ｼ繝・・繝悶Ν縺ｮ螳夂ｾｩ
// 邱頑･譎ゅ・蟇ｾ蠢懈焔鬆・ｒ邂｡逅・
export const emergencyFlows: any = pgTable('emergency_flows', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`), // UUID繧定・蜍慕函謌・
    title: text('title').notNull(), // 繝輔Ο繝ｼ縺ｮ繧ｿ繧､繝医Ν
    description: text('description'), // 繝輔Ο繝ｼ縺ｮ隱ｬ譏・
    steps: jsonb('steps').notNull(), // 謇矩・・繧ｹ繝・ャ繝暦ｼ・SON蠖｢蠑擾ｼ・
    keyword: text('keyword').notNull(), // 讀懃ｴ｢逕ｨ繧ｭ繝ｼ繝ｯ繝ｼ繝・
    category: text('category').notNull().default(''), // 繧ｫ繝・ざ繝ｪ
    createdAt: timestamp('created_at').defaultNow().notNull() // 菴懈・譌･譎・
});

// 逕ｻ蜒上ユ繝ｼ繝悶Ν縺ｮ螳夂ｾｩ
// 繧ｷ繧ｹ繝・Β縺ｧ菴ｿ逕ｨ縺吶ｋ逕ｻ蜒上→縺昴・隱ｬ譏弱ｒ邂｡逅・
export const images: any = pgTable('images', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`), // UUID繧定・蜍慕函謌・
    url: text('url').notNull(), // 逕ｻ蜒上・URL
    description: text('description').notNull(), // 逕ｻ蜒上・隱ｬ譏・
    embedding: jsonb('embedding').notNull(), // 逕ｻ蜒上・迚ｹ蠕ｴ繝吶け繝医Ν・・I讀懃ｴ｢逕ｨ・・
    createdAt: timestamp('created_at').defaultNow().notNull() // 菴懈・譌･譎・
});

// 繝峨く繝･繝｡繝ｳ繝医ユ繝ｼ繝悶Ν縺ｮ螳夂ｾｩ
// 繧ｷ繧ｹ繝・Β縺ｧ邂｡逅・☆繧区枚譖ｸ繧堤ｮ｡逅・
export const documents: any = pgTable('documents', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`), // UUID繧定・蜍慕函謌・
    title: text('title').notNull(), // 繝峨く繝･繝｡繝ｳ繝医・繧ｿ繧､繝医Ν
    content: text('content').notNull(), // 繝峨く繝･繝｡繝ｳ繝医・蜀・ｮｹ
    userId: text('user_id').notNull(), // 菴懈・閠・・繝ｦ繝ｼ繧ｶ繝ｼID
    createdAt: timestamp('created_at').defaultNow().notNull() // 菴懈・譌･譎・
});

// 繧ｭ繝ｼ繝ｯ繝ｼ繝峨ユ繝ｼ繝悶Ν縺ｮ螳夂ｾｩ
// 繝峨く繝･繝｡繝ｳ繝域､懃ｴ｢逕ｨ縺ｮ繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ邂｡逅・
export const keywords: any = pgTable('keywords', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`), // UUID繧定・蜍慕函謌・
    documentId: text('document_id'), // 髢｢騾｣縺吶ｋ繝峨く繝･繝｡繝ｳ繝医・ID
    word: text('word').notNull(), // 繧ｭ繝ｼ繝ｯ繝ｼ繝・
    createdAt: timestamp('created_at').defaultNow().notNull() // 菴懈・譌･譎・
});

// 繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝医ユ繝ｼ繝悶Ν縺ｮ螳夂ｾｩ
// 繝√Ε繝・ヨ螻･豁ｴ縺ｮ繧ｨ繧ｯ繧ｹ繝昴・繝郁ｨ倬鹸繧堤ｮ｡逅・
export const chatExports: any = pgTable('chat_exports', {
    id: text('id').primaryKey().default(sql `gen_random_uuid()`), // UUID繧定・蜍慕函謌・
    chatId: text('chat_id').notNull(), // 髢｢騾｣縺吶ｋ繝√Ε繝・ヨ縺ｮID
    userId: text('user_id').notNull(), // 繧ｨ繧ｯ繧ｹ繝昴・繝医ｒ螳溯｡後＠縺溘Θ繝ｼ繧ｶ繝ｼ縺ｮID
    timestamp: timestamp('timestamp').defaultNow().notNull() // 繧ｨ繧ｯ繧ｹ繝昴・繝亥ｮ溯｡梧律譎・
});

// Zod繧ｹ繧ｭ繝ｼ繝槭・螳夂ｾｩ
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

// 繧ｹ繧ｭ繝ｼ繝槭・邨ｱ蜷医お繧ｯ繧ｹ繝昴・繝・
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


