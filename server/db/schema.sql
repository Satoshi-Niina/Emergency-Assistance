-- PostgreSQL 繝・・繧ｿ繝吶・繧ｹ繧ｹ繧ｭ繝ｼ繝・
-- Emergency Assistance System

-- 諡｡蠑ｵ讖溯・縺ｮ譛牙柑蛹・
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 繝翫Ξ繝・ず繝・・繝悶Ν
CREATE TABLE IF NOT EXISTS knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    tags TEXT[], -- 驟榊・蝙九〒繧ｿ繧ｰ繧剃ｿ晏ｭ・
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 繝√Ε繝・ヨ螻･豁ｴ繝・・繝悶Ν
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL, -- 繧ｻ繝・す繝ｧ繝ｳID・郁､・焚縺ｮ雉ｪ蝠上・蝗樒ｭ斐ｒ繧ｰ繝ｫ繝ｼ繝怜喧・・
    question TEXT NOT NULL,
    answer TEXT,
    image_url VARCHAR(500), -- 逕ｻ蜒上・URL縺ｾ縺溘・繝代せ
    machine_type VARCHAR(100), -- 讖溽ｨｮ
    machine_number VARCHAR(100), -- 讖滓｢ｰ逡ｪ蜿ｷ
    metadata JSONB, -- 霑ｽ蜉縺ｮ繝｡繧ｿ繝・・繧ｿ・・SON蠖｢蠑擾ｼ・
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 繧ｻ繝・す繝ｧ繝ｳ邂｡逅・ユ繝ｼ繝悶Ν
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255), -- 繧ｻ繝・す繝ｧ繝ｳ繧ｿ繧､繝医Ν
    machine_type VARCHAR(100),
    machine_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active', -- active, completed, archived
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 繧､繝ｳ繝・ャ繧ｯ繧ｹ縺ｮ菴懈・
CREATE INDEX IF NOT EXISTS idx_knowledge_title ON knowledge(title);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_created_at ON knowledge(created_at);

CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_history_machine_type ON chat_history(machine_type);
CREATE INDEX IF NOT EXISTS idx_chat_history_machine_number ON chat_history(machine_number);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_machine_type ON chat_sessions(machine_type);

-- 螟夜Κ繧ｭ繝ｼ蛻ｶ邏・
ALTER TABLE chat_history 
ADD CONSTRAINT fk_chat_history_session 
FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;

-- 譖ｴ譁ｰ譌･譎ゅｒ閾ｪ蜍墓峩譁ｰ縺吶ｋ繝医Μ繧ｬ繝ｼ髢｢謨ｰ
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 繝医Μ繧ｬ繝ｼ縺ｮ菴懈・
CREATE TRIGGER update_knowledge_updated_at 
    BEFORE UPDATE ON knowledge 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 繧ｵ繝ｳ繝励Ν繝・・繧ｿ縺ｮ謖ｿ蜈･・磯幕逋ｺ逕ｨ・・
INSERT INTO knowledge (title, content, tags, category) VALUES
('蝓ｺ譛ｬ逧・↑蠢懈･蜃ｦ鄂ｮ謇矩・, '蠢懈･蜃ｦ鄂ｮ縺ｮ蝓ｺ譛ｬ逧・↑謇矩・↓縺､縺・※隱ｬ譏弱＠縺ｾ縺・..', ARRAY['蠢懈･蜃ｦ鄂ｮ', '蝓ｺ譛ｬ', '謇矩・], '蝓ｺ譛ｬ謇矩・),
('讖滓｢ｰ謨・囿縺ｮ險ｺ譁ｭ譁ｹ豕・, '讖滓｢ｰ謨・囿繧定ｨｺ譁ｭ縺吶ｋ縺溘ａ縺ｮ謇矩・→繝昴う繝ｳ繝・..', ARRAY['謨・囿', '險ｺ譁ｭ', '讖滓｢ｰ'], '謨・囿險ｺ譁ｭ'),
('螳牙・遒ｺ隱阪・驥崎ｦ∵ｧ', '菴懈･ｭ蜑阪・螳牙・遒ｺ隱阪・驥崎ｦ∵ｧ縺ｨ蜈ｷ菴鍋噪縺ｪ謇矩・..', ARRAY['螳牙・', '遒ｺ隱・, '菴懈･ｭ'], '螳牙・邂｡逅・)
ON CONFLICT DO NOTHING;

-- 繝薙Η繝ｼ縺ｮ菴懈・・医ｈ縺丈ｽｿ逕ｨ縺輔ｌ繧九け繧ｨ繝ｪ逕ｨ・・
CREATE OR REPLACE VIEW chat_session_summary AS
SELECT 
    cs.id as session_id,
    cs.title,
    cs.machine_type,
    cs.machine_number,
    cs.status,
    cs.created_at,
    cs.updated_at,
    COUNT(ch.id) as message_count,
    MAX(ch.created_at) as last_message_at
FROM chat_sessions cs
LEFT JOIN chat_history ch ON cs.id = ch.session_id
GROUP BY cs.id, cs.title, cs.machine_type, cs.machine_number, cs.status, cs.created_at, cs.updated_at;

-- 邨ｱ險域ュ蝣ｱ逕ｨ縺ｮ繝薙Η繝ｼ
CREATE OR REPLACE VIEW daily_statistics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions
FROM chat_sessions
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 繧ｳ繝｡繝ｳ繝医・霑ｽ蜉
COMMENT ON TABLE knowledge IS '繝翫Ξ繝・ず繝吶・繧ｹ縺ｮ諠・ｱ繧呈ｼ邏阪☆繧九ユ繝ｼ繝悶Ν';
COMMENT ON TABLE chat_history IS '繝√Ε繝・ヨ螻･豁ｴ縺ｮ雉ｪ蝠上・蝗樒ｭ斐ｒ譬ｼ邏阪☆繧九ユ繝ｼ繝悶Ν';
COMMENT ON TABLE chat_sessions IS '繝√Ε繝・ヨ繧ｻ繝・す繝ｧ繝ｳ縺ｮ邂｡逅・ユ繝ｼ繝悶Ν';
COMMENT ON COLUMN chat_history.metadata IS '霑ｽ蜉縺ｮ繝｡繧ｿ繝・・繧ｿ・・SON蠖｢蠑擾ｼ・;
COMMENT ON COLUMN chat_sessions.metadata IS '繧ｻ繝・す繝ｧ繝ｳ縺ｮ霑ｽ蜉繝｡繧ｿ繝・・繧ｿ・・SON蠖｢蠑擾ｼ・; 