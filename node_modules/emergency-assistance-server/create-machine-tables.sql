-- SQLite用機種と機械番号のマスターテーブル作成
-- PostgreSQL版をSQLite用に変換

-- 機種マスターテーブル
CREATE TABLE IF NOT EXISTS machine_types (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    machine_type_name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')) NOT NULL
);

-- 機械マスターテーブル
CREATE TABLE IF NOT EXISTS machines (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    machine_number TEXT NOT NULL,
    machine_type_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')) NOT NULL,
    FOREIGN KEY (machine_type_id) REFERENCES machine_types(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_machines_machine_type_id ON machines(machine_type_id);
CREATE INDEX IF NOT EXISTS idx_machine_types_name ON machine_types(machine_type_name);

-- updated_at自動更新のためのトリガー
CREATE TRIGGER IF NOT EXISTS update_machine_types_updated_at
    AFTER UPDATE ON machine_types
    FOR EACH ROW
    BEGIN
        UPDATE machine_types SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_machines_updated_at
    AFTER UPDATE ON machines
    FOR EACH ROW
    BEGIN
        UPDATE machines SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

-- サンプルデータ挿入（重複チェック付き）
INSERT OR IGNORE INTO machine_types (machine_type_name) VALUES
    ('軌道モータカー'),
    ('鉄製トロ（10t）'),
    ('鉄製トロ（25t）'),
    ('箱トロ'),
    ('ミニホッパー車');

-- 機械番号のサンプルデータ挿入
INSERT OR IGNORE INTO machines (machine_number, machine_type_id) 
SELECT 
    CASE 
        WHEN mt.machine_type_name = '軌道モータカー' THEN 'TRACK-' || printf('%03d', (SELECT COUNT(*) + 1 FROM machines m2 WHERE m2.machine_type_id = mt.id))
        WHEN mt.machine_type_name = '鉄製トロ（10t）' THEN 'TROLLEY10-' || printf('%03d', (SELECT COUNT(*) + 1 FROM machines m2 WHERE m2.machine_type_id = mt.id))
        WHEN mt.machine_type_name = '鉄製トロ（25t）' THEN 'TROLLEY25-' || printf('%03d', (SELECT COUNT(*) + 1 FROM machines m2 WHERE m2.machine_type_id = mt.id))
        WHEN mt.machine_type_name = '箱トロ' THEN 'BOX-' || printf('%03d', (SELECT COUNT(*) + 1 FROM machines m2 WHERE m2.machine_type_id = mt.id))
        WHEN mt.machine_type_name = 'ミニホッパー車' THEN 'HOPPER-' || printf('%03d', (SELECT COUNT(*) + 1 FROM machines m2 WHERE m2.machine_type_id = mt.id))
    END,
    mt.id
FROM machine_types mt
WHERE NOT EXISTS (
    SELECT 1 FROM machines m 
    WHERE m.machine_type_id = mt.id 
    AND m.machine_number LIKE CASE 
        WHEN mt.machine_type_name = '軌道モータカー' THEN 'TRACK-%'
        WHEN mt.machine_type_name = '鉄製トロ（10t）' THEN 'TROLLEY10-%'
        WHEN mt.machine_type_name = '鉄製トロ（25t）' THEN 'TROLLEY25-%'
        WHEN mt.machine_type_name = '箱トロ' THEN 'BOX-%'
        WHEN mt.machine_type_name = 'ミニホッパー車' THEN 'HOPPER-%'
    END
)
LIMIT 3;
