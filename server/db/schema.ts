
import { pgTable, text, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Define all tables with UUID primary keys
const users = pgTable('users', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  display_name: text('display_name').notNull(),
  role: text('role').notNull().default('employee'),
  department: text('department'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  description: text('description')
});

const chats = pgTable('chats', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

const messages = pgTable('messages', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  chatId: text('chat_id').notNull().references(() => chats.id),
  senderId: text('sender_id').references(() => users.id), // AIメッセージはnullを許可
  content: text('content').notNull(),
  isAiResponse: boolean('is_ai_response').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

const media = pgTable('media', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  messageId: text('message_id').notNull().references(() => messages.id),
  type: text('type').notNull(),
  url: text('url').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

const emergencyFlows = pgTable('emergency_flows', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  steps: jsonb('steps').notNull(),
  keyword: text('keyword').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

const images = pgTable('images', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  url: text('url').notNull(),
  description: text('description').notNull(),
  embedding: jsonb('embedding').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

const documents = pgTable('documents', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  content: text('content').notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

const keywords = pgTable('keywords', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  documentId: text('document_id').references(() => documents.id),
  word: text('word').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

const chatExports = pgTable('chat_exports', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  chatId: text('chat_id').notNull().references(() => chats.id),
  userId: text('user_id').notNull().references(() => users.id),
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

// Export schema object after all tables are defined
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

// Export individual tables
export { users, chats, messages, media, emergencyFlows, images, documents, keywords, chatExports };
