# 🚀 本番環境フロント・バック連携完全設定ガイド

## ✅ 現在の状況
- **バックエンド**: GitHub Actionsでデプロイ設定完了
- **フロントエンド**: GitHub Actionsでデプロイ設定完了
- **接続設定**: コード側は完了、Azure設定が必要

## 🔧 Azure App Service (バックエンド) 必須設定

### 1. Azure Portal でバックエンド設定
1. Azure Portal → App Services → `emergency-backend-webapp`
2. 設定 → 構成 → アプリケーション設定

**必須環境変数**:
```bash
# データベース接続 (最重要)
DATABASE_URL=postgresql://username:password@servername.postgres.database.azure.com:5432/databasename?sslmode=require

# OpenAI API (機能動作に必要)
OPENAI_API_KEY=your_actual_openai_api_key

# セッション設定 (認証に必要)
SESSION_SECRET=emergency-assistance-session-secret-production-2024

# フロントエンドURL (CORS設定に必要)
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net

# 環境設定
NODE_ENV=production
PORT=3001
LANG=ja_JP.UTF-8
LC_ALL=ja_JP.UTF-8
NODE_OPTIONS=--max-old-space-size=4096
```

### 2. PostgreSQL データベース設定
**Azure Database for PostgreSQL が必要**:
- サーバー名: `emergency-postgres-server.postgres.database.azure.com`
- データベース名: `emergency_assistance`
- SSL接続: 必須 (`sslmode=require`)

## 🌐 Azure Static Web Apps (フロントエンド) 設定

### 自動設定 (GitHub Actions経由)
- `VITE_API_BASE_URL=https://emergency-backend-webapp.azurewebsites.net`
- ビルド時に自動で設定される

## 🔗 連携テスト手順

### 1. デプロイ完了確認
```bash
# バックエンドヘルスチェック
curl https://emergency-backend-webapp.azurewebsites.net/health

# DB疎通確認
curl https://emergency-backend-webapp.azurewebsites.net/db-ping

# フロントエンドアクセス確認
curl https://witty-river-012f39e00.1.azurestaticapps.net
```

### 2. 完全連携テスト
```powershell
# PowerShellスクリプト実行
.\test-azure-deployment.ps1
```

## ⚠️ トラブルシューティング

### DATABASE_URL エラーの場合
1. Azure Database for PostgreSQL が作成済みか確認
2. ファイアウォール設定でAzure サービスを許可
3. SSL証明書設定確認

### CORS エラーの場合
1. FRONTEND_URL が正しく設定されているか確認
2. バックエンドのCORS設定確認

### API接続エラーの場合
1. フロントエンドのVITE_API_BASE_URL確認
2. ネットワーク設定確認

## 🎯 連携完了の判定基準

✅ **連携成功の確認事項**:
1. バックエンドヘルスチェック成功
2. DB疎通確認成功
3. フロントエンドアクセス成功
4. CORS設定確認成功
5. フロントエンドからAPIリクエスト成功

## 📋 設定チェックリスト

- [ ] Azure Database for PostgreSQL 作成
- [ ] DATABASE_URL 設定
- [ ] OPENAI_API_KEY 設定
- [ ] SESSION_SECRET 設定
- [ ] FRONTEND_URL 設定
- [ ] バックエンドデプロイ完了
- [ ] フロントエンドデプロイ完了
- [ ] ヘルスチェック成功
- [ ] DB疎通確認成功
- [ ] エンドツーエンドテスト成功

**すべて完了すれば、本番環境でフロント・バック完全連携！** 🎉
