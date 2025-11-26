# Blob Storage トラブルシューティング ガイド

## 現在の状況

✅ デプロイメント成功
✅ ログイン機能 正常
✅ データベース接続 正常
❌ **BLOB ストレージ接続 失敗** ← これが原因でファイルが読み込まれない

## 🎯 問題の原因

以下の3つのいずれかが原因と考えられます：

### 原因1: GitHub Secrets が設定されていない ⭐ 最も可能性が高い

CI/CD パイプラインは GitHub Secrets から環境変数を取得して App Service に設定します。
**GitHub Secrets に値がセットされていないと、App Service にも環境変数が設定されません。**

#### 確認方法

1. GitHub リポジトリを開く
2. **Settings** → **Secrets and variables** → **Actions**
3. 以下の4つが表示されているか確認：
   - ✅ `AZURE_STORAGE_CONNECTION_STRING`
   - ✅ `AZURE_STORAGE_ACCOUNT_NAME`
   - ✅ `AZURE_STORAGE_CONTAINER_NAME`
   - ⚠️ `BLOB_PREFIX` (オプション)

**すべての Secret が表示されていない場合は、ここが問題です！**

#### 修正方法

```bash
# 1. Azure Storage 接続文字列を取得
az storage account show-connection-string \
  --name <storage-account-name> \
  --resource-group <resource-group>

# 2. GitHub Secrets に設定
# https://github.com/Satoshi-Niina/Emergency-Assistance/settings/secrets/actions
# → "New repository secret" をクリック
# → 以下を入力：
#   Name: AZURE_STORAGE_CONNECTION_STRING
#   Value: (上で取得した接続文字列全体)
```

### 原因2: GitHub Secrets の値が間違っている

Secret は設定されているが、値が正しくない場合。

#### 確認方法

App Service で実際の環境変数を確認：

```powershell
az webapp config appsettings list \
  --resource-group <resource-group> \
  --name <app-service-name> \
  --query "[?name=='AZURE_STORAGE_CONNECTION_STRING']"
```

結果が空の配列 `[]` であれば、環境変数が設定されていません。

### 原因3: Blob Storage のネットワークアクセス制限

ストレージアカウントのファイアウォール設定で、App Service からのアクセスがブロックされている。

#### 確認方法

Azure Portal:
1. ストレージアカウント → **ネットワーク**
2. **ファイアウォールと仮想ネットワーク**
3. 設定を確認：
   - `☑️ すべてのネットワークからアクセスを許可` なら OK
   - `☑️ 選択した仮想ネットワークと IP アドレスからアクセスを許可` の場合は、App Service の IP をホワイトリストに追加

## 🔧 ステップバイステップ修正ガイド

### ステップ 1: 必要な情報を収集

```bash
# ストレージアカウント名を確認
az storage account list --query "[].name"

# リソースグループを確認
az storage account show \
  --name <storage-account-name> \
  --query "resourceGroup"

# コンテナ一覧を確認
az storage container list \
  --account-name <storage-account-name>

# 接続文字列を取得
az storage account show-connection-string \
  --name <storage-account-name> \
  --resource-group <resource-group>
```

メモ:
- Storage Account Name: `_________________`
- Resource Group: `_________________`
- Container Name: `_________________`
- Connection String: `_________________`

### ステップ 2: GitHub Secrets を設定

1. https://github.com/Satoshi-Niina/Emergency-Assistance/settings/secrets/actions を開く

2. **New repository secret** をクリック

3. 以下4つの Secret を追加（1つずつ）：

#### Secret 1: AZURE_STORAGE_CONNECTION_STRING
```
Name: AZURE_STORAGE_CONNECTION_STRING
Value: DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net
```

#### Secret 2: AZURE_STORAGE_ACCOUNT_NAME
```
Name: AZURE_STORAGE_ACCOUNT_NAME
Value: yourstorageaccount
```

#### Secret 3: AZURE_STORAGE_CONTAINER_NAME
```
Name: AZURE_STORAGE_CONTAINER_NAME
Value: knowledge
(または別のコンテナ名)
```

#### Secret 4: BLOB_PREFIX (オプション)
```
Name: BLOB_PREFIX
Value: knowledge-base/
```

### ステップ 3: デプロイメントをトリガー

Secrets 設定後、デプロイメントを実行：

```bash
# main ブランチに push（CI/CD トリガー）
git push origin main

# または GitHub Actions を手動実行
# GitHub → Actions → Deploy Server → Run workflow
```

### ステップ 4: ワークフローログを確認

1. GitHub → **Actions** タブ
2. 最新の "Deploy Server (Docker Container)" ワークフローをクリック
3. "Configure app settings" ステップのログを確認

