-- =====================================================
-- Emergency Assistance - 本番環境用管理者ユーザーシード
-- =====================================================
-- 実行方法:
-- psql $DATABASE_URL -f scripts/seed-admin-user.sql
-- =====================================================

-- UUID拡張機能を有効化（必要な場合のみ）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- usersテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT DEFAULT 'employee' NOT NULL,
    department TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 既存の admin ユーザーを削除（パスワード不一致を解消）
DELETE FROM users WHERE username = 'admin';

-- 管理者ユーザーを作成
-- ユーザー名: admin
-- パスワード: admin
-- bcrypt ハッシュ値（saltRounds=10）: $2a$10$N9qo8uLOickgx2ZMRZoMye6IjF4N/fU6.kcXLX3fLgO.F7o4g7X6m
INSERT INTO users (username, password, display_name, role, department, description)
VALUES (
    'admin',
    '$2a$10$N9qo8uLOickgx2ZMRZoMye6IjF4N/fU6.kcXLX3fLgO.F7o4g7X6m',
    '管理者',
    'admin',
    'システム管理',
    'デフォルト管理者アカウント'
)
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    description = EXCLUDED.description;

-- テスト用従業員ユーザーを作成（オプション）
-- ユーザー名: testuser
-- パスワード: testuser
INSERT INTO users (username, password, display_name, role, department, description)
VALUES (
    'testuser',
    '$2a$10$rN.EHQqYOYdw3B7E6R7tM.7XGQZvZKxLZKZ0Z5Yq9YJQZvZKxLZKZ',
    'テストユーザー',
    'employee',
    'テスト部門',
    'テスト用アカウント'
)
ON CONFLICT (username) DO NOTHING;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 確認
SELECT
    'シード完了' AS status,
    COUNT(*) AS total_users,
    COUNT(*) FILTER (WHERE role = 'admin') AS admin_count,
    COUNT(*) FILTER (WHERE role = 'employee') AS employee_count
FROM users;

-- 作成されたユーザー一覧表示
SELECT
    id,
    username,
    display_name,
    role,
    department,
    created_at
FROM users
ORDER BY created_at DESC;
