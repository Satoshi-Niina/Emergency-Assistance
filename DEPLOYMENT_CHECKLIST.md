# デプロイ前チェックリスト

このドキュメントは、システムをデプロイする前に確認すべき項目をまとめています。

## ✅ 修正完了項目

### 1. 環境変数テンプレート
- ✅ フロントエンド用 `.env.template` の作成（client/.env.template）
- ✅ バックエンド用 `.env.template` の作成（server/.env.template）
- ⚠️ 注意: `.env.template`ファイルは`.gitignore`でブロックされているため、手動で作成する必要があります

### 2. ハードコーディングされたURLの修正
- ✅ `client/staticwebapp.config.json` - 環境変数プレースホルダーに変更
- ✅ `client/public/runtime-config.js` - 動的オリジン取得に変更
- ✅ `client/index.html` - 動的オリジン取得に変更
- ✅ `client/src/lib/image-utils.ts` - ハードコーディングURL削除
- ✅ `client/src/lib/api/config.ts` - ハードコーディングURL削除
- ✅ `server/unified-hot-reload-server.js` - 環境変数優先に変更
- ✅ `server/azure-server.js` - 環境変数優先に変更
- ✅ `server/routes/auth.ts` - 環境変数優先に変更

### 3. CI/CDワークフローの修正
- ✅ フロントエンドビルド時の環境変数追加
- ✅ `staticwebapp.config.json`の動的置換処理追加
- ✅ バックエンド環境変数設定に`STATIC_WEB_APP_URL`と`BACKEND_SERVICE_URL`追加

## 📋 デプロイ前の必須確認項目

### GitHub Secrets設定

以下のシークレットがGitHubリポジトリに設定されていることを確認してください：

#### フロントエンド用
- `VITE_API_BASE_URL` - APIベースURL（例: `/api` または `https://your-backend.azurewebsites.net`）
- `VITE_BACKEND_SERVICE_URL` - バックエンドサービスURL（例: `https://your-backend.azurewebsites.net`）
- `VITE_STATIC_WEB_APP_URL` - Static Web App URL（オプション）
- `AZURE_STATIC_WEB_APPS_API_TOKEN` - Azure Static Web Appsデプロイトークン

#### バックエンド用
- `DATABASE_URL` - PostgreSQL接続文字列
- `JWT_SECRET` - JWT署名用シークレット（32文字以上）
- `SESSION_SECRET` - セッション管理用シークレット（32文字以上）
- `FRONTEND_URL` - フロントエンドURL
- `STATIC_WEB_APP_URL` - Azure Static Web App URL
- `BACKEND_SERVICE_URL` - バックエンドサービスURL
- `CORS_ALLOW_ORIGINS` - CORS許可オリジン（カンマ区切り）
- `AZURE_STORAGE_CONNECTION_STRING` - Azure BLOBストレージ接続文字列
- `AZURE_STORAGE_CONTAINER_NAME` - BLOBコンテナ名（デフォルト: `knowledge`）
- `OPENAI_API_KEY` - OpenAI APIキー（オプション）
- `AZURE_CREDENTIALS` - Azure認証情報（JSON形式）
- `AZURE_APP_SERVICE_NAME` - Azure App Service名
- `AZURE_RESOURCE_GROUP` - Azureリソースグループ名
- `GITHUB_REGISTRY_TOKEN` - GitHub Container Registryトークン

### 環境変数テンプレートファイルの作成

`.env.template`ファイルは`.gitignore`でブロックされているため、以下の手順で作成してください：

1. **フロントエンド用** (`client/.env.template`)
```bash
# client/.env.template の内容を参照
# このファイルをコピーして client/.env を作成し、実際の値を設定
```

2. **バックエンド用** (`server/.env.template`)
```bash
# server/.env.template の内容を参照
# このファイルをコピーして server/.env を作成し、実際の値を設定
```

### Azureリソースの確認

1. **Azure PostgreSQL Database**
   - データベースが作成されていること
   - 接続文字列が正しいこと
   - ファイアウォールルールが適切に設定されていること

2. **Azure BLOB Storage**
   - ストレージアカウントが作成されていること
   - コンテナ（`knowledge`）が作成されていること
   - 接続文字列が正しいこと

