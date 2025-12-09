# 🚀 本番デプロイ前チェックリスト

## 📋 必須環境変数の設定確認

本番環境(Azure App Service)で以下の環境変数が**必ず**設定されていることを確認してください。

### 1. ストレージモード設定 🗂️
```
STORAGE_MODE=azure
```
**重要**: この変数が未設定または`local`の場合、ローカルファイルシステムを使おうとして失敗します。

### 2. Azure BLOB Storage接続情報 📦
```
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=xxx;AccountKey=xxx;EndpointSuffix=core.windows.net
AZURE_STORAGE_ACCOUNT_NAME=rgemergencyassistantb25b
AZURE_STORAGE_CONTAINER_NAME=knowledge
AZURE_KNOWLEDGE_BASE_PATH=knowledge-base
```

**確認方法**:
1. Azure Portal → App Service → 設定 → 環境変数
2. 上記の変数が全て設定されていることを確認
3. `AZURE_STORAGE_CONNECTION_STRING`の値が正しいことを確認

### 3. データベース接続 🗄️
```
DATABASE_URL=postgresql://user:password@host:port/dbname
PG_SSL=require
```

### 4. セキュリティ 🔐
```
SESSION_SECRET=<32文字以上のランダム文字列>
JWT_SECRET=<32文字以上のランダム文字列>
```

### 5. フロントエンドURL 🌐
```
FRONTEND_URL=https://your-static-web-app.azurestaticapps.net
STATIC_WEB_APP_URL=https://your-static-web-app.azurestaticapps.net
```

## 🔍 環境判定ロジック

システムは以下の順序で環境を判定します:

1. **`STORAGE_MODE`環境変数**
   - `azure` または `blob` → Azure BLOBストレージを使用
   - `local` → ローカルファイルシステムを使用

2. **Azure App Service固有の環境変数**
   - `WEBSITE_INSTANCE_ID` または `WEBSITE_SITE_NAME` が存在 → Azure環境

3. **BLOB接続文字列**
   - `AZURE_STORAGE_CONNECTION_STRING` が設定されている → Azure環境

4. **NODE_ENV**
   - `production` → Azure環境（デフォルト）

## ⚠️ よくある問題と対処法

### 問題1: 画像が表示されない（500エラー）
**原因**: 
- `STORAGE_MODE`が未設定または`local`になっている
- `AZURE_STORAGE_CONNECTION_STRING`が未設定または間違っている

**対処法**:
```bash
# Azure Portal → App Service → 環境変数で確認
STORAGE_MODE=azure
AZURE_STORAGE_CONNECTION_STRING=<正しい接続文字列>
```

### 問題2: 履歴画像のアップロードが失敗する
**原因**: BLOBコンテナが存在しない、または権限がない

**対処法**:
1. Azure Portal → Storage Account → コンテナ
2. `knowledge`コンテナが存在することを確認
3. アクセスレベル: `コンテナー (コンテナーとBLOBの匿名読み取りアクセス)`

### 問題3: 応急復旧フロー生成が失敗する
**原因**: BLOB書き込み権限がない、またはコンテナが存在しない

**対処法**:
1. Storage Accountの接続文字列に書き込み権限があることを確認
2. `knowledge`コンテナが存在し、書き込み可能であることを確認

## 🧪 デプロイ後の動作確認

### 1. ヘルスチェック
```bash
curl https://your-app.azurewebsites.net/api/health
```

期待される結果:
```json
{
  "status": "healthy",
  "environment": "azure",
  "storage": "available"
}
```

### 2. 環境変数診断
```bash
curl https://your-app.azurewebsites.net/api/_diag
```

期待される結果:
```json
{
  "storage": {
    "mode": "azure",
    "blobAvailable": true,
    "containerName": "knowledge"
  }
}
```

### 3. 画像取得テスト
既存の画像URLにアクセスして200レスポンスが返ることを確認:
```
https://your-app.azurewebsites.net/api/images/chat-exports/test_image.jpg
```

## 📝 デプロイコマンド

```bash
# 1. ビルド
npm run build

# 2. Azure App Serviceにデプロイ
git push azure main

# 3. デプロイ完了後、ログを確認
az webapp log tail --name your-app-name --resource-group your-resource-group
```

## 🎯 チェックリスト

デプロイ前に以下を確認してください:

- [ ] `STORAGE_MODE=azure` が設定されている
- [ ] `AZURE_STORAGE_CONNECTION_STRING` が正しく設定されている
- [ ] `AZURE_STORAGE_CONTAINER_NAME=knowledge` が設定されている
- [ ] `DATABASE_URL` が正しく設定されている
- [ ] `SESSION_SECRET` が設定されている (32文字以上)
- [ ] BLOBコンテナ `knowledge` が存在する
- [ ] BLOBコンテナのアクセスレベルが適切に設定されている
- [ ] `/api/health` エンドポイントが正常に応答する
- [ ] `/api/_diag` で環境変数が正しく認識されている

## 🆘 トラブルシューティング

### ログの確認方法

#### Azure Portal
1. App Service → ログストリーム
2. リアルタイムでサーバーログを確認

#### Azure CLI
```bash
az webapp log tail --name your-app-name --resource-group your-resource-group
```

### よく見るエラーメッセージ

| エラーメッセージ | 原因 | 対処法 |
|---|---|---|
| `BLOB storage not available` | 接続文字列未設定 | `AZURE_STORAGE_CONNECTION_STRING`を設定 |
| `Container not found` | コンテナが存在しない | Azureポータルでコンテナを作成 |
| `画像が見つかりません` | BLOBにファイルが存在しない | ファイルが正しくアップロードされているか確認 |

---

**最終更新**: 2025年12月9日
