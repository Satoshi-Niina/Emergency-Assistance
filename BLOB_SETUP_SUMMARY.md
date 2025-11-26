# BLOB Storage Setup - Summary & Next Steps

## 📋 完了した作業

### ✅ 環境設定ファイル更新

1. **`env.example`** - BLOB Storage 関連の環境変数をテンプレートに追加
   - AZURE_STORAGE_CONNECTION_STRING
   - AZURE_STORAGE_ACCOUNT_NAME
   - AZURE_STORAGE_CONTAINER_NAME
   - BLOB_PREFIX

2. **`server/.env.production`** - 本番環境テンプレートにコメント充実
   - GitHub Secrets での設定方法を記載
   - 各変数の説明とデータ格納内容を追加

### ✅ ドキュメント作成

1. **`docs/QUICKSTART_BLOB.md`** ⭐ **ここから始める**
   - 最も短いセットアップガイド（25分）
   - GitHub Secrets 設定～テストまで

2. **`docs/BLOB_SETUP.md`** - GitHub Secrets 詳細設定
   - 接続文字列取得方法（Azure CLI / Portal）
   - 各 Secret の設定手順
   - トラブルシューティング

3. **`docs/DEPLOYMENT_CHECKLIST.md`** - 本番デプロイメント完全ガイド
   - 7つのフェーズ別チェックリスト
   - ネットワーク設定の確認
   - 本番環境フロー図

4. **`docs/TROUBLESHOOTING_BLOB.md`** - 問題解決ガイド
   - 原因の特定方法
   - ステップバイステップ修正手順
   - よくある質問 (FAQ)

### ✅ 診断スクリプト作成

1. **`scripts/diagnose-blob-config.ps1`** - PowerShell 診断ツール
   - GitHub Secrets 設定確認
   - App Service 環境変数確認
   - BLOB 接続テスト
   - コンテナ内のファイル確認

2. **`scripts/check-blob-production.sh`** - Bash 診断スクリプト
   - Linux/Mac 環境での確認用
   - BLOB 接続テスト機能

## 🚀 次のステップ

### ステップ 1: GitHub に変更をコミット

```bash
cd c:\Users\Satoshi\ Niina\OneDrive\Desktop\system\Emergency-Assistance

# 変更をステージ
git add -A

# コミット
git commit -m "docs: Add BLOB Storage setup guides and diagnostic tools

- Add QUICKSTART_BLOB.md for quick setup (25 minutes)
- Add BLOB_SETUP.md for detailed GitHub Secrets configuration
- Add DEPLOYMENT_CHECKLIST.md with 7-phase verification
- Add TROUBLESHOOTING_BLOB.md for problem diagnosis
- Add diagnose-blob-config.ps1 PowerShell diagnostic tool
- Update env.example with BLOB storage variables
- Update server/.env.production with detailed comments"

# GitHub にプッシュ
git push origin main
```

### ステップ 2: GitHub Secrets を設定（最重要！）

**現在の問題**: 環境変数が設定されていない可能性が高い

1. Azure CLI で接続文字列を取得:
   ```bash
   az storage account show-connection-string \
     --name <your-storage-account-name> \
     --resource-group <your-resource-group>
   ```

2. GitHub Secrets に設定:
   - https://github.com/Satoshi-Niina/Emergency-Assistance/settings/secrets/actions
   - **New repository secret** をクリック
   - 4つの Secret を追加:
     - AZURE_STORAGE_CONNECTION_STRING
     - AZURE_STORAGE_ACCOUNT_NAME
     - AZURE_STORAGE_CONTAINER_NAME
     - BLOB_PREFIX (オプション)

### ステップ 3: デプロイメントをトリガー

```bash
# GitHub Actions で新しいデプロイメントを実行
git push origin main

# または GitHub UI から:
# Actions → Deploy Server (Docker Container) → Run workflow
```

### ステップ 4: ワークフローログを確認

- GitHub Actions で最新のワークフローを確認
- "Configure app settings" ステップのログで以下が表示されることを確認:
  ```
  ✅ AZURE_STORAGE_CONNECTION_STRING is set (length: XXX)
  ✅ AZURE_STORAGE_ACCOUNT_NAME is set: yourstorageaccount
  ✅ AZURE_STORAGE_CONTAINER_NAME is set: knowledge
  ```

### ステップ 5: UI でテスト

デプロイメント完了後、以下をテスト:
- 故障履歴管理 UI
- 基礎データ管理 UI
- 応急復旧データ管理 UI

---

## 📊 ファイル構成

作成・更新されたファイル:

```
Emergency-Assistance/
├── docs/
│   ├── QUICKSTART_BLOB.md ⭐ ← ここから始める（25分）
│   ├── BLOB_SETUP.md
│   ├── DEPLOYMENT_CHECKLIST.md
│   └── TROUBLESHOOTING_BLOB.md
│
├── scripts/
│   ├── diagnose-blob-config.ps1 (新規)
│   └── check-blob-production.sh (新規)
│
├── env.example (更新)
│   └── BLOB Storage 関連変数を追加
│
└── server/
    └── .env.production (更新)
        └── BLOB Storage の詳細コメントを追加
```

## 🎯 推奨される読み込み順序

1. **`docs/QUICKSTART_BLOB.md`** (5分)
   - 全体的な流れを把握

2. **`docs/BLOB_SETUP.md`** (GitHub Secrets 設定時に参照)
   - 詳細な設定方法を確認

3. **GitHub Secrets 設定** (5-10分)
   - QUICKSTART_BLOB.md に従って設定

4. **デプロイメント実行** (10-15分)
   - git push で CI/CD トリガー
   - ワークフローログを確認

5. **`docs/TROUBLESHOOTING_BLOB.md`** (問題が発生した場合)
   - 原因特定と修正方法

## 💡 重要なポイント

### ❌ よくある失敗

- ❌ GitHub Secrets を設定しない
- ❌ Secret の名前を間違える (大文字小文字)
- ❌ 接続文字列を不完全なまま設定
- ❌ Secret 設定後に git push をしない (デプロイ再実行が必要)

### ✅ 成功の目安

- ✅ GitHub Secrets に4つの値が設定されている
- ✅ GitHub Actions ワークフローが成功している
- ✅ App Service に環境変数が設定されている (az cli で確認可能)
- ✅ UI からファイルが読み込まれる

## 📞 サポート

### 自己診断

PowerShell で診断を実行:
```powershell
cd scripts
./diagnose-blob-config.ps1
```

### ドキュメント参照

- 設定方法: `docs/BLOB_SETUP.md`
- 問題解決: `docs/TROUBLESHOOTING_BLOB.md`
- 完全チェックリスト: `docs/DEPLOYMENT_CHECKLIST.md`

## ✨ 期待される効果

これらの設定が完了すると:

✅ 故障履歴データ（JSON + PNG）が読み込まれる
✅ 機械・機種管理データ（JSON）が読み込まれる
✅ トラブルシューティングデータ（JSON + PNG）が読み込まれる
✅ UI のすべての機能が正常に動作する

---

**初回セットアップ: 約 30-40 分**

デプロイメント完了後に `docs/QUICKSTART_BLOB.md` から開始してください！
