# Emergency Assistance フルスタック起動スクリプト
Write-Host "🚀 Emergency Assistance フルスタック起動中..." -ForegroundColor Green

# 古いプロセスを停止
Write-Host "🔄 既存のNode.jsプロセスを停止中..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# ワークスペースルートに移動
$workspaceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $workspaceRoot

Write-Host "📁 ワークスペース: $workspaceRoot" -ForegroundColor Cyan

# サーバー起動（バックグラウンド）
Write-Host "🔧 サーバー起動中 (ポート8081)..." -ForegroundColor Blue
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$workspaceRoot\server'; node -r dotenv/config production-server.js" -WindowStyle Normal

# 少し待機
Start-Sleep -Seconds 3

# クライアント起動（バックグラウンド）
Write-Host "🌐 フロントエンド起動中 (ポート5173)..." -ForegroundColor Magenta
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$workspaceRoot\client'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "✅ 起動完了！" -ForegroundColor Green
Write-Host "🌐 フロントエンド: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔧 バックエンド: http://localhost:8081" -ForegroundColor Cyan
Write-Host "📊 API Health: http://localhost:8081/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "停止するには、両方のPowerShellウィンドウでCtrl+Cを押してください。" -ForegroundColor Yellow

# ブラウザで自動開く（オプション）
Start-Sleep -Seconds 5
Write-Host "🌍 ブラウザでフロントエンドを開いています..." -ForegroundColor Green
Start-Process "http://localhost:5173"