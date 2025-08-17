# ======================================
# Multi-stage build for production
# ======================================
FROM node:18-alpine AS base

# Set environment variables
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Install pnpm for better performance
RUN corepack enable

# ======================================
# Dependencies stage
# ======================================
FROM base AS deps
WORKDIR /app

# Copy package manager files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/

# Install dependencies with optimizations
RUN npm ci --only=production --frozen-lockfile && \
  npm cache clean --force

# ======================================
# Builder stage
# ======================================
FROM base AS builder
WORKDIR /app

# Copy package manager files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/

# Install all dependencies including devDependencies
RUN npm ci --frozen-lockfile

# Copy source code (respect .dockerignore)
COPY . .

# Build shared package first
RUN cd shared && npm run build

# Build server and client
RUN npm run build:server
RUN npm run build:client

# ======================================
# Production runner stage
# ======================================
FROM base AS runner
WORKDIR /app

# Create a non-root user for security
RUN addgroup --system --gid 1001 emergency && \
  adduser --system --uid 1001 --ingroup emergency emergency

# Copy production dependencies
COPY --from=deps --chown=emergency:emergency /app/node_modules ./node_modules
COPY --from=deps --chown=emergency:emergency /app/server/node_modules ./server/node_modules

# Copy built applications
COPY --from=builder --chown=emergency:emergency /app/server/dist ./server/dist
COPY --from=builder --chown=emergency:emergency /app/client/dist ./client/dist
COPY --from=builder --chown=emergency:emergency /app/shared/dist ./shared/dist

# Copy package.json files for runtime
COPY --chown=emergency:emergency package*.json ./
COPY --chown=emergency:emergency server/package*.json ./server/
COPY --chown=emergency:emergency shared/package*.json ./shared/

# Copy necessary runtime files
COPY --chown=emergency:emergency migrations ./migrations
COPY --chown=emergency:emergency drizzle.config.ts ./
COPY --chown=emergency:emergency staticwebapp.config.json ./

# Set user permissions
USER emergency

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Expose port
EXPOSE 3001

# Set environment variables
ENV PORT=3001
ENV NODE_ENV=production

# Start the application
CMD ["npm", "run", "start:prod"] 