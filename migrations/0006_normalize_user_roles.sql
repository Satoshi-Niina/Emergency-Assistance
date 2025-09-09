-- ユーザーロールの正規化と権限システム統一
-- 既存の 'admin' -> 'system_admin', 'employee' -> 'user' に変更

UPDATE users 
SET role = 'system_admin' 
WHERE role = 'admin';

UPDATE users 
SET role = 'user' 
WHERE role = 'employee';

-- 既存ユーザーの確認とロール統計
SELECT 
    role,
    COUNT(*) as count,
    STRING_AGG(username, ', ') as usernames
FROM users 
GROUP BY role
ORDER BY role;

-- niinaユーザーの確認
SELECT 
    username,
    role,
    "displayName" as display_name,
    created_at
FROM users 
WHERE username = 'niina';
