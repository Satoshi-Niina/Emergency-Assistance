-- 故障履歴テーブル作成マイグレーション
-- 作成日: 2025-10-11
-- 説明: 故障履歴をデータベースで管理するためのテーブルを追加

-- 故障履歴メインテーブル（JSON形式データを含む）
CREATE TABLE fault_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    machine_type TEXT,
    machine_number TEXT,
    office TEXT,
    category TEXT,
    keywords JSONB, -- string[]形式
    emergency_guide_title TEXT,
    emergency_guide_content TEXT,
    json_data JSONB NOT NULL, -- 元のJSONデータを保存
    metadata JSONB, -- 追加のメタデータ
    storage_mode TEXT NOT NULL DEFAULT 'database', -- 'database' または 'file'
    file_path TEXT, -- ファイルモード時のパス
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 故障履歴に関連する画像テーブル
CREATE TABLE fault_history_images (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    fault_history_id TEXT NOT NULL REFERENCES fault_history(id) ON DELETE CASCADE,
    original_file_name TEXT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- knowledge-base/images/chat-exports/ 内のパス
    relative_path TEXT, -- JSONデータ内の相対パス
    mime_type TEXT,
    file_size INTEGER,
    description TEXT,
    image_data TEXT, -- base64形式のデータ（必要に応じて）
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- インデックス作成
CREATE INDEX idx_fault_history_machine_type ON fault_history(machine_type);
CREATE INDEX idx_fault_history_machine_number ON fault_history(machine_number);
CREATE INDEX idx_fault_history_category ON fault_history(category);
CREATE INDEX idx_fault_history_office ON fault_history(office);
CREATE INDEX idx_fault_history_created_at ON fault_history(created_at);
CREATE INDEX idx_fault_history_storage_mode ON fault_history(storage_mode);

-- JSON内のキーワード検索用のGINインデックス
CREATE INDEX idx_fault_history_keywords ON fault_history USING GIN (keywords);
CREATE INDEX idx_fault_history_json_data ON fault_history USING GIN (json_data);

-- 画像テーブルのインデックス
CREATE INDEX idx_fault_history_images_fault_id ON fault_history_images(fault_history_id);
CREATE INDEX idx_fault_history_images_file_name ON fault_history_images(file_name);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_fault_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fault_history_updated_at
    BEFORE UPDATE ON fault_history
    FOR EACH ROW
    EXECUTE FUNCTION update_fault_history_updated_at();

-- 環境変数に基づく初期設定コメント
COMMENT ON TABLE fault_history IS '故障履歴データを保存するメインテーブル。環境変数FAULT_HISTORY_STORAGE_MODEで動作モードを制御';
COMMENT ON COLUMN fault_history.storage_mode IS 'データ保存モード: database=DB保存, file=ファイル保存';
COMMENT ON COLUMN fault_history.json_data IS '元のエクスポートJSONデータをそのまま保存';
COMMENT ON COLUMN fault_history.file_path IS 'ファイルモード時の.jsonファイルパス';
COMMENT ON TABLE fault_history_images IS '故障履歴に添付された画像ファイル情報';
COMMENT ON COLUMN fault_history_images.file_path IS 'knowledge-base/images/chat-exports/内の実際のファイルパス';