# Azure Static Web Apps 環境変数設定手順

## 🔧 Azure Portal での設定手順

### 1. Azure Static Web Apps の管理画面にアクセス

1. [Azure Portal](https://portal.azure.com) にログイン
2. リソースグループから `Emergency-Assistance` アプリを選択
3. 左メニューから「設定」→「構成」を選択

### 2. 必須環境変数の設定

以下の環境変数を「新しいアプリケーション設定」で追加してください：

#### データベース設定

```
名前: DATABASE_URL
値: postgresql://your-admin@your-postgres-server.postgres.database.azure.com:5432/webappdb?sslmode=require
```

#### Azure Storage 設定

```
名前: AZURE_STORAGE_CONNECTION_STRING
値: DefaultEndpointsProtocol=https;AccountName=YOUR_STORAGE_ACCOUNT;AccountKey=YOUR_STORAGE_KEY;EndpointSuffix=core.windows.net

名前: AZURE_STORAGE_CONTAINER_NAME
値: knowledge-base
```

#### セッション設定

```
名前: SESSION_SECRET
値: [32文字以上のランダムな文字列]
```

#### API 設定

```
名前: OPENAI_API_KEY
値: [あなたのOpenAI APIキー]

名前: NODE_ENV
値: production

名前: LOG_LEVEL
値: info
```

#### フロントエンド設定

```
名前: VITE_API_BASE_URL
値: https://salmon-desert-065ec5000.1.azurestaticapps.net
```

## 🗝️ Azure Key Vault を使用した機密情報管理（推奨）

### Key Vault の作成と設定

1. **Key Vault の作成**

   ```bash
   az keyvault create \\
     --name "emergency-assistance-kv" \\
     --resource-group "your-resource-group" \\
     --location "Japan East"
   ```

2. **シークレットの追加**

   ```bash
   # OpenAI API Key
   az keyvault secret set \\
     --vault-name "emergency-assistance-kv" \\
     --name "openai-api-key" \\
     --value "your-openai-api-key"

   # Session Secret
   az keyvault secret set \\
     --vault-name "emergency-assistance-kv" \\
     --name "session-secret" \\
     --value "your-session-secret"

   # Database URL
   az keyvault secret set \\
     --vault-name "emergency-assistance-kv" \\
     --name "database-url" \\
     --value "your-database-connection-string"
   ```

3. **Static Web Apps からの Key Vault 参照**

   ```
   名前: OPENAI_API_KEY
   値: @Microsoft.KeyVault(VaultName=emergency-assistance-kv;SecretName=openai-api-key)

   名前: SESSION_SECRET
   値: @Microsoft.KeyVault(VaultName=emergency-assistance-kv;SecretName=session-secret)

   名前: DATABASE_URL
   値: @Microsoft.KeyVault(VaultName=emergency-assistance-kv;SecretName=database-url)
   ```

## 📊 Azure Storage Account の設定

### 1. Storage Account の作成

```bash
az storage account create \\
  --name "emergencyassistancestorage" \\
  --resource-group "your-resource-group" \\
  --location "Japan East" \\
  --sku "Standard_LRS" \\
  --kind "StorageV2"
```

### 2. Container の作成

```bash
az storage container create \\
  --name "knowledge-base" \\
  --account-name "emergencyassistancestorage" \\
  --public-access blob
```

### 3. 接続文字列の取得

```bash
az storage account show-connection-string \\
  --name "emergencyassistancestorage" \\
  --resource-group "your-resource-group"
```

## 🛡️ セキュリティ設定

### 1. CORS 設定

Azure Storage Account で CORS を設定：

```json
{
  "CorsRules": [
    {
      "AllowedOrigins": [
        "https://salmon-desert-065ec5000.1.azurestaticapps.net",
        "https://localhost:5002"
      ],
      "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "AllowedHeaders": ["*"],
      "ExposedHeaders": ["*"],
      "MaxAgeInSeconds": 86400
    }
  ]
}
```

### 2. Azure PostgreSQL ファイアウォール設定

```bash
# Azure サービスからのアクセスを許可
az postgres flexible-server firewall-rule create \\
  --resource-group "your-resource-group" \\
  --name "your-postgres-server" \\
  --rule-name "AllowAzureServices" \\
  --start-ip-address 0.0.0.0 \\
  --end-ip-address 0.0.0.0
```

## ✅ 設定確認方法

### 1. 環境変数の確認

Azure Portal の Static Web Apps の「構成」画面で、全ての環境変数が正しく設定されていることを確認

### 2. 接続テスト

デプロイ後、以下のエンドポイントでテスト：

```
https://salmon-desert-065ec5000.1.azurestaticapps.net/api/health
```

期待される応答：

```json
{
  "status": "ok",
  "timestamp": "2024-01-XX...",
  "service": "Emergency Assistance API"
}
```

### 3. データベース接続確認

アプリケーションログで以下を確認：

- データベース接続エラーがないこと
- テーブルアクセスが正常に行われていること

## 🚨 トラブルシューティング

### よくある問題と解決方法

1. **データベース接続エラー**

   - `sslmode=require` パラメータが含まれているか確認
   - ファイアウォール設定で Azure サービスが許可されているか確認

2. **CORS エラー**

   - `staticwebapp.config.json` の設定を確認
   - Storage Account の CORS 設定を確認

3. **環境変数が読み込まれない**

   - 変数名にタイポがないか確認
   - アプリケーションの再起動を試行

4. **API が応答しない**
   - `api_location` が正しく設定されているか確認
   - API ファイルの形式が正しいか確認
