-- RAGシステム用の初期マイグレーション
-- pgvector拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- ドキュメント管理テーブル
CREATE TABLE IF NOT EXISTS documents (
    doc_id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    hash TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- チャンク管理テーブル
CREATE TABLE IF NOT EXISTS chunks (
    id SERIAL PRIMARY KEY,
    doc_id TEXT NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
    page INTEGER NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[],
    chunk_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ベクトル埋め込みテーブル
CREATE TABLE IF NOT EXISTS kb_vectors (
    chunk_id INTEGER PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
    embedding VECTOR(1536) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_chunks_tags ON chunks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kb_vectors_embedding ON kb_vectors USING ivfflat (embedding vector_cosine_ops);

-- コメント追加
COMMENT ON TABLE documents IS 'ドキュメント管理テーブル';
COMMENT ON TABLE chunks IS 'テキストチャンク管理テーブル';
COMMENT ON TABLE kb_vectors IS 'ベクトル埋め込みテーブル';
COMMENT ON COLUMN documents.doc_id IS 'ドキュメントID（SHA1ハッシュ）';
COMMENT ON COLUMN documents.hash IS 'ドキュメント内容のハッシュ';
COMMENT ON COLUMN chunks.chunk_hash IS 'チャンク内容のハッシュ';
COMMENT ON COLUMN kb_vectors.embedding IS 'OpenAI text-embedding-3-small用の1536次元ベクトル';
