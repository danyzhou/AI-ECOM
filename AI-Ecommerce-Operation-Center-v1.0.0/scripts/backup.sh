#!/usr/bin/env bash

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backup/backup_${TIMESTAMP}"
ARCHIVE_NAME="ai_ecommerce_backup_${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

echo -e "${CYAN}Backing up AI Ecommerce Operation Center...${NC}"

if docker ps | grep -q "ai_ecommerce_postgres"; then
  docker exec -t ai_ecommerce_postgres pg_dumpall -U ai_admin > "${BACKUP_DIR}/database_dump.sql"
  echo -e "${GREEN}Database SQL dump created.${NC}"
fi

if [ -f ".env" ]; then
  cp .env "${BACKUP_DIR}/.env"
fi

tar -czf "./backup/${ARCHIVE_NAME}" -C ./backup "backup_${TIMESTAMP}"
rm -rf "${BACKUP_DIR}"

echo -e "${GREEN}Backup Complete: ./backup/${ARCHIVE_NAME}${NC}"
