# CORS・セッション設定修正サマリー

## 修正内容

### 1. サーバー側CORS設定の改善 (`server/app.ts`)

#### 変更点：
- **フロントエンドURLの環境変数対応**: `FRONTEND_URL`環境変数からフロントエンドURLを取得
- **CORS設定の強化**: `credentials: true`を確実に設定
- **レスポンスヘッダーの追加**: `Access-Control-Allow-Credentials: true`を明示的に設定
- **CORSヘッダーミドルウェアの追加**: 全レスポンスにCORSヘッダーを確実に設定

#### 実装例：
```typescript
// フロントエンドURLの取得（環境変数から優先、デフォルトはlocalhost:5002）
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5002';

app.use(cors({
  origin: function(origin, callback) {
    // 許可するオリジンのチェック
    const allowedOrigins = getAllowedOrigins();
    // ...
  },
  credentials: true, // 必須設定 - セッション維持のため
  // ...
}));

// CORSヘッダーを確実に設定するミドルウェア
app.use((req, res, next) => {
  // ...
  res.header('Access-Control-Allow-Credentials', 'true');
  // ...
});
```

### 2. セッション設定の改善

#### 変更点：
- **セッションデバッグの強化**: より詳細なセッション情報をログ出力
- **セッション保存の改善**: ログイン時のセッション保存を確実に実行
- **セッション情報の詳細ログ**: セッションID、ユーザーID、ロール情報を詳細に出力

#### 実装例：
```typescript
// セッションデバッグミドルウェア
app.use((req, res, next) => {
  console.log('🔍 Session Debug:', {
    sessionId: req.sessionID,
    userId: req.session?.userId,
    userRole: req.session?.userRole,
    cookies: req.headers.cookie,
    path: req.path,
    method: req.method,
    origin: req.headers.origin,
    host: req.headers.host,
    referer: req.headers.referer
  });
  next();
});
```

### 3. 環境変数の改善

#### 変更点：
- **環境変数の明示的設定**: `VITE_API_BASE_URL`と`FRONTEND_URL`を環境変数で明示的に指定
- **デフォルト値の設定**: 環境変数が未設定の場合のデフォルト値を設定
- **環境変数確認ログの追加**: 起動時に環境変数の状態を詳細にログ出力

#### 実装例：
```typescript
// サーバー側（server/index.ts）
if (!process.env.VITE_API_BASE_URL) {
  process.env.VITE_API_BASE_URL = 'http://localhost:3001';
  console.log('[DEV] VITE_API_BASE_URL not set, using development default');
}

if (!process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL = 'http://localhost:5002';
  console.log('[DEV] FRONTEND_URL not set, using development default');
}
```

### 4. クライアント側設定の改善 (`client/src/lib/api/config.ts`)

#### 変更点：
- **環境変数チェックの強化**: 空文字列チェックを追加
- **API_REQUEST_OPTIONSの改善**: セッション維持のためのヘッダーを追加
- **デバッグ情報の追加**: より詳細な環境変数情報をログ出力

#### 実装例：
```typescript
// 環境変数が設定されている場合は優先使用（空文字列チェック追加）
if (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim() !== '') {
  console.log('✅ 環境変数からAPI_BASE_URLを取得:', import.meta.env.VITE_API_BASE_URL);
  return import.meta.env.VITE_API_BASE_URL;
}

// API リクエスト用のベースオプション
export const API_REQUEST_OPTIONS = {
  credentials: 'include' as RequestCredentials, // セッション維持のため必須
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache',
    'X-Requested-With': 'XMLHttpRequest'
  }
};
```

## 環境変数設定

### 必要な環境変数：
```bash
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
```

### 設定方法：
1. ルートディレクトリに`.env`ファイルを作成
2. `env.example`ファイルを参考に必要な環境変数を設定
3. サーバーとクライアントを再起動

## 修正の効果

### 解決される問題：
1. **認証セッションの維持**: CORS設定によりセッション情報が確実に送信される
2. **API通信の正常化**: フロントエンド（localhost:5002）からバックエンド（localhost:3001）への通信が正常に動作
3. **ユーザー管理・機種管理の表示**: 認証が維持されるため、データが正常に表示される
4. **新規登録機能の復旧**: 認証状態が維持されるため、新規登録が可能になる

### 確認方法：
1. ブラウザの開発者ツールでNetworkタブを確認
2. リクエストヘッダーに`Cookie`が含まれていることを確認
3. レスポンスヘッダーに`Access-Control-Allow-Credentials: true`が含まれていることを確認
4. サーバーログでセッション情報が正常に出力されていることを確認

## 注意事項

- **既存のUIやReactコンポーネントは一切変更していません**
- **修正はサーバーサイド（Express）、CORS設定、セッション設定、環境変数のみ**
- **フロントエンドのfetchやaxiosコードは変更していません**
- **開発環境では`secure: false`、本番環境では`secure: true`に設定**
- **セッションの`sameSite`設定は環境に応じて自動調整**

## トラブルシューティング

### セッションが維持されない場合：
1. ブラウザのCookie設定を確認
2. 開発者ツールでNetworkタブのリクエスト/レスポンスヘッダーを確認
3. サーバーログでセッション情報を確認
4. 環境変数が正しく設定されているか確認

### CORSエラーが発生する場合：
1. `FRONTEND_URL`環境変数が正しく設定されているか確認
2. サーバーログでCORS設定を確認
3. ブラウザの開発者ツールでエラーメッセージを確認 