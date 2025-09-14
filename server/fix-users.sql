-- niinaユーザーの権限をadminに修正
UPDATE users SET role = 'admin' WHERE username = 'niina';

-- takabeni1ユーザーのパスワードを平文にリセット
UPDATE users SET password = 'Takabeni&1' WHERE username = 'takabeni1';

-- 修正後のユーザー一覧を確認
SELECT username, role, display_name FROM users ORDER BY username;
