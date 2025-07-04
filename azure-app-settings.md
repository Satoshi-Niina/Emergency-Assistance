# Azure App Settings Configuration Guide

## バックエンド (Azure App Service) 設定

### 1. 環境変数設定

**Azure Portal** → **App Services** → **emergency-backend-api** → **Configuration** → **Application settings**

#### 必須設定
```
DATABASE_URL=postgresql://username:password@host:port/database
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://emergency-backend-api.azurewebsites.net
```

#### 推奨設定
```
NODE_ENV=production
PORT=3001
AZURE_STORAGE_CONNECTION_STRING=your-azure-storage-connection-string
AZURE_STORAGE_CONTAINER_NAME=your-container-name
OPENAI_API_KEY=your-openai-api-key
PERPLEXITY_API_KEY=your-perplexity-api-key
```

#### オプション設定
```
LOG_LEVEL=info
CORS_ORIGIN=https://emergency-frontend.azurestaticapps.net
SESSION_SECRET=your-session-secret
```

### 2. アプリケーション設定

#### スタートアップコマンド
```
node server/index.build.js
```

#### プラットフォーム設定
- **Runtime stack**: Node.js 18 LTS
- **Operating system**: Linux
- **Region**: Japan East

### 3. スケーリング設定

#### 手動スケーリング
- **Instance count**: 1-3 (推奨: 1)

#### 自動スケーリング（オプション）
- **CPU percentage**: 70%
- **Memory percentage**: 80%
- **Instance count**: 1-3

## フロントエンド (Azure Static Web Apps) 設定

### 1. 環境変数設定

**Azure Portal** → **Static Web Apps** → **emergency-frontend** → **Configuration** → **Application settings**

#### 必須設定
```
VITE_API_BASE_URL=https://emergency-backend-api.azurewebsites.net
```

#### 推奨設定
```
VITE_AZURE_SPEECH_KEY=your-azure-speech-key
VITE_AZURE_SPEECH_REGION=japaneast
VITE_APP_VERSION=1.0.0
```

### 2. ルーティング設定

**Configuration** → **Routes** で以下を設定：

```
/api/* -> https://emergency-backend-api.azurewebsites.net/api/*
/* -> /index.html
```

### 3. 認証設定（オプション）

**Configuration** → **Authentication** で以下を設定：

```
Identity providers: Azure Active Directory
```

## データベース (Azure Database for PostgreSQL) 設定

### 1. 接続設定

**Azure Portal** → **Azure Database for PostgreSQL** → **Connection strings**

#### 接続文字列形式
```
postgresql://username:password@host:port/database?sslmode=require
```

### 2. ファイアウォール設定

**Azure Portal** → **Azure Database for PostgreSQL** → **Connection security**

#### 許可するIPアドレス
- Azure App Service の IP アドレス
- 開発用のローカルIPアドレス

### 3. SSL設定

**Azure Portal** → **Azure Database for PostgreSQL** → **Connection security**

#### SSL接続
- **Enforce SSL connection**: Enabled
- **Minimum TLS version**: TLS 1.2

## 監視とログ設定

### 1. Application Insights

**Azure Portal** → **Application Insights** → **emergency-backend-insights**

#### 設定項目
```
Instrumentation Key: your-instrumentation-key
Connection String: your-connection-string
```

### 2. ログ設定

**Azure Portal** → **App Services** → **emergency-backend-api** → **Monitoring** → **Log stream**

#### 有効化するログ
- **Application Logging (Filesystem)**: On
- **Web server logging**: On
- **Detailed error messages**: On
- **Failed request tracing**: On

## バックアップ設定

### 1. データベースバックアップ

**Azure Portal** → **Azure Database for PostgreSQL** → **Backup**

#### 設定
```
Backup retention period: 7 days
Geo-redundant backup: Enabled
```

### 2. ファイルストレージバックアップ

**Azure Portal** → **Storage Accounts** → **your-storage-account** → **Data protection**

#### 設定
```
Point-in-time restore: Enabled
Soft delete: Enabled
```

## セキュリティ設定

### 1. ネットワークセキュリティ

**Azure Portal** → **App Services** → **emergency-backend-api** → **Networking**

#### 設定
```
Access restrictions: Configure IP restrictions
Private endpoints: Configure if needed
```

### 2. 認証設定

**Azure Portal** → **App Services** → **emergency-backend-api** → **Authentication**

#### 設定
```
App Service Authentication: On
Action to take when request is not authenticated: Log in with Azure Active Directory
```

## トラブルシューティング

### 1. よくある問題と解決方法

