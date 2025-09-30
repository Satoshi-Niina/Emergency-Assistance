# Docker開発環境の自動更新スクリプト (PowerShell)

Write-Host "🐳 Docker開発環境を起動中..." -ForegroundColor Cyan

# Docker Composeで開発環境を起動（ファイル監視付き）
docker-compose -f docker-compose.dev.yml up --build

Write-Host "✅ Docker開発環境が起動しました" -ForegroundColor Green
Write-Host "📝 ファイルを編集すると自動的にコンテナが再ビルドされます" -ForegroundColor Yellow
Write-Host "🔗 アクセスURL: http://localhost:8080" -ForegroundColor Blue
