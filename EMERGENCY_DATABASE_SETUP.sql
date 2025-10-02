-- 緊急修正: データベーステーブル手動作成
-- Emergency Database Setup - Manual Execution Required

-- ============================================
-- 1. 基本テーブル作成（緊急版）
-- ============================================

-- users テーブル
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'employee',
    department TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- machine_types テーブル（機種管理）
CREATE TABLE IF NOT EXISTS machine_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_type_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- machines テーブル（機械管理）
CREATE TABLE IF NOT EXISTS machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_number TEXT NOT NULL UNIQUE,
    machine_type_id UUID REFERENCES machine_types(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- schema_migrations テーブル
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. インデックス作成
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_machines_machine_type_id ON machines(machine_type_id);
CREATE INDEX IF NOT EXISTS idx_machine_types_name ON machine_types(machine_type_name);

-- ============================================
-- 3. サンプルデータ挿入
-- ============================================

-- 機種データ
INSERT INTO machine_types (machine_type_name, description) VALUES
    ('軌道モータカー', '軌道走行用モータカー'),
    ('鉄製トロ（10t）', '10トン積載の鉄製トロ'),
    ('クレーン', '建設用クレーン'),
    ('ブルドーザー', '土木作業用ブルドーザー'),
    ('ショベルカー', '掘削用ショベルカー')
ON CONFLICT (machine_type_name) DO NOTHING;

-- 機械データ
INSERT INTO machines (machine_number, machine_type_id, description) VALUES
    ('MC-001', (SELECT id FROM machine_types WHERE machine_type_name = '軌道モータカー' LIMIT 1), '軌道モータカー 1号機'),
    ('MC-002', (SELECT id FROM machine_types WHERE machine_type_name = '軌道モータカー' LIMIT 1), '軌道モータカー 2号機'),
    ('TR-001', (SELECT id FROM machine_types WHERE machine_type_name = '鉄製トロ（10t）' LIMIT 1), '鉄製トロ 1号機'),
    ('TR-002', (SELECT id FROM machine_types WHERE machine_type_name = '鉄製トロ（10t）' LIMIT 1), '鉄製トロ 2号機'),
    ('CR-001', (SELECT id FROM machine_types WHERE machine_type_name = 'クレーン' LIMIT 1), 'クレーン 1号機'),
    ('BD-001', (SELECT id FROM machine_types WHERE machine_type_name = 'ブルドーザー' LIMIT 1), 'ブルドーザー 1号機'),
    ('SH-001', (SELECT id FROM machine_types WHERE machine_type_name = 'ショベルカー' LIMIT 1), 'ショベルカー 1号機')
ON CONFLICT (machine_number) DO NOTHING;

-- ユーザーデータ（パスワードはハッシュ化済み）
INSERT INTO users (username, password, display_name, role, department, description) VALUES
    -- admin: システム管理者（平文パスワード: admin123）
    ('admin', '$2a$10$1GSKo8x2mcjLPem5h1mpwuqw5vOYC5cTDGcdwkOA1ljyUl3uxLAcK', 'システム管理者', 'admin', 'システム管理部', 'システム全体の管理権限を持つ管理者'),
    
    -- niina: 管理者（平文パスワード: G&896845）
    ('niina', '$2a$10$KuqHhOqL6CpJKj3F7ZamQOT1MvvPcxolGwB6wkYPmDySMmC5GZaqS', '新納 智志', 'admin', 'システム管理部', 'システム管理者'),
    
    -- takabeni1: 運用管理者（平文パスワード: Takabeni&1）
    ('takabeni1', '$2a$10$41dPYbNB7aPkaa4PFljG0uwNXlqfw8NThHPv85Fmag1TkSPlzRv1y', 'タカベニ1', 'admin', 'システム管理部', '運用管理者'),
    
    -- takabeni2: 一般ユーザー（平文パスワード: Takaben&2）
    ('takabeni2', '$2a$10$KuqHhOqL6CpJKj3F7ZamQOT1MvvPcxolGwB6wkYPmDySMmC5GZaqS', 'タカベニ2', 'employee', 'システム管理部', '一般ユーザー'),
    
    -- employee: 一般ユーザー（平文パスワード: employee123）
    ('employee', '$2a$10$KuqHhOqL6CpJKj3F7ZamQOT1MvvPcxolGwB6wkYPmDySMmC5GZaqS', '一般ユーザー', 'employee', 'システム管理部', '一般ユーザー')
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    display_name = EXCLUDED.display_name,
    department = EXCLUDED.department,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 4. マイグレーション履歴記録
-- ============================================

INSERT INTO schema_migrations (filename) VALUES
    ('0001_complete_database_setup.sql')
ON CONFLICT (filename) DO NOTHING;

-- ============================================
-- 5. 確認クエリ
-- ============================================

SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'machine_types' as table_name, COUNT(*) as record_count FROM machine_types
UNION ALL
SELECT 'machines' as table_name, COUNT(*) as record_count FROM machines
UNION ALL
SELECT 'schema_migrations' as table_name, COUNT(*) as record_count FROM schema_migrations;

-- ユーザー確認
SELECT username, role, display_name, department FROM users ORDER BY role, username;
