# フロントエンドデプロイメント設定ガイド

## 🎯 推奨デプロイメント方法

### 1. Netlify (最も簡単・推奨)

#### 設定手順：

1. **Netlify** (https://netlify.com) でアカウント作成
2. GitHub リポジトリを接続
3. 以下の設定：
   ```
   Base directory: client
   Build command: npm run build
   Publish directory: client/dist
   ```
4. 環境変数設定：
   ```
   VITE_API_BASE_URL=https://emergency-backend-api.azurecontainerapps.io
   NODE_ENV=production
   ```

#### GitHub アクション自動デプロイ用：

GitHub → Settings → Secrets → Actions で以下を設定：

```
NETLIFY_AUTH_TOKEN: Netlifyの Personal Access Token
NETLIFY_SITE_ID: Netlifyサイトの Site ID
```

### 2. Vercel (代替案)

#### 設定手順：

1. **Vercel** (https://vercel.com) でアカウント作成
2. GitHub リポジトリを接続
3. 以下の設定：
   ```
   Framework Preset: Vite
   Root Directory: client
   Build Command: npm run build
   Output Directory: dist
   ```

#### GitHub アクション用：

```
VERCEL_TOKEN: Vercelの API Token
VERCEL_ORG_ID: 組織ID
VERCEL_PROJECT_ID: プロジェクトID
```

### 3. Azure Static Web Apps (既存・修復中)

#### 問題と解決策：

現在のエラー: `No matching Static Web App was found or the api key was invalid`

#### 解決方法：

1. **新しい Static Web App の作成**:

   ```
   Azure Portal → Static Web Apps → 作成
   名前: emergency-assistance-frontend
   リポジトリ: Satoshi-Niina/Emergency-Assistance
   ブランチ: main
   アプリの場所: /client
   出力場所: dist
   ```

2. **API キーの更新**:
   ```
   Azure Portal → Static Web App → 概要 → デプロイ トークンの管理
   トークンをコピー → GitHubシークレット AZURE_STATIC_WEB_APPS_API_TOKEN_SALMON_DESERT_065EC5000 に設定
   ```

## 🔄 現在利用可能なワークフロー

1. **frontend-build-test.yml** - ビルドテスト（常に動作）
2. **netlify-deploy.yml** - Netlify デプロイ（推奨）
3. **vercel-deploy.yml** - Vercel デプロイ（代替）
4. **azure-static-web-apps-salmon-desert-065ec5000.yml** - Azure（修復中）

## 💡 推奨手順

1. **まず**: frontend-build-test.yml でビルドが成功することを確認
2. **次に**: Netlify アカウント作成＆設定
3. **最後**: netlify-deploy.yml を実行

この順序で進めることで、確実にフロントエンドをデプロイできます。
