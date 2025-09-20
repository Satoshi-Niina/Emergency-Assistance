# 503エラー修正用デプロイメントスクリプト

Write-Host "🚀 503エラー修正用デプロイメントを開始します..." -ForegroundColor Green

# 1. 変更ファイルの確認
Write-Host "📋 変更されたファイル:" -ForegroundColor Yellow
Write-Host "- server/server.cjs (CORS設定、疎通エンドポイント追加)"
Write-Host "- client/vite.config.ts (VITE_API_BASE設定)"
Write-Host "- client/src/lib/auth.ts (既に修正済み)"

# 2. フロントエンドのビルド
Write-Host "🔨 フロントエンドをビルド中..." -ForegroundColor Yellow
Set-Location client
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ フロントエンドビルドに失敗しました" -ForegroundColor Red
    exit 1
}
Write-Host "✅ フロントエンドビルド完了" -ForegroundColor Green

# 3. バックエンドの確認
Write-Host "🔍 バックエンドファイルを確認中..." -ForegroundColor Yellow
Set-Location ../server
if (Test-Path "server.cjs") {
    Write-Host "✅ server.cjs が存在します" -ForegroundColor Green
} else {
    Write-Host "❌ server.cjs が見つかりません" -ForegroundColor Red
    exit 1
}

# 4. デプロイメント実行
Write-Host "🚀 デプロイメントを実行中..." -ForegroundColor Yellow
Set-Location ..
git add .
git commit -m "fix: 503エラー修正 - CORS設定、疎通エンドポイント追加"
git push origin main

Write-Host "✅ デプロイメント完了" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 動作確認手順:" -ForegroundColor Cyan
Write-Host "1. https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/healthz"
Write-Host "2. https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/ping"
Write-Host "3. フロントエンドから /api/auth/me への接続確認"
Write-Host ""
Write-Host "📝 SWA環境変数設定:" -ForegroundColor Cyan
Write-Host "VITE_API_BASE=https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net"
