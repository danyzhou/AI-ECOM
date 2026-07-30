#!/bin/bash
set -e

# AI Ecommerce Operation Center - Rolling Update Script

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}   AI Ecommerce Operation Center 生产环境版本更新     ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Automatic Backup before update
if [ -f backup.sh ]; then
    echo -e "\n${YELLOW}[1/4] 触发升级前热数据自动备份...${NC}"
    bash backup.sh || echo -e "${YELLOW}! 备份告警: 自动备份跳过，继续执行更新${NC}"
fi

# 2. Pull Git Changes if repository exists
if [ -d .git ]; then
    echo -e "\n${YELLOW}[2/4] 拉取 Git 最新代码仓库...${NC}"
    git pull origin main || git pull || echo -e "${YELLOW}! 提示: 跳过 Git pull${NC}"
fi

# 3. Rebuild Application
echo -e "\n${YELLOW}[3/4] 重新编译前端与后端代码...${NC}"
if command -v docker-compose >/dev/null 2>&1 && [ -f docker-compose.yml ]; then
    echo -e "使用 Docker Compose 无缝热更新构建..."
    docker-compose up -d --build --no-deps app
else
    echo -e "使用 Node.js 原生模式构建打包..."
    npm install
    npm run build
    
    # Restart Node process if running under PM2 or systemd
    if command -v pm2 >/dev/null 2>&1; then
        pm2 restart ecom-op-center || pm2 start dist/server.cjs --name ecom-op-center
    fi
fi

# 4. Health Check
echo -e "\n${YELLOW}[4/4] 运行服务健康状态诊察...${NC}"
sleep 2
if [ -f healthcheck.sh ]; then
    bash healthcheck.sh
fi

echo -e "\n${GREEN}✓ AI Ecommerce Operation Center 已平滑更新至最新版本！${NC}"
