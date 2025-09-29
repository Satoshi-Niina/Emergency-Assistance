# Azure App Service 根本問題解決手順

## 発見された問題

### 1. Node.js バージョンの矛盾
- **ログストリーム**: Node.js v20.19.3 ✅
- **Kudu コンソール**: Node.js v18.17.1 ❌

### 2. `tsx` が見つからない
- `package.json` の `start` スクリプト: `tsx production-server.js`
- `tsx` がインストールされていない
- `tsx` は開発用ツール（本番環境では不要）

### 3. パッケージのインストール失敗
- `npm install` が中断されている
- `cross-env` の Node.js バージョン要件エラー

## 解決手順

### 1. Azure Portal での設定修正

#### 1.1 全般設定
```
スタック: Node
メジャーバージョン: Node 20
マイナーバージョン: Node 20 LTS
スタートアップコマンド: node production-server.js
```

**重要**: `npm start` ではなく `node production-server.js` を直接指定

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

### 2. デプロイワークフローの修正

#### 2.1 本番環境用の依存関係インストール
```bash
npm install --omit=dev --no-optional
```

#### 2.2 スタートアップコマンドの確認
```bash
node production-server.js
```

### 3. Kudu コンソールでの確認

#### 3.1 手動での動作確認
```bash
cd site/wwwroot
npm install --omit=dev --no-optional
node production-server.js
```

#### 3.2 期待される結果
```
🚀 Server running on 0.0.0.0:8080
```

### 4. トラブルシューティング

#### 4.1 Node.js バージョンの確認
```bash
node --version
# 期待値: v20.19.3
```

#### 4.2 パッケージの確認
```bash
ls -la node_modules/express/
# express が存在することを確認
```

#### 4.3 環境変数の確認
```bash
echo $NODE_ENV
echo $JWT_SECRET
echo $SESSION_SECRET
```

### 5. 最終的な設定

#### 5.1 推奨設定
**スタートアップコマンド**:
```
node production-server.js
```

**環境変数**:
```
NODE_ENV=production
PORT=8080
JWT_SECRET=emergency-assistance-jwt-secret-key-32chars-minimum
SESSION_SECRET=emergency-assistance-session-secret-32chars-minimum
WEBSITES_NODE_DEFAULT_VERSION=20.19.3
```

#### 5.2 設定後の手順
1. **「保存」** をクリック
2. **「再起動」** をクリック
3. **ログストリーム** で動作確認
4. **GitHub Actions** でデプロイ実行

## 重要なポイント

- **`tsx` は開発用ツール** - 本番環境では不要
- **`node production-server.js` を直接実行**
- **Node.js バージョンを20.19.3に統一**
- **`--omit=dev` で開発用依存関係を除外**
