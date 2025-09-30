# 本番環境デプロイメントガイド

## Azure App Service 環境変数設定

### 必須環境変数
Azure Portal → App Service → 設定 → アプリケーション設定で以下を設定：

```bash
NODE_ENV=production
PORT=8080
BYPASS_DB_FOR_LOGIN=false
PG_SSL=require
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
JWT_SECRET=your-production-jwt-secret-32-characters-minimum
SESSION_SECRET=your-production-session-secret-32-characters-minimum
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
TRUST_PROXY=1
OPENAI_API_KEY=sk-your-actual-openai-api-key
```

### 重要なポイント

#### ✅ 本番環境の必須設定
- `NODE_ENV=production`
- `BYPASS_DB_FOR_LOGIN=false` (データベース認証必須)
- `PG_SSL=require` (SSL接続必須)
- `PORT=8080` (Azure App Service用)

#### ✅ セキュリティ設定
- `JWT_SECRET`: 32文字以上のランダム文字列
- `SESSION_SECRET`: 32文字以上のランダム文字列
- `OPENAI_API_KEY`: 実際のAPIキー

#### ✅ データベース設定
- `DATABASE_URL`: Azure PostgreSQL接続文字列
- `PG_SSL=require`: SSL接続必須

## デプロイメント手順

### 1. Azure Portal設定
1. App Service → 設定 → アプリケーション設定
2. 上記の環境変数をすべて設定
3. 保存

### 2. デプロイ
1. GitHub Actionsまたは手動デプロイ
2. App Service再起動
3. ログで起動状況を確認

### 3. 動作確認
- `/api/health` → 200 OK
- `/api/auth/handshake` → 200 OK
- ログイン機能のテスト

## トラブルシューティング

### 起動しない場合
1. 環境変数が正しく設定されているか確認
2. `NODE_ENV=production`が設定されているか確認
3. `BYPASS_DB_FOR_LOGIN=false`が設定されているか確認
4. データベース接続文字列が正しいか確認

### ログインできない場合
1. `JWT_SECRET`と`SESSION_SECRET`が設定されているか確認
2. データベースにユーザーが存在するか確認
3. `BYPASS_DB_FOR_LOGIN=false`が設定されているか確認

## ローカル環境との違い

| 項目 | ローカル | 本番 |
|------|----------|------|
| NODE_ENV | development | production |
| BYPASS_DB_FOR_LOGIN | true | false |
| PG_SSL | disable | require |
| PORT | 8000 | 8080 |
| データベース | ローカルPostgreSQL | Azure PostgreSQL |
| SSL | 無効 | 必須 |