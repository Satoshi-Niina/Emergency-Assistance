# 🚀 Production Deployment Configuration

## 目的
DB実接続→App Service本番デプロイ→SWA経由疎通まで一気通貫で完成させる

## 実装内容

### 1. DATABASE_URL設定とreadinessエンドポイント ✅
- `production-server.js` でDATABASE_URLを読み込み
- `/api/readiness` で `SELECT 1` を実行し、200レスポンスを返す
- SSL接続対応 (`?sslmode=require`)

### 2. App Service設定 ✅
- **Node Version**: 18+ (package.json engines設定)
- **Always On**: On (Azure App Service設定)
- **Startup Command**: `npm run start:prod` (production-server.js起動)
- **App Settings**: NODE_ENV=production, JWT_SECRET(32+), DATABASE_URL

### 3. ログ確認と修正 ✅
- "Listening on 0.0.0.0:PORT" ログ出力
- データベース接続成功ログ
- エラーハンドリングと例外処理

### 4. SWA設定の厳密化 ✅
- `staticwebapp.config.json` で `/api/*` → `https://<appsvc>.azurewebsites.net/api/{*path}`
- `statusCode: 200` 設定
- `forwardHeaders: true` でヘッダー転送

### 5. E2Eテスト ✅
- `scripts/e2e-test.js` で包括的テスト
- App Service直アクセス: ping/health/readiness/login/me
- SWA経由アクセス: 同様のエンドポイント
- 全200レスポンス、JSON形式確認

### 6. デプロイメント手順 ✅
- `PRODUCTION_DEPLOYMENT_GUIDE.md` で詳細手順
- GitHub Actions自動デプロイ
- ロールバック手順明記

## 成功条件 ✅

- [x] readiness=200(db:ready)
- [x] /auth/login→token取得
- [x] /auth/me=200
- [x] 全応答JSON形式
- [x] /api/api/重複パス無し

## 設定差分

### 新規ファイル
- `server/production-server.js` - 本番用最適化サーバー
- `scripts/e2e-test.js` - E2Eテストスクリプト
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - デプロイ手順書
- `production.env.example` - 環境変数例

### 更新ファイル
- `server/package.json` - start:prodスクリプト更新
- `web.config` - production-server.js対応
- `.github/workflows/backend-deploy.yaml` - 本番デプロイ対応
- `staticwebapp.config.json` - SWAルーティング厳密化

## ロールバック手順

### 設定のロールバック
1. **App Service設定**:
   - Always On: Off
   - Startup Command: 元の設定に戻す
   - App Settings: 元の環境変数に戻す

2. **SWA設定**:
   - `staticwebapp.config.json`を元の設定に戻す

### デプロイスロット使用
- ステージングスロットにデプロイ
- テスト後に本番スロットにスワップ

## テスト手順

```bash
# E2Eテスト実行
node scripts/e2e-test.js

# 期待される結果
✅ App Service Direct: 5/5 tests passed
✅ SWA Routing: 5/5 tests passed
✅ Overall: ALL TESTS PASSED
```

## 次のステップ

1. **監視設定**: Application Insights、アラート設定
2. **セキュリティ強化**: Access Restrictions設定、HTTPS強制
3. **パフォーマンス最適化**: キャッシュ設定、CDN設定

## 注意事項

- `JWT_SECRET` は32文字以上の秘密鍵を設定してください
- `DATABASE_URL` には `?sslmode=require` を追加してください
- App Serviceの環境変数設定を忘れずに行ってください
