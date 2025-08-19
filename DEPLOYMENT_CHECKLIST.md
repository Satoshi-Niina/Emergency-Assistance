# Azure デプロイ前チェックリスト

## 📋 設定確認事項

### 1. データベース設定

- [ ] Azure PostgreSQL Flexible Server が作成済み
- [ ] `DATABASE_URL` が正しく設定されている
- [ ] データベースへの接続が確認できている
- [ ] 必要なテーブルが作成済み

### 2. Azure Storage 設定

- [ ] Azure Storage Account が作成済み
- [ ] `AZURE_STORAGE_CONNECTION_STRING` が設定されている
- [ ] `knowledge-base` コンテナが作成されている

### 3. 環境変数設定

- [ ] `.env.production` ファイルが正しく設定されている
- [ ] Azure Static Web Apps の設定で環境変数が追加されている
- [ ] 機密情報は Azure Key Vault に保存されている

### 4. API 設定

- [ ] `/api` フォルダが正しく構成されている
- [ ] `staticwebapp.config.json` が設定されている
- [ ] API ルートが正しく定義されている

### 5. ビルド設定

- [ ] `client/package.json` のビルドスクリプトが正しい
- [ ] TypeScript のビルドエラーがない
- [ ] インポートパスの問題が解決されている

## 🔧 修正が必要な項目

### インポートパスの修正

以下のファイルで `.js` 拡張子のインポートを修正する必要があります：

1. **server/app.ts**

   - `import authRouter from './routes/auth.js';` → `import authRouter from './routes/auth';`
   - その他の `.js` インポートも同様に修正

2. **server/routes.ts**

   - 全ての `.js` インポートを拡張子なしに変更

3. **その他のサーバーファイル**
   - 全ての相対パスインポートで `.js` 拡張子を削除

### TypeScript 設定の確認

- `server/tsconfig.json` の `module` と `moduleResolution` が適切に設定されている

## 🚀 デプロイ手順

### 1. 環境変数の設定

```bash
# Azure Static Web Apps の設定画面で以下の環境変数を設定
DATABASE_URL=postgresql://your-admin@your-server.postgres.database.azure.com:5432/webappdb?sslmode=require
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
OPENAI_API_KEY=your-key
SESSION_SECRET=your-secret
```

### 2. GitHub Secrets の設定

- `AZURE_STATIC_WEB_APPS_API_TOKEN_SALMON_DESERT_065EC5000` が設定済み

### 3. デプロイ実行

```bash
git add .
git commit -m "Azure deployment configuration"
git push origin main
```

## 🔍 デプロイ後の確認

### 1. フロントエンドの動作確認

- [ ] https://salmon-desert-065ec5000.1.azurestaticapps.net にアクセス
- [ ] ページが正常に読み込まれる
- [ ] ルーティングが正しく動作する

### 2. API の動作確認

- [ ] `/api/health` エンドポイントが応答する
- [ ] データベース接続が正常に動作する
- [ ] 認証機能が動作する

### 3. ストレージの動作確認

- [ ] ファイルアップロードが正常に動作する
- [ ] Azure Storage への保存が確認できる
- [ ] ファイル取得が正常に動作する

## ⚠️ 注意事項

1. **機密情報の管理**

   - パスワードや API キーは平文で保存しない
   - Azure Key Vault の使用を検討

2. **接続文字列の形式**

   - PostgreSQL の接続文字列は `sslmode=require` が必須

3. **CORS 設定**

   - API とフロントエンドのドメインが異なる場合は適切な CORS 設定が必要

4. **ログ監視**
   - Azure Application Insights でのログ監視を設定
