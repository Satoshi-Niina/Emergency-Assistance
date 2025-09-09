-- niinaユーザーの権限状況を確認するSQL
-- Azure Cloud ShellやpgAdminで実行して現在の状況を確認

-- 1. niinaユーザーの詳細情報確認
SELECT 
    id,
    username,
    role,
    display_name,
    department,
    created_at::timestamp(0) as created_at,
    updated_at::timestamp(0) as updated_at,
    CASE 
        WHEN role = 'system_admin' THEN '✅ システム管理者'
        WHEN role = 'operator' THEN '⚠️ 運用管理者'
        WHEN role = 'user' THEN '❌ 一般ユーザー'
        ELSE '❓ 不明な権限'
    END as permission_status
FROM users 
WHERE username = 'niina';

-- 2. 全システム管理者の一覧
SELECT 
    username, 
    role, 
    display_name, 
    department,
    created_at::timestamp(0) as created_at
FROM users 
WHERE role = 'system_admin' 
ORDER BY created_at;

-- 3. 権限レベル統計
SELECT 
    role,
    COUNT(*) as user_count,
    STRING_AGG(username, ', ') as usernames
FROM users 
GROUP BY role 
ORDER BY 
    CASE role 
        WHEN 'system_admin' THEN 1 
        WHEN 'operator' THEN 2 
        WHEN 'user' THEN 3 
        ELSE 4 
    END;

-- 4. niinaユーザーが存在しない場合の作成クエリ（必要時のみ実行）
/*
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
    role = 'system_admin',
    display_name = 'Niina Administrator',
    department = 'システム管理',
    updated_at = NOW();
*/

-- 5. niinaユーザーの権限を強制的にsystem_adminに設定（必要時のみ実行）
/*
UPDATE users 
SET 
    role = 'system_admin',
    display_name = 'Niina Administrator',
    department = 'システム管理',
    updated_at = NOW()
WHERE username = 'niina';
*/
