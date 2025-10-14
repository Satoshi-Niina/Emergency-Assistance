-- SQLite用故障履歴テーブル作成マイグレーション
-- 作成日: 2025-10-11
-- 説明: 故障履歴をデータベースで管理するためのテーブルを追加

-- 故障履歴メインテーブル（JSON形式データを含む）
CREATE TABLE fault_history (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    machine_type TEXT,
    machine_number TEXT,
    office TEXT,
    category TEXT,
    keywords TEXT, -- JSON文字列形式
    emergency_guide_title TEXT,
    emergency_guide_content TEXT,
    json_data TEXT NOT NULL, -- 元のJSONデータを保存
    metadata TEXT, -- JSON文字列形式
    storage_mode TEXT NOT NULL DEFAULT 'database',
    file_path TEXT,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')) NOT NULL
);

-- 故障履歴に関連する画像テーブル
CREATE TABLE fault_history_images (
    id TEXT PRIMARY KEY,
    fault_history_id TEXT NOT NULL,
    original_file_name TEXT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    relative_path TEXT,
    mime_type TEXT,
    file_size INTEGER,
    description TEXT,
    image_data TEXT,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL,
    FOREIGN KEY (fault_history_id) REFERENCES fault_history(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX idx_fault_history_machine_type ON fault_history(machine_type);
CREATE INDEX idx_fault_history_machine_number ON fault_history(machine_number);
CREATE INDEX idx_fault_history_category ON fault_history(category);
CREATE INDEX idx_fault_history_office ON fault_history(office);
CREATE INDEX idx_fault_history_created_at ON fault_history(created_at);
CREATE INDEX idx_fault_history_storage_mode ON fault_history(storage_mode);

-- 画像テーブルのインデックス
CREATE INDEX idx_fault_history_images_fault_id ON fault_history_images(fault_history_id);
CREATE INDEX idx_fault_history_images_file_name ON fault_history_images(file_name);

-- 更新日時の自動更新トリガー
CREATE TRIGGER trigger_fault_history_updated_at
    AFTER UPDATE ON fault_history
    FOR EACH ROW
    BEGIN
        UPDATE fault_history SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
