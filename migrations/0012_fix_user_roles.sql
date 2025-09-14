-- ユーザー権限の明確な分離
-- Emergency Assistance System - Fix User Roles

-- 既存のユーザーを削除
DELETE FROM users WHERE username IN ('niina', 'takabeni1', 'takabeni2');

-- 新しいユーザーを追加（権限を明確に分離）
INSERT INTO users (username, password, display_name, role, department, description) VALUES
    -- niina: 一般ユーザー（すべての機能が使える）
    ('niina', 'G&896845', '新納 智志', 'employee', 'システム管理部', '一般ユーザー'),
    
    -- takabeni1: 運用管理者（すべての機能が使える）
    ('takabeni1', 'Takabeni&1', 'タカベニ1', 'admin', 'システム管理部', '運用管理者'),
    
    -- takabeni2: 一般ユーザー（すべての機能が使える）
    ('takabeni2', 'Takaben&2', 'タカベニ2', 'employee', '保守部', '一般ユーザー')
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    description = EXCLUDED.description;

-- 更新結果を確認
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
