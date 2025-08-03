-- PostgreSQL スキーマ最終修正マイグレーション
-- Emergency Assistance System - Final Schema Fix

-- UUID拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. machine_types テーブルの修正（カラム名を統一）
DO $$
BEGIN
    -- machine_types テーブルが存在しない場合は作成
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'machine_types') THEN
        CREATE TABLE machine_types (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            machine_type_name VARCHAR(255) NOT NULL UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- インデックス作成
        CREATE INDEX idx_machine_types_name ON machine_types(machine_type_name);
        
        -- サンプルデータ挿入
        INSERT INTO machine_types (machine_type_name) VALUES
            ('軌道モータカー'),
            ('鉄製トロ（10t）'),
            ('鉄製トロ（25t）'),
            ('箱トロ'),
            ('ミニホッパー車')
        ON CONFLICT (machine_type_name) DO NOTHING;
        
        RAISE NOTICE 'machine_types テーブルを作成しました';
    ELSE
        -- 既存テーブルのカラム名を確認・修正
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'machine_types' 
            AND column_name = 'type_name'
        ) THEN
            -- type_name を machine_type_name に変更
            ALTER TABLE machine_types RENAME COLUMN type_name TO machine_type_name;
            RAISE NOTICE 'machine_types.type_name を machine_type_name に変更しました';
        END IF;
    END IF;
END $$;

-- 2. machines テーブルの修正
DO $$
BEGIN
    -- machines テーブルが存在しない場合は作成
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'machines') THEN
        CREATE TABLE machines (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            machine_number VARCHAR(255) NOT NULL,
            machine_type_id UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (machine_type_id) REFERENCES machine_types(id) ON DELETE CASCADE
        );
        
        -- インデックス作成
        CREATE INDEX idx_machines_machine_type_id ON machines(machine_type_id);
        CREATE INDEX idx_machines_machine_number ON machines(machine_number);
        
        RAISE NOTICE 'machines テーブルを作成しました';
    ELSE
        -- machine_type_id カラムが存在しない場合は追加
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'machines' 
            AND column_name = 'machine_type_id'
        ) THEN
            ALTER TABLE machines ADD COLUMN machine_type_id UUID;
            
            -- 既存データがある場合の対応（machine_types テーブルから最初のIDを取得）
            UPDATE machines 
            SET machine_type_id = (SELECT id FROM machine_types LIMIT 1)
            WHERE machine_type_id IS NULL;
            
            -- NOT NULL制約を追加
            ALTER TABLE machines ALTER COLUMN machine_type_id SET NOT NULL;
            
            -- 外部キー制約を追加
            ALTER TABLE machines 
            ADD CONSTRAINT fk_machines_machine_type_id 
            FOREIGN KEY (machine_type_id) REFERENCES machine_types(id) ON DELETE CASCADE;
            
            -- インデックスを作成
            CREATE INDEX IF NOT EXISTS idx_machines_machine_type_id ON machines(machine_type_id);
            
            RAISE NOTICE 'machines テーブルに machine_type_id カラムを追加しました';
        END IF;
    END IF;
END $$;

-- 3. history_items テーブルの作成
CREATE TABLE IF NOT EXISTS history_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    machine_model TEXT,
    office TEXT,
    category TEXT,
    emergency_guide_title TEXT,
    emergency_guide_content TEXT,
    keywords TEXT[],
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- history_items テーブルのインデックスを作成
CREATE INDEX IF NOT EXISTS idx_history_items_chat_id ON history_items(chat_id);
CREATE INDEX IF NOT EXISTS idx_history_items_created_at ON history_items(created_at);
CREATE INDEX IF NOT EXISTS idx_history_items_category ON history_items(category);
CREATE INDEX IF NOT EXISTS idx_history_items_keywords ON history_items USING GIN(keywords);

-- 4. updated_at自動更新のためのトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. トリガーの作成
CREATE TRIGGER update_machine_types_updated_at 
    BEFORE UPDATE ON machine_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machines_updated_at 
    BEFORE UPDATE ON machines 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_history_items_updated_at 
    BEFORE UPDATE ON history_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. サンプルデータの挿入（既存データがない場合のみ）
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

-- 7. history_items のサンプルデータ挿入
INSERT INTO history_items (chat_id, title, description, machine_model, office, category, keywords) VALUES
(
    uuid_generate_v4(),
    '軌道モータカーの故障対応',
    '軌道モータカーのエンジン不調について対応しました。',
    '軌道モータカー',
    '東京支社',
    '故障対応',
    ARRAY['軌道モータカー', 'エンジン', '故障']
),
(
    uuid_generate_v4(),
    '鉄製トロ（10t）の定期点検',
    '鉄製トロ（10t）の定期点検を実施しました。',
    '鉄製トロ（10t）',
    '大阪支社',
    '定期点検',
    ARRAY['鉄製トロ', '定期点検', '10t']
)
ON CONFLICT DO NOTHING;

-- 8. ビューの作成（履歴サマリー用）
CREATE OR REPLACE VIEW history_summary AS
SELECT 
    id,
    title,
    description,
    machine_model,
    office,
    category,
    created_at,
    updated_at,
    array_length(keywords, 1) as keyword_count
FROM history_items
ORDER BY created_at DESC;

-- 9. コメントの追加
COMMENT ON TABLE machine_types IS '機種マスターテーブル';
COMMENT ON TABLE machines IS '機械マスターテーブル';
COMMENT ON TABLE history_items IS 'サポート履歴アイテムを格納するテーブル';
COMMENT ON COLUMN history_items.chat_id IS '関連するチャットID';
COMMENT ON COLUMN history_items.keywords IS 'キーワード配列';
COMMENT ON COLUMN history_items.metadata IS '追加のメタデータ（JSON形式）';

-- 10. 確認用クエリ
-- SELECT 'machine_types' as table_name, COUNT(*) as record_count FROM machine_types
-- UNION ALL
-- SELECT 'machines' as table_name, COUNT(*) as record_count FROM machines
-- UNION ALL
-- SELECT 'history_items' as table_name, COUNT(*) as record_count FROM history_items; 