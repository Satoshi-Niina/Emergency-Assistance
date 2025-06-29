# Azure Web App 環境変数設定

## 必須環境変数

```bash
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://emergency-assistance-app.azurestaticapps.net
DATABASE_URL=postgresql://username:password@host:port/database
SESSION_SECRET=your-super-secret-session-key
```

## 推奨環境変数

```bash
# Azure Storage設定
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=your-storage-account;AccountKey=your-account-key;EndpointSuffix=core.windows.net
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account
AZURE_STORAGE_ACCOUNT_KEY=your-account-key
AZURE_STORAGE_CONTAINER_NAME=knowledge-base

# OpenAI設定
OPENAI_API_KEY=your-openai-api-key

# Azure Speech設定（音声機能を使用する場合）
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=japaneast

# セキュリティ設定
TRUST_PROXY=true
CORS_ORIGIN=https://emergency-assistance-app.azurestaticapps.net

# ログ設定
LOG_LEVEL=info
```

## Azure CLIでの設定方法

```bash
# 環境変数を設定
az webapp config appsettings set \
  --name emergency-backend-api \
  --resource-group your-resource-group \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    FRONTEND_URL="https://emergency-assistance-app.azurestaticapps.net" \
    DATABASE_URL="your-database-connection-string" \
    SESSION_SECRET="your-super-secret-session-key" \
    AZURE_STORAGE_CONNECTION_STRING="your-azure-storage-connection-string" \
    AZURE_STORAGE_ACCOUNT_NAME="your-storage-account" \
    AZURE_STORAGE_ACCOUNT_KEY="your-account-key" \
    AZURE_STORAGE_CONTAINER_NAME="knowledge-base" \
    OPENAI_API_KEY="your-openai-api-key" \
    TRUST_PROXY=true \
    CORS_ORIGIN="https://emergency-assistance-app.azurestaticapps.net"
```

## 設定確認方法

```bash
# 現在の設定を確認
az webapp config appsettings list \
  --name emergency-backend-api \
  --resource-group your-resource-group
``` 