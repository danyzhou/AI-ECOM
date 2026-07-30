# ===================================================
# AI Ecommerce Operation Center - Production Dockerfile
# Base Image: Node 22 LTS Alpine
# ===================================================

# Stage 1: Build Application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* bun.lock* ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Run production build
RUN npm run build

# Stage 2: Production Execution Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install wget for container healthcheck
RUN apk add --no-cache wget

# Create app directory with node non-root user permissions
RUN mkdir -p /app/data_db /app/logs && chown -R node:node /app

# Copy built artifacts and package manifest from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data_db ./data_db
COPY --from=builder /app/database ./database

# Switch to non-root system user
USER node

# Expose HTTP port
EXPOSE 3000

# Container Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start Production Express Node Server
CMD ["node", "dist/server.cjs"]
