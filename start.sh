
#!/bin/bash

echo "依存関係をインストール中..."
npm install

echo "クライアントの依存関係をインストール中..."
cd client && npm install && cd ..

echo "サーバーを起動中..."
npm run dev
