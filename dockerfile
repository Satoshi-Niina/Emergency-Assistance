# --- ステージ1: client のビルド ---
FROM node:20-slim AS client-builder
WORKDIR /app/client

ARG VITE_API_URL
ARG VITE_API_BASE_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- ステージ2: 本番実行用コンテナ作成 ---
FROM node:20-slim
WORKDIR /app

# server 側の依存関係インストール
COPY server/package*.json ./server/
RUN cd server && npm install --only=production

# server のソースコードをコピー
COPY server/ ./server/

# ステージ1でビルドした client の静的ファイルを server 側に配置
# ※ Vite等の場合は dist、CRAの場合は build。環境に合わせて書き換えてください
COPY --from=client-builder /app/client/dist ./server/public

# 環境変数とポート設定
ENV PORT=8080
EXPOSE 8080

# サーバー起動 (server/server.mjs の場合)
CMD ["node", "server/server.mjs"]