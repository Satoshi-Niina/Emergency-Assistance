# BLOB Storage セットアップ - クイックスタート

## 🚨 問題状況

- ✅ デプロイメント成功
- ✅ ログイン機能 動作
- ✅ データベース接続 成功
- ❌ **BLOB ストレージ接続 失敗** → ファイルが読み込まれない

## ⚡ 即座に実行すべきこと

### 1️⃣ 接続文字列を取得（5分）

```bash
# Azure CLI で接続文字列を確認
az storage account show-connection-string \
  --name <your-storage-account-name> \
  --resource-group <your-resource-group>

# 結果例:
# {
#   "connectionString": "DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"
# }
```

### 2️⃣ GitHub Secrets に設定（3分）

1. ブラウザで開く:
   https://github.com/Satoshi-Niina/Emergency-Assistance/settings/secrets/actions

2. **New repository secret** をクリック

3. 以下を1つずつ追加:

| 順番 | Name | Value |
|-----|------|-------|
| 1️⃣ | `AZURE_STORAGE_CONNECTION_STRING` | (上で取得した接続文字列全体) |
| 2️⃣ | `AZURE_STORAGE_ACCOUNT_NAME` | `yourstorageaccount` |
| 3️⃣ | `AZURE_STORAGE_CONTAINER_NAME` | `knowledge` |
| 4️⃣ | `BLOB_PREFIX` | `knowledge-base/` (オプション) |

### 3️⃣ デプロイメントをトリガー（10分）

```bash
# GitHub Actions で新しいデプロイメントを実行
git push origin main

# または GitHub UI で:
# Actions → Deploy Server (Docker Container) → Run workflow
```

### 4️⃣ ワークフローを確認（3分）

GitHub Actions のログを確認:
- https://github.com/Satoshi-Niina/Emergency-Assistance/actions

最新のワークフローで以下が表示されるか確認:
```
✅ AZURE_STORAGE_CONNECTION_STRING is set (length: XXX)
✅ AZURE_STORAGE_ACCOUNT_NAME is set: yourstorageaccount
✅ AZURE_STORAGE_CONTAINER_NAME is set: knowledge
```

### 5️⃣ UI でテスト（5分）

デプロイメント完了後、アプリで以下をテスト:

1. **故障履歴管理** → 過去のデータを開く
   画像と JSON データが表示されるか確認

2. **基礎データ管理** → 保存されたマシンデータを開く
   データが表示されるか確認

3. **応急復旧データ管理** → フロー編集で既存データを開く
   フロー図と画像が表示されるか確認

---

**合計時間: 約 25 分**

## 📋 必要な情報を集める

実行前に以下を確認・メモしておく:

```
Azure ストレージアカウント情報:
  - Account Name: __________________________
  - Resource Group: ________________________
  - Container Name: ________________________

接続文字列:
  - DefaultEndpointsProtocol=https;AccountName=...
    __________________________________________________
```

## 🔍 実行時のトラブルシューティング

### Q: 接続文字列が見つからない
```bash
# ストレージアカウント一覧を確認
az storage account list --query "[].name"

# リソースグループを確認
az storage account list --query "[].resourceGroup" -d

# 接続文字列を取得
az storage account show-connection-string --name <account-name>
```

### Q: GitHub Secrets に設定しても反映されない

確認事項:
1. Secret の名前が正しいか（大文字小文字を区別）
2. `git push` で新しいデプロイメントをトリガーしたか
3. GitHub Actions ワークフローが完了したか
4. ワークフロー実行ログで `✅` が表示されているか

### Q: BLOB に接続できない（ワークフロー成功後）

```bash
# 環境変数が実際に設定されているか確認
az webapp config appsettings list \
  --resource-group <resource-group> \
  --name <app-service-name> \
  --query "[?contains(name, 'AZURE_STORAGE')]"

# コンテナにアクセスできるか確認
az storage container exists \
  --connection-string "<connection-string>" \
  --name "<container-name>"
```

## 📚 詳細ドキュメント

- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - 完全セットアップガイド
- [BLOB_SETUP.md](BLOB_SETUP.md) - GitHub Secrets 設定詳細
- [TROUBLESHOOTING_BLOB.md](TROUBLESHOOTING_BLOB.md) - トラブルシューティング

## ✨ 成功の目安

以下がすべて ✅ なら BLOB セットアップは完了:

- [ ] GitHub Secrets に4つの値が設定されている
- [ ] GitHub Actions ワークフローが完了している
- [ ] App Service に環境変数が設定されている
- [ ] BLOB コンテナにアクセスできる
- [ ] UI でファイルが読み込まれる

---

**質問や問題があれば、上記のドキュメントリンクを参照してください！**
