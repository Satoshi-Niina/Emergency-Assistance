# 環境変数設定ガイド

## 必須環境変数

### 1. OpenAI APIキー設定
**重要**: フロー生成機能を使用するには、有効なOpenAI APIキーが必要です。

#### 設定手順:
1. [OpenAI Platform](https://platform.openai.com/api-keys) にアクセス
2. アカウントにログイン（または新規作成）
3. "Create new secret key" をクリック
4. APIキーをコピー
5. `.env`ファイルに設定:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

#### 注意事項:
- APIキーは機密情報です。Gitにコミットしないでください
- 無料枠の場合、月間使用量に制限があります
- 開発環境では`your-openai-api-key-here`のままにしないでください

#### トラブルシューティング:
- **エラー**: "OpenAI APIキーが無効です"
  - 解決策: 有効なAPIキーを設定してください
- **エラー**: "OpenAI APIキーが設定されていません"
  - 解決策: `.env`ファイルに`OPENAI_API_KEY`を追加してください

### 2. データベース設定
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance
```

### 3. セッション設定
```env
SESSION_SECRET=emergency-assistance-session-secret-2024
```

### 4. API設定
```env
VITE_API_BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5002
```

### 5. 開発環境設定
```env
NODE_ENV=development
PORT=3001
```

## 完全な.envファイル例

```env
# API設定
VITE_API_BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5002

# セッション設定
SESSION_SECRET=emergency-assistance-session-secret-2024

# データベース設定
DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance

# 開発環境設定
NODE_ENV=development
PORT=3001

# OpenAI設定（必須）
OPENAI_API_KEY=sk-your-actual-api-key-here

# その他の設定
LOG_LEVEL=debug
MAX_FILE_SIZE=10485760
MAX_UPLOAD_FILES=5
MAX_CHAT_HISTORY=100
```

## 設定確認方法

### 1. 環境変数の確認
```bash
# サーバー起動時にログで確認
npm run dev

# または直接確認
node -e "console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET')"
```

### 2. API接続テスト
```bash
# OpenAI API接続テスト
curl -X POST "http://localhost:3001/api/gpt-check" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

### 3. フロー生成テスト
```bash
# フロー生成テスト
curl -X POST "http://localhost:3001/api/flow-generator/generate-from-keywords" \
  -H "Content-Type: application/json" \
  -d '{"keywords":"エンジン停止"}'
```

## よくある問題と解決策

### 1. OpenAI APIキーエラー
**症状**: "OpenAI APIキーが無効です" エラー
**解決策**: 
- 有効なAPIキーを設定
- APIキーの使用量制限を確認
- アカウントの支払い状況を確認

### 2. データベース接続エラー
**症状**: "データベース接続エラー"
**解決策**:
- PostgreSQLが起動しているか確認
- DATABASE_URLの設定を確認
- データベースが存在するか確認

### 3. CORSエラー
**症状**: フロントエンドからAPIにアクセスできない
**解決策**:
- VITE_API_BASE_URLの設定を確認
- サーバーのCORS設定を確認
- ブラウザの開発者ツールでエラー詳細を確認 