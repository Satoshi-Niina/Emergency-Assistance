-- ユーザー追加マイグレーション
-- Emergency Assistance System - Add Niina and Takabeni Users

-- 既存のユーザーを削除（テスト用）
DELETE FROM users WHERE username IN ('admin', 'employee1');

-- 新規ユーザーの追加
-- 注意: パスワードは管理者が個別に設定してください
-- セキュリティ上、パスワードはハードコーディングしません
INSERT INTO users (username, password, display_name, role, department, description) VALUES
    -- 運用管理者（パスワードは管理者が設定）
    ('niina', 'TEMP_PASSWORD_CHANGE_ME', '新納 智志', 'admin', 'システム管理部', 'システム管理者'),
    ('takabeni1', 'TEMP_PASSWORD_CHANGE_ME', 'タカベニ1', 'admin', 'システム管理部', '運用管理者'),
    
    -- 一般ユーザー（パスワードは管理者が設定）
    ('takabeni2', 'TEMP_PASSWORD_CHANGE_ME', 'タカベニ2', 'employee', '保守部', '一般ユーザー')
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    description = EXCLUDED.description;

-- コメントの追加
COMMENT ON TABLE users IS 'ユーザー管理テーブル - 新納・タカベニユーザー追加済み';

-- 追加されたユーザーの確認
SELECT 
    username,
    display_name,
    role,
    department,
    description,
    created_at
FROM users 
WHERE username IN ('niina', 'takabeni1', 'takabeni2')
ORDER BY role, username;
