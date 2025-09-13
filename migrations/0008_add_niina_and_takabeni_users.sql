-- ユーザー追加マイグレーション
-- Emergency Assistance System - Add Niina and Takabeni Users

-- 既存のユーザーを削除（テスト用）
DELETE FROM users WHERE username IN ('admin', 'employee1');

-- 新規ユーザーの追加
-- パスワード: G&896845 (niina), Takabeni&1 (takabeni1), Takaben&2 (takabeni2)
-- 注意: パスワードは平文で保存（本番環境ではハッシュ化が必要）
INSERT INTO users (username, password, display_name, role, department, description) VALUES
    -- 運用管理者
    ('niina', 'G&896845', '新納 智志', 'admin', 'システム管理部', 'システム管理者'),
    ('takabeni1', 'Takabeni&1', 'タカベニ1', 'admin', 'システム管理部', '運用管理者'),
    
    -- 一般ユーザー
    ('takabeni2', 'Takaben&2', 'タカベニ2', 'employee', '保守部', '一般ユーザー')
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
