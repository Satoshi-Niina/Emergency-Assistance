# Emergency Assistance System - 最終修正ガイド

## 修正内容サマリー

### 1. セッション維持問題の修正

**問題**: ログイン後、APIで `userId`, `userRole` が `undefined`

**修正内容**:
- CORS設定を改善（複数オリジン対応、credentials維持）
- セッション設定を強化（rolling: true, 7日間有効期限）
- セッションデバッグミドルウェアを追加

### 2. DBスキーマ不整合の修正

**問題**: 
- `列 m.machine_type_id は存在しません`
- `リレーション "history_items" は存在しません`

**修正内容**:
- `migrations/0003_fix_schema_final.sql` を作成
- `machines` テーブルに `machine_type_id` カラムを追加
- `history_items` テーブルを作成
- カラム名の統一（`type_name` → `machine_type_name`）

### 3. ファイルエラーの修正

**問題**: `knowledge-base/data/` フォルダが存在しない

**修正内容**:
- サーバー起動時に必要なディレクトリを自動作成
- 以下のディレクトリを自動生成：
  - `knowledge-base/`
  - `knowledge-base/images/`
  - `knowledge-base/data/`
  - `knowledge-base/troubleshooting/`
  - `knowledge-base/temp/`
  - `knowledge-base/qa/`
  - `knowledge-base/json/`
  - `knowledge-base/backups/`

## 修正されたファイル一覧

1. `server/app.ts` - CORS設定、セッション設定、ディレクトリ自動作成
2. `migrations/0003_fix_schema_final.sql` - DBスキーマ修正
3. `server/scripts/apply-migration.ts` - マイグレーション実行スクリプト
4. `test-session-api.sh` - セッション維持確認用テストスクリプト

## セットアップ手順

### 1. 環境変数の設定

```bash
# server/.env ファイルを作成
DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance
NODE_ENV=development
SESSION_SECRET=your-secret-key-here
```

### 2. PostgreSQLデータベースの準備

```bash
# PostgreSQLに接続
psql -U postgres

# データベースを作成
CREATE DATABASE emergency_assistance;

# 接続確認
\c emergency_assistance
```

### 3. マイグレーションの実行

```bash
# サーバーディレクトリに移動
cd server

# マイグレーションを実行
npm run apply-migration
```

### 4. サーバーの起動

```bash
# 開発サーバーを起動
npm run dev
```

### 5. セッション維持確認

```bash
# テストスクリプトを実行
chmod +x test-session-api.sh
./test-session-api.sh
```

## API確認方法

### 基本的なcurlコマンド例

#### 1. ログイン（セッション開始）
```bash
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

#### 2. セッション確認
```bash
curl -b cookies.txt http://localhost:5000/api/auth/me
```

#### 3. 機種一覧取得（セッション付き）
```bash
curl -b cookies.txt http://localhost:5000/api/machine-types
```

#### 4. 全機械データ取得（セッション付き）
```bash
curl -b cookies.txt http://localhost:5000/api/all-machines
```

#### 5. 履歴一覧取得（セッション付き）
```bash
curl -b cookies.txt http://localhost:5000/api/history
```

#### 6. ログアウト
```bash
curl -b cookies.txt -X POST http://localhost:5000/api/auth/logout
```

## 期待される結果

### 修正後の動作

1. **セッション維持**: ログイン後、APIで `userId`, `userRole` が正常に取得できる
2. **DBスキーマ**: SQLエラーが発生しない
3. **ファイル構造**: 必要なディレクトリが自動生成される
4. **API応答**: すべてのAPIが正常にデータを返す

### 確認ポイント

- ✅ `/api/auth/login` - ログイン成功
- ✅ `/api/auth/me` - セッション確認成功
- ✅ `/api/machine-types` - 機種一覧取得成功
- ✅ `/api/all-machines` - 全機械データ取得成功
- ✅ `/api/history` - 履歴一覧取得成功
- ✅ `/api/flows` - フロー一覧取得成功

## トラブルシューティング

### よくあるエラーと対処法

1. **セッションが維持されない**
   ```bash
   # Cookieが正しく送信されているか確認
   curl -v -b cookies.txt http://localhost:5000/api/auth/me
   ```

2. **DBスキーマエラー**
   ```bash
   # マイグレーションを再実行
   npm run apply-migration
   ```

3. **ディレクトリ作成エラー**
   ```bash
   # 権限を確認
   ls -la knowledge-base/
   ```

4. **CORSエラー**
   ```bash
   # ブラウザの開発者ツールでネットワークタブを確認
   # プリフライトリクエストが正常に処理されているか確認
   ```

## 技術的な修正詳細

### CORS設定の改善点

```typescript
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5002', 
      'http://127.0.0.1:5002',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  // ... その他の設定
}));
```

### セッション設定の改善点

```typescript
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret',
  resave: true,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7日間
    path: '/',
    domain: undefined
  },
  name: 'emergency-assistance-session',
  rolling: true // セッション更新時に期限を延長
}));
```

### ディレクトリ自動作成の実装

```typescript
function ensureDirectoryExists(dirPath: string, label: string) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ ディレクトリを作成しました: ${label}`);
    } catch (error) {
      console.error(`❌ ディレクトリ作成エラー: ${label}`, error);
    }
  }
}
```

これで、セッション維持、DBスキーマ、ファイル構造の問題がすべて解決され、APIが正常に動作するはずです。 