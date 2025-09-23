-- 機種と機械番号のマスターテーブル作成
-- PostgreSQL データベーススキーマ

-- UUID拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 機種マスターテーブル
CREATE TABLE IF NOT EXISTS machine_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_type_name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 機械マスターテーブル
CREATE TABLE IF NOT EXISTS machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_number VARCHAR(255) NOT NULL,
    machine_type_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (machine_type_id) REFERENCES machine_types(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_machines_machine_type_id ON machines(machine_type_id);
CREATE INDEX IF NOT EXISTS idx_machine_types_name ON machine_types(machine_type_name);

-- updated_at自動更新のためのトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー作成
CREATE TRIGGER update_machine_types_updated_at BEFORE UPDATE ON machine_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON machines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- サンプルデータ挿入
INSERT INTO machine_types (machine_type_name) VALUES
    ('軌道モータカー'),
    ('鉄製トロ（10t）'),
    ('鉄製トロ（25t）'),
    ('箱トロ'),
    ('ミニホッパー車')
ON CONFLICT (machine_type_name) DO NOTHING;

-- 機械番号のサンプルデータ挿入
INSERT INTO machines (machine_number, machine_type_id) 
SELECT 
    CASE 
        WHEN mt.machine_type_name = '軌道モータカー' THEN 'TRACK-' || LPAD(ROW_NUMBER() OVER (PARTITION BY mt.id ORDER BY mt.id)::TEXT, 3, '0')
        WHEN mt.machine_type_name = '鉄製トロ（10t）' THEN 'TROLLEY10-' || LPAD(ROW_NUMBER() OVER (PARTITION BY mt.id ORDER BY mt.id)::TEXT, 3, '0')
        WHEN mt.machine_type_name = '鉄製トロ（25t）' THEN 'TROLLEY25-' || LPAD(ROW_NUMBER() OVER (PARTITION BY mt.id ORDER BY mt.id)::TEXT, 3, '0')
        WHEN mt.machine_type_name = '箱トロ' THEN 'BOX-' || LPAD(ROW_NUMBER() OVER (PARTITION BY mt.id ORDER BY mt.id)::TEXT, 3, '0')
        WHEN mt.machine_type_name = 'ミニホッパー車' THEN 'HOPPER-' || LPAD(ROW_NUMBER() OVER (PARTITION BY mt.id ORDER BY mt.id)::TEXT, 3, '0')
    END,
    mt.id
FROM machine_types mt
CROSS JOIN generate_series(1, 5) AS seq
ON CONFLICT DO NOTHING;

-- 確認用クエリ
-- SELECT mt.machine_type_name, m.machine_number 
-- FROM machine_types mt 
-- LEFT JOIN machines m ON mt.id = m.machine_type_id 
-- ORDER BY mt.machine_type_name, m.machine_number; 