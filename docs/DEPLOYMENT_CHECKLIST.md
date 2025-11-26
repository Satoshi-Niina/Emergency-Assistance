# 本番環境デプロイメント - BLOB ストレージセットアップチェックリスト

## 📋 概要

このドキュメントでは、Emergency Assistance システムを本番環境（Azure App Service）にデプロイする際に必要な BLOB ストレージ設定を説明します。

**現在の状況**: デプロイは成功しているが、BLOB に接続できないため、ファイルが読み込まれていない

## ✅ チェックリスト

### フェーズ 1: Azure Storage アカウント確認

- [ ] Azure Storage アカウントが作成されている
- [ ] ストレージアカウント名を確認: `____________`
- [ ] リソースグループを確認: `____________`
- [ ] アカウントキーを確認:
  ```bash
  az storage account keys list --name <account-name>
  ```

### フェーズ 2: Blob コンテナ確認

- [ ] コンテナが作成されている
- [ ] コンテナ名を確認: `____________` (推奨: `knowledge` または `emergency-exports`)
- [ ] コンテナのアクセスレベルを確認（Public access が `Blob` 以上）
  ```bash
  az storage container show-permission --name <container-name> --account-name <account-name>
  ```

### フェーズ 3: GitHub Secrets 設定

以下の4つの Secret を GitHub に設定してください：

#### 3.1 AZURE_STORAGE_CONNECTION_STRING (✅ 必須)

1. Azure CLI で接続文字列を取得:
   ```bash
   az storage account show-connection-string \
     --name <storage-account-name> \
     --resource-group <resource-group-name>
   ```

2. または Azure Portal から:
   - ストレージアカウント → **アクセスキー** → **接続文字列をコピー**

3. GitHub Secrets に設定:
   - Repository: https://github.com/Satoshi-Niina/Emergency-Assistance
   - Settings → Secrets and variables → Actions
   - **New repository secret**
   - Name: `AZURE_STORAGE_CONNECTION_STRING`
   - Value: (上で取得した接続文字列全体)
   - **Add secret** をクリック

- [ ] `AZURE_STORAGE_CONNECTION_STRING` が設定されている

#### 3.2 AZURE_STORAGE_ACCOUNT_NAME (✅ 必須)

1. ストレージアカウント名を確認:
   ```bash
   az storage account list --query "[].name"
   ```

2. GitHub Secrets に設定:
   - Name: `AZURE_STORAGE_ACCOUNT_NAME`
   - Value: `<storage-account-name>` (例: `yourstorageaccount`)

- [ ] `AZURE_STORAGE_ACCOUNT_NAME` が設定されている

#### 3.3 AZURE_STORAGE_CONTAINER_NAME (✅ 必須)

1. コンテナ名を確認:
   ```bash
   az storage container list --account-name <account-name>
   ```

2. GitHub Secrets に設定:
   - Name: `AZURE_STORAGE_CONTAINER_NAME`
   - Value: `knowledge` (または別のコンテナ名)

- [ ] `AZURE_STORAGE_CONTAINER_NAME` が設定されている

#### 3.4 BLOB_PREFIX (オプション)

1. GitHub Secrets に設定:
   - Name: `BLOB_PREFIX`
   - Value: `knowledge-base/` (オプション - 設定しなくても自動)

- [ ] `BLOB_PREFIX` が設定されている (オプション)

### フェーズ 4: デプロイメント検証

以下のステップでデプロイメントを実行・確認:

1. GitHub Secrets 設定後、main ブランチにプッシュ:
   ```bash
   git push origin main
   ```

2. GitHub Actions を確認:
   - Repository → **Actions** タブ
   - 最新の "Deploy Server (Docker Container)" ワークフロー
   - ステップ "Configure app settings" のログで以下を確認:
     ```
     ✅ AZURE_STORAGE_CONNECTION_STRING is set (length: XXX)
     ✅ AZURE_STORAGE_ACCOUNT_NAME is set: yourstorageaccount
     ✅ AZURE_STORAGE_CONTAINER_NAME is set: knowledge
     ```

- [ ] デプロイメント完了
- [ ] BLOB 設定ログで✅が表示されている

### フェーズ 5: App Service 環境変数確認

デプロイ後、App Service に環境変数が正しく設定されていることを確認:

```powershell
# 診断スクリプト実行
cd scripts
./diagnose-blob-config.ps1
```

以下を入力:
- App Service Name: (例: `emergency-assistance-api`)
- Resource Group: (例: `my-resource-group`)

確認項目:
- [ ] AZURE_STORAGE_CONNECTION_STRING: ✅
- [ ] AZURE_STORAGE_ACCOUNT_NAME: ✅
- [ ] AZURE_STORAGE_CONTAINER_NAME: ✅
- [ ] BLOB connectivity test: ✅ Success

### フェーズ 6: コンテナアクセス権限確認

BLOB ストレージのファイアウォールとネットワーク設定を確認:

