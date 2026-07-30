# Production Dockerfile for AI Ecommerce Operation Center
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy full application code
COPY . .

# Build Vite frontend and esbuild server backend
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy node_modules and built dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create persistent storage dir
RUN mkdir -p /app/data_db

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
