-- 緊急修正: niinaユーザーを管理者に変更
-- Emergency Assistance System - User Role Fix

-- niinaユーザーのパスワードとロールを更新
UPDATE users 
SET 
    password = '$2a$10$KuqHhOqL6CpJKj3F7ZamQOT1MvvPcxolGwB6wkYPmDySMmC5GZaqS',  -- G&896845
    role = 'admin',
    display_name = '新納 智志',
    department = 'システム管理部',
    description = 'システム管理者'
WHERE username = 'niina';

-- 確認
SELECT username, role, display_name, department FROM users WHERE username = 'niina';
