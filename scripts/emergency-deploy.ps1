# 緊急デプロイスクリプト - Windows PowerShell版

Write-Host "🚨 Emergency Deployment Script - Timeout Mitigation" -ForegroundColor Red
Write-Host "==================================================" -ForegroundColor Yellow

# 設定
$PROJECT_ROOT = "c:\Users\Satoshi Niina\OneDrive\Desktop\system\Emergency-Assistance"
$DEPLOY_DIR = "emergency-deploy"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "📦 Step 1: Creating minimal deployment package..." -ForegroundColor Green

# クリーンアップ
if (Test-Path $DEPLOY_DIR) {
    Remove-Item $DEPLOY_DIR -Recurse -Force
}
New-Item -ItemType Directory -Path $DEPLOY_DIR -Force | Out-Null

Set-Location $PROJECT_ROOT

Write-Host "📁 Copying essential server files..." -ForegroundColor Cyan

# 必須ファイルのみをコピー
$serverFiles = @("*.js", "*.mjs", "*.ts", "package.json", "package-lock.json", "web.config")
foreach ($pattern in $serverFiles) {
    $files = Get-ChildItem "server\$pattern" -ErrorAction SilentlyContinue
    if ($files) {
        Copy-Item $files $DEPLOY_DIR -Force
        Write-Host "   ✅ Copied: $pattern" -ForegroundColor Green
    }
}

Write-Host "🏗️ Building client (if not exists)..." -ForegroundColor Cyan
if (-not (Test-Path "client\dist")) {
    Write-Host "Client dist not found, building..." -ForegroundColor Yellow
    Set-Location client
    npm ci --prefer-offline --no-audit --no-fund
    npm run build
    Set-Location ..
}

Write-Host "📁 Copying client build..." -ForegroundColor Cyan
if (-not (Test-Path "$DEPLOY_DIR\client")) {
    New-Item -ItemType Directory -Path "$DEPLOY_DIR\client" -Force | Out-Null
}
Copy-Item "client\dist" "$DEPLOY_DIR\client\" -Recurse -Force

Write-Host "⚡ Optimizing package.json for production..." -ForegroundColor Yellow
Set-Location $DEPLOY_DIR

# 最適化されたpackage.jsonを作成
$optimizedPackage = @{
    name         = "emergency-assistance-server"
    version      = "1.0.3"
    main         = "app.js"
    engines      = @{
        node = ">=20.0.0"
        npm  = ">=10.0.0"
    }
    scripts      = @{
        start = "node app.js"
    }
    dependencies = @{
        "@azure/identity"     = "^4.0.1"
        "@azure/storage-blob" = "^12.20.0"
        "bcryptjs"            = "^2.4.3"
        "compression"         = "^1.7.4"
        "cookie-parser"       = "^1.4.7"
        "cors"                = "^2.8.5"
        "dotenv"              = "^16.6.1"
        "express"             = "^4.21.2"
        "express-rate-limit"  = "^8.1.0"
        "express-session"     = "^1.18.2"
        "express-validator"   = "^7.2.1"
        "helmet"              = "^8.1.0"
        "jsonwebtoken"        = "^9.0.2"
        "morgan"              = "^1.10.1"
        "multer"              = "^1.4.5-lts.1"
        "pg"                  = "^8.16.3"
        "uuid"                = "^13.0.0"
    }
}

$optimizedPackage | ConvertTo-Json -Depth 10 | Out-File "package.json" -Encoding UTF8

Write-Host "📊 Package Statistics:" -ForegroundColor Magenta
$fileCount = (Get-ChildItem -Recurse -File).Count
$sizeInfo = Get-ChildItem . | Measure-Object -Property Length -Sum
$sizeMB = [math]::Round($sizeInfo.Sum / 1MB, 2)

Write-Host "   Files: $fileCount" -ForegroundColor White
Write-Host "   Size: $sizeMB MB" -ForegroundColor White

Write-Host "✅ Emergency deployment package ready!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Create ZIP from directory: $DEPLOY_DIR" -ForegroundColor White
Write-Host "2. Use Azure Portal ZIP Deploy:" -ForegroundColor White
Write-Host "   Portal > App Services > Emergency-Assistance > Deployment Center" -ForegroundColor Gray
Write-Host "3. Or use Azure CLI:" -ForegroundColor White
Write-Host "   az webapp deployment source config-zip --name Emergency-Assistance --src deploy.zip" -ForegroundColor Gray
Write-Host ""
Write-Host "📍 Package location: $PROJECT_ROOT\$DEPLOY_DIR" -ForegroundColor Cyan

# ZIP作成（Windows標準機能使用）
try {
    $zipPath = "..\emergency-deploy-$TIMESTAMP.zip"
    Write-Host "📦 Creating ZIP file..." -ForegroundColor Green

    # PowerShell 5.0以降の圧縮機能を使用
    Compress-Archive -Path ".\*" -DestinationPath $zipPath -Force
    Write-Host "✅ ZIP created: emergency-deploy-$TIMESTAMP.zip" -ForegroundColor Green
}
catch {
    Write-Host "💡 Manual ZIP creation needed" -ForegroundColor Yellow
}

Set-Location ..
Write-Host "🎯 Emergency deployment package ready for manual deployment!" -ForegroundColor Green

# 次のステップを表示
Write-Host ""
Write-Host "🔧 Manual Deployment Options:" -ForegroundColor Yellow
Write-Host "Option 1 - Azure Portal:" -ForegroundColor Cyan
Write-Host "  1. Open: https://portal.azure.com" -ForegroundColor White
Write-Host "  2. Navigate: App Services > Emergency-Assistance" -ForegroundColor White
Write-Host "  3. Go to: Deployment Center > ZIP Deploy" -ForegroundColor White
Write-Host "  4. Upload: emergency-deploy-$TIMESTAMP.zip" -ForegroundColor White
Write-Host ""
Write-Host "Option 2 - Azure CLI (if installed):" -ForegroundColor Cyan
Write-Host "  az webapp deployment source config-zip \\" -ForegroundColor White
Write-Host "    --resource-group YourResourceGroup \\" -ForegroundColor White
Write-Host "    --name Emergency-Assistance \\" -ForegroundColor White
Write-Host "    --src emergency-deploy-$TIMESTAMP.zip" -ForegroundColor White
