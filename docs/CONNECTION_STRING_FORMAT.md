# Azure Storage 接続文字列の正しい形式

## ❌ 間違った形式

```
DefaultEndpointsProtocol=https;rgemergencyassistanb25b
```

この形式は**不完全**です。`AccountName=` と `AccountKey=` が欠けています。

## ✅ 正しい形式

```
DefaultEndpointsProtocol=https;AccountName=<ストレージアカウント名>;AccountKey=<アクセスキー>;EndpointSuffix=core.windows.net
```

### 例

```
DefaultEndpointsProtocol=https;AccountName=gemergencyassistanb25b;AccountKey=QYvpMTeeNO*****StxGyDfw==;EndpointSuffix=core.windows.net
```

## 🔍 接続文字列の取得方法

### 方法1: Azure CLI を使用（推奨）

```powershell
# 1. ストレージアカウント名を確認
az storage account list --query "[].{Name:name, ResourceGroup:resourceGroup}" --output table

# 2. 接続文字列を取得（実際のストレージアカウント名を使用）
az storage account show-connection-string `
  --name "gemergencyassistanb25b" `
  --resource-group "<リソースグループ名>"
```

**出力例**:
```json
{
  "connectionString": "DefaultEndpointsProtocol=https;AccountName=gemergencyassistanb25b;AccountKey=QYvpMTeeNO*****StxGyDfw==;EndpointSuffix=core.windows.net"
}
```

この `connectionString` の値**全体**をコピーして GitHub Secret に設定します。

### 方法2: Azure Portal を使用

1. [Azure Portal](https://portal.azure.com) を開く
2. **ストレージアカウント** を検索
3. ストレージアカウント `gemergencyassistanb25b` を開く
4. 左側メニューの **アクセスキー** をクリック
5. **接続文字列** の値をコピー

## 📋 現在の設定の確認

現在の設定:
- `AZURE_STORAGE_ACCOUNT_NAME=gemergencyassistanb25b`

この値が正しいか確認するには:

```powershell
# ストレージアカウントの一覧を表示
az storage account list --query "[].{Name:name, ResourceGroup:resourceGroup}" --output table
```

**注意**: `rgemergencyassistanb25b` はリソースグループ名のように見えます。ストレージアカウント名は通常、小文字と数字のみで、24文字以内です。

## 🔧 GitHub Secrets の設定

### 必要なシークレット

1. **AZURE_STORAGE_CONNECTION_STRING** ⭐ 必須
   - 値: `DefaultEndpointsProtocol=https;AccountName=gemergencyassistanb25b;AccountKey=<実際のキー>;EndpointSuffix=core.windows.net`
   - 上記の方法で取得した接続文字列全体を設定

2. **AZURE_STORAGE_ACCOUNT_NAME** (オプション)
   - 値: `gemergencyassistanb25b` (実際のストレージアカウント名)

3. **AZURE_STORAGE_CONTAINER_NAME** ⭐ 必須
   - 値: `knowledge`

4. **BLOB_PREFIX** (オプション)
   - 値: `knowledge-base/`

## ⚠️ 重要な注意点

1. **接続文字列は完全な形式である必要があります**
   - `AccountName=` と `AccountKey=` が含まれていること
   - `EndpointSuffix=core.windows.net` が含まれていること

2. **ストレージアカウント名の確認**
   - `rgemergencyassistanb25b` はリソースグループ名の可能性があります
   - 実際のストレージアカウント名を確認してください

3. **アクセスキーの取得**
   - Azure Portal または Azure CLI で取得できます
   - キー1またはキー2のどちらかを使用できます

## 🧪 接続文字列のテスト

設定後、接続文字列が正しいかテストできます:

```powershell
# 接続文字列を変数に設定
$connectionString = "DefaultEndpointsProtocol=https;AccountName=gemergencyassistanb25b;AccountKey=<実際のキー>;EndpointSuffix=core.windows.net"

# コンテナの存在確認
az storage container exists `
  --name knowledge `
  --connection-string $connectionString
```

結果が `true` なら、接続文字列は正しく設定されています。

