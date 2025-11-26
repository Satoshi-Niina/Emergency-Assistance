# Azure Blob Storage セットアップ - GitHub Secrets 設定ガイド

デプロイが成功してもBLOB接続ができていない場合は、GitHub Secretsに正しい値が設定されていない可能性があります。

## 📋 必要な GitHub Secrets

以下の環境変数をGitHub Secretsに設定する必要があります。

### 1. **AZURE_STORAGE_CONNECTION_STRING** ⭐ 必須
- **形式**: `DefaultEndpointsProtocol=https;AccountName=<account>;AccountKey=<key>;EndpointSuffix=core.windows.net`
- **取得方法**:
  ```bash
  # Azure CLI を使用
  az storage account show-connection-string \
    --name <storage-account-name> \
    --resource-group <resource-group>
  ```
  または、Azure Portal で:
  1. ストレージアカウントを開く
  2. 左側メニューの「アクセスキー」をクリック
  3. 「接続文字列」をコピー

### 2. **AZURE_STORAGE_ACCOUNT_NAME** (オプション - Managed Identity使用時)
- **値**: ストレージアカウントの名前 (例: `yourstorageaccount`)
- **取得方法**:
  ```bash
  az storage account list --query "[].name"
  ```

### 3. **AZURE_STORAGE_CONTAINER_NAME** ⭐ 必須
- **値**: コンテナ名 (デフォルト: `knowledge` または `emergency-exports`)
- **既存のコンテナを確認**:
  ```bash
  az storage container list \
    --account-name <storage-account-name>
  ```
- **コンテナを作成** (存在しない場合):
  ```bash
  az storage container create \
    --name knowledge \
    --account-name <storage-account-name> \
    --public-access blob
  ```

### 4. **BLOB_PREFIX** (オプション)
- **値**: `knowledge-base/` または `exports/`
- 設定されない場合は `knowledge-base` をデフォルトとして使用

## 🔧 GitHub Secrets の設定手順

### ステップ 1: GitHub リポジトリにアクセス
1. https://github.com/Satoshi-Niina/Emergency-Assistance を開く
2. **Settings** タブをクリック
3. 左側メニューの **Secrets and variables** → **Actions** をクリック

### ステップ 2: Secret を追加

各 Secret について、以下を実行します:

#### **New repository secret** をクリック

| Secret 名 | 値 | 例 |
|-----------|-----|-----|
| `AZURE_STORAGE_CONNECTION_STRING` | 接続文字列全体 | `DefaultEndpointsProtocol=https;AccountName=yourstorage;AccountKey=...;EndpointSuffix=core.windows.net` |
| `AZURE_STORAGE_ACCOUNT_NAME` | ストレージアカウント名 | `yourstorage` |
| `AZURE_STORAGE_CONTAINER_NAME` | コンテナ名 | `knowledge` |
| `BLOB_PREFIX` | パスプレフィックス | `knowledge-base/` |

### ステップ 3: 既存の Secrets を確認

> **⚠️ 注意**: GitHub UI では Secret の値は表示できません（セキュリティのため）

代わりに、現在セットされているかどうかだけを確認できます:
- Secret 名の横に ✅ が表示 = セットされている
- Secret が一覧にない = セットされていない

## 🔍 デプロイメント時の確認

デプロイを実行した後、ワークフロー実行ログを確認:

1. GitHub リポジトリの **Actions** タブを開く
2. 最新の "Deploy Server" ワークフローをクリック
3. "Configure app settings" ステップのログで以下を確認:
   ```
   ✅ AZURE_STORAGE_CONNECTION_STRING is set (length: 180)
   ✅ AZURE_STORAGE_ACCOUNT_NAME is set: yourstorage
   ✅ AZURE_STORAGE_CONTAINER_NAME is set: knowledge
   ✅ BLOB_PREFIX set
   ```

## 🚀 接続文字列の取得 - 詳細手順

### Azure CLI を使用 (推奨)