#### アプリケーションが起動しない
1. **ログを確認**: Log stream でエラーメッセージを確認
2. **環境変数を確認**: Application settings で必須設定を確認
3. **ポート設定を確認**: PORT 環境変数が正しく設定されているか確認

#### データベース接続エラー
1. **接続文字列を確認**: DATABASE_URL が正しい形式か確認
2. **ファイアウォール設定を確認**: Azure App Service のIPが許可されているか確認
3. **SSL設定を確認**: sslmode=require が設定されているか確認

#### CORSエラー
1. **CORS設定を確認**: バックエンドのCORS設定を確認
2. **オリジン設定を確認**: フロントエンドのURLが許可されているか確認

### 2. ログの確認方法

#### Application Logs
```
Azure Portal → App Services → emergency-backend-api → Monitoring → Log stream
```

#### データベースログ
```
Azure Portal → Azure Database for PostgreSQL → Monitoring → Logs
```

#### フロントエンドログ
```
Azure Portal → Static Web Apps → emergency-frontend → Monitoring → Logs
```

## 更新手順

### 1. 環境変数の更新
1. Azure Portal で該当するリソースにアクセス
2. Configuration → Application settings を開く
3. 更新したい設定を編集
4. Save をクリック
5. アプリケーションを再起動

### 2. アプリケーションの再起動
1. Azure Portal で App Service にアクセス
2. Overview → Restart をクリック
3. 再起動完了まで待機

### 3. 設定の反映確認
1. アプリケーションのヘルスチェックエンドポイントにアクセス
2. ログでエラーがないか確認
3. 主要機能が正常に動作するか確認

# Azure App Service 設定手順

## 1. Azure App Service の作成

1. Azure Portal で新しい App Service を作成
2. 名前: `emergency-backend`
3. ランタイム: Node.js 20 LTS
4. プラン: Basic 以上（WebSocket対応のため）

## 2. アプリケーション設定

Azure App Service の「設定」→「アプリケーション設定」で以下を設定：

### 必須環境変数
```
NODE_ENV=production
PORT=8080
```

### データベース設定
```
DATABASE_URL=<your-database-connection-string>
```

### 認証設定
```
SESSION_SECRET=<your-session-secret>
```

### OpenAI設定
```
OPENAI_API_KEY=<your-openai-api-key>
```

### Azure Storage設定
```
AZURE_STORAGE_CONNECTION_STRING=<your-azure-storage-connection-string>
AZURE_STORAGE_ACCOUNT_NAME=<your-storage-account-name>
AZURE_STORAGE_ACCOUNT_KEY=<your-storage-account-key>
STORAGE_CONTAINER_NAME=<your-container-name>
```

### フロントエンドURL
```
FRONTEND_URL=https://your-frontend-url.azurestaticapps.net
```

## 3. GitHub Secrets 設定

GitHub リポジトリの「Settings」→「Secrets and variables」→「Actions」で以下を設定：

### 必須シークレット
- `AZURE_WEBAPP_NAME`: `emergency-backend`
- `AZURE_CREDENTIALS`: Azure Service Principal の認証情報

### 環境変数シークレット
- `OPENAI_API_KEY`
- `AZURE_STORAGE_CONNECTION_STRING`
- `FRONTEND_URL`
- `DATABASE_URL`
- `SESSION_SECRET`
- `STORAGE_CONTAINER_NAME`
- `AZURE_STORAGE_ACCOUNT_NAME`
- `AZURE_STORAGE_ACCOUNT_KEY`

## 4. Azure Service Principal の作成

```bash
# Azure CLI でログイン
az login

# Service Principal を作成
az ad sp create-for-rbac --name "emergency-backend-deploy" --role contributor \
    --scopes /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Web/sites/emergency-backend \
    --sdk-auth

# 出力されたJSONをGitHub SecretsのAZURE_CREDENTIALSに設定
```

## 5. デプロイ確認

1. mainブランチにプッシュ
2. GitHub Actions でデプロイが実行される
3. Azure App Service のログで起動状況を確認
4. `/api/health` エンドポイントで動作確認

## 6. トラブルシューティング

### よくある問題
- 環境変数が設定されていない
- データベース接続エラー
- ポート設定の問題
- ファイルパスの問題

### ログ確認方法
1. Azure Portal → App Service → ログストリーム
2. GitHub Actions の実行ログ
3. アプリケーションログ

## 7. カスタムドメイン設定（オプション）

必要に応じてカスタムドメインを設定：
1. App Service → カスタムドメイン
2. ドメインの追加
3. SSL証明書の設定 