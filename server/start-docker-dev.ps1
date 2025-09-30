# Docker開発環境の自動更新スクリプト (PowerShell)

Write-Host "🐳 Docker開発環境を起動中..." -ForegroundColor Cyan
Write-Host "📝 ファイル変更時に自動でコンテナが更新されます" -ForegroundColor Yellow

# serverディレクトリに移動してDocker Compose Watchを実行
Set-Location server

# Docker Compose Watch機能で自動更新を有効化
docker-compose watch

Write-Host "✅ Docker開発環境が起動しました" -ForegroundColor Green
Write-Host "🔄 ファイルを編集すると自動的にコンテナが更新されます" -ForegroundColor Yellow
Write-Host "🔗 アクセスURL: http://localhost:8080" -ForegroundColor Blue
Write-Host "📊 PostgreSQL: localhost:5432" -ForegroundColor Blue