**成功時のログ例**:
```
✅ AZURE_STORAGE_CONNECTION_STRING is set (length: 180)
✅ AZURE_STORAGE_ACCOUNT_NAME is set: yourstorageaccount
✅ AZURE_STORAGE_CONTAINER_NAME is set: knowledge
```

### ステップ 5: App Service で環境変数を確認

```powershell
# 診断スクリプト実行（推奨）
cd scripts
./diagnose-blob-config.ps1

# または Azure CLI で確認
az webapp config appsettings list \
  --resource-group <resource-group> \
  --name <app-service-name> \
  --query "[?contains(name, 'AZURE_STORAGE')]"
```

### ステップ 6: BLOB 接続をテスト

```bash
# App Service が BLOB にアクセスできるかテスト
az storage container exists \
  --connection-string "<connection-string>" \
  --name "<container-name>"

# 結果が true なら成功
```

### ステップ 7: UI でテスト

デプロイ完了後、以下の3つの UI からファイルを読み込めるかテスト：

1. **故障履歴管理 UI**
   - 過去の故障データを開く
   - JSON データと画像が表示されるか確認

2. **基礎データ管理 UI**
   - 保存された機械データを開く
   - データが表示されるか確認

3. **応急復旧データ管理 UI**
   - フロー管理・編集から既存データを開く
   - トラブルシューティング JSON と画像が表示されるか確認

## 📊 診断コマンド一覧

### GitHub Secrets を確認
```powershell
# GitHub Secrets の設定状況を確認（手動）
# https://github.com/Satoshi-Niina/Emergency-Assistance/settings/secrets/actions
```

### App Service の環境変数を確認
```powershell
az webapp config appsettings list `
  --resource-group <resource-group> `
  --name <app-service-name> `
  --query "[?contains(name, 'STORAGE') || contains(name, 'BLOB')]" `
  -o table
```

### BLOB 接続をテスト
```bash
az storage container exists \
  --connection-string "<connection-string>" \
  --name "<container-name>"
```

### App Service ログを確認
```bash
az webapp log tail \
  --resource-group <resource-group> \
  --name <app-service-name> \
  --provider application
```

### コンテナ内のファイルを確認
```bash
az storage blob list \
  --connection-string "<connection-string>" \
  --container-name "<container-name>" \
  --query "[].name"
```

## 🎬 期待される動作

### 正常時のフロー

1. **UI でデータを開く**
   ↓
2. **API エンドポイント呼び出し**
   - `/api/history/{id}` など
   ↓
3. **API が BLOB から取得**
   - `getBlobServiceClient()` で接続
   - コンテナからファイルを読み込み
   ↓
4. **JSON データと画像を返却**
   ↓
5. **UI に表示される**

### 現在起きていること（問題時）

1. **UI でデータを開く**
   ↓
2. **API エンドポイント呼び出し**
   ↓
3. **API が BLOB 接続失敗**
   - `AZURE_STORAGE_CONNECTION_STRING` が未設定
   - または接続文字列が不正
   ↓
4. **エラーが返却される**
   ↓
5. **UI にデータが表示されない**

## 📖 関連ドキュメント

- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - 本番デプロイメント完全ガイド
- [BLOB_SETUP.md](BLOB_SETUP.md) - GitHub Secrets 詳細設定
- [server/.env.production](../server/.env.production) - 本番環境テンプレート

## 💬 よくある質問

**Q: GitHub Secrets を設定したのに環境変数が反映されない**

A: 以下の順序で確認:
1. Secrets が正しく保存されたか確認（GitHub UI で ✅ が表示されているか）
2. Secrets 設定後に git push で新しいデプロイメントをトリガーしたか
3. ワークフローが成功したか（Actions タブで確認）
4. App Service が正しく更新されたか（az cli で確認）

**Q: デプロイメント後、どのくらいで反映されるのか**

A: 通常 5-10 分で完了します。ワークフロー実行中は Actions タブで進行状況を確認できます。

**Q: 接続文字列をどこで確認できるのか**

A: 以下の3つの方法:
1. Azure CLI: `az storage account show-connection-string --name <account-name>`
2. Azure Portal: ストレージアカウント → アクセスキー
3. Azure Storage Explorer: アカウント右クリック → プロパティ

**Q: BLOB にアップロードしたファイルはどこに保存されるのか**

A: `knowledge` コンテナ（または指定したコンテナ）の `knowledge-base/exports/` フォルダに保存されます。

**Q: ローカル環境では動作するのに本番環境で動作しない理由**

A: ローカル環境ではローカルファイルシステムを使用、本番環境では Azure Blob Storage を使用しているためです。BLOB の環境変数が未設定だと、BLOB へのアクセスが失敗します。
