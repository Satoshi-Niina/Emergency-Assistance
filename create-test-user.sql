-- テスト用ユーザーを作成（既存データを壊さない）
-- パスワード: test123

INSERT INTO users (id, username, password_hash, display_name, role, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'testuser',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- パスワード: test123
    'テストユーザー',
    'admin',
    NOW(),
    NOW()
)
ON CONFLICT (username) DO NOTHING;

-- 確認用クエリ
SELECT username, display_name, role FROM users WHERE username = 'testuser';
