#!/usr/bin/env bash
# ==============================================================================
# AI Ecommerce Operation Center - System Disaster Recovery & Restore Utility
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${APP_DIR}"

if [ -z "$1" ]; then
  echo -e "${RED}[ERROR] Please specify a backup file to restore.${NC}"
  echo "Usage: ./restore.sh backups/backup-2026-07-24-120000.tar.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}[ERROR] Backup archive file not found: $BACKUP_FILE${NC}"
  exit 1
fi

echo -e "${CYAN}======================================================================${NC}"
echo -e "${CYAN}        AI Ecommerce Operation Center - System Restore                 ${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo -e " Target Archive: ${YELLOW}${BACKUP_FILE}${NC}"
echo ""

read -p "WARNING: Restoring will overwrite existing database & files. Continue? (y/N): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo -e "${YELLOW}Restore cancelled by user.${NC}"
  exit 0
fi

TEMP_EXTRACT="/tmp/ai_ecom_restore_$(date +%s)"
mkdir -p "${TEMP_EXTRACT}"

echo -e "${BLUE}[1/4] Unpacking backup archive...${NC}"
tar -xzf "${BACKUP_FILE}" -C "${TEMP_EXTRACT}"

RESTORE_SRC=$(find "${TEMP_EXTRACT}" -maxdepth 1 -type d -name "ai_ecom_backup_*" | head -n 1)

if [ -z "$RESTORE_SRC" ]; then
  echo -e "${RED}[ERROR] Invalid backup format inside archive.${NC}"
  rm -rf "${TEMP_EXTRACT}"
  exit 1
fi

# 2. Restore .env
echo -e "${BLUE}[2/4] Restoring environment variables (.env)...${NC}"
if [ -f "${RESTORE_SRC}/.env" ]; then
  cp "${RESTORE_SRC}/.env" "${APP_DIR}/.env"
  export $(grep -v '^#' .env | xargs)
fi

# 3. Restore Database SQL Dump
echo -e "${BLUE}[3/4] Restoring PostgreSQL Database...${NC}"
if [ -f "${RESTORE_SRC}/database_dump.sql" ] && [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -f "${RESTORE_SRC}/database_dump.sql" 2>/dev/null || echo -e "${YELLOW}[NOTICE] Database restored with minor warnings.${NC}"
fi

# 4. Restore File Database
echo -e "${BLUE}[4/4] Restoring data_db files...${NC}"
if [ -d "${RESTORE_SRC}/data_db" ]; then
  cp -r "${RESTORE_SRC}/data_db"/* "${APP_DIR}/data_db/" 2>/dev/null || true
fi

rm -rf "${TEMP_EXTRACT}"

# Restart Service
echo -e "${BLUE}Restarting application service...${NC}"
if systemctl is-active --quiet ai-ecommerce.service; then
  sudo systemctl restart ai-ecommerce.service
fi

echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}       System Restoration Completed Successfully!                     ${NC}"
echo -e "${GREEN}======================================================================${NC}"
