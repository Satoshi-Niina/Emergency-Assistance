# バックエンドサーバー起動スクリプト（本格版）
Write-Host "🚀 Emergency Assistance バックエンドサーバーを起動中..." -ForegroundColor Green

# 利用可能なポートを検索
function Find-AvailablePort {
    param([int]$StartPort = 3001)
    
    for ($port = $StartPort; $port -le 3010; $port++) {
        $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if (-not $connection) {
            return $port
        }
    }
    return 3001
}

# 環境変数を設定（本格版）
$env:NODE_ENV = "development"
$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/emergency_assistance"
$env:SESSION_SECRET = "your-super-secret-session-key-change-in-production-12345"
$env:ALLOW_DUMMY_LOGIN = "false"  # ダミーログインを無効化
$env:FRONTEND_ORIGIN = "http://localhost:5173"

# 利用可能なポートを検索
$availablePort = Find-AvailablePort
$env:PORT = $availablePort

Write-Host "📋 設定された環境変数:" -ForegroundColor Yellow
Write-Host "  NODE_ENV: $env:NODE_ENV" -ForegroundColor White
Write-Host "  DATABASE_URL: $env:DATABASE_URL" -ForegroundColor White
Write-Host "  SESSION_SECRET: 設定済み" -ForegroundColor White
Write-Host "  ALLOW_DUMMY_LOGIN: $env:ALLOW_DUMMY_LOGIN" -ForegroundColor White
Write-Host "  FRONTEND_ORIGIN: $env:FRONTEND_ORIGIN" -ForegroundColor White
Write-Host "  PORT: $env:PORT (自動検出)" -ForegroundColor Green

Write-Host ""
Write-Host "🔍 データベース接続をテスト中..." -ForegroundColor Yellow

# データベース接続テスト
try {
    $dbTest = psql -U postgres -h localhost -d emergency_assistance -c "SELECT COUNT(*) FROM users;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ データベース接続成功" -ForegroundColor Green
    } else {
        Write-Host "❌ データベース接続失敗" -ForegroundColor Red
        Write-Host "PostgreSQLが起動していることを確認してください" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ データベース接続エラー: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎯 バックエンドサーバーを起動中..." -ForegroundColor Cyan
Write-Host "  - サーバーURL: http://localhost:$env:PORT" -ForegroundColor White
Write-Host "  - データベース: 接続済み" -ForegroundColor White
Write-Host "  - 認証モード: 本格認証（ダミー無効）" -ForegroundColor White
Write-Host ""

# サーバーディレクトリに移動して起動
cd server
npm run dev
