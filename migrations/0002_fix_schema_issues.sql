-- PostgreSQL 繧ｹ繧ｭ繝ｼ繝樔ｿｮ豁｣繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ
-- Emergency Assistance System - Schema Fix

-- 1. machines 繝・・繝悶Ν縺ｫ machine_type_id 繧ｫ繝ｩ繝繧定ｿｽ蜉
-- 譌｢蟄倥・ machines 繝・・繝悶Ν縺ｫ machine_type_id 繧ｫ繝ｩ繝縺悟ｭ伜惠縺励↑縺・ｴ蜷医・縺ｿ霑ｽ蜉
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'machines' 
        AND column_name = 'machine_type_id'
    ) THEN
        ALTER TABLE machines ADD COLUMN machine_type_id UUID;
        
        -- 譌｢蟄倥ョ繝ｼ繧ｿ縺後≠繧句ｴ蜷医・蟇ｾ蠢懶ｼ・achine_types 繝・・繝悶Ν縺九ｉ譛蛻昴・ID繧貞叙蠕暦ｼ・
        UPDATE machines 
        SET machine_type_id = (SELECT id FROM machine_types LIMIT 1)
        WHERE machine_type_id IS NULL;
        
        -- NOT NULL蛻ｶ邏・ｒ霑ｽ蜉
        ALTER TABLE machines ALTER COLUMN machine_type_id SET NOT NULL;
        
        -- 螟夜Κ繧ｭ繝ｼ蛻ｶ邏・ｒ霑ｽ蜉
        ALTER TABLE machines 
        ADD CONSTRAINT fk_machines_machine_type_id 
        FOREIGN KEY (machine_type_id) REFERENCES machine_types(id) ON DELETE CASCADE;
        
        -- 繧､繝ｳ繝・ャ繧ｯ繧ｹ繧剃ｽ懈・
        CREATE INDEX IF NOT EXISTS idx_machines_machine_type_id ON machines(machine_type_id);
    END IF;
END $$;

-- 2. history_items 繝・・繝悶Ν繧剃ｽ懈・
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

-- history_items 繝・・繝悶Ν縺ｮ繧､繝ｳ繝・ャ繧ｯ繧ｹ繧剃ｽ懈・
CREATE INDEX IF NOT EXISTS idx_history_items_chat_id ON history_items(chat_id);
CREATE INDEX IF NOT EXISTS idx_history_items_created_at ON history_items(created_at);
CREATE INDEX IF NOT EXISTS idx_history_items_category ON history_items(category);
CREATE INDEX IF NOT EXISTS idx_history_items_keywords ON history_items USING GIN(keywords);

-- 3. history_items 繝・・繝悶Ν縺ｮ updated_at 閾ｪ蜍墓峩譁ｰ繝医Μ繧ｬ繝ｼ
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

-- 4. 繧ｵ繝ｳ繝励Ν繝・・繧ｿ縺ｮ謖ｿ蜈･・磯幕逋ｺ逕ｨ・・
INSERT INTO history_items (chat_id, title, description, machine_model, office, category, keywords) VALUES
(
    uuid_generate_v4(),
    '霆碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ縺ｮ謨・囿蟇ｾ蠢・,
    '霆碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ縺ｮ繧ｨ繝ｳ繧ｸ繝ｳ荳崎ｪｿ縺ｫ縺､縺・※蟇ｾ蠢懊＠縺ｾ縺励◆縲・,
    '霆碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ',
    '譚ｱ莠ｬ謾ｯ遉ｾ',
    '謨・囿蟇ｾ蠢・,
    ARRAY['霆碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ', '繧ｨ繝ｳ繧ｸ繝ｳ', '謨・囿']
),
(
    uuid_generate_v4(),
    '驩・｣ｽ繝医Ο・・0t・峨・螳壽悄轤ｹ讀・,
    '驩・｣ｽ繝医Ο・・0t・峨・螳壽悄轤ｹ讀懊ｒ螳滓命縺励∪縺励◆縲・,
    '驩・｣ｽ繝医Ο・・0t・・,
    '螟ｧ髦ｪ謾ｯ遉ｾ',
    '螳壽悄轤ｹ讀・,
    ARRAY['驩・｣ｽ繝医Ο', '螳壽悄轤ｹ讀・, '10t']
)
ON CONFLICT DO NOTHING;

-- 5. 繝薙Η繝ｼ縺ｮ菴懈・・亥ｱ･豁ｴ繧ｵ繝槭Μ繝ｼ逕ｨ・・
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

-- 6. 繧ｳ繝｡繝ｳ繝医・霑ｽ蜉
COMMENT ON TABLE history_items IS '繧ｵ繝昴・繝亥ｱ･豁ｴ繧｢繧､繝・Β繧呈ｼ邏阪☆繧九ユ繝ｼ繝悶Ν';
COMMENT ON COLUMN history_items.chat_id IS '髢｢騾｣縺吶ｋ繝√Ε繝・ヨID';
COMMENT ON COLUMN history_items.keywords IS '繧ｭ繝ｼ繝ｯ繝ｼ繝蛾・蛻・;
COMMENT ON COLUMN history_items.metadata IS '霑ｽ蜉縺ｮ繝｡繧ｿ繝・・繧ｿ・・SON蠖｢蠑擾ｼ・;

-- 7. 遒ｺ隱咲畑繧ｯ繧ｨ繝ｪ
-- SELECT 'machines' as table_name, COUNT(*) as record_count FROM machines
-- UNION ALL
-- SELECT 'machine_types' as table_name, COUNT(*) as record_count FROM machine_types
-- UNION ALL
-- SELECT 'history_items' as table_name, COUNT(*) as record_count FROM history_items; 

