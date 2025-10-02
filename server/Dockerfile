# Azure App Service用のDockerfile
FROM node:20-alpine

# curlをインストール（ヘルスチェック用）
RUN apk add --no-cache curl

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonをコピー
COPY package.json ./

# 依存関係をインストール
RUN npm install --only=production

# アプリケーションコードをコピー
COPY azure-server.js ./
COPY startup-migration.js ./
COPY ../migrations/ ./migrations/

# ポートを公開
EXPOSE 8080

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# アプリケーションを起動（マイグレーション付き）
CMD ["node", "azure-server.js"]
