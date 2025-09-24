# ログイン認証テストスクリプト
# PowerShell / curl.exe 前提

param(
    [string]$BASE = "https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net"
)

Write-Host "🔐 ログイン認証テスト開始" -ForegroundColor Green
Write-Host "対象URL: $BASE" -ForegroundColor Yellow

# 0) ヘルスチェック（200期待）
Write-Host "`n0️⃣ ヘルスチェック..." -ForegroundColor Cyan
$healthResponse = curl.exe -s -i "$BASE/api/health"
$healthStatus = ($healthResponse | Select-String 'HTTP/1.1 (\d+)').Matches[0].Groups[1].Value

if ($healthStatus -eq "200") {
    Write-Host "✅ /api/health: 200 OK" -ForegroundColor Green
} else {
    Write-Host "❌ /api/health: 期待値200, 実際$healthStatus" -ForegroundColor Red
}

# 0.5) Handshake チェック（200期待）
Write-Host "`n0.5️⃣ Handshake チェック..." -ForegroundColor Cyan
$handshakeResponse = curl.exe -s -i "$BASE/api/auth/handshake"
$handshakeStatus = ($handshakeResponse | Select-String 'HTTP/1.1 (\d+)').Matches[0].Groups[1].Value

if ($handshakeStatus -eq "200") {
    Write-Host "✅ /api/auth/handshake: 200 OK" -ForegroundColor Green
} else {
    Write-Host "❌ /api/auth/handshake: 期待値200, 実際$handshakeStatus" -ForegroundColor Red
}

# 1) 未ログイン状態で /me をテスト（401期待）
Write-Host "`n1️⃣ 未ログイン状態で /api/auth/me をテスト..." -ForegroundColor Cyan
$meResponse = curl.exe -s -i "$BASE/api/auth/me"
$meStatus = ($meResponse | Select-String 'HTTP/1.1 (\d+)').Matches[0].Groups[1].Value

if ($meStatus -eq "401") {
    Write-Host "✅ /api/auth/me 未ログイン: 401 OK" -ForegroundColor Green
} else {
    Write-Host "❌ /api/auth/me 未ログイン: 期待値401, 実際$meStatus" -ForegroundColor Red
    Write-Host "レスポンス: $meResponse" -ForegroundColor Yellow
}

# 2) ログイン（Cookie保存）
Write-Host "`n2️⃣ ログイン実行（Cookie保存）..." -ForegroundColor Cyan
$loginResponse = curl.exe -s -i -c cookies.txt -H "Content-Type: application/json" -X POST "$BASE/api/auth/login" --data '{"username":"niina","password":"dummy"}'
$loginStatus = ($loginResponse | Select-String 'HTTP/1.1 (\d+)').Matches[0].Groups[1].Value

if ($loginStatus -eq "200") {
    Write-Host "✅ POST /api/auth/login: 200 OK" -ForegroundColor Green
    
    # Set-Cookieヘッダーの確認
    $setCookie = ($loginResponse | Select-String "Set-Cookie").Line
    if ($setCookie) {
        Write-Host "✅ Set-Cookie ヘッダー確認: $setCookie" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Set-Cookie ヘッダーが見つかりません" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ POST /api/auth/login: 期待値200, 実際$loginStatus" -ForegroundColor Red
    Write-Host "レスポンス: $loginResponse" -ForegroundColor Yellow
}

# 3) ログイン後の /me（200期待）
Write-Host "`n3️⃣ ログイン後の /api/auth/me をテスト..." -ForegroundColor Cyan
$meLoggedInResponse = curl.exe -s -i -b cookies.txt "$BASE/api/auth/me"
$meLoggedInStatus = ($meLoggedInResponse | Select-String 'HTTP/1.1 (\d+)').Matches[0].Groups[1].Value

if ($meLoggedInStatus -eq "200") {
    Write-Host "✅ /api/auth/me ログイン後: 200 OK" -ForegroundColor Green
} else {
    Write-Host "❌ /api/auth/me ログイン後: 期待値200, 実際$meLoggedInStatus" -ForegroundColor Red
    Write-Host "レスポンス: $meLoggedInResponse" -ForegroundColor Yellow
}

# 4) ヘルスチェック
Write-Host "`n4️⃣ ヘルスチェック..." -ForegroundColor Cyan
$healthResponse = curl.exe -s -i "$BASE/api/health"
$healthStatus = ($healthResponse | Select-String 'HTTP/1.1 (\d+)').Matches[0].Groups[1].Value

if ($healthStatus -eq "200") {
    Write-Host "✅ /api/health: 200 OK" -ForegroundColor Green
} else {
    Write-Host "❌ /api/health: 期待値200, 実際$healthStatus" -ForegroundColor Red
}

# 5) CORS ヘッダー確認
Write-Host "`n5️⃣ CORS ヘッダー確認..." -ForegroundColor Cyan
$corsResponse = curl.exe -s -i -H "Origin: https://witty-river-012f39e00.1.azurestaticapps.net" "$BASE/api/auth/me"
$corsOrigin = ($corsResponse | Select-String "Access-Control-Allow-Origin").Line
$corsCredentials = ($corsResponse | Select-String "Access-Control-Allow-Credentials").Line

if ($corsOrigin -and $corsCredentials) {
    Write-Host "✅ CORS ヘッダー確認: $corsOrigin" -ForegroundColor Green
    Write-Host "✅ CORS Credentials: $corsCredentials" -ForegroundColor Green
} else {
    Write-Host "⚠️ CORS ヘッダーが見つかりません" -ForegroundColor Yellow
}

# クリーンアップ
if (Test-Path "cookies.txt") {
    Remove-Item "cookies.txt"
    Write-Host "`n🧹 テストファイルをクリーンアップしました" -ForegroundColor Gray
}

Write-Host "`n🏁 ログイン認証テスト完了" -ForegroundColor Green
