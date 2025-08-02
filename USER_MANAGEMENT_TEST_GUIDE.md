# ユーザー管理機能 テストガイド

## 概要
このドキュメントは、ユーザー管理機能のテスト方法とサンプルデータを提供します。

## 修正内容

### バックエンドAPI修正
- `GET /api/users`: 認証と管理者権限チェックを追加
- `POST /api/users`: 認証と管理者権限チェックを追加、バリデーション強化
- エラーハンドリングの改善
- レスポンス形式の統一

### フロントエンド修正
- エラーハンドリングの改善
- 認証エラーと権限エラーの適切な表示
- バリデーションの強化
- ユーザーフレンドリーなエラーメッセージ

## テスト手順

### 1. サーバー起動
```bash
cd server
npm run dev
```

### 2. クライアント起動
```bash
cd client
npm run dev
```

### 3. 管理者アカウントでログイン
- 管理者権限を持つユーザーでログイン
- 設定画面 → ユーザー管理にアクセス

### 4. ユーザー一覧表示テスト
- ユーザー一覧が正常に表示されることを確認
- 各ユーザーの情報（ユーザー名、表示名、権限、部署）が表示されることを確認

### 5. 新規ユーザー作成テスト

#### 正常ケース
```json
{
  "username": "testuser1",
  "password": "password123",
  "display_name": "テストユーザー1",
  "role": "employee",
  "department": "技術部",
  "description": "テスト用ユーザー"
}
```

#### エラーケース
1. **必須項目不足**
   ```json
   {
     "username": "testuser2",
     "password": "password123"
     // display_nameとroleが不足
   }
   ```

2. **ユーザー名重複**
   ```json
   {
     "username": "testuser1", // 既存のユーザー名
     "password": "password123",
     "display_name": "テストユーザー2",
     "role": "employee"
   }
   ```

3. **パスワード短すぎ**
   ```json
   {
     "username": "testuser3",
     "password": "123", // 6文字未満
     "display_name": "テストユーザー3",
     "role": "employee"
   }
   ```

4. **権限値不正**
   ```json
   {
     "username": "testuser4",
     "password": "password123",
     "display_name": "テストユーザー4",
     "role": "invalid_role" // 不正な権限
   }
   ```

## API テスト用サンプル

### cURL コマンド例

#### ユーザー一覧取得
```bash
curl -X GET http://localhost:5001/api/users \
  -H "Content-Type: application/json" \
  -H "Cookie: emergency-assistance-session=YOUR_SESSION_COOKIE"
```

#### 新規ユーザー作成
```bash
curl -X POST http://localhost:5001/api/users \
  -H "Content-Type: application/json" \
  -H "Cookie: emergency-assistance-session=YOUR_SESSION_COOKIE" \
  -d '{
    "username": "newuser",
    "password": "password123",
    "display_name": "新規ユーザー",
    "role": "employee",
    "department": "営業部",
    "description": "新規作成テスト"
  }'
```

## 期待される動作

### 正常動作
1. 管理者でログイン後、ユーザー一覧が表示される
2. 新規ユーザー作成が成功し、一覧に追加される
3. エラーメッセージが適切に表示される

### エラー動作
1. 非管理者でアクセス時：権限エラーメッセージ表示
2. 未ログイン時：認証エラーメッセージ表示
3. バリデーションエラー時：具体的なエラーメッセージ表示

## トラブルシューティング

### よくある問題
1. **セッション切れ**: ログインし直してください
2. **権限不足**: 管理者アカウントでログインしてください
3. **DB接続エラー**: サーバーログを確認してください

### ログ確認
```bash
# サーバーログ
tail -f server/logs/app.log

# ブラウザ開発者ツール
# Console タブでエラーメッセージを確認
```

## サンプルユーザーデータ

### 管理者ユーザー
```json
{
  "username": "admin",
  "password": "admin123",
  "display_name": "システム管理者",
  "role": "admin",
  "department": "IT部",
  "description": "システム全体の管理者"
}
```

### 一般ユーザー
```json
{
  "username": "user1",
  "password": "user123",
  "display_name": "一般ユーザー1",
  "role": "employee",
  "department": "営業部",
  "description": "営業担当者"
}
```

## 完了確認項目

- [ ] ユーザー一覧が正常に表示される
- [ ] 新規ユーザー作成が成功する
- [ ] バリデーションエラーが適切に表示される
- [ ] 認証エラーが適切に表示される
- [ ] 権限エラーが適切に表示される
- [ ] エラーメッセージが日本語で表示される 