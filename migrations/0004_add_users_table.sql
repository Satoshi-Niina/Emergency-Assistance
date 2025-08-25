-- PostgreSQL 繝ｦ繝ｼ繧ｶ繝ｼ繝・・繝悶Ν菴懈・繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ
-- Emergency Assistance System - Users Table

-- UUID諡｡蠑ｵ讖溯・繧呈怏蜉ｹ蛹・
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- users 繝・・繝悶Ν縺ｮ菴懈・
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    department TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 繧､繝ｳ繝・ャ繧ｯ繧ｹ菴懈・
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 繧ｵ繝ｳ繝励Ν繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ謖ｿ蜈･・域里蟄倥ョ繝ｼ繧ｿ縺後↑縺・ｴ蜷医・縺ｿ・・
INSERT INTO users (username, password, display_name, role, department) VALUES
    ('admin', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dE3fF4gG5hH6iI7jJ8kK9lL0mM1nN2oO3pP4qQ5rR6sS7tT8uU9vV0wW1xX2yY3zZ', '邂｡逅・・, 'admin', '繧ｷ繧ｹ繝・Β邂｡逅・Κ'),
    ('employee1', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dE3fF4gG5hH6iI7jJ8kK9lL0mM1nN2oO3pP4qQ5rR6sS7tT8uU9vV0wW1xX2yY3zZ', '蠕捺･ｭ蜩｡1', 'employee', '菫晏ｮ磯Κ')
ON CONFLICT (username) DO NOTHING;

-- 繧ｳ繝｡繝ｳ繝医・霑ｽ蜉
COMMENT ON TABLE users IS '繝ｦ繝ｼ繧ｶ繝ｼ邂｡逅・ユ繝ｼ繝悶Ν';
COMMENT ON COLUMN users.id IS '繝ｦ繝ｼ繧ｶ繝ｼID・・UID・・;
COMMENT ON COLUMN users.username IS '繝ｦ繝ｼ繧ｶ繝ｼ蜷搾ｼ医Ο繧ｰ繧､繝ｳ逕ｨ・・;
COMMENT ON COLUMN users.password IS '繝代せ繝ｯ繝ｼ繝会ｼ医ワ繝・す繝･蛹匁ｸ医∩・・;
COMMENT ON COLUMN users.display_name IS '陦ｨ遉ｺ蜷・;
COMMENT ON COLUMN users.role IS '讓ｩ髯撰ｼ・dmin/employee・・;
COMMENT ON COLUMN users.department IS '驛ｨ鄂ｲ蜷・;
COMMENT ON COLUMN users.description IS '隱ｬ譏・;
COMMENT ON COLUMN users.created_at IS '菴懈・譌･譎・; 

