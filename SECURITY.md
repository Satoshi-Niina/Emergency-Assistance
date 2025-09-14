# セキュリティガイド

## 実装されたセキュリティ対策

### 1. 認証・認可
- **強力なパスワードポリシー**: 8文字以上、大文字・小文字・数字・特殊文字必須
- **bcryptハッシュ化**: ソルトラウンド12でパスワードをハッシュ化
- **セッション管理**: 24時間の有効期限、適切なクッキー設定
- **レート制限**: ログイン試行を15分間に5回まで制限

### 2. 入力検証
- **express-validator**: すべての入力データを検証
- **XSS対策**: 入力データのサニタイズ
- **SQLインジェクション対策**: Drizzle ORMによるパラメータ化クエリ

### 3. セキュリティヘッダー
- **Helmet.js**: セキュリティヘッダーの自動設定
- **CSP**: Content Security PolicyによるXSS対策
- **HSTS**: HTTPS Strict Transport Security
- **X-Frame-Options**: クリックジャッキング対策

### 4. 監視・ログ
- **セキュリティイベントログ**: すべての認証イベントを記録
- **疑わしいIP検出**: 複数回の失敗でIPをブロック
- **ログローテーション**: ファイルサイズ制限と古いログの自動削除

### 5. レート制限
- **一般リクエスト**: 15分間に100回
- **認証リクエスト**: 15分間に5回
- **厳格制限**: 15分間に10回

## セキュリティ設定

### パスワード要件
```typescript
{
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  saltRounds: 12
}
```

### セッション設定
```typescript
{
  maxAge: 24 * 60 * 60 * 1000, // 24時間
  secure: true, // 本番環境
  httpOnly: true,
  sameSite: 'none' // 本番環境
}
```

## 使用方法

### 1. セキュアなログイン
```typescript
// パスワード強度チェック
const validation = validatePassword(password);
if (!validation.valid) {
  return res.status(400).json({ error: validation.message });
}

// bcryptでハッシュ化
const hashedPassword = await bcrypt.hash(password, 12);
```

### 2. 認証ミドルウェア
```typescript
// 認証が必要なルート
app.use('/api/protected', requireAuth);

// 管理者権限が必要なルート
app.use('/api/admin', requireAdmin);
```

### 3. セキュリティ監視
```typescript
// セキュリティイベントをログ
logSecurityEvent('LOGIN_SUCCESS', { username }, req);

// 疑わしいIPをチェック
if (securityMonitor.isSuspiciousIP(ip)) {
  // アクセスをブロック
}
```

## 本番環境での追加設定

### 1. HTTPS必須
```typescript
if (process.env.NODE_ENV === 'production' && !req.secure) {
  return res.redirect(`https://${req.headers.host}${req.url}`);
}
```

### 2. 環境変数
```bash
NODE_ENV=production
SESSION_SECRET=your-super-secret-session-key
DATABASE_URL=your-secure-database-url
```

### 3. リバースプロキシ設定
```nginx
# Nginx設定例
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
```

## セキュリティテスト

### 1. パスワード強度テスト
```bash
curl -X POST http://localhost:3001/api/security/test-password-strength \
  -H "Content-Type: application/json" \
  -d '{"password": "TestPassword123!"}'
```

### 2. 認証テスト
```bash
# ログイン
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "niina", "password": "G&896845"}' \
  -c cookies.txt

# 認証が必要なエンドポイント
curl -X GET http://localhost:3001/api/security/test \
  -b cookies.txt
```

## 監視とアラート

### 1. セキュリティログの確認
```bash
tail -f logs/security.log | grep "SECURITY:"
```

### 2. 疑わしい活動の検出
- 複数回のログイン失敗
- 異常なリクエストパターン
- 疑わしいIPアドレスからのアクセス

### 3. アラート設定
- 失敗したログイン試行の閾値超過
- 疑わしいIPの検出
- セキュリティイベントの異常な増加

## 定期的なセキュリティチェック

### 1. パスワードポリシーの確認
- 定期的なパスワード変更の強制
- 弱いパスワードの検出と通知

### 2. セッション管理の確認
- セッションの有効期限チェック
- 異常なセッション活動の監視

### 3. ログの監査
- セキュリティログの定期的な確認
- 異常なアクセスパターンの分析

## 緊急時の対応

### 1. セキュリティインシデント
1. 影響範囲の特定
2. 攻撃の停止
3. システムの復旧
4. 原因の調査と対策

### 2. ユーザーアカウントの無効化
```typescript
// ユーザーアカウントを無効化
await db.update(users)
  .set({ isActive: false })
  .where(eq(users.id, userId));
```

### 3. セッションの強制終了
```typescript
// すべてのセッションを無効化
req.session.destroy();
```

このセキュリティガイドに従って、システムの安全性を維持してください。