1. Azure Portal でストレージアカウントを開く
2. **ネットワーク** メニュー
3. **ファイアウォールと仮想ネットワーク** セクション
4. 以下の設定を確認:
   - [ ] **許可するアクセス元**: 「すべてのネットワークからアクセスを許可」 または
   - [ ] **特定のネットワークのみ許可**: App Service のアウトバウンドIPを許可

### フェーズ 7: アプリケーション機能テスト

デプロイ後、以下の3つのUIから実際にファイルを読み込めるかテスト:

#### 7.1 故障履歴管理 UI
- [ ] 過去の故障データを読み込める
- [ ] JSON データが表示される
- [ ] 画像が読み込まれる

#### 7.2 基礎データ管理 UI
- [ ] 保存された機械データ（JSON）を読み込める
- [ ] データが正しく表示される

#### 7.3 応急復旧データ管理 UI
- [ ] トラブルシューティングフロー（JSON）を読み込める
- [ ] フロー図が表示される
- [ ] 関連画像が読み込まれる

## 🔍 トラブルシューティング

### 症状: デプロイ後も BLOB に接続できない

#### 1. GitHub Secrets が正しく設定されているか確認

```bash
# GitHub CLI を使用（インストール必要）
gh secret list --org Satoshi-Niina --repo Emergency-Assistance
```

または GitHub UI で確認:
- Settings → Secrets and variables → Actions
- 以下の4つが表示されているか確認:
  - AZURE_STORAGE_CONNECTION_STRING
  - AZURE_STORAGE_ACCOUNT_NAME
  - AZURE_STORAGE_CONTAINER_NAME
  - BLOB_PREFIX

#### 2. App Service の環境変数を確認

```powershell
# PowerShell で確認
az webapp config appsettings list `
  --resource-group <resource-group> `
  --name <app-service-name> `
  --query "[?contains(name, 'AZURE_STORAGE') || contains(name, 'BLOB')]"
```

#### 3. BLOB 接続をテスト

```bash
# Azure CLI で接続テスト
az storage container exists \
  --connection-string "<connection-string>" \
  --name "<container-name>"
```

結果が `true` であれば接続は成功

#### 4. App Service ログを確認

```bash
# リアルタイムログを表示
az webapp log tail \
  --resource-group <resource-group> \
  --name <app-service-name>
```

以下を確認:
- `getBlobServiceClient called`
- `BLOB service client initialized successfully`
- エラーがないか

#### 5. ファイアウォール設定を確認

ストレージアカウント → **ネットワーク** → **ファイアウォールと仮想ネットワーク**
- `接続された IP アドレスからのアクセスを許可` が有効か確認
- または特定の App Service のアウトバウンド IP をホワイトリストに追加

## 📊 ファイル構成（BLOB Storage 内）

デプロイ後、以下のファイルが BLOB に保存されます：

```
knowledge/
├── knowledge-base/
│   ├── exports/
│   │   ├── fault_history_UUID_TIMESTAMP.json
│   │   ├── fault_history_UUID_TIMESTAMP.png
│   │   ├── machines_UUID_TIMESTAMP.json
│   │   ├── troubleshooting_UUID_TIMESTAMP.json
│   │   └── troubleshooting_UUID_TIMESTAMP.png
│   ├── data/
│   │   └── (その他のデータ)
│   └── images/
│       └── (チャット画像等)
└── (その他のコンテナデータ)
```

## 🚀 本番環境へのデプロイメント フロー

```
1. Local Development
   ↓
2. env.production 確認
   ↓
3. GitHub Secrets 設定
   ├─ AZURE_STORAGE_CONNECTION_STRING
   ├─ AZURE_STORAGE_ACCOUNT_NAME
   ├─ AZURE_STORAGE_CONTAINER_NAME
   └─ BLOB_PREFIX (optional)
   ↓
4. git push origin main (CI/CD トリガー)
   ↓
5. GitHub Actions ワークフロー実行
   ├─ Docker イメージビルド
   ├─ App Service に設定適用
   └─ デプロイ実行
   ↓
6. 環境変数確認 (診断スクリプト実行)
   ↓
7. BLOB 接続テスト
   ↓
8. UI からファイル読み込みテスト
```

## 📞 サポート

詳細な設定方法は以下のドキュメントを参照:
- [BLOB_SETUP.md](../docs/BLOB_SETUP.md) - GitHub Secrets 詳細設定ガイド
- [server/.env.production](../server/.env.production) - 本番環境テンプレート
- [env.example](../env.example) - 開発環境テンプレート

## 💡 ベストプラクティス

1. **接続文字列を安全に管理**
   - 絶対に GitHub にコミットしない
   - GitHub Secrets で管理する
   - 定期的にキーをローテーション

2. **複数環境での設定分離**
   - 開発環境: ローカルファイルシステム使用
   - 本番環境: Azure Blob Storage 使用

3. **ネットワークセキュリティ**
   - ストレージアカウントのファイアウォールを設定
   - 必要な IP アドレスのみを許可
   - HTTPS 接続を強制

4. **バックアップ**
   - BLOB Storage の定期バックアップを設定
   - 削除ポリシーを定義
