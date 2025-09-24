param(
    [string]$BASE = "https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net"
)

Write-Host "Testing authentication flow..." -ForegroundColor Green
Write-Host "Target: $BASE" -ForegroundColor Yellow

$allTestsPassed = $true

# 1) Health check (expect 200)
Write-Host "`n1. Testing /api/health..." -ForegroundColor Cyan
try {
    $healthResponse = curl.exe -s -i "$BASE/api/health"
    $healthStatus = ($healthResponse | Select-String 'HTTP/1.1 (\d+)').Matches[0].Groups[1].Value
    
    if ($healthStatus -eq "200") {
        Write-Host "✅ Health check: OK" -ForegroundColor Green
    } else {
        Write-Host "❌ Health check: Expected 200, Got $healthStatus" -ForegroundColor Red
        $allTestsPassed = $false
    }
} catch {
    Write-Host "❌ Health check: Failed to connect" -ForegroundColor Red
    $allTestsPassed = $false
}

# 2) Handshake check (expect 200)
Write-Host "`n2. Testing /api/auth/handshake..." -ForegroundColor Cyan
try {
    $handshakeResponse = curl.exe -s -i "$BASE/api/auth/handshake"
    $handshakeStatus = ($handshakeResponse | Select-String 'HTTP/1.1 (\d+)').Matches[0].Groups[1].Value
    
    if ($handshakeStatus -eq "200") {
        Write-Host "✅ Handshake: OK (mode: session)" -ForegroundColor Green
    } else {
        Write-Host "❌ Handshake: Expected 200, Got $handshakeStatus" -ForegroundColor Red
        $allTestsPassed = $false
    }
} catch {
    Write-Host "❌ Handshake: Failed to connect" -ForegroundColor Red
    $allTestsPassed = $false
}

# 3) Test /me unauthenticated (expect 401)
Write-Host "`n3. Testing /api/auth/me (unauthenticated)..." -ForegroundColor Cyan
try {
    $meResponse = curl.exe -s -i "$BASE/api/auth/me"
    $meStatus = ($meResponse | Select-String 'HTTP/1.1 (\d+)').Matches[0].Groups[1].Value
    
    if ($meStatus -eq "401") {
        Write-Host "✅ Unauthenticated /me: 401 OK" -ForegroundColor Green
    } else {
        Write-Host "❌ Unauthenticated /me: Expected 401, Got $meStatus" -ForegroundColor Red
        $allTestsPassed = $false
    }
} catch {
    Write-Host "❌ Unauthenticated /me: Failed to connect" -ForegroundColor Red
    $allTestsPassed = $false
}

# 4) Login with BYPASS_DB_FOR_LOGIN=true (expect 200)
Write-Host "`n4. Testing login (BYPASS_DB_FOR_LOGIN=true)..." -ForegroundColor Cyan
try {
    $loginResponse = curl.exe -s -i -c cookies.txt -H "Content-Type: application/json" -X POST "$BASE/api/auth/login" --data '{"username":"niina","password":"dummy"}'
    $loginStatus = ($loginResponse | Select-String 'HTTP/1.1 (\d+)').Matches[0].Groups[1].Value
    
    if ($loginStatus -eq "200") {
        Write-Host "✅ Login: 200 OK" -ForegroundColor Green
        
        # Check for Set-Cookie header
        if ($loginResponse -match "Set-Cookie") {
            Write-Host "✅ Set-Cookie header present" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Set-Cookie header not found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Login error: Expected 200, Got $loginStatus" -ForegroundColor Red
        Write-Host "Response: $loginResponse" -ForegroundColor Yellow
        $allTestsPassed = $false
    }
} catch {
    Write-Host "❌ Login: Failed to connect" -ForegroundColor Red
    $allTestsPassed = $false
}

# 5) Test /me after login (expect 200)
Write-Host "`n5. Testing /api/auth/me after login..." -ForegroundColor Cyan
try {
    $meLoggedInResponse = curl.exe -s -i -b cookies.txt "$BASE/api/auth/me"
    $meLoggedInStatus = ($meLoggedInResponse | Select-String 'HTTP/1.1 (\d+)').Matches[0].Groups[1].Value
    
    if ($meLoggedInStatus -eq "200") {
        Write-Host "✅ /me after login: 200 OK" -ForegroundColor Green
    } else {
        Write-Host "❌ /me after login: Expected 200, Got $meLoggedInStatus" -ForegroundColor Red
        Write-Host "Response: $meLoggedInResponse" -ForegroundColor Yellow
        $allTestsPassed = $false
    }
} catch {
    Write-Host "❌ /me after login: Failed to connect" -ForegroundColor Red
    $allTestsPassed = $false
}

# 6) CORS check
Write-Host "`n6. Testing CORS headers..." -ForegroundColor Cyan
try {
    $corsResponse = curl.exe -s -i -H "Origin: https://witty-river-012f39e00.1.azurestaticapps.net" "$BASE/api/auth/me"
    
    if ($corsResponse -match "Access-Control-Allow-Origin: https://witty-river-012f39e00.1.azurestaticapps.net") {
        Write-Host "✅ CORS Origin: Correct SWA URL" -ForegroundColor Green
    } else {
        Write-Host "❌ CORS Origin: Not set correctly" -ForegroundColor Red
        $allTestsPassed = $false
    }
    
    if ($corsResponse -match "Access-Control-Allow-Credentials: true") {
        Write-Host "✅ CORS Credentials: true" -ForegroundColor Green
    } else {
        Write-Host "❌ CORS Credentials: Not set to true" -ForegroundColor Red
        $allTestsPassed = $false
    }
} catch {
    Write-Host "❌ CORS check: Failed" -ForegroundColor Red
    $allTestsPassed = $false
}

# Cleanup
if (Test-Path cookies.txt) {
    Remove-Item cookies.txt
    Write-Host "`nCleaned up cookies.txt" -ForegroundColor Gray
}

# Final result
Write-Host "`n" + "="*50 -ForegroundColor Gray
if ($allTestsPassed) {
    Write-Host "🎉 All tests passed! Authentication is working correctly." -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Some tests failed. Please check the issues above." -ForegroundColor Red
    exit 1
}