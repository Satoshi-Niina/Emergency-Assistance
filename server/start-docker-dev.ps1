# Docker開発環境の自動更新スクリプト (PowerShell)

Write-Host "🐳 Docker開発環境を起動中..." -ForegroundColor Cyan

# serverディレクトリに移動してDocker Composeを実行
Set-Location server
docker-compose up --build

Write-Host "✅ Docker開発環境が起動しました" -ForegroundColor Green
Write-Host "📝 ファイルを編集すると自動的にコンテナが再ビルドされます" -ForegroundColor Yellow
Write-Host "🔗 アクセスURL: http://localhost:8080" -ForegroundColor Blue
