# シミュレーション用サーバー起動スクリプト
Write-Host "🚀 シミュレーション用サーバーを起動中..." -ForegroundColor Green

# 既存のプロセスを停止
Write-Host "🛑 既存のプロセスを停止中..." -ForegroundColor Yellow
taskkill /f /im node.exe 2>$null

# バックエンドサーバーを起動
Write-Host "🔧 バックエンドサーバーを起動中..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "working-local-server-fixed.js" -WindowStyle Hidden

# 少し待機
Start-Sleep -Seconds 3

# バックエンドの動作確認
Write-Host "🔍 バックエンド接続テスト..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3003/api/health" -UseBasicParsing
    Write-Host "✅ バックエンドサーバー: 正常動作中" -ForegroundColor Green
    Write-Host "   レスポンス: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ バックエンドサーバー: 接続失敗" -ForegroundColor Red
    Write-Host "   エラー: $($_.Exception.Message)" -ForegroundColor Red
}

# フロントエンドを起動
Write-Host "🎨 フロントエンドを起動中..." -ForegroundColor Cyan
Set-Location client
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Normal

# 少し待機
Start-Sleep -Seconds 5

# フロントエンドの動作確認
Write-Host "🔍 フロントエンド接続テスト..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing
    Write-Host "✅ フロントエンド: 正常動作中" -ForegroundColor Green
} catch {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5002" -UseBasicParsing
        Write-Host "✅ フロントエンド: 正常動作中 (ポート5002)" -ForegroundColor Green
    } catch {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5003" -UseBasicParsing
            Write-Host "✅ フロントエンド: 正常動作中 (ポート5003)" -ForegroundColor Green
        } catch {
            Write-Host "❌ フロントエンド: 接続失敗" -ForegroundColor Red
            Write-Host "   エラー: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "🌐 アクセス先:" -ForegroundColor Cyan
Write-Host "  フロントエンド: http://localhost:5173 (または 5002, 5003)" -ForegroundColor White
Write-Host "  バックエンドAPI: http://localhost:3003" -ForegroundColor White
Write-Host ""
Write-Host "📝 テスト手順:" -ForegroundColor Cyan
Write-Host "  1. ブラウザで上記URLにアクセス" -ForegroundColor White
Write-Host "  2. ログイン（niina / 正しいパスワード）" -ForegroundColor White
Write-Host "  3. 全UIでデータが表示されることを確認" -ForegroundColor White

Set-Location ..
