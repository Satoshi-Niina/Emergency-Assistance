# 本番環境デプロイメント手順

## 修正内容

### フロントエンド
- ✅ `client/.env.production` に本番API URLを設定
- ✅ フロントエンドを再ビルド完了

### バックエンド
- ✅ APIルーティングを静的ファイル配信より前に配置
- ✅ 本番環境用ヘルスチェックエンドポイント `/api/health/json` を追加
- ✅ ストレージ一覧APIのprefixを固定値に設定
- ✅ 主要APIエンドポイントにログ出力を追加

## デプロイメント手順

### 1. フロントエンドのデプロイ
```bash
cd client
npm run build
# dist/ フォルダをStatic Web Appsにデプロイ
```

### 2. バックエンドのデプロイ
```bash
cd server
npm run build
# ビルドされたファイルをAzure App Serviceにデプロイ
```

### 3. 環境変数の設定（Azure App Service）
以下の環境変数をAzure App Serviceの構成で設定：

```
DATABASE_URL=<本番PostgreSQL接続文字列>?sslmode=require
AZURE_STORAGE_CONNECTION_STRING=<本番ストレージ接続文字列>
BLOB_CONTAINER_NAME=knowledge
BLOB_PREFIX=Azure-knowledge/knowledge-base/
NODE_ENV=production
```

### 4. 動作確認
以下のAPIエンドポイントが200/application/jsonで応答することを確認：

```bash
# ヘルスチェック
curl -i "https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health/json"

# ユーザー一覧
curl -i "https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/users"

# 機種一覧
curl -i "https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/machines/machine-types"

# 全機械データ
curl -i "https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/machines/all-machines"

# ストレージ一覧
curl -i "https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/storage/list"
```

## 期待される結果

1. チャットUIで機種・機械番号が表示される
2. 設定UI→ユーザー管理でエラーが発生しない
3. 設定UI→機種・機械番号管理で一覧が表示される
4. ローカル環境は従来通り動作する

## トラブルシューティング

### APIが404を返す場合
- 静的ファイル配信がAPIルートより先に処理されていないか確認
- Azure App Serviceのルーティング設定を確認

### APIが500を返す場合
- 環境変数が正しく設定されているか確認
- データベース接続が正常か確認
- ログを確認してエラー詳細を特定

### CORSエラーが発生する場合
- フロントエンドのドメインがCORS設定に含まれているか確認
- 本番環境のCORS設定を確認
