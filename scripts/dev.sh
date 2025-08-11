#!/bin/bash

echo "�� 開発環境を起動します..."

# 依存関係をインストール
echo "📦 依存関係をインストール中..."
cd client && npm install
cd ../server && npm install
cd ..

# バックグラウンドでサーバーを起動
echo "🔧 バックエンドサーバーを起動中..."
cd server && npm run dev &
SERVER_PID=$!

# 少し待ってからフロントエンドを起動
sleep 3

echo "🌐 フロントエンドを起動中..."
cd client && npm run dev

# クリーンアップ
echo "🧹 クリーンアップ中..."
kill $SERVER_PID
