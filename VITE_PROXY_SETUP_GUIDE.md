# Vite Proxy設定と環境変数設定ガイド

## 概要
このドキュメントは、Viteのproxy設定と環境変数によるAPIのベースURL設定について説明します。

## 修正内容

### 1. Vite設定の改善 (`client/vite.config.ts`)
- 環境変数の動的読み込み
- 開発環境と本番環境の自動判別
- Proxy設定の環境変数対応
- デバッグログの追加

### 2. API設定の改善 (`client/src/lib/api/config.ts`)
- 環境変数の優先順位設定
- 複数環境（開発、本番、Azure、Replit）の自動判別
- より柔軟なAPIベースURL設定

### 3. 環境変数設定例
- `env.example`: 開発環境用設定例
- `env.production.example`: 本番環境用設定例

## 環境変数設定

### 開発環境
```bash
# .env ファイルを作成（ルートディレクトリ）
VITE_API_BASE_URL=http://localhost:3001
PORT=3001
CLIENT_PORT=5002
NODE_ENV=development
```

### 本番環境
```bash
# 本番環境用の環境変数
VITE_API_BASE_URL=https://your-backend-domain.com
PORT=3001
CLIENT_PORT=5002
NODE_ENV=production
```

## 設定の優先順位

### API Base URLの決定順序
1. `VITE_API_BASE_URL` 環境変数（最優先）
2. 本番環境の自動判別
   - Azure環境: `https://emergency-backend-*.azurewebsites.net`
   - Replit環境: `${protocol}//${hostname}:3000`
   - その他: `window.location.origin`
3. 開発環境: `http://localhost:3001`（デフォルト）

## 起動方法

### 1. 環境変数ファイルの作成
```bash
# ルートディレクトリに.envファイルを作成
cp env.example .env
# 必要に応じて値を編集
```

### 2. サーバー起動
```bash
cd server
npm run dev
# ポート3001で起動
```

### 3. クライアント起動
```bash
cd client
npm run dev
# ポート5002で起動（proxy設定により/api/*はポート3001に転送）
```

## Proxy設定の詳細

### 開発環境での動作
- クライアント: `http://localhost:5002`
- サーバー: `http://localhost:3001`
- APIリクエスト: `/api/*` → `http://localhost:3001/api/*`

### Proxy設定例
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3001', // 環境変数から動的取得
    changeOrigin: true,
    secure: false,
    ws: true,
    rewrite: (path) => path,
  },
}
```

## 本番環境対応

### 1. 静的ファイルのビルド
```bash
cd client
npm run build
```

### 2. 本番環境での設定
- `VITE_API_BASE_URL`を本番サーバーのURLに設定
- プロキシ設定は不要（直接APIサーバーにアクセス）

### 3. デプロイ例
```bash
# Azure Static Web Apps
VITE_API_BASE_URL=https://your-backend.azurewebsites.net

# Vercel
VITE_API_BASE_URL=https://your-backend.vercel.app

# Netlify
VITE_API_BASE_URL=https://your-backend.netlify.app
```

## トラブルシューティング

### よくある問題

#### 1. Proxyエラー
```
🔴 Proxy error: connect ECONNREFUSED 127.0.0.1:3001
```
**解決方法:**
- サーバーが起動しているか確認
- ポート番号が正しいか確認
- ファイアウォール設定を確認

#### 2. 環境変数が読み込まれない
```
VITE_API_BASE_URL: undefined
```
**解決方法:**
- `.env`ファイルが正しい場所にあるか確認
- 環境変数名が`VITE_`で始まっているか確認
- サーバーを再起動

#### 3. CORSエラー
```
Access to fetch at 'http://localhost:3001/api/users' from origin 'http://localhost:5002' has been blocked by CORS policy
```
**解決方法:**
- サーバーのCORS設定を確認
- Proxy設定が正しく動作しているか確認

### デバッグ方法

#### 1. 環境変数の確認
```javascript
// ブラウザの開発者ツールで確認
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
```

#### 2. Proxy設定の確認
```javascript
// Vite起動時のログで確認
🔧 Vite設定: {
  apiBaseUrl: 'http://localhost:3001',
  serverPort: 3001,
  clientPort: 5002
}
```

#### 3. APIリクエストの確認
```javascript
// ブラウザのNetworkタブで確認
// リクエストが正しいURLに送信されているか確認
```

## テスト方法

### 1. 開発環境テスト
```bash
# サーバー起動
cd server && npm run dev

# 別ターミナルでクライアント起動
cd client && npm run dev

# ブラウザで http://localhost:5002 にアクセス
# ユーザー管理画面でAPIが正常に動作することを確認
```

### 2. 本番環境テスト
```bash
# ビルド
cd client && npm run build

# プレビュー
npm run preview

# 本番環境のURLでアクセスしてAPIが動作することを確認
```

## 完了確認項目

- [ ] 開発環境でproxyが正常に動作する
- [ ] 環境変数が正しく読み込まれる
- [ ] 本番環境でAPIが正常に動作する
- [ ] ユーザー管理機能が正常に動作する
- [ ] エラーハンドリングが適切に動作する 