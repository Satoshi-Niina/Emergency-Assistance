-- Initial schema for Emergency Assistance System
-- This migration creates all the base tables

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "username" text NOT NULL UNIQUE,
    "password" text NOT NULL,
    "display_name" text NOT NULL,
    "role" text NOT NULL DEFAULT 'employee',
    "department" text,
    "description" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Chats table
CREATE TABLE IF NOT EXISTS "chats" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL,
    "title" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Messages table
CREATE TABLE IF NOT EXISTS "messages" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "chat_id" text NOT NULL,
    "sender_id" text NOT NULL,
    "content" text NOT NULL,
    "is_ai_response" boolean NOT NULL DEFAULT false,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Media table
CREATE TABLE IF NOT EXISTS "media" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "message_id" text NOT NULL,
    "type" text NOT NULL,
    "url" text NOT NULL,
    "description" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Emergency flows table
CREATE TABLE IF NOT EXISTS "emergency_flows" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "steps" jsonb NOT NULL,
    "keyword" text,
    "category" text NOT NULL DEFAULT '',
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Images table (metadata)
CREATE TABLE IF NOT EXISTS "images" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "url" text NOT NULL,
    "description" text NOT NULL,
    "embedding" jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Documents table
CREATE TABLE IF NOT EXISTS "documents" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "title" text NOT NULL,
    "content" text NOT NULL,
    "user_id" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Keywords table
CREATE TABLE IF NOT EXISTS "keywords" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "document_id" text,
    "word" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Chat exports table
CREATE TABLE IF NOT EXISTS "chat_exports" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "chat_id" text NOT NULL,
    "user_id" text NOT NULL,
    "timestamp" timestamp DEFAULT now() NOT NULL
);

-- History items table
CREATE TABLE IF NOT EXISTS "history_items" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "chat_id" text NOT NULL,
    "title" text NOT NULL,
    "description" text NOT NULL,
    "machine_model" text,
    "office" text,
    "category" text,
    "emergency_guide_title" text,
    "emergency_guide_content" text,
    "keywords" jsonb,
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- History images table
CREATE TABLE IF NOT EXISTS "history_images" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "history_item_id" text NOT NULL,
    "url" text NOT NULL,
    "description" text,
    "original_file_name" text,
    "file_size" text,
    "mime_type" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Support history table
CREATE TABLE IF NOT EXISTS "support_history" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "machine_type" text NOT NULL,
    "machine_number" text NOT NULL,
    "json_data" jsonb NOT NULL,
    "image_path" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Base documents table
CREATE TABLE IF NOT EXISTS "base_documents" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "title" text NOT NULL,
    "file_path" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Support flows table
CREATE TABLE IF NOT EXISTS "support_flows" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "title" text NOT NULL,
    "json_data" jsonb NOT NULL DEFAULT '{}',
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Image data table (for storing images in PostgreSQL)
CREATE TABLE IF NOT EXISTS "image_data" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "file_name" text NOT NULL,
    "original_file_name" text NOT NULL,
    "mime_type" text NOT NULL,
    "file_size" text NOT NULL,
    "data" text NOT NULL,
    "category" text,
    "description" text,
    "created_at" timestamp DEFAULT now() NOT NULL
); 