# Emergency Assistance System

応急処置データ管理システム

## 🔐 認証方式について

### JWT方式（推奨）
- Azure Static Web Apps + App Service環境ではJWT方式を推奨
- ログイン成功時に`accessToken`を発行し、以降のAPIリクエストで`Authorization: Bearer <token>`ヘッダーを使用
- 同一オリジン環境ではCORS設定を簡素化（`credentials: false`）

### Cookie方式（継続対応）
- 既存のセッション認証も並行して動作
- Safari対応には共通カスタムドメイン（例：app.example.jp と api.example.jp）を設定し、API側に `COOKIE_DOMAIN=.example.jp` を設定すると First-Partyモードが有効化されます
- 別ドメインのままでもChrome/Edge/Firefoxは動作（Partitioned付与）

## 🚀 開発環境の起動

### 一人開発用（推奨）
```bash
# Linux/Mac
./scripts/dev.sh

# Windows
scripts\dev.bat

# または手動で
cd server && npm run dev
cd client && npm run dev
```

## 🐳 本番環境へのデプロイ

### 自動デプロイ（GitHub Actions）
1. コードをmainブランチにプッシュ
2. GitHub Actionsが自動でテスト・ビルド
3. 本番環境にデプロイ

### 手動デプロイ
```bash
# 本番環境にデプロイ
npm run start:prod
```

## 🚀 本番環境設定

