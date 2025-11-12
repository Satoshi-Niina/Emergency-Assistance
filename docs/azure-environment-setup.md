# Azure App Service 環境変数設定手順

## 必要な環境変数設定

Azure Portal > App Services > Emergency-Assistance > Configuration > Application Settings で以下を設定:
（参考: `server/.env.template` の「Production Environment Variables」セクション）

### 基本設定
```
NODE_ENV=production
PORT=80
CLIENT_PORT=5173
API_BASE_URL=https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api
API_PREFIX=/api
```

### セキュリティ設定（重要：強力なランダム文字列に変更）
```
SESSION_SECRET=（32文字以上のランダム文字列）
JWT_SECRET=（32文字以上のランダム文字列）
BYPASS_DB_FOR_LOGIN=false
BCRYPT_SALT_ROUNDS=12
```

### データベース設定
```
DATABASE_URL=（Azure PostgreSQLの接続文字列）
```

### OpenAI設定
```
OPENAI_API_KEY=（実際のOpenAI APIキー）
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7
```

### CORS設定
```
CORS_ALLOW_ORIGINS=https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net
STATIC_WEB_APP_URL=https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net
FRONTEND_URL=https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net
```

### パス設定
```
LOCAL_DEV=false
KNOWLEDGE_BASE_PATH=./knowledge-base
IMAGES_BASE_PATH=./knowledge-base/images
FAULT_HISTORY_STORAGE_MODE=file
FAULT_HISTORY_IMAGES_DIR=knowledge-base/images/chat-exports
CHAT_EXPORTS_PATH=./knowledge-base/exports
CHAT_IMAGES_PATH=./knowledge-base/images/chat-exports
KNOWLEDGE_BASE_ENABLED=true
```

### システム設定
```
MAX_UPLOAD_SIZE=10485760
EMERGENCY_TIMEOUT=30000
AI_EMERGENCY_ANALYSIS=true
AUTO_EMERGENCY_RESPONSE=false
REAL_TIME_MONITORING=true
```

## セキュリティ文字列生成方法

### PowerShell（Windows）
```powershell
# セッションシークレット生成（32文字以上）
[System.Web.Security.Membership]::GeneratePassword(64, 0)

# JWT シークレット生成（32文字以上）
[System.Web.Security.Membership]::GeneratePassword(64, 0)
```

### Node.js
```javascript
// ランダム文字列生成
require('crypto').randomBytes(64).toString('hex')
```

## デプロイ後の確認事項

1. **環境変数確認**: Azure Portal > Configuration で全ての変数が正しく設定されているか
2. **ログ確認**: Azure Portal > Log stream でエラーが出ていないか
3. **エンドポイントテスト**:
   - GET /api/health
   - GET /api/machines/machine-types
   - POST /api/auth/login
4. **フロントエンド動作確認**: ログインして機種選択が表示されるか

## トラブルシューティング

### よくある問題
1. **500エラー**: 環境変数が正しく設定されていない
2. **CORS エラー**: CORS_ALLOW_ORIGINS が正しく設定されていない
3. **認証エラー**: JWT_SECRET または SESSION_SECRET が設定されていない
4. **データベースエラー**: DATABASE_URL が正しく設定されていない

### デバッグ方法
1. Azure Portal > Log stream でリアルタイムログを確認
2. Kudu Console（https://emergency-assistance-bfckhjejb3fbf9du.scm.azurewebsites.net）で環境を確認
3. Application Insights でパフォーマンスとエラーを分析
