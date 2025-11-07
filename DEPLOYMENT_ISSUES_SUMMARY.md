# デプロイ前修正サマリ

## 📝 修正内容一覧

### 1. 環境変数テンプレートファイル

**問題**: `.env.template`ファイルが存在しない

**対応**: 
- `client/.env.template`と`server/.env.template`のテンプレートを作成（手動で作成が必要）
- すべての環境変数の説明とデフォルト値を記載

**注意**: `.env.template`ファイルは`.gitignore`でブロックされているため、手動で作成する必要があります。

### 2. ハードコーディングされたURLの修正

#### フロントエンド

**修正ファイル**:
- ✅ `client/staticwebapp.config.json` - 環境変数プレースホルダー`${BACKEND_SERVICE_URL}`に変更
- ✅ `client/public/runtime-config.js` - 動的オリジン取得（`window.location.origin`）に変更
- ✅ `client/index.html` - 動的オリジン取得に変更
- ✅ `client/src/lib/image-utils.ts` - ハードコーディングURL削除、環境変数優先
- ✅ `client/src/lib/api/config.ts` - ハードコーディングURL削除、環境変数優先

**修正前**:
```javascript
// ハードコーディングされたURL
'https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net'
'https://witty-river-012f39e00.1.azurestaticapps.net'
```

**修正後**:
```javascript
// 環境変数優先、フォールバックは相対パス
import.meta.env.VITE_BACKEND_SERVICE_URL || ''
window.location.origin  // 動的取得
```

#### バックエンド

**修正ファイル**:
- ✅ `server/unified-hot-reload-server.js` - 環境変数優先、本番環境では空文字列
- ✅ `server/azure-server.js` - 環境変数優先、本番環境では空文字列
- ✅ `server/routes/auth.ts` - 環境変数優先、本番環境では空文字列

**修正前**:
```javascript
const staticWebAppUrl = process.env.STATIC_WEB_APP_URL || 'https://witty-river-012f39e00.1.azurestaticapps.net';
```

**修正後**:
```javascript
// 注意: 本番環境では必ずSTATIC_WEB_APP_URL環境変数を設定してください
const staticWebAppUrl = process.env.STATIC_WEB_APP_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8080');
```

### 3. CI/CDワークフローの修正

#### フロントエンド (`deploy-client-azure.yml`)

**追加**:
- `VITE_BACKEND_SERVICE_URL`環境変数の設定
- `VITE_STATIC_WEB_APP_URL`環境変数の設定
- `staticwebapp.config.json`の動的置換処理

**修正内容**:
```yaml
- name: Build
  env:
    VITE_BACKEND_SERVICE_URL: ${{ secrets.VITE_BACKEND_SERVICE_URL || '' }}
    VITE_STATIC_WEB_APP_URL: ${{ secrets.VITE_STATIC_WEB_APP_URL || '' }}

- name: Update staticwebapp.config.json with backend URL
  run: |
    if [ -n "${{ secrets.VITE_BACKEND_SERVICE_URL }}" ]; then
      sed -i "s|\${BACKEND_SERVICE_URL}|${BACKEND_URL}|g" staticwebapp.config.json
    fi
```

#### バックエンド (`deploy-server-azure.yml`)

**追加**:
- `STATIC_WEB_APP_URL`環境変数の設定
- `BACKEND_SERVICE_URL`環境変数の設定

**修正内容**:
```yaml
STATIC_WEB_APP_URL="${{ secrets.STATIC_WEB_APP_URL }}" \
BACKEND_SERVICE_URL="${{ secrets.BACKEND_SERVICE_URL }}" \
```

### 4. Dockerfile確認

**確認結果**: ✅ 問題なし
- 環境変数はランタイムで設定される
- `.env`ファイルはコピーされない（セキュリティ上正しい）
- デフォルト値は適切に設定されている

### 5. データベース接続設定確認

**確認結果**: ✅ 問題なし
- すべてのファイルで`DATABASE_URL`環境変数を使用
- SSL設定は`PG_SSL`環境変数で制御
- 接続プール設定は環境変数を使用

### 6. BLOBストレージ設定確認

**確認結果**: ✅ 問題なし
- `AZURE_STORAGE_CONNECTION_STRING`環境変数を使用
- コンテナ名は`AZURE_STORAGE_CONTAINER_NAME`で設定可能
- Managed Identityにも対応

## 🚨 重要な注意事項

### 1. GitHub Secretsの設定

以下のシークレットが**必須**です：

**フロントエンド**:
- `VITE_API_BASE_URL` - APIベースURL
- `VITE_BACKEND_SERVICE_URL` - バックエンドサービスURL（**必須**）
- `AZURE_STATIC_WEB_APPS_API_TOKEN` - デプロイトークン

**バックエンド**:
- `DATABASE_URL` - PostgreSQL接続文字列（**必須**）
- `JWT_SECRET` - JWT署名用シークレット（**必須**）
- `SESSION_SECRET` - セッション管理用シークレット（**必須**）
- `FRONTEND_URL` - フロントエンドURL（**必須**）
- `STATIC_WEB_APP_URL` - Static Web App URL（**必須**）
- `BACKEND_SERVICE_URL` - バックエンドサービスURL（**必須**）
- `AZURE_STORAGE_CONNECTION_STRING` - BLOBストレージ接続文字列（**必須**）

### 2. staticwebapp.config.jsonの動的置換

`staticwebapp.config.json`の`${BACKEND_SERVICE_URL}`プレースホルダーは、CI/CDワークフローでビルド時に実際のURLに置換されます。

**重要**: `VITE_BACKEND_SERVICE_URL`シークレットが設定されていない場合、置換が行われず、APIリクエストが失敗する可能性があります。

### 3. 環境変数の優先順位

1. **環境変数**（最優先）
2. **デフォルト値**（開発環境のみ）
3. **空文字列**（本番環境で環境変数が未設定の場合）

本番環境では**必ず環境変数を設定**してください。

## 📋 デプロイ前チェックリスト

- [ ] GitHub Secretsがすべて設定されている
- [ ] `VITE_BACKEND_SERVICE_URL`が設定されている（フロントエンド用）
- [ ] `STATIC_WEB_APP_URL`が設定されている（バックエンド用）
- [ ] `BACKEND_SERVICE_URL`が設定されている（バックエンド用）
- [ ] `DATABASE_URL`が正しく設定されている
- [ ] `AZURE_STORAGE_CONNECTION_STRING`が設定されている
- [ ] Azure PostgreSQLのファイアウォールルールが適切に設定されている
- [ ] Azure BLOBストレージのコンテナが作成されている
- [ ] `.env.template`ファイルを参考に`.env`ファイルを作成（ローカル開発用）

## 🔄 デプロイ後の確認

1. **フロントエンド**
   - Static Web Appにアクセスできる
   - APIリクエストが正しくルーティングされる
   - ログイン機能が動作する

2. **バックエンド**
   - App Serviceにアクセスできる
   - データベース接続が成功する
   - BLOBストレージへのアクセスが成功する
   - APIエンドポイントが正常に応答する

3. **統合**
   - フロントエンドからバックエンドへのAPI呼び出しが成功する
   - CORSエラーが発生しない
   - 認証フローが正常に動作する

