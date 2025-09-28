# Emergency Assistance ローカル開発環境起動スクリプト
# このスクリプトは、ローカル環境でフロントエンドとバックエンドを同時に起動します

Write-Host "🚀 Emergency Assistance ローカル開発環境を起動中..." -ForegroundColor Green

# プロジェクトルートディレクトリの確認
if (-not (Test-Path "package.json")) {
    Write-Host "❌ エラー: プロジェクトルートディレクトリでこのスクリプトを実行してください" -ForegroundColor Red
    exit 1
}

# 環境変数の設定
$env:NODE_ENV = "development"
$env:PORT = "8000"
$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/emergency_assistance"
$env:JWT_SECRET = "dev-jwt-secret-key-32-characters-long"
$env:SESSION_SECRET = "dev-session-secret-32-characters-long"
$env:FRONTEND_URL = "http://localhost:5173"
$env:OPENAI_API_KEY = "sk-proj-TP8fCh3xQCaUgXaCKuq_h8ckh8VAhfuDi-0Ln"

Write-Host "📋 設定された環境変数:" -ForegroundColor Yellow
Write-Host "  NODE_ENV: $env:NODE_ENV" -ForegroundColor White
Write-Host "  PORT: $env:PORT" -ForegroundColor White
Write-Host "  DATABASE_URL: $env:DATABASE_URL" -ForegroundColor White
Write-Host "  FRONTEND_URL: $env:FRONTEND_URL" -ForegroundColor White

# PostgreSQL接続の確認
Write-Host "🔍 PostgreSQL接続を確認中..." -ForegroundColor Yellow
try {
    $pgTest = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
    if ($pgTest.TcpTestSucceeded) {
        Write-Host "✅ PostgreSQL接続OK" -ForegroundColor Green
    } else {
        Write-Host "⚠️ PostgreSQL接続エラー - 手動でPostgreSQLを起動してください" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ PostgreSQL接続確認に失敗 - 手動でPostgreSQLを起動してください" -ForegroundColor Yellow
}

# 依存関係の確認とインストール
Write-Host "📦 依存関係を確認中..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 ルート依存関係をインストール中..." -ForegroundColor Cyan
    npm install
}

if (-not (Test-Path "client/node_modules")) {
    Write-Host "📦 クライアント依存関係をインストール中..." -ForegroundColor Cyan
    cd client
    npm install
    cd ..
}

if (-not (Test-Path "server/node_modules")) {
    Write-Host "📦 サーバー依存関係をインストール中..." -ForegroundColor Cyan
    cd server
    npm install
    cd ..
}

if (-not (Test-Path "shared/node_modules")) {
    Write-Host "📦 共有ライブラリ依存関係をインストール中..." -ForegroundColor Cyan
    cd shared
    npm install
    cd ..
}

# TypeScript型チェック
Write-Host "🔍 TypeScript型チェックを実行中..." -ForegroundColor Yellow
try {
    npm run typecheck
    Write-Host "✅ TypeScript型チェック完了" -ForegroundColor Green
} catch {
    Write-Host "⚠️ TypeScript型チェックで警告がありますが、続行します" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 開発環境を起動中..." -ForegroundColor Cyan
Write-Host "  🌐 フロントエンド: http://localhost:5173" -ForegroundColor White
Write-Host "  🔧 バックエンド: http://localhost:8000" -ForegroundColor White
Write-Host "  📊 ヘルスチェック: http://localhost:8000/api/health" -ForegroundColor White
Write-Host ""

# バックエンドサーバーを起動
Write-Host "🔧 バックエンドサーバーを起動中..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; `$env:NODE_ENV='development'; `$env:PORT='8000'; `$env:DATABASE_URL='postgresql://postgres:password@localhost:5432/emergency_assistance'; `$env:JWT_SECRET='dev-jwt-secret-key-32-characters-long'; `$env:SESSION_SECRET='dev-session-secret-32-characters-long'; `$env:FRONTEND_URL='http://localhost:5173'; `$env:OPENAI_API_KEY='sk-proj-TP8fCh3xQCaUgXaCKuq_h8ckh8VAhfuDi-0Ln'; node production-server.js" -WindowStyle Normal

# バックエンドの起動を待機
Write-Host "⏳ バックエンドの起動を待機中..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# ヘルスチェック
Write-Host "🔍 バックエンドヘルスチェック中..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:8000/api/health" -TimeoutSec 10
    if ($healthCheck.status -eq "ok") {
        Write-Host "✅ バックエンドヘルスチェック成功" -ForegroundColor Green
    } else {
        Write-Host "⚠️ バックエンドヘルスチェックで問題があります" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ バックエンドヘルスチェックに失敗しましたが、続行します" -ForegroundColor Yellow
}

# フロントエンドを起動
Write-Host "🎨 フロントエンドを起動中..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev" -WindowStyle Normal

# フロントエンドの起動を待機
Write-Host "⏳ フロントエンドの起動を待機中..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "✅ ローカル開発環境が起動しました！" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 アクセスURL:" -ForegroundColor Cyan
Write-Host "  - フロントエンド: http://localhost:5173" -ForegroundColor Blue
Write-Host "  - バックエンド: http://localhost:8000" -ForegroundColor Blue
Write-Host "  - API ヘルスチェック: http://localhost:8000/api/health" -ForegroundColor Blue
Write-Host ""
Write-Host "📝 開発のヒント:" -ForegroundColor Cyan
Write-Host "  - フロントエンドとバックエンドは別々のウィンドウで実行されています" -ForegroundColor White
Write-Host "  - コードを変更すると自動的にリロードされます" -ForegroundColor White
Write-Host "  - 問題が発生した場合は、各ウィンドウのログを確認してください" -ForegroundColor White
Write-Host ""

# ブラウザでフロントエンドを開く
Write-Host "🌐 ブラウザでフロントエンドを開きますか？ (y/n)" -ForegroundColor Yellow
$openBrowser = Read-Host
if ($openBrowser -eq "y" -or $openBrowser -eq "Y") {
    Start-Process "http://localhost:5173"
}

Write-Host "開発環境が起動しました。Enterキーを押して終了してください。" -ForegroundColor Green
Read-Host
