# Azure App Service Node.js バージョン統一手順

## 問題
- **Kudu コンソール**: Node.js v18.17.1 ❌
- **ログストリーム**: Node.js v20.19.3 ✅
- **`cross-env` の要件**: Node.js >=20

## 解決手順

### 1. Azure Portal での設定確認

#### 1.1 全般設定
```
スタック: Node
メジャーバージョン: Node 20
マイナーバージョン: Node 20 LTS
スタートアップコマンド: node production-server.js
```

#### 1.2 環境変数 (App Settings)
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

### 2. Kudu コンソールでの確認

#### 2.1 Node.js バージョンの確認
```bash
cd site/wwwroot
node --version
# 期待値: v20.19.3
```

#### 2.2 環境変数の確認
```bash
echo $WEBSITES_NODE_DEFAULT_VERSION
# 期待値: 20.19.3
```

#### 2.3 ファイル構造の確認
```bash
ls -la routes/
# routes/index.js が存在することを確認
```

### 3. トラブルシューティング

#### 3.1 Node.js バージョンが v18.17.1 の場合
1. **Azure Portal** → **App Service** → **設定** → **全般設定**
2. **マイナーバージョン** を **Node 20 LTS** に設定
3. **環境変数** に `WEBSITES_NODE_DEFAULT_VERSION=20.19.3` を追加
4. **保存** → **再起動**

#### 3.2 ファイルが見つからない場合
```bash
# ファイル構造を確認
ls -la
ls -la routes/
ls -la routes/index.js

# ファイルが存在しない場合は、デプロイを再実行
```

### 4. 手動での動作確認

#### 4.1 環境変数の設定
```bash
export NODE_ENV=production
export PORT=8080
export JWT_SECRET=emergency-assistance-jwt-secret-key-32chars-minimum
export SESSION_SECRET=emergency-assistance-session-secret-32chars-minimum
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

## 重要なポイント

- **Node.js バージョンの統一が重要**
- **環境変数 `WEBSITES_NODE_DEFAULT_VERSION=20.19.3` を設定**
- **App Service の再起動が必要**
- **ファイル構造の確認が重要**
