-- ユーザー権限とパスワードの最終修正
-- niinaユーザーの権限をadminに修正
UPDATE users SET role = 'admin' WHERE username = 'niina';

-- takabeni1ユーザーのパスワードを平文にリセット（開発環境用）
UPDATE users SET password = 'Takabeni&1' WHERE username = 'takabeni1';

-- 修正結果を確認
SELECT username, role, display_name, 
       CASE 
         WHEN password LIKE '$2b$%' THEN 'HASHED'
         ELSE 'PLAIN'
       END as password_type
FROM users 
WHERE username IN ('niina', 'takabeni1', 'takabeni2')
ORDER BY username;
