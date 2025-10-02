# 本番環境とローカル環境の分離設定

## 🚀 **環境分離の概要**

### **本番環境（Azure App Service）**
- ファイル: `server/production-server.js`
- 起動コマンド: `node production-server.js`
- 環境: `production`
- データベース: PostgreSQL（Azure Database）
- ストレージ: Azure Blob Storage
- 認証: ハードコードされたユーザー認証

### **ローカル環境（開発用）**
- ファイル: `server/local-server.js`
- 起動コマンド: `node local-server.js`
- 環境: `local-development`
- データベース: なし（モックデータ）
- ストレージ: なし（モックデータ）
- 認証: 任意のユーザー名・パスワードでログイン可能

## 🔧 **起動方法**

### **ローカル開発環境**
```bash
# ローカルサーバーを起動
node server/local-server.js

# または
npm run dev:local
```

### **本番環境（Azure）**
```bash
# Azure App Serviceで自動起動
node server/production-server.js

# またはDocker使用時
docker run -p 8080:8080 your-app
```

## 📊 **API エンドポイントの違い**

### **共通エンドポイント**
- `GET /api/health` - ヘルスチェック
- `GET /api/health/detailed` - 詳細ヘルスチェック
- `POST /api/auth/login` - ログイン
- `GET /api/auth/handshake` - 認証ハンドシェイク
- `GET /api/auth/me` - 現在のユーザー情報
- `POST /api/auth/logout` - ログアウト

### **本番環境のみ**
- `GET /api/db-check` - データベース接続チェック
- `GET /api/users` - ユーザー一覧（DB接続時）
- `GET /api/machines/machine-types` - 機種一覧（DB接続時）
- `GET /api/knowledge-base` - ナレッジベース（Blob Storage）
- `GET /api/emergency-flow/list` - 応急処置フロー（Blob Storage）

### **ローカル環境のみ**
- すべてのエンドポイントがモックデータを返す
- データベース接続なし
- Blob Storage接続なし

## 🔐 **認証の違い**

### **本番環境**
```javascript
// ハードコードされたユーザー
const validUsers = {
  'admin': { role: 'admin', id: 'admin-001', password: 'admin123' },
  'niina': { role: 'admin', id: 'niina-001', password: '0077' },
  'takabeni1': { role: 'admin', id: 'takabeni1-001', password: 'takabeni1' },
  'takabeni2': { role: 'employee', id: 'takabeni2-001', password: 'takabeni2' },
  'employee': { role: 'employee', id: 'employee-001', password: 'employee' }
};
```

### **ローカル環境**
```javascript
// 任意のユーザー名・パスワードでログイン可能
if (username && password) {
  // ログイン成功
  // admin/niina は admin ロール、その他は employee ロール
}
```

## 🌐 **CORS設定の違い**

### **本番環境**
```javascript
const ALLOWED_ORIGINS = [
  'https://witty-river-012f39e00.1.azurestaticapps.net',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175'
];
```

### **ローカル環境**
```javascript
origin: [
  'http://localhost:5173',
  'http://localhost:5174', 
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
]
```

## 📝 **環境変数の違い**

### **本番環境（必須）**
```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
PG_SSL=require
JWT_SECRET=your-production-jwt-secret-32-characters-minimum
SESSION_SECRET=your-production-session-secret-32-characters-minimum
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
AZURE_STORAGE_CONNECTION_STRING=your-azure-storage-connection-string
AZURE_STORAGE_CONTAINER_NAME=knowledge
```

### **ローカル環境（オプション）**
```bash
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:5173
```

## 🐳 **Docker設定**

### **本番環境用Dockerfile**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --only=production
COPY production-server.js ./
COPY startup-migration.js ./
COPY migrations/ ./migrations/
EXPOSE 8080
CMD ["node", "production-server.js"]
```

## 🚀 **デプロイ手順**

### **ローカル環境の起動**
```bash
# 1. ローカルサーバーを起動
node server/local-server.js

# 2. フロントエンドを起動
cd client
npm run dev
```

### **本番環境のデプロイ**
```bash
# 1. Azure App Serviceにデプロイ
# 2. 環境変数を設定
# 3. スタートアップコマンドを設定: node production-server.js
```

## 🔍 **トラブルシューティング**

### **本番環境でログインできない場合**
1. 環境変数が正しく設定されているか確認
2. データベース接続が正常か確認: `/api/db-check`
3. ヘルスチェック: `/api/health`
4. ログを確認

### **ローカル環境で動作しない場合**
1. ポート8000が使用可能か確認
2. フロントエンドのURLが正しいか確認
3. CORS設定を確認

## 📊 **ログ出力の違い**

### **本番環境**
```
🚀 Production Server running on 0.0.0.0:8080
📊 Health check: /api/health
🌍 Environment: production
📦 Node.js: v20.x.x
💻 Platform: linux
```

### **ローカル環境**
```
🚀 Local Development Server running on http://localhost:8000
📱 Frontend URL: http://localhost:5173
🔧 Environment: development
✅ Health check: http://localhost:8000/api/health
🔐 Login endpoint: http://localhost:8000/api/auth/login
```