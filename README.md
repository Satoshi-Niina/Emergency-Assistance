# Emergency Assistance System

Railway Maintenance Emergency Support System - 本番環境対応済み

## 🚀 本番環境デプロイ情報

### 💻 デプロイ状況
- ✅ **フロントエンド**: Azure Static Web Apps
- ✅ **API**: Azure Functions（Node.js 18）
- ✅ **データベース**: PostgreSQL対応
- ✅ **認証**: bcrypt + フォールバック認証
- ✅ **CI/CD**: GitHub Actions自動デプロイ

### 🔑 テストアカウント
| ユーザー名 | パスワード | 役割 | データソース |
|----------|----------|------|------------|
| admin | password | 管理者 | DB/フォールバック |
| employee1 | password | 作業員 | DB/フォールバック |
| employee2 | password | 作業員 | DB/フォールバック |
| test | test | 作業員 | フォールバック |
| demo | demo | 作業員 | フォールバック |
| user | 123456 | 作業員 | フォールバック |

### 🛠️ API エンドポイント
- `GET /api/health` - ヘルスチェック
- `GET /api/debug` - システム状態・デバッグ情報
- `POST /api/auth/login` - ログイン認証
- `GET /api/auth/me` - 認証状態確認

### 🏗️ アーキテクチャ
- **フロントエンド**: React + TypeScript + Vite
- **API**: Azure Functions + Node.js 18
- **データベース**: PostgreSQL（環境変数で設定）
- **認証**: bcrypt + JWT Ready
- **セキュリティ**: CORS、HTTPS、セキュリティヘッダー

### 🔧 本番環境変数
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
NODE_ENV=production
```

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
pm2 deploy production
```

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
1. GitHub Actionsのログを確認
2. サーバーのログを確認
3. PM2の状態を確認
