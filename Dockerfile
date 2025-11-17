# Multi-stage build for production deployment
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

# Copy all source files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY . .

# Build client
RUN cd client && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Copy necessary files
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/knowledge-base ./knowledge-base
COPY --from=builder /app/shared ./shared

# Create necessary directories
RUN mkdir -p knowledge-base/exports knowledge-base/images/chat-exports && \
    chown -R expressjs:nodejs /app

USER expressjs

EXPOSE 8080

# Use azure-server.mjs as the single entry point
CMD ["node", "server/azure-server.mjs"]
