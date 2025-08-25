-- RAG繧ｷ繧ｹ繝・Β逕ｨ縺ｮ蛻晄悄繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ
-- pgvector諡｡蠑ｵ繧呈怏蜉ｹ蛹・
CREATE EXTENSION IF NOT EXISTS vector;

-- 繝峨く繝･繝｡繝ｳ繝育ｮ｡逅・ユ繝ｼ繝悶Ν
CREATE TABLE IF NOT EXISTS documents (
    doc_id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    hash TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 繝√Ε繝ｳ繧ｯ邂｡逅・ユ繝ｼ繝悶Ν
CREATE TABLE IF NOT EXISTS chunks (
    id SERIAL PRIMARY KEY,
    doc_id TEXT NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
    page INTEGER NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[],
    chunk_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 繝吶け繝医Ν蝓九ａ霎ｼ縺ｿ繝・・繝悶Ν
CREATE TABLE IF NOT EXISTS kb_vectors (
    chunk_id INTEGER PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
    embedding VECTOR(1536) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 繧､繝ｳ繝・ャ繧ｯ繧ｹ菴懈・
CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_chunks_tags ON chunks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kb_vectors_embedding ON kb_vectors USING ivfflat (embedding vector_cosine_ops);

-- 繧ｳ繝｡繝ｳ繝郁ｿｽ蜉
COMMENT ON TABLE documents IS '繝峨く繝･繝｡繝ｳ繝育ｮ｡逅・ユ繝ｼ繝悶Ν';
COMMENT ON TABLE chunks IS '繝・く繧ｹ繝医メ繝｣繝ｳ繧ｯ邂｡逅・ユ繝ｼ繝悶Ν';
COMMENT ON TABLE kb_vectors IS '繝吶け繝医Ν蝓九ａ霎ｼ縺ｿ繝・・繝悶Ν';
COMMENT ON COLUMN documents.doc_id IS '繝峨く繝･繝｡繝ｳ繝・D・・HA1繝上ャ繧ｷ繝･・・;
COMMENT ON COLUMN documents.hash IS '繝峨く繝･繝｡繝ｳ繝亥・螳ｹ縺ｮ繝上ャ繧ｷ繝･';
COMMENT ON COLUMN chunks.chunk_hash IS '繝√Ε繝ｳ繧ｯ蜀・ｮｹ縺ｮ繝上ャ繧ｷ繝･';
COMMENT ON COLUMN kb_vectors.embedding IS 'OpenAI text-embedding-3-small逕ｨ縺ｮ1536谺｡蜈・・繧ｯ繝医Ν';
