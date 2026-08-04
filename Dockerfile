# Multi-stage Dockerfile for AI Ecommerce Operation Center
# React 19 + Vite + Express + Node.js + TypeScript

# --- Stage 1: Build Phase ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors and install all dependencies
COPY package*.json ./
RUN npm ci

# Copy full application source code
COPY . .

# Build Vite static assets and bundle server with esbuild
RUN npm run build

# --- Stage 2: Production Runtime Phase ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled dist bundle from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/healthcheck.sh ./healthcheck.sh

# Create data & log persistence directories
RUN mkdir -p /app/data /app/logs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD sh /app/healthcheck.sh || exit 1

CMD ["npm", "start"]
