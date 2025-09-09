-- Azure PostgreSQL で niina ユーザーにシステム管理者権限を付与するSQL
-- 本番環境のpsqlまたはAzure Data Studioで実行

-- 1. 既存のniinaユーザーを確認
SELECT id, username, role, display_name, department, created_at, updated_at 
FROM users 
WHERE username = 'niina';

-- 2a. ユーザーが存在する場合の更新クエリ
UPDATE users 
SET 
    password = '$2b$10$JkW0ciQRzRVsha5SiU5rz.bsEhffHP2AShZQjrnfMgxCTf5ZM70KS',
    role = 'system_admin',
    display_name = 'Niina Administrator',
    department = 'システム管理',
    updated_at = NOW()
WHERE username = 'niina';

-- 2b. ユーザーが存在しない場合の作成クエリ
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
) ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    display_name = EXCLUDED.display_name,
    department = EXCLUDED.department,
    updated_at = EXCLUDED.updated_at;

-- 3. 結果確認
SELECT id, username, role, display_name, department, created_at, updated_at 
FROM users 
WHERE username = 'niina';

-- 4. 全システム管理者の確認
SELECT username, role, display_name, department 
FROM users 
WHERE role = 'system_admin' 
ORDER BY created_at;
