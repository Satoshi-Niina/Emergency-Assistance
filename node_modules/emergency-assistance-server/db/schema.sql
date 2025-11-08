-- PostgreSQL データベーススキーマ
-- Emergency Assistance System

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ナレッジテーブル
CREATE TABLE IF NOT EXISTS knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    tags TEXT[], -- 配列型でタグを保存
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- チャット履歴テーブル
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL, -- セッションID（複数の質問・回答をグループ化）
    question TEXT NOT NULL,
    answer TEXT,
    image_url VARCHAR(500), -- 画像のURLまたはパス
    machine_type VARCHAR(100), -- 機種
    machine_number VARCHAR(100), -- 機械番号
    metadata JSONB, -- 追加のメタデータ（JSON形式）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- セッション管理テーブル
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255), -- セッションタイトル
    machine_type VARCHAR(100),
    machine_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active', -- active, completed, archived
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
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

-- 外部キー制約
ALTER TABLE chat_history 
ADD CONSTRAINT fk_chat_history_session 
FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの作成
CREATE TRIGGER update_knowledge_updated_at 
    BEFORE UPDATE ON knowledge 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- サンプルデータの挿入（開発用）
INSERT INTO knowledge (title, content, tags, category) VALUES
('基本的な応急処置手順', '応急処置の基本的な手順について説明します...', ARRAY['応急処置', '基本', '手順'], '基本手順'),
('機械故障の診断方法', '機械故障を診断するための手順とポイント...', ARRAY['故障', '診断', '機械'], '故障診断'),
('安全確認の重要性', '作業前の安全確認の重要性と具体的な手順...', ARRAY['安全', '確認', '作業'], '安全管理')
ON CONFLICT DO NOTHING;

-- ビューの作成（よく使用されるクエリ用）
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

-- 統計情報用のビュー
CREATE OR REPLACE VIEW daily_statistics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions
FROM chat_sessions
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- コメントの追加
COMMENT ON TABLE knowledge IS 'ナレッジベースの情報を格納するテーブル';
COMMENT ON TABLE chat_history IS 'チャット履歴の質問・回答を格納するテーブル';
COMMENT ON TABLE chat_sessions IS 'チャットセッションの管理テーブル';
COMMENT ON COLUMN chat_history.metadata IS '追加のメタデータ（JSON形式）';
COMMENT ON COLUMN chat_sessions.metadata IS 'セッションの追加メタデータ（JSON形式）'; 