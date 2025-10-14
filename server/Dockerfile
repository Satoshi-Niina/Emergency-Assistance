# Emergency Assistance System Docker Image
# セキュリティ強化: 最新の安定版を使用  
FROM node:20.18-alpine3.20

# セキュリティアップデート + curlをインストール（ヘルスチェック用）
RUN apk update && apk upgrade && apk add --no-cache curl

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonをコピー
COPY server/package.json ./

# 依存関係をインストール（新しいnpm構文を使用）
RUN npm install --omit=dev

# アプリケーションコードをコピー（serverディレクトリから）
COPY server/unified-server.js ./
COPY server/services/ ./services/
COPY server/routes/ ./routes/
COPY server/db/ ./db/
COPY server/src/ ./src/
COPY server/lib/ ./lib/
COPY server/middleware/ ./middleware/
COPY server/migrations/ ./migrations/
COPY server/types/ ./types/
COPY server/utils/ ./utils/
COPY server/config/ ./config/
COPY server/.env ./
COPY server/public/ ./public/

# 共有モジュールをコピー
COPY shared/ ./shared/

# 知識ベースをコピー（画像ファイル含む）
COPY knowledge-base/ ./knowledge-base/

# ログディレクトリを作成
RUN mkdir -p /app/app-logs/

# 環境変数をセット
ENV NODE_ENV=production
ENV PORT=8080

# ポートを公開
EXPOSE 8080

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# アプリケーションを起動（統合サーバー）
CMD ["node", "unified-server.js"]
