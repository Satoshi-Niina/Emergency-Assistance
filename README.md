# Emergency Assistance System

応急処置データ管理システム

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

### CORS_ORIGINS の設定（App Service）
- Azure Portal > App Service (Emergencyassistance-sv) > 構成 > アプリ設定
- `CORS_ORIGINS` に SWA の公開URLを設定（例：`https://<your-swa>.azurestaticapps.net`）
- 複数ある場合はカンマ区切り

### 開発用 .env.local（client 例）
```
VITE_API_BASE_URL=http://localhost:3001
```

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

