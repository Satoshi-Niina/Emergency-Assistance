-- マイグレーション: Niinaシステム管理者ユーザーの作成/更新
-- 実行日: 2025年9月9日
-- 目的: niina ユーザーにシステム管理者権限を付与

-- ユーザーの作成または更新（UPSERT）
INSERT INTO users (
    id,
    username,
    password,
    role,
    display_name,
    department,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'niina',
    '$2b$10$JkW0ciQRzRVsha5SiU5rz.bsEhffHP2AShZQjrnfMgxCTf5ZM70KS',
    'system_admin',
    'Niina Administrator',
    'システム管理',
    NOW(),
    NOW()
) 
ON CONFLICT (username) 
DO UPDATE SET
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    display_name = EXCLUDED.display_name,
    department = EXCLUDED.department,
    updated_at = EXCLUDED.updated_at;

-- 結果の確認
SELECT 
    username, 
    role, 
    display_name, 
    department, 
    created_at::timestamp(0) as created_at,
    updated_at::timestamp(0) as updated_at
FROM users 
WHERE username = 'niina';
