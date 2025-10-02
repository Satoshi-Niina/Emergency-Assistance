-- 緊急修正: データベーステーブル作成
-- Emergency Assistance System - Database Tables Creation

-- 1. machine_types テーブルを作成
CREATE TABLE IF NOT EXISTS machine_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_type_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. machines テーブルを作成
CREATE TABLE IF NOT EXISTS machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_number TEXT NOT NULL UNIQUE,
    machine_type_id UUID REFERENCES machine_types(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_machines_machine_type_id ON machines(machine_type_id);
CREATE INDEX IF NOT EXISTS idx_machine_types_name ON machine_types(machine_type_name);

-- 4. サンプルデータを挿入
INSERT INTO machine_types (machine_type_name, description) VALUES
    ('軌道モータカー', '軌道走行用モータカー'),
    ('鉄製トロ（10t）', '10トン積載の鉄製トロ'),
    ('クレーン', '建設用クレーン'),
    ('ブルドーザー', '土木作業用ブルドーザー'),
    ('ショベルカー', '掘削用ショベルカー')
ON CONFLICT (machine_type_name) DO NOTHING;

INSERT INTO machines (machine_number, machine_type_id, description) VALUES
    ('MC-001', (SELECT id FROM machine_types WHERE machine_type_name = '軌道モータカー' LIMIT 1), '軌道モータカー 1号機'),
    ('MC-002', (SELECT id FROM machine_types WHERE machine_type_name = '軌道モータカー' LIMIT 1), '軌道モータカー 2号機'),
    ('TR-001', (SELECT id FROM machine_types WHERE machine_type_name = '鉄製トロ（10t）' LIMIT 1), '鉄製トロ 1号機'),
    ('TR-002', (SELECT id FROM machine_types WHERE machine_type_name = '鉄製トロ（10t）' LIMIT 1), '鉄製トロ 2号機'),
    ('CR-001', (SELECT id FROM machine_types WHERE machine_type_name = 'クレーン' LIMIT 1), 'クレーン 1号機'),
    ('BD-001', (SELECT id FROM machine_types WHERE machine_type_name = 'ブルドーザー' LIMIT 1), 'ブルドーザー 1号機'),
    ('SH-001', (SELECT id FROM machine_types WHERE machine_type_name = 'ショベルカー' LIMIT 1), 'ショベルカー 1号機')
ON CONFLICT (machine_number) DO NOTHING;

-- 5. 確認用クエリ
SELECT 'machine_types' as table_name, COUNT(*) as record_count FROM machine_types
UNION ALL
SELECT 'machines' as table_name, COUNT(*) as record_count FROM machines;
