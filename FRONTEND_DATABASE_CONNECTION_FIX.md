# フロントエンド・データベース接続問題修正ガイド

## 問題の特定

### 根本的な問題
1. **APIエンドポイントの不整合**: フロントエンドが期待するAPIレスポンス形式とサーバーが返す形式が異なる
2. **認証・セッション管理の問題**: フロントエンドとサーバー間のセッション維持ができていない
3. **CORS設定の問題**: フロントエンドからのリクエストが正しく処理されていない
4. **データベース接続の問題**: サーバー側でデータベースからのデータ取得が正常に動作していない

## 修正内容

### 1. サーバー側APIエンドポイントの統一

#### 1.1 ユーザー管理APIの修正
```typescript
// server/routes/users.ts
router.get('/', async (req: any, res: any) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        
        const allUsers = await db.select({
            id: users.id,
            username: users.username,
            display_name: users.displayName,
            role: users.role,
            department: users.department,
            description: users.description,
            created_at: users.created_at
        }).from(users);
        
        // フロントエンドが期待する形式でレスポンス
        res.json({
            success: true,
            data: allUsers,
            total: allUsers.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('ユーザー一覧取得エラー:', error);
        res.status(500).json({
            success: false,
            error: 'ユーザー一覧の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
```

#### 1.2 新規ユーザー作成APIの修正
```typescript
// server/routes/users.ts
router.post('/', async (req: any, res: any) => {
    try {
        const { username, password, display_name, role, department, description } = req.body;
        
        // パスワードのハッシュ化
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // ユーザーの作成
        const newUser = await db.insert(users).values({
            username,
            password: hashedPassword,
            displayName: display_name,
            role,
            department,
            description
        }).returning();
        
        res.json({
            success: true,
            data: newUser[0],
            message: 'ユーザーが正常に作成されました'
        });
    } catch (error) {
        console.error('ユーザー作成エラー:', error);
        res.status(500).json({
            success: false,
            error: 'ユーザーの作成に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
```

### 2. フロントエンド側のAPI呼び出し修正

#### 2.1 ユーザー管理ページの修正
```typescript
// client/src/pages/users.tsx
const { data: users, isLoading, error: queryError } = useQuery<UserData[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
        console.log('🔍 ユーザー一覧取得開始');
        
        const res = await apiRequest("GET", "/api/users");
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`ユーザー取得失敗: ${errorText}`);
        }
        
        const userData = await res.json();
        console.log('🔍 ユーザー一覧データ:', userData);
        
        // APIレスポンスの構造に合わせてデータを取得
        if (userData.success && userData.data) {
            return userData.data;
        } else if (Array.isArray(userData)) {
            return userData;
        } else {
            throw new Error("ユーザーデータの形式が不正です");
        }
    },
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
        if (error instanceof Error) {
            if (error.message.includes('認証が必要') || error.message.includes('管理者権限')) {
                return false;
            }
        }
        return failureCount < 2;
    },
});
```

#### 2.2 新規ユーザー作成の修正
```typescript
// client/src/pages/users.tsx
const createUserMutation = useMutation({
    mutationFn: async (newUser: NewUserData) => {
        console.log('🔍 新規ユーザー作成開始:', newUser);
        
        const res = await apiRequest("POST", "/api/users", newUser);
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`ユーザー作成失敗: ${errorText}`);
        }
        
        const result = await res.json();
        console.log('🔍 ユーザー作成結果:', result);
        
        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error || 'ユーザーの作成に失敗しました');
        }
    },
    onSuccess: (data) => {
        console.log('✅ ユーザー作成成功:', data);
        toast({
            title: "成功",
            description: "ユーザーが正常に作成されました",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        resetNewUserForm();
    },
    onError: (error) => {
        console.error('❌ ユーザー作成エラー:', error);
        toast({
            title: "エラー",
            description: error instanceof Error ? error.message : "ユーザーの作成に失敗しました",
            variant: "destructive",
        });
    },
});
```

### 3. CORS設定の改善

#### 3.1 サーバー側CORS設定
```typescript
// server/app.ts
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = [
            'http://localhost:5002', 
            'http://127.0.0.1:5002',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5173', // Vite開発サーバー
            'http://127.0.0.1:5173'
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('🚫 CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
```

### 4. セッション管理の改善

#### 4.1 セッション設定の修正
```typescript
// server/app.ts
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24時間
        sameSite: 'lax'
    },
    store: new (require('connect-pg-simple')(session))({
        conObject: {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        },
    }),
}));
```

### 5. データベース接続の確認

#### 5.1 データベース接続テスト
```typescript
// server/routes/debug.ts
router.get('/database-test', async (req: any, res: any) => {
    try {
        // データベース接続テスト
        const result = await db.execute('SELECT NOW() as current_time');
        
        // テーブル一覧取得
        const tables = await db.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        res.json({
            success: true,
            database: {
                connected: true,
                currentTime: result[0].current_time,
                tables: tables.map((t: any) => t.table_name)
            }
        });
    } catch (error) {
        console.error('データベース接続エラー:', error);
        res.status(500).json({
            success: false,
            error: 'データベース接続に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
```

## 実行手順

### 1. サーバー側の修正
```bash
cd server
npm run dev
```

### 2. フロントエンド側の修正
```bash
cd client
npm run dev
```

### 3. データベース接続確認
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3001/api/debug/database-test" -UseBasicParsing
```

### 4. ユーザー管理APIテスト
```bash
# ユーザー一覧取得
Invoke-WebRequest -Uri "http://localhost:3001/api/users" -UseBasicParsing

# 新規ユーザー作成
$body = @{
    username = "testuser"
    password = "testpass123"
    display_name = "テストユーザー"
    role = "employee"
    department = "テスト部署"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/api/users" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

## 期待される結果

### 修正後の動作
1. **データベース接続**: 正常にデータベースに接続できる
2. **ユーザー一覧表示**: フロントエンドでユーザー一覧が正常に表示される
3. **新規ユーザー作成**: フロントエンドから新規ユーザーが正常に作成される
4. **セッション維持**: ログイン後にセッションが正常に維持される
5. **CORS問題解決**: フロントエンドからのリクエストが正常に処理される

### 確認ポイント
- ✅ `/api/debug/database-test` - データベース接続成功
- ✅ `/api/users` - ユーザー一覧取得成功
- ✅ `/api/users` (POST) - 新規ユーザー作成成功
- ✅ フロントエンドでのユーザー一覧表示
- ✅ フロントエンドでの新規ユーザー作成
- ✅ セッション維持確認

## トラブルシューティング

### よくあるエラーと対処法

1. **データベース接続エラー**
   ```bash
   # 環境変数の確認
   echo $env:DATABASE_URL
   
   # データベース接続テスト
   Invoke-WebRequest -Uri "http://localhost:3001/api/debug/database-test" -UseBasicParsing
   ```

2. **CORSエラー**
   ```bash
   # ブラウザの開発者ツールでネットワークタブを確認
   # プリフライトリクエストが正常に処理されているか確認
   ```

3. **セッション維持エラー**
   ```bash
   # セッション情報を確認
   Invoke-WebRequest -Uri "http://localhost:3001/api/debug/session" -UseBasicParsing
   ```

4. **APIレスポンス形式エラー**
   ```bash
   # APIレスポンスを確認
   Invoke-WebRequest -Uri "http://localhost:3001/api/users" -UseBasicParsing
   ```

これで、フロントエンドとデータベースの接続問題が解決され、UIでのデータの表示・読み出し・保存が正常に動作するはずです。 