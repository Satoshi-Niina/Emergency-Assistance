# Azure App Service用のDockerfile
# セキュリティ強化: 最新の安定版を使用
FROM node:20.18-alpine3.20

# セキュリティアップデート + curlをインストール（ヘルスチェック用）
RUN apk update && apk upgrade && apk add --no-cache curl

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonをコピー
COPY package.json ./

# 依存関係をインストール（新しいnpm構文を使用）
RUN npm install --omit=dev

# アプリケーションコードをコピー
COPY unified-server.js ./
COPY startup-migration.js ./
COPY migrations/ ./migrations/

# ポートを公開
EXPOSE 8080

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# アプリケーションを起動（統合サーバー）
CMD ["node", "unified-server.js"]
