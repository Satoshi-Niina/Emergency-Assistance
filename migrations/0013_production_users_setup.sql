-- 本番環境用ユーザーデータの初期化
-- Emergency Assistance System - Production Users Setup

-- 既存のユーザーを削除（本番環境用）
DELETE FROM users WHERE username IN ('admin', 'niina', 'takabeni1', 'takabeni2', 'employee');

-- 本番環境用ユーザーの追加（パスワードはハッシュ化済み）
INSERT INTO users (username, password, display_name, role, department, description) VALUES
    -- admin: システム管理者（平文パスワード: admin123）
    ('admin', '$2a$10$1GSKo8x2mcjLPem5h1mpwuqw5vOYC5cTDGcdwkOA1ljyUl3uxLAcK', 'システム管理者', 'admin', 'システム管理部', 'システム全体の管理権限を持つ管理者'),
    
    -- niina: 一般ユーザー（平文パスワード: 0077）
    ('niina', '$2a$10$KuqHhOqL6CpJKj3F7ZamQOT1MvvPcxolGwB6wkYPmDySMmC5GZaqS', '新納 智志', 'employee', 'システム管理部', '一般ユーザー'),
    
    -- takabeni1: 運用管理者（平文パスワード: Takabeni&1）
    ('takabeni1', '$2a$10$41dPYbNB7aPkaa4PFljG0uwNXlqfw8NThHPv85Fmag1TkSPlzRv1y', 'タカベニ1', 'admin', 'システム管理部', '運用管理者'),
    
    -- takabeni2: 一般ユーザー（平文パスワード: Takaben&2）
    ('takabeni2', '$2a$10$yavej7rTwXpB/WOKr3K3LOfXYXliZ5AL55yFEyJ9DNt4I3DvqkGdS', 'タカベニ2', 'employee', '保守部', '一般ユーザー'),
    
    -- employee: テスト用一般ユーザー（平文パスワード: employee123）
    ('employee', '$2a$10$zXKCVB5AooFs9e8bG1IVE.XP.oyLQhp3IK3n.2Cg2nKykjow7mNSq', 'テスト従業員', 'employee', '保守部', 'テスト用一般ユーザー')
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
WHERE username IN ('admin', 'niina', 'takabeni1', 'takabeni2', 'employee')
ORDER BY role, username;
