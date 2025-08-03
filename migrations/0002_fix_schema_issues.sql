-- PostgreSQL スキーマ修正マイグレーション
-- Emergency Assistance System - Schema Fix

-- 1. machines テーブルに machine_type_id カラムを追加
-- 既存の machines テーブルに machine_type_id カラムが存在しない場合のみ追加
DO $$
BEGIN
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
    END IF;
END $$;

-- 2. history_items テーブルを作成
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

-- 3. history_items テーブルの updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_history_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_history_items_updated_at 
    BEFORE UPDATE ON history_items 
    FOR EACH ROW EXECUTE FUNCTION update_history_items_updated_at();

-- 4. サンプルデータの挿入（開発用）
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

-- 5. ビューの作成（履歴サマリー用）
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

-- 6. コメントの追加
COMMENT ON TABLE history_items IS 'サポート履歴アイテムを格納するテーブル';
COMMENT ON COLUMN history_items.chat_id IS '関連するチャットID';
COMMENT ON COLUMN history_items.keywords IS 'キーワード配列';
COMMENT ON COLUMN history_items.metadata IS '追加のメタデータ（JSON形式）';

-- 7. 確認用クエリ
-- SELECT 'machines' as table_name, COUNT(*) as record_count FROM machines
-- UNION ALL
-- SELECT 'machine_types' as table_name, COUNT(*) as record_count FROM machine_types
-- UNION ALL
-- SELECT 'history_items' as table_name, COUNT(*) as record_count FROM history_items; 