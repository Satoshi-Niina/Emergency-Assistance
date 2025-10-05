#!/bin/bash

echo "🧹 ローカル開発環境のクリーンアップと起動"

# Step 1: 古いビルドファイルをクリーンアップ
echo "📦 古いビルドファイルを削除..."
rm -rf client/dist
rm -rf client/build  
rm -rf server/dist
rm -rf server/src/api/dist

# Step 2: Node.js キャッシュクリア
echo "🗂️ Node.js キャッシュをクリア..."
cd client && npm cache clean --force 2>/dev/null || true
cd ../server && npm cache clean --force 2>/dev/null || true
cd ../server/src/api && npm cache clean --force 2>/dev/null || true
cd ../../..

# Step 3: ローカル専用設定に戻す
echo "⚙️ ローカル専用設定を適用..."

# フロントエンドをローカル設定に
cat > client/public/runtime-config.js << 'EOF'
// ローカル開発専用設定
(function() {
  const config = {
    "API_BASE_URL": "http://localhost:8081/api",
    "CORS_ALLOW_ORIGINS": "http://localhost:5173,http://localhost:8081",
    "ENVIRONMENT": "development"
  };
  
  console.log('🔧 ローカル開発設定適用:', config);
  window.runtimeConfig = config;
})();
EOF

# Step 4: 依存関係の再インストール
echo "📦 依存関係を再インストール..."
cd client && npm install
cd ../server && npm install

# Step 5: サーバー起動
echo "🚀 Express Server を起動..."
cd server && npm run dev &

# Step 6: フロントエンド起動
echo "🌐 フロントエンド開発サーバーを起動..."
cd ../client && npm run dev

echo "✅ ローカル開発環境が起動しました！"
echo "📡 フロントエンド: http://localhost:5173"
echo "🔗 API: http://localhost:8081/api"