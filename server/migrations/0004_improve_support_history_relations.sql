-- PostgreSQL 繧ｹ繧ｭ繝ｼ繝樊隼蝟・・繧､繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ
-- Emergency Assistance System - Support History Relations Improvement

-- UUID諡｡蠑ｵ讖溯・繧呈怏蜉ｹ蛹・
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. support_history繝・・繝悶Ν縺ｮ謾ｹ蝟・
DO $$
BEGIN
    -- 譌｢蟄倥・繝・・繧ｿ繧偵ヰ繝・け繧｢繝・・
    CREATE TABLE IF NOT EXISTS support_history_backup AS 
    SELECT * FROM support_history;
    
    -- 譁ｰ縺励＞繧ｫ繝ｩ繝繧定ｿｽ蜉
    ALTER TABLE support_history 
    ADD COLUMN IF NOT EXISTS machine_type_id text,
    ADD COLUMN IF NOT EXISTS machine_id text;
    
    -- 譌｢蟄倥ョ繝ｼ繧ｿ縺ｮ遘ｻ陦鯉ｼ域ｩ溽ｨｮ蜷阪°繧画ｩ溽ｨｮID繧貞叙蠕暦ｼ・
    UPDATE support_history 
    SET machine_type_id = (
        SELECT mt.id 
        FROM machine_types mt 
        WHERE mt.machine_type_name = support_history.machine_type
        LIMIT 1
    )
    WHERE machine_type_id IS NULL;
    
    -- 譌｢蟄倥ョ繝ｼ繧ｿ縺ｮ遘ｻ陦鯉ｼ域ｩ滓｢ｰ逡ｪ蜿ｷ縺九ｉ讖滓｢ｰID繧貞叙蠕暦ｼ・
    UPDATE support_history 
    SET machine_id = (
        SELECT m.id 
        FROM machines m 
        WHERE m.machine_number = support_history.machine_number
        LIMIT 1
    )
    WHERE machine_id IS NULL;
    
    -- 螟夜Κ繧ｭ繝ｼ蛻ｶ邏・ｒ霑ｽ蜉
    ALTER TABLE support_history 
    ADD CONSTRAINT IF NOT EXISTS support_history_machine_type_id_fk 
    FOREIGN KEY (machine_type_id) REFERENCES machine_types(id) ON DELETE SET NULL;
    
    ALTER TABLE support_history 
    ADD CONSTRAINT IF NOT EXISTS support_history_machine_id_fk 
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL;
    
    -- 繧､繝ｳ繝・ャ繧ｯ繧ｹ繧剃ｽ懈・
    CREATE INDEX IF NOT EXISTS idx_support_history_machine_type_id 
    ON support_history(machine_type_id);
    
    CREATE INDEX IF NOT EXISTS idx_support_history_machine_id 
    ON support_history(machine_id);
    
    CREATE INDEX IF NOT EXISTS idx_support_history_created_at 
    ON support_history(created_at DESC);
    
    -- 驛ｨ蛻・ｸ閾ｴ讀懃ｴ｢逕ｨ縺ｮ繧､繝ｳ繝・ャ繧ｯ繧ｹ
    CREATE INDEX IF NOT EXISTS idx_support_history_machine_type_gin 
    ON support_history USING gin(machine_type gin_trgm_ops);
    
    CREATE INDEX IF NOT EXISTS idx_support_history_machine_number_gin 
    ON support_history USING gin(machine_number gin_trgm_ops);
    
    RAISE NOTICE 'support_history繝・・繝悶Ν縺ｮ謾ｹ蝟・′螳御ｺ・＠縺ｾ縺励◆';
END $$;

-- 2. pg_trgm諡｡蠑ｵ讖溯・繧呈怏蜉ｹ蛹厄ｼ磯Κ蛻・ｸ閾ｴ讀懃ｴ｢逕ｨ・・
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 3. 繧ｵ繝ｳ繝励Ν繝・・繧ｿ縺ｮ遒ｺ隱阪→霑ｽ蜉
DO $$
BEGIN
    -- 讖溽ｨｮ繝・・繧ｿ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・霑ｽ蜉
    INSERT INTO machine_types (machine_type_name) VALUES
        ('霆碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ'),
        ('驩・｣ｽ繝医Ο・・0t・・),
        ('驩・｣ｽ繝医Ο・・5t・・),
        ('邂ｱ繝医Ο'),
        ('繝溘ル繝帙ャ繝代・霆・)
    ON CONFLICT (machine_type_name) DO NOTHING;
    
    -- 讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・霑ｽ蜉・医し繝ｳ繝励Ν・・
    INSERT INTO machines (machine_number, machine_type_id) 
    SELECT 
        'MC-' || LPAD(ROW_NUMBER() OVER ()::text, 3, '0'),
        mt.id
    FROM machine_types mt
    WHERE mt.machine_type_name = '霆碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ'
    LIMIT 5
    ON CONFLICT DO NOTHING;
    
    INSERT INTO machines (machine_number, machine_type_id) 
    SELECT 
        'TT10-' || LPAD(ROW_NUMBER() OVER ()::text, 3, '0'),
        mt.id
    FROM machine_types mt
    WHERE mt.machine_type_name = '驩・｣ｽ繝医Ο・・0t・・
    LIMIT 3
    ON CONFLICT DO NOTHING;
    
    INSERT INTO machines (machine_number, machine_type_id) 
    SELECT 
        'TT25-' || LPAD(ROW_NUMBER() OVER ()::text, 3, '0'),
        mt.id
    FROM machine_types mt
    WHERE mt.machine_type_name = '驩・｣ｽ繝医Ο・・5t・・
    LIMIT 3
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '繧ｵ繝ｳ繝励Ν繝・・繧ｿ縺ｮ遒ｺ隱阪・霑ｽ蜉縺悟ｮ御ｺ・＠縺ｾ縺励◆';
END $$; 