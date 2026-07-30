#!/usr/bin/env bash
# ==============================================================================
# AI Ecommerce Operation Center - Automated Backup Utility
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${APP_DIR}"

TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
BACKUP_DIR="${APP_DIR}/backups"
TEMP_DIR="/tmp/ai_ecom_backup_${TIMESTAMP}"

mkdir -p "${BACKUP_DIR}"
mkdir -p "${TEMP_DIR}"

echo -e "${CYAN}======================================================================${NC}"
echo -e "${CYAN}         AI Ecommerce Operation Center - System Backup                ${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo -e " Backup Timestamp: ${YELLOW}${TIMESTAMP}${NC}"

# Load Environment Variables
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

# 1. Backup PostgreSQL Database
echo -e "${BLUE}[1/4] Dumping PostgreSQL Database...${NC}"
if [ -n "$DATABASE_URL" ] && command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$DATABASE_URL" > "${TEMP_DIR}/database_dump.sql" 2>/dev/null || echo -e "${RED}[WARNING] pg_dump failed, skipping SQL dump.${NC}"
elif [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_DB" ]; then
  PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -h localhost "$POSTGRES_DB" > "${TEMP_DIR}/database_dump.sql" 2>/dev/null || true
fi

# 2. Backup Local State & File Database
echo -e "${BLUE}[2/4] Archiving local persistent data (data_db)...${NC}"
if [ -d "data_db" ]; then
  cp -r data_db "${TEMP_DIR}/data_db"
fi

# 3. Backup Configuration
echo -e "${BLUE}[3/4] Copying environment configuration (.env)...${NC}"
if [ -f ".env" ]; then
  cp .env "${TEMP_DIR}/.env"
fi

# 4. Pack Archive
ARCHIVE_NAME="backup-${TIMESTAMP}.tar.gz"
echo -e "${BLUE}[4/4] Creating compressed tar.gz archive...${NC}"

tar -czf "${BACKUP_DIR}/${ARCHIVE_NAME}" -C "/tmp" "ai_ecom_backup_${TIMESTAMP}"
rm -rf "${TEMP_DIR}"

echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}       Backup Created Successfully!                                    ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e " Backup File: ${CYAN}${BACKUP_DIR}/${ARCHIVE_NAME}${NC}"
echo -e " File Size:   ${YELLOW}$(du -sh "${BACKUP_DIR}/${ARCHIVE_NAME}" | cut -f1)${NC}"
echo "======================================================================"
