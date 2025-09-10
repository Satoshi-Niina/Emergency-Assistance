# データベース統合とクリーンアップガイド

## 現在の状況
- **使用中DB**: `emergencyassistance-db.postgres.database.azure.com` (rg-Emergencyassistant-app)
- **古いDB**: `emergency-assist-postgres.postgres.database.azure.com` (rg-emergency-assist)

## 不要データベースの削除手順

### 1. 古いPostgreSQLサーバーの削除
```bash
# 古いサーバーを削除
az postgres flexible-server delete --name emergency-assist-postgres --resource-group rg-emergency-assist --yes

# リソースグループも不要なら削除
az group delete --name rg-emergency-assist --yes
```

### 2. 現在のデータベースのクリーンアップ

```sql
-- 不要なモックデータを削除
DELETE FROM machines WHERE machine_number LIKE 'CAT%' OR machine_number LIKE 'D8T%' OR machine_number LIKE '980K%';
DELETE FROM machine_types WHERE machine_type_name IN ('CAT336D', 'D8T', '980K', '掘削機械', 'ブルドーザー', 'ホイールローダー');

-- 実際の鉄道機械データに統一
DELETE FROM machine_types WHERE id NOT IN (
  SELECT DISTINCT machine_type_id FROM machines WHERE machine_type_id IS NOT NULL
);
```

### 3. 正しいデータ構造の確認

**現在のテーブル構造**:
- `machine_types`: 機種マスター（軌道モータカー、鉄製トロ等）
- `machines`: 機械番号マスター（TRACK-001、TROLLEY10-001等）
- `history_items`: サポート履歴

## モックデータの削除と統一

### クライアント側での対応
1. **CAT系建設機械データの削除**: 鉄道機械に統一
2. **API応答の統一**: 実際のDBデータを使用
3. **キャッシュクリア**: 古いモックデータの削除

### サーバー側での対応
1. **モックエンドポイントの削除**: 実際のDB接続に変更
2. **データ検証の追加**: 正しい鉄道機械データのみ許可
3. **マイグレーション実行**: 不要データの削除

## 推奨アクション

1. **即座に実行**:
   - Azure App Serviceの修正サーバーをデプロイ
   - 不要なモックデータをDBから削除
   - クイックフィックスサーバーで動作確認

2. **後で実行**:
   - 古いPostgreSQLサーバーの削除
   - データベース最適化
   - 正式な本番サーバーに戻す