### 必須環境変数
```bash
NODE_ENV=production
JWT_SECRET=your-32-character-secret-key
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

### App Service設定
- **Node Version**: 18+
- **Always On**: On
- **Startup Command**: `npm run start:prod`
- **EasyAuth**: Off
- **Access Restrictions**: 一時Allow → 後でSWAのOutboundへ限定

### SWA設定
- **staticwebapp.config.json**: `/api/*` → `https://<appservice>.azurewebsites.net/api/{*path}`
- **statusCode**: 200

### ローカル開発
```bash
# PowerShell環境変数設定
$env:JWT_SECRET="test-secret-key-for-development-only-32chars"
$env:DATABASE_URL="postgresql://test:test@localhost:5432/testdb"
$env:PORT="8000"

# サーバービルド・起動
cd server
npm run build
node dist/server.js

# フロントエンド起動
cd client
npm run dev

# スモークテスト
node scripts/smoke.js --base http://localhost:8000
```

### トラブル時の切り戻し
```bash
# App Service環境変数を一時的に変更
NODE_ENV=development
JWT_SECRET=dev-secret
DATABASE_URL=postgresql://localhost:5432/devdb

# 再起動後、ping/healthで復帰確認
```

## 🔧 運用チェックリスト

### 認証API動作確認手順
以下の順序でエンドポイントをテストし、すべて200レスポンスを確認：

1. **ヘルスチェック**
   ```bash
   curl https://witty-river-012f39e00.1.azurestaticapps.net/api/health
   # 期待値: 200 {"status":"ok","timestamp":"...","environment":"production","version":"1.0.0"}
   ```

2. **握手エンドポイント**
   ```bash
   curl https://witty-river-012f39e00.1.azurestaticapps.net/api/auth/handshake
   # 期待値: 200 {"ok":true,"firstParty":false,"supportsToken":true,"timestamp":"...","environment":"production"}
   ```

3. **ログイン**
   ```bash
   curl -X POST https://witty-river-012f39e00.1.azurestaticapps.net/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"niina","password":"0077"}'
   # 期待値: 200 {"success":true,"token":"...","accessToken":"...","expiresIn":"1d"}
   ```

4. **認証確認**
   ```bash
   curl https://witty-river-012f39e00.1.azurestaticapps.net/api/auth/me \
     -H "Authorization: Bearer <取得したトークン>"
   # 期待値: 200 {"authenticated":true,"userId":"...","user":{"id":"..."}}
   ```

### トラブルシューティング
- **500エラー**: Azure App Serviceのログを確認（Application Insights）
- **認証失敗**: JWT_SECRET環境変数の設定を確認
- **データベースエラー**: DATABASE_URL接続文字列を確認
- **Node.jsバージョン**: App ServiceのNode.jsバージョンを18以上に設定

### 自動テスト実行
```bash
# SWA経由での全エンドポイントテスト
node test-auth-endpoints.js

# App Service直接テスト（トラブルシューティング用）
node test-app-service-direct.js
```

### Azure App Service設定チェックリスト
以下の設定をAzure Portalで確認・設定してください：

#### 基本設定
1. **Node.jsバージョン**: 18以上に設定
2. **ALWAYS_ON**: 有効化
3. **Authentication (EasyAuth)**: 無効化
4. **Access Restrictions**: 一時的にAllow（復旧後、SWAのOutbound IPに絞る）

#### 環境変数（App Settings）
```
NODE_ENV=production
JWT_SECRET=<本番用の強力なシークレット（32文字以上）>
SESSION_SECRET=<本番用の強力なシークレット（32文字以上）>
DATABASE_URL=<PostgreSQL接続文字列（オプション）>
```

#### 起動コマンド
```
npm run start:prod
```

#### トラブルシューティング手順
1. **Log Stream確認**: Azure Portal → App Service → Monitoring → Log stream
2. **起動ログ確認**: "Listening on 0.0.0.0:$PORT" メッセージを確認
3. **エラーログ確認**: 例外のファイル・行を特定
4. **Kudu確認**: App Service → Development Tools → Advanced Tools → Go
5. **直接アクセステスト**: `https://<appservice>.azurewebsites.net/api/ping`

### SWA設定
- `staticwebapp.config.json`のrewrite設定を確認
- `/api/*` → `https://<appservice>.azurewebsites.net/api/{*path}`

## 📁 プロジェクト構成

```
Emergency-Assistance/
├── client/                 # フロントエンド（React + Vite）
├── server/                 # バックエンド（Node.js + Express）
├── shared/                 # 共有ライブラリ
├── .github/workflows/      # GitHub Actions
├── scripts/                # 開発・デプロイスクリプト
├── ecosystem.config.js     # PM2本番環境設定
└── nginx.conf             # Nginx本番環境設定
```

## 🔧 環境変数

### 開発環境
- `client/.env.local` で設定
- `server/.env.local` で設定

### 本番環境
- サーバー環境変数で設定
- PM2で管理

## 📝 開発フロー

1. **開発**: ローカルで `npm run dev`
2. **テスト**: 変更をコミット・プッシュ
3. **自動化**: GitHub Actionsでテスト・ビルド
4. **デプロイ**: 本番環境に自動デプロイ

## 🛡️ セーフモード（Safe Mode）

本番環境で500エラーが発生している場合、セーフモードを使用してアプリケーションを起動し、基本的なエンドポイントの疎通を確認できます。

### セーフモードの有効化

#### Azure App Service環境変数で設定
```
SAFE_MODE=true
BYPASS_JWT=true
```

#### セーフモード時の動作
- **DB接続**: 初期化をスキップ（ダミーDBを使用）
- **JWT認証**: バイパスしてダミーユーザー（demo）を返す
- **エラーハンドリング**: 例外を握り潰し、必ずJSONでエラー返却
- **起動**: 依存関係が壊れても必ずlistenまで進む

### セーフモード対応エンドポイント

#### 基本エンドポイント（常時200）
```bash
# Ping エンドポイント
curl https://your-app.azurewebsites.net/api/ping
# 期待値: 200 {"ok":true,"mode":"safe","timestamp":"..."}

# Health エンドポイント
curl https://your-app.azurewebsites.net/api/health
# 期待値: 200 {"ok":true,"status":"healthy","mode":"safe","dependencies":"bypassed"}

# Auth Handshake
curl https://your-app.azurewebsites.net/api/auth/handshake
# 期待値: 200 {"ok":true,"mode":"safe","supportsToken":true}
```

#### 認証エンドポイント（セーフモード時）
```bash
# ログイン（ダミートークンを返す）
curl -X POST https://your-app.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"any","password":"any"}'
# 期待値: 200 {"success":true,"token":"...","mode":"safe"}

# ユーザー情報（ダミーユーザーを返す）
curl https://your-app.azurewebsites.net/api/auth/me
# 期待値: 200 {"authenticated":true,"userId":"demo","user":{"id":"demo","role":"user"},"mode":"safe"}
```

### スモークテスト

#### 自動テスト実行
```bash
# ローカル環境
npm run smoke:local

# 本番環境
npm run smoke:prod

# カスタムURL
SMOKE_TEST_URL=https://your-app.azurewebsites.net npm run smoke
```

#### 手動テスト
```bash
# 全エンドポイントをテスト
node scripts/smoke.js --url https://your-app.azurewebsites.net

# 詳細出力
node scripts/smoke.js --url https://your-app.azurewebsites.net --verbose
```

### セーフモードからの復旧手順

1. **基本疎通確認**: セーフモードでping/health/handshakeが200を返すことを確認
2. **段階的復旧**: 環境変数を一つずつ設定して再起動
   ```bash
   # 1. JWT_SECRETを設定
   SAFE_MODE=false BYPASS_JWT=true
   
   # 2. DATABASE_URLを設定
   SAFE_MODE=false BYPASS_JWT=false
   
   # 3. 完全復旧
   SAFE_MODE=false BYPASS_JWT=false
   ```
3. **動作確認**: 各段階でスモークテストを実行
4. **最終確認**: 通常の認証フロー（login→token→me）をテスト

## 🚨 トラブルシューティング

### 開発時の問題
```bash
# 依存関係を再インストール
cd client && npm install
cd server && npm install

# 開発サーバーを再起動
npm run dev
```

### 本番デプロイでエラー
1. **セーフモードで起動**: `SAFE_MODE=true`を設定して再起動
2. **スモークテスト実行**: 基本エンドポイントの疎通を確認
3. **段階的復旧**: 環境変数を一つずつ設定して再起動
4. **ログ確認**: Azure Portal → App Service → Monitoring → Log stream
5. **GitHub Actionsのログを確認**
6. **PM2の状態を確認**
#   T r i g g e r   w o r k f l o w 
 
 