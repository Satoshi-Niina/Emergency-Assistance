# Azure App Service診断スクリプト
# ログイン問題のトラブルシューティング用

Write-Host "🔍 Emergency Assistance システム診断開始" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# バックエンドのヘルスチェック
Write-Host "`n1. バックエンドサーバーのヘルスチェック" -ForegroundColor Yellow
$backendUrl = "https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net"

try {
    $healthResponse = Invoke-RestMethod -Uri "$backendUrl/api/health" -Method GET -TimeoutSec 10
    Write-Host "✅ バックエンド基本ヘルスチェック成功" -ForegroundColor Green
    Write-Host "   - Status: $($healthResponse.status)" -ForegroundColor White
    Write-Host "   - Message: $($healthResponse.message)" -ForegroundColor White
} catch {
    Write-Host "❌ バックエンド基本ヘルスチェック失敗" -ForegroundColor Red
    Write-Host "   - Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 詳細ヘルスチェック
try {
    $detailedHealthResponse = Invoke-RestMethod -Uri "$backendUrl/api/health/detailed" -Method GET -TimeoutSec 10
    Write-Host "✅ バックエンド詳細ヘルスチェック成功" -ForegroundColor Green
    Write-Host "   - Environment: $($detailedHealthResponse.environment)" -ForegroundColor White
    Write-Host "   - Node Version: $($detailedHealthResponse.nodeVersion)" -ForegroundColor White
    Write-Host "   - Uptime: $([math]::Round($detailedHealthResponse.uptime/60, 2)) minutes" -ForegroundColor White
} catch {
    Write-Host "❌ バックエンド詳細ヘルスチェック失敗" -ForegroundColor Red
    Write-Host "   - Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 環境変数の確認
Write-Host "`n2. 環境変数の確認" -ForegroundColor Yellow
try {
    $envResponse = Invoke-RestMethod -Uri "$backendUrl/api/_diag/env" -Method GET -TimeoutSec 10
    Write-Host "✅ 環境変数取得成功" -ForegroundColor Green
    
    $criticalEnvs = @('DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET', 'FRONTEND_URL')
    foreach ($env in $criticalEnvs) {
        $value = $envResponse.env.$env
        if ($value -and $value -ne 'not_set' -and $value -ne 'Not set') {
            Write-Host "   ✅ $env`: Set" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $env`: $value" -ForegroundColor Red
        }
    }
    
    Write-Host "   - NODE_ENV: $($envResponse.env.NODE_ENV)" -ForegroundColor White
    Write-Host "   - PORT: $($envResponse.env.PORT)" -ForegroundColor White
    Write-Host "   - BYPASS_DB_FOR_LOGIN: $($envResponse.env.BYPASS_DB_FOR_LOGIN)" -ForegroundColor White
    
    # データベース接続プールの状態
    Write-Host "   - DB Pool Initialized: $($envResponse.database_pool_status.initialized)" -ForegroundColor White
    Write-Host "   - DB Pool Total Count: $($envResponse.database_pool_status.totalCount)" -ForegroundColor White
    Write-Host "   - DB Pool Idle Count: $($envResponse.database_pool_status.idleCount)" -ForegroundColor White
    
} catch {
    Write-Host "❌ 環境変数取得失敗" -ForegroundColor Red
    Write-Host "   - Error: $($_.Exception.Message)" -ForegroundColor Red
}

# データベース接続テスト
Write-Host "`n3. データベース接続テスト" -ForegroundColor Yellow
try {
    $dbTestResponse = Invoke-RestMethod -Uri "$backendUrl/api/_diag/database" -Method GET -TimeoutSec 15
    Write-Host "✅ データベーステスト成功" -ForegroundColor Green
    Write-Host "   - Connection: $($dbTestResponse.connection_test)" -ForegroundColor White
    Write-Host "   - Tables Count: $($dbTestResponse.tables_info.Count)" -ForegroundColor White
    if ($dbTestResponse.tables_info -and $dbTestResponse.tables_info.users) {
        Write-Host "   - Users Table Records: $($dbTestResponse.tables_info.users)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ データベーステスト失敗" -ForegroundColor Red
    Write-Host "   - Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   - これはログイン問題の主な原因の可能性があります" -ForegroundColor Red
}

# フロントエンドの確認
Write-Host "`n4. フロントエンドの確認" -ForegroundColor Yellow
$frontendUrl = "https://witty-river-012f39e00.1.azurestaticapps.net"

try {
    $frontendResponse = Invoke-WebRequest -Uri $frontendUrl -Method GET -TimeoutSec 10
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ フロントエンドアクセス成功" -ForegroundColor Green
        Write-Host "   - Status Code: $($frontendResponse.StatusCode)" -ForegroundColor White
        # HTMLコンテンツの簡単なチェック
        if ($frontendResponse.Content -like "*Emergency Assistance*") {
            Write-Host "   - コンテンツ: Emergency Assistanceアプリが見つかりました" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "❌ フロントエンドアクセス失敗" -ForegroundColor Red
    Write-Host "   - Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ログインテスト（デフォルトアカウント）
Write-Host "`n5. ログイン機能テスト" -ForegroundColor Yellow
try {
    $loginData = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
        "Origin" = $frontendUrl
    }

    $loginResponse = Invoke-RestMethod -Uri "$backendUrl/api/auth/login" -Method POST -Body $loginData -Headers $headers -TimeoutSec 15
    Write-Host "✅ ログインテスト成功" -ForegroundColor Green
    Write-Host "   - Success: $($loginResponse.success)" -ForegroundColor White
    Write-Host "   - User: $($loginResponse.user.username)" -ForegroundColor White
} catch {
    Write-Host "❌ ログインテスト失敗" -ForegroundColor Red
    Write-Host "   - Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   - Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    
    # レスポンス内容を詳しく見る
    try {
        $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   - Server Error: $($errorDetail.message)" -ForegroundColor Red
    } catch {
        Write-Host "   - Raw Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "🎯 診断完了" -ForegroundColor Cyan
Write-Host "上記の結果を確認して問題箇所を特定してください" -ForegroundColor White
Write-Host "❌ が表示された項目が問題の原因です" -ForegroundColor Yellow