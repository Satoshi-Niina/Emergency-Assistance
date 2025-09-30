# Azure App Service用のDockerfile
FROM node:20-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonをコピー
COPY server/azure-package.json ./package.json

# 依存関係をインストール
RUN npm install --only=production

# アプリケーションコードをコピー
COPY server/azure-server.js ./

# ポートを公開
EXPOSE 8080

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# アプリケーションを起動
CMD ["node", "azure-server.js"]
