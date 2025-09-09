-- Azure PostgreSQL データベース初期化スクリプト
-- データベース: emergency_assistance

-- 既存データの確認と機種・機械テーブルの初期化

-- 1. 既存テーブルの確認
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. 機種テーブルのサンプルデータ投入
INSERT INTO machine_types (machine_type_name) VALUES 
  ('ショベルカー'),
  ('ブルドーザー'),
  ('ダンプトラック'),
  ('ローダー'),
  ('グレーダー'),
  ('ローラー'),
  ('クレーン'),
  ('フォークリフト')
ON CONFLICT DO NOTHING;

-- 3. 機械テーブルのサンプルデータ投入
WITH machine_type_ids AS (
  SELECT id, machine_type_name FROM machine_types
)
INSERT INTO machines (machine_number, machine_type_id)
SELECT 
  CASE mt.machine_type_name
    WHEN 'ショベルカー' THEN 'SC-' || LPAD(generate_series::text, 3, '0')
    WHEN 'ブルドーザー' THEN 'BD-' || LPAD(generate_series::text, 3, '0')
    WHEN 'ダンプトラック' THEN 'DT-' || LPAD(generate_series::text, 3, '0')
    WHEN 'ローダー' THEN 'LD-' || LPAD(generate_series::text, 3, '0')
    WHEN 'グレーダー' THEN 'GR-' || LPAD(generate_series::text, 3, '0')
    WHEN 'ローラー' THEN 'RL-' || LPAD(generate_series::text, 3, '0')
    WHEN 'クレーン' THEN 'CR-' || LPAD(generate_series::text, 3, '0')
    WHEN 'フォークリフト' THEN 'FL-' || LPAD(generate_series::text, 3, '0')
  END as machine_number,
  mt.id
FROM machine_type_ids mt
CROSS JOIN generate_series(1, 5)
ON CONFLICT DO NOTHING;

-- 4. 初期データの確認
SELECT 'machine_types' as table_name, COUNT(*) as count FROM machine_types
UNION ALL
SELECT 'machines' as table_name, COUNT(*) as count FROM machines
UNION ALL
SELECT 'users' as table_name, COUNT(*) as count FROM users;

-- 5. 機種と機械の関連確認
SELECT 
  mt.machine_type_name,
  COUNT(m.id) as machine_count,
  STRING_AGG(m.machine_number, ', ' ORDER BY m.machine_number) as machine_numbers
FROM machine_types mt
LEFT JOIN machines m ON mt.id = m.machine_type_id
GROUP BY mt.machine_type_name, mt.id
ORDER BY mt.machine_type_name;
