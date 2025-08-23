# Azure 本番環境 準備状況確認
# 使用方法: .\check-azure-readiness.ps1

Write-Host "=== Azure 本番環境準備状況確認 ===" -ForegroundColor Green

# 1. GitHub Actions の確認
Write-Host "`n📦 1. GitHub Actions デプロイ状況..." -ForegroundColor Yellow
Write-Host "確認URL: https://github.com/Satoshi-Niina/Emergency-Assistance/actions" -ForegroundColor Cyan

# 2. バックエンドの基本確認
Write-Host "`n🔧 2. バックエンド準備確認..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://emergency-backend-webapp.azurewebsites.net" -Method Get -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ バックエンドサービス起動中" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ バックエンドサービス未起動 (正常: デプロイ待ち)" -ForegroundColor Yellow
    Write-Host "   デプロイ完了後に再実行してください" -ForegroundColor Gray
}

# 3. フロントエンドの基本確認
Write-Host "`n🌐 3. フロントエンド準備確認..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://witty-river-012f39e00.1.azurestaticapps.net" -Method Get -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ フロントエンドサービス起動中" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ フロントエンドサービス未起動 (正常: デプロイ待ち)" -ForegroundColor Yellow
    Write-Host "   デプロイ完了後に再実行してください" -ForegroundColor Gray
}

# 4. 必要な設定の確認
Write-Host "`n⚙️  4. Azure App Settings 設定確認..." -ForegroundColor Yellow
Write-Host "以下の設定が必要です:" -ForegroundColor White
Write-Host ""
Write-Host "📍 Azure Portal → App Services → emergency-backend-webapp → 設定 → 構成" -ForegroundColor Cyan
Write-Host ""
Write-Host "必須環境変数:" -ForegroundColor White
Write-Host "- DATABASE_URL (Azure PostgreSQL接続文字列)" -ForegroundColor Yellow
Write-Host "- OPENAI_API_KEY (OpenAI APIキー)" -ForegroundColor Yellow
Write-Host "- SESSION_SECRET (セッション暗号化キー)" -ForegroundColor Yellow
Write-Host "- FRONTEND_URL (Static Web Apps URL)" -ForegroundColor Yellow
Write-Host "- NODE_ENV=production" -ForegroundColor Gray

# 5. データベース要件
Write-Host "`n🗄️  5. データベース要件..." -ForegroundColor Yellow
Write-Host "Azure Database for PostgreSQL が必要:" -ForegroundColor White
Write-Host "- サーバー名: emergency-postgres-server (例)" -ForegroundColor Gray
Write-Host "- データベース: emergency_assistance" -ForegroundColor Gray
Write-Host "- SSL接続: 必須" -ForegroundColor Gray
Write-Host "- ファイアウォール: Azure サービス許可" -ForegroundColor Gray

Write-Host "`n=== 準備完了判定 ===" -ForegroundColor Green
Write-Host "✅ すべて完了後、完全な連携テストを実行:" -ForegroundColor White
Write-Host "   .\test-azure-deployment.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 詳細設定ガイド:" -ForegroundColor White
Write-Host "   PRODUCTION_INTEGRATION_GUIDE.md を参照" -ForegroundColor Cyan
