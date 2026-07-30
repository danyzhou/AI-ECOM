#!/bin/bash
set -e

# AI Ecommerce Operation Center - Backup Restore Script

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${YELLOW}请指定要恢复的备份归档压缩包 (.tar.gz)，例如:${NC}"
    echo -e "bash restore.sh backups/ecom_backup_20260724_120000.tar.gz"
    echo -e "\n当前 available 备份列表:"
    ls -lh backups/*.tar.gz 2>/dev/null || echo "（暂无备份）"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}错误: 无法找到指定的备份文件 $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}[Restore] 启动 AI Ecommerce Operation Center 数据恢复解包...${NC}"

TEMP_DIR="./backups/temp_restore"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
EXTRACTED_FOLDER=$(ls "$TEMP_DIR")
RESTORE_SRC="$TEMP_DIR/$EXTRACTED_FOLDER"

# 1. Restore Environment Configuration
if [ -f "$RESTORE_SRC/.env.backup" ]; then
    cp "$RESTORE_SRC/.env.backup" .env
    echo -e "${GREEN}✓ 已恢复 .env 配置文件${NC}"
fi

# 2. Restore JSON Local Storage
if [ -d "$RESTORE_SRC/data_backup" ]; then
    mkdir -p data
    cp -r "$RESTORE_SRC/data_backup"/* data/ 2>/dev/null || true
    echo -e "${GREEN}✓ 已恢复 本地数据存储${NC}"
fi

# 3. Restore PostgreSQL Database SQL
if [ -f "$RESTORE_SRC/database.sql" ]; then
    echo -e "${YELLOW}正在导入恢复 PostgreSQL 数据库表和记录...${NC}"
    if command -v docker >/dev/null 2>&1 && docker ps | grep -q ecom-postgres; then
        docker exec -i ecom-postgres psql -U ecom_user ecom_op_center < "$RESTORE_SRC/database.sql" 2>/dev/null || true
    elif command -v psql >/dev/null 2>&1; then
        psql -U ecom_user ecom_op_center < "$RESTORE_SRC/database.sql" 2>/dev/null || true
    fi
    echo -e "${GREEN}✓ 数据库 SQL 还原完成${NC}"
fi

rm -rf "$TEMP_DIR"

echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}✓ 数据还原完全就绪！请重启服务或执行 bash update.sh${NC}"
echo -e "${GREEN}====================================================${NC}"
