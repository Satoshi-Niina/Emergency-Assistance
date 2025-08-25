-- 讖溽ｨｮ縺ｨ讖滓｢ｰ逡ｪ蜿ｷ縺ｮ繝槭せ繧ｿ繝ｼ繝・・繝悶Ν菴懈・
-- PostgreSQL 繝・・繧ｿ繝吶・繧ｹ繧ｹ繧ｭ繝ｼ繝・

-- UUID諡｡蠑ｵ讖溯・繧呈怏蜉ｹ蛹・
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 讖溽ｨｮ繝槭せ繧ｿ繝ｼ繝・・繝悶Ν
CREATE TABLE IF NOT EXISTS machine_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_type_name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 讖滓｢ｰ繝槭せ繧ｿ繝ｼ繝・・繝悶Ν
CREATE TABLE IF NOT EXISTS machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_number VARCHAR(255) NOT NULL,
    machine_type_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (machine_type_id) REFERENCES machine_types(id) ON DELETE CASCADE
);

-- 繧､繝ｳ繝・ャ繧ｯ繧ｹ菴懈・
CREATE INDEX IF NOT EXISTS idx_machines_machine_type_id ON machines(machine_type_id);
CREATE INDEX IF NOT EXISTS idx_machine_types_name ON machine_types(machine_type_name);

-- updated_at閾ｪ蜍墓峩譁ｰ縺ｮ縺溘ａ縺ｮ繝医Μ繧ｬ繝ｼ髢｢謨ｰ
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 繝医Μ繧ｬ繝ｼ菴懈・
CREATE TRIGGER update_machine_types_updated_at BEFORE UPDATE ON machine_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON machines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 繧ｵ繝ｳ繝励Ν繝・・繧ｿ謖ｿ蜈･
INSERT INTO machine_types (machine_type_name) VALUES
    ('霆碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ'),
    ('驩・｣ｽ繝医Ο・・0t・・),
    ('驩・｣ｽ繝医Ο・・5t・・),
    ('邂ｱ繝医Ο'),
    ('繝溘ル繝帙ャ繝代・霆・)
ON CONFLICT (machine_type_name) DO NOTHING;

-- 讖滓｢ｰ逡ｪ蜿ｷ縺ｮ繧ｵ繝ｳ繝励Ν繝・・繧ｿ謖ｿ蜈･
INSERT INTO machines (machine_number, machine_type_id) 
SELECT 
    CASE 
        WHEN mt.machine_type_name = '霆碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ' THEN 'TRACK-' || LPAD(ROW_NUMBER() OVER (PARTITION BY mt.id ORDER BY mt.id)::TEXT, 3, '0')
        WHEN mt.machine_type_name = '驩・｣ｽ繝医Ο・・0t・・ THEN 'TROLLEY10-' || LPAD(ROW_NUMBER() OVER (PARTITION BY mt.id ORDER BY mt.id)::TEXT, 3, '0')
        WHEN mt.machine_type_name = '驩・｣ｽ繝医Ο・・5t・・ THEN 'TROLLEY25-' || LPAD(ROW_NUMBER() OVER (PARTITION BY mt.id ORDER BY mt.id)::TEXT, 3, '0')
        WHEN mt.machine_type_name = '邂ｱ繝医Ο' THEN 'BOX-' || LPAD(ROW_NUMBER() OVER (PARTITION BY mt.id ORDER BY mt.id)::TEXT, 3, '0')
        WHEN mt.machine_type_name = '繝溘ル繝帙ャ繝代・霆・ THEN 'HOPPER-' || LPAD(ROW_NUMBER() OVER (PARTITION BY mt.id ORDER BY mt.id)::TEXT, 3, '0')
    END,
    mt.id
FROM machine_types mt
CROSS JOIN generate_series(1, 5) AS seq
ON CONFLICT DO NOTHING;

-- 遒ｺ隱咲畑繧ｯ繧ｨ繝ｪ
-- SELECT mt.machine_type_name, m.machine_number 
-- FROM machine_types mt 
-- LEFT JOIN machines m ON mt.id = m.machine_type_id 
-- ORDER BY mt.machine_type_name, m.machine_number; 