# Azure App Service 最終設定確認手順

## 現在の問題
1. **Node.js バージョン**: v18.17.1 (v20.19.3 にする必要がある)
2. **routes/index.js**: ファイルが見つからない

## 解決手順

### 1. Azure Portal での設定確認

#### 1.1 全般設定
```
スタック: Node
メジャーバージョン: Node 20
マイナーバージョン: Node 20 LTS
スタートアップコマンド: node production-server.js
```

#### 1.2 環境変数 (App Settings) - 必須
```
NODE_ENV=production
PORT=8080
JWT_SECRET=emergency-assistance-jwt-secret-key-32chars-minimum
SESSION_SECRET=emergency-assistance-session-secret-32chars-minimum
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
OPENAI_API_KEY=sk-your_openai_api_key_here
PG_SSL=require
WEBSITES_NODE_DEFAULT_VERSION=20.19.3
```

### 2. 設定の保存と再起動

#### 2.1 設定保存
1. **「保存」** をクリック
2. 設定が正しく保存されたことを確認

#### 2.2 App Service の再起動
1. **「概要」** ページに戻る
2. **「再起動」** をクリック
3. 再起動完了まで待機（約2-3分）

### 3. Kudu コンソールでの確認

#### 3.1 Node.js バージョンの確認
```bash
cd site/wwwroot
node --version
# 期待値: v20.19.3
```

#### 3.2 ファイル構造の確認
```bash
ls -la
ls -la routes/
ls -la routes/index.js
```

#### 3.3 環境変数の確認
```bash
echo $NODE_ENV
echo $JWT_SECRET
echo $SESSION_SECRET
echo $WEBSITES_NODE_DEFAULT_VERSION
```

### 4. 手動での動作確認

#### 4.1 環境変数の設定
```bash
export NODE_ENV=production
export PORT=8080
export JWT_SECRET=emergency-assistance-jwt-secret-key-32chars-minimum
export SESSION_SECRET=emergency-assistance-session-secret-32chars-minimum
export FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
```

#### 4.2 アプリケーションの起動
```bash
node production-server.js
```

### 5. 期待される結果

#### 5.1 成功時のログ
```
🚀 Server running on 0.0.0.0:8080
📊 Health check endpoints:
   - http://0.0.0.0:8080/api/health
   - http://0.0.0.0:8080/api/healthz
   - http://0.0.0.0:8080/ping
```

#### 5.2 エラーが解決される条件
- Node.js バージョンが v20.19.3
- `routes/index.js` が存在
- 必要な環境変数が設定されている

### 6. トラブルシューティング

#### 6.1 Node.js バージョンが v18.17.1 の場合
1. **Azure Portal** → **App Service** → **設定** → **全般設定**
2. **マイナーバージョン** を **Node 20 LTS** に設定
3. **環境変数** に `WEBSITES_NODE_DEFAULT_VERSION=20.19.3` を追加
4. **保存** → **再起動**

#### 6.2 routes/index.js が見つからない場合
1. **GitHub Actions** でデプロイを再実行
2. **デプロイログ** で `routes/index.js` がコピーされているか確認
3. **Kudu コンソール** でファイル構造を確認

## 重要なポイント

- **Node.js バージョンの統一が最重要**
- **環境変数 `WEBSITES_NODE_DEFAULT_VERSION=20.19.3` を必ず設定**
- **App Service の再起動が必要**
- **デプロイ後にファイル構造を確認**
