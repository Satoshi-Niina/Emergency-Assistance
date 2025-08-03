# API・CORS・セッション設定修正完了サマリー

## 修正完了状況

### ✅ 修正済み項目

1. **CORS設定の改善**
   - `credentials: true`を必須設定に変更
   - `Access-Control-Allow-Credentials: true`を明示的に設定
   - 環境別のオリジン許可リストを実装（ローカル、Replit、Azure）
   - ワイルドカードドメイン対応（`*.replit.app`、`*.azurewebsites.net`）

2. **セッション設定の改善**
   - 環境に応じた`secure`と`sameSite`設定
   - 本番環境：`secure: true, sameSite: 'none'`
   - 開発環境：`secure: false, sameSite: 'lax'`
   - セッション維持のための適切な設定

3. **環境変数読み込みの改善**
   - 複数の.envファイルパスでの読み込み対応
   - エラーハンドリングの追加
   - 読み込まれた環境変数のログ出力

4. **設定の一元化**
   - `server/app.ts`でCORSとセッション設定を一元管理
   - `server/index.ts`の重複設定を削除
   - 設定の競合を解消

## 修正されたファイル

### サーバー側
1. `server/app.ts` - CORS設定、セッション設定、環境変数確認の改善
2. `server/index.ts` - 重複設定の削除、環境変数読み込みの改善

### 設定ファイル
1. `ENV_SETUP_EXAMPLE.md` - 環境変数設定例の作成

## 修正内容詳細

### 1. CORS設定の改善

#### Before（修正前）
```javascript
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5002', 
      'http://127.0.0.1:5002',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  // ...
}));
```

#### After（修正後）
```javascript
const getAllowedOrigins = () => {
  const baseOrigins = [
    'http://localhost:5002', 
    'http://127.0.0.1:5002',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ];

  // Replit環境の場合
  if (isReplitEnvironment) {
    baseOrigins.push(
      'https://*.replit.app',
      'https://*.replit.dev'
    );
  }

  // Azure環境の場合
  if (isAzureEnvironment) {
    baseOrigins.push(
      'https://*.azurewebsites.net',
      'https://*.azure.com'
    );
  }

  return baseOrigins;
};

app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    if (!origin) {
      callback(null, true);
      return;
    }

    // ワイルドカードドメインのチェック
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace('*', '.*');
        return new RegExp(pattern).test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      console.log('🔍 Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // 必須設定
  // ...
}));
```

### 2. セッション設定の改善

#### Before（修正前）
```javascript
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret-for-development-only',
  resave: true,
  saveUninitialized: false,
  cookie: {
    secure: false, // 開発環境ではfalse
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/',
    domain: undefined
  },
  name: 'emergency-assistance-session',
  rolling: true
}));
```

#### After（修正後）
```javascript
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-session-secret-for-development-only',
  resave: true,
  saveUninitialized: false,
  cookie: {
    secure: isProduction || isReplitEnvironment || isAzureEnvironment, // 本番環境ではtrue
    httpOnly: true,
    sameSite: isProduction || isReplitEnvironment || isAzureEnvironment ? 'none' : 'lax', // 本番環境ではnone
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/',
    domain: undefined
  },
  name: 'emergency-assistance-session',
  rolling: true
};

console.log('🔧 セッション設定:', {
  secure: sessionConfig.cookie.secure,
  sameSite: sessionConfig.cookie.sameSite,
  isProduction,
  isReplitEnvironment,
  isAzureEnvironment
});

app.use(session(sessionConfig));
```

### 3. 環境変数読み込みの改善

#### Before（修正前）
```javascript
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (result.parsed && Object.keys(result.parsed).length > 0) {
    loadedEnvFile = envPath;
    console.log('✅ 環境変数ファイル読み込み成功:', envPath);
    break;
  }
}
```

#### After（修正後）
```javascript
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (result.parsed && Object.keys(result.parsed).length > 0) {
      loadedEnvFile = envPath;
      console.log('✅ 環境変数ファイル読み込み成功:', envPath);
      console.log('📝 読み込まれた環境変数:', Object.keys(result.parsed));
      break;
    }
  } catch (error) {
    console.log('⚠️ 環境変数ファイル読み込みエラー:', envPath, error);
  }
}
```

## 環境別設定

### ローカル開発環境
- CORS: `http://localhost:*` を許可
- セッション: `secure: false, sameSite: 'lax'`
- API URL: `http://localhost:3001`

### Replit環境
- CORS: `https://*.replit.app`, `https://*.replit.dev` を許可
- セッション: `secure: true, sameSite: 'none'`
- API URL: `https://your-replit-app.replit.app`

### Azure環境
- CORS: `https://*.azurewebsites.net`, `https://*.azure.com` を許可
- セッション: `secure: true, sameSite: 'none'`
- API URL: `https://your-azure-app.azurewebsites.net`

## テスト方法

### 1. ローカル環境でのテスト
```bash
# サーバー起動
cd server
npm run dev

# フロントエンド起動
cd client
npm run dev

# ヘルスチェック
curl http://localhost:3001/api/health

# デバッグ情報確認
curl http://localhost:3001/api/debug/env
```

### 2. CORS設定の確認
```bash
# プリフライトリクエストのテスト
curl -X OPTIONS http://localhost:3001/api/users \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

### 3. セッション設定の確認
```bash
# ログイン後のセッション確認
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"niina","password":"0077"}' \
  -c cookies.txt

# セッションを使用したAPI呼び出し
curl http://localhost:3001/api/users \
  -b cookies.txt
```

## 期待される効果

### 1. CORSエラーの解決
- フロントエンドからのAPI呼び出しでCORSエラーが発生しなくなる
- `credentials: true`によりCookieが正しく送信される
- 環境別の適切なオリジン設定により、各環境で正常に動作

### 2. セッション維持の改善
- ログイン後のセッションが正しく維持される
- 環境に応じた適切なセッション設定により、セキュリティと利便性を両立
- 401エラーの発生を防止

### 3. 環境変数の確実な読み込み
- 複数の.envファイルパスでの読み込みにより、設定の確実性を向上
- エラーハンドリングにより、設定問題の早期発見が可能
- 詳細なログ出力により、デバッグが容易

## 次のステップ

### 1. 環境変数ファイルの作成
- `server/.env`ファイルを作成し、適切な値を設定
- `client/.env.local`ファイルを作成し、適切な値を設定

### 2. 動作確認
- ローカル環境での動作確認
- 各環境での動作確認（Replit、Azure）

### 3. セキュリティ強化
- 本番環境での強力なシークレットキーの設定
- HTTPSの確実な使用
- 定期的なシークレットキーの更新

## 注意事項

1. **本番環境では必ず強力なシークレットキーを使用してください**
2. **環境変数ファイルはGitにコミットしないでください**
3. **本番環境ではHTTPSを使用してください**
4. **CORS設定は必要最小限のドメインのみを許可してください**
5. **セッション設定は環境に応じて適切に設定してください**

これで、フロントエンドのUIからPostgreSQLのデータ取得・新規登録APIが正常に動作するはずです。 