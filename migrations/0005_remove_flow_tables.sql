-- トラブルシューティング関連テーブルの削除
-- フローデータは knowledge-base/troubleshooting ディレクトリのJSONファイルに移行

-- 応急処置フローテーブルを削除
DROP TABLE IF EXISTS support_flows;

-- 緊急フローテーブルを削除
DROP TABLE IF EXISTS emergency_flows;

-- 削除完了のログ
DO $$
BEGIN
    RAISE NOTICE 'トラブルシューティング関連テーブルの削除が完了しました';
    RAISE NOTICE 'フローデータは knowledge-base/troubleshooting ディレクトリのJSONファイルで管理されます';
END $$; 