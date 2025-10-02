# デプロイ後のスタートアップコマンドとデータベース初期化ガイド

## 🚀 **デプロイ後のスタートアッププロセス**

### **現在の起動コマンド（修正後）**

#### **1. Azure App Service**
```bash
# 直接起動（マイグレーション自動実行）
node production-server.js
# または
node azure-server.js

# スタートアップスクリプト使用（推奨）
./start-production.sh
```

#### **2. Docker環境**
```bash
# Dockerfileで定義された起動コマンド
CMD ["./start-production.sh"]
```

### **🔄 スタートアップシーケンス**

#### **修正前の問題：**
- ❌ データベースマイグレーションが実行されない
- ❌ スキーマが最新でない可能性
- ❌ デプロイ後に手動でマイグレーションが必要

#### **修正後の改善：**
- ✅ 自動的にデータベースマイグレーションを実行
- ✅ スキーマのバージョン管理
- ✅ デプロイ後の自動初期化

### **📋 スタートアッププロセスの詳細**

#### **1. 環境変数チェック**
```javascript
// startup-migration.js
if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL is not set - skipping migrations');
  return;
}
```

#### **2. データベース接続**
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PG_SSL === 'require' ? { rejectUnauthorized: false } : false,
  max: 1, // Single connection for migrations
});
```

#### **3. マイグレーション実行**
```javascript
// migrations/schema_migrations テーブルで実行済みマイグレーションを管理
for (const filename of migrationFiles) {
  if (executedFilenames.includes(filename)) {
    console.log(`⏭️ Skipping already executed migration: ${filename}`);
    continue;
  }
  
  // マイグレーション実行
  await client.query(migrationSQL);
  await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
}
```

#### **4. サーバー起動**
```javascript
// production-server.js / azure-server.js
async function startupSequence() {
  try {
    console.log('🚀 Starting application startup sequence...');
    await runMigrations();
    console.log('✅ Startup sequence completed successfully');
  } catch (error) {
    console.error('❌ Startup sequence failed:', error);
    console.warn('⚠️ Server will continue running, but some features may not work properly');
  }
}
```

### **🗂️ ファイル構成**

```
server/
├── production-server.js      # 本番サーバー（マイグレーション付き）
├── azure-server.js           # Azure用サーバー（マイグレーション付き）
├── startup-migration.js     # マイグレーション実行スクリプト
├── start-production.sh       # Linux用スタートアップスクリプト
├── start-production.ps1      # Windows用スタートアップスクリプト
├── Dockerfile               # Docker設定（マイグレーション付き）
└── migrations/              # SQLマイグレーションファイル
    ├── 0001_initial_schema.sql
    ├── 0002_fix_schema_issues.sql
    └── ...
```

### **🔧 Azure App Service設定**

#### **環境変数（必須）**
```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
PG_SSL=require
JWT_SECRET=your-production-jwt-secret-32-characters-minimum
SESSION_SECRET=your-production-session-secret-32-characters-minimum
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
OPENAI_API_KEY=sk-your-actual-openai-api-key
```

#### **スタートアップコマンド**
```bash
# Azure App Service設定
Startup Command: node production-server.js
# または
Startup Command: ./start-production.sh
```

### **🐳 Docker設定**

#### **Dockerfile**
```dockerfile
# マイグレーションファイルをコピー
COPY migrations ./migrations
COPY startup-migration.js ./
COPY start-production.sh ./

# スタートアップスクリプトに実行権限を付与
RUN chmod +x start-production.sh

# アプリケーションを起動（マイグレーション付き）
CMD ["./start-production.sh"]
```

### **📊 ログ出力例**

#### **正常なスタートアップ**
```
🚀 Starting application startup sequence...
🔄 Starting database migrations...
📁 Found 13 migration files
⏭️ Skipping already executed migration: 0001_initial_schema.sql
⏭️ Skipping already executed migration: 0002_fix_schema_issues.sql
🔄 Executing migration: 0013_fix_user_roles_final.sql
✅ Migration completed: 0013_fix_user_roles_final.sql
✅ All migrations completed successfully
✅ Startup sequence completed successfully
🌐 Starting main server...
✅ Database pool initialized
```

#### **エラー時の動作**
```
❌ Migration process failed: connection timeout
⚠️ Server will continue running, but some features may not work properly
🌐 Starting main server...
⚠️ Database connection test failed: connection timeout
⚠️ Server will continue running without database connection
```

### **🛠️ トラブルシューティング**

#### **マイグレーションが失敗する場合**
1. `DATABASE_URL`が正しく設定されているか確認
2. データベースサーバーが起動しているか確認
3. SSL設定が正しいか確認（`PG_SSL=require`）
4. ネットワーク接続を確認

#### **サーバーが起動しない場合**
1. 環境変数がすべて設定されているか確認
2. `NODE_ENV=production`が設定されているか確認
3. ポート8080が利用可能か確認

### **✅ 確認事項**

デプロイ後に以下を確認：

1. **ヘルスチェック**
   ```bash
   curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health
   ```

2. **データベース接続**
   ```bash
   curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/auth/handshake
   ```

3. **ログイン機能**
   - ブラウザでアプリケーションにアクセス
   - ログイン機能が正常に動作するか確認

この修正により、デプロイ後にデータベースの初期化とマイグレーションが自動的に実行され、アプリケーションが正常に動作するようになります。
