# Azure App Service スタートアップコマンド強制設定

## 問題
Azure App Service が `npm start` を無視して直接 `node production-server.js` を実行している

## 解決策

### 1. Azure Portal での設定

#### 1.1 全般設定
1. Azure Portal → App Service → **設定** → **全般設定**
2. **スタートアップコマンド** に以下を設定：

```
npm start
```

#### 1.2 環境変数での強制設定
1. **設定** → **アプリケーション設定**
2. 以下の環境変数を追加：

```
WEBSITES_NODE_DEFAULT_VERSION = 20.19.3
WEBSITES_ENABLE_APP_SERVICE_STORAGE = false
WEBSITES_MOUNT_ENABLED = 1
```

### 2. 代替案: スタートアップスクリプト作成

#### 2.1 スタートアップスクリプトの作成
Azure Portal の **設定** → **全般設定** で **スタートアップコマンド** に以下を設定：

```bash
cd /home/site/wwwroot && npm install && npm start
```

#### 2.2 より確実な方法
```bash
cd /home/site/wwwroot && if [ ! -d "node_modules" ]; then npm install; fi && npm start
```

### 3. 最終的な設定

#### 3.1 推奨設定
**スタートアップコマンド**:
```bash
cd /home/site/wwwroot && npm install --production && npm start
```

#### 3.2 環境変数
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

### 4. 設定後の手順

1. **保存** をクリック
2. **再起動** をクリック
3. **ログストリーム** で以下を確認：

```
npm install
npm start
node production-server.js
🚀 Server running on 0.0.0.0:8080
```

### 5. トラブルシューティング

#### 5.1 まだ `node production-server.js` が実行される場合
**スタートアップコマンド** を以下に変更：

```bash
cd /home/site/wwwroot && npm install --production --no-optional && npm start
```

#### 5.2 パッケージが見つからない場合
**スタートアップコマンド** を以下に変更：

```bash
cd /home/site/wwwroot && rm -rf node_modules package-lock.json && npm install --production && npm start
```

## 重要なポイント

- Azure App Service は **スタートアップコマンドを無視** することがある
- **明示的に `npm install` を実行** する必要がある
- **`cd /home/site/wwwroot`** でディレクトリを移動する必要がある
