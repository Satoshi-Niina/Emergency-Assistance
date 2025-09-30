# Docker開発環境の便利スクリプト集 (PowerShell)

param(
    [string]$Action = "start"
)

switch ($Action) {
    "start" {
        Write-Host "🚀 Docker開発環境を起動中..." -ForegroundColor Cyan
        Set-Location server
        docker-compose watch
    }
    "stop" {
        Write-Host "🛑 Docker開発環境を停止中..." -ForegroundColor Red
        Set-Location server
        docker-compose down
    }
    "restart" {
        Write-Host "🔄 Docker開発環境を再起動中..." -ForegroundColor Yellow
        Set-Location server
        docker-compose down
        docker-compose watch
    }
    "logs" {
        Write-Host "📋 Dockerログを表示中..." -ForegroundColor Green
        Set-Location server
        docker-compose logs -f
    }
    "status" {
        Write-Host "📊 Docker環境の状態を確認中..." -ForegroundColor Blue
        Set-Location server
        docker-compose ps
    }
    "clean" {
        Write-Host "🧹 Docker環境をクリーンアップ中..." -ForegroundColor Magenta
        Set-Location server
        docker-compose down -v
        docker system prune -f
    }
    default {
        Write-Host "使用方法: .\docker-dev.ps1 [start|stop|restart|logs|status|clean]" -ForegroundColor White
        Write-Host "  start   - 開発環境を起動（自動更新有効）" -ForegroundColor Gray
        Write-Host "  stop    - 開発環境を停止" -ForegroundColor Gray
        Write-Host "  restart - 開発環境を再起動" -ForegroundColor Gray
        Write-Host "  logs    - ログを表示" -ForegroundColor Gray
        Write-Host "  status  - 状態を確認" -ForegroundColor Gray
        Write-Host "  clean   - 環境をクリーンアップ" -ForegroundColor Gray
    }
}
