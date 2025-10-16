-- ユーザーテーブル作成マイグレーション
-- 作成日: 2025-01-20
-- 説明: 認証システム用のユーザーテーブルを作成し、テストユーザーを追加

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    department TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

-- テストユーザーの作成（パスワードは "password" をbcryptでハッシュ化）
-- bcrypt hash for "password" with salt rounds 10
INSERT INTO users (username, password, display_name, role, department, description) VALUES
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '管理者', 'admin', 'システム管理部', 'システム管理者'),
('user', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '一般ユーザー', 'employee', '保守部', '一般ユーザー'),
('test', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'テストユーザー', 'employee', 'テスト部', 'テスト用ユーザー')
ON CONFLICT (username) DO NOTHING;

-- コメント追加
COMMENT ON TABLE users IS '認証システム用のユーザーテーブル';
COMMENT ON COLUMN users.username IS 'ログイン用ユーザー名（一意）';
COMMENT ON COLUMN users.password IS 'bcryptでハッシュ化されたパスワード';
COMMENT ON COLUMN users.display_name IS '表示用ユーザー名';
COMMENT ON COLUMN users.role IS 'ユーザーロール: admin=管理者, employee=一般ユーザー';
COMMENT ON COLUMN users.department IS '所属部署';
COMMENT ON COLUMN users.description IS 'ユーザー説明';
