-- niinaユーザーの権限を修正
-- 運用管理者権限に変更

-- niinaユーザーの権限を更新
UPDATE users 
SET role = 'admin', 
    department = 'システム管理部',
    description = '運用管理者'
WHERE username = 'niina';

-- 更新結果を確認
SELECT 
    username,
    display_name,
    role,
    department,
    description,
    created_at
FROM users 
WHERE username = 'niina';
