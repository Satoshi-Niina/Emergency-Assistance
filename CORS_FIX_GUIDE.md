# 🚨 CORS エラー解決ガイド - Emergency Assistance

## 現在発生している問題

```
Access to fetch at 'https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/auth/login' 
from origin 'https://witty-river-012f39e00.1.azurestaticapps.net' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## ✅ 実装済みの修正

### 1. サーバー側CORS設定強化
- `azure-server.js`: Azure Static Web Apps を最優先で許可
- `azure-server-debug.js`: 詳細なCORSデバッグ機能追加
- プリフライト（OPTIONS）リクエストの適切な処理

### 2. 追加された診断エンドポイント
- `GET /api/debug/cors` - CORS設定の確認
- 強化されたログ出力

## 🔧 Azure Portal での追加設定（推奨）

### Azure App Service での CORS 設定
1. Azure Portal → App Service "Emergency-Assistance"
2. API → CORS
3. 以下のオリジンを追加：
   ```
   https://witty-river-012f39e00.1.azurestaticapps.net
   http://localhost:5173
   http://localhost:8080
   ```
4. "Access-Control-Allow-Credentials" を有効化
5. 保存

### 環境変数での CORS 設定
Azure App Service → 設定 → 環境変数に追加：
```
CORS_ALLOW_ORIGINS=https://witty-river-012f39e00.1.azurestaticapps.net,http://localhost:5173
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
STATIC_WEB_APP_URL=https://witty-river-012f39e00.1.azurestaticapps.net
```

## 🚀 即座に試すべき方法

### 1. GitHub Actions で手動デプロイ
1. https://github.com/Satoshi-Niina/Emergency-Assistance/actions
2. "Force Deploy Server Now" を選択
3. "Run workflow" → "Run workflow"

### 2. Azure Portal でのアプリ再起動
1. Azure Portal → App Service "Emergency-Assistance"
2. 概要 → 再起動

### 3. CORS テスト
デプロイ後、以下のURLでCORS設定を確認：
```
https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/debug/cors
```

## 🔍 デバッグ手順

### ブラウザでのテスト
1. フロントエンドを開く: https://witty-river-012f39e00.1.azurestaticapps.net
2. ブラウザの開発者ツールを開く（F12）
3. Network タブでログインリクエストを確認
4. Console タブでCORSエラーを確認

### PowerShell でのテスト
```powershell
# OPTIONSプリフライトテスト
$headers = @{
    "Origin" = "https://witty-river-012f39e00.1.azurestaticapps.net"
    "Access-Control-Request-Method" = "POST"
    "Access-Control-Request-Headers" = "content-type"
}

Invoke-WebRequest -Uri "https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/auth/login" -Method OPTIONS -Headers $headers
```

### 成功の確認方法
以下が表示されればCORS設定成功：
- `Access-Control-Allow-Origin: https://witty-river-012f39e00.1.azurestaticapps.net`
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH`

## ⚠️ よくある問題と解決策

### 問題1: サーバーがまだタイムアウトする
**解決策**: Azure App Service の再起動が必要
1. Azure Portal → App Service → 再起動
2. 2-3分待機

### 問題2: CORS ヘッダーが返されない
**解決策**: Azure Portal でのCORS設定確認
1. API → CORS で設定を確認
2. 環境変数の確認

### 問題3: プリフライトリクエストが失敗
**解決策**: OPTIONS メソッドの確認
- サーバーログでOPTIONSリクエストが処理されているか確認

## 🎯 期待される結果

修正後：
1. ✅ CORSエラーが解消される
2. ✅ ログインフォームが正常に動作する
3. ✅ APIリクエストが成功する
4. ✅ ブラウザのConsoleエラーが消える

## 📞 次の手順

1. **即座に実行**: GitHub Actions での手動デプロイ
2. **並行実行**: Azure Portal での App Service 再起動
3. **確認**: フロントエンドでのログインテスト
4. **追加設定**: Azure Portal でのCORS設定（推奨）