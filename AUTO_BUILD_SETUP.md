# 自動ビルド＆デプロイ設定完了

## 変更内容

### 1. ビルド成果物をGitから除外
- ✅ `.gitignore`に`client/dist/`を明示的に追加
- ✅ 既存の`client/dist/`をGit追跡から削除
- ✅ ビルド成果物はGitHub Actionsで自動生成されるようになりました

### 2. クライアントの自動デプロイ設定
- ✅ `client/**`または`shared/**`が変更されたらmainへのプッシュで自動デプロイ
- ✅ 環境変数（`VITE_API_BASE_URL`）を追加
- ✅ 手動トリガー（workflow_dispatch）も維持

### 3. Pre-commitスクリプト追加（オプション）
- 📝 `scripts/pre-commit.ps1`を作成
- 📝 コミット前にクライアントの変更があれば自動ビルド
- 📝 使用方法: `npm run pre-commit` または `npm run commit`

## 今後の使い方

### 通常の開発フロー（推奨）

```powershell
# 1. コードを編集
# 2. 変更をステージング
git add .

# 3. コミット（自動ビルドなし - GitHub Actionsに任せる）
git commit -m "fix: 修正内容"

# 4. プッシュ（自動的にビルド＆デプロイされる）
git push origin main
```

### ローカルでビルドしてからコミットする場合

```powershell
# 1. 手動ビルド
npm run build:client

# 2. Pre-commitチェックを実行
npm run pre-commit

# 3. コミット＆プッシュ
git add .
git commit -m "fix: 修正内容"
git push origin main
```

### ワンコマンドでコミット（自動ビルド含む）

```powershell
# クライアント変更時のみビルドしてコミット
npm run commit
git push origin main
```

## GitHub Actionsの動作

### クライアントデプロイ（自動トリガー）
- **トリガー条件:** 
  - `client/**`の変更
  - `shared/**`の変更
  - `.github/workflows/deploy-cliente-azure.yml`の変更
- **動作:** 自動的にビルド＆Azure Static Web Appsへデプロイ

### サーバーデプロイ（自動トリガー）
- **トリガー条件:** mainブランチへのプッシュ
- **動作:** 自動的にAzure App Serviceへデプロイ

## 確認事項

現在のコミット待機中の変更:
- ✅ `.gitignore` - dist/を除外
- ✅ `.github/workflows/deploy-cliente-azure.yml` - 自動デプロイ設定
- ✅ `client/dist/` - Git追跡から削除
- ✅ `scripts/pre-commit.ps1` - 自動ビルドスクリプト
- ✅ `DEPLOY_INSTRUCTIONS.md` - デプロイ手順書

## 次のステップ

```powershell
# コミット
git commit -m "fix: ビルド成果物をGitから除外し、自動デプロイを設定"

# プッシュ（クライアントとサーバーが自動デプロイされます）
git push origin main
```

プッシュ後、約5分でデプロイが完了します：
1. サーバーデプロイ（Azure App Service）
2. クライアントデプロイ（Azure Static Web Apps）

---

**重要:** 今後は`client/dist/`をコミットしないでください。GitHub Actionsが自動的にビルドします。
