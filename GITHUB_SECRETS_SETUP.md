# GitHub Secrets 設定リスト - Emergency Assistance

## 🚨 緊急対応：不足している環境変数

現在、Azure App Serviceで503エラーが発生している原因は、以下の**必須環境変数**が設定されていないことです。

### ❌ 現在不足している重要な環境変数

| 環境変数名 | 説明 | 緊急度 | 設定場所 |
|---------|------|------|--------|
| `DATABASE_URL` | PostgreSQL接続文字列 | 🔴 **最高** | Azure App Service |
| `JWT_SECRET` | JWT署名用シークレット | 🔴 **最高** | Azure App Service |
| `SESSION_SECRET` | セッション管理用シークレット | 🔴 **最高** | Azure App Service |
| `FRONTEND_URL` | フロントエンドURL | 🟡 **高** | Azure App Service |
| `STATIC_WEB_APP_URL` | Azure Static Web AppのURL | 🟡 **高** | Azure App Service |
| `AZURE_STORAGE_CONNECTION_STRING` | BLOBストレージ接続文字列 | 🟡 **高** | Azure App Service |

### 🔧 応急処置として現在ハードコードされている値

以下はデバッグサーバーで一時的に設定されていますが、**本番環境では環境変数で設定する必要があります**：

```javascript
// 現在の応急処置（azure-server-debug.js内）
FRONTEND_URL: 'https://witty-river-012f39e00.1.azurestaticapps.net'
STATIC_WEB_APP_URL: 'https://witty-river-012f39e00.1.azurestaticapps.net'
PORT: 8080
```

## 📋 GitHub Secrets 設定リスト

### 1. フロントエンド用（Client/Static Web App）

| Secret名 | 値の例 | 説明 |
|---------|--------|------|
| `VITE_BACKEND_SERVICE_URL` | `https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net` | バックエンドAPIのURL |
| `VITE_STATIC_WEB_APP_URL` | `https://witty-river-012f39e00.1.azurestaticapps.net` | フロントエンドのURL |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | `[Azure Portal から取得]` | Static Web App デプロイトークン |

### 2. バックエンド用（App Service）

#### 🔴 最優先で設定が必要

| Secret名 | 値の例 | 設定方法 |
|---------|--------|--------|
| `DATABASE_URL` | `postgresql://username:password@servername.postgres.database.azure.com:5432/dbname?sslmode=require` | Azure PostgreSQLから取得 |
| `JWT_SECRET` | `your-very-secure-jwt-secret-key-at-least-32-characters-long` | ランダムな32文字以上の文字列 |
| `SESSION_SECRET` | `your-very-secure-session-secret-key-at-least-32-characters-long` | ランダムな32文字以上の文字列 |

#### 🟡 高優先度

| Secret名 | 値 | 説明 |
|---------|-----|------|
| `FRONTEND_URL` | `https://witty-river-012f39e00.1.azurestaticapps.net` | フロントエンドURL |
| `STATIC_WEB_APP_URL` | `https://witty-river-012f39e00.1.azurestaticapps.net` | Static Web App URL |
| `AZURE_STORAGE_CONNECTION_STRING` | `DefaultEndpointsProtocol=https;AccountName=...` | BLOBストレージ接続文字列 |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | `[Azure Portal から取得]` | App Service デプロイプロファイル |

## 🛠️ 緊急設定手順

### ステップ1: Azure App Service で環境変数を直接設定

1. Azure Portal → App Service "Emergency-Assistance" → 設定 → 環境変数
2. 以下を追加：
   ```
   DATABASE_URL=postgresql://username:password@server.postgres.database.azure.com:5432/dbname?sslmode=require
   JWT_SECRET=generate-secure-32-character-minimum-random-string
   SESSION_SECRET=generate-secure-32-character-minimum-random-string
   FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
   STATIC_WEB_APP_URL=https://witty-river-012f39e00.1.azurestaticapps.net
   NODE_ENV=production
   ```

### ステップ2: 手動でアプリを再起動

Azure Portal → App Service → 概要 → 再起動

### ステップ3: GitHub Secrets の設定

1. GitHub Repository → Settings → Secrets and variables → Actions
2. 上記の環境変数をすべて設定

## 🔍 現在の問題状況

1. **デプロイが発火しない**: GitHub Actionsが実行されていない可能性
2. **503エラー**: 環境変数不足によりサーバーが起動できない
3. **認証エラー**: DATABASE_URLとJWT_SECRETが未設定

## ⚡ 即座に実行すべきアクション

1. Azure App Serviceで最低限の環境変数を設定（上記ステップ1）
2. 手動でApp Serviceを再起動
3. サーバーが応答するか確認
4. GitHub Secretsに同じ値を設定
5. デプロイワークフローを手動実行

## 🎯 成功確認方法

以下のURLが正常に応答すれば成功：
- Health Check: `https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/health`
- Debug Info: `https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/debug/env`