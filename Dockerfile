# マルチステージビルド
FROM node:20-alpine AS builder

WORKDIR /app

# 依存関係をコピーしてインストール
COPY package*.json ./
COPY client/package*.json ./client/
RUN npm ci --only=production && npm cache clean --force

# ソースコードをコピー
COPY . .

# クライアントをビルド
RUN cd client && npm ci && npm run build

# サーバーをビルド
RUN npm run build:server

# 本番環境
FROM node:20-alpine AS production

WORKDIR /app

# 本番用の依存関係のみをインストール
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ビルドされたファイルをコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/knowledge-base ./knowledge-base
COPY --from=builder /app/uploads ./uploads
COPY --from=builder /app/web.config ./web.config

# 環境変数
ENV NODE_ENV=production
ENV PORT=8080

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# ポートを公開（Azure App Service用）
EXPOSE 8080

# アプリケーションを起動
CMD ["node", "dist/index.js"] 