#!/usr/bin/env bash

###############################################################################
# AI Ecommerce Operation Center - Uninstall Script
###############################################################################

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script as root (e.g., sudo bash uninstall.sh)${NC}"
  exit 1
fi

echo -e "${RED}=====================================================${NC}"
echo -e "${RED}   AI Ecommerce Operation Center Uninstaller         ${NC}"
echo -e "${RED}=====================================================${NC}"
read -p "Are you sure you want to completely remove AI Ecommerce Operation Center? [y/N]: " CONFIRM

if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo -e "Uninstallation cancelled."
  exit 0
fi

echo -e "\n${YELLOW}[1/4] Stopping Systemd Service & Docker Containers...${NC}"
systemctl stop ai-ecommerce || true
systemctl disable ai-ecommerce || true
rm -f /etc/systemd/system/ai-ecommerce.service
systemctl daemon-reload

docker compose down -v || true

echo -e "\n${YELLOW}[2/4] Removing Nginx Site Configurations...${NC}"
rm -f /etc/nginx/sites-available/ai-ecommerce.conf
rm -f /etc/nginx/sites-enabled/ai-ecommerce.conf
nginx -t && systemctl reload nginx || true

echo -e "\n${YELLOW}[3/4] Cleaning Up Installed Data...${NC}"
read -p "Do you want to purge PostgreSQL database volumes & images? [y/N]: " PURGE_DATA
if [[ "$PURGE_DATA" == "y" || "$PURGE_DATA" == "Y" ]]; then
  docker volume rm ai-ecommerce-center_postgres_data ai-ecommerce-center_app_data 2>/dev/null || true
  rm -f .env
  echo -e "${GREEN}Database & environment settings purged.${NC}"
fi

echo -e "\n${GREEN}Uninstallation Complete!${NC}"
