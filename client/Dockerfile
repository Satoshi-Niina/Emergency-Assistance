# --- ステージ1: client のビルド ---
FROM node:20-alpine AS build
WORKDIR /app

# 受け取るビルド引数を定義
ARG VITE_API_URL

# ENV で明示的にセット（よく使われる両方の変数名に確実に代入）
ENV VITE_API_URL="${VITE_API_URL}"
ENV VITE_API_BASE_URL="${VITE_API_URL}"

COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm install

WORKDIR /app
COPY shared ./shared
COPY client ./client

WORKDIR /app/client
RUN npm run build

# --- ステージ2: 静的ファイル配信用コンテナ ---
FROM node:20-alpine
WORKDIR /app/client

ENV NODE_ENV=production
ENV PORT=8080

RUN cat > cloudrun-server.mjs <<'EOF'
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 8080);

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.mjs', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
]);

const sendFile = (res, filePath) => {
  const ext = path.extname(filePath);
  res.setHeader('Content-Type', mimeTypes.get(ext) || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
};

const server = http.createServer((req, res) => {
  const requestPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  const safePath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.join(distDir, safePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(res, filePath);
    return;
  }

  sendFile(res, path.join(distDir, 'index.html'));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Client server listening on ${port}`);
});
EOF

COPY --from=build /app/client/dist ./dist

EXPOSE 8080
CMD ["node", "cloudrun-server.mjs"]