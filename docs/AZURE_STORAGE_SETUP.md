# Azure Storage Configuration Guide
# Azure Storageの設定ガイド

このガイドでは、Emergency Assistanceアプリケーションでの信頼性の高いAzure Blob Storageの設定方法について説明します。

## 必要な環境変数

### Azure Storage認証

以下のいずれかの方法で認証を設定してください：

#### 方法1: Connection String（推奨 - 開発環境）
```bash
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=youraccountname;AccountKey=youraccountkey;EndpointSuffix=core.windows.net"
```

#### 方法2: Account Name + Key
```bash
AZURE_STORAGE_ACCOUNT_NAME="youraccountname"
AZURE_STORAGE_ACCOUNT_KEY="youraccountkey"
```

#### 方法3: Managed Identity（推奨 - 本番環境）
```bash
AZURE_STORAGE_ACCOUNT_NAME="youraccountname"
# Azure App Serviceでmanaged identityが有効化されている場合、キーは不要
```

### コンテナ設定
```bash
AZURE_STORAGE_CONTAINER_NAME="emergency-assistance"  # オプション、デフォルト値
```

### Knowledge Base パス設定
```bash
KNOWLEDGE_BASE_PATH="/path/to/knowledge-base"  # オプション、デフォルトはプロジェクトフォルダ内
```

## Azure App Service での設定手順

### 1. Azure Storage Accountの作成
```bash
# Azure CLIを使用
az storage account create \
  --name yourstorageaccount \
  --resource-group your-resource-group \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# コンテナの作成
az storage container create \
  --name emergency-assistance \
  --account-name yourstorageaccount \
  --public-access off
```

### 2. App Service でのManaged Identity有効化
```bash
# System-assigned managed identityを有効化
az webapp identity assign \
  --name your-app-name \
  --resource-group your-resource-group
```

### 3. Storage Accountへのアクセス権限付与
```bash
# App ServiceのManaged IdentityにStorage Blob Data Contributorロールを付与
az role assignment create \
  --assignee $(az webapp identity show --name your-app-name --resource-group your-resource-group --query principalId -o tsv) \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/your-subscription-id/resourceGroups/your-resource-group/providers/Microsoft.Storage/storageAccounts/yourstorageaccount
```

### 4. App Service Application Settings
Azure PortalのApp Service > Configuration > Application settingsで以下を設定：

```
AZURE_STORAGE_ACCOUNT_NAME = yourstorageaccount
AZURE_STORAGE_CONTAINER_NAME = emergency-assistance
NODE_ENV = production
KNOWLEDGE_BASE_PATH = /tmp/knowledge-base
```

## ローカル開発環境での設定

### .env ファイル
```bash
# .env
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=youraccountname;AccountKey=youraccountkey;EndpointSuffix=core.windows.net"
AZURE_STORAGE_CONTAINER_NAME="emergency-assistance-dev"
NODE_ENV="development"
```

### テスト用コマンド
```bash
# ストレージ接続テスト
curl http://localhost:3000/api/storage/status

# 手動同期実行
curl -X POST http://localhost:3000/api/storage/sync

# ファイル一覧取得
curl "http://localhost:3000/api/storage/files?prefix=knowledge-base&limit=50"
```

## 機能の説明

### 自動同期機能
- **本番環境**: 5分間隔で自動同期
- **開発環境**: 30分間隔で自動同期
- **対象ファイル**: `.json`, `.txt`, `.md`, `.pdf`, `.jpg`, `.jpeg`, `.png`, `.gif`
- **除外ファイル**: `.tmp`, `.temp`, `.log`

### パス管理
- **ローカルパス**: 
  - 本番: `/tmp/knowledge-base`, `/tmp/emergency-temp`, `/tmp/emergency-uploads`
  - 開発: `./knowledge-base`, `./temp`, `./uploads`
- **Azureパス**: 
  - `knowledge-base/`, `temp/`, `uploads/`

### エラーハンドリング
- **リトライ機能**: 最大3回（本番は5回）のリトライ
- **指数バックオフ**: 失敗時の待機時間を段階的に増加
- **ヘルスチェック**: アプリ起動時とAPI経由でのストレージ状態確認

### セキュリティ
- **Managed Identity**: 本番環境での推奨認証方法
- **Connection String暗号化**: 環境変数での安全な管理
- **パス正規化**: セキュリティリスクを回避する安全なパス処理

## 監視とトラブルシューティング

### ログの確認
アプリケーションログで以下を確認：
```
🚀 Initializing Enhanced Storage Configuration...
✅ Storage directories initialized successfully
🔍 Azure Storage Health Check: { status: 'healthy', ... }
✅ Azure Storage sync manager started
```

### 一般的な問題と解決方法

#### 1. "Container initialization failed"
- ストレージアカウント名が正しいか確認
- 認証情報（キーまたはマネージドID）が正しいか確認
- ネットワーク接続を確認

#### 2. "Sync failed"
- ファイルサイズが大きすぎる場合は分割アップロードを検討
- 一時的なネットワーク問題の可能性があるため、手動同期を試行

#### 3. "Storage health check failed"
- Azure Storage Accountが正常に動作しているか確認
- ファイアウォール設定でApp Serviceからのアクセスが許可されているか確認

### Azure Monitor での監視
```bash
# Storage Account メトリクスの確認
az monitor metrics list \
  --resource /subscriptions/your-subscription-id/resourceGroups/your-resource-group/providers/Microsoft.Storage/storageAccounts/yourstorageaccount \
  --metric Availability \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z
```

## パフォーマンス最適化

### 推奨設定
- **Standard_LRS**: 一般的な用途に最適
- **Hot tier**: 頻繁にアクセスするファイル用
- **Cool tier**: アーカイブファイル用

### 大容量ファイル対応
- 100MB以上のファイルは自動的にブロックアップロードを使用
- 並列アップロードで転送速度向上

このガイドに従って設定することで、信頼性の高いAzure Blob Storage統合が実現できます。
