# Emergency Assistance System Docker Image
# セキュリティ強化: 最新の安定版を使用  
FROM node:20.18-alpine3.20

# セキュリティアップデート + curlをインストール（ヘルスチェック用）
RUN apk update && apk upgrade && apk add --no-cache curl

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonをコピー（依存関係のキャッシュを最適化）
COPY server/package.json ./

# 依存関係をインストール（本番用のみ）
RUN npm install --omit=dev --no-audit --no-fund

# アプリケーションコードをコピー（serverディレクトリから）
COPY server/index.js ./
COPY server/azure-server.js ./
COPY server/unified-server.js ./
COPY server/unified-hot-reload-server.js ./
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
# .envファイルはコピーしない（環境変数はランタイムで設定）

# publicディレクトリをコピー（clientビルド済みの場合）
# 存在しない場合は空ディレクトリになる
COPY server/public/ ./public/

# 共有モジュールをコピー
COPY shared/ ./shared/

# 知識ベースをコピー（画像ファイル含む）
COPY knowledge-base/ ./knowledge-base/

# ログディレクトリを作成
RUN mkdir -p /app/app-logs/exports /app/app-logs/history

# 非rootユーザーで実行（セキュリティ向上）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# 環境変数をセット（デフォルト値）
ENV NODE_ENV=production
ENV PORT=8080

# ポートを公開
EXPOSE 8080

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# アプリケーションを起動（Azure対応エントリーポイント）
CMD ["node", "index.js"]
