# 本番環境デプロイメント手順書

## 目的
DB実接続→App Service本番デプロイ→SWA経由疎通まで一気通貫で完成させる

## 前提条件
- Azure App Service (emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net)
- Azure Static Web Apps
- PostgreSQL データベース
- GitHub Actions による自動デプロイ

## 1. DATABASE_URL設定とreadinessエンドポイント

### 1.1 データベース接続確認
```bash
# 環境変数でDATABASE_URLを設定
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
```

### 1.2 readinessエンドポイント
- `/api/readiness` で `SELECT 1` を実行
- 成功時: `200 OK` + `{"ok": true, "db": "ready"}`
- 失敗時: `503 Service Unavailable` + `{"ok": false, "db": "error"}`

## 2. App Service設定

### 2.1 基本設定
- **Node Version**: 18+
- **Always On**: On
- **Startup Command**: `npm run start:prod`

### 2.2 App Settings (環境変数)
```bash
NODE_ENV=production
JWT_SECRET=your-32-character-secret-key-here
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
```

### 2.3 セキュリティ設定
- **EasyAuth**: Off
- **Access Restrictions**: 一時Allow → 後でSWAのOutboundへ限定

## 3. ログ確認と修正

### 3.1 Log Stream確認
```bash
# 期待されるログ
🚀 Server running on 0.0.0.0:PORT
✅ Database connected
📊 Health check: http://0.0.0.0:PORT/api/health
🔐 Login API: http://0.0.0.0:PORT/api/auth/login
```

### 3.2 例外行の修正
- ポート番号の確認
- データベース接続エラーの解決
- JWT_SECRETの設定確認

## 4. SWA設定の厳密化

### 4.1 staticwebapp.config.json
```json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"],
      "rewrite": "https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/{*path}",
      "forwardHeaders": true,
      "statusCode": 200
    }
  ]
}
```

### 4.2 重要なポイント
- `/api/*` パターンの厳密化
- `{*path}` によるパス転送
- `statusCode: 200` の設定

## 5. E2Eテスト実行

### 5.1 テストスクリプト実行
```bash
node scripts/e2e-test.js
```

### 5.2 テスト項目
1. **App Service直アクセス**:
   - `/api/ping` → 200
   - `/api/health` → 200
   - `/api/readiness` → 200 (db: ready)
   - `/api/auth/login` → 200 (token取得)
   - `/api/auth/me` → 200 (認証確認)

2. **SWA経由アクセス**:
   - 上記と同じエンドポイントをSWA経由でテスト

### 5.3 成功条件
- 全エンドポイントが200を返す
- readinessでdb: readyを確認
- loginでtokenを取得
- meで認証済みユーザー情報を取得
- 全応答がJSON形式
- `/api/api/` の重複パスが発生しない

## 6. デプロイメント手順

### 6.1 自動デプロイ (推奨)
```bash
# mainブランチにプッシュ
git add .
git commit -m "feat: production deployment configuration"
git push origin main
```

### 6.2 手動デプロイ
```bash
# サーバーディレクトリに移動
cd server

# 依存関係インストール
npm install --production

# 本番サーバー起動
npm run start:prod
```

## 7. ロールバック手順

### 7.1 設定のロールバック
1. **App Service設定**:
   - Always On: Off
   - Startup Command: 元の設定に戻す
   - App Settings: 元の環境変数に戻す

2. **SWA設定**:
   - staticwebapp.config.jsonを元の設定に戻す

### 7.2 デプロイスロット使用
```bash
# ステージングスロットにデプロイ
# テスト後に本番スロットにスワップ
```

## 8. トラブルシューティング

### 8.1 よくある問題
1. **DATABASE_URL未設定**:
   - App ServiceのApp Settingsで確認
   - `?sslmode=require` の追加

2. **JWT_SECRET未設定**:
   - 32文字以上の秘密鍵を設定

3. **ポート番号エラー**:
   - App Serviceは自動でPORT環境変数を設定

4. **SWAルーティングエラー**:
   - staticwebapp.config.jsonの設定確認
   - App ServiceのURL確認

### 8.2 ログ確認
```bash
# App Service Log Stream
# Application Insights
# GitHub Actions ログ
```

## 9. 成功確認チェックリスト

- [ ] DATABASE_URL設定済み
- [ ] /api/readiness が200を返す (db: ready)
- [ ] App Service設定完了 (Node18+, AlwaysOn, start:prod)
- [ ] JWT_SECRET設定済み (32文字以上)
- [ ] Log Streamで "Listening on 0.0.0.0:PORT" 確認
- [ ] SWA rewrite設定完了
- [ ] E2Eテスト全通過
- [ ] App Service直アクセス: ping/health/readiness/login/me 全200
- [ ] SWA経由アクセス: ping/health/readiness/login/me 全200
- [ ] 全応答がJSON形式
- [ ] /api/api/ の重複パスなし

## 10. 次のステップ

1. **監視設定**:
   - Application Insights
   - アラート設定

2. **セキュリティ強化**:
   - Access Restrictions設定
   - HTTPS強制

3. **パフォーマンス最適化**:
   - キャッシュ設定
   - CDN設定
