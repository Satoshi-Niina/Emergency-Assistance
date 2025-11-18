# Multi-stage build for production deployment (forced rebuild)
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install production dependencies for server
RUN npm ci --only=production --no-audit --no-fund && \
    cd server && npm ci --only=production --no-audit --no-fund

# Install all dependencies for client (needed for build)
RUN cd client && npm ci --no-audit --no-fund

# Build client
FROM base AS builder
WORKDIR /app

# Copy all source files FIRST
COPY . .

# Then copy node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules

# Debug: List what we have (Enhanced verification)
RUN echo "=== Builder Stage: Checking copied files ===" && \
    ls -la /app/ && \
    echo "=== Builder Stage: Server directory ===" && \
    ls -la /app/server/ && \
    echo "=== Builder Stage: Server .mjs files ===" && \
    find /app/server -name "*.mjs" -type f && \
    echo "=== Builder Stage: Verifying azure-server.mjs ===" && \
    test -f /app/server/azure-server.mjs && echo "✅ azure-server.mjs found in builder!" || (echo "❌ azure-server.mjs NOT found in builder!" && exit 1) && \
    echo "=== Builder Stage: Verifying app.js ===" && \
    test -f /app/server/app.js && echo "✅ app.js found in builder!" || (echo "❌ app.js NOT found in builder!" && exit 1)

# Build client
RUN cd client && npm run build

# Remove node_modules from server directory in builder stage
# (we'll copy production dependencies from deps stage later)
RUN rm -rf /app/server/node_modules

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Copy necessary files in correct order
# First copy package.json
COPY --from=builder /app/package.json ./package.json

# Copy shared folder
COPY --from=builder /app/shared ./shared

# Copy server files - CRITICAL: server source files must be copied
# First copy from builder (without node_modules)
COPY --from=builder /app/server ./server

# Then overwrite node_modules with production dependencies from deps stage
COPY --from=deps /app/server/node_modules ./server/node_modules

# Copy client dist
COPY --from=builder /app/client/dist ./client/dist

# Create necessary directories with proper permissions
# Note: knowledge-base is stored in Azure Blob Storage, not in the container
RUN mkdir -p /tmp/uploads

# Verify server files are copied - enhanced check
RUN echo "=== Verifying production image ===" && \
    ls -la /app/ && \
    echo "=== Server directory ===" && \
    ls -la /app/server/ && \
    echo "=== Checking critical files ===" && \
    test -f /app/server/azure-server.mjs && echo "✅ azure-server.mjs found" || (echo "❌ azure-server.mjs NOT found!" && exit 1) && \
    test -f /app/server/app.js && echo "✅ app.js found" || (echo "❌ app.js NOT found!" && exit 1) && \
    echo "=== File permissions ===" && \
    ls -la /app/server/azure-server.mjs && \
    ls -la /app/server/app.js

# Set proper ownership AFTER all files are copied and verified
RUN chown -R expressjs:nodejs /app /tmp/uploads

USER expressjs

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Use azure-server.mjs as the single entry point with error tracing
CMD ["node", "--trace-warnings", "server/azure-server.mjs"]
