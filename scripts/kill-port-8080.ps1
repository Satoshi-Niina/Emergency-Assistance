# PowerShell script to kill process using port 8080
# ⚠️ ローカル開発環境専用 - Azure App Serviceでは不要（ポートは自動設定）
# This script is only for local development. Azure App Service handles ports automatically.

# Azure App Service環境では実行しない
if ($env:WEBSITE_SITE_NAME -or $env:WEBSITE_INSTANCE_ID -or $env:WEBSITE_RESOURCE_GROUP) {
    Write-Host "ℹ️  Azure App Service環境を検出しました。ポート停止処理をスキップします。" -ForegroundColor Cyan
    Write-Host "ℹ️  Azure App Serviceではポートは自動設定されます。" -ForegroundColor Cyan
    exit 0
}

$port = 8080
Write-Host "🔍 ローカル開発環境: ポート $port を使用中のプロセスを確認中..." -ForegroundColor Cyan

# Function to check if port is in use
function Test-PortInUse {
    param([int]$PortNumber)
    $connections = Get-NetTCPConnection -LocalPort $PortNumber -ErrorAction SilentlyContinue
    return $null -ne $connections -and $connections.Count -gt 0
}

# Get process ID using port 8080
$processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    foreach ($pid in $processes) {
        try {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "🛑 Stopping process: $($process.ProcessName) (PID: $pid)" -ForegroundColor Yellow
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "✅ Process stopped successfully" -ForegroundColor Green
            }
        } catch {
            Write-Host "⚠️  Could not stop process ${pid}: $_" -ForegroundColor Yellow
        }
    }
    
    # Wait for port to be released (check up to 5 times with 1 second intervals)
    $maxAttempts = 5
    $attempt = 0
    while ($attempt -lt $maxAttempts -and (Test-PortInUse -PortNumber $port)) {
        $attempt++
        Write-Host "⏳ Waiting for port $port to be released... (attempt $attempt/$maxAttempts)" -ForegroundColor Cyan
        Start-Sleep -Seconds 1
    }
    
    if (Test-PortInUse -PortNumber $port) {
        Write-Host "⚠️  Port $port is still in use after stopping processes" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "✅ Port $port is now available" -ForegroundColor Green
    }
} else {
    Write-Host "✅ No process found using port $port" -ForegroundColor Green
}

