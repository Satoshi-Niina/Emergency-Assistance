#!/bin/bash
# Docker開発環境の便利スクリプト集

ACTION=${1:-start}

case $ACTION in
    "start")
        echo "🚀 Docker開発環境を起動中..."
        cd server
        docker-compose watch
        ;;
    "stop")
        echo "🛑 Docker開発環境を停止中..."
        cd server
        docker-compose down
        ;;
    "restart")
        echo "🔄 Docker開発環境を再起動中..."
        cd server
        docker-compose down
        docker-compose watch
        ;;
    "logs")
        echo "📋 Dockerログを表示中..."
        cd server
        docker-compose logs -f
        ;;
    "status")
        echo "📊 Docker環境の状態を確認中..."
        cd server
        docker-compose ps
        ;;
    "clean")
        echo "🧹 Docker環境をクリーンアップ中..."
        cd server
        docker-compose down -v
        docker system prune -f
        ;;
    *)
        echo "使用方法: ./docker-dev.sh [start|stop|restart|logs|status|clean]"
        echo "  start   - 開発環境を起動（自動更新有効）"
        echo "  stop    - 開発環境を停止"
        echo "  restart - 開発環境を再起動"
        echo "  logs    - ログを表示"
        echo "  status  - 状態を確認"
        echo "  clean   - 環境をクリーンアップ"
        ;;
esac