3. **Azure App Service（バックエンド）**
   - App Serviceが作成されていること
   - Dockerコンテナ設定が正しいこと
   - 環境変数が設定されていること

4. **Azure Static Web Apps（フロントエンド）**
   - Static Web Appが作成されていること
   - デプロイトークンが取得されていること

### デプロイ時の注意事項

1. **staticwebapp.config.json**
   - CI/CDワークフローでビルド時に`${BACKEND_SERVICE_URL}`が実際のURLに置換されます
   - GitHub Secretsの`VITE_BACKEND_SERVICE_URL`が設定されていることを確認してください

2. **環境変数の優先順位**
   - 環境変数 > デフォルト値
   - 本番環境では必ず環境変数を設定してください

3. **CORS設定**
   - `CORS_ALLOW_ORIGINS`にフロントエンドのURLを含めてください
   - 複数のオリジンを許可する場合はカンマ区切りで指定

## 🔍 残存するハードコーディングURL

以下のファイルにはまだハードコーディングされたURLが残っていますが、これらは主にデフォルト値やレガシーコードです：

- `server/src/api/flows/index.js` - Azure Functions用（非推奨、使用されていない可能性あり）
- `server/src/api/users/index.js` - Azure Functions用（非推奨、使用されていない可能性あり）
- `server/src/api/host.json` - Azure Functions用（非推奨、使用されていない可能性あり）
- `server/middleware/security.ts` - デフォルト値（環境変数優先）
- `server/config/security.ts` - デフォルト値（環境変数優先）
- `server/routes/auth.js` - レガシーコード（auth.tsを使用）

これらは環境変数が設定されていれば使用されませんが、可能であれば修正を推奨します。

## ✅ Dockerfile確認結果

- ✅ 環境変数はランタイムで設定されるため問題なし
- ✅ `.env`ファイルはコピーされない（セキュリティ上正しい）
- ✅ 環境変数のデフォルト値は適切に設定されている

## ✅ データベース接続設定確認結果

- ✅ 複数のファイルで環境変数`DATABASE_URL`を使用
- ✅ SSL設定は`PG_SSL`環境変数で制御
- ⚠️ 接続プール設定がファイル間で異なるが、環境変数を使用しているため問題なし

## ✅ BLOBストレージ設定確認結果

- ✅ 環境変数`AZURE_STORAGE_CONNECTION_STRING`を使用
- ✅ コンテナ名は`AZURE_STORAGE_CONTAINER_NAME`で設定可能（デフォルト: `knowledge`）
- ✅ BLOBプレフィックスは`BLOB_PREFIX`で設定可能
- ✅ Managed Identityにも対応（Azure App Service上で動作時）

## 📝 デプロイ後の確認項目

1. **フロントエンド**
   - Static Web Appにアクセスできること
   - APIリクエストが正しくルーティングされること
   - ログイン機能が動作すること

2. **バックエンド**
   - App Serviceにアクセスできること
   - データベース接続が成功すること
   - BLOBストレージへのアクセスが成功すること
   - APIエンドポイントが正常に応答すること

3. **統合テスト**
   - フロントエンドからバックエンドへのAPI呼び出しが成功すること
   - CORSエラーが発生しないこと
   - 認証フローが正常に動作すること

## 🚨 トラブルシューティング

### 問題: CORSエラーが発生する
- `CORS_ALLOW_ORIGINS`にフロントエンドのURLが含まれているか確認
- `STATIC_WEB_APP_URL`と`FRONTEND_URL`が正しく設定されているか確認

### 問題: APIリクエストが404エラーになる
- `staticwebapp.config.json`の`rewrite`ルールが正しいか確認
- `VITE_BACKEND_SERVICE_URL`が正しく設定されているか確認

### 問題: データベース接続エラー
- `DATABASE_URL`が正しいか確認
- Azure PostgreSQLのファイアウォールルールを確認
- `PG_SSL=require`が設定されているか確認

### 問題: BLOBストレージアクセスエラー
- `AZURE_STORAGE_CONNECTION_STRING`が正しいか確認
- コンテナが作成されているか確認
- ストレージアカウントのアクセスキーが有効か確認

