#!/bin/bash
set -e

# AI Ecommerce Operation Center - Uninstall Script

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}====================================================${NC}"
echo -e "${RED}   AI Ecommerce Operation Center 卸载清理工具       ${NC}"
echo -e "${RED}====================================================${NC}"

read -p "警告: 该操作将停止所有服务并清理构建缓存与数据！确认卸载？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}取消卸载。${NC}"
    exit 0
fi

# 1. Stop Docker Containers
if command -v docker-compose >/dev/null 2>&1 && [ -f docker-compose.yml ]; then
    echo -e "\n${YELLOW}[1/3] 停止并销毁 Docker 容器及网络...${NC}"
    docker-compose down -v --remove-orphans 2>/dev/null || true
fi

# 2. Stop PM2 Process if any
if command -v pm2 >/dev/null 2>&1; then
    pm2 stop ecom-op-center 2>/dev/null || true
    pm2 delete ecom-op-center 2>/dev/null || true
fi

# 3. Clean runtime files
read -p "是否同时删除运行日志与数据库数据？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}[2/3] 清理日志与数据文件...${NC}"
    rm -rf logs data dist node_modules
    echo -e "${GREEN}✓ 已清理 logs, data, dist, node_modules${NC}"
else
    echo -e "${YELLOW}[2/3] 保留 logs 与 data 目录${NC}"
    rm -rf dist node_modules
fi

echo -e "\n${GREEN}[3/3] 卸载清理程序执行完毕。${NC}"
