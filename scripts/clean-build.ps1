# クリーンビルドスクリプト
# 修正があった際の完全なクリーンビルド手順

Write-Host "🧹 クリーンビルド開始..." -ForegroundColor Green

# 1. Node.jsプロセスを停止
Write-Host "🛑 Node.jsプロセスを停止中..." -ForegroundColor Yellow
try {
    taskkill /F /IM node.exe 2>$null
    Write-Host "✅ Node.jsプロセスを停止しました" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ 実行中のNode.jsプロセスはありません" -ForegroundColor Blue
}

# 2. フロントエンドのビルドファイルを削除
Write-Host "🗑️ フロントエンドのビルドファイルを削除中..." -ForegroundColor Yellow
if (Test-Path "client/dist") {
    Remove-Item -Recurse -Force "client/dist"
    Write-Host "✅ client/dist を削除しました" -ForegroundColor Green
}

# 3. サーバーのpublicフォルダを削除
Write-Host "🗑️ サーバーのpublicフォルダを削除中..." -ForegroundColor Yellow
if (Test-Path "server/public") {
    Remove-Item -Recurse -Force "server/public"
    Write-Host "✅ server/public を削除しました" -ForegroundColor Green
}

# 4. node_modulesのキャッシュをクリア（オプション）
Write-Host "🗑️ node_modulesキャッシュをクリア中..." -ForegroundColor Yellow
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "✅ node_modules/.cache を削除しました" -ForegroundColor Green
}

# 5. フロントエンドをビルド
Write-Host "🔨 フロントエンドをビルド中..." -ForegroundColor Yellow
Set-Location "client"
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ フロントエンドビルド完了" -ForegroundColor Green
} else {
    Write-Host "❌ フロントエンドビルドに失敗しました" -ForegroundColor Red
    exit 1
}

# 6. プロジェクトルートに戻る
Set-Location ".."

# 7. サーバーを起動
Write-Host "🚀 サーバーを起動中..." -ForegroundColor Yellow
Write-Host "📝 アクセス先: http://localhost:8080" -ForegroundColor Cyan
Write-Host "🔗 API: http://localhost:8080/api" -ForegroundColor Cyan
Write-Host "💡 ブラウザでハードリフレッシュ (Ctrl+Shift+R) を実行してください" -ForegroundColor Magenta

npm run dev
