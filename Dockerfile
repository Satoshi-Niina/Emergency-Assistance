# Multi-stage Dockerfile for Emergency Assistance System
# 統合環境: フロントエンド + APIサーバー

# Stage 1: Build client
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./
RUN npm ci --only=production

# Copy client source and build
COPY client/ ./
RUN npm run build

# Stage 2: Runtime (統合環境)
FROM node:20-alpine AS runtime

WORKDIR /app

# Install production dependencies
RUN apk add --no-cache bash

# Copy built client from client-builder stage
COPY --from=client-builder /app/client/dist ./public

# Copy server dependencies
COPY server/package*.json ./
RUN npm ci --only=production

# Copy unified server
COPY server/unified-server.js ./

# Create runtime config generation script
RUN echo '#!/bin/bash' > /app/generate-runtime-config.sh && \
    echo 'echo "window.runtimeConfig = {" >> /app/public/runtime-config.js' && \
    echo 'echo "  API_BASE_URL: \"${API_BASE_URL:-/api}\"," >> /app/public/runtime-config.js' && \
    echo 'echo "  CORS_ALLOW_ORIGINS: \"${CORS_ALLOW_ORIGINS:-*}\"" >> /app/public/runtime-config.js' && \
    echo 'echo "};" >> /app/public/runtime-config.js' && \
    chmod +x /app/generate-runtime-config.sh

# Create startup script
RUN echo '#!/bin/bash' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'echo "🚀 Starting Emergency Assistance System..."' >> /app/start.sh && \
    echo 'echo "📊 Environment: ${NODE_ENV:-production}"' >> /app/start.sh && \
    echo 'echo "🔧 Generating runtime config..."' >> /app/start.sh && \
    echo '/app/generate-runtime-config.sh' >> /app/start.sh && \
    echo 'echo "✅ Runtime config generated"' >> /app/start.sh && \
    echo 'echo "🌐 Starting unified server on port ${PORT:-8080}..."' >> /app/start.sh && \
    echo 'exec node unified-server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT:-8080}/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["/app/start.sh"]
