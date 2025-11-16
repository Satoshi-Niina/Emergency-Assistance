# PowerShell版 ローカル開発環境起動スクリプト

Write-Host "🧹 ローカル開発環境のクリーンアップと起動" -ForegroundColor Green

# Step 1: 古いビルドファイルをクリーンアップ
Write-Host "📦 古いビルドファイルを削除..." -ForegroundColor Yellow
Remove-Item -Recurse -Force client/dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force client/build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force server/dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force server/src/api/dist -ErrorAction SilentlyContinue

# Step 2: Node.js キャッシュクリア
Write-Host "🗂️ Node.js キャッシュをクリア..." -ForegroundColor Yellow
try {
  Set-Location client; npm cache clean --force; Set-Location ..
  Set-Location server; npm cache clean --force; Set-Location ..
  Set-Location server/src/api; npm cache clean --force; Set-Location ../../..
}
catch {
  Write-Host "キャッシュクリアをスキップ" -ForegroundColor Gray
}

# Step 3: ローカル専用設定に戻す
Write-Host "⚙️ ローカル専用設定を適用..." -ForegroundColor Yellow

$localConfig = @"
// ローカル開発専用設定
(function() {
  const config = {
    "API_BASE_URL": "http://localhost:8080/api",
    "CORS_ALLOW_ORIGINS": "http://localhost:5173,http://localhost:8080",
    "ENVIRONMENT": "development"
  };

  console.log('🔧 ローカル開発設定適用:', config);
  window.runtimeConfig = config;
})();
"@

$localConfig | Out-File -FilePath "client/public/runtime-config.js" -Encoding UTF8

# Step 4: 依存関係の確認
Write-Host "📦 依存関係を確認..." -ForegroundColor Yellow
if (!(Test-Path "client/node_modules")) {
  Write-Host "クライアント依存関係をインストール..." -ForegroundColor Cyan
  Set-Location client; npm install; Set-Location ..
}
if (!(Test-Path "server/node_modules")) {
  Write-Host "サーバー依存関係をインストール..." -ForegroundColor Cyan
  Set-Location server; npm install; Set-Location ..
}

Write-Host "✅ ローカル開発環境準備完了！" -ForegroundColor Green
Write-Host "次のコマンドでサーバーとフロントエンドを起動してください：" -ForegroundColor White
Write-Host ""
Write-Host "# ターミナル1: Express Server" -ForegroundColor Cyan
Write-Host "cd server; npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "# ターミナル2: フロントエンド" -ForegroundColor Cyan
Write-Host "cd client; npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "📡 フロントエンド: http://localhost:5173" -ForegroundColor Green
Write-Host "🔗 API: http://localhost:8080/api" -ForegroundColor Green
