-- PostgreSQL ユーザーテーブル作成マイグレーション
-- Emergency Assistance System - Users Table

-- UUID拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- users テーブルの作成
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    department TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- サンプルユーザーの挿入（既存データがない場合のみ）
INSERT INTO users (username, password, display_name, role, department) VALUES
    ('admin', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dE3fF4gG5hH6iI7jJ8kK9lL0mM1nN2oO3pP4qQ5rR6sS7tT8uU9vV0wW1xX2yY3zZ', '管理者', 'admin', 'システム管理部'),
    ('employee1', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dE3fF4gG5hH6iI7jJ8kK9lL0mM1nN2oO3pP4qQ5rR6sS7tT8uU9vV0wW1xX2yY3zZ', '従業員1', 'employee', '保守部')
ON CONFLICT (username) DO NOTHING;

-- コメントの追加
COMMENT ON TABLE users IS 'ユーザー管理テーブル';
COMMENT ON COLUMN users.id IS 'ユーザーID（UUID）';
COMMENT ON COLUMN users.username IS 'ユーザー名（ログイン用）';
COMMENT ON COLUMN users.password IS 'パスワード（ハッシュ化済み）';
COMMENT ON COLUMN users.display_name IS '表示名';
COMMENT ON COLUMN users.role IS '権限（admin/employee）';
COMMENT ON COLUMN users.department IS '部署名';
COMMENT ON COLUMN users.description IS '説明';
COMMENT ON COLUMN users.created_at IS '作成日時'; 