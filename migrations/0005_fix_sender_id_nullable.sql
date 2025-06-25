
-- AIメッセージのsenderIdをnullにできるようにテーブルを修正
ALTER TABLE messages ALTER COLUMN sender_id DROP NOT NULL;

-- インデックスの更新（必要に応じて）
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id) WHERE sender_id IS NOT NULL;
