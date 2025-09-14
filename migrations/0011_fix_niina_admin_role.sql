-- niinaユーザーを管理者権限に修正
-- Emergency Assistance System - Fix Niina User Role

-- niinaユーザーが存在するかチェック
DO $$
BEGIN
    -- niinaユーザーが存在しない場合は新規作成
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'niina') THEN
        INSERT INTO users (username, password, display_name, role, department, description) 
        VALUES ('niina', 'G&896845', '新納 智志', 'admin', 'システム管理部', '運用管理者');
        RAISE NOTICE 'niinaユーザーを新規作成しました';
    ELSE
        -- niinaユーザーが存在する場合は権限を更新
        UPDATE users 
        SET role = 'admin', 
            department = 'システム管理部',
            description = '運用管理者'
        WHERE username = 'niina';
        RAISE NOTICE 'niinaユーザーの権限を更新しました';
    END IF;
END $$;

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
