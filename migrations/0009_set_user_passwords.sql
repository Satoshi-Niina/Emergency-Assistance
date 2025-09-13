-- ユーザーパスワードの設定
-- 平文パスワードで設定（テスト用）

-- 既存のユーザーを削除
DELETE FROM users WHERE username IN ('niina', 'takabeni1', 'takabeni2');

-- 新しいユーザーを追加（平文パスワード）
INSERT INTO users (username, password, display_name, role, department, description) VALUES
    ('niina', 'G&896845', '新納 智志', 'admin', 'システム管理部', 'システム管理者'),
    ('takabeni1', 'Takabeni&1', 'タカベニ1', 'admin', 'システム管理部', '運用管理者'),
    ('takabeni2', 'Takaben&2', 'タカベニ2', 'employee', '保守部', '一般ユーザー')
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    description = EXCLUDED.description;
