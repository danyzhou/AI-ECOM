#!/usr/bin/env bash
# ==============================================================================
# AI Ecommerce Operation Center - Uninstaller Utility
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}======================================================================${NC}"
echo -e "${CYAN}         AI Ecommerce Operation Center - Complete Uninstaller         ${NC}"
echo -e "${CYAN}======================================================================${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Uninstaller must be executed as root or using sudo.${NC}"
  exit 1
fi

read -p "Are you sure you want to uninstall AI Ecommerce Operation Center? (y/N): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo -e "${YELLOW}Uninstall aborted.${NC}"
  exit 0
fi

echo -e "${BLUE}[1/4] Stopping and disabling system services...${NC}"

# Stop systemd service
if systemctl is-active --quiet ai-ecommerce.service 2>/dev/null; then
  systemctl stop ai-ecommerce.service
  systemctl disable ai-ecommerce.service
  rm -f /etc/systemd/system/ai-ecommerce.service
  systemctl daemon-reload
  echo -e "${GREEN}Removed ai-ecommerce.service${NC}"
fi

# Stop docker compose if running
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  docker compose down -v 2>/dev/null || true
fi

echo -e "${BLUE}[2/4] Removing Nginx reverse proxy configuration...${NC}"
rm -f /etc/nginx/sites-available/ai-ecommerce.conf
rm -f /etc/nginx/sites-enabled/ai-ecommerce.conf
systemctl reload nginx 2>/dev/null || true

read -p "Do you want to drop the PostgreSQL database 'ai_ecommerce'? (y/N): " DROP_DB
if [[ "$DROP_DB" == "y" || "$DROP_DB" == "Y" ]]; then
  echo -e "${BLUE}[3/4] Dropping PostgreSQL database and user...${NC}"
  sudo -u postgres psql -c "DROP DATABASE IF EXISTS ai_ecommerce;" 2>/dev/null || true
  sudo -u postgres psql -c "DROP USER IF EXISTS ai_admin;" 2>/dev/null || true
  echo -e "${GREEN}Database purged.${NC}"
else
  echo -e "${YELLOW}[3/4] Skipped dropping PostgreSQL database.${NC}"
fi

read -p "Do you want to delete build artifacts and local storage (dist, node_modules, data_db)? (y/N): " PURGE_FILES
if [[ "$PURGE_FILES" == "y" || "$PURGE_FILES" == "Y" ]]; then
  echo -e "${BLUE}[4/4] Removing build directories...${NC}"
  rm -rf dist node_modules data_db logs
  echo -e "${GREEN}Local artifacts cleared.${NC}"
else
  echo -e "${YELLOW}[4/4] Preserved source files and local storage.${NC}"
fi

echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}       AI Ecommerce Operation Center Uninstalled Successfully!         ${NC}"
echo -e "${GREEN}======================================================================${NC}"
