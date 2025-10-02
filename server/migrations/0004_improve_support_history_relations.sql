-- PostgreSQL スキーマ改善マイグレーション
-- Emergency Assistance System - Support History Relations Improvement

-- UUID拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. support_historyテーブルの改善
DO $$
BEGIN
    -- 既存のデータをバックアップ
    CREATE TABLE IF NOT EXISTS support_history_backup AS 
    SELECT * FROM support_history;
    
    -- 新しいカラムを追加
    ALTER TABLE support_history 
    ADD COLUMN IF NOT EXISTS machine_type_id text,
    ADD COLUMN IF NOT EXISTS machine_id text;
    
    -- 既存データの移行（機種名から機種IDを取得）
    UPDATE support_history 
    SET machine_type_id = (
        SELECT mt.id 
        FROM machine_types mt 
        WHERE mt.machine_type_name = support_history.machine_type
        LIMIT 1
    )
    WHERE machine_type_id IS NULL;
    
    -- 既存データの移行（機械番号から機械IDを取得）
    UPDATE support_history 
    SET machine_id = (
        SELECT m.id 
        FROM machines m 
        WHERE m.machine_number = support_history.machine_number
        LIMIT 1
    )
    WHERE machine_id IS NULL;
    
    -- 外部キー制約を追加
    ALTER TABLE support_history 
    ADD CONSTRAINT IF NOT EXISTS support_history_machine_type_id_fk 
    FOREIGN KEY (machine_type_id) REFERENCES machine_types(id) ON DELETE SET NULL;
    
    ALTER TABLE support_history 
    ADD CONSTRAINT IF NOT EXISTS support_history_machine_id_fk 
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL;
    
    -- インデックスを作成
    CREATE INDEX IF NOT EXISTS idx_support_history_machine_type_id 
    ON support_history(machine_type_id);
    
    CREATE INDEX IF NOT EXISTS idx_support_history_machine_id 
    ON support_history(machine_id);
    
    CREATE INDEX IF NOT EXISTS idx_support_history_created_at 
    ON support_history(created_at DESC);
    
    -- 部分一致検索用のインデックス
    CREATE INDEX IF NOT EXISTS idx_support_history_machine_type_gin 
    ON support_history USING gin(machine_type gin_trgm_ops);
    
    CREATE INDEX IF NOT EXISTS idx_support_history_machine_number_gin 
    ON support_history USING gin(machine_number gin_trgm_ops);
    
    RAISE NOTICE 'support_historyテーブルの改善が完了しました';
END $$;

-- 2. pg_trgm拡張機能を有効化（部分一致検索用）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 3. サンプルデータの確認と追加
DO $$
BEGIN
    -- 機種データが存在しない場合は追加
    INSERT INTO machine_types (machine_type_name) VALUES
        ('軌道モータカー'),
        ('鉄製トロ（10t）'),
        ('鉄製トロ（25t）'),
        ('箱トロ'),
        ('ミニホッパー車')
    ON CONFLICT (machine_type_name) DO NOTHING;
    
    -- 機械番号データが存在しない場合は追加（サンプル）
    INSERT INTO machines (machine_number, machine_type_id) 
    SELECT 
        'MC-' || LPAD(ROW_NUMBER() OVER ()::text, 3, '0'),
        mt.id
    FROM machine_types mt
    WHERE mt.machine_type_name = '軌道モータカー'
    LIMIT 5
    ON CONFLICT (machine_number) DO NOTHING;
    
    INSERT INTO machines (machine_number, machine_type_id) 
    SELECT 
        'TT10-' || LPAD(ROW_NUMBER() OVER ()::text, 3, '0'),
        mt.id
    FROM machine_types mt
    WHERE mt.machine_type_name = '鉄製トロ（10t）'
    LIMIT 3
    ON CONFLICT (machine_number) DO NOTHING;
    
    INSERT INTO machines (machine_number, machine_type_id) 
    SELECT 
        'TT25-' || LPAD(ROW_NUMBER() OVER ()::text, 3, '0'),
        mt.id
    FROM machine_types mt
    WHERE mt.machine_type_name = '鉄製トロ（25t）'
    LIMIT 3
    ON CONFLICT (machine_number) DO NOTHING;
    
    RAISE NOTICE 'サンプルデータの確認・追加が完了しました';
END $$; 