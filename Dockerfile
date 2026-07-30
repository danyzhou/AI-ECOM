# Multi-stage Dockerfile for AI Ecommerce Operation Center
# React 19 + Vite + Express + Node.js + TypeScript

# --- Stage 1: Build Phase ---
FROM node:20-alpine AS builder

WORKDIR /app

# 设置环境变量限制内存占用，防止服务器崩溃断开
ENV NODE_OPTIONS="--max-old-space-size=1536"

# 复制依赖声明文件
COPY package*.json ./

# 安装全量依赖，禁用审计减少资源消耗
RUN npm install --no-audit --no-fund

# 复制项目全量源码
COPY . .

# 执行打包编译
RUN npm run build

# --- Stage 2: Production Runtime Phase ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=1536"

# 仅安装生产依赖
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# 从构建阶段提取产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/healthcheck.sh ./healthcheck.sh

# 如果仓库里确实有 public 目录，才取消下面这行的注释：
# COPY --from=builder /app/public ./public

# 创建必要的数据持久化目录
RUN mkdir -p /app/data /app/logs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD sh /app/healthcheck.sh || exit 1

CMD ["npm", "start"]
