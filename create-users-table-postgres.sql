-- PostgreSQL用ユーザーテーブル作成スクリプト
-- Emergency Assistance システム用

-- UUID拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- usersテーブル作成
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT DEFAULT 'employee' NOT NULL,
    department TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 初期管理者ユーザー作成（パスワード: admin123）
-- bcryptハッシュ値 $2a$10$N9qo8uLOickgx2ZMRZoMye によるハッシュ化済み
INSERT INTO users (username, password, display_name, role, department)
VALUES
    ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye8y6VANLbHXZfr3Lxzf0VpLZXQXXKr.6', '管理者', 'admin', 'システム管理')
ON CONFLICT (username) DO NOTHING;

-- テスト用ユーザー作成（パスワード: user123）
INSERT INTO users (username, password, display_name, role, department)
VALUES
    ('testuser', '$2a$10$N9qo8uLOickgx2ZMRZoMye8y6VANLbHXZfr3Lxzf0VpLZXQXXKr.6', 'テストユーザー', 'employee', 'テスト部門')
ON CONFLICT (username) DO NOTHING;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 確認用クエリ
SELECT 'ユーザーテーブル作成完了' AS status, COUNT(*) AS user_count FROM users;
