
-- 古いテーブルを削除してUUIDベースで再作成
DROP TABLE IF EXISTS chat_exports CASCADE;
DROP TABLE IF EXISTS keywords CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS emergency_flows CASCADE;
DROP TABLE IF EXISTS images CASCADE;

-- UUID拡張が利用可能であることを確認
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ユーザーテーブル（UUID）
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  department TEXT,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- チャットテーブル（UUID）
CREATE TABLE chats (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- メッセージテーブル（UUID）
CREATE TABLE messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_ai_response BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- メディアテーブル（UUID）
CREATE TABLE media (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 緊急フローテーブル（UUID）
CREATE TABLE emergency_flows (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  steps JSONB NOT NULL,
  keyword TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 画像テーブル（UUID）
CREATE TABLE images (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  description TEXT NOT NULL,
  embedding JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ドキュメントテーブル（UUID）
CREATE TABLE documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- キーワードテーブル（UUID）
CREATE TABLE keywords (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- チャットエクスポートテーブル（UUID）
CREATE TABLE chat_exports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- パフォーマンス向上のためのインデックス
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_media_message_id ON media(message_id);
CREATE INDEX idx_keywords_document_id ON keywords(document_id);
CREATE INDEX idx_keywords_word ON keywords(word);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_chat_exports_chat_id ON chat_exports(chat_id);
CREATE INDEX idx_chat_exports_user_id ON chat_exports(user_id);

-- 管理者ユーザーを追加
INSERT INTO users (username, display_name, password, role, department)
VALUES ('admin', 'Administrator', 'admin123', 'admin', 'System')
ON CONFLICT (username) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  department = EXCLUDED.department;
