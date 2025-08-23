#!/usr/bin/env pwsh

# Azure 緊急支援システム - 診断スクリプト
Write-Host "🚨 Emergency Assistance System - Azure Diagnostic Script" -ForegroundColor Green

$API_BASE = "https://emergency-backend-webapp.azurewebsites.net"
$FRONTEND_URL = "Azure Static Web Apps"

Write-Host "`n📋 System Configuration:" -ForegroundColor Yellow
Write-Host "   Frontend: $FRONTEND_URL"
Write-Host "   Backend API: $API_BASE"
Write-Host "   Time: $(Get-Date)"

Write-Host "`n🔧 Running System Diagnostics..." -ForegroundColor Yellow

# 1. Basic API Health Check
Write-Host "`n1. 🔍 API Health Check..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/health" -Method Get -TimeoutSec 30
    Write-Host "   ✅ API Status: $($response.status)" -ForegroundColor Green
    Write-Host "   ⏰ Timestamp: $($response.timestamp)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ API Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Database Connection Check
Write-Host "`n2. 🗄️ Database Connection Check..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/api/health/db" -Method Get -TimeoutSec 30
    Write-Host "   ✅ Database Status: $($response.status)" -ForegroundColor Green
    Write-Host "   🔗 Database: $($response.database)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Database Check Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   💡 可能な原因: データベース接続文字列、認証情報、ネットワーク接続" -ForegroundColor Yellow
}

# 3. GPT/OpenAI Connection Check
Write-Host "`n3. 🤖 GPT Connection Check..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/api/health/gpt" -Method Get -TimeoutSec 30
    Write-Host "   ✅ GPT Status: $($response.status)" -ForegroundColor Green
    Write-Host "   🔑 API Key: $($response.apiKeyPrefix)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ GPT Check Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   💡 可能な原因: OPENAI_API_KEY環境変数が未設定または無効" -ForegroundColor Yellow
}

# 4. System Overview Check
Write-Host "`n4. 🌐 System Overview..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/api/health/system" -Method Get -TimeoutSec 30
    Write-Host "   📊 Service: $($response.service)" -ForegroundColor Green
    Write-Host "   🗄️ Database: $($response.database)" -ForegroundColor $(if ($response.database -eq 'healthy') { 'Green' } else { 'Red' })
    Write-Host "   🤖 GPT: $($response.gpt)" -ForegroundColor $(if ($response.gpt -eq 'healthy') { 'Green' } else { 'Red' })
    Write-Host "   🌍 Environment: $($response.environment.NODE_ENV)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ System Overview Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Login Test
Write-Host "`n5. 🔐 Login Test..." -ForegroundColor Cyan
Write-Host "   Testing default admin credentials..." -ForegroundColor Gray

$loginData = @{
    username = "admin"
    password = "password"
} | ConvertTo-Json

try {
    $headers = @{
        'Content-Type' = 'application/json'
        'Accept' = 'application/json'
    }
    
    $response = Invoke-RestMethod -Uri "$API_BASE/api/auth/login" -Method Post -Body $loginData -Headers $headers -TimeoutSec 30
    Write-Host "   ✅ Login Successful!" -ForegroundColor Green
    Write-Host "   👤 User: $($response.user.display_name)" -ForegroundColor Green
    Write-Host "   🎭 Role: $($response.user.role)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Login Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   📊 Status Code: $statusCode" -ForegroundColor Yellow
        
        if ($statusCode -eq 401) {
            Write-Host "   💡 可能な原因: 認証情報が正しくない、またはユーザーテーブルが初期化されていない" -ForegroundColor Yellow
        } elseif ($statusCode -eq 500) {
            Write-Host "   💡 可能な原因: サーバー内部エラー、データベース接続問題" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n📝 Default Login Credentials:" -ForegroundColor Yellow
Write-Host "   👨‍💼 Admin:" -ForegroundColor Cyan
Write-Host "      Username: admin" -ForegroundColor White
Write-Host "      Password: password" -ForegroundColor White
Write-Host "   👷‍♂️ Employee:" -ForegroundColor Cyan
Write-Host "      Username: employee1" -ForegroundColor White
Write-Host "      Password: password" -ForegroundColor White

Write-Host "`n🔧 Troubleshooting Steps:" -ForegroundColor Yellow
Write-Host "   1. データベース接続エラーの場合:" -ForegroundColor Cyan
Write-Host "      - Azure Database for PostgreSQLの接続文字列を確認" -ForegroundColor White
Write-Host "      - ファイアウォール設定でAzure App Serviceからのアクセスを許可" -ForegroundColor White
Write-Host "      - DATABASE_URL環境変数が正しく設定されているか確認" -ForegroundColor White

Write-Host "`n   2. GPT接続エラーの場合:" -ForegroundColor Cyan
Write-Host "      - OPENAI_API_KEY環境変数が設定されているか確認" -ForegroundColor White
Write-Host "      - APIキーが有効で、quota制限に達していないか確認" -ForegroundColor White

Write-Host "`n   3. ログインエラーの場合:" -ForegroundColor Cyan
Write-Host "      - データベースマイグレーションが実行されているか確認" -ForegroundColor White
Write-Host "      - usersテーブルにデフォルトユーザーが作成されているか確認" -ForegroundColor White

Write-Host "`n🌐 Frontend URL:" -ForegroundColor Yellow
Write-Host "   Azure Static Web AppsのURLをブラウザで開いてください" -ForegroundColor White

Write-Host "`n✅ Diagnostic Complete!" -ForegroundColor Green
