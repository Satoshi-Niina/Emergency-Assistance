# GitHub Actions デプロイメント設定チェックリスト

## 📋 設定完了チェックリスト

### ✅ 必須 Secrets 設定

- [ ] **AZURE_FUNCTIONAPP_PUBLISH_PROFILE**

  - 取得: `scripts\get-publish-profile.ps1` を実行
  - または Azure Portal の Function App > 概要 > 発行プロファイルの取得

- [ ] **AZURE_CREDENTIALS** (既存確認)

  - Service Principal の JSON 形式認証情報
  - GitHub リポジトリ Settings で確認

- [ ] **DATABASE_URL** (既存確認)

  - `postgresql://satoshi_niina@emergencyassistance-db.postgres.database.azure.com:5432/webappdb?sslmode=require`

- [ ] **OPENAI_API_KEY** (既存確認)

  - `sk-proj-` で始まる API キー

- [ ] **FRONTEND_URL** (新規追加)

  - `https://witty-river-012f39e00.1.azurestaticapps.net`

- [ ] **JWT_SECRET** (新規追加)

  - `emergency-assistance-jwt-secret-2025`

- [ ] **SESSION_SECRET** (新規追加)
  - `emergency-assistance-session-secret-2025-azure`

### 🔧 Azure リソース確認

- [ ] **Function App**: `emergency-backend-api-v2`

  - URL: https://emergency-backend-api-v2.azurewebsites.net
  - 状態: 作成済み（デプロイ待ち）

- [ ] **Static Web App**: `Emergencyassistance-swa`

  - URL: https://witty-river-012f39e00.1.azurestaticapps.net
  - 状態: 稼働中

- [ ] **PostgreSQL**: `emergencyassistance-db`
  - ホスト: emergencyassistance-db.postgres.database.azure.com
  - 状態: 稼働中（4 ユーザー確認済み）

### 📁 ファイル確認

- [ ] **GitHub Actions ワークフロー**

  - ファイル: `.github/workflows/azure-function-app-deploy.yml`
  - 状態: ✅ 作成済み

- [ ] **フロントエンド URL 更新**
  - `client/src/contexts/auth-context.tsx`: ✅ 更新済み
  - `client/src/components/chat.tsx`: ✅ 更新済み
  - `client/src/components/users.tsx`: ✅ 更新済み

### 🚀 デプロイメント手順

#### 1. GitHub Secrets 設定

```bash
# 発行プロファイル取得（PowerShell）
.\scripts\get-publish-profile.ps1
```

#### 2. GitHub で設定

1. https://github.com/Satoshi-Niina/Emergency-Assistance/settings/secrets/actions
2. 上記の Secrets をすべて設定

#### 3. ワークフロー実行

1. GitHub リポジトリの Actions タブ
2. "Deploy Function App to Azure" を選択
3. "Run workflow" をクリック

#### 4. 動作確認

```bash
# エンドポイントテスト
curl https://emergency-backend-api-v2.azurewebsites.net/api/auth/me
curl -X OPTIONS https://emergency-backend-api-v2.azurewebsites.net/api/auth/login
```

### 🎯 成功指標

- [ ] **GitHub Actions ワークフロー**: 正常完了（緑色）
- [ ] **Function App エンドポイント**: 200 OK レスポンス
- [ ] **フロントエンド ログイン**: エラーなしでログイン可能
- [ ] **データベース接続**: ユーザー情報取得可能

### ⚠️ トラブルシューティング

#### 認証エラー

- `AZURE_CREDENTIALS` の形式確認
- Service Principal の権限確認

#### デプロイエラー

- 発行プロファイルの再取得
- Function App の状態確認

#### 接続エラー

- 環境変数の設定確認
- CORS 設定の確認

### 📞 サポートリソース

- **GitHub Actions ログ**: リポジトリの Actions タブ
- **Azure Portal**: Function App のログストリーム
- **設定ガイド**: `GITHUB_SECRETS_UPDATE.md`
- **発行プロファイル取得**: `scripts\get-publish-profile.ps1`

---

## 🎊 設定完了後

すべてのチェックボックスにチェックが入ったら：

1. **ワークフローを実行**
2. **エンドポイントをテスト**
3. **フロントエンドでログインテスト**
4. **正常動作を確認**

✅ **これで、中長期的な Function App デプロイメント戦略の設定が完了です！**