```powershell
# ログイン（初回のみ）
az login

# ストレージアカウントの接続文字列を取得
az storage account show-connection-string `
  --name "yourstorageaccount" `
  --resource-group "your-resource-group"

# 結果:
# {
#   "connectionString": "DefaultEndpointsProtocol=https;AccountName=yourstorageaccount;AccountKey=<key>;EndpointSuffix=core.windows.net"
# }
```

この `connectionString` の値全体をコピーして GitHub Secret に設定します。

### Azure Portal を使用

1. [Azure Portal](https://portal.azure.com) を開く
2. **ストレージアカウント** を検索・開く
3. 対象のストレージアカウントをクリック
4. 左側メニューの **アクセスキー** をクリック
5. **接続文字列** をコピー

## 📊 コンテナ内のデータ構成

Blob Storage には以下のようにファイルが格納されます:

```
knowledge/
├── knowledge-base/
│   ├── exports/
│   │   ├── fault_history_<id>_<timestamp>.json     # 故障履歴データ
│   │   ├── fault_history_<id>_<timestamp>.png      # 故障履歴画像
│   │   ├── machines_<id>_<timestamp>.json          # 基礎データ
│   │   ├── troubleshooting_<id>_<timestamp>.json   # トラブルシューティング
│   │   └── troubleshooting_<id>_<timestamp>.png    # トラブルシューティング画像
│   └── data/
│       └── (その他のデータファイル)
├── documents/
└── images/
```

## ✅ トラブルシューティング

### 症状: BLOB接続エラーが表示される

**確認事項**:

1. **接続文字列が正しいか**
   ```bash
   # 接続文字列をテスト
   az storage account show-connection-string \
     --name yourstorageaccount \
     --resource-group your-resource-group
   ```

2. **コンテナが存在するか**
   ```bash
   az storage container exists \
     --name knowledge \
     --connection-string "<connection-string>"
   ```

3. **App Service の環境変数が設定されているか**
   ```bash
   az webapp config appsettings list \
     --resource-group your-resource-group \
     --name your-app-service-name \
     --query "[?contains(name, 'AZURE_STORAGE')]"
   ```

4. **ネットワークアクセスが許可されているか**
   - ストレージアカウント → **ネットワーク** → **ファイアウォールと仮想ネットワーク**
   - "すべてのネットワークからアクセスを許可" が有効か確認

### 症状: ファイルは保存されるが読み込めない

- コンテナのアクセスレベルを確認
  ```bash
  az storage container show-permission \
    --name knowledge \
    --account-name yourstorageaccount
  ```
- Public access が有効になっているか確認
  - `access: "blob"` 以上である必要があります

### 症状: GitHubワークフローが実行されない

1. **Repository Secrets が正しく設定されているか確認**
   - Settings → Secrets and variables → Actions
   - 各 Secret が ✅ 表示されているか

2. **ワークフローの実行トリガーを確認**
   - `.github/workflows/deploy-server-AppCervce.yml` の `on:` セクション確認
   - `push: branches: [main]` になっているか

## 🔐 セキュリティのベストプラクティス

- ❌ **しないこと**:
  - 接続文字列をコミットに含めない
  - 接続文字列を `env.production` に平文で書かない
  - 接続文字列をログに出力しない

- ✅ **すべきこと**:
  - 接続文字列は GitHub Secrets で管理
  - 定期的にアクセスキーをローテーション
  - 必要に応じて新しいストレージアカウントキーを生成

## 📞 サポート

問題が解決しない場合:

1. **ワークフロー ログ** を確認
   - Actions タブ → 最新のデプロイ → ステップログ

2. **App Service ログ** を確認
   ```bash
   az webapp log tail \
     --resource-group your-resource-group \
     --name your-app-service-name
   ```

3. **Blob Storage のアクセス** をテスト
   ```bash
   az storage blob list \
     --container-name knowledge \
     --account-name yourstorageaccount
   ```
