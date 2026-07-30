#!/bin/bash
set -e

# AI Ecommerce Operation Center - Database & Config Backup Script

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
BACKUP_NAME="ecom_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo -e "${BLUE}[Backup] 启动 AI Ecommerce Operation Center 数据备份...${NC}"
mkdir -p "${BACKUP_PATH}"

# 1. Backup Environment & Data Config
if [ -f .env ]; then
    cp .env "${BACKUP_PATH}/.env.backup"
fi
if [ -d data ]; then
    cp -r data "${BACKUP_PATH}/data_backup"
fi

# 2. Dump PostgreSQL Database
if command -v docker >/dev/null 2>&1 && docker ps | grep -q ecom-postgres; then
    echo -e "${YELLOW}使用 Docker 提取 PostgreSQL 数据镜像...${NC}"
    docker exec ecom-postgres pg_dump -U ecom_user ecom_op_center > "${BACKUP_PATH}/database.sql" 2>/dev/null || true
elif command -v pg_dump >/dev/null 2>&1; then
    echo -e "${YELLOW}使用 本地 pg_dump 导出数据库...${NC}"
    pg_dump -U ecom_user ecom_op_center > "${BACKUP_PATH}/database.sql" 2>/dev/null || true
fi

# 3. Compress Archive
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_NAME}"
cd ..

echo -e "${GREEN}✓ 备份数据归档成功: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz${NC}"

# 4. Cleanup old backups (>30 days)
find "${BACKUP_DIR}" -name "ecom_backup_*.tar.gz" -mtime +30 -exec rm -f {} \;
echo -e "${GREEN}✓ 已完成自动保留近 30 天备份清理${NC}"
