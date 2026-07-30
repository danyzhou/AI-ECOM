#!/usr/bin/env bash

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ -z "$1" ]; then
  echo -e "${RED}Usage: sudo bash scripts/restore.sh /path/to/backup.tar.gz${NC}"
  exit 1
fi

BACKUP_FILE="$1"
TMP_DIR="/tmp/ai_ecommerce_restore"

rm -rf "${TMP_DIR}"
mkdir -p "${TMP_DIR}"
tar -xzf "${BACKUP_FILE}" -C "${TMP_DIR}"

if [ -f "${TMP_DIR}"/*/.env ]; then
  cp "${TMP_DIR}"/*/.env .env
fi

if [ -f "${TMP_DIR}"/*/database_dump.sql ]; then
  docker exec -i ai_ecommerce_postgres psql -U ai_admin -d ai_ecommerce < "${TMP_DIR}"/*/database_dump.sql
fi

rm -rf "${TMP_DIR}"
echo -e "${GREEN}Restore Completed Successfully!${NC}"
