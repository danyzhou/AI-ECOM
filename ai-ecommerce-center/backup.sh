#!/usr/bin/env bash

###############################################################################
# AI Ecommerce Operation Center - Backup Script
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run as root (e.g., sudo bash backup.sh)${NC}"
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backup/backup_${TIMESTAMP}"
ARCHIVE_NAME="ai_ecommerce_backup_${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

echo -e "${CYAN}=====================================================${NC}"
echo -e "${CYAN}  AI Ecommerce Operation Center - Database & File Backup ${NC}"
echo -e "${CYAN}=====================================================${NC}"

# 1. PostgreSQL Database Dump
echo -e "\n${YELLOW}[1/3] Dumping PostgreSQL Database...${NC}"
if docker ps | grep -q "ai_ecommerce_postgres"; then
  docker exec -t ai_ecommerce_postgres pg_dumpall -U ai_admin > "${BACKUP_DIR}/database_dump.sql"
  echo -e "${GREEN}Database SQL dump created.${NC}"
else
  echo -e "${YELLOW}[WARNING] PostgreSQL container not running. Skipping DB dump.${NC}"
fi

# 2. Backup Config & Media Uploads
echo -e "\n${YELLOW}[2/3] Backing up Configuration & File Uploads...${NC}"
if [ -f ".env" ]; then
  cp .env "${BACKUP_DIR}/.env"
fi

if [ -d "nginx" ]; then
  cp -r nginx "${BACKUP_DIR}/nginx"
fi

# Docker volume data backup if exists
if docker volume inspect ai-ecommerce-center_app_data &>/dev/null; then
  docker run --rm -v ai-ecommerce-center_app_data:/source:ro -v $(pwd)/${BACKUP_DIR}:/target alpine tar -czf /target/app_data.tar.gz -C /source .
fi

# 3. Create Compressed Archive
echo -e "\n${YELLOW}[3/3] Creating Compressed Archive (${ARCHIVE_NAME})...${NC}"
tar -czf "./backup/${ARCHIVE_NAME}" -C ./backup "backup_${TIMESTAMP}"
rm -rf "${BACKUP_DIR}"

echo -e "\n${GREEN}=====================================================${NC}"
echo -e "${GREEN} Backup Complete! Saved to: ./backup/${ARCHIVE_NAME} ${NC}"
echo -e "${GREEN}=====================================================${NC}\n"
